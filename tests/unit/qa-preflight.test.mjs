import assert from "node:assert/strict";
import test from "node:test";
import { validateQaEnvironment } from "../../scripts/qa/preflight.mjs";

const safe = {
  KARANTA_QA_CONFIRM_ISOLATED: "yes",
  KARANTA_QA_BASE_URL: "http://127.0.0.1:4173",
  KARANTA_QA_SUPABASE_URL: "https://isolated-qa.supabase.co",
  KARANTA_QA_PUBLISHABLE_KEY: "qa-publishable",
  KARANTA_QA_TEACHER_EMAIL: "teacher@example.test",
  KARANTA_QA_TEACHER_PASSWORD: "test-only-password",
  KARANTA_QA_START_SERVER: "1",
};

test("le préflight accepte uniquement une recette isolée explicite", () => {
  assert.deepEqual(validateQaEnvironment(safe, "auth"), []);
});

test("le projet Supabase de production est refusé", () => {
  assert.match(
    validateQaEnvironment({
      ...safe,
      KARANTA_QA_SUPABASE_URL: "https://tcbxscwgorxixlwyiico.supabase.co",
    }).join(" "),
    /distincte/,
  );
});

test("un front local connecté à une autre base est refusé", () => {
  assert.match(
    validateQaEnvironment({
      ...safe,
      VITE_SUPABASE_URL: "https://tcbxscwgorxixlwyiico.supabase.co",
    }).join(" "),
    /ne correspond pas/,
  );
});

test("un déploiement distant ne peut pas lancer les tests avec écriture", () => {
  assert.match(
    validateQaEnvironment({
      ...safe,
      KARANTA_QA_BASE_URL: "https://diakspora-karanta-online.vercel.app",
    }).join(" "),
    /uniquement/,
  );
});

test("aucune clé service_role n'est admise côté navigateur", () => {
  assert.match(
    validateQaEnvironment({ ...safe, VITE_SUPABASE_SERVICE_ROLE_KEY: "forbidden" }).join(" "),
    /service_role/,
  );
});

test("absence de preuve d'isolation ou de compte dédié bloque la suite", () => {
  const {
    KARANTA_QA_CONFIRM_ISOLATED: _confirmation,
    KARANTA_QA_TEACHER_PASSWORD: _password,
    ...incomplete
  } = safe;
  assert.equal(validateQaEnvironment(incomplete).length >= 2, true);
});
