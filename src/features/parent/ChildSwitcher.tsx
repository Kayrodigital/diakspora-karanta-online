import { ChevronDown } from "lucide-react";
import type { Child } from "./mock-data";

type Props = {
  children: Child[];
  activeChildId: string;
  onChange?: (id: string) => void;
};

/**
 * Child selector — shows a single avatar+name when there's only one child,
 * or a clickable pill with a chevron when multiple children are registered.
 */
export function ChildSwitcher({ children, activeChildId, onChange }: Props) {
  const active = children.find((c) => c.id === activeChildId) ?? children[0];
  const hasMultiple = children.length > 1;

  return (
    <button
      type="button"
      onClick={() => {
        if (hasMultiple && onChange) {
          const next = children.find((c) => c.id !== active.id);
          if (next) onChange(next.id);
        }
      }}
      disabled={!hasMultiple}
      className="flex items-center gap-2 rounded-full border border-[color:var(--cream-2)] bg-card py-1.5 pl-1.5 pr-3 text-left shadow-[var(--shadow-card)] transition disabled:cursor-default"
      aria-label={
        hasMultiple ? `Enfant actif : ${active.firstName}. Changer d'enfant.` : `Enfant : ${active.firstName}`
      }
    >
      <span
        aria-hidden
        className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-[color:var(--anthracite)]"
        style={{ background: "var(--gradient-gold)" }}
      >
        {active.firstName.charAt(0).toUpperCase()}
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
          Enfant
        </span>
        <span className="text-sm font-semibold text-foreground">
          {active.firstName}
        </span>
      </span>
      {hasMultiple && (
        <ChevronDown size={16} className="text-muted-foreground" aria-hidden />
      )}
    </button>
  );
}
