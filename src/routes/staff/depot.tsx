import { createFileRoute, redirect } from "@tanstack/react-router";

import { MajlissDeposit } from "@/features/majliss/MajlissDeposit";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/staff/depot")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth", search: { portal: "teacher" } });
  },
  head: () => ({
    meta: [
      { title: "Dépôt Majliss — Diakspora Karanta" },
      { name: "description", content: "Envoyer un enregistrement au Majliss." },
    ],
  }),
  component: MajlissDeposit,
});
