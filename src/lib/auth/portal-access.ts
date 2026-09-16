import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export const ORGANIZATION_ROLES = [
  "owner",
  "admin",
  "technician",
  "commercial",
  "accounting",
  "support",
  "pedagogical_manager",
  "teacher",
  "class_manager",
  "parent",
  "learner",
] as const;

export type OrganizationRole = (typeof ORGANIZATION_ROLES)[number];
export type Portal = "family" | "teacher" | "admin" | "planning" | "admissions";
export type PortalDestination = "/parent" | "/eleve" | "/professeur" | "/admin" | "/inscriptions";

type Membership = {
  id: string;
  organization_id: string;
  role: OrganizationRole;
  is_default: boolean;
};

export type OrganizationBrand = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  primary_color: string;
  accent_color: string;
};

export type PortalAccess = {
  user: User;
  membership: Membership;
  organization: OrganizationBrand;
};

const PORTAL_ROLES: Record<Portal, ReadonlySet<OrganizationRole>> = {
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

function isOrganizationRole(value: string): value is OrganizationRole {
  return (ORGANIZATION_ROLES as readonly string[]).includes(value);
}

function orderMemberships(memberships: Membership[]): Membership[] {
  return [...memberships].sort((left, right) => Number(right.is_default) - Number(left.is_default));
}

async function loadActiveMemberships(): Promise<{
  user: User;
  memberships: Membership[];
} | null> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return null;

  // Keep the back-office invitation status in sync on the user's first authenticated visit.
  await supabase.rpc("accept_my_organization_invitations");

  const { data: rawMemberships, error: membershipsError } = await supabase
    .from("organization_memberships")
    .select("id, organization_id, role, is_default")
    .eq("user_id", user.id)
    .eq("status", "active");

  if (membershipsError || !rawMemberships?.length) return null;

  const memberships = orderMemberships(
    rawMemberships.flatMap((membership) =>
      isOrganizationRole(membership.role) ? [{ ...membership, role: membership.role }] : [],
    ),
  );

  return { user, memberships };
}

export async function loadPortalAccess(portal: Portal): Promise<PortalAccess | null> {
  const access = await loadActiveMemberships();
  if (!access) return null;

  const membership = access.memberships.find((item) => PORTAL_ROLES[portal].has(item.role));

  if (!membership) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, accent_color")
    .eq("id", membership.organization_id)
    .eq("status", "active")
    .maybeSingle();

  if (organizationError || !organization) return null;

  return { user: access.user, membership, organization };
}

export async function resolvePostAuthDestination(
  requestedPortal?: Portal,
): Promise<PortalDestination | null> {
  const access = await loadActiveMemberships();
  if (!access) return null;

  const portalOrder: Portal[] = requestedPortal
    ? [
        requestedPortal,
        ...(["family", "teacher", "admissions", "admin"] as Portal[]).filter(
          (item) => item !== requestedPortal,
        ),
      ]
    : ["family", "teacher", "admissions", "admin"];

  for (const portal of portalOrder) {
    const membership = access.memberships.find((item) => PORTAL_ROLES[portal].has(item.role));
    if (!membership) continue;

    if (portal === "admin") return "/admin";
    if (portal === "admissions") return "/inscriptions";
    if (portal === "planning") {
      return ["owner", "admin"].includes(membership.role) ? "/admin" : "/professeur";
    }
    if (portal === "teacher") return "/professeur";
    return membership.role === "parent" ? "/parent" : "/eleve";
  }

  return null;
}

export function isPortal(value: unknown): value is Portal {
  return (
    value === "family" ||
    value === "teacher" ||
    value === "admin" ||
    value === "planning" ||
    value === "admissions"
  );
}
