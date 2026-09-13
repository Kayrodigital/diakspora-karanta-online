import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LearnerProgressDashboard } from "@/features/assessment/LearnerProgressDashboard";
import { BottomNav } from "@/features/eleve/BottomNav";
import { organizationTheme } from "@/lib/organization-theme";

export const Route = createFileRoute("/_authenticated/progression")({
  head: () => ({
    meta: [
      { title: "Ma progression — Diakspora Karanta" },
      { name: "description", content: "Compétences, évaluations et bulletins de l’élève." },
    ],
  }),
  component: ProgressionPage,
});

function ProgressionPage() {
  const { organization } = Route.useRouteContext();
  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-8">
        <Link
          to="/eleve"
          className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="size-4" /> Retour à l’accueil
        </Link>
        <LearnerProgressDashboard organizationId={organization.id} allowSelfAssessment />
      </main>
      <BottomNav active="progress" />
    </div>
  );
}
