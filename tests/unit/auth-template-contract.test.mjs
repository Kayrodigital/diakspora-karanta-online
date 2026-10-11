import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const templates = ["confirmation", "invite", "magic-link", "email-change", "recovery"];

for (const name of templates) {
  test(`template local ${name} : français, lien Supabase et identité Karanta`, () => {
    const html = readFileSync(
      new URL(`../../supabase/templates/m9-${name}.html`, import.meta.url),
      "utf8",
    );
    assert.match(html, /<html lang="fr">/);
    assert.match(html, /{{\s*\.ConfirmationURL\s*}}/);
    assert.match(html, /Diakspora Karanta/);
    assert.match(html, /karanta@diakspora\.com/);
    assert.doesNotMatch(html, /service_role|SUPABASE_SERVICE_ROLE_KEY/i);
  });
}
