import { createFileRoute } from "@tanstack/react-router";
import { PublicTeachers } from "@/features/teachers/PublicTeachers";
export const Route = createFileRoute("/enseignants/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Nos professeurs — Diakspora Karanta" },
      {
        name: "description",
        content: "Découvrez les professeurs et leurs enseignements publiés sur Karanta.",
      },
    ],
  }),
  component: PublicTeachers,
});
