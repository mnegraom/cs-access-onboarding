import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import express from "express";
import { AuthError, ServerError, ClientAuthErrorCodes } from "@azure/msal-node";
import { z } from "zod";
import { HttpError } from "../src/backend/core.js";
import { describeError, errorHandler, OAuthAuthorizationError } from "../src/backend/errors.js";

test("admin-consent callback preserves a safe AADSTS code instead of labelling every failure as a refusal", () => {
  const error = new OAuthAuthorizationError("access_denied", "AADSTS53003: private policy, email, secret and token");
  assert.deepEqual(describeError(error), { status: 400, code: "microsoft_authorization_failed", microsoftErrorCode: "AADSTS53003" });
  assert.equal(JSON.stringify(error).includes("private"), false);
  assert.equal(error.message.includes("private"), false);
});
test("documented admin-consent denial is recognized even when admin_consent is True", () => {
  const error = new OAuthAuthorizationError("consent_required", "AADSTS65004: private response");
  assert.deepEqual(describeError(error), { status: 400, code: "microsoft_authorization_declined", microsoftErrorCode: "AADSTS65004" });
});
test("consent callback identifies configuration failures without leaking descriptions", () => {
  const error = new OAuthAuthorizationError("invalid_client", "AADSTS50011: private redirect URI");
  assert.deepEqual(describeError(error), { status: 400, code: "microsoft_callback_mismatch", microsoftErrorCode: "AADSTS50011" });
  assert.equal(JSON.stringify(error).includes("private"), false);
});
test("unknown callback error strings, structured queries and descriptions are not exposed", () => {
  for (const provider of ["private-secret", ["access_denied"], { error: "private-token" }]) {
    const error = new OAuthAuthorizationError(provider, { value: "private-description" });
    assert.deepEqual(describeError(error), { status: 400, code: "microsoft_authorization_failed", microsoftErrorCode: undefined });
    assert.equal(JSON.stringify(error).includes("private"), false);
  }
});
test("numeric consent errors are preserved as AADSTS without assuming the cause", () => {
  assert.deepEqual(describeError(new OAuthAuthorizationError("650052", undefined)), {
    status: 400, code: "microsoft_resource_principal_missing", microsoftErrorCode: "AADSTS650052",
  });
});
test("AADSTS650052 overrides invalid_client and never recommends rotating a valid secret", () => {
  for (const error of [
    new OAuthAuthorizationError("invalid_client", "AADSTS650052: private resource and organization"),
    new ServerError("invalid_client", "test-reference", "private resource", "", "650052"),
    new AuthError("invalid_client", "test-reference", "AADSTS650052: private resource"),
  ]) {
    assert.deepEqual(describeError(error), {
      status: 400, code: "microsoft_resource_principal_missing", microsoftErrorCode: "AADSTS650052",
    });
    test("missing-resource diagnostics extract only the resource UUID, not names, tenant, client or provider text", () => {
      const resource = "797f4846-ba00-4fd7-ba43-dac1f8f63013";
      const tenant = "11111111-1111-4111-8111-111111111111";
      for (const service of [`service '${resource}'(private service)`, `service ('${resource.toUpperCase()}')`, `resource "${resource}"`]) {
        const failure = new OAuthAuthorizationError("invalid_client",
          `AADSTS650052: The app is trying to access a ${service} that your organization '${tenant}' lacks. private secret token`);
        assert.deepEqual(describeError(failure), {
          status: 400, code: "microsoft_resource_principal_missing", microsoftErrorCode: "AADSTS650052", resourceAppId: resource,
        });
        assert.equal(JSON.stringify(failure).includes("private"), false);
        assert.equal(JSON.stringify(failure).includes(tenant), false);
      }
    });
    test("missing resource ID is not guessed from other identifiers or arbitrary text", () => {
      for (const description of [
        "AADSTS650052: client '11111111-1111-4111-8111-111111111111' organization '22222222-2222-4222-8222-222222222222'",
        "AADSTS650052: service 'private-token-value'",
        "AADSTS50011: service '797f4846-ba00-4fd7-ba43-dac1f8f63013'",
      ]) assert.equal(describeError(new OAuthAuthorizationError("invalid_client", description)).resourceAppId, undefined);
    });
    test("resource UUID survives the safe callback redirect without retaining provider description", async () => {
      const resource = "797f4846-ba00-4fd7-ba43-dac1f8f63013";
      const failure = new OAuthAuthorizationError("invalid_client", `AADSTS650052: service '${resource}'(private API name) private`);
      const app = express();
      app.get("/auth/microsoft/callback", () => { throw failure; }); app.use(errorHandler);
      const server = app.listen(0, "127.0.0.1"); await once(server, "listening");
      try {
        const address = server.address(); assert.ok(address && typeof address !== "string");
        const response = await fetch(`http://127.0.0.1:${address.port}/auth/microsoft/callback`, { redirect: "manual" });
        const target = new URL(response.headers.get("location") ?? "", "http://localhost");
        assert.equal(target.searchParams.get("auth_error"), "microsoft_resource_principal_missing");
        assert.equal(target.searchParams.get("resource_app_id"), resource);
        assert.equal(target.searchParams.get("reference"), failure.correlationId);
        assert.equal(target.href.includes("private"), false);
      } finally {
        await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
      }
    });
    assert.equal(JSON.stringify(describeError(error)).includes("private"), false);
  }
});
test("access_denied without a provider number is not presented as a confirmed user refusal", () => {
  assert.deepEqual(describeError(new OAuthAuthorizationError("access_denied", undefined)), {
    status: 400, code: "microsoft_authorization_failed", microsoftErrorCode: "access_denied",
  });
});
test("consent callback errors use the same diagnostic reference in session-facing data and redirects", async () => {
  const failure = new OAuthAuthorizationError("access_denied", "AADSTS53003: private tenant and token");
  const app = express();
  app.get("/auth/microsoft/callback", () => { throw failure; });
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address(); assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/auth/microsoft/callback?code=private-code&error_description=private`, { redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    const target = new URL(location, "http://localhost");
    assert.equal(response.status, 302);
    assert.equal(target.searchParams.get("auth_error"), "microsoft_authorization_failed");
    assert.equal(target.searchParams.get("microsoft_error"), "AADSTS53003");
    assert.equal(target.searchParams.get("reference"), failure.correlationId);
    assert.equal(location.includes("private"), false);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});

for (const [number, code] of [
  ["7000215", "partner_secret_invalid"],
  ["7000222", "partner_secret_expired"],
  ["700016", "partner_application_not_found"],
  ["50011", "microsoft_callback_mismatch"],
  ["9002327", "microsoft_callback_platform_invalid"],
]) {
  test(`Microsoft ${number} has an actionable, sanitized diagnosis`, () => {
    const error = new ServerError("invalid_client", "test-reference", "private secret and token", "", number);
    assert.deepEqual(describeError(error), { status: 400, code, microsoftErrorCode: `AADSTS${number}` });
    assert.equal(JSON.stringify(describeError(error)).includes("private"), false);
  });
}
test("expired or reused authorization codes require a new login", () => {
  assert.deepEqual(describeError(new AuthError("invalid_grant", "test-reference", "private code")), {
    status: 409, code: "microsoft_login_retry_required", microsoftErrorCode: "invalid_grant",
  });
});
test("AADSTS diagnostics can be extracted without disclosing the surrounding message", () => {
  const error = new AuthError("invalid_client", "test-reference", "AADSTS7000215: secret=private token=private");
  assert.deepEqual(describeError(error), {
    status: 400, code: "partner_secret_invalid", microsoftErrorCode: "AADSTS7000215",
  });
});
test("unrecognized provider details and ordinary exceptions are not exposed", () => {
  assert.deepEqual(describeError(new AuthError("private-secret", "private", "token=private")), {
    status: 502, code: "microsoft_authentication_failed", microsoftErrorCode: undefined,
  });
  assert.deepEqual(describeError(new Error("private token")), { status: 500, code: "internal_error" });
});
test("known MSAL security codes remain diagnosable without exposing exception messages", () => {
  assert.deepEqual(describeError(new AuthError(ClientAuthErrorCodes.nonceMismatch, "test-reference", "private token")), {
    status: 400, code: "microsoft_nonce_mismatch", microsoftErrorCode: "nonce_mismatch",
  });
  assert.deepEqual(describeError(new AuthError(ClientAuthErrorCodes.tokenParsingError, "test-reference", "private token")), {
    status: 502, code: "microsoft_authentication_failed", microsoftErrorCode: "token_parsing_error",
  });
});
test("numeric error codes from Microsoft are normalized before classification", () => {
  const error = new ServerError("invalid_client", "test-reference", "private");
  Object.defineProperty(error, "errorNo", { value: 7000215 });
  assert.deepEqual(describeError(error), {
    status: 400, code: "partner_secret_invalid", microsoftErrorCode: "AADSTS7000215",
  });
});
test("existing HTTP and validation errors retain their behavior", () => {
  assert.deepEqual(describeError(new HttpError(401, "login_required")), { status: 401, code: "login_required" });
  const validation = z.string().safeParse(5);
  assert.equal(validation.success, false);
  if (!validation.success) assert.deepEqual(describeError(validation.error), { status: 400, code: "invalid_input" });
});
test("callbacks redirect with safe diagnostics; APIs retain failure status and correlation", async () => {
  const app = express();
  for (const path of ["/auth/microsoft/callback", "/api/test"]) {
    app.get(path, () => { throw new ServerError("invalid_client", "test-reference", "private-secret", "", "7000215"); });
  }
  app.use(errorHandler);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const callback = await fetch(`${origin}/auth/microsoft/callback?code=private-code&state=private-state`, { redirect: "manual" });
    assert.equal(callback.status, 302);
    const location = new URL(callback.headers.get("location") ?? "", origin);
    assert.equal(location.pathname, "/");
    assert.equal(location.searchParams.get("auth_error"), "partner_secret_invalid");
    assert.equal(location.searchParams.get("microsoft_error"), "AADSTS7000215");
    assert.match(location.searchParams.get("reference") ?? "", /^[a-f0-9-]{36}$/);
    assert.equal(location.href.includes("private"), false);
    const api = await fetch(`${origin}/api/test`);
    assert.equal(api.status, 400);
    const body = await api.json();
    assert.equal(body.error, "partner_secret_invalid");
    assert.equal(body.microsoftErrorCode, "AADSTS7000215");
    assert.equal(JSON.stringify(body).includes("private"), false);
    assert.ok(body.correlationId);
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
