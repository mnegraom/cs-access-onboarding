import { test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { AuthError, ConfidentialClientApplication, type NetworkResponse } from "@azure/msal-node";
import { partnerAuth, hasPartnerCredential, partnerCodeRequest, partnerApplicationRequest, partnerDelegatedScopes } from "../src/backend/partner-auth.js";

const tenant = randomUUID();
function fixture() {
  return {
    onboarding: { appId: randomUUID() },
    clientSecret: randomBytes(32).toString("base64url"),
    expires: 2000,
    secretExpires: 2000,
  };
}
test("OAuth uses the entered partner app and secret, not a fixed portal application", () => {
  const session = fixture();
  assert.deepEqual(partnerAuth(session, tenant, 1000), {
    clientId: session.onboarding.appId,
    clientSecret: session.clientSecret,
    authority: `https://login.microsoftonline.com/${tenant}`,
  });
  const other = fixture();
  assert.notEqual(partnerAuth(other, tenant, 1000).clientId, session.onboarding.appId);
});
test("missing credentials fail explicitly before starting Microsoft authentication", () => {
  const session = fixture();
  assert.throws(() => partnerAuth({ ...session, clientSecret: undefined }, tenant, 1000), /partner_credential_required/);
  assert.throws(() => partnerAuth({ ...session, onboarding: undefined }, tenant, 1000), /onboarding_required/);
});
test("the credential expires at the exact session boundary", () => {
  const session = fixture();
  assert.equal(hasPartnerCredential(session, 1999), true);
  assert.equal(hasPartnerCredential(session, 2000), false);
  assert.throws(() => partnerAuth(session, tenant, 2000), /partner_credential_required/);
});
test("neither session nor credential expiry can extend the other", () => {
  assert.equal(hasPartnerCredential({ ...fixture(), expires: 1500 }, 1500), false);
  assert.equal(hasPartnerCredential({ ...fixture(), secretExpires: 1500 }, 1500), false);
});
test("application queries request separate client-credentials audiences without a delegated account", () => {
  assert.deepEqual(partnerApplicationRequest("graph"), { scopes: ["https://graph.microsoft.com/.default"] });
  assert.deepEqual(partnerApplicationRequest("arm"), { scopes: ["https://management.azure.com/.default"] });
});
test("initial identity authentication requests no delegated Graph or Azure access", () => {
  assert.deepEqual(partnerDelegatedScopes("identity"), ["openid", "profile"]);
  assert.deepEqual(partnerDelegatedScopes("arm"), ["https://management.azure.com/user_impersonation"]);
});
for (const resource of ["graph", "arm"] as const) {
  test(`MSAL ${resource} application query uses client_credentials in the customer tenant`, async () => {
    const session = fixture(), authority = `https://login.microsoftonline.com/${tenant}`;
    let requestedUrl = "", requestedBody = new URLSearchParams();
    const client = new ConfidentialClientApplication({
      auth: {
        ...partnerAuth(session, tenant, 1000),
        authorityMetadata: JSON.stringify({
          authorization_endpoint: `${authority}/oauth2/v2.0/authorize`, token_endpoint: `${authority}/oauth2/v2.0/token`,
          issuer: `${authority}/v2.0`, jwks_uri: `${authority}/discovery/v2.0/keys`,
        }),
        cloudDiscoveryMetadata: JSON.stringify({ metadata: [{
          preferred_network: "login.microsoftonline.com", preferred_cache: "login.windows.net",
          aliases: ["login.microsoftonline.com", "login.windows.net"],
        }] }),
      },
      system: { networkClient: {
        sendGetRequestAsync: async () => { throw new Error("Unexpected discovery request"); },
        sendPostRequestAsync: async <T>(url: string, options?: { body?: string }): Promise<NetworkResponse<T>> => {
          requestedUrl = url; requestedBody = new URLSearchParams(options?.body);
          return { status: 200, headers: {}, body: JSON.parse(JSON.stringify({
            token_type: "Bearer", expires_in: 3600, access_token: "test-only-app-token",
          })) };
        },
      } },
    });
    const result = await client.acquireTokenByClientCredential(partnerApplicationRequest(resource));
    assert.equal(result?.accessToken, "test-only-app-token");
    assert.equal(new URL(requestedUrl).origin, "https://login.microsoftonline.com");
    assert.equal(new URL(requestedUrl).pathname, `/${tenant}/oauth2/v2.0/token`);
    assert.equal(requestedBody.get("grant_type"), "client_credentials");
    assert.equal(requestedBody.get("client_id"), session.onboarding.appId);
    assert.equal(requestedBody.get("client_secret"), session.clientSecret);
    assert.equal(requestedBody.get("scope"), resource === "graph" ? "https://graph.microsoft.com/.default" : "https://management.azure.com/.default");
    assert.equal(requestedBody.has("code"), false);
    assert.equal(requestedBody.has("refresh_token"), false);
    assert.deepEqual(await client.getTokenCache().getAllAccounts(), []);
  });
}

function nonceFixture(withAccessToken = true) {
  const appId = randomUUID(), nonce = randomBytes(32).toString("base64url");
  const authority = `https://login.microsoftonline.com/${tenant}`;
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const response = JSON.stringify({
    token_type: "Bearer", scope: "openid profile offline_access", expires_in: 3600,
    access_token: withAccessToken ? "test-only-access-token" : undefined,
    refresh_token: "test-only-refresh-token",
    id_token: `${encode({ alg: "RS256", typ: "JWT" })}.${encode({
      aud: appId, iss: `${authority}/v2.0`, tid: tenant, oid: randomUUID(), sub: randomUUID(),
      preferred_username: "test@example.invalid", nonce, iat: now, nbf: now, exp: now + 3600,
    })}.test-only-signature`,
    client_info: encode({ uid: randomUUID(), utid: tenant }),
  });
  let requestedScopes: string[] = [];
  const client = new ConfidentialClientApplication({
    auth: {
      clientId: appId, authority, clientSecret: "test-only-secret",
      authorityMetadata: JSON.stringify({
        authorization_endpoint: `${authority}/oauth2/v2.0/authorize`,
        token_endpoint: `${authority}/oauth2/v2.0/token`,
        issuer: `${authority}/v2.0`, jwks_uri: `${authority}/discovery/v2.0/keys`,
        end_session_endpoint: `${authority}/oauth2/v2.0/logout`,
      }),
      cloudDiscoveryMetadata: JSON.stringify({ metadata: [{
        preferred_network: "login.microsoftonline.com", preferred_cache: "login.windows.net",
        aliases: ["login.microsoftonline.com", "login.windows.net"],
      }] }),
    },
    system: { networkClient: {
      sendGetRequestAsync: async () => { throw new Error("Unexpected network discovery in offline test"); },
      sendPostRequestAsync: async <T>(_url: string, options?: { body?: string }): Promise<NetworkResponse<T>> => {
        requestedScopes = (new URLSearchParams(options?.body).get("scope") ?? "").split(" ").filter(Boolean);
        return { status: 200, headers: {}, body: JSON.parse(response) };
      },
    } },
  });
  return {
    client, nonce, requestedScopes: () => requestedScopes,
    request: {
      code: "test-only-code", codeVerifier: randomBytes(32).toString("base64url"),
      scopes: partnerDelegatedScopes("identity"),
      redirectUri: "https://example.invalid/auth/microsoft/callback",
    },
  };
}
test("MSAL reproduces the callback failure when the expected nonce is omitted", async () => {
  const { client, request } = nonceFixture();
  await assert.rejects(client.acquireTokenByCode(request),
    error => error instanceof AuthError && error.errorCode === "nonce_mismatch");
});
test("real MSAL identity authorization and code exchange add only standard OIDC scopes", async () => {
  const { client, request, nonce, requestedScopes } = nonceFixture();
  const url = new URL(await client.getAuthCodeUrl({
    scopes: request.scopes, redirectUri: request.redirectUri,
    state: "test-only-state", nonce,
    codeChallenge: "test-only-challenge", codeChallengeMethod: "S256",
  }));
  const expected = ["offline_access", "openid", "profile"];
  assert.deepEqual(url.searchParams.get("scope")?.split(" ").sort(), expected);
  assert.equal(url.searchParams.get("nonce"), nonce);
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  await client.acquireTokenByCode(partnerCodeRequest({ ...request, verifier: request.codeVerifier, nonce }));
  assert.deepEqual(requestedScopes().sort(), expected);
});
test("identity-only callback accepts a valid ID-token response without a resource access token", async () => {
  const { client, request, nonce } = nonceFixture(false);
  const result = await client.acquireTokenByCode(partnerCodeRequest({ ...request, verifier: request.codeVerifier, nonce }));
  assert.ok(result.account);
  assert.equal(result.tenantId, tenant);
  assert.equal(result.accessToken, "");
});
test("MSAL accepts the token response when the original nonce is supplied", async () => {
  const { client, request, nonce } = nonceFixture();
  const exchange = partnerCodeRequest({ ...request, verifier: request.codeVerifier, nonce });
  assert.equal(exchange.codeVerifier, request.codeVerifier);
  assert.equal(exchange.nonce, nonce);
  const result = await client.acquireTokenByCode(exchange);
  assert.ok(result.idTokenClaims && "nonce" in result.idTokenClaims);
  assert.equal(result.idTokenClaims.nonce, nonce);
  assert.equal(result.tenantId, tenant);
  assert.ok(result.account);
});
test("missing nonce or PKCE verifier fails before exchanging the authorization code", () => {
  const { request, nonce } = nonceFixture();
  assert.throws(() => partnerCodeRequest({ ...request, verifier: request.codeVerifier }), /invalid_oauth_state/);
  assert.throws(() => partnerCodeRequest({ ...request, nonce }), /invalid_oauth_state/);
});
test("MSAL continues rejecting a token response with a different nonce", async () => {
  const { client, request } = nonceFixture();
  await assert.rejects(client.acquireTokenByCode({ ...request, nonce: "different-test-nonce" }),
    error => error instanceof AuthError && error.errorCode === "nonce_mismatch");
});
