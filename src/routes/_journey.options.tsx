import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { Notice } from "@/components/agroshift/Notice";
import { RequireAnalysis } from "@/components/agroshift/RequireField";
import { StrategyCard } from "@/components/agroshift/StrategyCard";
import { Button } from "@/components/ui/button";
import { detectZeroBased } from "@/lib/agroshift/months";
import { arrangeStrategies } from "@/lib/agroshift/strategies";
import { useSession } from "@/lib/agroshift/session";

export const Route = createFileRoute("/_journey/options")({
  head: () => ({
    meta: [
      { title: "Three Rotation Options — AgroShift" },
      { name: "description", content: "Your current rotation next to two alternative crop-rotation strategies for your field." },
      { property: "og:title", content: "Three Rotation Options — AgroShift" },
      { property: "og:description", content: "Current practice is the reference point; two alternatives are shown beside it." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OptionsPage,
});

function OptionsPage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader step="Step 5 of 7" title="Three Options" subtitle="Your current rotation and two alternative strategies" />
      <RequireAnalysis>
        <OptionsBody />
      </RequireAnalysis>
    </div>
  );
}

function OptionsBody() {
  const { state } = useSession();
  const list = state.analysis!.strategies.strategies;
  const arranged = arrangeStrategies(list);
  const zeroBased = detectZeroBased(list.flatMap((s) => s.sequence));
  const allBlocked = arranged.alternatives.length > 0 && arranged.alternatives.every((a) => a.strategy.blocked);

  return (
    <div className="space-y-6">
      {arranged.notes.length > 0 && (
        <Notice tone="warning" title="The analysis returned an unexpected set of strategies">
          <ul className="list-disc pl-5">
            {arranged.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        </Notice>
      )}
      {allBlocked && (
        <Notice
          tone="blocked"
          title="Both alternatives are blocked by your limits"
          actions={
            <Button asChild variant="outline">
              <Link to="/priorities">Review my limits</Link>
            </Button>
          }
        >
          Each alternative needs something your limits say you don’t have. The reasons are shown on each card. If a limit
          has changed, update it and run the analysis again.
        </Notice>
      )}
      {arranged.alternatives.length === 0 && (
        <Notice tone="warning" title="No alternative strategies">
          The analysis did not return any alternative to your current practice for this field.
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-3">
        {arranged.all.map((item) => (
          <StrategyCard key={item.strategy.id} item={item} zeroBased={zeroBased} />
        ))}
      </div>

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/evidence">
              <ArrowLeft aria-hidden /> Back
            </Link>
          </Button>
        }
        next={
          <Button asChild>
            <Link to="/compare">
              Next: Compare <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
    </div>
  );
}
