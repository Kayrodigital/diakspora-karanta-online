import { createFileRoute, Link } from "@tanstack/react-router";
import { Baby, GraduationCap, UsersRound } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/parcours")({
  head: () => ({
    meta: [
      { title: "Choisissez votre parcours — Diakspora Karanta" },
      {
        name: "description",
        content: "Découvrez les parcours Karanta pour les enfants, les adolescents et les adultes.",
      },
    ],
  }),
  component: ParcoursPage,
});

type Path = {
  label: string;
  title: string;
  description: string;
  organization: string;
  visual: ReactNode;
  gradient: string;
};

const paths: Path[] = [
  {
    label: "Enfants · 6 à 13 ans",
    title: "Premiers apprentissages",
    description:
      "Lecture arabe, Juzʾ ʿAmma et bases de la religion, dans un parcours adapté et chaleureux.",
    organization: "Classes mixtes, organisées par âge et par niveau.",
    visual: <Baby size={28} aria-hidden="true" />,
    gradient: "var(--gradient-parcours-enfant)",
  },
  {
    label: "Adolescents · 14 à 17 ans",
    title: "Consolider et progresser",
    description:
      "Arabe, Coran et sciences islamiques dans un cadre adapté à l’autonomie progressive.",
    organization: "Groupes filles et groupes garçons distincts.",
    visual: <UsersRound size={28} aria-hidden="true" />,
    gradient: "var(--gradient-parcours-intermediaire)",
  },
  {
    label: "Adultes · 18 ans et plus",
    title: "Apprendre à son niveau",
    description:
      "De l’alphabétisation aux textes avancés, avec des créneaux adaptés et un suivi enseignant.",
    organization: "Groupes femmes et groupes hommes distincts.",
    visual: <GraduationCap size={28} aria-hidden="true" />,
    gradient: "var(--gradient-parcours-avance)",
  },
];

function ParcoursPage() {
  return (
    <div className="min-h-screen bg-[color:var(--cream)] text-foreground">
      <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          ← Diakspora Karanta
        </Link>

        <header className="mt-10 text-center">
          <p className="text-xs uppercase tracking-[0.25em] text-[color:var(--gold-dark)]">
            Académie en ligne · Diaspora francophone
          </p>
          <h1 className="mt-4 font-serif text-4xl font-semibold sm:text-6xl text-[color:var(--anthracite)]">
            Diakspora <span className="text-[color:var(--gold)]">Karanta</span>
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">Découvrez l’organisation des classes</p>
        </header>

        <section
          className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
          aria-label="Publics accueillis"
        >
          {paths.map((p) => (
            <article
              key={p.label}
              className="relative flex flex-col overflow-hidden rounded-2xl border border-border p-8 shadow-[var(--shadow-card)] sm:p-10"
              style={{ background: p.gradient }}
            >
              <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--cream)]/30 bg-[color:var(--cream)]/15 text-[color:var(--cream)] backdrop-blur-sm">
                {p.visual}
              </div>

              <div className="relative z-10 mt-6 flex flex-1 flex-col">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--gold-soft)]">
                  {p.label}
                </p>
                <h2 className="mt-1 font-serif text-3xl font-semibold text-[color:var(--cream)]">
                  {p.title}
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-[color:var(--cream)]/85">
                  {p.description}
                </p>
                <p className="mt-auto border-t border-white/20 pt-6 text-sm font-semibold text-[color:var(--gold-soft)]">
                  {p.organization}
                </p>
              </div>
            </article>
          ))}
        </section>

        <section className="mx-auto mt-12 max-w-2xl rounded-2xl border border-border bg-card p-6 text-center shadow-[var(--shadow-card)] sm:p-8">
          <h2 className="font-serif text-2xl text-[color:var(--anthracite)]">
            Déjà inscrit à une cohorte ?
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Connectez-vous pour retrouver vos cours, vos directs et votre progression.
          </p>
          <Link
            to="/auth"
            search={{ portal: "family" }}
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-[color:var(--deep-green)] px-6 font-semibold text-[color:var(--cream)]"
          >
            Accéder à mon espace
          </Link>
        </section>
      </div>
    </div>
  );
}
