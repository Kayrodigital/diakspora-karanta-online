import { createFileRoute, redirect } from "@tanstack/react-router";
import { PlanningWorkspace } from "@/features/planning/PlanningWorkspace";
import { loadPortalAccess } from "@/lib/auth/portal-access";

export const Route = createFileRoute("/planning")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("planning");
    if (!access) throw redirect({ to: "/auth", search: { portal: "teacher" } });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Classes et planning — Diakspora Karanta" },
      { name: "description", content: "Organisez les classes, les séances et les présences." },
    ],
  }),
  component: PlanningPage,
});

function PlanningPage() {
  const { organization, membership, user } = Route.useRouteContext();
  return <PlanningWorkspace organization={organization} role={membership.role} userId={user.id} />;
}
