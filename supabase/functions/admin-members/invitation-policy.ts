// Keep this list aligned with organization_invitations_role_check. Roles not
// represented there must be rejected before any Auth or membership write.
export const INVITABLE_ROLES = [
  "admin",
  "technician",
  "pedagogical_manager",
  "teacher",
  "class_manager",
  "parent",
  "learner",
] as const;

export function canManageInvitations(role: string): boolean {
  return role === "owner" || role === "admin";
}

export function isInvitableRole(role: string): boolean {
  return (INVITABLE_ROLES as readonly string[]).includes(role);
}

export function pendingInvitationConflicts(
  existingRole: string | null,
  requestedRole: string,
): boolean {
  return existingRole !== null && existingRole !== requestedRole;
}
