import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import {
  AuthError, ServerError, AuthErrorCodes, ClientAuthErrorCodes,
  ClientConfigurationErrorCodes, InteractionRequiredAuthErrorCodes,
} from "@azure/msal-node";
import { ZodError } from "zod";
import { HttpError } from "./core.js";

const microsoftErrors = new Map([
  ["access_denied", "microsoft_authorization_failed"],
  ["permission_denied", "microsoft_authorization_failed"],
  ["invalid_client", "partner_authentication_failed"],
  ["invalid_grant", "microsoft_login_retry_required"],
  ["invalid_scope", "microsoft_scope_invalid"],
  ["interaction_required", "microsoft_interaction_required"],
  ["consent_required", "microsoft_interaction_required"],
  ["login_required", "microsoft_interaction_required"],
  ["network_error", "microsoft_connection_failed"],
  ["post_request_failed", "microsoft_connection_failed"],
  ["endpoints_resolution_error", "microsoft_connection_failed"],
  ["nonce_mismatch", "microsoft_nonce_mismatch"],
]);
const knownMsalCodes = new Set<string>([
  ...Object.values(AuthErrorCodes), ...Object.values(ClientAuthErrorCodes),
  ...Object.values(ClientConfigurationErrorCodes), ...Object.values(InteractionRequiredAuthErrorCodes),
  ...microsoftErrors.keys(),
]);
const aadstsErrors = new Map([
  ["7000215", "partner_secret_invalid"],
  ["7000222", "partner_secret_expired"],
  ["7000218", "partner_authentication_failed"],
  ["700016", "partner_application_not_found"],
  ["50011", "microsoft_callback_mismatch"],
  ["9002327", "microsoft_callback_platform_invalid"],
  ["65004", "microsoft_authorization_declined"],
  ["650052", "microsoft_resource_principal_missing"],
]);

/** Retains only allowlisted diagnostics from untrusted callback values, never the raw provider description. */
export class OAuthAuthorizationError extends Error {
  readonly correlationId = randomUUID();
  readonly details: { status: number; code: string; microsoftErrorCode?: string; resourceAppId?: string };
  constructor(providerError: unknown, providerDescription: unknown) {
    super("Microsoft authorization callback failed");
    this.name = "OAuthAuthorizationError";
    const number = typeof providerDescription === "string"
      ? providerDescription.slice(0, 8192).match(/\bAADSTS(\d{4,10})\b/)?.[1] : undefined;
    const numericError = typeof providerError === "string" && /^\d{4,10}$/.test(providerError) ? providerError : undefined;
    const safeError = typeof providerError === "string" && knownMsalCodes.has(providerError) ? providerError : "unknown_callback_error";
    const diagnosis = describeError(new AuthError(safeError, "", number || numericError ? `AADSTS${number ?? numericError}` : ""));
    this.details = {
      ...diagnosis, status: 400,
      code: diagnosis.code === "microsoft_authentication_failed" ? "microsoft_authorization_failed" : diagnosis.code,
    };
    if (diagnosis.microsoftErrorCode === "AADSTS650052" && typeof providerDescription === "string") {
      const resource = missingResourceAppId(providerDescription);
      if (resource) this.details.resourceAppId = resource;
    }
  }
}

function missingResourceAppId(description: string): string | undefined {
  // Require an explicit service/resource label rather than guessing from client or tenant UUIDs.
  return description.slice(0, 8192).match(
    /\b(?:service|resource)\s*(?:\(\s*)?['"]([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})['"]/i,
  )?.[1]?.toLowerCase();
}

export function describeError(error: unknown): {
  status: number; code: string; microsoftErrorCode?: string; resourceAppId?: string;
} {
  if (error instanceof OAuthAuthorizationError) return error.details;
  if (error instanceof HttpError) return { status: error.status, code: error.code };
  if (error instanceof ZodError) return { status: 400, code: "invalid_input" };
  if (!(error instanceof AuthError)) return { status: 500, code: "internal_error" };

  const providerNumber = error instanceof ServerError ? String(error.errorNo ?? "") : "";
  const number = /^\d{4,10}$/.test(providerNumber)
    ? providerNumber : error.errorMessage.match(/\bAADSTS(\d{4,10})\b/)?.[1];
  // Specific AADSTS numbers override generic wrappers such as invalid_client.
  const code = (number && aadstsErrors.get(number)) ??
    microsoftErrors.get(error.errorCode) ?? "microsoft_authentication_failed";
  const status = code === "microsoft_login_retry_required" ? 409 :
    ["microsoft_connection_failed", "microsoft_authentication_failed"].includes(code) ? 502 : 400;
  return {
    status, code,
    microsoftErrorCode: number ? `AADSTS${number}` :
      knownMsalCodes.has(error.errorCode) ? error.errorCode : undefined,
  };
}

export function errorHandler(error: unknown, req: Request, res: Response, _next: NextFunction) {
  // This reference belongs to the portal, not Microsoft's own sign-in correlation/trace identifiers.
  const correlationId = error instanceof OAuthAuthorizationError ? error.correlationId : randomUUID();
  const { status, ...details } = describeError(error);
  console.error(JSON.stringify({
    event: "request_failed", correlationId, ...details,
    errorType: error instanceof Error ? error.name : "unknown",
  }));
  if (req.path === "/auth/microsoft/callback") {
    const query = new URLSearchParams({ auth_error: details.code, reference: correlationId });
    if (details.microsoftErrorCode) query.set("microsoft_error", details.microsoftErrorCode);
    if (details.resourceAppId) query.set("resource_app_id", details.resourceAppId);
    res.redirect(`/?${query}`);
    return;
  }
  res.status(status).json({ error: details.code, correlationId, microsoftErrorCode: details.microsoftErrorCode, resourceAppId: details.resourceAppId });
}
