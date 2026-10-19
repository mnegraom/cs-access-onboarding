import test from "node:test";
import assert from "node:assert/strict";
import { MemoryStore } from "../src/backend/memory-store.js";
import { update } from "../src/backend/core.js";

test("transient session data expires exactly at its boundary and cannot be restored", async t => {
  let now = 1_000;
  const store = new MemoryStore(() => now);
  t.after(() => store.close());
  await store.put("session", { expires: 2_000, credential: "test-only-secret" });
  now = 1_999;
  assert.ok(await store.get("session"));
  now = 2_000;
  assert.equal(await store.get("session"), undefined);
  now = 1_000;
  assert.equal(await store.get("session"), undefined);
});
test("new store instances have no previous session, OAuth or grant history", async t => {
  const first = new MemoryStore(() => 1), next = new MemoryStore(() => 1);
  t.after(() => { first.close(); next.close(); });
  for (const key of ["sessions/customer", "oauth/state", "tickets/token"]) {
    await first.put(key, { expires: 10, grants: ["test-only-assignment"] });
    assert.equal(await next.get(key), undefined);
  }
});
test("logout deletes active credentials and a new session starts without onboarding", async t => {
  const store = new MemoryStore(() => 1);
  t.after(() => store.close());
  await store.put("session", { expires: 10, onboarding: { grants: ["test-only-id"] }, clientSecret: "test-only-secret" });
  store.delete("session");
  assert.equal(await store.get("session"), undefined);
  await store.put("session", { expires: 10, email: "test@example.invalid" });
  assert.deepEqual((await store.get("session"))?.value, { expires: 10, email: "test@example.invalid" });
});
test("memory records use detached snapshots and reject stale concurrent updates", async t => {
  const store = new MemoryStore(() => 1);
  t.after(() => store.close());
  const original = { expires: 10, counter: 0 };
  await store.put("session", original);
  original.counter = 50;
  const a = await store.get<typeof original>("session"), b = await store.get<typeof original>("session");
  assert.ok(a && b);
  a.value.counter++;
  assert.equal((await store.get<typeof original>("session"))?.value.counter, 0);
  assert.equal(await store.put("session", a.value, a.etag), true);
  assert.equal(await store.put("session", b.value, b.etag), false);
  assert.equal(await store.put("session", b.value), false);
  await update(store, "session", () => original, (value: typeof original) => { value.counter++; });
  assert.equal((await store.get<typeof original>("session"))?.value.counter, 2);
});
test("OAuth state in memory is single use with the standard concurrency helper", async t => {
  const store = new MemoryStore(() => 1);
  t.after(() => store.close());
  await store.put("oauth", { expires: 10, used: false });
  const consume = () => update(store, "oauth", () => { throw new Error("missing"); }, (value: { expires: number; used: boolean }) => {
    if (value.used) throw new Error("used");
    value.used = true;
  });
  const outcomes = await Promise.allSettled([consume(), consume()]);
  assert.equal(outcomes.filter(value => value.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(value => value.status === "rejected").length, 1);
});
test("memory records must have a finite expiry", async t => {
  const store = new MemoryStore();
  t.after(() => store.close());
  await assert.rejects(store.put("invalid", {}), /expiry/);
  await assert.rejects(store.put("invalid", { expires: Infinity }), /expiry/);
});
