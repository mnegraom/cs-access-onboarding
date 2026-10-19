import { test } from "node:test";
import assert from "node:assert/strict";
import { newChallenge, consumeCode, OTP_TTL, MAX_ATTEMPTS, normalizeEmail, eligible, assignmentName, update, roles, type Store, type Stored } from "../src/backend/core.js";

test("code expires at exactly five minutes and never persists plaintext", () => {
  const { code, challenge } = newChallenge("person@example.com", true, 1000);
  assert.equal(challenge.expires, 1000 + OTP_TTL);
  assert.notEqual(challenge.hash, code);
  assert.equal(consumeCode(challenge, code, 1000 + OTP_TTL), false);
});
test("code succeeds before expiry and is single use", () => {
  const { code, challenge } = newChallenge("person@example.com", true, 1000);
  assert.equal(consumeCode(challenge, code, 1000 + OTP_TTL - 1), true);
  assert.equal(consumeCode(challenge, code, 1001), false);
});
test("five failures lock the challenge", () => {
  const { code, challenge } = newChallenge("person@example.com", true, 1000);
  const wrong = code === "000000" ? "000001" : "000000";
  for (let i = 0; i < MAX_ATTEMPTS; i++) assert.equal(consumeCode(challenge, wrong, 1001), false);
  assert.equal(consumeCode(challenge, code, 1001), false);
});
test("an unlisted email cannot authenticate even with its matching code", () => {
  const { code, challenge } = newChallenge("person@example.com", false, 1000);
  assert.equal(consumeCode(challenge, code, 1001), false);
});
test("normalizes allowlist input", () => {
  assert.equal(normalizeEmail(" Person@Example.com "), "person@example.com");
});
test("only enabled subscriptions in the expected tenant qualify", () => {
  const sub = { subscriptionId: "s", displayName: "Test", tenantId: "T", state: "Enabled" };
  assert.equal(eligible(sub, "t"), true);
  assert.equal(eligible(sub, "other"), false);
  assert.equal(eligible({ ...sub, state: "Disabled" }, "t"), false);
});
test("assignment identifiers are stable and isolated by onboarding", () => {
  const id = assignmentName("session", "subscription", "role");
  assert.match(id, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-a[0-9a-f]{3}-[0-9a-f]{12}$/);
  assert.equal(id, assignmentName("session", "subscription", "role"));
  assert.notEqual(id, assignmentName("another", "subscription", "role"));
});
test("exhausted concurrent updates fail explicitly", async () => {
  const store: Store = { get: async () => undefined, put: async () => false };
  await assert.rejects(update(store, "key", () => ({}), () => true), /concurrent_update_retry/);
});
test("Azure permission bundle contains exactly the two required built-in roles", () => {
  assert.deepEqual(roles, [
    { name: "Reader", id: "acdd72a7-3385-48ef-bd42-f606fba81ae7" },
    { name: "Cost Management Reader", id: "72fafb9e-0641-4937-9268-a91bfd8191a3" },
  ]);
});
test("ETag contention cannot consume one code twice", async () => {
  const { code, challenge } = newChallenge("person@example.com", true, 1000);
  let version = 1;
  let value = structuredClone(challenge);
  const store: Store = {
    async get<T>(): Promise<Stored<T>> {
      return { value: structuredClone(value) as T, etag: String(version) };
    },
    async put<T>(_key: string, next: T, etag?: string): Promise<boolean> {
      if (etag !== String(version)) return false;
      value = structuredClone(next) as typeof challenge;
      version++;
      return true;
    },
  };
  const consume = () => update(store, "challenge", () => challenge, current => consumeCode(current, code, 1001));
  const results = await Promise.all([consume(), consume()]);
  assert.equal(results.filter(Boolean).length, 1);
  assert.equal(value.used, true);
});
