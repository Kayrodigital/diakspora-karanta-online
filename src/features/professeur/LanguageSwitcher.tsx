import { Languages } from "lucide-react";
import { LANG_META, type Lang } from "./i18n";

type Props = {
  lang: Lang;
  onChange: (lang: Lang) => void;
};

const ORDER: Lang[] = ["ar", "fr", "en"];

export function LanguageSwitcher({ lang, onChange }: Props) {
  return (
    <div
      role="group"
      aria-label="Language"
      className="inline-flex items-center gap-1 rounded-full border border-[color:var(--cream-2)] bg-card p-1 shadow-[var(--shadow-card)]"
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center text-[color:var(--gold-dark)]"
      >
        <Languages size={16} />
      </span>
      {ORDER.map((l) => {
        const active = l === lang;
        return (
          <button
            key={l}
            type="button"
            onClick={() => onChange(l)}
            aria-pressed={active}
            className={`min-h-[36px] rounded-full px-3 text-sm font-semibold transition ${
              active
                ? "bg-[color:var(--deep-green)] text-[color:var(--cream)]"
                : "text-foreground hover:bg-[color:var(--cream-2)]"
            }`}
            style={l === "ar" ? { fontFamily: "var(--font-arabic)" } : undefined}
          >
            {LANG_META[l].label}
          </button>
        );
      })}
    </div>
  );
}
