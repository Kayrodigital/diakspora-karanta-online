import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  description: string;
  sections: string[];
  dir?: "ltr" | "rtl";
  children?: ReactNode;
};

export function DashboardPlaceholder({
  eyebrow,
  title,
  description,
  sections,
  dir = "ltr",
  children,
}: Props) {
  return (
    <div className="min-h-screen bg-background text-foreground" dir={dir}>
      <div className="mx-auto max-w-5xl px-6 py-16">
        <Link
          to="/"
          className="text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"
        >
          ← Diakspora Karanta
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.25em] text-[color:var(--gold)]">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-serif text-4xl sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">{description}</p>

        <div className="mt-12 grid gap-4 sm:grid-cols-2">
          {sections.map((s) => (
            <div key={s} className="rounded-xl border border-border bg-card p-6">
              <div className="mb-3 h-1 w-10 rounded-full bg-[color:var(--gold)]" />
              <p className="font-serif text-lg">{s}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                À venir · maquette en cours
              </p>
            </div>
          ))}
        </div>

        {children}
      </div>
    </div>
  );
}
