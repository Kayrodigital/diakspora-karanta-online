import { createFileRoute, Link } from "@tanstack/react-router";

import { DashboardPlaceholder } from "@/components/DashboardPlaceholder";

export const Route = createFileRoute("/avance")({
  head: () => ({
    meta: [
      { title: "Parcours Avancé — Diakspora Karanta" },
      {
        name: "description",
        content:
          "Fiqh malikite, nahw et ṣarf, textes classiques et poésie. Bientôt disponible sur Diakspora Karanta.",
      },
    ],
  }),
  component: AvancePage,
});

function AvancePage() {
  return (
    <DashboardPlaceholder
      eyebrow="Parcours Avancé"
      title="Études avancées"
      description="Fiqh, sciences de la langue arabe et textes classiques pour une formation en profondeur."
      sections={[
        "Fiqh malikite",
        "Nahw et ṣarf",
        "Textes classiques & poésie",
      ]}
    >
      <div className="mt-10">
        <Link
          to="/parcours"
          className="text-sm font-medium text-primary hover:text-[color:var(--deep-green-hi)]"
        >
          ← Retour aux parcours
        </Link>
      </div>
    </DashboardPlaceholder>
  );
}
