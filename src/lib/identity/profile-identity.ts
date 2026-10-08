import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

export type AccessibleProfile = Pick<
  ProfileRow,
  | "id"
  | "auth_user_id"
  | "organization_id"
  | "full_name"
  | "preferred_name"
  | "profile_type"
  | "status"
>;

const ACTIVE_PROFILE_KEY = "karanta.active-profile";

export async function getProfileForAuthUser(
  authUserId: string,
  organizationId?: string,
): Promise<AccessibleProfile | null> {
  let query = supabase
    .from("profiles")
    .select("id, auth_user_id, organization_id, full_name, preferred_name, profile_type, status")
    .eq("auth_user_id", authUserId);
  if (organizationId) query = query.eq("organization_id", organizationId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOwnProfile(
  authUserId: string,
  organizationId?: string,
): Promise<AccessibleProfile | null> {
  return getProfileForAuthUser(authUserId, organizationId);
}

export async function getAccessibleProfiles(organizationId: string): Promise<AccessibleProfile[]> {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  if (authError) throw authError;
  if (!authData.user) return [];
  const own = await getOwnProfile(authData.user.id, organizationId);
  if (!own) return [];
  const { data: relationships, error: relationshipsError } = await supabase
    .from("family_relationships")
    .select("child_profile_id")
    .eq("organization_id", organizationId)
    .eq("parent_profile_id", own.id)
    .eq("status", "active");
  if (relationshipsError) throw relationshipsError;
  const ids = [
    own.id,
    ...(relationships ?? [])
      .map((relationship) => relationship.child_profile_id)
      .filter((id): id is string => Boolean(id)),
  ];
  const { data, error } = await supabase
    .from("profiles")
    .select("id, auth_user_id, organization_id, full_name, preferred_name, profile_type, status")
    .eq("organization_id", organizationId)
    .in("id", ids)
    .neq("status", "archived")
    .order("full_name");
  if (error) throw error;
  return data ?? [];
}

export async function canUseProfile(profileId: string, organizationId: string): Promise<boolean> {
  return (await getAccessibleProfiles(organizationId)).some((profile) => profile.id === profileId);
}

export async function getLegacyLearnerId(
  profileId: string,
  organizationId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("learner_profiles")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("profile_id", profileId)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

function storageKey(organizationId: string) {
  return `${ACTIVE_PROFILE_KEY}:${organizationId}`;
}

export function rememberActiveProfile(organizationId: string, profileId: string) {
  if (typeof window !== "undefined")
    window.localStorage.setItem(storageKey(organizationId), profileId);
}

export async function resolveActiveProfile(input: {
  authUserId: string;
  organizationId: string;
  profileIdentityV2: boolean;
}): Promise<AccessibleProfile> {
  const own = await getOwnProfile(input.authUserId, input.organizationId);
  if (!own) throw new Error("Aucun profil canonique n’est associé à ce compte.");

  if (!input.profileIdentityV2 || typeof window === "undefined") return own;
  const requestedId = window.localStorage.getItem(storageKey(input.organizationId));
  if (!requestedId || requestedId === own.id) return own;

  // A forged localStorage value is accepted only if the database exposes it through RLS.
  if (!(await canUseProfile(requestedId, input.organizationId))) {
    window.localStorage.removeItem(storageKey(input.organizationId));
    return own;
  }
  const profiles = await getAccessibleProfiles(input.organizationId);
  return profiles.find((profile) => profile.id === requestedId) ?? own;
}
