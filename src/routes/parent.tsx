import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { LearnerProgressDashboard } from "@/features/assessment/LearnerProgressDashboard";
import { supabase } from "@/integrations/supabase/client";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { organizationTheme } from "@/lib/organization-theme";
import { FamilySchedule } from "@/features/planning/FamilySchedule";
import { ActiveProfileSwitcher } from "@/components/ActiveProfileSwitcher";
import { FamilyOnboarding } from "@/features/family/FamilyOnboarding";
import { LearningProgressOverview } from "@/features/learning/LearningProgressOverview";

export const Route = createFileRoute("/parent")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("family", "parent");
    if (!access) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      throw redirect({
        to: "/auth",
        search: { portal: "family", target: "parent", denied: Boolean(user) },
      });
    }
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
  const { organization, user, ownProfile, accessibleProfiles, activeProfileId } =
    Route.useRouteContext();
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

        <div className="mt-5 flex justify-end">
          <ActiveProfileSwitcher
            organizationId={organization.id}
            profiles={accessibleProfiles}
            activeProfileId={activeProfileId}
          />
        </div>

        <FamilyOnboarding
          organization={organization}
          ownProfileId={ownProfile.id}
          profiles={accessibleProfiles}
          activeProfileId={activeProfileId}
        />

        <section className="mt-10" aria-labelledby="progress-title">
          <h2 id="progress-title" className="sr-only">
            Progression de mes enfants
          </h2>
          <LearnerProgressDashboard
            key={activeProfileId}
            organizationId={organization.id}
            activeProfileId={activeProfileId}
          />
        </section>
        <div className="mt-8">
          <LearningProgressOverview
            profileId={activeProfileId}
            title="Parcours d’apprentissage de l’enfant"
          />
        </div>
        <FamilySchedule organizationId={organization.id} userId={user.id} />
      </main>
    </div>
  );
}
