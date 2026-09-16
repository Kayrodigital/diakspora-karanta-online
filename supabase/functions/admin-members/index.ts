import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const managerRoles = [
  "owner",
  "admin",
  "technician",
  "pedagogical_manager",
  "commercial",
  "class_manager",
  "accounting",
  "support",
];
const legacyManagerRoles = ["owner", "admin", "technician", "pedagogical_manager"];
const invitibleRoles = [
  "admin",
  "technician",
  "commercial",
  "accounting",
  "support",
  "pedagogical_manager",
  "teacher",
  "class_manager",
  "parent",
  "learner",
];

type Payload = {
  action?: string;
  organizationId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
  cohortId?: string;
  guardianUserId?: string;
  learnerId?: string;
  userId?: string;
  status?: string;
  applicationId?: string;
  sendAccess?: boolean;
  fileName?: string;
  rows?: Array<Record<string, string>>;
  applicationIds?: string[];
};

function response(body: Record<string, unknown>, status = 200) {
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

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return response({ error: "Méthode non autorisée." }, 405);

  try {
    const supabaseUrl = required(Deno.env.get("SUPABASE_URL"), "SUPABASE_URL");
    const anonKey = required(Deno.env.get("SUPABASE_ANON_KEY"), "SUPABASE_ANON_KEY");
    const serviceKey = required(
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
      "SUPABASE_SERVICE_ROLE_KEY",
    );
    const authorization = request.headers.get("Authorization") ?? "";
    const callerClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { persistSession: false },
    });
    const serviceClient = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: authData, error: authError } = await callerClient.auth.getUser();
    if (authError || !authData.user) return response({ error: "Connexion requise." }, 401);

    const payload = (await request.json()) as Payload;
    const organizationId = required(payload.organizationId, "L'organisation");
    const { data: manager, error: managerError } = await serviceClient
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .in("role", managerRoles)
      .maybeSingle();

    if (managerError) throw managerError;
    if (!manager) return response({ error: "Droits administrateur insuffisants." }, 403);
    const requireRole = (roles: string[]) => {
      if (!roles.includes(manager.role)) throw new Error("Votre rôle ne permet pas cette action.");
    };

    const ensureCohort = async (cohortId?: string) => {
      if (!cohortId) return;
      const { data, error } = await serviceClient
        .from("cohorts")
        .select("id")
        .eq("id", cohortId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw new Error("Cette classe n'appartient pas à l'organisation.");
    };

    const assignLearner = async (learnerId: string, cohortId: string, status = "active") => {
      await ensureCohort(cohortId);
      const { data: learner, error: learnerError } = await serviceClient
        .from("learner_profiles")
        .select("id, user_id")
        .eq("id", learnerId)
        .eq("organization_id", organizationId)
        .maybeSingle();
      if (learnerError) throw learnerError;
      if (!learner) throw new Error("Élève introuvable.");

      const { error: classError } = await serviceClient.from("learner_cohort_memberships").upsert(
        {
          organization_id: organizationId,
          cohort_id: cohortId,
          learner_id: learner.id,
          status,
          created_by: authData.user.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "cohort_id,learner_id" },
      );
      if (classError) throw classError;

      if (learner.user_id) {
        const { error: legacyError } = await serviceClient.from("cohort_memberships").upsert(
          {
            organization_id: organizationId,
            cohort_id: cohortId,
            user_id: learner.user_id,
            role: "learner",
            status,
            created_by: authData.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "cohort_id,user_id,role" },
        );
        if (legacyError) throw legacyError;
      }
    };

    if (payload.action === "invite") {
      requireRole(legacyManagerRoles);
      const email = required(payload.email, "L'adresse e-mail").toLowerCase();
      const fullName = required(payload.fullName, "Le nom");
      const role = required(payload.role, "Le rôle");
      if (!invitibleRoles.includes(role)) throw new Error("Rôle non autorisé.");
      await ensureCohort(payload.cohortId);

      const { data: usersPage, error: usersError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw usersError;
      let invitedUser = usersPage.users.find((user) => user.email?.toLowerCase() === email);
      let emailSent = false;

      if (!invitedUser) {
        const appUrl = Deno.env.get("APP_URL") ?? "https://diakspora-karanta-online.vercel.app";
        const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: `${appUrl}/auth?portal=${role === "learner" || role === "parent" ? "family" : "teacher"}`,
        });
        if (error) throw error;
        invitedUser = data.user;
        emailSent = true;
      }

      const { error: profileError } = await serviceClient.from("profiles").upsert({
        id: invitedUser.id,
        full_name: fullName,
        email,
        phone: payload.phone?.trim() || null,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      const { error: membershipError } = await serviceClient
        .from("organization_memberships")
        .upsert(
          {
            organization_id: organizationId,
            user_id: invitedUser.id,
            role,
            status: "active",
            invited_by: authData.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,user_id,role" },
        );
      if (membershipError) throw membershipError;

      let learnerId: string | null = null;
      if (role === "learner") {
        const { data: existingLearner, error: existingError } = await serviceClient
          .from("learner_profiles")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", invitedUser.id)
          .maybeSingle();
        if (existingError) throw existingError;

        if (existingLearner) {
          learnerId = existingLearner.id;
          const { error } = await serviceClient
            .from("learner_profiles")
            .update({
              full_name: fullName,
              email,
              phone: payload.phone?.trim() || null,
              status: "active",
            })
            .eq("id", learnerId);
          if (error) throw error;
        } else {
          const { data, error } = await serviceClient
            .from("learner_profiles")
            .insert({
              organization_id: organizationId,
              user_id: invitedUser.id,
              full_name: fullName,
              email,
              phone: payload.phone?.trim() || null,
              access_mode: "individual",
              status: "active",
              created_by: authData.user.id,
            })
            .select("id")
            .single();
          if (error) throw error;
          learnerId = data.id;
        }
        if (payload.cohortId) await assignLearner(learnerId, payload.cohortId);
      }

      const { data: pendingInvite } = await serviceClient
        .from("organization_invitations")
        .select("id")
        .eq("organization_id", organizationId)
        .ilike("email", email)
        .eq("status", "invited")
        .maybeSingle();
      const invitation = {
        organization_id: organizationId,
        user_id: invitedUser.id,
        email,
        full_name: fullName,
        role,
        cohort_id: payload.cohortId || null,
        invited_by: authData.user.id,
        status: emailSent ? "invited" : "accepted",
        accepted_at: emailSent ? null : new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: invitationError } = pendingInvite
        ? await serviceClient
            .from("organization_invitations")
            .update(invitation)
            .eq("id", pendingInvite.id)
        : await serviceClient.from("organization_invitations").insert(invitation);
      if (invitationError) throw invitationError;

      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "member.invited",
        entity_type: role,
        entity_id: invitedUser.id,
        metadata: { email, role, cohort_id: payload.cohortId ?? null, email_sent: emailSent },
      });
      return response({ ok: true, userId: invitedUser.id, learnerId, emailSent });
    }

    if (payload.action === "create_managed_learner") {
      requireRole(legacyManagerRoles);
      const fullName = required(payload.fullName, "Le nom de l'élève");
      const guardianUserId = required(payload.guardianUserId, "Le responsable légal");
      await ensureCohort(payload.cohortId);
      const { data: guardian, error: guardianError } = await serviceClient
        .from("organization_memberships")
        .select("user_id")
        .eq("organization_id", organizationId)
        .eq("user_id", guardianUserId)
        .eq("role", "parent")
        .eq("status", "active")
        .maybeSingle();
      if (guardianError) throw guardianError;
      if (!guardian) throw new Error("Le responsable choisi n'a pas de compte parent actif.");

      const { data: learner, error: learnerError } = await serviceClient
        .from("learner_profiles")
        .insert({
          organization_id: organizationId,
          guardian_user_id: guardianUserId,
          full_name: fullName,
          phone: payload.phone?.trim() || null,
          access_mode: "guardian_managed",
          status: "active",
          created_by: authData.user.id,
        })
        .select("id")
        .single();
      if (learnerError) throw learnerError;
      if (payload.cohortId) await assignLearner(learner.id, payload.cohortId);

      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "learner.created",
        entity_type: "learner_profile",
        entity_id: learner.id,
        metadata: { guardian_user_id: guardianUserId, cohort_id: payload.cohortId ?? null },
      });
      return response({ ok: true, learnerId: learner.id });
    }

    if (payload.action === "assign_learner") {
      requireRole(legacyManagerRoles);
      const learnerId = required(payload.learnerId, "L'élève");
      const cohortId = required(payload.cohortId, "La classe");
      await assignLearner(learnerId, cohortId, "active");
      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "learner.assigned_to_cohort",
        entity_type: "learner_profile",
        entity_id: learnerId,
        metadata: { cohort_id: cohortId },
      });
      return response({ ok: true });
    }

    if (payload.action === "set_learner_status") {
      requireRole(legacyManagerRoles);
      const learnerId = required(payload.learnerId, "L'élève");
      const status = required(payload.status, "Le statut");
      if (!["active", "suspended", "completed", "archived"].includes(status)) {
        throw new Error("Statut élève non autorisé.");
      }
      const { data: learner, error } = await serviceClient
        .from("learner_profiles")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", learnerId)
        .eq("organization_id", organizationId)
        .select("user_id")
        .single();
      if (error) throw error;
      if (learner.user_id) {
        await serviceClient
          .from("organization_memberships")
          .update({
            status: status === "active" ? "active" : "suspended",
            updated_at: new Date().toISOString(),
          })
          .eq("organization_id", organizationId)
          .eq("user_id", learner.user_id)
          .eq("role", "learner");
      }
      return response({ ok: true });
    }

    if (payload.action === "set_member_status") {
      requireRole(legacyManagerRoles);
      const userId = required(payload.userId, "L'utilisateur");
      const status = required(payload.status, "Le statut");
      if (!["active", "suspended"].includes(status)) throw new Error("Statut non autorisé.");
      if (userId === authData.user.id && status === "suspended") {
        throw new Error("Vous ne pouvez pas suspendre votre propre accès.");
      }
      const { error } = await serviceClient
        .from("organization_memberships")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .neq("role", "owner");
      if (error) throw error;
      return response({ ok: true });
    }

    if (payload.action === "import_admissions") {
      requireRole(["owner", "admin", "commercial"]);
      const rows = payload.rows ?? [];
      if (!rows.length || rows.length > 500)
        throw new Error("L’import doit contenir entre 1 et 500 lignes.");
      const fileName = required(payload.fileName, "Le nom du fichier");
      const { data: batch, error: batchError } = await serviceClient
        .from("admission_import_batches")
        .insert({
          organization_id: organizationId,
          file_name: fileName,
          total_rows: rows.length,
          created_by: authData.user.id,
        })
        .select("id")
        .single();
      if (batchError) throw batchError;

      let imported = 0;
      let duplicates = 0;
      let errors = 0;
      for (const row of rows) {
        const email = (row.email ?? "").trim().toLowerCase();
        const applicantName = (row.nom ?? row.demandeur ?? "").trim();
        const learnerName = (row["élève"] ?? row.eleve ?? applicantName).trim();
        if (!email || !applicantName || !learnerName) {
          errors += 1;
          continue;
        }
        const { data: duplicate } = await serviceClient
          .from("enrollment_applications")
          .select("id")
          .eq("organization_id", organizationId)
          .ilike("email", email)
          .ilike("learner_name", learnerName)
          .neq("status", "closed")
          .limit(1)
          .maybeSingle();
        if (duplicate) {
          duplicates += 1;
          continue;
        }
        const { data: inserted, error } = await serviceClient
          .from("enrollment_applications")
          .insert({
            organization_id: organizationId,
            audience: row.public || "adult_female",
            objective: row.objectif || "arabic_language",
            level: row.niveau || "unsure",
            availability: row["disponibilité"] || row.disponibilite || "evening",
            accompaniment_language: row.langue || "fr",
            applicant_name: applicantName,
            learner_name: learnerName,
            email,
            phone: row["téléphone"] || row.telephone || "Non renseigné",
            preferred_contact: row.contact || "whatsapp",
            privacy_consent: false,
            source: "csv_import",
            source_detail: fileName,
            imported_batch_id: batch.id,
            status: "new",
            retained_until: new Date(Date.now() + 3 * 365 * 86400000).toISOString().slice(0, 10),
          })
          .select("id")
          .single();
        if (error || !inserted) {
          errors += 1;
          continue;
        }
        imported += 1;
        await serviceClient.from("admission_events").insert({
          organization_id: organizationId,
          application_id: inserted.id,
          actor_user_id: authData.user.id,
          event_type: "imported",
          summary: `Importé depuis ${fileName}`,
        });
      }
      await serviceClient
        .from("admission_import_batches")
        .update({
          status: "imported",
          imported_rows: imported,
          duplicate_rows: duplicates,
          error_rows: errors,
          completed_at: new Date().toISOString(),
        })
        .eq("id", batch.id);
      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "admissions.csv_imported",
        entity_type: "admission_import_batch",
        entity_id: batch.id,
        metadata: { imported, duplicates, errors },
      });
      return response({ ok: true, imported, duplicates, errors });
    }

    if (payload.action === "confirm_admission") {
      requireRole(["owner", "admin", "class_manager"]);
      const applicationId = required(payload.applicationId, "La demande");
      const { data: application, error: applicationError } = await serviceClient
        .from("enrollment_applications")
        .select("*")
        .eq("id", applicationId)
        .eq("organization_id", organizationId)
        .single();
      if (applicationError) throw applicationError;
      if (!application.proposed_cohort_id)
        throw new Error("Proposez une classe avant de confirmer l’inscription.");
      if (!application.learner_birth_date)
        throw new Error("Ajoutez la date de naissance afin de vérifier l’âge et la non-mixité.");
      const { data: cohort, error: cohortError } = await serviceClient
        .from("cohorts")
        .select("*")
        .eq("id", application.proposed_cohort_id)
        .eq("organization_id", organizationId)
        .single();
      if (cohortError) throw cohortError;
      if (cohort.enrollment_status !== "open")
        throw new Error(
          cohort.enrollment_status === "waitlist"
            ? "Cette classe est en liste d’attente : l’inscription ne peut pas encore être confirmée."
            : "Les inscriptions de cette classe sont fermées.",
        );
      const { count, error: countError } = await serviceClient
        .from("learner_cohort_memberships")
        .select("id", { count: "exact", head: true })
        .eq("cohort_id", cohort.id)
        .eq("status", "active");
      if (countError) throw countError;
      if (cohort.max_students !== null && (count ?? 0) >= cohort.max_students)
        throw new Error(
          "Cette classe est complète. Proposez une autre classe ou une liste d’attente.",
        );

      const email = application.email.toLowerCase();
      const isMinor = ["child", "teen_female", "teen_male"].includes(application.audience);
      const gender = ["teen_female", "adult_female"].includes(application.audience)
        ? "female"
        : ["teen_male", "adult_male"].includes(application.audience)
          ? "male"
          : null;
      const { data: usersPage, error: usersError } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (usersError) throw usersError;
      let account = usersPage.users.find((user) => user.email?.toLowerCase() === email);
      let emailSent = false;
      if (!account) {
        if (!payload.sendAccess)
          throw new Error("Confirmez explicitement l’envoi sécurisé de l’accès.");
        const appUrl = Deno.env.get("APP_URL") ?? "https://diakspora-karanta-online.vercel.app";
        const invited = await serviceClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: application.applicant_name },
          redirectTo: `${appUrl}/auth?portal=family`,
        });
        if (invited.error) throw invited.error;
        account = invited.data.user;
        emailSent = true;
      }
      await serviceClient.from("profiles").upsert({
        id: account.id,
        full_name: application.applicant_name,
        email,
        phone: application.phone,
        updated_at: new Date().toISOString(),
      });
      const accountRole = isMinor ? "parent" : "learner";
      const { error: membershipError } = await serviceClient
        .from("organization_memberships")
        .upsert(
          {
            organization_id: organizationId,
            user_id: account.id,
            role: accountRole,
            status: "active",
            invited_by: authData.user.id,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,user_id,role" },
        );
      if (membershipError) throw membershipError;

      let learnerQuery = serviceClient
        .from("learner_profiles")
        .select("id")
        .eq("organization_id", organizationId);
      learnerQuery = isMinor
        ? learnerQuery
            .eq("guardian_user_id", account.id)
            .ilike("full_name", application.learner_name)
        : learnerQuery.eq("user_id", account.id);
      const { data: existingLearner, error: existingLearnerError } = await learnerQuery
        .limit(1)
        .maybeSingle();
      if (existingLearnerError) throw existingLearnerError;
      let learnerId = existingLearner?.id;
      const learnerValues = {
        full_name: application.learner_name || application.applicant_name,
        email: isMinor ? null : email,
        phone: application.phone,
        birth_date: application.learner_birth_date,
        gender,
        status: "active",
        access_mode: isMinor ? "guardian_managed" : "individual",
      };
      if (learnerId) {
        const { error } = await serviceClient
          .from("learner_profiles")
          .update(learnerValues)
          .eq("id", learnerId);
        if (error) throw error;
      } else {
        const { data: learner, error } = await serviceClient
          .from("learner_profiles")
          .insert({
            organization_id: organizationId,
            user_id: isMinor ? null : account.id,
            guardian_user_id: isMinor ? account.id : null,
            ...learnerValues,
            created_by: authData.user.id,
          })
          .select("id")
          .single();
        if (error) throw error;
        learnerId = learner.id;
      }
      await assignLearner(learnerId!, cohort.id, "active");
      const now = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("enrollment_applications")
        .update({
          linked_user_id: account.id,
          linked_learner_id: learnerId,
          status: emailSent ? "access_sent" : "first_login_check",
          access_sent_at: emailSent ? now : application.access_sent_at,
          next_action: "Vérifier la première connexion",
          follow_up_at: new Date(Date.now() + 3 * 86400000).toISOString(),
          updated_at: now,
        })
        .eq("id", application.id);
      if (updateError) throw updateError;
      await serviceClient.from("admission_events").insert([
        {
          organization_id: organizationId,
          application_id: application.id,
          actor_user_id: authData.user.id,
          event_type: "learner_enrolled",
          summary: `Inscription confirmée dans ${cohort.name}`,
          metadata: { cohort_id: cohort.id, learner_id: learnerId },
        },
        ...(emailSent
          ? [
              {
                organization_id: organizationId,
                application_id: application.id,
                actor_user_id: authData.user.id,
                event_type: "access_sent",
                summary: "Accès sécurisé envoyé par e-mail",
              },
            ]
          : []),
      ]);
      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "admission.confirmed",
        entity_type: "enrollment_application",
        entity_id: application.id,
        metadata: {
          cohort_id: cohort.id,
          learner_id: learnerId,
          account_role: accountRole,
          email_sent: emailSent,
        },
      });
      return response({ ok: true, learnerId, userId: account.id, emailSent });
    }

    if (payload.action === "bulk_assign_class") {
      requireRole(["owner", "admin", "class_manager"]);
      const cohortId = required(payload.cohortId, "La classe");
      const applicationIds = [...new Set(payload.applicationIds ?? [])];
      if (!applicationIds.length || applicationIds.length > 100) {
        throw new Error("Sélectionnez entre 1 et 100 demandes.");
      }
      const { data: cohort, error: cohortError } = await serviceClient
        .from("cohorts")
        .select("id, name, max_students, enrollment_status")
        .eq("id", cohortId)
        .eq("organization_id", organizationId)
        .single();
      if (cohortError) throw cohortError;
      if (cohort.enrollment_status !== "open")
        throw new Error("Cette classe n’accepte pas d’inscriptions directes.");
      const { data: applications, error: applicationsError } = await serviceClient
        .from("enrollment_applications")
        .select("id, linked_learner_id")
        .eq("organization_id", organizationId)
        .in("id", applicationIds);
      if (applicationsError) throw applicationsError;
      const ready = (applications ?? []).filter((item) => item.linked_learner_id);
      const { count, error: countError } = await serviceClient
        .from("learner_cohort_memberships")
        .select("id", { count: "exact", head: true })
        .eq("cohort_id", cohortId)
        .eq("status", "active");
      if (countError) throw countError;
      if (cohort.max_students !== null && (count ?? 0) + ready.length > cohort.max_students) {
        throw new Error("Il ne reste pas assez de places pour cette action groupée.");
      }
      for (const application of ready) {
        await assignLearner(application.linked_learner_id!, cohortId, "active");
        await serviceClient
          .from("enrollment_applications")
          .update({ proposed_cohort_id: cohortId, updated_at: new Date().toISOString() })
          .eq("id", application.id);
        await serviceClient.from("admission_events").insert({
          organization_id: organizationId,
          application_id: application.id,
          actor_user_id: authData.user.id,
          event_type: "bulk_action",
          summary: `Inscription groupée dans ${cohort.name}`,
          metadata: { cohort_id: cohortId },
        });
      }
      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "admissions.bulk_class_assignment",
        entity_type: "cohort",
        entity_id: cohortId,
        metadata: { requested: applicationIds.length, enrolled: ready.length },
      });
      return response({
        ok: true,
        enrolled: ready.length,
        skipped: applicationIds.length - ready.length,
      });
    }

    return response({ error: "Action inconnue." }, 400);
  } catch (error) {
    console.error(error);
    return response(
      { error: error instanceof Error ? error.message : "Une erreur est survenue." },
      400,
    );
  }
});
