import { createFileRoute } from "@tanstack/react-router";
import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/professeur")({
  head: () => ({
    meta: [
      { title: "Espace Professeur — Diakspora Karanta" },
      { name: "description", content: "Gestion des cohortes, sessions Zoom et corrections." },
    ],
  }),
  component: ProfesseurPage,
});

function ProfesseurPage() {
  // NB: prévoir un toggle dir="rtl" pour l'interface arabe.
  // Pour l'instant on démontre le support RTL avec un bloc dédié.
  return (
    <DashboardPlaceholder
      eyebrow="Espace Professeur · الأستاذ"
      title="Enseigner avec structure et bienveillance."
      description="Gérez vos cohortes, animez vos sessions Zoom et corrigez les travaux — interface bilingue français / arabe."
      sections={[
        "Mes cohortes",
        "Sessions Zoom à venir",
        "Corrections & devoirs",
        "Quiz et évaluations",
        "Messagerie (FR ⇄ AR)",
        "Suivi des présences",
      ]}
    >
      <div
        dir="rtl"
        className="mt-10 rounded-xl border border-[color:var(--gold)]/40 bg-card p-6 text-right"
      >
        <p className="font-arabic text-xl text-primary">مرحبًا بك أيها الأستاذ</p>
        <p className="mt-2 text-sm text-muted-foreground">
          واجهة الأستاذ ستدعم اللغة العربية والاتجاه من اليمين إلى اليسار.
        </p>
      </div>
    </DashboardPlaceholder>
  );
}
