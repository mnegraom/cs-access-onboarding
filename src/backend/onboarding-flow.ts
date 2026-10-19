import { z } from "zod";
import { HttpError, eligible, type Scope } from "./core.js";

export interface GraphPermission { id: string; value: string; displayName: string }
/** A passed check proves only its recorded evidence, not every permission or collection endpoint. */
export interface AccessCheck {
  status: "not_tested" | "passed" | "failed" | "unsupported";
  checkedAt?: number;
  endpoint?: string;
  httpStatus?: number;
  error?: string;
  microsoftErrorCode?: string;
  evidence?: "organization_read" | "report_authorized" | "subscription_read" | "subscription_list";
}
export interface GraphProbe { kind: "organization" | "reports"; endpoint: string }
const organizationProbe: GraphProbe = {
  kind: "organization", endpoint: "https://graph.microsoft.com/v1.0/organization?$select=id,displayName",
};
const reportsProbe: GraphProbe = {
  kind: "reports", endpoint: "https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserCounts(period='D7')",
};
const principalSchema = z.object({
  id: z.uuid(), appId: z.uuid(), appOwnerOrganizationId: z.uuid(),
  displayName: z.string(), accountEnabled: z.boolean(),
});
export type GraphPrincipal = z.infer<typeof principalSchema>;

/** Empty results mean missing; malformed, ambiguous, disabled or mismatched identities must not. */
export function inspectPrincipal(values: unknown[], appId: string, partnerTenantId: string): GraphPrincipal | undefined {
  if (!values.length) return undefined;
  const parsed = principalSchema.safeParse(values[0]);
  if (values.length !== 1 || !parsed.success ||
      parsed.data.appId.toLowerCase() !== appId.toLowerCase() ||
      parsed.data.appOwnerOrganizationId.toLowerCase() !== partnerTenantId.toLowerCase() ||
      !parsed.data.accountEnabled) throw new HttpError(409, "principal_context_mismatch");
  return parsed.data;
}
/** Reads this app only; treats only HTTP 404 as missing, while blocked/token failures remain unverified. */
export async function readOwnPrincipal(
  appId: string, partnerTenantId: string, token: string, request: typeof fetch = fetch,
): Promise<GraphPrincipal | undefined> {
  const id = z.uuid().parse(appId);
  const endpoint = `https://graph.microsoft.com/v1.0/servicePrincipals(appId='${id}')?$select=id,appId,appOwnerOrganizationId,displayName,accountEnabled`;
  const response = await request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (response.status === 404) return undefined;
  if (response.status !== 200) throw new HttpError(response.status === 403 ? 403 : 502,
    response.status === 403 ? "application_permission_denied" : "application_query_failed");
  return inspectPrincipal([await microsoftJson(response)], appId, partnerTenantId);
}

/** Without inventory privileges, try another supported read only after 403, not after a tenant/provider failure. */
export async function probeExistingGraphAccess(
  token: string, tenantId: string, request: typeof fetch = fetch,
): Promise<AccessCheck> {
  const first = await probeGraph(organizationProbe, token, tenantId, request);
  if (first.status === "passed" || first.httpStatus !== 403) return first;
  return probeGraph(reportsProbe, token, tenantId, request);
}
export function selectGraphProbe(permissions: GraphPermission[]): GraphProbe | undefined {
  const values = new Set(permissions.map(p => p.value));
  if (values.has("Reports.Read.All")) return reportsProbe;
  if (["Organization.Read.All", "Directory.Read.All", "Organization.ReadWrite.All", "Directory.ReadWrite.All"].some(p => values.has(p))) {
    return organizationProbe;
  }
  return undefined;
}
function failed(endpoint: string, httpStatus: number, error: string): AccessCheck {
  console.error(JSON.stringify({ event: "application_access_failed", host: new URL(endpoint).hostname, httpStatus, code: error }));
  return { status: "failed", checkedAt: Date.now(), endpoint, httpStatus, error };
}
async function microsoftJson(response: Response): Promise<unknown> {
  try { return await response.json(); } catch (error) {
    if (error instanceof SyntaxError) throw new HttpError(502, "invalid_microsoft_response");
    throw error;
  }
}
/** Verifies customer organization metadata or report authorization; never downloads the signed report URL. */
export async function probeGraph(
  probe: GraphProbe, token: string, tenantId: string, request: typeof fetch = fetch,
): Promise<AccessCheck> {
  const expected = probe.kind === "reports"
    ? "https://graph.microsoft.com/v1.0/reports/getOffice365ActiveUserCounts(period='D7')"
    : "https://graph.microsoft.com/v1.0/organization?$select=id,displayName";
  if (probe.endpoint !== expected) throw new Error("Untrusted Graph probe URL");
  const response = await request(probe.endpoint, {
    headers: { Authorization: `Bearer ${token}` }, redirect: "manual", signal: AbortSignal.timeout(30_000),
  });
  if (probe.kind === "reports" && response.status === 302) {
    const location = response.headers.get("location");
    if (!location || !URL.canParse(location)) throw new HttpError(502, "invalid_microsoft_response");
    const download = new URL(location);
    if (download.protocol !== "https:" || download.username || download.password) throw new HttpError(502, "invalid_microsoft_response");
    return { status: "passed", checkedAt: Date.now(), endpoint: probe.endpoint, httpStatus: 302, evidence: "report_authorized" };
  }
  if (response.status !== 200 || probe.kind !== "organization") {
    return failed(probe.endpoint, response.status,
      response.status === 403 ? "application_permission_denied" : "application_query_failed");
  }
  const parsed = z.object({ value: z.array(z.object({ id: z.uuid() })) }).safeParse(await microsoftJson(response));
  if (!parsed.success) throw new HttpError(502, "invalid_microsoft_response");
  if (parsed.data.value.length !== 1 || parsed.data.value[0]?.id.toLowerCase() !== tenantId.toLowerCase()) {
    return failed(probe.endpoint, response.status, "application_tenant_mismatch");
  }
  return { status: "passed", checkedAt: Date.now(), endpoint: probe.endpoint, httpStatus: 200, evidence: "organization_read" };
}
/** A successful metadata GET does not prove access to cost APIs or every resource in the subscription. */
export async function probeSubscription(
  subscriptionId: string, tenantId: string, token: string, request: typeof fetch = fetch,
): Promise<AccessCheck> {
  const id = z.uuid().parse(subscriptionId);
  const endpoint = `https://management.azure.com/subscriptions/${id}?api-version=2022-12-01`;
  const response = await request(endpoint, {
    headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(30_000),
  });
  if (response.status !== 200) return failed(endpoint, response.status,
    response.status === 403 ? "application_permission_denied" : "application_query_failed");
  const parsed = z.object({
    subscriptionId: z.uuid(), tenantId: z.uuid(), displayName: z.string(), state: z.string(),
  }).safeParse(await microsoftJson(response));
  if (!parsed.success) throw new HttpError(502, "invalid_microsoft_response");
  if (parsed.data.subscriptionId.toLowerCase() !== id.toLowerCase() || !eligible(parsed.data, tenantId)) {
    return failed(endpoint, response.status, "application_tenant_mismatch");
  }
  return { status: "passed", checkedAt: Date.now(), endpoint, httpStatus: 200, evidence: "subscription_read" };
}

/** Lists enabled customer-tenant subscriptions visible to the app, not the administrator's selection list. */
export async function discoverApplicationSubscriptions(
  token: string, tenantId: string, request: typeof fetch = fetch,
): Promise<Scope[]> {
  const schema = z.object({
    value: z.array(z.object({
      subscriptionId: z.uuid(), tenantId: z.uuid(), displayName: z.string(), state: z.string(),
    })), nextLink: z.url().optional(),
  });
  const found = new Map<string, Scope>();
  let url: string | undefined = "https://management.azure.com/subscriptions?api-version=2022-12-01";
  let pages = 0;
  while (url) {
    // Treat pagination links as untrusted: never send the bearer token to a different host or API path.
    const parsed = new URL(url);
    if (parsed.origin !== "https://management.azure.com" || parsed.username || parsed.password || parsed.pathname !== "/subscriptions") {
      throw new HttpError(502, "invalid_microsoft_response");
    }
    if (++pages > 100) throw new HttpError(502, "too_many_pages");
    const response = await request(url, {
      headers: { Authorization: `Bearer ${token}` }, redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (response.status !== 200) throw new HttpError(response.status === 403 ? 403 : 502,
      response.status === 403 ? "application_permission_denied" : "application_query_failed");
    const page = schema.safeParse(await microsoftJson(response));
    if (!page.success) throw new HttpError(502, "invalid_microsoft_response");
    for (const sub of page.data.value) if (eligible(sub, tenantId)) found.set(sub.subscriptionId, sub);
    url = page.data.nextLink;
  }
  return [...found.values()];
}
