import { createFileRoute } from "@tanstack/react-router";
import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/eleve")({
  head: () => ({
    meta: [
      { title: "Espace Élève — Diakspora Karanta" },
      { name: "description", content: "Cours, quiz et suivi de progression pour l'élève." },
    ],
  }),
  component: ElevePage,
});

function ElevePage() {
  return (
    <DashboardPlaceholder
      eyebrow="Espace Élève"
      title="Apprendre, réviser, progresser."
      description="Tes cours, tes quiz, tes révisions espacées et ton parcours d'apprentissage seront disponibles ici."
      sections={[
        "Mes cours du jour",
        "Quiz & évaluations",
        "Révisions espacées",
        "Écritures & devoirs (photo / audio)",
        "Ma progression",
        "Mes certificats",
      ]}
    />
  );
}
