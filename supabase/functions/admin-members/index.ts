import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const managerRoles = ["owner", "admin", "technician", "pedagogical_manager"];
const invitibleRoles = [
  "admin",
  "technician",
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
      const userId = required(payload.userId, "L'utilisateur");
      const status = required(payload.status, "Le statut");
      if (!["active", "suspended"].includes(status)) throw new Error("Statut non autorisé.");
      const { error } = await serviceClient
        .from("organization_memberships")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("organization_id", organizationId)
        .eq("user_id", userId)
        .neq("role", "owner");
      if (error) throw error;
      return response({ ok: true });
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
