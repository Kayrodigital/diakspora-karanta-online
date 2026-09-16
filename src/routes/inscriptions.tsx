import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdmissionsWorkspace } from "@/features/admissions/AdmissionsWorkspace";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/inscriptions")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("admissions");
    if (!access) throw redirect({ to: "/auth", search: { portal: "admissions" } });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Inscriptions — Diakspora Karanta" },
      { name: "description", content: "Suivi des demandes et des admissions." },
    ],
  }),
  component: AdmissionsPage,
});

function AdmissionsPage() {
  const { organization, membership, user } = Route.useRouteContext();
  return (
    <div style={organizationTheme(organization)}>
      <AdmissionsWorkspace organization={organization} role={membership.role} userId={user.id} />
    </div>
  );
}
