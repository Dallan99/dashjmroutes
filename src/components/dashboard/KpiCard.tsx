import type { LucideIcon } from "lucide-react";
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
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] transition-all duration-200",
        onClick &&
          "cursor-pointer hover:border-primary/50 hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.99]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-4 shrink-0", toneRing[tone])} />
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-extrabold tabular-nums tracking-tight sm:text-3xl",
          toneRing[tone],
        )}
      >
        {value}
      </p>
      {hint ? (
        <div className="mt-1.5 flex items-center justify-between text-sm font-semibold text-muted-foreground">
          <span>{hint}</span>
          {onClick ? (
            <span className="text-xs font-bold text-primary underline underline-offset-2">
              Detalhar
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
