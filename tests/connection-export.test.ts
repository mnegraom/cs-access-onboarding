import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { exportConnection } from "../src/backend/connection-export.js";

function fixture() {
  const tenant = randomUUID(), subscriptionId = randomUUID();
  return {
    appId: randomUUID(), partnerTenantId: randomUUID(), customerTenantId: tenant,
    principalId: randomUUID(), principalState: "exists",
    branches: ["azure", "m365"] as ("azure" | "m365")[],
    subscriptions: [{ subscriptionId, tenantId: tenant, displayName: "Customer subscription", state: "Enabled" }],
    selected: [subscriptionId],
    clientSecret: "test-only-secret", cache: "test-only-token-cache",
    email: "private@example.invalid", csrf: "test-only-csrf",
    graphCheck: { status: "passed" }, grants: [{ id: "private-grant-record" }],
  };
}
test("connection export contains reusable IDs and names, never session, secret, history or access status", () => {
  const input = fixture();
  const result = exportConnection(input);
  assert.deepEqual(result, {
    schemaVersion: 1,
    application: { clientId: input.appId, partnerTenantId: input.partnerTenantId, customerPrincipalId: input.principalId },
    customerTenantId: input.customerTenantId, services: ["azure", "m365"],
    selectedSubscriptions: [{ subscriptionId: input.selected[0], displayName: "Customer subscription" }],
  });
  for (const value of ["test-only-secret", "test-only-token-cache", "private@example.invalid", "test-only-csrf", "private-grant-record", "passed"]) {
    assert.equal(JSON.stringify(result).includes(value), false);
  }
});
test("export requires a checked identity and never guesses subscriptions", () => {
  const input = fixture();
  for (const principalState of ["missing", "not_checked"]) {
    assert.throws(() => exportConnection({ ...input, principalState }), /principal_required/);
  }
  assert.throws(() => exportConnection({ ...input, selected: [randomUUID()] }), /subscription_not_eligible/);
  assert.throws(() => exportConnection({ ...input, subscriptions: [{ ...input.subscriptions[0]!, tenantId: randomUUID() }] }), /subscription_not_eligible/);
  assert.throws(() => exportConnection({ ...input, subscriptions: [{ ...input.subscriptions[0]!, state: "Disabled" }] }), /subscription_not_eligible/);
});
test("export includes only explicitly selected subscriptions and supports Microsoft 365 alone", () => {
  const input = fixture();
  assert.deepEqual(exportConnection({ ...input, branches: ["m365"], selected: [] }).selectedSubscriptions, []);
  assert.deepEqual(exportConnection({ ...input, selected: [] }).selectedSubscriptions, []);
  assert.equal(exportConnection({ ...input, selected: [...input.selected, ...input.selected] }).selectedSubscriptions.length, 1);
  assert.throws(() => exportConnection({ ...input, branches: ["m365"] }), /subscription_not_eligible/);
});
