import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPortalRole, requestedPortalDestination } from "./portal-role-policy.ts";

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

test("une demande explicite Admin n'est jamais rabattue vers le portail élève", () => {
  assert.equal(requestedPortalDestination("admin", ["learner"]), null);
  assert.equal(requestedPortalDestination("admin", ["teacher", "learner"]), null);
  assert.equal(requestedPortalDestination("admin", ["owner", "learner"]), "/admin");
});

test("les portails Staff restent accessibles uniquement aux rôles autorisés", () => {
  assert.equal(requestedPortalDestination("teacher", ["learner"]), null);
  assert.equal(requestedPortalDestination("teacher", ["teacher", "learner"]), "/professeur");
  assert.equal(requestedPortalDestination("teacher", ["owner"]), "/professeur");
  assert.equal(requestedPortalDestination("admissions", ["teacher"]), null);
  assert.equal(requestedPortalDestination("admissions", ["commercial"]), "/inscriptions");
});

test("le mode Élève est explicite, et n'interfère pas avec les autres portails", () => {
  assert.equal(requestedPortalDestination("family", ["learner"]), "/eleve");
  assert.equal(requestedPortalDestination("family", ["parent"]), "/parent");
  assert.equal(requestedPortalDestination("family", ["owner"]), "/eleve");
  assert.equal(requestedPortalDestination("admin", ["parent"]), null);
});
