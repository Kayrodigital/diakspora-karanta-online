import type { ReactNode } from "react";

type Props = {
  label: string;
  value: ReactNode;
  icon?: ReactNode;
};

export function WeeklyStatCard({ label, value, icon }: Props) {
  return (
    <div className="rounded-2xl border border-[color:var(--cream-2)] bg-card p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center gap-2 text-[color:var(--gold-dark)]">
        {icon}
        <p className="text-[10px] font-bold uppercase tracking-[0.18em]">
          {label}
        </p>
      </div>
      <p className="mt-2 font-serif text-2xl leading-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
