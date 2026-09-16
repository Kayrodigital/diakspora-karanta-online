import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";

type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export const admissionStages = [
  ["new", "Nouvelle demande"],
  ["to_contact", "À contacter"],
  ["contacted", "Contacté"],
  ["needs_qualification", "Besoin à qualifier"],
  ["assessment_required", "Niveau à évaluer"],
  ["class_to_propose", "Classe à proposer"],
  ["proposal_sent", "Proposition envoyée"],
  ["payment_pending", "Paiement en attente"],
  ["confirmed", "Inscription confirmée"],
  ["access_sent", "Accès envoyé"],
  ["first_login_check", "Première connexion à vérifier"],
  ["closed", "Refus, abandon ou report"],
] as const;

export type AdmissionStage = (typeof admissionStages)[number][0];
export const stageLabel = Object.fromEntries(admissionStages) as Record<AdmissionStage, string>;

export type AdmissionApplication = Row<"enrollment_applications">;
export type AdmissionPayment = Row<"admission_payments">;
export type AdmissionEvent = Row<"admission_events">;
export type AdmissionTemplate = Row<"admission_message_templates">;
export type AdmissionCohort = Row<"cohorts">;

export type AdmissionData = {
  applications: AdmissionApplication[];
  cohorts: AdmissionCohort[];
  events: AdmissionEvent[];
  payments: AdmissionPayment[];
  templates: AdmissionTemplate[];
  managers: Array<{ id: string; name: string; role: string }>;
  activeCounts: Record<string, number>;
  savedFilters: Row<"admission_saved_filters">[];
};

function firstError(errors: Array<{ message: string } | null>) {
  return errors.find(Boolean) ?? null;
}

export async function loadAdmissions(
  organizationId: string,
  userId: string,
): Promise<AdmissionData> {
  const [
    applications,
    cohorts,
    events,
    payments,
    templates,
    memberships,
    profiles,
    classMembers,
    savedFilters,
  ] = await Promise.all([
    supabase
      .from("enrollment_applications")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("cohorts")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .order("name"),
    supabase
      .from("admission_events")
      .select("*")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("admission_payments")
      .select("*")
      .eq("organization_id", organizationId)
      .order("updated_at", { ascending: false }),
    supabase
      .from("admission_message_templates")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("is_active", true)
      .eq("locale", "fr")
      .order("title"),
    supabase
      .from("organization_memberships")
      .select("user_id, role")
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .in("role", [
        "owner",
        "admin",
        "commercial",
        "class_manager",
        "pedagogical_manager",
        "accounting",
        "support",
        "technician",
      ]),
    supabase.from("profiles").select("id, full_name, preferred_name, email"),
    supabase
      .from("learner_cohort_memberships")
      .select("cohort_id")
      .eq("organization_id", organizationId)
      .eq("status", "active"),
    supabase
      .from("admission_saved_filters")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("user_id", userId)
      .order("updated_at", { ascending: false }),
  ]);

  const error = firstError([
    applications.error,
    cohorts.error,
    events.error,
    payments.error,
    templates.error,
    memberships.error,
    profiles.error,
    classMembers.error,
    savedFilters.error,
  ]);
  if (error) throw error;

  const profileById = new Map((profiles.data ?? []).map((profile) => [profile.id, profile]));
  const activeCounts: Record<string, number> = {};
  for (const member of classMembers.data ?? [])
    activeCounts[member.cohort_id] = (activeCounts[member.cohort_id] ?? 0) + 1;

  return {
    applications: applications.data ?? [],
    cohorts: cohorts.data ?? [],
    events: events.data ?? [],
    payments: payments.data ?? [],
    templates: templates.data ?? [],
    savedFilters: savedFilters.data ?? [],
    activeCounts,
    managers: (memberships.data ?? []).map((membership) => {
      const profile = profileById.get(membership.user_id);
      return {
        id: membership.user_id,
        role: membership.role,
        name:
          profile?.preferred_name || profile?.full_name || profile?.email || "Membre de l’équipe",
      };
    }),
  };
}

export async function updateAdmission(
  id: string,
  patch: Database["public"]["Tables"]["enrollment_applications"]["Update"],
) {
  const { error } = await supabase
    .from("enrollment_applications")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function addAdmissionNote(
  application: AdmissionApplication,
  userId: string,
  note: string,
) {
  const clean = note.trim();
  if (!clean) throw new Error("Écrivez une note avant de l’ajouter.");
  const { error } = await supabase.from("admission_events").insert({
    organization_id: application.organization_id,
    application_id: application.id,
    actor_user_id: userId,
    event_type: "note_added",
    summary: clean,
  });
  if (error) throw error;
}

export type ClassRecommendation =
  Database["public"]["Functions"]["recommend_classes_for_application"]["Returns"][number];

export async function recommendClasses(applicationId: string): Promise<ClassRecommendation[]> {
  const { data, error } = await supabase.rpc("recommend_classes_for_application", {
    p_application_id: applicationId,
  });
  if (error) throw error;
  return data ?? [];
}

export async function savePayment(
  organizationId: string,
  userId: string,
  applicationId: string,
  cohortId: string | null,
  values: {
    expected: number;
    received: number;
    dueOn: string;
    method: string;
    reference: string;
    status: string;
  },
) {
  const payload = {
    organization_id: organizationId,
    application_id: applicationId,
    cohort_id: cohortId,
    expected_amount_cents: Math.round(values.expected * 100),
    received_amount_cents: Math.round(values.received * 100),
    due_on: values.dueOn || null,
    payment_method: values.method || null,
    payment_reference: values.reference.trim() || null,
    status: values.status,
    created_by: userId,
    validated_by: values.status === "paid" ? userId : null,
    validated_at: values.status === "paid" ? new Date().toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("admission_payments")
    .upsert(payload, { onConflict: "application_id,cohort_id" });
  if (error) throw error;
}

export async function saveAdmissionFilter(
  organizationId: string,
  userId: string,
  name: string,
  filters: Json,
) {
  const { error } = await supabase.from("admission_saved_filters").upsert(
    {
      organization_id: organizationId,
      user_id: userId,
      name: name.trim(),
      filters,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id,name" },
  );
  if (error) throw error;
}

export async function runAdmissionAction(payload: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("admin-members", { body: payload });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export function interpolateTemplate(
  body: string,
  application: AdmissionApplication,
  cohort?: AdmissionCohort,
) {
  return body
    .replaceAll(
      "{{prenom}}",
      application.applicant_name.split(/\s+/)[0] || application.applicant_name,
    )
    .replaceAll("{{classe}}", cohort?.name ?? "la classe proposée")
    .replaceAll("{{creneau}}", cohort?.schedule_label ?? "le créneau indiqué")
    .replaceAll("{{montant}}", "le montant indiqué")
    .replaceAll("{{date}}", "la date convenue")
    .replaceAll("{{informations}}", "les informations manquantes")
    .replaceAll(
      "{{decision}}",
      application.close_outcome === "postponed" ? "reportée" : "clôturée",
    );
}

export function whatsappUrl(phone: string, message: string) {
  const number = phone.replace(/[^0-9]/g, "");
  return `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
}

export function csvEscape(value: unknown) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}
