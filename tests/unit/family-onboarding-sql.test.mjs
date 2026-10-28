import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";

// Canonical-column contract fixture only: does not reconstruct missing historical M4 DDL.
const org = "00000000-0000-4000-8000-000000000001";
const parent = "00000000-0000-4000-8000-000000000002";
const actor = "00000000-0000-4000-8000-000000000003";
const child = "00000000-0000-4000-8000-000000000004";
const outsider = "00000000-0000-4000-8000-000000000005";
const sql = await readFile(
  new URL("../../supabase/plans/phase1/create_my_child_profile.sql", import.meta.url),
  "utf8",
);

test("isolated parent RPC contract: permissions, atomicity and retry safety", async (t) => {
  const db = new PGlite();
  try {
    await db.exec(`
      CREATE ROLE anon; CREATE ROLE authenticated;
      CREATE SCHEMA auth;
      CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
        $$ SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
      GRANT USAGE ON SCHEMA auth TO authenticated, anon;
      CREATE TABLE organizations (id uuid PRIMARY KEY, status text, feature_flags jsonb);
      CREATE TABLE profiles (id uuid PRIMARY KEY, organization_id uuid REFERENCES organizations,
        auth_user_id uuid, full_name text, profile_type text, status text, role text, created_by uuid);
      CREATE TABLE organization_memberships (organization_id uuid REFERENCES organizations, user_id uuid, role text, status text);
      CREATE TABLE family_relationships (organization_id uuid REFERENCES organizations,
        parent_profile_id uuid REFERENCES profiles, child_profile_id uuid REFERENCES profiles,
        parent_user_id uuid, learner_user_id uuid, relationship text, status text, created_by uuid);
      CREATE TABLE learner_profiles (organization_id uuid REFERENCES organizations, profile_id uuid REFERENCES profiles,
        user_id uuid, guardian_user_id uuid, full_name text CHECK(full_name <> 'Failure fixture'),
        access_mode text, status text, created_by uuid);
      INSERT INTO organizations VALUES ('${org}', 'active', '{"profile_identity_v2":true,"family_onboarding_v1":true}');
      INSERT INTO profiles VALUES ('${parent}', '${org}', '${actor}', 'QA parent', 'adult', 'active', 'parent', '${actor}');
      INSERT INTO organization_memberships VALUES ('${org}', '${actor}', 'parent', 'active');
      SELECT set_config('request.jwt.claim.sub','${actor}',false);
    `);
    await db.exec(sql);
    const call = (name = "QA child", consent = true, id = child, organization = org) =>
      db.query("SELECT public.create_my_child_profile($1,$2,$3,$4) AS id", [
        organization,
        name,
        consent,
        id,
      ]);
    const counts = async () =>
      (
        await db.query(
          "SELECT (SELECT count(*) FROM profiles) AS profiles, (SELECT count(*) FROM family_relationships) AS links, (SELECT count(*) FROM learner_profiles) AS learners",
        )
      ).rows[0];
    await t.test("anonymous execution is denied", async () => {
      await db.exec("SET ROLE anon");
      await assert.rejects(call(), /permission denied/);
      await db.exec("RESET ROLE");
    });
    await t.test("parent cannot insert profiles directly", async () => {
      await db.exec("SET ROLE authenticated");
      await assert.rejects(
        db.exec("INSERT INTO profiles (id) VALUES (gen_random_uuid())"),
        /permission denied/,
      );
      await db.exec("RESET ROLE");
    });
    await t.test("consent, name and organization are checked", async () => {
      await assert.rejects(call("QA child", false), /consent required/);
      await assert.rejects(call(" "), /Invalid child/);
      await assert.rejects(
        call("QA child", true, child, outsider),
        /Active parent access required/,
      );
    });
    await t.test("a learner or staff role cannot create a child", async () => {
      for (const role of ["learner", "teacher", "admin", "class_manager"]) {
        await db.query("UPDATE organization_memberships SET role=$1", [role]);
        await assert.rejects(call(), /Active parent access required/);
      }
      await db.exec("UPDATE organization_memberships SET role='parent'");
    });
    await t.test("feature disabled or suspended parent is rejected", async () => {
      await db.exec("UPDATE organizations SET feature_flags='{}'");
      await assert.rejects(call(), /Active parent access required/);
      await db.exec(
        `UPDATE organizations SET feature_flags='{"profile_identity_v2":true,"family_onboarding_v1":true}'; UPDATE organization_memberships SET status='suspended'`,
      );
      await assert.rejects(call(), /Active parent access required/);
      await db.exec("UPDATE organization_memberships SET status='active'");
    });
    await t.test("child creation is atomic when the legacy bridge fails", async () => {
      await assert.rejects(call("Failure fixture"), /check constraint/);
      assert.deepEqual(await counts(), { profiles: 1, links: 0, learners: 0 });
    });
    await t.test("parent creates one child without an Auth identity or enrollment", async () => {
      await db.exec("SET ROLE authenticated");
      assert.equal((await call()).rows[0].id, child);
      await db.exec("RESET ROLE");
      assert.deepEqual(await counts(), { profiles: 2, links: 1, learners: 1 });
      const profile = (
        await db.query("SELECT auth_user_id,profile_type FROM profiles WHERE id=$1", [child])
      ).rows[0];
      assert.deepEqual(profile, { auth_user_id: null, profile_type: "child" });
    });
    await t.test("network retry returns the same profile without duplicates", async () => {
      assert.equal((await call()).rows[0].id, child);
      assert.deepEqual(await counts(), { profiles: 2, links: 1, learners: 1 });
      await assert.rejects(call("Changed child"), /identifier unavailable/);
    });
    await t.test("another parent cannot claim an existing child", async () => {
      await db.exec(
        `INSERT INTO profiles VALUES ('${outsider}','${org}','${outsider}','Other QA parent','adult','active','parent','${outsider}'); INSERT INTO organization_memberships VALUES ('${org}','${outsider}','parent','active'); SELECT set_config('request.jwt.claim.sub','${outsider}',false)`,
      );
      await assert.rejects(call(), /identifier unavailable/);
    });
    await t.test("a parent can add a second child", async () => {
      await db.exec(`SELECT set_config('request.jwt.claim.sub','${actor}',false)`);
      await call("Second QA child", true, "00000000-0000-4000-8000-000000000006");
      assert.deepEqual(await counts(), { profiles: 4, links: 2, learners: 2 });
    });
  } finally {
    await db.close();
  }
});
