import { createFileRoute, Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  component: Home,
});

const spaces = [
  {
    to: "/eleve",
    label: "Espace Élève",
    desc: "Cours, quiz, révisions et suivi de progression.",
  },
  {
    to: "/parent",
    label: "Espace Parent",
    desc: "Suivi de régularité, alertes et communication avec les professeurs.",
  },
  {
    to: "/professeur",
    label: "Espace Professeur",
    desc: "Cohortes, sessions Zoom, corrections — interface bilingue FR / العربية.",
  },
  {
    to: "/admin",
    label: "Espace Admin",
    desc: "Gestion des utilisateurs, cohortes, certificats et contenus.",
  },
] as const;

function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <header
        className="relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-hero)" }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, var(--gold) 0, transparent 40%), radial-gradient(circle at 80% 90%, var(--gold-soft) 0, transparent 45%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6 py-24 sm:py-32 text-center">
          <p className="mb-6 inline-block rounded-full border border-[color:var(--gold)]/40 px-4 py-1 text-xs uppercase tracking-[0.25em] text-[color:var(--gold-soft)]">
            Académie en ligne · Diaspora francophone
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold text-[color:var(--cream)]">
            Diakspora <span className="text-[color:var(--gold)]">Karanta</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-[color:var(--cream)]/85">
            Bienvenue. Nous transmettons la langue arabe et les sciences islamiques
            à vos enfants et à toute la famille, dans un cadre chaleureux, structuré
            et pensé pour la vie moderne de la diaspora.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <span className="rounded-full bg-[color:var(--cream)]/10 px-4 py-2 text-sm text-[color:var(--cream)]/90 backdrop-blur">
              Enfants 6–12 ans
            </span>
            <span className="rounded-full bg-[color:var(--cream)]/10 px-4 py-2 text-sm text-[color:var(--cream)]/90 backdrop-blur">
              Adultes débutants
            </span>
            <span className="rounded-full bg-[color:var(--cream)]/10 px-4 py-2 text-sm text-[color:var(--cream)]/90 backdrop-blur">
              Niveau avancé
            </span>
          </div>
        </div>
      </header>

      {/* Espaces */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">
            Un espace dédié pour chacun
          </h2>
          <p className="mt-3 text-muted-foreground">
            La plateforme est en construction — voici les univers qui ouvriront bientôt.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {spaces.map((s) => (
            <Link
              key={s.to}
              to={s.to}
              className="group relative flex flex-col rounded-2xl border border-border bg-card p-8 transition-all hover:-translate-y-1 hover:border-[color:var(--gold)] hover:shadow-[var(--shadow-elegant)]"
            >
              <span
                aria-hidden
                className="absolute right-6 top-6 h-2 w-2 rounded-full bg-[color:var(--gold)] opacity-70 transition group-hover:scale-150"
              />
              <h3 className="font-serif text-2xl text-foreground">{s.label}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              <span className="mt-6 text-sm font-medium text-primary group-hover:text-[color:var(--deep-green-hi)]">
                Entrer →
              </span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <span className="font-serif text-sm">Diakspora Karanta</span> · بسم الله
      </footer>
    </div>
  );
}
