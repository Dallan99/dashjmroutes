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
}: {
  label: string;
  value: string;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)]">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <Icon className={cn("size-4 shrink-0", toneRing[tone])} />
      </div>
      <p
        className={cn(
          "mt-3 text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl",
          toneRing[tone],
        )}
      >
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
