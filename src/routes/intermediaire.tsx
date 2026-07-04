import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/intermediaire")({
  head: () => ({
    meta: [
      { title: "Parcours Intermédiaire — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Arabe débutant/intermédiaire, grammaire et conversation. Bientôt disponible sur Diakspora Karanta.",
      },
    ],
  }),
  component: IntermediairePage,
});

function IntermediairePage() {
  return (
    <DashboardPlaceholder
      eyebrow="Parcours Intermédiaire"
      title="Arabe débutant & intermédiaire"
      description="Grammaire, conversation et compréhension progressive pour aller plus loin en douceur."
      sections={[
        "Grammaire structurée",
        "Conversation du quotidien",
        "Lecture guidée",
      ]}
    >
      <div className="mt-10">
        <Link
          to="/parcours"
          className="text-sm font-medium text-primary hover:text-[color:var(--deep-green-hi)]"
        >
          ← Retour aux parcours
        </Link>
      </div>
    </DashboardPlaceholder>
  );
}
