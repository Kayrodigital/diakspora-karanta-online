import { createFileRoute, redirect } from "@tanstack/react-router";
import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";
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
  const { organization } = Route.useRouteContext();
  return (
    <div style={organizationTheme(organization)}>
      <DashboardPlaceholder
        eyebrow={`Administration · ${organization.name}`}
        title="Piloter votre école."
        description="Gestion des inscriptions, des rôles, des classes, des contenus et des intégrations."
        sections={[
          "Inscriptions & invitations",
          "Utilisateurs & rôles",
          "Classes & professeurs",
          "Cours, médias & archives",
          "Directs & replays",
          "Identité & configuration",
        ]}
      />
    </div>
  );
}
