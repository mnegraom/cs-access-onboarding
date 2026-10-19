import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

const html = readFileSync(join("src", "frontend", "index.html"), "utf8");
const js = readFileSync(join("src", "frontend", "app.js"), "utf8");
const copy: Record<string, Record<string, string>> = runInNewContext(`${js.slice(0, js.indexOf("let lang ="))}; copy;`);

test("shared frontend uses placeholder branding until public configuration is loaded", () => {
  assert.match(html, /id="partner-footer">Your Partner</);
  assert.match(js, /partner = "Your Partner"/);
  assert.match(js, /partner = config\.partnerName; translate\(\)/);
});

test("translations have one dictionary per locale and cover every HTML label", () => {
  assert.deepEqual(Object.keys(copy).sort(), ["en", "es", "pt"]);
  const expected = Object.keys(copy.pt!).sort();
  const labels = [...html.matchAll(/data-i18n="([^"]+)"/g)].map(match => match[1]!);
  for (const [locale, values] of Object.entries(copy)) {
    assert.deepEqual(Object.keys(values).sort(), expected, locale);
    for (const key of labels) assert.ok(values[key], `${locale}: ${key}`);
  }
  assert.equal(js.includes("Object.assign(copy"), false);
  assert.equal(js.includes("flowCopy"), false);
});

test("obsolete consent and partner-tenant actions are not shipped", () => {
  for (const locale of Object.values(copy)) {
    for (const key of ["partnerLogin", "grantM365", "m365_manifest_not_approved", "m365_bundle_not_configured", "revokeM365"]) {
      assert.equal(key in locale, false);
    }
  }
  assert.equal(html.includes('data-auth="partner"'), false);
  assert.equal(html.includes('data-action="/api/m365/revoke"'), false);
});

test("the first Microsoft action explains authorization and possible Enterprise App creation", () => {
  const labels = {
    pt: "Registrar / autenticar no Microsoft Entra",
    es: "Registrar / autenticar en Microsoft Entra",
    en: "Register / authenticate in Microsoft Entra",
  };
  for (const [locale, label] of Object.entries(labels)) {
    assert.equal(copy[locale]!.customerLogin, label);
    assert.equal(copy[locale]!.appFound, "Enterprise App: OK");
    assert.match(copy[locale]!.identityNotice!, /Enterprise App/);
    assert.match(copy[locale]!.identityNotice!, /Graph.*Azure/);
  }
  assert.match(html, /<button[^>]*data-auth="identity"[^>]*aria-describedby="identity-notice"/);
  assert.match(html, /id="identity-notice"[^>]*data-i18n="identityNotice"/);
  assert.equal(html.includes("Entrar no Microsoft do cliente"), false);
  assert.equal(html.includes('data-action="/api/principal/register"'), false);
  const backend = readFileSync(join("src", "backend", "server.ts"), "utf8");
  assert.equal(backend.includes("Application.ReadWrite.All"), false);
  assert.equal(backend.includes('app.post("/api/principal/register"'), false);
  assert.equal(js.includes("authentication?.graph"), false);
});
test("public entry is limited to sign-in, without the former marketing and architecture sections", () => {
  assert.equal(html.includes('class="hero"'), false);
  assert.equal(html.includes('class="assurances"'), false);
  assert.equal(html.includes('class="guide"'), false);
  assert.match(html, /id="authorization-info"[^>]*hidden/);
  assert.match(html, /id="setup-panel"[^>]*hidden/);
  assert.match(html, /id="manage-panel"[^>]*hidden/);
  assert.match(html, /id="export-connection"/);
});

for (const id of ["app-id", "customer-tenant", "partner-tenant"]) {
  test(`${id} has a browser-compatible UUID pattern`, () => {
    const match = html.match(new RegExp(`<input[^>]+id="${id}"[^>]+pattern="([^"]+)"`));
    assert.ok(match);
    const pattern = new RegExp(`^(?:${match[1]})$`, "v");
    assert.equal(pattern.test("11111111-1111-4111-8111-111111111111"), true);
    assert.equal(pattern.test("ABCDEF12-3456-4789-ABCD-0123456789AB"), true);
    assert.equal(pattern.test("1".repeat(36)), false);
    assert.equal(pattern.test("--------1111-4111-8111-111111111111"), false);
    assert.equal(pattern.test("invalid"), false);
  });
}
