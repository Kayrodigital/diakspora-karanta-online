import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadPortalAccess } from "@/lib/auth/portal-access";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const access = await loadPortalAccess("family");
    if (!access) throw redirect({ to: "/auth", search: { portal: "family" } });
    if (access.membership.role !== "learner") throw redirect({ to: "/parent" });
    return access;
  },
  component: () => <Outlet />,
});
