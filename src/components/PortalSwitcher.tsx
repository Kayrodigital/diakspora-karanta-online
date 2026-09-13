import { Link } from "@tanstack/react-router";
import { BookOpen, GraduationCap, ShieldCheck } from "lucide-react";
import type { OrganizationRole } from "@/lib/auth/portal-access";

type Props = {
  current: "admin" | "teacher" | "learner";
  role: OrganizationRole;
};

const previewRoles = new Set<OrganizationRole>(["owner", "admin", "technician"]);

const portals = [
  { key: "admin", label: "Administrateur", to: "/admin", icon: ShieldCheck },
  { key: "teacher", label: "Professeur", to: "/professeur", icon: GraduationCap },
  { key: "learner", label: "Élève", to: "/eleve", icon: BookOpen },
] as const;

export function PortalSwitcher({ current, role }: Props) {
  if (!previewRoles.has(role)) return null;

  return (
    <nav
      aria-label="Changer de perspective"
      className="flex w-fit items-center gap-1 rounded-xl border border-border/70 bg-background/90 p-1 shadow-sm"
    >
      {portals.map((portal) => {
        const Icon = portal.icon;
        const active = portal.key === current;
        return (
          <Link
            key={portal.key}
            to={portal.to}
            aria-current={active ? "page" : undefined}
            title={`Voir comme ${portal.label.toLowerCase()}`}
            className={`flex min-h-9 items-center gap-2 rounded-lg px-2.5 text-xs font-semibold transition sm:px-3 ${
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden />
            <span className="hidden md:inline">{portal.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
