import { supabase } from "@/integrations/supabase/client";

export type Audience = "child" | "teen_female" | "teen_male" | "adult_female" | "adult_male";
export type Objective =
  "arabic_literacy" | "arabic_language" | "quran_tajwid" | "islamic_studies" | "advanced_texts";
export type LearnerLevel = "beginner" | "intermediate" | "advanced" | "unsure";
export type Availability = "morning" | "daytime" | "evening" | "weekend";
export type AccompanimentLanguage = "fr" | "ar" | "diakhanke";
export type PreferredContact = "whatsapp" | "phone" | "email";

export type PublicCohort = {
  id: string;
  name: string;
  public_summary: string | null;
  audience: Audience;
  objective: Objective;
  level: string;
  teaching_languages: string[];
  schedule_label: string;
  session_period: Availability;
  starts_on: string | null;
  timezone: string;
  delivery_format: string;
  price_cents: number | null;
  availability: "open" | "waitlist" | "full" | "closed";
  remaining_places: number | null;
};

export type EnrollmentApplicationInput = {
  cohortId: string | null;
  audience: Audience;
  objective: Objective;
  level: LearnerLevel;
  availability: Availability;
  accompanimentLanguage: AccompanimentLanguage;
  applicantName: string;
  learnerName: string | null;
  email: string;
  phone: string;
  preferredContact: PreferredContact;
  notes: string | null;
  privacyConsent: boolean;
  website: string;
};

export async function loadPublicCohorts(): Promise<PublicCohort[]> {
  const { data, error } = await supabase.rpc("list_public_cohorts", {
    p_organization_slug: "diakspora",
  });

  if (error) throw error;
  return (data ?? []) as PublicCohort[];
}

export async function submitEnrollmentApplication(
  input: EnrollmentApplicationInput,
): Promise<string> {
  const { data, error } = await supabase.rpc("submit_enrollment_application", {
    p_organization_slug: "diakspora",
    // PostgreSQL accepts NULL here; generated RPC argument types do not encode nullable parameters.
    p_cohort_id: input.cohortId as string,
    p_audience: input.audience,
    p_objective: input.objective,
    p_level: input.level,
    p_availability: input.availability,
    p_accompaniment_language: input.accompanimentLanguage,
    p_applicant_name: input.applicantName,
    p_learner_name: input.learnerName as string,
    p_email: input.email,
    p_phone: input.phone,
    p_preferred_contact: input.preferredContact,
    p_notes: input.notes as string,
    p_privacy_consent: input.privacyConsent,
    p_website: input.website,
  });

  if (error) throw error;
  return data;
}
