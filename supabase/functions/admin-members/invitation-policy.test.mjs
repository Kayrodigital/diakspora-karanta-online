import assert from "node:assert/strict";
import test from "node:test";
import {
  canManageInvitations,
  isInvitableRole,
  pendingInvitationConflicts,
} from "./invitation-policy.ts";

test("owner et admin peuvent inviter", () => {
  assert.equal(canManageInvitations("owner"), true);
  assert.equal(canManageInvitations("admin"), true);
});

test("un rôle public ou pédagogique ne peut pas inviter un administrateur", () => {
  for (const role of [
    "learner",
    "parent",
    "teacher",
    "pedagogical_manager",
    "technician",
    "support",
    "",
  ]) {
    assert.equal(canManageInvitations(role), false, role);
  }
});

test("professeur et administrateur sont des cibles autorisées", () => {
  assert.equal(isInvitableRole("teacher"), true);
  assert.equal(isInvitableRole("admin"), true);
});

test("un rôle absent de la contrainte DB est rejeté avant écriture", () => {
  for (const role of ["owner", "commercial", "accounting", "support", "super_admin"]) {
    assert.equal(isInvitableRole(role), false, role);
  }
});

test("une nouvelle invitation ou le même rôle n'entre pas en conflit", () => {
  assert.equal(pendingInvitationConflicts(null, "teacher"), false);
  assert.equal(pendingInvitationConflicts("teacher", "teacher"), false);
});

test("un rôle différent ne remplace pas une invitation en attente", () => {
  assert.equal(pendingInvitationConflicts("teacher", "admin"), true);
});
