import { createFileRoute, redirect } from "@tanstack/react-router";
import { TeacherWorkspace } from "@/features/professeur/TeacherWorkspace";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/professeur")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("teacher");
    if (!access) throw redirect({ to: "/auth", search: { portal: "teacher" } });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Espace Professeur — Diakspora Karanta" },
      {
        name: "description",
        content: "Classes, élèves, cours, progression et séances en direct.",
      },
    ],
  }),
  component: ProfesseurPage,
});

function ProfesseurPage() {
  const { organization, membership, user } = Route.useRouteContext();

  return (
    <div style={organizationTheme(organization)}>
      <TeacherWorkspace organization={organization} role={membership.role} userId={user.id} />
    </div>
  );
}
