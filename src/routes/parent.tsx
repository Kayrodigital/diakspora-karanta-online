import { createFileRoute } from "@tanstack/react-router";
import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/parent")({
  head: () => ({
    meta: [
      { title: "Espace Parent — Diakspora Karanta" },
      { name: "description", content: "Suivi de régularité, alertes et communication professeurs." },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Espace Parent"
      title="Accompagner sereinement votre enfant."
      description="Suivez la régularité, la progression et échangez avec les professeurs de votre enfant."
      sections={[
        "Enfants inscrits",
        "Score de régularité",
        "Alertes & plans de rattrapage",
        "Messagerie professeurs (FR / AR)",
        "Présence aux sessions Zoom",
        "Certificats obtenus",
      ]}
    />
  );
}
