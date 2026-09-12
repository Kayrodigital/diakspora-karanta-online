import { BookOpen, Home, Radio, User, type LucideIcon } from "lucide-react";

type Item = {
  key: "home" | "courses" | "live" | "profile";
  label: string;
  icon: LucideIcon;
  href: string;
};

const items: Item[] = [
  { key: "home", label: "Accueil", icon: Home, href: "/eleve" },
  { key: "courses", label: "Cours", icon: BookOpen, href: "/eleve#courses" },
  { key: "live", label: "Directs", icon: Radio, href: "/eleve#directs" },
  { key: "profile", label: "Profil", icon: User, href: "/eleve#profil" },
];

export function BottomNav({ active = "home" }: { active?: Item["key"] }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--cream-2)] bg-[color:var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--cream)]/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.key;
          return (
            <li key={item.key}>
              <a
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-14 w-full flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition ${
                  isActive ? "text-[color:var(--deep-green)]" : "text-muted-foreground"
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.4 : 2} aria-hidden />
                <span>{item.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
