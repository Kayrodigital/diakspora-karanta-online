import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { loadPortalAccess } from "@/lib/auth/portal-access";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const familyAccess = await loadPortalAccess("family", "learner");
    if (familyAccess) return familyAccess;

    const adminPreview = await loadPortalAccess("admin");
    if (adminPreview) return adminPreview;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    throw redirect({
      to: "/auth",
      search: { portal: "family", target: "learner", denied: Boolean(user) },
    });
  },
  component: () => <Outlet />,
});
