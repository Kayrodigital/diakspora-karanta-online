import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap } from "lucide-react";
import type { ReactNode } from "react";

export const Route = createFileRoute("/parcours")({
  head: () => ({
    meta: [
      { title: "Choisissez votre parcours — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Porte d'entrée de la démo Diakspora Karanta : découvrez les parcours Enfant, Intermédiaire et Avancé.",
      },
    ],
  }),
  component: ParcoursPage,
});

type Path = {
  to: string;
  label: string;
  title: string;
  description: string;
  visual: ReactNode;
  gradient: string;
};

const paths: Path[] = [
  {
    to: "/eleve",
    label: "Enfant (6-12 ans)",
    title: "Espace enfant",
    description:
      "Lecture arabe, Juzʾ ʿAmma et bases de la religion, dans un parcours adapté et chaleureux.",
    visual: <span aria-hidden="true">🧒🏽</span>,
    gradient: "var(--gradient-parcours-enfant)",
  },
  {
    to: "/intermediaire",
    label: "Intermédiaire",
    title: "Arabe intermédiaire",
    description:
      "Arabe débutant et intermédiaire, grammaire fondamentale et conversation pratique.",
    visual: <BookOpen size={28} aria-hidden="true" />,
    gradient: "var(--gradient-parcours-intermediaire)",
  },
  {
    to: "/avance",
    label: "Avancé",
    title: "Parcours avancé",
    description:
      "Fiqh malikite, nahw et ṣarf, textes classiques et poésie, pour une étude en profondeur.",
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
          <p className="mt-4 text-lg text-muted-foreground">
            Choisissez votre parcours d'apprentissage
          </p>
        </header>

        <nav className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paths.map((p) => (
            <Link
              key={p.to}
              to={p.to}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-border p-8 sm:p-10 transition-all hover:-translate-y-1 hover:shadow-[var(--shadow-elegant)]"
              style={{ background: p.gradient }}
            >
              <div
                aria-hidden
                className="absolute inset-0 bg-[color:var(--anthracite)]/10 opacity-0 transition-opacity group-hover:opacity-100"
              />

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
                <span className="mt-auto pt-6 text-sm font-medium text-[color:var(--gold-soft)] transition-colors group-hover:text-[color:var(--cream)]">
                  Explorer →
                </span>
              </div>
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}
