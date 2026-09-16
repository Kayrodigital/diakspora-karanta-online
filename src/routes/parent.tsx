import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { BookOpenCheck, LogOut, ShieldCheck } from "lucide-react";
import { LearnerProgressDashboard } from "@/features/assessment/LearnerProgressDashboard";
import { supabase } from "@/integrations/supabase/client";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";
import { FamilySchedule } from "@/features/planning/FamilySchedule";

export const Route = createFileRoute("/parent")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("family");
    if (!access) throw redirect({ to: "/auth", search: { portal: "family" } });
    if (access.membership.role !== "parent") throw redirect({ to: "/eleve" });
    return access;
  },
  head: () => ({
    meta: [
      { title: "Espace Parent — Diakspora Karanta" },
      {
        name: "description",
        content: "Suivez les évaluations et la progression pédagogique de vos enfants.",
      },
    ],
  }),
  component: ParentPage,
});

function ParentPage() {
  const navigate = useNavigate();
  const { organization, user } = Route.useRouteContext();
  const displayName =
    typeof user.user_metadata.full_name === "string" && user.user_metadata.full_name.trim()
      ? user.user_metadata.full_name.trim().split(" ")[0]
      : "Parent";

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { portal: "family" }, replace: true });
  }

  return (
    <div
      className="min-h-screen bg-[color:var(--cream)] text-foreground"
      style={organizationTheme(organization)}
    >
      <main className="mx-auto w-full max-w-5xl px-5 pb-16 pt-6 md:px-8 md:pt-10">
        <header className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <Link
              to="/"
              className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground hover:text-primary"
            >
              ← Diakspora Karanta
            </Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[color:var(--gold-dark)]">
              Espace parent
            </p>
            <h1 className="mt-2 font-serif text-3xl leading-tight text-foreground md:text-4xl">
              As-salāmu ʿalaykum, {displayName}
            </h1>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[color:var(--cream-2)] bg-card px-4 text-sm font-semibold text-foreground shadow-sm hover:border-primary/30"
          >
            <LogOut className="size-4" aria-hidden />
            <span className="hidden sm:inline">Se déconnecter</span>
          </button>
        </header>

        <section className="mt-8 grid gap-4 md:grid-cols-2" aria-label="Informations du suivi">
          <article className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <BookOpenCheck className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">Des résultats réellement publiés</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Les évaluations, compétences et bulletins ci-dessous proviennent directement du
                  suivi pédagogique de votre organisation.
                </p>
              </div>
            </div>
          </article>
          <article className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-start gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" aria-hidden />
              </span>
              <div>
                <h2 className="font-semibold">Un espace sans données simulées</h2>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Si aucune information n’est encore disponible, un état vide est affiché jusqu’à la
                  publication par l’équipe pédagogique.
                </p>
              </div>
            </div>
          </article>
        </section>

        <section className="mt-10" aria-labelledby="progress-title">
          <h2 id="progress-title" className="sr-only">
            Progression de mes enfants
          </h2>
          <LearnerProgressDashboard organizationId={organization.id} />
        </section>
        <FamilySchedule organizationId={organization.id} userId={user.id} />
      </main>
    </div>
  );
}
