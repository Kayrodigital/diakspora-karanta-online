import { ChevronRight } from "lucide-react";
import type { TeacherAction } from "./mock-data";
import { makeT, type Lang } from "./i18n";

type Props = {
  action: TeacherAction;
  lang: Lang;
};

export function ActionCard({ action, lang }: Props) {
  const t = makeT(lang);
  const isRtl = lang === "ar";

  return (
    <article
      className="rounded-2xl border-2 p-4 shadow-[var(--shadow-card)]"
      style={{
        background: "color-mix(in oklab, var(--gold) 12%, var(--cream))",
        borderColor: "color-mix(in oklab, var(--gold-dark) 45%, transparent)",
      }}
    >
      <p
        className={`font-semibold leading-snug text-foreground ${
          isRtl ? "text-right text-lg" : "text-base"
        }`}
        style={isRtl ? { fontFamily: "var(--font-arabic)" } : undefined}
      >
        {t(action.titleKey, { count: action.count })}
      </p>
      <button
        type="button"
        className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--deep-green)] px-4 font-bold text-[color:var(--cream)] shadow-[var(--shadow-card)] transition active:scale-[0.98] hover:bg-[color:var(--deep-green-hi)]"
        style={isRtl ? { fontFamily: "var(--font-arabic)", fontSize: "1rem" } : undefined}
      >
        <span>{t(action.ctaKey)}</span>
        <ChevronRight
          size={18}
          aria-hidden
          className={isRtl ? "rotate-180" : ""}
        />
      </button>
    </article>
  );
}
