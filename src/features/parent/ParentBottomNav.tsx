import { Home, Users, CreditCard, User, type LucideIcon } from "lucide-react";

type Item = {
  key: string;
  label: string;
  icon: LucideIcon;
  active?: boolean;
};

const items: Item[] = [
  { key: "home",     label: "Accueil",    icon: Home, active: true },
  { key: "children", label: "Mes enfants", icon: Users },
  { key: "billing",  label: "Paiement",   icon: CreditCard },
  { key: "profile",  label: "Profil",     icon: User },
];

export function ParentBottomNav() {
  return (
    <nav
      aria-label="Navigation parent"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--cream-2)] bg-[color:var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--cream)]/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.key}>
              <button
                type="button"
                aria-current={it.active ? "page" : undefined}
                className={`flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  it.active
                    ? "text-[color:var(--deep-green)]"
                    : "text-muted-foreground"
                }`}
              >
                <Icon size={20} strokeWidth={it.active ? 2.4 : 2} aria-hidden />
                <span>{it.label}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
