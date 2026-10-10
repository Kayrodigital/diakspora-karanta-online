import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import {
  getAccessibleProfiles,
  getOwnProfile,
  resolveActiveProfile,
  type AccessibleProfile,
} from "@/lib/identity/profile-identity";
import { canAccessPortalRole } from "./portal-role-policy";

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
  feature_flags: Json;
};

export type PortalAccess = {
  user: User;
  membership: Membership;
  organization: OrganizationBrand;
  ownProfile: AccessibleProfile;
  accessibleProfiles: AccessibleProfile[];
  activeProfileId: string;
  profileIdentityV2: boolean;
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

  if (membershipsError) return null;

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

  let membership = access.memberships.find((item) => canAccessPortalRole(portal, item.role));

  // M5 family compatibility: canonical family links can open the family portal even when
  // an old parent/learner membership role is absent. Staff portals remain membership-only.
  if (!membership && portal === "family") {
    const own = await getOwnProfile(access.user.id);
    if (own?.organization_id) {
      const profiles = await getAccessibleProfiles(own.organization_id);
      if (profiles.some((profile) => profile.id !== own.id)) {
        membership = {
          id: `canonical-family:${own.id}`,
          organization_id: own.organization_id,
          role: "parent",
          is_default: false,
        };
      }
    }
  }

  if (!membership) return null;

  const { data: organization, error: organizationError } = await supabase
    .from("organizations")
    .select("id, name, slug, logo_url, primary_color, accent_color, feature_flags")
    .eq("id", membership.organization_id)
    .eq("status", "active")
    .maybeSingle();

  if (organizationError || !organization) return null;

  const ownProfile = await getOwnProfile(access.user.id, organization.id);
  if (!ownProfile) return null;
  const flags =
    organization.feature_flags && typeof organization.feature_flags === "object"
      ? organization.feature_flags
      : {};
  const profileIdentityV2 = !Array.isArray(flags) && flags.profile_identity_v2 === true;
  const accessibleProfiles = profileIdentityV2
    ? await getAccessibleProfiles(organization.id)
    : [ownProfile];
  const activeProfile = await resolveActiveProfile({
    authUserId: access.user.id,
    organizationId: organization.id,
    profileIdentityV2,
  });

  return {
    user: access.user,
    membership,
    organization,
    ownProfile,
    accessibleProfiles,
    activeProfileId: activeProfile.id,
    profileIdentityV2,
  };
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
    const membership = access.memberships.find((item) => canAccessPortalRole(portal, item.role));
    if (!membership) continue;

    if (portal === "admin") return "/admin";
    if (portal === "admissions") return "/inscriptions";
    if (portal === "planning") {
      return ["owner", "admin"].includes(membership.role) ? "/admin" : "/professeur";
    }
    if (portal === "teacher") return "/professeur";
    return membership.role === "parent" ? "/parent" : "/eleve";
  }

  const canonicalFamily = await loadPortalAccess("family");
  if (canonicalFamily) {
    return canonicalFamily.membership.role === "parent" ? "/parent" : "/eleve";
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
