import { createFileRoute, redirect } from "@tanstack/react-router";
import { AdminWorkspace } from "@/features/admin/AdminWorkspace";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/admin")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("admin");
    if (!access) throw redirect({ to: "/auth", search: { portal: "admin" } });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Espace Admin — Diakspora Karanta" },
      { name: "description", content: "Administration de la plateforme." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const { organization, user } = Route.useRouteContext();
  return (
    <div style={organizationTheme(organization)}>
      <AdminWorkspace organization={organization} userId={user.id} />
    </div>
  );
}
