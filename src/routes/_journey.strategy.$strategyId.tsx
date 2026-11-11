import { Link, createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, CircleHelp, Lock, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { Notice } from "@/components/agroshift/Notice";
import { RequireAnalysis } from "@/components/agroshift/RequireField";
import { SequenceBar } from "@/components/agroshift/SequenceBar";
import { BASELINE_MESSAGE, ConfidenceBadge } from "@/components/agroshift/StrategyCard";
import { Button } from "@/components/ui/button";
import { mapBreakdown } from "@/lib/agroshift/criteria";
import { detectZeroBased } from "@/lib/agroshift/months";
import { formatResolution } from "@/lib/agroshift/provenance";
import { arrangeStrategies, isLowConfidence, LOW_CONFIDENCE_THRESHOLD } from "@/lib/agroshift/strategies";
import { useSession } from "@/lib/agroshift/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_journey/strategy/$strategyId")({
  head: () => ({
    meta: [
      { title: "Strategy Detail — AgroShift" },
      { name: "description", content: "Why this rotation was suggested, the evidence behind it, its trade-offs, gaps and local risks." },
      { property: "og:title", content: "Strategy Detail — AgroShift" },
      { property: "og:description", content: "Sequence, reasons, evidence, benefits, trade-offs, gaps, risks and confidence for one strategy." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: StrategyPage,
});

const FOOTER = "This supports your judgement. It does not replace your own experience or local agricultural advice.";

const SECTIONS = [
  "Sequence",
  "Why suggested",
  "Evidence",
  "Benefits",
  "Trade-offs",
  "Gaps",
  "Risks for local review",
  "Confidence",
] as const;

function StrategyPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader step="Step 6 of 7" title="Strategy Detail" subtitle="Why this option was suggested, and what remains uncertain" />
      <RequireAnalysis>
        <StrategyBody />
      </RequireAnalysis>
    </div>
  );
}

function StrategyBody() {
  const { strategyId } = Route.useParams();
  const { state } = useSession();
  const list = state.analysis!.strategies.strategies;
  const arranged = arrangeStrategies(list);
  const zeroBased = detectZeroBased(list.flatMap((s) => s.sequence));
  const item = arranged.all.find((a) => a.strategy.id === strategyId);

  const tabs = (
    <nav aria-label="Strategies" className="no-print mb-6 grid grid-cols-1 gap-2 rounded-2xl border border-border p-1.5 sm:grid-cols-3">
      {arranged.all.map((a) => {
        const active = a.strategy.id === strategyId;
        return (
          <Link
            key={a.strategy.id}
            to="/strategy/$strategyId"
            params={{ strategyId: a.strategy.id }}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 text-base font-semibold transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-surface",
            )}
          >
            {a.label}
            {a.strategy.blocked && <Lock className="size-4" aria-label="blocked" />}
          </Link>
        );
      })}
    </nav>
  );

  if (!item) {
    return (
      <>
        {tabs}
        <Notice tone="warning" title="Strategy not found">
          This strategy is not part of the current analysis. Choose one of the options above.
        </Notice>
      </>
    );
  }

  const s = item.strategy;
  const evidence = s.evidence ?? [];
  const mapped = mapBreakdown(s);

  return (
    <>
      {tabs}
      <article className="mx-auto max-w-[700px] space-y-5">
        {isLowConfidence(s) && (
          <div className="flex gap-3 rounded-xl border-2 border-warning bg-warning-soft p-4 text-warning-foreground" role="alert">
            <AlertTriangle className="mt-0.5 size-6 shrink-0" aria-hidden />
            <div>
              <p className="font-bold">Low confidence ({s.confidence} — below {LOW_CONFIDENCE_THRESHOLD})</p>
              <p className="text-base text-foreground/85">
                The evidence behind this option is thin. Treat it as an idea to discuss locally, not a plan.
              </p>
            </div>
          </div>
        )}

        <header>
          <p className="text-base font-semibold text-primary">{item.role === "baseline" ? "Current practice · reference" : `${item.label} · alternative`}</p>
          <h2 className="text-3xl font-bold">{s.name}</h2>
          {item.role === "baseline" && <p className="mt-2 rounded-lg border border-border bg-surface p-3 text-base font-medium">{BASELINE_MESSAGE}</p>}
          {s.blocked && (
            <Notice tone="blocked" className="mt-3" title="Blocked by your limits">
              {s.blocked_reason ?? "The analysis marked this option as blocked but did not give a reason."}
            </Notice>
          )}
          {s.constraint_checks && s.constraint_checks.length > 0 && (
            <div className="mt-3 rounded-lg border border-border p-3">
              <p className="text-base font-semibold">Your limits, checked before any scoring</p>
              <ul className="mt-2 space-y-1.5">
                {s.constraint_checks.map((c, i) => (
                  <li key={`${c.constraint}-${i}`} className="flex gap-2 text-base">
                    {c.passed === true ? (
                      <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-label="Passed" />
                    ) : c.passed === false ? (
                      <XCircle className="mt-0.5 size-5 shrink-0 text-blocked" aria-label="Not met" />
                    ) : (
                      <CircleHelp className="mt-0.5 size-5 shrink-0 text-warning-foreground" aria-label="Not checked" />
                    )}
                    <span>
                      <span className="font-medium">{c.constraint.replace(/_/g, " ")}</span>
                      {" — "}
                      {c.reason ?? (c.passed === true ? "met" : c.passed === false ? "not met (no reason given)" : "could not be checked")}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </header>

        <nav aria-label="Sections" className="no-print flex flex-wrap gap-2">
          {SECTIONS.map((title, i) => (
            <a key={title} href={`#section-${i + 1}`} className="inline-flex min-h-11 items-center rounded-full border border-border px-3 text-sm font-medium hover:bg-surface">
              {i + 1}. {title}
            </a>
          ))}
        </nav>

        <Section n={1} title="Sequence">
          <SequenceBar sequence={s.sequence} zeroBased={zeroBased} />
        </Section>

        <Section n={2} title="Why suggested" empty={!s.why}>
          <p className="text-base leading-relaxed">{s.why}</p>
        </Section>

        <Section n={3} title="Evidence" empty={evidence.length === 0}>
          <ul className="space-y-3">
            {evidence.map((e, i) => (
              <li key={`${e.claim}-${i}`} className="rounded-lg border border-border p-3">
                <p className="text-base font-medium">{e.claim}</p>
                {e.value !== null && <p className="mt-1 text-lg font-bold">{typeof e.value === "number" ? e.value.toLocaleString("en-GB") : e.value}</p>}
                <p className="mt-1.5 flex flex-wrap gap-1.5 text-sm">
                  {e.dataset ? (
                    <>
                      <span className="rounded-md bg-muted px-2 py-0.5 font-semibold">{e.dataset}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{formatResolution(e.resolution_m)}</span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{e.period ?? "period not stated"}</span>
                    </>
                  ) : (
                    <span className="font-medium text-warning-foreground">No source supplied — treat as unsupported.</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        </Section>

        <ListSection n={4} title="Benefits" items={s.benefits} />
        <ListSection n={5} title="Trade-offs" items={s.tradeoffs} />
        <ListSection n={6} title="Gaps" items={s.gaps} />
        <ListSection n={7} title="Risks for local review" items={s.risks} />

        <Section n={8} title="Confidence" empty={s.confidence === null}>
          <div className="space-y-3">
            <ConfidenceBadge value={s.confidence} />
            <p className="text-base">
              This is the analysis engine’s own confidence in its evidence for this option. Values below {LOW_CONFIDENCE_THRESHOLD} are
              treated as low. It is not a promise that the rotation will succeed.
            </p>
            {s.breakdown && s.breakdown.length > 0 && (
              <details className="rounded-lg border border-border p-3" open>
                <summary className="min-h-11 cursor-pointer content-center font-semibold">Score breakdown from the analysis</summary>
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[28rem] text-left text-base">
                    <thead className="text-sm text-muted-foreground">
                      <tr>
                        <th className="py-1.5 pr-3 font-semibold">Criterion</th>
                        <th className="py-1.5 pr-3 font-semibold">Weight</th>
                        <th className="py-1.5 pr-3 font-semibold">Raw</th>
                        <th className="py-1.5 font-semibold">Normalised</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.breakdown.map((b) => (
                        <tr key={b.criterion} className="border-t border-border">
                          <td className="py-1.5 pr-3">{b.criterion}</td>
                          <td className="py-1.5 pr-3 tabular-nums">{b.weight ?? "—"}</td>
                          <td className="py-1.5 pr-3 tabular-nums">{b.raw ?? "—"}</td>
                          <td className="py-1.5 tabular-nums">{b.normalised ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {mapped.other.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Not in the comparison table: {mapped.other.map((o) => o.criterion).join(", ")}.
                  </p>
                )}
              </details>
            )}
          </div>
        </Section>

        <p className="rounded-xl border-l-4 border-primary bg-surface p-4 text-base font-medium">{FOOTER}</p>
      </article>

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/options">
              <ArrowLeft aria-hidden /> Back to options
            </Link>
          </Button>
        }
        next={
          <Button asChild>
            <Link to="/compare">
              View comparison <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
    </>
  );
}

function Section({ n, title, empty, children }: { n: number; title: string; empty?: boolean; children: ReactNode }) {
  return (
    <details id={`section-${n}`} open className="scroll-mt-24 rounded-2xl border border-border bg-card p-5 shadow-card">
      <summary className="min-h-11 cursor-pointer content-center text-xl font-bold">
        {n}. {title}
      </summary>
      <div className="mt-3">
        {empty ? (
          <p className="rounded-lg border border-dashed border-warning bg-warning-soft p-3 text-base text-warning-foreground">
            Incomplete: the analysis did not return “{title.toLowerCase()}” for this strategy. Nothing has been filled in for it.
          </p>
        ) : (
          children
        )}
      </div>
    </details>
  );
}

function ListSection({ n, title, items }: { n: number; title: string; items: string[] | null }) {
  return (
    <Section n={n} title={title} empty={!items || items.length === 0}>
      <ul className="list-disc space-y-1.5 pl-5 text-base">
        {(items ?? []).map((t, i) => (
          <li key={`${t}-${i}`}>{t}</li>
        ))}
      </ul>
    </Section>
  );
}
