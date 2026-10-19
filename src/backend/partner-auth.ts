import { HttpError } from "./core.js";
import type { AuthorizationCodeRequest, ClientCredentialRequest } from "@azure/msal-node";

export interface PartnerCredentialSession {
  expires: number;
  onboarding?: { appId: string };
  clientSecret?: string;
  secretExpires?: number;
}

export function hasPartnerCredential(session: PartnerCredentialSession, now = Date.now()): boolean {
  return Boolean(session.onboarding && session.clientSecret &&
    session.secretExpires && now < Math.min(session.expires, session.secretExpires));
}

/** Binds the entered partner credential to the requested tenant without extending its session lifetime. */
export function partnerAuth(session: PartnerCredentialSession, tenant: string, now = Date.now()) {
  if (!session.onboarding) throw new HttpError(409, "onboarding_required");
  if (!hasPartnerCredential(session, now) || !session.clientSecret) {
    throw new HttpError(409, "partner_credential_required");
  }
  return {
    clientId: session.onboarding.appId,
    authority: `https://login.microsoftonline.com/${tenant}`,
    clientSecret: session.clientSecret,
  };
}

/** MSAL needs the original nonce as well as PKCE; checking the returned claim alone is insufficient. */
export function partnerCodeRequest(input: {
  code: string; scopes: string[]; redirectUri: string; verifier?: string; nonce?: string;
}): AuthorizationCodeRequest {
  if (!input.verifier || !input.nonce) throw new HttpError(400, "invalid_oauth_state");
  return {
    code: input.code, scopes: input.scopes, redirectUri: input.redirectUri,
    codeVerifier: input.verifier, nonce: input.nonce,
  };
}

/** Each API needs its own audience; client-credential .default consumes prior consent, not new consent. */
export function partnerApplicationRequest(resource: "graph" | "arm"): ClientCredentialRequest {
  return { scopes: [resource === "graph" ? "https://graph.microsoft.com/.default" : "https://management.azure.com/.default"] };
}

/** Identity requests no business API scope; MSAL adds standard OIDC offline_access itself. */
export function partnerDelegatedScopes(kind: "identity" | "arm"): string[] {
  return kind === "identity" ? ["openid", "profile"] : ["https://management.azure.com/user_impersonation"];
}
