# Microsoft onboarding flow

## 1. Customer application identity

The backend attempts a read-only lookup of its own Service Principal using
application credentials. It validates App ID, partner owner tenant and
enabled state. Only a real 404 is treated as missing; denied/token/network
failures remain unverified.

The browser is then redirected through the MSAL authorization-code flow with
basic `openid`/`profile` scopes. MSAL adds `offline_access`. This requests
neither delegated Graph application-management rights nor Azure access.
Microsoft Entra may create the Enterprise Application during basic consent,
subject to tenant policy; the backend does not call `POST /servicePrincipals`.

Callback validation binds one-use state to the portal session and credential
version. PKCE, the original nonce and expected customer tenant are checked.
Provider errors take precedence over success-shaped callback parameters.

If the identity was already confirmed before sign-in, the selected existing
Graph/Azure access is inspected using application credentials only. A new or
unverified identity leaves collection checks for later explicit actions.

## 2. Microsoft 365 consent

The official customer-tenant `v2.0/adminconsent` endpoint receives App ID,
Graph `/.default`, registered callback and protected state. Microsoft owns
the permission screen and records accepted grants.

Static consent can show configured permissions beyond the intended collection
set, including legacy scopes left in the registration. The portal does not
hide or automatically remove them.

An accepted callback records consent, clears stale top-level errors and resets
the Graph functional status to `not_tested`. It performs no automatic Graph
probe. The operator uses **Test Graph as the application** when ready.

The test uses client credentials in the customer tenant. It may inspect role
assignments under existing app permissions; an unavailable inventory is not an
empty grant list. Supported probes are:

- Organization metadata: HTTP 200 and the expected tenant.
- Office 365 active-user report: safe HTTPS 302 authorization; the report
  download URL is not followed, exposed or retained.

If inventory is unavailable, organization is attempted first and the report
only after a 403. Unsupported permissions, denials and unexpected responses
never become fabricated success. A successful probe is limited evidence,
not proof that every intended collection endpoint works.

## 3. Azure selection and access

Administrator discovery/grants use a delegated ARM
`user_impersonation` token, reusing the identity account/cache when permitted.
Additional interaction, MFA and PIM remain subject to Microsoft policy.

Discovery lists enabled customer-tenant subscriptions visible to the
administrator. Saving a selection is intent, not a grant. The backend checks
live scopes, then creates only missing direct subscription assignments for:

- Reader.
- Cost Management Reader.

Assignment intent is recorded before the remote write. Assignment IDs are
stable per session/subscription/role to support retries. Existing assignments
are not claimed as this session's rollback property.

After granting, app-only subscription metadata probes run automatically; the
manual Azure test is also available. A failed functional query can follow a
successful assignment and does not automatically undo it. Application-visible
subscription discovery is distinct from the administrator's selection list.
No token for one resource is substituted for another resource's audience.

## Rollback and session limits

Azure rollback requires fresh interactive authorization, a five-minute
single-use proof and explicit confirmation. It validates only IDs tracked in
this session against live principal/role data before deletion. It never
deletes the Enterprise App or bulk-removes unrelated/inherited access.

Logout, expiry, a new portal login or process restart loses session data,
credentials and rollback tracking. Microsoft consent and RBAC are independent
of that memory lifetime and can remain valid. Later revocation is manual.

## Integration output

The authenticated JSON export contains schema version, app/customer IDs,
selected services and explicitly selected subscription IDs/names. It contains
no secret, token, operator email, session, rollback history or access verdict.

The downstream collector owns storage, obtains its own tokens and verifies
current access. The module performs no collection-data persistence.
