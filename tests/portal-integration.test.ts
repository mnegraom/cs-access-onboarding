import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { createPortal } from "../src/backend/server.js";
import { MemoryStore } from "../src/backend/memory-store.js";
import { EmailOtpAuth } from "../src/backend/auth/email-otp.js";
import type { Store, Stored } from "../src/backend/core.js";
import type { EmailMessage, EmailSender, OperatorAuthProvider } from "../src/backend/contracts.js";

const origin = "https://portal.example.com";
const email = "operator@example.com";

// In-memory fixtures are test doubles, not a shipped alternative to protected OTP persistence.
class FixtureStore implements Store {
  private entries = new Map<string, Stored<unknown>>();
  async get<T>(key: string): Promise<Stored<T> | undefined> {
    const value = this.entries.get(key);
    return value ? { value: structuredClone(value.value) as T, etag: value.etag } : undefined;
  }
  async put<T>(key: string, value: T, etag?: string) {
    const current = this.entries.get(key);
    if (etag ? current?.etag !== etag : Boolean(current)) return false;
    this.entries.set(key, { value: structuredClone(value), etag: randomUUID() });
    return true;
  }
}

async function serve(operatorAuth: OperatorAuthProvider) {
  const transient = new MemoryStore();
  const app = createPortal({ publicOrigin: origin, partnerName: "Example Partner" }, {
    operatorAuth, transientStore: transient,
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  return {
    base: `http://127.0.0.1:${address.port}`,
    async close() {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      transient.close();
    },
  };
}

function post(base: string, path: string, body: unknown, headers: Record<string, string> = {}) {
  return fetch(base + path, {
    method: "POST", headers: { Origin: origin, "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body), redirect: "manual",
  });
}

function otpFixture(enabled = true, sender?: EmailSender) {
  const messages: EmailMessage[] = [];
  const auth = new EmailOtpAuth({ allowedEmails: [email], enabled }, new FixtureStore(),
    sender ?? { async send(message) { messages.push(message); } });
  return { auth, messages };
}

test("portal factory starts without Azure hosting configuration and keeps protected routes private", async () => {
  const instance = await serve({
    enabled: false, isAuthorized: () => false, registerRoutes() {},
  });
  try {
    assert.equal((await fetch(instance.base + "/api/health")).status, 200);
    const config = await fetch(instance.base + "/api/config");
    assert.deepEqual(await config.json(), { partnerName: "Example Partner", emailEnabled: false });
    const page = await fetch(instance.base + "/");
    assert.equal(page.status, 200);
    assert.match(await page.text(), /id="email-form"/);
    assert.equal((await fetch(instance.base + "/app.js")).status, 200);
    for (const path of ["/api/session", "/api/context", "/api/onboarding/export"]) {
      assert.equal((await fetch(instance.base + path)).status, 401);
    }
    assert.equal((await post(instance.base, "/api/access/verify", {})).status, 404);
  } finally { await instance.close(); }
});

test("portal factory rejects a non-HTTPS public origin", () => {
  const transient = new MemoryStore();
  try {
    assert.throws(() => createPortal({ publicOrigin: "http://example.com", partnerName: "Example" }, {
      transientStore: transient, operatorAuth: { enabled: false, isAuthorized: () => false, registerRoutes() {} },
    }), /publicOrigin must use HTTPS/);
  } finally { transient.close(); }
});

test("reference OTP provider preserves verified login, session secrecy, CSRF and logout", async () => {
  const { auth, messages } = otpFixture();
  const instance = await serve(auth);
  try {
    const request = await post(instance.base, "/api/access/request", { email });
    assert.equal(request.status, 202);
    const { challengeId } = z.object({ challengeId: z.string() }).parse(await request.json());
    assert.equal(messages.length, 1);
    assert.equal(messages[0]?.to, email);
    const code = messages[0]?.text.match(/\n\n(\d{6})\n\n/)?.[1];
    assert.ok(code);
    const verify = await post(instance.base, "/api/access/verify", { email, challengeId, code });
    assert.equal(verify.status, 200);
    const cookieHeader = verify.headers.get("set-cookie");
    assert.ok(cookieHeader);
    assert.match(cookieHeader, /HttpOnly/i);
    assert.match(cookieHeader, /Secure/i);
    assert.match(cookieHeader, /SameSite=Lax/i);
    assert.equal(/Max-Age|Expires=/i.test(cookieHeader), false);
    const cookie = cookieHeader.split(";")[0]!;
    const initial = z.object({ csrf: z.string(), email: z.string(), hasCredential: z.boolean() }).parse(await verify.json());
    assert.equal(initial.email, email);
    assert.equal(initial.hasCredential, false);
    const connection = {
      appId: randomUUID(), customerTenantId: randomUUID(), partnerTenantId: randomUUID(),
      clientSecret: "test-only-partner-secret", branches: ["m365"],
    };
    assert.equal((await post(instance.base, "/api/onboarding", connection, { Cookie: cookie })).status, 403);
    assert.equal((await post(instance.base, "/api/onboarding", connection, {
      Cookie: cookie, "X-CSRF-Token": initial.csrf, Origin: "https://other.example.com",
    })).status, 403);
    assert.equal((await post(instance.base, "/api/onboarding", connection, {
      Cookie: cookie, "X-CSRF-Token": initial.csrf,
    })).status, 201);
    const status = await fetch(instance.base + "/api/session", { headers: { Cookie: cookie } });
    const text = await status.text();
    const parsed = z.object({ hasCredential: z.boolean() }).parse(JSON.parse(text));
    assert.equal(parsed.hasCredential, true);
    assert.equal(text.includes(connection.clientSecret), false);
    assert.equal(text.includes('"cache"'), false);
    const consent = await post(instance.base, "/api/m365/consent", {}, {
      Cookie: cookie, "X-CSRF-Token": initial.csrf,
    });
    assert.equal(consent.status, 409);
    assert.equal(z.object({ error: z.string() }).parse(await consent.json()).error, "identity_login_required");
    assert.equal((await post(instance.base, "/api/access/verify", { email, challengeId, code })).status, 400);
    assert.equal((await post(instance.base, "/api/logout", {}, {
      Cookie: cookie, "X-CSRF-Token": initial.csrf,
    })).status, 204);
    assert.equal((await fetch(instance.base + "/api/session", { headers: { Cookie: cookie } })).status, 401);
  } finally { await instance.close(); }
});

test("unlisted users, disabled email and wrong origins cannot create a portal session", async () => {
  const { auth, messages } = otpFixture();
  const instance = await serve(auth);
  try {
    const otherEmail = "unlisted@example.com";
    const requested = await post(instance.base, "/api/access/request", { email: otherEmail });
    assert.equal(requested.status, 202);
    const { challengeId } = z.object({ challengeId: z.string() }).parse(await requested.json());
    assert.equal(messages.length, 0);
    const verify = await post(instance.base, "/api/access/verify", { email: otherEmail, challengeId, code: "000000" });
    assert.equal(verify.status, 400);
    assert.equal(verify.headers.get("set-cookie"), null);
    assert.equal((await post(instance.base, "/api/access/request", { email }, { Origin: "https://other.example.com" })).status, 403);
  } finally { await instance.close(); }
  const disabled = await serve(otpFixture(false).auth);
  try {
    assert.equal((await post(disabled.base, "/api/access/request", { email })).status, 503);
  } finally { await disabled.close(); }
});

test("core rechecks operator authorization before issuing a provider-verified session", async () => {
  // Deliberately incorrect provider exists only in this test to exercise the core's final authorization gate.
  const instance = await serve({
    enabled: true, isAuthorized: () => false,
    registerRoutes(router, context) {
      router.post("/fixture/callback", async (_req, res) => context.completeLogin(email, res));
    },
  });
  try {
    const response = await post(instance.base, "/api/fixture/callback", {});
    assert.equal(response.status, 403);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.equal(z.object({ error: z.string() }).parse(await response.json()).error, "operator_not_authorized");
  } finally { await instance.close(); }
});

test("delivery failures keep the public response uniform and emit sanitized diagnostics", async () => {
  const entries: string[] = [];
  const original = console.error;
  const instance = await serve(otpFixture(true, {
    async send() { throw new Error("test-only-sensitive-transport-detail"); },
  }).auth);
  console.error = value => { entries.push(String(value)); };
  try {
    const response = await post(instance.base, "/api/access/request", { email });
    assert.equal(response.status, 202);
    assert.equal(response.headers.get("set-cookie"), null);
    assert.ok(entries.some(line => line.includes('"event":"otp_delivery_failed"')));
    assert.equal(entries.some(line => line.includes("test-only-sensitive-transport-detail")), false);
  } finally {
    console.error = original;
    await instance.close();
  }
});
