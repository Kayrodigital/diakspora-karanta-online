import { Outlet, createFileRoute } from "@tanstack/react-router";

import { MajlissLayout } from "@/features/majliss/MajlissUi";

export const Route = createFileRoute("/majliss")({
  head: () => ({
    meta: [
      { title: "Majliss — Diakspora Karanta" },
      {
        name: "description",
        content: "Écoutez les enseignements Majliss par village et professeur.",
      },
    ],
  }),
  component: MajlissRoute,
});

function MajlissRoute() {
  return (
    <MajlissLayout>
      <Outlet />
    </MajlissLayout>
  );
}
