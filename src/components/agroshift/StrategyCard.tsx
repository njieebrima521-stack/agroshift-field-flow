import { Link } from "@tanstack/react-router";
import { ArrowDown, ArrowRight, Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { monthRangeLabel } from "@/lib/agroshift/months";
import { isLowConfidence, type LabelledStrategy } from "@/lib/agroshift/strategies";
import { cn } from "@/lib/utils";

import { SequenceBar } from "./SequenceBar";

export const BASELINE_MESSAGE = "This is what you do now. It is the reference point, not a recommendation.";

export function strategyHeaderClass(l: LabelledStrategy): string {
  if (l.strategy.blocked) return "bg-blocked-soft text-blocked border-b border-blocked/20";
  if (l.role === "baseline") return "bg-secondary text-foreground border-b border-border";
  return l.short === "A" ? "bg-primary text-primary-foreground" : "bg-highlight text-highlight-foreground";
}

export function ConfidenceBadge({ value }: { value: number | null }) {
  const { state } = useSession();
  const max = state.analysis?.strategies.confidence_scale_max ?? null;
  if (value === null) {
    return <span className="text-sm font-medium text-warning-foreground">Confidence not supplied</span>;
  }
  const low = value < 3;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-sm font-semibold",
        low ? "border-warning bg-warning-soft text-warning-foreground" : "border-primary/30 bg-primary-soft text-primary-strong",
      )}
    >
      Confidence {Number.isInteger(value) ? value : value.toFixed(1)}
      {max !== null && ` of ${max}`}
      {low && <span className="font-normal">· low</span>}
    </span>
  );
}

export function StrategyCard({ item, zeroBased }: { item: LabelledStrategy; zeroBased: boolean }) {
  const s = item.strategy;
  const isBaseline = item.role === "baseline";
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-card",
        s.blocked ? "border-blocked/40 blocked-hatch" : isBaseline ? "border-foreground/25 border-dashed" : "border-border",
      )}
      aria-label={`${item.label}: ${s.name}`}
    >
      <header className={cn("px-5 py-4", strategyHeaderClass(item))}>
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-2xl font-bold">{item.label}</h2>
          <span
            className={cn(
              "rounded-md px-2 py-0.5 text-sm font-semibold",
              isBaseline ? "border border-foreground/40 bg-background" : "bg-background/90 text-foreground",
            )}
          >
            {isBaseline ? "Reference · what you do now" : "Alternative"}
          </span>
          {s.blocked && (
            <span className="inline-flex items-center gap-1 rounded-md bg-blocked px-2 py-0.5 text-sm font-semibold text-primary-foreground">
              <Lock className="size-3.5" aria-hidden /> Blocked
            </span>
          )}
        </div>
        <p className="mt-1 text-base font-medium opacity-95">{s.name}</p>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-5">
        {isBaseline && (
          <p className="rounded-lg border border-border bg-surface p-3 text-base font-medium">{BASELINE_MESSAGE}</p>
        )}
        {s.blocked && (
          <div className="rounded-lg border border-blocked/30 bg-blocked-soft p-3 text-base" role="note">
            <p className="font-semibold text-blocked">Blocked by your limits</p>
            <p className="mt-1">{s.blocked_reason ?? "The analysis marked this option as blocked but did not give a reason."}</p>
          </div>
        )}

        <ol className="space-y-1" aria-label="Crop sequence">
          {s.sequence.map((seq, i) => (
            <li key={`${seq.crop}-${i}`}>
              {i > 0 && <ArrowDown className="mx-auto my-0.5 size-4 text-primary" aria-hidden />}
              <p className="text-center text-base">
                <span className="font-semibold">{seq.crop}</span>{" "}
                <span className="text-muted-foreground">({monthRangeLabel(seq, zeroBased)})</span>
              </p>
            </li>
          ))}
        </ol>

        <SequenceBar sequence={s.sequence} zeroBased={zeroBased} showLegend={false} compact />

        <div className="flex flex-wrap items-center gap-2">
          {s.score !== null && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-sm font-semibold">
              Score {Number.isInteger(s.score) ? s.score : s.score.toFixed(2)}
            </span>
          )}
          <ConfidenceBadge value={s.confidence} />
        </div>

        <p className="line-clamp-4 text-base text-foreground/85">
          {s.why ?? <span className="text-warning-foreground">No explanation was returned for this strategy.</span>}
        </p>
        {isLowConfidence(s) && (
          <p className="text-sm font-medium text-warning-foreground">Low confidence — check locally before relying on it.</p>
        )}

        <div className="mt-auto pt-2">
          <Button asChild variant={isBaseline || s.blocked ? "secondary" : item.short === "A" ? "soft" : "highlight"} className="w-full">
            <Link to="/strategy/$strategyId" params={{ strategyId: s.id }}>
              View details <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </div>
    </article>
  );
}
