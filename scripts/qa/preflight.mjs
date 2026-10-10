import { fileURLToPath } from "node:url";

const PRODUCTION_REF = "tcbxscwgorxixlwyiico";
const LOCAL_BASE = "http://127.0.0.1:4173";

export function validateQaEnvironment(env, suite = "auth") {
  const errors = [];
  if (!["auth", "full", "integration"].includes(suite)) errors.push("Suite QA inconnue.");
  if (env.KARANTA_QA_CONFIRM_ISOLATED !== "yes") {
    errors.push("KARANTA_QA_CONFIRM_ISOLATED=yes est requis.");
  }
  if (suite !== "integration" && (env.KARANTA_QA_BASE_URL || LOCAL_BASE) !== LOCAL_BASE) {
    errors.push(`Les tests avec écriture doivent viser uniquement ${LOCAL_BASE}.`);
  }
  if (env.VITE_SUPABASE_SERVICE_ROLE_KEY || env.KARANTA_QA_SERVICE_ROLE_KEY) {
    errors.push("Une clé service_role ne doit jamais être transmise au navigateur QA.");
  }

  const qaUrl = env.KARANTA_QA_SUPABASE_URL;
  if (!qaUrl) {
    errors.push("KARANTA_QA_SUPABASE_URL est requis.");
  } else {
    try {
      const url = new URL(qaUrl);
      if (
        url.protocol !== "https:" ||
        !url.hostname.endsWith(".supabase.co") ||
        url.hostname === `${PRODUCTION_REF}.supabase.co`
      ) {
        errors.push("La base Supabase QA doit être hébergée et distincte de Karanta production.");
      }
      if (env.VITE_SUPABASE_URL && env.VITE_SUPABASE_URL !== qaUrl) {
        errors.push("VITE_SUPABASE_URL ne correspond pas à KARANTA_QA_SUPABASE_URL.");
      }
      if (env.SUPABASE_URL && env.SUPABASE_URL !== qaUrl) {
        errors.push("SUPABASE_URL ne correspond pas à KARANTA_QA_SUPABASE_URL.");
      }
    } catch {
      errors.push("KARANTA_QA_SUPABASE_URL n'est pas une URL valide.");
    }
  }

  if (!env.KARANTA_QA_PUBLISHABLE_KEY) errors.push("Clé publishable QA absente.");
  if (!env.KARANTA_QA_TEACHER_EMAIL || !env.KARANTA_QA_TEACHER_PASSWORD) {
    errors.push("Compte professeur QA dédié absent.");
  }
  if (suite !== "integration" && env.KARANTA_QA_START_SERVER !== "1") {
    errors.push("KARANTA_QA_START_SERVER=1 est requis pour contrôler la configuration locale.");
  }
  if (suite === "full") {
    for (const key of [
      "KARANTA_QA_OWNER_EMAIL",
      "KARANTA_QA_OWNER_PASSWORD",
      "KARANTA_QA_ORGANIZATION_ID",
      "KARANTA_QA_INVITEE_TEACHER_EMAIL",
      "KARANTA_QA_INVITEE_ADMIN_EMAIL",
    ]) {
      if (!env[key]) errors.push(`${key} est requis pour la recette complète M9.`);
    }
  }
  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const errors = validateQaEnvironment(process.env, process.argv[2]);
  if (errors.length) {
    console.error("Préflight QA refusé :");
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 2;
  } else {
    console.log("Préflight QA isolé : PASS (aucun secret affiché).");
  }
}
