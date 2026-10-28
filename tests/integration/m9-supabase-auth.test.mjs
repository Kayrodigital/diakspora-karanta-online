import assert from "node:assert/strict";
import test from "node:test";
import { createClient } from "@supabase/supabase-js";
import { validateQaEnvironment } from "../../scripts/qa/preflight.mjs";

const errors = validateQaEnvironment(process.env, "integration");
if (errors.length)
  throw new Error("Intégration Supabase refusée : préflight QA isolé non satisfait.");

function client() {
  return createClient(process.env.KARANTA_QA_SUPABASE_URL, process.env.KARANTA_QA_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

test("AUTH-02 intégration : un mauvais mot de passe ne crée aucune session", async () => {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.KARANTA_QA_TEACHER_EMAIL,
    password: `${process.env.KARANTA_QA_TEACHER_PASSWORD}-incorrect`,
  });
  assert.ok(error, "Un mot de passe erroné doit être refusé.");
  assert.equal(data.session, null);
});

test("AUTH-01 intégration : le professeur a un membership actif et son profil Auth", async () => {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: process.env.KARANTA_QA_TEACHER_EMAIL,
    password: process.env.KARANTA_QA_TEACHER_PASSWORD,
  });
  assert.equal(Boolean(error), false, "La connexion du compte professeur QA doit réussir.");
  assert.ok(data.user?.id, "L'identifiant Auth est obligatoire.");
  try {
    const [memberships, profiles] = await Promise.all([
      supabase
        .from("organization_memberships")
        .select("user_id,role,status")
        .eq("user_id", data.user.id)
        .eq("role", "teacher")
        .eq("status", "active"),
      supabase.from("profiles").select("id,auth_user_id").eq("auth_user_id", data.user.id),
    ]);
    assert.equal(Boolean(memberships.error), false, "Lecture membership refusée.");
    assert.equal(memberships.data.length, 1, "Un membership professeur actif est attendu.");
    assert.equal(memberships.data[0].user_id, data.user.id);
    assert.equal(Boolean(profiles.error), false, "Lecture profil Auth refusée.");
    assert.equal(profiles.data.length, 1, "Un profil Auth canonique est attendu.");
    assert.equal(profiles.data[0].auth_user_id, data.user.id);
  } finally {
    await supabase.auth.signOut();
  }
});

const invitationFixtureReady = [
  "KARANTA_QA_OWNER_EMAIL",
  "KARANTA_QA_OWNER_PASSWORD",
  "KARANTA_QA_ORGANIZATION_ID",
  "KARANTA_QA_INVITEE_TEACHER_EMAIL",
  "KARANTA_QA_INVITEE_ADMIN_EMAIL",
].every((key) => Boolean(process.env[key]));

test(
  "AUTH-03/04/05 intégration : invitations et renvoi sans doublon sur la recette",
  {
    skip: invitationFixtureReady ? false : "Comptes et destinataires d'invitation QA non fournis.",
  },
  async () => {
    const supabase = client();
    const { data: owner, error: ownerError } = await supabase.auth.signInWithPassword({
      email: process.env.KARANTA_QA_OWNER_EMAIL,
      password: process.env.KARANTA_QA_OWNER_PASSWORD,
    });
    assert.equal(Boolean(ownerError), false, "Connexion owner QA refusée.");
    assert.ok(owner.user?.id);
    const organizationId = process.env.KARANTA_QA_ORGANIZATION_ID;

    async function invite(email, role) {
      const { data, error } = await supabase.functions.invoke("admin-members", {
        body: {
          action: "invite",
          organizationId,
          email,
          fullName: `QA ${role}`,
          role,
        },
      });
      assert.equal(Boolean(error), false, `Invitation ${role} refusée par la fonction QA.`);
      assert.equal(data?.ok, true, `Invitation ${role} non confirmée.`);
      return data;
    }

    try {
      for (const [email, role] of [
        [process.env.KARANTA_QA_INVITEE_TEACHER_EMAIL, "teacher"],
        [process.env.KARANTA_QA_INVITEE_ADMIN_EMAIL, "admin"],
      ]) {
        const first = await invite(email, role);
        const second = await invite(email, role);
        assert.equal(second.userId, first.userId, "Un renvoi ne doit pas recréer le compte Auth.");
        const invitations = await supabase
          .from("organization_invitations")
          .select("id,user_id,role,status")
          .eq("organization_id", organizationId)
          .eq("email", email);
        assert.equal(Boolean(invitations.error), false, "Lecture des invitations QA refusée.");
        assert.equal(
          invitations.data.length,
          1,
          "Une seule invitation par rôle/email est attendue.",
        );
        assert.equal(invitations.data[0].user_id, first.userId);
        assert.equal(invitations.data[0].role, role);
        const memberships = await supabase
          .from("organization_memberships")
          .select("user_id,role,status")
          .eq("organization_id", organizationId)
          .eq("user_id", first.userId);
        assert.equal(Boolean(memberships.error), false, "Lecture membership QA refusée.");
        assert.equal(memberships.data.filter((member) => member.role === role).length, 1);
        assert.equal(
          memberships.data.some((member) => member.role === "owner"),
          false,
        );

        if (role === "teacher" && invitations.data[0].status === "invited") {
          const { data: resent, error: resendError } = await supabase.functions.invoke(
            "admin-members",
            {
              body: {
                action: "resend_invite",
                organizationId,
                invitationId: invitations.data[0].id,
              },
            },
          );
          assert.equal(Boolean(resendError), false, "Renvoi d'invitation QA refusé.");
          assert.equal(resent?.ok, true);
        }
      }
    } finally {
      await supabase.auth.signOut();
    }
  },
);
