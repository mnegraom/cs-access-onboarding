# CS Access Onboarding

A standalone onboarding portal for Microsoft Entra, Microsoft 365 and Azure
customer access. The UI supports Portuguese, Spanish and English.

The repository contains the module, its tests and an **optional Azure/email-OTP
reference adapter**. It does not prescribe a hosting platform and contains no
infrastructure templates, resource-provisioning scripts, deployment targets or
installation state.

## What the module does

1. Authenticate/register the partner application's customer-tenant identity
   through basic Microsoft sign-in, without requesting delegated Graph
   application-management scopes or Azure access.
2. Open Microsoft's customer-tenant consent screen. Accepted consent leaves
   Graph testing pending until the operator requests a test.
3. Discover administrator-visible subscriptions, save an explicit selection
   and grant Reader + Cost Management Reader where missing. Separate app-only
   probes verify limited effective access.

Customer connection IDs can be explicitly exported as versioned JSON. The
consuming integration owns persistence and must verify current permissions.
The export contains no credentials, tokens or portal session.

## Hosting-independent core

`src/backend/server.ts` exports `createPortal(options, services)`. Importing or
constructing the factory does not read Azure environment variables, initialize
cloud services or open an HTTP listener.

The host supplies:

- An **operator authentication provider** that verifies and authorizes portal
  operators independently of customer Microsoft authorization.
- A **transient store** with expiry, conditional updates and deletion. The
  supplied `MemoryStore` preserves non-restorable, process-local sessions.
- An HTTP listener and public HTTPS routing.

The included email-OTP authentication provider additionally receives an
`EmailSender` and a protected, conditional-update `Store`. Those implementations
can be replaced without changing Microsoft onboarding logic.

Microsoft Entra, Graph and ARM remain the intentional integration targets.
Separating adapters does not eliminate the need for appropriate Microsoft
application configuration or customer authorization.

See [Configuration and provider contracts](docs/configuration.md) and
[Onboarding flow](docs/onboarding-flow.md).

## Build and test

Requires Node.js 22 or newer.

```powershell
npm ci
npm test
```

Automated tests run without real customer credentials or Azure hosting
configuration. Test-only transports/stores are not shipped as runtime
authentication bypasses or insecure persistence defaults.

## Running the reference adapter

`npm start` launches `src/backend/adapters/azure/start.ts` after compilation.
This is an explicit reference composition, **not the only supported host**.
It requires its existing service endpoints and credentials to be configured;
it does not provision a hosting environment.

```powershell
npm run build
# Supply the reference adapter's environment through your host, or locally:
node --env-file=.env dist/src/backend/adapters/azure/start.js
```

Use `.env.example` as a configuration template, replace placeholders in your
ignored local `.env`, and review the adapter-specific contract in the
configuration guide. `npm start` reads the process environment; it does not
implicitly load `.env`.

For another host or authentication system, provide your own composition using
`createPortal`, the provider contracts and an HTTP listener. No unverified
identity, console OTP delivery or anonymous session-creation endpoint is
provided.

## Layout

```text
src/
  backend/
    server.ts              Express factory and Microsoft flow orchestration
    contracts.ts           Host/provider contracts
    auth/email-otp.ts      Reference operator authentication policy
    adapters/azure/       Optional storage, email and reference bootstrap
    ...                   Flow, error, session and export helpers
  frontend/               Framework-free PT/ES/EN UI
tests/                    Unit and isolated HTTP integration tests
docs/                     Flow and configuration documentation
```

## Important boundaries

- Portal login and Microsoft customer authorization are separate.
- Consent acceptance, grant inventory and successful probes are not equivalent.
- Directory inventory can be unavailable while a collection API works. The
  portal requests no extra privileges merely to enumerate grants.
- Sessions, Microsoft cache, secrets and rollback tracking stay in memory for
  up to 30 minutes. Logout, expiry or restart loses them; Microsoft grants do
  not automatically expire with the portal session.
- The reference transient model requires a single process. Do not scale it
  across workers without deliberately preserving the stated session model.
- Azure rollback is limited to assignment IDs tracked in the current session;
  later/manual review remains the customer's responsibility.
- The Azure access probe reads subscription metadata, not every service or
  cost endpoint. The Graph report probe does not download the report.

## Repository and release hygiene

No installation state, connection exports, credentials, logs, generated builds
or dependency directories belong in Git. Examples use placeholders. Keep
`.env` private and do not attach callback URLs containing authorization codes.

This standalone repository starts a new Git history; it does not import the
source project's prior commits.

## License status

Copyright (c) 2026 mnegraom. All rights reserved.

No open-source license is granted at this time. Public availability of the
source does not provide a general license to use, modify or redistribute it;
obtain permission from the copyright holder where required.

The package's `private: true` prevents accidental npm publication; it does not
determine Git repository visibility. `license: UNLICENSED` records the absence
of an open-source license grant.
