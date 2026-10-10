type PortalName = "family" | "teacher" | "admin" | "planning" | "admissions";

const PORTAL_ROLES: Record<PortalName, ReadonlySet<string>> = {
  family: new Set(["parent", "learner"]),
  teacher: new Set(["pedagogical_manager", "teacher", "class_manager"]),
  admin: new Set(["owner", "admin", "technician"]),
  planning: new Set(["owner", "admin", "pedagogical_manager", "teacher", "class_manager"]),
  admissions: new Set([
    "owner",
    "admin",
    "commercial",
    "class_manager",
    "pedagogical_manager",
    "accounting",
    "support",
    "technician",
  ]),
};

export function canAccessPortalRole(portal: PortalName, role: string): boolean {
  return PORTAL_ROLES[portal].has(role);
}

/**
 * Explicit portal navigation must NEVER fall back to another user's portal.
 * Keep the route guard as the final authority; this helper only chooses a path.
 */
export function requestedPortalDestination(
  portal: PortalName,
  roles: readonly string[],
): "/admin" | "/professeur" | "/parent" | "/eleve" | "/inscriptions" | null {
  const has = (role: string) => roles.includes(role);
  const hasAdmin = has("owner") || has("admin") || has("technician");

  switch (portal) {
    case "admin":
      return hasAdmin ? "/admin" : null;
    case "teacher":
      // Existing Professor route lets admins preview the teaching workspace.
      return roles.some((role) => canAccessPortalRole("teacher", role)) || hasAdmin
        ? "/professeur"
        : null;
    case "family":
      if (has("parent")) return "/parent";
      if (has("learner") || hasAdmin) return "/eleve";
      return null;
    case "planning":
      if (hasAdmin) return "/admin";
      return roles.some((role) => canAccessPortalRole("planning", role)) ? "/professeur" : null;
    case "admissions":
      return roles.some((role) => canAccessPortalRole("admissions", role)) ? "/inscriptions" : null;
  }
}
