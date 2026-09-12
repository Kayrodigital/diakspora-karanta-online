import { createFileRoute, redirect } from "@tanstack/react-router";
import { CourseEditor } from "@/features/admin/CourseEditor";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/cours/$courseId")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("admin");
    if (!access) throw redirect({ to: "/auth", search: { portal: "admin" } });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Éditeur de cours — Diakspora Karanta" },
      { name: "description", content: "Structure et publication d'un cours Karanta." },
    ],
  }),
  component: CourseEditorPage,
});

function CourseEditorPage() {
  const { courseId } = Route.useParams();
  const { organization, user } = Route.useRouteContext();
  return (
    <div style={organizationTheme(organization)}>
      <CourseEditor courseId={courseId} organization={organization} userId={user.id} />
    </div>
  );
}
