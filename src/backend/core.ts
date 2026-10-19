import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from "node:crypto";

export const OTP_TTL = 5 * 60_000;
export const SESSION_TTL = 30 * 60_000;
export const MAX_ATTEMPTS = 5;
export const roles = [
  { name: "Reader", id: "acdd72a7-3385-48ef-bd42-f606fba81ae7" },
  { name: "Cost Management Reader", id: "72fafb9e-0641-4937-9268-a91bfd8191a3" },
] as const;

export class HttpError extends Error {
  constructor(public status: number, public code: string) {
    super(code);
  }
}

export function opaque(): string {
  return randomBytes(32).toString("base64url");
}

export function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export interface Challenge {
  salt: string;
  hash: string;
  expires: number;
  attempts: number;
  used: boolean;
  allowed: boolean;
  email: string;
}

export function newChallenge(email: string, allowed: boolean, now: number) {
  const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
  const salt = opaque();
  const challenge: Challenge = {
    salt, hash: scryptSync(code, salt, 32).toString("hex"),
    expires: now + OTP_TTL, attempts: 0, used: false, email, allowed,
  };
  return { code, challenge };
}

export function consumeCode(challenge: Challenge, code: string, now: number): boolean {
  if (challenge.used || now >= challenge.expires || challenge.attempts >= MAX_ATTEMPTS) return false;
  challenge.attempts++;
  const computed = scryptSync(code, challenge.salt, 32);
  const matches = timingSafeEqual(computed, Buffer.from(challenge.hash, "hex"));
  if (!matches || !challenge.allowed) return false;
  challenge.used = true;
  return true;
}

export interface Stored<T> { value: T; etag: string }
export interface Store {
  get<T>(key: string): Promise<Stored<T> | undefined>;
  /** Omit etag for create-only; provide it for conditional replacement. False signals a write conflict. */
  put<T>(key: string, value: T, etag?: string): Promise<boolean>;
}

/** The change callback may run again on conflicts; keep external side effects outside this retry loop. */
export async function update<T, R>(
  store: Store, key: string, initial: () => T, change: (value: T) => R,
): Promise<R> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await store.get<T>(key);
    const value = current?.value ?? initial();
    const result = change(value);
    if (await store.put(key, value, current?.etag)) return result;
  }
  throw new HttpError(409, "concurrent_update_retry");
}

export interface Scope { subscriptionId: string; displayName: string; tenantId: string; state: string }
export function eligible(scope: Scope, tenant: string): boolean {
  return scope.tenantId.toLowerCase() === tenant.toLowerCase() && scope.state === "Enabled";
}

/** Stable within one session/scope/role for retries, without reusing another session's assignment IDs. */
export function assignmentName(sessionId: string, subscriptionId: string, roleId: string): string {
  const hex = digest(`${sessionId}:${subscriptionId}:${roleId}`);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}
