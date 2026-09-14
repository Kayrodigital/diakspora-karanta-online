import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Payload = {
  organizationId?: string;
  topic?: string;
  level?: string;
  audience?: string;
  language?: "fr" | "ar";
  lessonCount?: number;
  sourceNotes?: string;
  sourceUrl?: string;
};

const teacherRoles = [
  "owner",
  "admin",
  "technician",
  "pedagogical_manager",
  "teacher",
  "class_manager",
];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function required(value: string | undefined, label: string) {
  const clean = value?.trim();
  if (!clean) throw new Error(`${label} est obligatoire.`);
  return clean;
}

function secretKey() {
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (keys) {
    const parsed = JSON.parse(keys) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  return required(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"), "SUPABASE_SERVICE_ROLE_KEY");
}

const schema = {
  type: "object",
  additionalProperties: false,
  required: [
    "title",
    "description",
    "learningObjectives",
    "moduleTitle",
    "lessons",
    "reviewWarning",
  ],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    learningObjectives: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
    moduleTitle: { type: "string" },
    lessons: {
      type: "array",
      minItems: 1,
      maxItems: 4,
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "summary", "keyPoints", "homework", "quiz"],
        properties: {
          title: { type: "string" },
          summary: { type: "string" },
          keyPoints: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 6 },
          homework: { type: "string" },
          quiz: {
            type: "object",
            additionalProperties: false,
            required: ["prompt", "options", "correctIndex", "explanation"],
            properties: {
              prompt: { type: "string" },
              options: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
              correctIndex: { type: "integer", minimum: 0, maximum: 3 },
              explanation: { type: "string" },
            },
          },
        },
      },
    },
    reviewWarning: { type: "string" },
  },
};

function extractOutputText(result: Record<string, unknown>): string | null {
  if (typeof result.output_text === "string") return result.output_text;
  if (!Array.isArray(result.output)) return null;
  for (const item of result.output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: string }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return json({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = required(Deno.env.get("SUPABASE_URL"), "SUPABASE_URL");
    const authorization = request.headers.get("Authorization") ?? "";
    const serviceClient = createClient(supabaseUrl, secretKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const { data: authData, error: authError } = await serviceClient.auth.getUser(token);
    if (authError || !authData.user) return json({ error: "Connexion requise." }, 401);

    const payload = (await request.json()) as Payload;
    const organizationId = required(payload.organizationId, "L'organisation");
    const topic = required(payload.topic, "Le sujet");
    const sourceNotes = payload.sourceNotes?.trim() ?? "";
    const sourceUrl = payload.sourceUrl?.trim() ?? "";
    if (!sourceNotes && !sourceUrl) {
      return json({ error: "Ajoutez au moins des notes ou un lien de référence." }, 400);
    }

    const { data: membership, error: membershipError } = await serviceClient
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .in("role", teacherRoles)
      .maybeSingle();
    if (membershipError) throw membershipError;
    if (!membership) return json({ error: "Accès professeur insuffisant." }, 403);

    const apiKey = Deno.env.get("OPENAI_API_KEY")?.trim();
    if (!apiKey) {
      return json(
        {
          error: "L'assistant IA doit encore être relié à une clé OpenAI API.",
          code: "AI_NOT_CONFIGURED",
        },
        503,
      );
    }

    const language = payload.language === "ar" ? "arabe littéraire simple" : "français simple";
    const lessonCount = Math.min(4, Math.max(1, Math.round(payload.lessonCount ?? 1)));
    const instructions = `Tu aides un professeur à préparer un brouillon pédagogique en ${language}.
Travaille seulement à partir des informations et références fournies. Pour un contenu religieux, n'invente jamais de verset, hadith, citation, règle juridique, avis d'école ou attribution. Si une information n'est pas étayée, signale dans reviewWarning qu'elle doit être vérifiée par le professeur. Rédige avec des phrases courtes, un vocabulaire clair et sans jargon informatique. Le résultat est un brouillon : le professeur demeure responsable de la validation avant publication.`;
    const input = `Sujet : ${topic}
Niveau : ${payload.level?.trim() || "non précisé"}
Public : ${payload.audience?.trim() || "non précisé"}
Nombre de leçons souhaité : ${lessonCount}
Lien de référence : ${sourceUrl || "aucun"}
Notes et contenu du professeur :
${sourceNotes || "Le contenu se trouve dans le lien fourni. Ne prétends pas avoir consulté ce lien."}`;

    const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL")?.trim() || "gpt-5-mini",
        input: [
          { role: "system", content: [{ type: "input_text", text: instructions }] },
          { role: "user", content: [{ type: "input_text", text: input }] },
        ],
        text: {
          format: {
            type: "json_schema",
            name: "course_draft",
            strict: true,
            schema,
          },
        },
      }),
    });

    const result = (await openAiResponse.json()) as Record<string, unknown>;
    if (!openAiResponse.ok) {
      console.error("Course assistant provider error", openAiResponse.status, result);
      return json({ error: "L'assistant IA est momentanément indisponible." }, 502);
    }
    const outputText = extractOutputText(result);
    if (!outputText) throw new Error("Réponse IA vide.");
    return json({ draft: JSON.parse(outputText) });
  } catch (error) {
    console.error("generate-course-draft", error);
    return json(
      { error: error instanceof Error ? error.message : "Impossible de préparer le brouillon." },
      500,
    );
  }
});
