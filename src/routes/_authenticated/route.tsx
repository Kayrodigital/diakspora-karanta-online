import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadPortalAccess } from "@/lib/auth/portal-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const familyAccess = await loadPortalAccess("family");
    if (familyAccess?.membership.role === "learner") return familyAccess;

    const adminPreview = await loadPortalAccess("admin");
    if (adminPreview) return adminPreview;

    if (familyAccess?.membership.role === "parent") throw redirect({ to: "/parent" });
    throw redirect({ to: "/auth", search: { portal: "family" } });
  },
  component: () => <Outlet />,
});
