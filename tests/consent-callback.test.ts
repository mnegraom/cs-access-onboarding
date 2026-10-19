import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { HttpError } from "../src/backend/core.js";
import type { AccessCheck } from "../src/backend/onboarding-flow.js";

const server = ts.createSourceFile("server.ts",
  readFileSync(join("src", "backend", "server.ts"), "utf8"),
  ts.ScriptTarget.ES2023, true);
let consentBody: ts.Statement | undefined;
function visit(node: ts.Node) {
  if (ts.isIfStatement(node) && node.expression.getText(server) === 'context.kind === "consent"' && node.elseStatement) {
    consentBody = node.thenStatement;
  }
  ts.forEachChild(node, visit);
}
visit(server);
assert.ok(consentBody);
const callback = ts.transpileModule(`(async () => ${consentBody.getText(server)})()`, {
  compilerOptions: { target: ts.ScriptTarget.ES2023 },
}).outputText;

function fixture(adminConsent = "True", returnedTenant = "CUSTOMER-TENANT") {
  const data = {
    onboarding: {
      consent: { status: "failed", at: 0 },
      graphCheck: { status: "failed", error: "old-test-failure", checkedAt: 1 } as AccessCheck,
    },
    lastError: "graph_application_test_failed",
  };
  let graphCalls = 0, saves = 0;
  return {
    data,
    graphCalls: () => graphCalls,
    saves: () => saves,
    run: () => runInNewContext(callback, {
      req: { query: { admin_consent: adminConsent, tenant: returnedTenant } },
      context: { tenant: "customer-tenant" },
      s: { id: "test-only-session", data },
      HttpError,
      requireOnboarding: (session: typeof data) => session.onboarding,
      saveSession: async (id: string, change: (session: typeof data) => void) => {
        assert.equal(id, "test-only-session"); saves++; change(data);
      },
      testGraphAccess: async () => { graphCalls++; throw new Error("Consent callback must not test Graph"); },
    }) as Promise<void>,
  };
}

test("real consent callback accepts consent, clears old errors and leaves Graph pending without testing", async () => {
  const f = fixture();
  await f.run();
  assert.equal(f.data.onboarding.consent.status, "accepted");
  assert.ok(f.data.onboarding.consent.at > 0);
  assert.equal(JSON.stringify(f.data.onboarding.graphCheck), '{"status":"not_tested"}');
  assert.equal("lastError" in f.data, false);
  assert.equal(f.graphCalls(), 0);
  assert.equal(f.saves(), 1);
});

test("invalid Microsoft consent callback is still rejected without changing state or testing Graph", async () => {
  for (const f of [fixture("False"), fixture("True", "different-tenant")]) {
    await assert.rejects(f.run(), /consent_callback_invalid/);
    assert.equal(f.data.onboarding.consent.status, "failed");
    assert.equal(f.data.onboarding.graphCheck.status, "failed");
    assert.equal(f.graphCalls(), 0);
    assert.equal(f.saves(), 0);
  }
});
