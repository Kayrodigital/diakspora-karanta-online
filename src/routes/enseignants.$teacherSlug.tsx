import { createFileRoute } from "@tanstack/react-router";
import { PublicTeachers } from "@/features/teachers/PublicTeachers";
export const Route = createFileRoute("/enseignants/$teacherSlug")({
  ssr: false,
  head: () => ({ meta: [{ title: "Présentation du professeur — Diakspora Karanta" }] }),
  component: TeacherRoute,
});
function TeacherRoute() {
  const { teacherSlug } = Route.useParams();
  return <PublicTeachers teacherSlug={teacherSlug} />;
}
