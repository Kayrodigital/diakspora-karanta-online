import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPortalRole } from "./portal-role-policy.ts";

test("un professeur ne peut pas ouvrir le portail admin", () => {
  assert.equal(canAccessPortalRole("admin", "teacher"), false);
});

test("un parent ou un apprenant ne peut pas ouvrir les portails staff", () => {
  for (const role of ["parent", "learner"]) {
    assert.equal(canAccessPortalRole("admin", role), false);
    assert.equal(canAccessPortalRole("teacher", role), false);
  }
});

test("les rôles autorisés conservent leurs portails historiques", () => {
  assert.equal(canAccessPortalRole("family", "parent"), true);
  assert.equal(canAccessPortalRole("teacher", "teacher"), true);
  assert.equal(canAccessPortalRole("admin", "owner"), true);
  assert.equal(canAccessPortalRole("planning", "class_manager"), true);
});

test("un nom de rôle non reconnu ne donne aucun accès", () => {
  for (const portal of ["family", "teacher", "admin", "planning", "admissions"]) {
    assert.equal(canAccessPortalRole(portal, "super_admin_public"), false);
  }
});
