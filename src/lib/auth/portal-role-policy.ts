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
