import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  inspectPrincipal, readOwnPrincipal, selectGraphProbe, probeGraph, probeExistingGraphAccess, probeSubscription, discoverApplicationSubscriptions,
  type GraphPermission,
} from "../src/backend/onboarding-flow.js";

const tenant = randomUUID(), partner = randomUUID(), appId = randomUUID(), subscriptionId = randomUUID();
const principal = { id: randomUUID(), appId, appOwnerOrganizationId: partner, displayName: "Test app", accountEnabled: true };
const sub = { subscriptionId, tenantId: tenant, displayName: "Test subscription", state: "Enabled" };
const permissions = (...values: string[]): GraphPermission[] => values.map(value => ({ id: randomUUID(), value, displayName: value }));

test("identity lookup reads only this application's own principal with an app token", async () => {
  const result = await readOwnPrincipal(appId, partner, "test-only-app-token", async (url, options) => {
    assert.equal(new URL(String(url)).pathname, `/v1.0/servicePrincipals(appId='${appId}')`);
    assert.equal(new URL(String(url)).searchParams.get("$select"), "id,appId,appOwnerOrganizationId,displayName,accountEnabled");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-only-app-token");
    assert.equal(options?.method ?? "GET", "GET");
    assert.equal(options?.body, undefined);
    assert.equal(options?.redirect, "error");
    return Response.json(principal);
  });
  assert.deepEqual(result, principal);
});

test("only a real own-principal 404 is missing; blocked queries do not imply absence", async () => {
  assert.equal(await readOwnPrincipal(appId, partner, "test-only-token", async () => new Response(null, { status: 404 })), undefined);
  for (const status of [401, 403, 429, 500]) {
    await assert.rejects(readOwnPrincipal(appId, partner, "test-only-token", async () => new Response("private-error", { status })),
      /application_permission_denied|application_query_failed/);
  }
  await assert.rejects(readOwnPrincipal(appId, partner, "test-only-token", async () => Response.json({ ...principal, appOwnerOrganizationId: randomUUID() })), /principal_context_mismatch/);
});

test("existing Graph access can be tested without directory inventory privileges or extra grants", async () => {
  let calls = 0;
  const result = await probeExistingGraphAccess("test-only-token", tenant, async (url, options) => {
    calls++;
    assert.equal(options?.method ?? "GET", "GET");
    assert.equal(options?.body, undefined);
    if (calls === 1) {
      assert.equal(new URL(String(url)).pathname, "/v1.0/organization");
      return new Response(null, { status: 403 });
    }
    assert.equal(new URL(String(url)).pathname, "/v1.0/reports/getOffice365ActiveUserCounts(period='D7')");
    return new Response(null, { status: 302, headers: { location: "https://example.invalid/report" } });
  });
  assert.equal(calls, 2);
  assert.equal(result.evidence, "report_authorized");
});

test("existing-access probes never mask denied access, invalid tenant or provider failure as success", async () => {
  const denied = await probeExistingGraphAccess("test-only-token", tenant, async () => new Response(null, { status: 403 }));
  assert.equal(denied.status, "failed");
  let calls = 0;
  const wrongTenant = await probeExistingGraphAccess("test-only-token", tenant, async () => {
    calls++; return Response.json({ value: [{ id: randomUUID() }] });
  });
  assert.equal(wrongTenant.error, "application_tenant_mismatch");
  assert.equal(calls, 1);
  const unavailable = await probeExistingGraphAccess("test-only-token", tenant, async () => new Response(null, { status: 503 }));
  assert.equal(unavailable.status, "failed");
});

test("principal check is read-only and distinguishes missing from a validated existing app", () => {
  assert.equal(inspectPrincipal([], appId, partner), undefined);
  assert.deepEqual(inspectPrincipal([principal], appId.toUpperCase(), partner.toUpperCase()), principal);
});
test("principal check rejects a wrong owner, wrong app, disabled, malformed or ambiguous identity", () => {
  for (const values of [
    [{ ...principal, appOwnerOrganizationId: randomUUID() }], [{ ...principal, appId: randomUUID() }],
    [{ ...principal, accountEnabled: false }], [{ id: "invalid" }], [principal, principal],
  ]) assert.throws(() => inspectPrincipal(values, appId, partner), /principal_context_mismatch/);
});
test("Graph selects only supported read queries based on effective application grants", () => {
  assert.equal(selectGraphProbe(permissions("Reports.Read.All", "Directory.Read.All"))?.kind, "reports");
  for (const value of ["Organization.Read.All", "Directory.Read.All", "Directory.ReadWrite.All", "Organization.ReadWrite.All"]) {
    assert.equal(selectGraphProbe(permissions(value))?.kind, "organization");
  }
  assert.equal(selectGraphProbe(permissions("User.Read.All")), undefined);
  assert.equal(selectGraphProbe([]), undefined);
});
test("Graph organization probe uses the application token, reads only selected metadata and verifies the tenant", async () => {
  const probe = selectGraphProbe(permissions("Organization.Read.All"));
  assert.ok(probe);
  const request: typeof fetch = async (url, options) => {
    assert.equal(String(url), "https://graph.microsoft.com/v1.0/organization?$select=id,displayName");
    assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-only-app-token");
    assert.equal(options?.redirect, "manual");
    assert.equal(options?.method ?? "GET", "GET");
    return Response.json({ value: [{ id: tenant.toUpperCase() }] });
  };
  assert.equal((await probeGraph(probe, "test-only-app-token", tenant, request)).status, "passed");
  const wrong: typeof fetch = async () => Response.json({ value: [{ id: randomUUID() }] });
  assert.equal((await probeGraph(probe, "test-only-app-token", tenant, wrong)).error, "application_tenant_mismatch");
});
test("report probe accepts 302 without following, returning or logging its signed download URL", async () => {
  const probe = selectGraphProbe(permissions("Reports.Read.All"));
  assert.ok(probe);
  const signed = "https://reports.example.invalid/download?signature=test-only-sensitive-value";
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    calls++; assert.equal(options?.redirect, "manual");
    return new Response(null, { status: 302, headers: { location: signed } });
  };
  const result = await probeGraph(probe, "test-only-app-token", tenant, request);
  assert.equal(calls, 1); assert.equal(result.status, "passed");
  assert.equal(result.evidence, "report_authorized"); assert.equal(result.httpStatus, 302);
  assert.equal(JSON.stringify(result).includes(signed), false);
  assert.equal(JSON.stringify(result).includes("test-only-app-token"), false);
});
test("Graph permission failures do not become green results or expose upstream bodies", async () => {
  const probe = selectGraphProbe(permissions("Reports.Read.All"));
  assert.ok(probe);
  const request: typeof fetch = async () => new Response("test-only-private-provider-message", { status: 403 });
  const result = await probeGraph(probe, "test-only-token", tenant, request);
  assert.equal(result.status, "failed"); assert.equal(result.error, "application_permission_denied");
  assert.equal(JSON.stringify(result).includes("test-only-private"), false);
});
test("Graph does not trust arbitrary probe URLs or malformed successful responses", async () => {
  const noRequest: typeof fetch = async () => { throw new Error("Unexpected request"); };
  await assert.rejects(probeGraph({ kind: "reports", endpoint: "https://example.invalid" }, "test-only-token", tenant, noRequest), /Untrusted/);
  const probe = selectGraphProbe(permissions("Organization.Read.All"));
  assert.ok(probe);
  await assert.rejects(probeGraph(probe, "test-only-token", tenant, async () => Response.json({})), /invalid_microsoft_response/);
  await assert.rejects(probeGraph(probe, "test-only-token", tenant, async () => new Response("invalid-json")), /invalid_microsoft_response/);
});
test("report redirect without a safe HTTPS location is not a successful authorization check", async () => {
  const probe = selectGraphProbe(permissions("Reports.Read.All"));
  assert.ok(probe);
  for (const location of ["http://example.invalid", "https://user:password@example.invalid", "invalid"]) {
    await assert.rejects(probeGraph(probe, "test-only-token", tenant,
      async () => new Response(null, { status: 302, headers: { location } })), /invalid_microsoft_response/);
  }
});
test("Azure application probe verifies subscription ID, enabled state and customer tenant", async () => {
  assert.equal((await probeSubscription(subscriptionId, tenant, "test-only-token", async () => Response.json(sub))).status, "passed");
  for (const result of [{ ...sub, tenantId: randomUUID() }, { ...sub, subscriptionId: randomUUID() }, { ...sub, state: "Disabled" }]) {
    const check = await probeSubscription(subscriptionId, tenant, "test-only-token", async () => Response.json(result));
    assert.equal(check.status, "failed"); assert.equal(check.error, "application_tenant_mismatch");
  }
  const forbidden = await probeSubscription(subscriptionId, tenant, "test-only-token", async () => new Response(null, { status: 403 }));
  assert.equal(forbidden.error, "application_permission_denied");
});
test("Azure discovery uses the app token, paginates and excludes other tenants or disabled subscriptions", async () => {
  const second = { ...sub, subscriptionId: randomUUID() };
  let calls = 0;
  const request: typeof fetch = async (_url, options) => {
    calls++; assert.equal(new Headers(options?.headers).get("Authorization"), "Bearer test-only-app-token");
    assert.equal(options?.method ?? "GET", "GET");
    return Response.json(calls === 1 ? {
      value: [sub, { ...sub, subscriptionId: randomUUID(), tenantId: randomUUID() }, { ...sub, subscriptionId: randomUUID(), state: "Disabled" }],
      nextLink: "https://management.azure.com/subscriptions?api-version=2022-12-01&next=test",
    } : { value: [second, sub] });
  };
  assert.deepEqual(await discoverApplicationSubscriptions("test-only-app-token", tenant, request), [sub, second]);
  assert.equal(calls, 2);
});
test("no application-visible Azure subscriptions is an empty list, not a fabricated grant or a provider failure", async () => {
  assert.deepEqual(await discoverApplicationSubscriptions("test-only-token", tenant, async () => Response.json({ value: [] })), []);
  await assert.rejects(discoverApplicationSubscriptions("test-only-token", tenant, async () => new Response(null, { status: 403 })), /application_permission_denied/);
});
test("Azure discovery rejects hostile pagination and malformed data before exposing application tokens", async () => {
  let calls = 0;
  await assert.rejects(discoverApplicationSubscriptions("test-only-token", tenant, async () => {
    calls++; return Response.json({ value: [], nextLink: "https://example.invalid/steal" });
  }), /invalid_microsoft_response/);
  assert.equal(calls, 1);
  await assert.rejects(discoverApplicationSubscriptions("test-only-token", tenant,
    async () => Response.json({ value: [{ subscriptionId: "invalid" }] })), /invalid_microsoft_response/);
});
test("Azure discovery has a finite pagination bound", async () => {
  let calls = 0;
  await assert.rejects(discoverApplicationSubscriptions("test-only-token", tenant, async () => {
    calls++; return Response.json({ value: [], nextLink: "https://management.azure.com/subscriptions?next=repeated" });
  }), /too_many_pages/);
  assert.equal(calls, 100);
});
