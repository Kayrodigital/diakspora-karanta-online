import type { AccessibleProfile } from "@/lib/identity/profile-identity";
import { rememberActiveProfile } from "@/lib/identity/profile-identity";

export function ActiveProfileSwitcher({
  organizationId,
  profiles,
  activeProfileId,
}: {
  organizationId: string;
  profiles: AccessibleProfile[];
  activeProfileId: string;
}) {
  if (profiles.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-sm font-medium">
      Profil actif
      <select
        className="min-h-11 rounded-xl border bg-card px-3"
        value={activeProfileId}
        onChange={(event) => {
          rememberActiveProfile(organizationId, event.target.value);
          window.location.reload();
        }}
      >
        {profiles.map((profile) => (
          <option key={profile.id} value={profile.id}>
            {profile.preferred_name || profile.full_name || "Profil"}
          </option>
        ))}
      </select>
    </label>
  );
}
