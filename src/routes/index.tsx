import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ShoppingBag } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
});

const spaces = [
  {
    portal: "family",
    label: "Familles & élèves",
    desc: "Cours, directs, devoirs et suivi de tous les enfants depuis une entrée commune.",
  },
  {
    portal: "teacher",
    label: "Professeurs",
    desc: "Classes, séances Zoom ou Meet, contenus, archives, présences et corrections.",
  },
  {
    portal: "admin",
    label: "Administration",
    desc: "Inscriptions, utilisateurs, rôles, classes, publication et configuration de l’école.",
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
            École numérique · Mobile, tablette et ordinateur
          </p>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-semibold text-[color:var(--cream)]">
            Diakspora <span className="text-[color:var(--gold)]">Karanta</span>
          </h1>
          <p className="mt-6 mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed text-[color:var(--cream)]/85">
            Les cours en direct, audios, vidéos, livres, exercices et replays sont enfin organisés
            dans un seul espace, accessible à toute la famille.
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
          <Link
            to="/boutique"
            className="mx-auto mt-8 flex min-h-12 w-fit items-center gap-2 rounded-2xl bg-[color:var(--gold)] px-6 font-semibold text-[color:var(--anthracite)] shadow-[var(--shadow-gold)] transition hover:brightness-105"
          >
            <ShoppingBag className="size-4" /> Découvrir la librairie
          </Link>
        </div>
      </header>

      {/* Espaces */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mb-12 text-center">
          <h2 className="font-serif text-3xl sm:text-4xl text-foreground">Choisir votre espace</h2>
          <p className="mt-3 text-muted-foreground">
            Une seule connexion, puis Karanta affiche les fonctions autorisées pour votre rôle.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {spaces.map((s) => (
            <Link
              key={s.portal}
              to="/auth"
              search={{ portal: s.portal }}
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

      <section className="border-y border-border bg-card/60">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 py-12 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-start gap-4">
            <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
              <BookOpen className="size-6" />
            </div>
            <div>
              <h2 className="font-serif text-2xl font-semibold">
                Les livres des cours, au même endroit
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Commandez les ouvrages recommandés par vos professeurs, avec livraison en France.
              </p>
            </div>
          </div>
          <ButtonLink />
        </div>
      </section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        <span className="font-serif text-sm">Diakspora Karanta</span> · بسم الله
      </footer>
    </div>
  );
}

function ButtonLink() {
  return (
    <Link
      to="/boutique"
      className="flex min-h-11 items-center justify-center rounded-xl border border-primary px-5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
    >
      Voir les livres
    </Link>
  );
}
