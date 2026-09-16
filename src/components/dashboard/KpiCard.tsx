import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "loss" | "gain" | "highlight";

const toneRing: Record<Tone, string> = {
  neutral: "text-foreground",
  loss: "text-destructive",
  gain: "text-success",
  highlight: "text-primary",
};

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  onClick,
  valueClassName,
}: {
  label: string;
  value: string;
  hint?: ReactNode;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
  valueClassName?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-full min-h-[172px] w-full flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-[var(--shadow-panel)] transition-all duration-200",
        onClick &&
          "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold uppercase leading-4 tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-4 shrink-0", toneRing[tone])} />
      </div>
      <p
        className={cn(
          "mt-2 text-[1.55rem] font-extrabold leading-tight tabular-nums tracking-tight sm:text-[1.75rem]",
          toneRing[tone],
          valueClassName,
        )}
      >
        {value}
      </p>
      {hint ? (
        <div className="mt-auto grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 pt-2 text-xs font-semibold leading-4 text-muted-foreground">
          <span className="min-w-0">{hint}</span>
          {onClick ? (
            <span className="shrink-0 text-[11px] font-bold text-primary underline underline-offset-2">
              Detalhar
            </span>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}
