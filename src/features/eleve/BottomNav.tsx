import { BookOpen, Home, MessageCircle, Mic, Radio, type LucideIcon } from "lucide-react";

type Item = {
  key: "home" | "courses" | "live" | "homework" | "messages";
  label: string;
  icon: LucideIcon;
  href: string;
};

const items: Item[] = [
  { key: "home", label: "Accueil", icon: Home, href: "/eleve" },
  { key: "courses", label: "Cours", icon: BookOpen, href: "/eleve#courses" },
  { key: "live", label: "Directs", icon: Radio, href: "/eleve#directs" },
  { key: "homework", label: "Devoir", icon: Mic, href: "/devoir" },
  { key: "messages", label: "Messages", icon: MessageCircle, href: "/messages" },
];

export function BottomNav({ active = "home" }: { active?: Item["key"] }) {
  return (
    <nav
      aria-label="Navigation principale"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-[color:var(--cream-2)] bg-[color:var(--cream)]/95 backdrop-blur supports-[backdrop-filter]:bg-[color:var(--cream)]/80"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
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
