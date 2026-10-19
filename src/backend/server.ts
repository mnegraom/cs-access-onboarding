import express, { type Request, type Response } from "express";
import helmet from "helmet";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import { AuthError, InteractionRequiredAuthError, ConfidentialClientApplication, type AuthenticationResult } from "@azure/msal-node";
import { z } from "zod";
import {
  HttpError, SESSION_TTL, opaque, digest, normalizeEmail,
  update, eligible, roles, assignmentName, type Scope,
} from "./core.js";
import type { PortalOptions, PortalServices } from "./contracts.js";
import { exportConnection } from "./connection-export.js";
import { hasPartnerCredential, partnerAuth, partnerCodeRequest, partnerApplicationRequest, partnerDelegatedScopes } from "./partner-auth.js";
import { describeError, errorHandler, OAuthAuthorizationError } from "./errors.js";
import {
  readOwnPrincipal, selectGraphProbe, probeGraph, probeExistingGraphAccess, probeSubscription, discoverApplicationSubscriptions,
  type GraphPrincipal, type GraphPermission, type AccessCheck,
} from "./onboarding-flow.js";

/**
 * Builds the portal without selecting hosting, operator authentication or storage/email vendors.
 * The caller initializes its providers and owns the HTTP listener and transient-store lifecycle.
 */
export function createPortal(options: PortalOptions, services: PortalServices) {
  const config = z.object({
    publicOrigin: z.url(),
    partnerName: z.string().min(1),
    frontendDirectory: z.string().min(1).optional(),
  }).parse(options);
  const origin = new URL(config.publicOrigin).origin;
  if (!origin.startsWith("https://")) throw new Error("publicOrigin must use HTTPS");
  const { operatorAuth, transientStore: transient } = services;
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", 1);
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], scriptSrc: ["'self'"], styleSrc: ["'self'"],
    imgSrc: ["'self'", "data:"], connectSrc: ["'self'"], frameAncestors: ["'none'"],
    formAction: ["'self'"], baseUri: ["'self'"],
  } } }));
  app.use(express.json({ limit: "16kb" }));
  app.use("/api", (_req, res, next) => { res.setHeader("Cache-Control", "no-store"); next(); });
  app.use("/auth", (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("Referrer-Policy", "no-referrer");
    next();
  });

  /** Assignment attempts tracked for this session only, not a durable history of ownership. */
  interface Grant { id: string; role: string; scope: string; status: "intended" | "created" | "revoked" }
  /** Consent acceptance, permission inventory and functional access evidence remain independent. */
  interface Onboarding {
    appId: string; customerTenantId: string; partnerTenantId: string;
    branches: ("azure" | "m365")[];
    principalId?: string; principalName?: string;
    principalState?: "not_checked" | "missing" | "exists";
    principalCheckedAt?: number;
    principalCheck?: AccessCheck;
    subscriptions: Scope[]; selected: string[]; grants: Grant[];
    m365: "not_selected" | "pending" | "configured";
    m365CheckedAt?: number;
    consent?: {
      status: "pending" | "accepted" | "declined" | "failed"; at: number;
      error?: { code: string; microsoftErrorCode?: string; resourceAppId?: string; reference: string };
    };
    graphPermissions?: GraphPermission[];
    graphPermissionCheck?: AccessCheck;
    graphCheck?: AccessCheck;
    subscriptionsCheckedAt?: number;
    azureGrants?: { subscriptionId: string; status: string }[];
    azureChecks?: Record<string, AccessCheck>;
    azureExisting?: Scope[];
    azureDiscoveryCheck?: AccessCheck;
  }
  /** Losing this process-local state loses credentials/tracking, but does not revoke Microsoft access. */
  interface Session {
    email: string; expires: number; csrf: string; tokenHash: string; cache?: string;
    accounts: Record<string, string>;
    microsoftLogins?: Partial<Record<"identity" | "arm", { username: string; at: number }>>;
    reauthorization?: { kind: "arm"; at: number };
    clientSecret?: string; secretExpires?: number; credentialVersion?: string;
    onboarding?: Onboarding; lastError?: string;
  }
  /** One-use redirect context bound to the portal session, customer tenant and credential version. */
  interface OAuth {
    sessionId: string; tenant: string; kind: "identity" | "arm" | "consent";
    expires: number; used: boolean; verifier?: string; nonce?: string;
    purpose?: "revoke";
    after?: "discover";
    credentialVersion: string;
    existingPrincipal?: boolean;
  }
  interface AppRole { id: string; appRoleId: string; resourceId: string }
  const scopes = partnerDelegatedScopes;
  function cookie(req: Request): string | undefined {
    const value = req.headers.cookie?.split(";").map(s => s.trim()).find(s => s.startsWith("__Host-cs_session="))?.split("=")[1];
    return value && /^[A-Za-z0-9_-]{43}$/.test(value) ? value : undefined;
  }
  /** Authorizes the portal operator, not customer API access; mutations also require origin and CSRF. */
  async function session(req: Request): Promise<{ id: string; data: Session }> {
    const token = cookie(req);
    if (!token) throw new HttpError(401, "login_required");
    const id = digest(token);
    const stored = await transient.get<Session>(`sessions/${id}`);
    if (!stored || stored.value.tokenHash !== digest(token) || Date.now() >= stored.value.expires || !await operatorAuth.isAuthorized(stored.value.email)) throw new HttpError(401, "session_expired");
    if (req.method !== "GET" && req.method !== "HEAD") {
      if (req.headers.origin !== origin || req.headers["x-csrf-token"] !== stored.value.csrf) throw new HttpError(403, "csrf_failed");
    }
    return { id, data: stored.value };
  }
  /** Applies conflict-aware changes to an existing, unexpired session; expiry is not refreshed here. */
  async function saveSession(id: string, change: (data: Session) => void) {
    return update<Session, void>(transient, `sessions/${id}`, () => { throw new HttpError(401, "session_expired"); }, data => {
      if (Date.now() >= data.expires) throw new HttpError(401, "session_expired");
      change(data);
    });
  }
  function requireOnboarding(data: Session): Onboarding {
    if (!data.onboarding) throw new HttpError(409, "onboarding_required");
    return data.onboarding;
  }
  async function msal(data: Session, tenant: string) {
    const client = new ConfidentialClientApplication({ auth: partnerAuth(data, tenant) });
    if (data.cache) client.getTokenCache().deserialize(data.cache);
    return client;
  }
  /**
   * Acquires delegated ARM access for the customer account, reusing identity-login cache when possible.
   * Basic sign-in alone grants no ARM scope; interaction-required errors return control to the UI.
   */
  async function token(sessionId: string, data: Session, tenant: string, kind: "arm") {
    const client = await msal(data, tenant);
    const selectedAccount = data.accounts[`${tenant}:${kind}`] ??
      data.accounts[`${tenant}:identity`];
    const account = (await client.getTokenCache().getAllAccounts()).find(a =>
      a.tenantId.toLowerCase() === tenant.toLowerCase() && a.homeAccountId === selectedAccount);
    if (!account) throw new HttpError(409, `${kind}_login_required`);
    let result: AuthenticationResult;
    try {
      result = await client.acquireTokenSilent({ account, scopes: scopes(kind) });
    } catch (error) {
      if (kind === "arm" && error instanceof InteractionRequiredAuthError) throw new HttpError(409, "arm_login_required");
      throw error;
    }
    await saveSession(sessionId, s => {
      if (s.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      s.cache = client.getTokenCache().serialize();
      s.accounts[`${tenant}:${kind}`] = account.homeAccountId;
      s.microsoftLogins ??= {};
      s.microsoftLogins[kind] = { username: account.username, at: Date.now() };
    });
    return result.accessToken;
  }
  async function api<T>(url: string, bearer: string, method = "GET", body?: unknown): Promise<T> {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" || !["graph.microsoft.com", "management.azure.com"].includes(parsed.hostname) || parsed.username || parsed.password || parsed.port) throw new Error("Untrusted Microsoft API URL");
    const response = await fetch(url, {
      method, headers: { Authorization: `Bearer ${bearer}`, "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      redirect: "error", signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) {
      console.error(JSON.stringify({ event: "microsoft_api_failed", status: response.status, host: parsed.hostname, requestId: response.headers.get("request-id") ?? response.headers.get("x-ms-request-id") }));
      throw new HttpError(response.status === 403 ? 403 : 502, response.status === 403 ? "microsoft_permission_denied" : "microsoft_request_failed");
    }
    if (response.status === 204) return undefined as T;
    return await response.json() as T;
  }
  async function list<T>(url: string, bearer: string): Promise<T[]> {
    const values: T[] = [];
    const host = new URL(url).hostname;
    for (let page = 0; url && page < 100; page++) {
      if (new URL(url).hostname !== host) throw new Error("Cross-resource pagination URL");
      const result = await api<{ value: T[]; nextLink?: string; "@odata.nextLink"?: string }>(url, bearer);
      if (!Array.isArray(result.value)) throw new Error("Invalid Microsoft list response");
      values.push(...result.value);
      url = result.nextLink ?? result["@odata.nextLink"] ?? "";
      if (page === 99 && url) throw new HttpError(502, "pagination_limit");
    }
    return values;
  }
  function hasCustomerIdentity(data: Session) {
    const o = data.onboarding;
    return Boolean(o && data.cache && hasPartnerCredential(data) && data.accounts[`${o.customerTenantId}:identity`]);
  }
  function requireCustomerIdentity(data: Session) {
    if (!hasCustomerIdentity(data)) throw new HttpError(409, "identity_login_required");
  }
  /** Uses prior application grants in the customer tenant; never substitutes a delegated user token. */
  async function applicationToken(data: Session, resource: "graph" | "arm") {
    const o = requireOnboarding(data);
    const client = new ConfidentialClientApplication({ auth: partnerAuth(data, o.customerTenantId) });
    const result = await client.acquireTokenByClientCredential(partnerApplicationRequest(resource));
    if (!result?.accessToken) throw new HttpError(502, "application_token_missing");
    return result.accessToken;
  }
  const armBase = (subscription: string) => `https://management.azure.com/subscriptions/${subscription}`;
  const assignmentUrl = (subscription: string) => `${armBase(subscription)}/providers/Microsoft.Authorization/roleAssignments`;
  interface Assignment { id: string; properties: { principalId: string; roleDefinitionId: string; scope: string } }
  /** Returns direct subscription assignments only; inherited/group access is not a rollback target. */
  async function assignments(subscription: string, principal: string, bearer: string) {
    const values = await list<Assignment>(`${assignmentUrl(subscription)}?api-version=2022-04-01&$filter=${encodeURIComponent(`assignedTo('${principal}')`)}`, bearer);
    return values.filter(a => a.properties.principalId.toLowerCase() === principal.toLowerCase() &&
      a.properties.scope.toLowerCase() === `/subscriptions/${subscription}`.toLowerCase());
  }
  /** Browser projection deliberately excludes the secret, serialized MSAL cache and raw session token. */
  function publicStatus(data: Session) {
    const o = data.onboarding;
    return {
      email: data.email, csrf: data.csrf, onboarding: o,
      authentication: {
        identity: hasCustomerIdentity(data),
        arm: Boolean(o && data.cache && hasPartnerCredential(data) && data.accounts[`${o.customerTenantId}:arm`]),
        logins: data.microsoftLogins ?? {},
      },
      effectiveAccess: {
        graph: o?.graphCheck ?? { status: "not_tested" },
        azure: o?.azureChecks ?? {},
      },
      emailEnabled: operatorAuth.enabled,
      hasCredential: hasPartnerCredential(data),
      lastError: data.lastError,
    };
  }
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/config", (_req, res) => res.json({
    partnerName: config.partnerName, emailEnabled: operatorAuth.enabled,
  }));
  app.get("/api/context", async (req, res) => {
    await session(req);
    res.json({ callbackUrl: `${origin}/auth/microsoft/callback` });
  });
  app.get("/api/onboarding/export", async (req, res) => {
    const s = await session(req);
    res.setHeader("Content-Disposition", 'attachment; filename="onboarding-connection.json"');
    res.json(exportConnection(requireOnboarding(s.data)));
  });
  /** Called by a trusted auth provider only after it verifies identity; no public session-creation route. */
  async function completeLogin(verifiedEmail: string, res: Response) {
    const address = normalizeEmail(z.email().parse(verifiedEmail));
    if (!await operatorAuth.isAuthorized(address)) throw new HttpError(403, "operator_not_authorized");
    const raw = opaque();
    const id = digest(raw);
    const data: Session = { email: address, csrf: opaque(), tokenHash: digest(raw), expires: Date.now() + SESSION_TTL, accounts: {}, microsoftLogins: {} };
    if (!await transient.put(`sessions/${id}`, data)) throw new HttpError(503, "session_creation_failed");
    // A new portal login starts empty and invalidates the prior session instead of restoring its connection.
    const previousId = await update(transient, `active/${digest(address)}`, () => ({ sessionId: id, expires: data.expires }), current => {
      const previous = current.sessionId;
      current.sessionId = id; current.expires = data.expires;
      return previous;
    });
    if (previousId !== id) transient.delete(`sessions/${previousId}`);
    res.cookie("__Host-cs_session", raw, { httpOnly: true, secure: true, sameSite: "lax", path: "/" });
    res.json(publicStatus(data));
  }
  const operatorRoutes = express.Router();
  operatorAuth.registerRoutes(operatorRoutes, {
    publicOrigin: origin, partnerName: config.partnerName, completeLogin,
  });
  app.use("/api", operatorRoutes);
  app.get("/api/session", async (req, res) => res.json(publicStatus((await session(req)).data)));
  app.post("/api/logout", async (req, res) => {
    const s = await session(req);
    transient.delete(`sessions/${s.id}`);
    res.clearCookie("__Host-cs_session", { secure: true, httpOnly: true, sameSite: "lax", path: "/" });
    res.sendStatus(204);
  });
  app.post("/api/onboarding", async (req, res) => {
    const s = await session(req);
    if (s.data.onboarding) throw new HttpError(409, "onboarding_already_started");
    const uuid = z.uuid().transform(value => value.toLowerCase());
    const input = z.object({
      appId: uuid, customerTenantId: uuid, partnerTenantId: uuid,
      clientSecret: z.string().min(1).max(4096),
      branches: z.array(z.enum(["azure", "m365"])).min(1).max(2),
    }).parse(req.body);
    const { clientSecret, ...connection } = input;
    await saveSession(s.id, data => {
      data.clientSecret = clientSecret;
      data.secretExpires = data.expires;
      data.credentialVersion = opaque();
      data.onboarding = {
      ...connection, subscriptions: [], selected: [], grants: [],
      m365: !input.branches.includes("m365") ? "not_selected" : "pending",
      principalState: "not_checked", graphCheck: { status: "not_tested" }, azureChecks: {},
      azureExisting: [],
    }; });
    res.status(201).json({ status: "created" });
  });
  app.post("/api/onboarding/credential", async (req, res) => {
    const s = await session(req);
    requireOnboarding(s.data);
    const { clientSecret } = z.object({ clientSecret: z.string().min(1).max(4096) }).parse(req.body);
    // Rotating the version also invalidates pending OAuth redirects issued for the previous credential.
    await saveSession(s.id, data => {
      data.clientSecret = clientSecret;
      data.secretExpires = data.expires;
      data.credentialVersion = opaque();
      data.accounts = {};
      data.microsoftLogins = {};
      delete data.cache;
      delete data.reauthorization;
      const current = requireOnboarding(data);
      current.graphCheck = { status: "not_tested" }; current.azureChecks = {};
      current.graphPermissions = []; delete current.graphPermissionCheck;
      current.principalState = "not_checked"; delete current.principalCheck;
      current.azureExisting = []; delete current.azureDiscoveryCheck; delete current.m365CheckedAt;
      delete data.lastError;
    });
    res.sendStatus(204);
  });
  app.post("/api/microsoft/start", async (req, res) => {
    const s = await session(req);
    const o = requireOnboarding(s.data);
    const { kind, purpose, after } = z.object({
      kind: z.enum(["identity", "arm"]), purpose: z.literal("revoke").optional(),
      after: z.literal("discover").optional(),
    }).parse(req.body);
    if (after && (kind !== "arm" || purpose) || purpose && kind !== "arm") throw new HttpError(400, "invalid_input");
    if (kind === "arm" && !o.branches.includes("azure")) throw new HttpError(409, "branch_not_selected");
    if (kind === "arm") requireCustomerIdentity(s.data);
    const tenant = o.customerTenantId;
    if (!hasPartnerCredential(s.data) || !s.data.credentialVersion) throw new HttpError(409, "partner_credential_required");
    const state = opaque(), verifier = opaque(), nonce = opaque();
    // This self lookup observes existing identity; only Microsoft consent can provision it here.
    const existingPrincipal = kind === "identity" ? Boolean(await inspectPrincipalAccess(s.id, s.data)) : undefined;
    const context: OAuth = { sessionId: s.id, tenant, kind, expires: Date.now() + 10 * 60_000, used: false, verifier, nonce, purpose, after, credentialVersion: s.data.credentialVersion, existingPrincipal };
    if (!await transient.put(`oauth/${digest(state)}`, context)) throw new HttpError(503, "oauth_creation_failed");
    const client = await msal(s.data, tenant);
    const url = await client.getAuthCodeUrl({
      scopes: scopes(kind),
      redirectUri: `${origin}/auth/microsoft/callback`, state, nonce,
      codeChallenge: createHash("sha256").update(verifier).digest("base64url"), codeChallengeMethod: "S256",
      prompt: purpose ? "login" : kind === "identity" ? "select_account" : undefined,
      loginHint: kind === "arm" ? s.data.microsoftLogins?.identity?.username : undefined,
    });
    res.json({ url });
  });
  app.get("/auth/microsoft/callback", async (req, res) => {
    const s = await session(req);
    const state = z.string().regex(/^[A-Za-z0-9_-]{43}$/).parse(req.query.state);
    // Consume state before handling either provider success or failure, so neither response can be replayed.
    const context = await update<OAuth, OAuth>(transient, `oauth/${digest(state)}`, () => {
      throw new HttpError(400, "invalid_oauth_state");
    }, value => {
      if (value.used || Date.now() >= value.expires || value.sessionId !== s.id ||
          value.credentialVersion !== s.data.credentialVersion || !hasPartnerCredential(s.data)) throw new HttpError(400, "invalid_oauth_state");
      value.used = true;
      return { ...value };
    });
    // Microsoft may return admin_consent=True together with an error; the error must win.
    if (req.query.error !== undefined) {
      const error = new OAuthAuthorizationError(req.query.error, req.query.error_description);
      await saveSession(s.id, data => {
        data.lastError = error.details.code;
        if (context.kind === "consent") requireOnboarding(data).consent = {
          status: error.details.code === "microsoft_authorization_declined" ? "declined" : "failed",
          at: Date.now(),
          error: {
            code: error.details.code, microsoftErrorCode: error.details.microsoftErrorCode,
            resourceAppId: error.details.resourceAppId, reference: error.correlationId,
          },
        };
      });
      throw error;
    }
    if (context.kind === "consent") {
      if (req.query.admin_consent !== "True" || typeof req.query.tenant !== "string" || req.query.tenant.toLowerCase() !== context.tenant.toLowerCase()) throw new HttpError(400, "consent_callback_invalid");
      // Consent acceptance is not a functional access test; leave that for the explicit action.
      await saveSession(s.id, data => {
        const connection = requireOnboarding(data);
        connection.consent = { status: "accepted", at: Date.now() };
        connection.graphCheck = { status: "not_tested" };
        delete data.lastError;
      });
    } else {
      const kind = context.kind;
      const code = z.string().min(1).parse(req.query.code);
      const client = await msal(s.data, context.tenant);
      const result: AuthenticationResult = await client.acquireTokenByCode(partnerCodeRequest({
        code, scopes: scopes(context.kind), redirectUri: `${origin}/auth/microsoft/callback`,
        verifier: context.verifier, nonce: context.nonce,
      }));
      const claims = z.object({ nonce: z.string() }).parse(result.idTokenClaims);
      if (result.tenantId.toLowerCase() !== context.tenant.toLowerCase() || claims.nonce !== context.nonce) throw new HttpError(400, "identity_context_mismatch");
      if (!result.account) throw new HttpError(400, "identity_context_mismatch");
      const accountId = result.account.homeAccountId;
      await saveSession(s.id, data => {
        if (data.credentialVersion !== context.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
        data.cache = client.getTokenCache().serialize();
        data.accounts[`${context.tenant}:${context.kind}`] = accountId;
        data.microsoftLogins ??= {};
        data.microsoftLogins[kind] = { username: result.account?.username ?? "", at: Date.now() };
        if (context.purpose && context.kind === "arm") {
          data.reauthorization = { kind: context.kind, at: Date.now() };
        }
        delete data.lastError;
      });
      const fresh = await session(req);
      if (context.kind === "identity") {
        // Only a pre-login confirmed identity enables automatic collection checks; new/unknown ones stay pending.
        if (context.existingPrincipal) await inspectConnection(fresh.id, fresh.data);
        else await inspectPrincipalAccess(fresh.id, fresh.data);
      }
      if (context.kind === "arm" && context.after === "discover") await discoverSubscriptions(fresh.id, fresh.data);
    }
    res.redirect("/");
  });
  /** Validates this app's metadata and prevents rebinding tracked grants to a replaced principal. */
  async function checkPrincipal(id: string, data: Session) {
    const o = requireOnboarding(data);
    const principal = await readOwnPrincipal(o.appId, o.partnerTenantId, await applicationToken(data, "graph"));
    if (o.principalId && o.principalId !== principal?.id &&
        o.grants.some(g => g.status !== "revoked")) throw new HttpError(409, "principal_changed_with_grants");
    await saveSession(id, current => {
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      const connection = requireOnboarding(current);
      connection.principalCheckedAt = Date.now();
      connection.principalCheck = { status: "passed", checkedAt: connection.principalCheckedAt };
      connection.principalState = principal ? "exists" : "missing";
      if (principal) { connection.principalId = principal.id; connection.principalName = principal.displayName; }
      else { delete connection.principalId; delete connection.principalName; }
    });
    return principal;
  }
  /** Expected lookup failures become unverified state, not absence; context mismatches still abort. */
  async function inspectPrincipalAccess(id: string, data: Session) {
    let principal: GraphPrincipal | undefined;
    const check = await captureAccessCheck(async () => {
      principal = await checkPrincipal(id, data);
      return { status: "passed", checkedAt: Date.now() };
    });
    await saveSession(id, current => {
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      const connection = requireOnboarding(current);
      connection.principalCheck = check;
      if (check.status === "failed") connection.principalState = "not_checked";
    });
    return principal;
  }
  app.post("/api/principal/check", async (req, res) => {
    const s = await session(req);
    requireCustomerIdentity(s.data);
    const principal = await checkPrincipal(s.id, s.data);
    res.json({ exists: Boolean(principal), principalId: principal?.id, displayName: principal?.displayName });
  });
  app.post("/api/onboarding/check", async (req, res) => {
    const s = await session(req);
    requireCustomerIdentity(s.data);
    await inspectConnection(s.id, s.data);
    res.json({ status: "checked" });
  });
  /** Builds the administrator-visible selection list; application-visible access is checked separately. */
  async function discoverSubscriptions(id: string, data: Session) {
    const o = requireOnboarding(data);
    if (!o.branches.includes("azure")) throw new HttpError(409, "branch_not_selected");
    const bearer = await token(id, data, o.customerTenantId, "arm");
    const subscriptions = await list<Scope>("https://management.azure.com/subscriptions?api-version=2022-12-01", bearer);
    const scopes = subscriptions.filter(sub => eligible(sub, o.customerTenantId));
    await saveSession(id, current => {
      const connection = requireOnboarding(current);
      connection.subscriptions = scopes; connection.subscriptionsCheckedAt = Date.now();
      connection.selected = connection.selected.filter(value => scopes.some(sub => sub.subscriptionId === value));
    });
    return scopes;
  }
  app.post("/api/azure/discover", async (req, res) => {
    const s = await session(req);
    requireCustomerIdentity(s.data);
    const scopes = await discoverSubscriptions(s.id, s.data);
    res.json({ subscriptions: scopes });
  });
  app.put("/api/azure/selection", async (req, res) => {
    const s = await session(req), o = requireOnboarding(s.data);
    const ids = z.object({ subscriptions: z.array(z.uuid()).min(1).max(50) }).parse(req.body).subscriptions;
    if (ids.some(id => !o.subscriptions.some(sub => sub.subscriptionId === id && eligible(sub, o.customerTenantId)))) throw new HttpError(400, "subscription_not_eligible");
    await saveSession(s.id, data => {
      const current = requireOnboarding(data);
      current.selected = [...new Set(ids)];
      current.azureChecks = {};
      delete data.lastError;
    });
    res.sendStatus(204);
  });
  app.post("/api/azure/grant", async (req, res) => {
    const s = await session(req), o = requireOnboarding(s.data);
    requireCustomerIdentity(s.data);
    z.object({ confirm: z.literal(true) }).parse(req.body);
    if (!o.principalId || !o.selected.length) throw new HttpError(409, "principal_and_selection_required");
    if (!await checkPrincipal(s.id, s.data)) throw new HttpError(409, "principal_required");
    await saveSession(s.id, data => { const current = requireOnboarding(data); current.azureChecks = {}; current.azureGrants = []; });
    const bearer = await token(s.id, s.data, o.customerTenantId, "arm");
    const result: { subscriptionId: string; status: string }[] = [];
    for (const sub of o.selected) {
      if (!o.subscriptions.some(value => value.subscriptionId === sub && eligible(value, o.customerTenantId))) throw new HttpError(409, "subscription_not_eligible");
      const live = await api<Scope>(`${armBase(sub)}?api-version=2022-12-01`, bearer);
      if (!eligible(live, o.customerTenantId)) throw new HttpError(409, "subscription_not_eligible");
      const existing = await assignments(sub, o.principalId, bearer);
      for (const role of roles) {
        if (existing.some(a => a.properties.roleDefinitionId.toLowerCase().endsWith(`/${role.id}`))) continue;
        const id = `${assignmentUrl(sub)}/${assignmentName(s.id, sub, role.id)}`;
        const path = new URL(id).pathname;
        // Save intent before the remote write so an uncertain response still leaves a path for reconciliation.
        await saveSession(s.id, data => {
          const current = requireOnboarding(data);
          if (!current.grants.some(g => g.id === path)) current.grants.push({ id: path, role: role.id, scope: sub, status: "intended" });
        });
        await api(`${id}?api-version=2022-04-01`, bearer, "PUT", {
          properties: { roleDefinitionId: `/subscriptions/${sub}/providers/Microsoft.Authorization/roleDefinitions/${role.id}`, principalId: o.principalId, principalType: "ServicePrincipal" },
        });
        await saveSession(s.id, data => {
          const grant = requireOnboarding(data).grants.find(g => g.id === path);
          if (grant) grant.status = "created";
        });
      }
      const verified = await assignments(sub, o.principalId, bearer);
      result.push({ subscriptionId: sub, status: roles.every(r => verified.some(a => a.properties.roleDefinitionId.toLowerCase().endsWith(`/${r.id}`))) ? "configured" : "pending_propagation" });
      await saveSession(s.id, data => { requireOnboarding(data).azureGrants = [...result]; });
    }
    const checks = await testAzureAccess(s.id, s.data);
    if (Object.values(checks).some(check => check.status !== "passed")) throw new HttpError(409, "azure_application_test_failed");
    res.json({ subscriptions: result, effectiveAccess: checks });
  });
  /** Consumes a fresh, one-use interactive authorization proof; a confirmation dialog is not enough. */
  async function requireRevocation(id: string, kind: "arm") {
    await saveSession(id, data => {
      const proof = data.reauthorization;
      if (!proof || proof.kind !== kind || Date.now() - proof.at >= 5 * 60_000) throw new HttpError(409, "revocation_reauthentication_required");
      delete data.reauthorization;
    });
  }
  app.post("/api/azure/revoke", async (req, res) => {
    const s = await session(req), o = requireOnboarding(s.data);
    requireCustomerIdentity(s.data);
    z.object({ confirm: z.literal(true) }).parse(req.body);
    await requireRevocation(s.id, "arm");
    const bearer = await token(s.id, s.data, o.customerTenantId, "arm");
    await saveSession(s.id, data => { const current = requireOnboarding(data); current.azureChecks = {}; current.azureGrants = []; });
    // Inspect tracked IDs against live principal/role data; never bulk-delete all assignments for the app.
    for (const grant of o.grants.filter(g => g.status !== "revoked")) {
      const existing = await assignments(grant.scope, o.principalId ?? "", bearer);
      const found = existing.find(a => a.id.toLowerCase() === grant.id.toLowerCase());
      if (found && (!found.properties.roleDefinitionId.toLowerCase().endsWith(`/${grant.role}`) || !roles.some(r => r.id === grant.role))) throw new HttpError(409, "assignment_changed");
      if (found) await api(`https://management.azure.com${grant.id}?api-version=2022-04-01`, bearer, "DELETE");
      await saveSession(s.id, data => { const current = requireOnboarding(data).grants.find(g => g.id === grant.id); if (current) current.status = "revoked"; });
    }
    res.json({ status: "tracked_assignments_removed", otherAccessMayRemain: true });
  });

  /** Retains expected test failures as evidence while context changes and unexpected exceptions propagate. */
  async function captureAccessCheck(run: () => Promise<AccessCheck>): Promise<AccessCheck> {
    try { return await run(); } catch (error) {
      if (error instanceof HttpError && ["principal_context_mismatch", "principal_changed_with_grants", "microsoft_login_retry_required"].includes(error.code)) throw error;
      const network = error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || error instanceof TypeError && error.message === "fetch failed");
      if (!(error instanceof AuthError) && !(error instanceof HttpError) && !network) throw error;
      const details = network ? { code: "microsoft_connection_failed" } : describeError(error);
      console.error(JSON.stringify({ event: "application_access_failed", ...details }));
      return { status: "failed", checkedAt: Date.now(), error: details.code,
        microsoftErrorCode: "microsoftErrorCode" in details ? details.microsoftErrorCode : undefined };
    }
  }
  async function discoverExistingAzure(id: string, data: Session) {
    const o = requireOnboarding(data);
    if (!o.branches.includes("azure")) throw new HttpError(409, "branch_not_selected");
    let subscriptions: Scope[] = [];
    const check = await captureAccessCheck(async () => {
      subscriptions = await discoverApplicationSubscriptions(await applicationToken(data, "arm"), o.customerTenantId);
      return { status: "passed", checkedAt: Date.now(), evidence: "subscription_list" };
    });
    await saveSession(id, current => {
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      const connection = requireOnboarding(current);
      connection.azureExisting = subscriptions; connection.azureDiscoveryCheck = check;
    });
    return check;
  }
  /** Refreshes read-only observations without granting access or discarding this session's rollback IDs. */
  async function inspectConnection(id: string, data: Session) {
    await saveSession(id, current => {
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      const connection = requireOnboarding(current);
      connection.principalState = "not_checked";
      connection.graphCheck = { status: "not_tested" }; connection.graphPermissions = [];
      delete connection.graphPermissionCheck;
      delete connection.m365CheckedAt;
      connection.azureExisting = []; delete connection.azureDiscoveryCheck;
      connection.azureChecks = {}; connection.azureGrants = [];
      delete current.lastError;
    });
    await inspectPrincipalAccess(id, data);
    const fresh = await transient.get<Session>(`sessions/${id}`);
    if (!fresh) throw new HttpError(401, "session_expired");
    const o = requireOnboarding(fresh.value);
    if (o.branches.includes("m365")) await testGraphAccess(id, fresh.value);
    if (o.branches.includes("azure")) await discoverExistingAzure(id, fresh.value);
  }
  /**
   * Keeps directory grant inventory separate from app-only collection probes.
   * Collection can work even when existing permissions cannot enumerate the grant inventory.
   */
  async function testGraphAccess(id: string, data: Session): Promise<AccessCheck> {
    const o = requireOnboarding(data);
    requireCustomerIdentity(data);
    if (!o.branches.includes("m365")) throw new HttpError(409, "branch_not_selected");
    await saveSession(id, current => {
      const connection = requireOnboarding(current);
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      connection.graphCheck = { status: "not_tested" }; connection.graphPermissions = [];
      delete connection.graphPermissionCheck;
      delete connection.m365CheckedAt;
    });
    const check = await captureAccessCheck(async () => {
      const bearer = await applicationToken(data, "graph");
      const principal = await checkPrincipal(id, data);
      if (!principal) throw new HttpError(409, "principal_required");
      let permissions: GraphPermission[] = [];
      const inventory = await captureAccessCheck(async () => {
        const graph = await list<{ id: string; appRoles: GraphPermission[] }>(
          "https://graph.microsoft.com/v1.0/servicePrincipals?$filter=appId%20eq%20'00000003-0000-0000-c000-000000000000'&$select=id,appRoles", bearer);
        const resource = graph[0];
        if (graph.length !== 1 || !resource?.appRoles) throw new HttpError(502, "graph_principal_not_found");
        const assigned = await list<AppRole>(`https://graph.microsoft.com/v1.0/servicePrincipals/${principal.id}/appRoleAssignments`, bearer);
        permissions = assigned.filter(a => a.resourceId === resource.id).map(a => {
          const role = resource.appRoles.find(role => role.id === a.appRoleId);
          if (!role) throw new HttpError(502, "invalid_microsoft_response");
          return { id: role.id, value: role.value, displayName: role.displayName };
        });
        return { status: "passed", checkedAt: Date.now() };
      });
      await saveSession(id, current => {
        const connection = requireOnboarding(current);
        if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
        connection.graphPermissions = permissions;
        connection.graphPermissionCheck = inventory;
        if (inventory.status === "passed") connection.m365CheckedAt = Date.now();
        connection.m365 = permissions.length ? "configured" : "pending";
      });
      // An unavailable inventory is not an empty grant set or a failed collection query.
      if (inventory.status !== "passed") return probeExistingGraphAccess(bearer, o.customerTenantId);
      const probe = selectGraphProbe(permissions);
      if (!probe) return { status: "unsupported", checkedAt: Date.now() };
      return probeGraph(probe, bearer, o.customerTenantId);
    });
    await saveSession(id, current => {
      if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
      requireOnboarding(current).graphCheck = check; delete current.lastError;
    });
    return check;
  }
  /** Tests app-only subscription metadata reads, not cost queries, every service or the administrator's access. */
  async function testAzureAccess(id: string, data: Session) {
    const o = requireOnboarding(data);
    requireCustomerIdentity(data);
    if (!o.branches.includes("azure") || !o.selected.length) throw new HttpError(409, "principal_and_selection_required");
    await saveSession(id, current => { requireOnboarding(current).azureChecks = {}; });
    let bearer: string | undefined;
    const checks: Record<string, AccessCheck> = {};
    for (const sub of o.selected) {
      if (!o.subscriptions.some(value => value.subscriptionId === sub && eligible(value, o.customerTenantId))) throw new HttpError(409, "subscription_not_eligible");
      checks[sub] = await captureAccessCheck(async () => {
        bearer ??= await applicationToken(data, "arm");
        return probeSubscription(sub, o.customerTenantId, bearer);
      });
      await saveSession(id, current => {
        if (current.credentialVersion !== data.credentialVersion) throw new HttpError(409, "microsoft_login_retry_required");
        requireOnboarding(current).azureChecks = { ...checks }; delete current.lastError;
      });
    }
    await discoverExistingAzure(id, data);
    return checks;
  }
  app.post("/api/m365/test", async (req, res) => {
    const s = await session(req);
    const check = await testGraphAccess(s.id, s.data);
    if (check.status !== "passed") throw new HttpError(409, check.status === "unsupported" ? "graph_probe_not_available" : "graph_application_test_failed");
    res.json({ check });
  });
  app.post("/api/azure/test", async (req, res) => {
    const s = await session(req);
    const checks = await testAzureAccess(s.id, s.data);
    if (Object.values(checks).some(check => check.status !== "passed")) throw new HttpError(409, "azure_application_test_failed");
    res.json({ checks });
  });
  app.post("/api/m365/consent", async (req, res) => {
    const s = await session(req), o = requireOnboarding(s.data);
    requireCustomerIdentity(s.data);
    if (!o.branches.includes("m365")) throw new HttpError(409, "branch_not_selected");
    await saveSession(s.id, data => {
      const current = requireOnboarding(data);
      current.consent = { status: "pending", at: Date.now() };
      current.graphCheck = { status: "not_tested" };
      delete data.lastError;
    });
    const state = opaque();
    if (!s.data.credentialVersion) throw new HttpError(409, "partner_credential_required");
    if (!await transient.put(`oauth/${digest(state)}`, { sessionId: s.id, tenant: o.customerTenantId, kind: "consent", expires: Date.now() + 10 * 60_000, used: false, credentialVersion: s.data.credentialVersion } satisfies OAuth)) throw new HttpError(503, "oauth_creation_failed");
    const url = new URL(`https://login.microsoftonline.com/${o.customerTenantId}/v2.0/adminconsent`);
    // Static consent reflects the partner registration, including any legacy permissions still configured there.
    url.search = new URLSearchParams({ client_id: o.appId, scope: "https://graph.microsoft.com/.default", redirect_uri: `${origin}/auth/microsoft/callback`, state }).toString();
    res.json({ url: url.href });
  });
  app.use(express.static(resolve(config.frontendDirectory ?? "src/frontend"), { etag: true, maxAge: 0 }));
  app.use(errorHandler);
  return app;
}
