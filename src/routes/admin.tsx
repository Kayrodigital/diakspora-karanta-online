import { createFileRoute } from "@tanstack/react-router";
import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Espace Admin — Diakspora Karanta" },
      { name: "description", content: "Administration de la plateforme." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <DashboardPlaceholder
      eyebrow="Espace Admin"
      title="Piloter l'académie."
      description="Gestion des utilisateurs, cohortes, contenus pédagogiques et certificats."
      sections={[
        "Utilisateurs & rôles",
        "Cohortes & professeurs",
        "Cours, modules & leçons",
        "Quiz & évaluations",
        "Certificats délivrés",
        "Alertes système",
      ]}
    />
  );
}
