import { createFileRoute } from "@tanstack/react-router";

import { TeacherPage } from "@/features/majliss/MajlissUi";

export const Route = createFileRoute("/majliss/$villageSlug/$teacherSlug")({
  component: TeacherRoute,
});

function TeacherRoute() {
  const { villageSlug, teacherSlug } = Route.useParams();
  return <TeacherPage villageSlug={villageSlug} teacherSlug={teacherSlug} />;
}
