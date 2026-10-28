import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  canManageInvitations,
  isInvitableRole,
  pendingInvitationConflicts,
} from "./invitation-policy.ts";

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
function invitationPortal(role: string) {
  if (role === "parent" || role === "learner") return "family";
  if (role === "teacher" || role === "class_manager" || role === "pedagogical_manager")
    return "teacher";
  return "admin";
}

function inviteRedirect(role: string) {
  const appUrl =
    Deno.env.get("APP_URL")?.replace(/\/$/, "") || "https://diakspora-karanta-online.vercel.app";
  return `${appUrl}/auth/complete?flow=invite&portal=${invitationPortal(role)}`;
}

async function sendInvitationViaBrevo(email: string, fullName: string, actionLink: string) {
  const apiKey = required(Deno.env.get("BREVO_API_KEY"), "BREVO_API_KEY");
  const sender = required(Deno.env.get("BREVO_SENDER_EMAIL"), "BREVO_SENDER_EMAIL");
  if (sender.toLowerCase() !== "karanta@diakspora.com") {
    throw new Error("L'expéditeur Brevo doit être karanta@diakspora.com.");
  }
  const escapedName = fullName
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
  const escapedLink = actionLink.replaceAll("&", "&amp;").replaceAll('"', "&quot;");
  const sent = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { accept: "application/json", "api-key": apiKey, "content-type": "application/json" },
    body: JSON.stringify({
      sender: { email: sender, name: "Diakspora Karanta" },
      to: [{ email, name: fullName }],
      subject: "Votre invitation à Diakspora Karanta",
      htmlContent: `<p>Bonjour ${escapedName},</p><p>Votre équipe vous invite à rejoindre Diakspora Karanta.</p><p><a href="${escapedLink}">Activer mon accès</a></p><p>Si vous n'attendiez pas cette invitation, ignorez ce message.</p>`,
      textContent: `Bonjour ${fullName},\n\nActivez votre accès Karanta : ${actionLink}\n\nSi vous n'attendiez pas cette invitation, ignorez ce message.`,
      tags: ["karanta-auth", "invitation"],
    }),
  });
  if (!sent.ok) throw new Error(`Envoi Brevo impossible (HTTP ${sent.status}).`);
}

type Payload = {
  action?: string;
  invitationId?: string;
  organizationId?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  birthDate?: string;
  gender?: "female" | "male" | "unspecified";
  role?: string;
  cohortId?: string;
  guardianUserId?: string;
  learnerId?: string;
  profileId?: string;
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
    const { data: managerRows, error: managerError } = await serviceClient
      .from("organization_memberships")
      .select("role")
      .eq("organization_id", organizationId)
      .eq("user_id", authData.user.id)
      .eq("status", "active")
      .in("role", managerRoles);

    if (managerError) throw managerError;
    const manager = managerRows?.sort(
      (left, right) => managerRoles.indexOf(left.role) - managerRoles.indexOf(right.role),
    )[0];
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

    const assignLearner = async (
      learnerId: string | undefined,
      cohortId: string,
      status = "active",
      profileId?: string,
    ) => {
      await ensureCohort(cohortId);
      if (!learnerId && !profileId) throw new Error("L'élève est obligatoire.");

      let learnerQuery = serviceClient
        .from("learner_profiles")
        .select("id, profile_id")
        .eq("organization_id", organizationId);
      if (learnerId) learnerQuery = learnerQuery.eq("id", learnerId);
      if (profileId) learnerQuery = learnerQuery.eq("profile_id", profileId);
      const { data: learner, error: learnerError } = await learnerQuery.maybeSingle();
      if (learnerError) throw learnerError;
      if (!learner?.profile_id) throw new Error("Mapping élève/profil absent ou incohérent.");

      const { error: assignmentError } = await serviceClient.rpc("assign_learner_to_cohort", {
        p_organization_id: organizationId,
        p_actor_user_id: authData.user.id,
        p_cohort_id: cohortId,
        p_learner_id: learner.id,
        p_profile_id: learner.profile_id,
        p_status: status,
      });
      if (assignmentError) throw assignmentError;
      return { learnerId: learner.id, profileId: learner.profile_id };
    };

    const resolveAuthProfile = async (
      userId: string,
      values: { full_name: string; email: string; phone: string | null },
    ) => {
      const { data: profiles, error: lookupError } = await serviceClient
        .from("profiles")
        .select("id")
        .eq("auth_user_id", userId)
        .limit(2);
      if (lookupError) throw lookupError;
      if (profiles.length !== 1) {
        throw new Error("Le profil Auth canonique est absent ou ambigu.");
      }

      const profileId = profiles[0].id;
      const { error: updateError } = await serviceClient
        .from("profiles")
        .update({
          ...values,
          organization_id: organizationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profileId)
        .eq("auth_user_id", userId);
      if (updateError) throw updateError;
      return profileId;
    };

    const createManagedLearner = async (input: {
      guardianUserId: string;
      fullName: string;
      phone?: string | null;
      birthDate?: string | null;
      gender?: "female" | "male" | "unspecified" | null;
    }) => {
      const { data, error } = await serviceClient.rpc("create_managed_learner_profile", {
        p_organization_id: organizationId,
        p_created_by: authData.user.id,
        p_guardian_user_id: input.guardianUserId,
        p_full_name: input.fullName,
        p_phone: input.phone || null,
        p_birth_date: input.birthDate || null,
        p_gender: input.gender || null,
      });
      if (error) throw error;
      const created = Array.isArray(data) ? data[0] : data;
      if (!created?.profile_id || !created?.learner_id) {
        throw new Error("La création atomique du profil élève a échoué.");
      }
      return { profileId: created.profile_id as string, learnerId: created.learner_id as string };
    };

    if (payload.action === "invite") {
      if (!canManageInvitations(manager.role))
        throw new Error("Votre rôle ne permet pas cette action.");
      const email = required(payload.email, "L'adresse e-mail").toLowerCase();
      const fullName = required(payload.fullName, "Le nom");
      const role = required(payload.role, "Le rôle");
      if (!isInvitableRole(role)) throw new Error("Rôle non autorisé.");
      await ensureCohort(payload.cohortId);

      // The database permits one pending invite per organization and email.
      // Never replace its role silently: that could leave two active memberships.
      const { data: pendingInvite, error: pendingError } = await serviceClient
        .from("organization_invitations")
        .select("id, role")
        .eq("organization_id", organizationId)
        .ilike("email", email)
        .eq("status", "invited")
        .maybeSingle();
      if (pendingError) throw pendingError;
      if (pendingInvitationConflicts(pendingInvite?.role ?? null, role)) {
        throw new Error(
          "Une invitation existe déjà pour un autre rôle. Traitez-la avant de changer le rôle.",
        );
      }

      let invitedUser:
        | Awaited<ReturnType<typeof serviceClient.auth.admin.listUsers>>["data"]["users"][number]
        | undefined;
      for (let page = 1; ; page++) {
        const { data: usersPage, error: usersError } = await serviceClient.auth.admin.listUsers({
          page,
          perPage: 1000,
        });
        if (usersError) throw usersError;
        invitedUser = usersPage.users.find((user) => user.email?.toLowerCase() === email);
        if (invitedUser || usersPage.users.length < 1000) break;
      }
      let emailSent = false;

      if (!invitedUser) {
        const { data, error } = await serviceClient.auth.admin.inviteUserByEmail(email, {
          data: { full_name: fullName },
          redirectTo: inviteRedirect(role),
        });
        if (error) throw error;
        invitedUser = data.user;
        emailSent = true;
      }

      const profileId = await resolveAuthProfile(invitedUser.id, {
        full_name: fullName,
        email,
        phone: payload.phone?.trim() || null,
      });

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
              profile_id: profileId,
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
              profile_id: profileId,
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

      // An existing unconfirmed account needs a fresh invite link. Supabase's
      // inviteUserByEmail is not reliable for re-inviting an existing user, so
      // generate a single-use Auth link and send it through the existing Brevo
      // transactional channel after all database writes have succeeded.
      const invitation = {
        organization_id: organizationId,
        user_id: invitedUser.id,
        email,
        full_name: fullName,
        role,
        cohort_id: payload.cohortId || null,
        invited_by: authData.user.id,
        status: invitedUser.email_confirmed_at ? "accepted" : "invited",
        accepted_at: invitedUser.email_confirmed_at ? new Date().toISOString() : null,
        expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };
      const { error: invitationError } = pendingInvite
        ? await serviceClient
            .from("organization_invitations")
            .update(invitation)
            .eq("id", pendingInvite.id)
        : await serviceClient.from("organization_invitations").insert(invitation);
      if (invitationError) throw invitationError;

      if (!emailSent && !invitedUser.email_confirmed_at) {
        const { data: link, error: linkError } = await serviceClient.auth.admin.generateLink({
          type: "invite",
          email,
          options: { redirectTo: inviteRedirect(role) },
        });
        if (linkError || !link?.properties?.action_link) {
          throw linkError || new Error("Impossible de régénérer le lien d'invitation.");
        }
        await sendInvitationViaBrevo(email, fullName, link.properties.action_link);
        emailSent = true;
      }

      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "member.invited",
        entity_type: role,
        entity_id: invitedUser.id,
        metadata: { email, role, cohort_id: payload.cohortId ?? null, email_sent: emailSent },
      });
      return response({ ok: true, userId: invitedUser.id, profileId, learnerId, emailSent });
    }

    if (payload.action === "resend_invite") {
      if (!canManageInvitations(manager.role))
        throw new Error("Votre rôle ne permet pas cette action.");
      const invitationId = required(payload.invitationId, "L'invitation");
      const { data: invitation, error: invitationError } = await serviceClient
        .from("organization_invitations")
        .select("id, email, full_name, role, status, user_id")
        .eq("id", invitationId)
        .eq("organization_id", organizationId)
        .in("status", ["invited", "expired"])
        .maybeSingle();
      if (invitationError) throw invitationError;
      if (!invitation || !invitation.user_id) {
        throw new Error("Cette invitation n'est plus en attente ou n'est pas liée à un compte.");
      }
      const { data: membership, error: membershipError } = await serviceClient
        .from("organization_memberships")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", invitation.user_id)
        .eq("role", invitation.role)
        .eq("status", "active")
        .maybeSingle();
      if (membershipError) throw membershipError;
      if (!membership) throw new Error("Le membership correspondant n'est plus actif.");
      const { data: account, error: accountError } = await serviceClient.auth.admin.getUserById(
        invitation.user_id,
      );
      if (
        accountError ||
        !account.user ||
        account.user.email?.toLowerCase() !== invitation.email.toLowerCase()
      ) {
        throw new Error("Le compte Auth associé à cette invitation est absent ou incohérent.");
      }
      if (account.user.email_confirmed_at) {
        throw new Error(
          "Ce compte est déjà activé. Utilisez la connexion ou la récupération de mot de passe.",
        );
      }
      const { data: link, error: linkError } = await serviceClient.auth.admin.generateLink({
        type: "invite",
        email: invitation.email,
        options: { redirectTo: inviteRedirect(invitation.role) },
      });
      if (linkError || !link?.properties?.action_link) {
        throw linkError || new Error("Impossible de régénérer le lien d'invitation.");
      }
      await sendInvitationViaBrevo(
        invitation.email,
        invitation.full_name,
        link.properties.action_link,
      );
      const { error: updateError } = await serviceClient
        .from("organization_invitations")
        .update({
          status: "invited",
          expires_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", invitation.id);
      if (updateError) throw updateError;
      return response({ ok: true, emailSent: true });
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

      const created = await createManagedLearner({
        guardianUserId,
        fullName,
        phone: payload.phone?.trim() || null,
        birthDate: payload.birthDate?.trim() || null,
        gender: payload.gender || null,
      });
      if (payload.cohortId) await assignLearner(created.learnerId, payload.cohortId);

      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "learner.created",
        entity_type: "learner_profile",
        entity_id: created.learnerId,
        metadata: {
          profile_id: created.profileId,
          guardian_user_id: guardianUserId,
          cohort_id: payload.cohortId ?? null,
        },
      });
      return response({ ok: true, profileId: created.profileId, learnerId: created.learnerId });
    }

    if (payload.action === "assign_learner") {
      requireRole(legacyManagerRoles);
      const learnerId = payload.learnerId?.trim() || undefined;
      const profileId = payload.profileId?.trim() || undefined;
      if (!learnerId && !profileId) throw new Error("L'élève est obligatoire.");
      const cohortId = required(payload.cohortId, "La classe");
      const assigned = await assignLearner(learnerId, cohortId, "active", profileId);
      await serviceClient.from("audit_logs").insert({
        organization_id: organizationId,
        actor_user_id: authData.user.id,
        action: "learner.assigned_to_cohort",
        entity_type: "learner_profile",
        entity_id: assigned.learnerId,
        metadata: { cohort_id: cohortId, profile_id: assigned.profileId },
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
      const accountProfileId = await resolveAuthProfile(account.id, {
        full_name: application.applicant_name,
        email,
        phone: application.phone,
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

      const learnerValues = {
        full_name: application.learner_name || application.applicant_name,
        email: isMinor ? null : email,
        phone: application.phone,
        birth_date: application.learner_birth_date,
        gender: gender ?? "unspecified",
        status: "active",
        access_mode: isMinor ? "guardian_managed" : "individual",
      };

      let learnerId: string;
      let learnerProfileId: string;
      if (isMinor) {
        if (Boolean(application.linked_learner_id) !== Boolean(application.linked_profile_id)) {
          throw new Error("Le bridge profil/élève de la demande est incomplet.");
        }

        if (application.linked_learner_id && application.linked_profile_id) {
          const { data: linkedLearner, error: linkedError } = await serviceClient
            .from("learner_profiles")
            .select("id, profile_id")
            .eq("id", application.linked_learner_id)
            .eq("profile_id", application.linked_profile_id)
            .eq("organization_id", organizationId)
            .eq("guardian_user_id", account.id)
            .is("user_id", null)
            .maybeSingle();
          if (linkedError) throw linkedError;
          if (!linkedLearner) throw new Error("Le bridge enfant existant est incohérent.");
          learnerId = linkedLearner.id;
          learnerProfileId = linkedLearner.profile_id;

          const { error: profileUpdateError } = await serviceClient
            .from("profiles")
            .update({
              full_name: learnerValues.full_name,
              phone: learnerValues.phone,
              birth_date: learnerValues.birth_date,
              gender,
              updated_at: new Date().toISOString(),
            })
            .eq("id", learnerProfileId)
            .eq("organization_id", organizationId)
            .eq("profile_type", "child")
            .is("auth_user_id", null);
          if (profileUpdateError) throw profileUpdateError;

          const { error: learnerUpdateError } = await serviceClient
            .from("learner_profiles")
            .update(learnerValues)
            .eq("id", learnerId)
            .eq("profile_id", learnerProfileId);
          if (learnerUpdateError) throw learnerUpdateError;
        } else {
          const created = await createManagedLearner({
            guardianUserId: account.id,
            fullName: learnerValues.full_name,
            phone: learnerValues.phone,
            birthDate: learnerValues.birth_date,
            gender,
          });
          learnerId = created.learnerId;
          learnerProfileId = created.profileId;
        }
      } else {
        learnerProfileId = accountProfileId;
        const { data: existingLearner, error: existingLearnerError } = await serviceClient
          .from("learner_profiles")
          .select("id")
          .eq("organization_id", organizationId)
          .eq("user_id", account.id)
          .maybeSingle();
        if (existingLearnerError) throw existingLearnerError;

        if (existingLearner) {
          learnerId = existingLearner.id;
          const { error } = await serviceClient
            .from("learner_profiles")
            .update({ ...learnerValues, profile_id: learnerProfileId })
            .eq("id", learnerId);
          if (error) throw error;
        } else {
          const { data: learner, error } = await serviceClient
            .from("learner_profiles")
            .insert({
              organization_id: organizationId,
              user_id: account.id,
              guardian_user_id: null,
              profile_id: learnerProfileId,
              ...learnerValues,
              created_by: authData.user.id,
            })
            .select("id")
            .single();
          if (error) throw error;
          learnerId = learner.id;
        }
      }
      await assignLearner(learnerId, cohort.id, "active");
      const now = new Date().toISOString();
      const { error: updateError } = await serviceClient
        .from("enrollment_applications")
        .update({
          linked_user_id: account.id,
          linked_learner_id: learnerId,
          linked_profile_id: learnerProfileId,
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
          metadata: {
            cohort_id: cohort.id,
            profile_id: learnerProfileId,
            learner_id: learnerId,
          },
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
          profile_id: learnerProfileId,
          learner_id: learnerId,
          account_role: accountRole,
          email_sent: emailSent,
        },
      });
      return response({
        ok: true,
        profileId: learnerProfileId,
        learnerId,
        userId: account.id,
        emailSent,
      });
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
