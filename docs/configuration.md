# Configuration and provider contracts

## Core options

The host calls `createPortal(options, services)` from
`src/backend/server.ts`. The factory returns an Express application and
performs no cloud initialization or `listen` call.

| Option | Contract |
| --- | --- |
| `publicOrigin` | Public HTTPS origin used for CSRF checks and the exact Microsoft callback base. |
| `partnerName` | Branding and operator authentication message context. |
| `frontendDirectory` | Optional frontend location; defaults to `src/frontend` relative to the working directory. |

The host owns listener configuration, HTTPS termination and trusted proxy
topology. The current application uses Express `trust proxy = 1`; preserve
that assumption or explicitly adapt it to your host rather than blindly
trusting arbitrary forwarded headers.

The reference frontend and callback use root-relative `/api` and `/auth` URLs.
Expose them at the public origin root; mounting under a different URL prefix
also requires corresponding frontend and callback changes.

## Operator authentication

`OperatorAuthProvider` owns the verification of portal identity:

- `registerRoutes(router, context)` mounts provider endpoints under `/api`.
- `isAuthorized(email)` is checked before issuing a session and on each
  authenticated portal request. It can be asynchronous.
- `enabled` supplies the availability hint used by the reference email login UI.
  It is not a substitute for authorization checks.

`context.completeLogin(email, response)` is a **trusted server-side integration
point**, not a public API. Call it only after the provider has verified the
identity and completed its own anti-replay/CSRF validation. Never expose a
route that forwards an arbitrary request email into this callback.

The core creates an empty, expiring session, invalidates the previous session
for that email and issues a Secure/HttpOnly/SameSite=Lax cookie. Microsoft
customer authorization is still required after portal authentication.

### Included email-OTP provider

`auth/email-otp.ts` preserves the reference policy:

- Authorized email allowlist; normalized addresses.
- Five-minute codes, five attempts and one-time consumption.
- Persistent per-email/per-IP abuse counters, including resend throttling.
- Uniform public request responses to avoid exposing membership/delivery.
- Sanitized diagnostics on delivery failures.
- `/api/access/request` and `/api/access/verify` routes, matching the reference UI.

Another authentication provider, such as a verified SSO integration, may mount
different routes and must supply the corresponding frontend login changes.
No SSO implementation or authentication bypass is implied by this contract.

## Email transport

`EmailSender.send({to, subject, text})` resolves after the transport confirms
submission, or rejects on failure. The OTP provider owns the message, policy
and challenge verification. Do not log or return the OTP to a browser as a
substitute for delivery.

## Protected persistence

The OTP provider accepts the existing `Store` contract:

- `get` returns detached data and an ETag/version.
- `put` without an ETag is create-only.
- `put` with an ETag is a conditional replacement.
- `false` means a write conflict; other failures must surface.

`update` can retry its mutation callback on conflicts. Keep external effects,
such as sending email, outside the callback.

Production implementations must protect OTP hashes, emails and abuse records
with suitable access controls and encryption. Data-key/envelope protection is
implemented by the Azure reference store; the contract does not automatically
secure a replacement store. Do not silently fall back to unprotected files
or process memory for production anti-abuse persistence.

## Transient state

`TransientStore` extends `Store` with synchronous deletion. Implementations must
preserve expiration, isolated values and conditional updates, without
restoring customer state after process termination.

The supplied `MemoryStore` is the reference implementation. The host owns its
lifecycle and should call `close()` when disposing it. Portal sessions last
30 minutes; OAuth contexts last 10 minutes. Secrets and Microsoft cache belong
only in this transient boundary, not protected durable OTP storage.

## Azure reference adapter

The optional `adapters/azure` directory contains:

- `storage.ts`: envelope-encrypted Blob records, with data keys wrapped by a
  Key Vault key. Initialization reads the configured key or creates it if
  missing, and checks the existing container.
- `email.ts`: ACS Email transport that checks submission completion.
- `start.ts`: explicit Managed Identity + email OTP composition and listener.

`AzureStore` and `AzureEmailSender` accept a `TokenCredential`, so a custom
composition can select a suitable credential without changing the core.
The provided bootstrap specifically uses Managed Identity. Customer App ID
and secret are not substitutes for this internal service identity.

Only this reference bootstrap reads:

| Variable | Meaning |
| --- | --- |
| `PUBLIC_ORIGIN` | Public HTTPS origin and callback base. |
| `PARTNER_NAME` | Partner branding. |
| `PORT` | Listener port; defaults to 8080. |
| `AZURE_CLIENT_ID` | Managed Identity client ID for the internal services. |
| `STORAGE_URL` | Existing Blob service endpoint; container name is `onboarding`. |
| `KEY_VAULT_URL` | Existing vault endpoint; encryption key name is `onboarding-encryption`. |
| `ACS_ENDPOINT` | Existing communication service endpoint. |
| `EMAIL_SENDER` | Configured sender address. |
| `EMAIL_ENABLED` | `true` or `false`; disabled requests return an explicit setup-pending error. |
| `ALLOWED_EMAILS` | JSON array of authorized operator emails. |

No account keys, customer secrets or production addresses are included in the
template. Adapter initialization/authorization failures must be corrected;
they do not trigger a success-shaped fallback.

## Microsoft application inputs

After portal authentication, the operator supplies the partner App ID,
partner/customer tenants, client secret and selected services. Register the
exact `{publicOrigin}/auth/microsoft/callback` as a **Web** redirect URI.

The initial Microsoft login requests basic OIDC scopes, not delegated Graph
application-management rights. MSAL adds `offline_access`. Later consent uses
the partner registration's configured static permissions. Review obsolete
permissions in that registration separately; code changes do not revoke
existing customer consent.
