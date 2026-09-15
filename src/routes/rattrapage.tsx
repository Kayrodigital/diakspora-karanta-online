import { createFileRoute, redirect } from "@tanstack/react-router";
import { loadPortalAccess } from "@/lib/auth/portal-access";

export const Route = createFileRoute("/rattrapage")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("family");
    if (!access) throw redirect({ to: "/auth", search: { portal: "family" } });
    throw redirect({ to: access.membership.role === "parent" ? "/parent" : "/eleve" });
  },
});
