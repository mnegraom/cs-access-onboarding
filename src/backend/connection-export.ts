import { z } from "zod";
import { HttpError, eligible, type Scope } from "./core.js";

interface ConnectionInput {
  appId: string; partnerTenantId: string; customerTenantId: string;
  branches: ("azure" | "m365")[];
  principalId?: string; principalState?: string;
  subscriptions: Scope[]; selected: string[];
}
const identity = z.object({
  appId: z.uuid(), partnerTenantId: z.uuid(), customerTenantId: z.uuid(),
  principalId: z.uuid(), branches: z.array(z.enum(["azure", "m365"])).min(1),
});

/**
 * Projects an explicit integration contract, never the session, credentials, tracking or cached verdicts.
 * Selected scopes describe intent; the consuming system must verify live permissions independently.
 */
export function exportConnection(input: ConnectionInput) {
  if (!["exists", "created"].includes(input.principalState ?? "")) throw new HttpError(409, "principal_required");
  const context = identity.parse(input);
  const selectedSubscriptions = [...new Set(input.selected)].map(id => {
    const sub = input.subscriptions.find(value => value.subscriptionId === id && eligible(value, context.customerTenantId));
    if (!sub || !context.branches.includes("azure")) throw new HttpError(409, "subscription_not_eligible");
    return { subscriptionId: z.uuid().parse(sub.subscriptionId), displayName: sub.displayName };
  });
  return {
    schemaVersion: 1,
    application: { clientId: context.appId, partnerTenantId: context.partnerTenantId, customerPrincipalId: context.principalId },
    customerTenantId: context.customerTenantId,
    services: [...new Set(context.branches)],
    selectedSubscriptions,
  };
}
