import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { PageHeader } from "@/components/agroshift/AppShell";
import { ApiErrorNotice, Notice } from "@/components/agroshift/Notice";
import { RequireField } from "@/components/agroshift/RequireField";
import { Button } from "@/components/ui/button";
import { ApiError, getFieldFeatures, getFields, postStrategies } from "@/lib/agroshift/api";
import { buildStrategyRequest } from "@/lib/agroshift/form";
import type { Features } from "@/lib/agroshift/schemas";
import { useSession } from "@/lib/agroshift/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_journey/analysing")({
  head: () => ({
    meta: [
      { title: "Analysing Your Field — AgroShift" },
      { name: "description", content: "AgroShift is gathering environmental data and generating rotation options for your field." },
      { property: "og:title", content: "Analysing Your Field — AgroShift" },
      { property: "og:description", content: "Connecting your field to NASA Earth observations and your own priorities." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AnalysingPage,
});

type StageId = "field" | "features" | "soil" | "inputs" | "strategies";
type Status = "pending" | "running" | "done" | "partial" | "error";
type Stage = { id: StageId; title: string; running: string; status: Status; note?: string | undefined };

const INITIAL: Stage[] = [
  { id: "field", title: "Field information", running: "Confirming your field with the AgroShift service…", status: "pending" },
  { id: "features", title: "NASA environmental data", running: "Fetching rainfall, heat, soil moisture and vegetation…", status: "pending" },
  { id: "soil", title: "Soil information", running: "Reading soil properties…", status: "pending" },
  { id: "inputs", title: "Your crops and choices", running: "Checking your priorities and limits…", status: "pending" },
  { id: "strategies", title: "Strategy analysis", running: "Applying your limits and priorities to rotation options…", status: "pending" },
];

function missingFeatureNames(f: Features): string[] {
  const out: string[] = [];
  if (f.rainfall_total_mm === null) out.push("rainfall");
  if (f.hot_days_35 === null) out.push("hot days");
  if (f.smap_departure === null) out.push("soil moisture");
  if (!f.ndvi_curve || f.ndvi_curve.length === 0) out.push("vegetation");
  return out;
}

function AnalysingPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Analysing Your Field" subtitle="We’re gathering and analysing data from several sources" />
      <RequireField>
        <Runner />
      </RequireField>
    </div>
  );
}

function Runner() {
  const navigate = useNavigate();
  const { state, update, analysisIsCurrent } = useSession();
  const [stages, setStages] = useState<Stage[]>(INITIAL);
  const [error, setError] = useState<unknown>(null);
  const [complete, setComplete] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const built = buildStrategyRequest(state);

  const setStage = (id: StageId, status: Status, note?: string) =>
    setStages((list) => list.map((s) => (s.id === id ? { ...s, status, note } : s)));

  const run = useCallback(async () => {
    const current = stateRef.current;
    const req = buildStrategyRequest(current);
    if (!req.ok || !current.field) return;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    const { signal } = controller;
    setError(null);
    setComplete(false);
    setStages(INITIAL);
    const fieldId = current.field.field_id;

    try {
      setStage("field", "running");
      const fields = await getFields(signal);
      if (!fields.some((f) => f.field_id === fieldId)) {
        setStage("field", "error", `Field ${fieldId} is no longer returned by the service.`);
        throw new ApiError("http", "/api/fields", "Field not found", { status: 404 });
      }
      setStage("field", "done");

      setStage("features", "running");
      const features = await getFieldFeatures(fieldId, signal);
      const missing = missingFeatureNames(features);
      setStage("features", missing.length ? "partial" : "done", missing.length ? `Not available: ${missing.join(", ")}.` : undefined);

      setStage("soil", "running");
      const soil = features.soil;
      const hasSoil = soil !== null && [soil.clay_pct, soil.ph, soil.soc_g_kg].some((v) => v !== null);
      setStage("soil", hasSoil ? "done" : "partial", hasSoil ? undefined : "Soil information is not available for this field.");

      setStage("inputs", "running");
      const sent = req.request.field_details.seasons;
      setStage(
        "inputs",
        "done",
        `Sending ${sent.length} seasons of crop history (${sent.map((s) => s.year).join(", ")}), your field details, priorities and 4 limits.`,
      );

      setStage("strategies", "running");
      const strategies = await postStrategies(req.request, signal);
      setStage("strategies", "done", `${strategies.strategies.length} strategies returned.`);

      update({
        analysis: {
          key: req.key,
          fieldId,
          features,
          strategies,
          completedAt: new Date().toISOString(),
        },
      });
      setComplete(true);
    } catch (err) {
      if (err instanceof ApiError && err.kind === "aborted") return;
      setStages((list) => list.map((s) => (s.status === "running" ? { ...s, status: "error" } : s)));
      setError(err);
    }
  }, [update]);

  useEffect(() => {
    if (analysisIsCurrent) {
      setStages(INITIAL.map((s) => ({ ...s, status: "done" })));
      setComplete(true);
      return;
    }
    if (built.ok) void run();
    return () => controllerRef.current?.abort();
    // Run once on arrival; retries are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!built.ok) {
    return (
      <Notice
        tone="warning"
        title="Some answers are needed before the analysis can run"
        actions={
          <Button asChild>
            <Link to={built.fix}>
              {built.fix === "/details" ? "Go to field details" : built.fix === "/field" ? "Choose a field" : "Go to priorities & limits"}
            </Link>
          </Button>
        }
      >
        <ul className="list-disc pl-5">
          {built.errors.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      </Notice>
    );
  }

  const doneCount = stages.filter((s) => s.status === "done" || s.status === "partial").length;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-6 shadow-card">
        <h2 className="text-2xl font-bold">Connecting your field to the bigger picture</h2>
        <p className="mt-1 text-base text-muted-foreground">
          Field {state.field?.field_id} · {doneCount} of {stages.length} steps finished
        </p>
        <ol className="mt-6 space-y-5" aria-live="polite">
          {stages.map((s) => (
            <li key={s.id} className="flex gap-4">
              <StageIcon status={s.status} />
              <div className="min-w-0">
                <p className="text-lg font-semibold">{s.title}</p>
                <p className={cn("text-base", s.status === "error" ? "text-destructive" : s.status === "partial" ? "text-warning-foreground" : "text-muted-foreground")}>
                  {s.status === "running"
                    ? s.running
                    : s.status === "pending"
                      ? "Waiting"
                      : s.status === "error"
                        ? s.note ?? "This step failed."
                        : s.note ?? "Done"}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {error !== null && <ApiErrorNotice error={error} onRetry={() => void run()} extraAction={<Button asChild variant="ghost"><Link to="/priorities">Review my answers</Link></Button>} />}

      {complete ? (
        <Notice
          tone="success"
          title="Analysis complete"
          actions={
            <>
              <Button onClick={() => navigate({ to: "/evidence" })}>
                See what the data says <ArrowRight aria-hidden />
              </Button>
              <Button variant="outline" onClick={() => void run()}>
                Run again
              </Button>
            </>
          }
        >
          Start with the evidence for your field before looking at the options.
        </Notice>
      ) : (
        error === null && (
          <Notice tone="info" title="This may take a few moments.">
            Steps are marked finished only when the service has answered. Your answers are kept if anything fails.
          </Notice>
        )
      )}
    </div>
  );
}

function StageIcon({ status }: { status: Status }) {
  const cls = "mt-0.5 size-7 shrink-0";
  switch (status) {
    case "running":
      return <Loader2 className={cn(cls, "animate-spin text-primary")} aria-label="In progress" />;
    case "done":
      return <CheckCircle2 className={cn(cls, "text-primary")} aria-label="Finished" />;
    case "partial":
      return <AlertTriangle className={cn(cls, "text-warning-foreground")} aria-label="Finished with gaps" />;
    case "error":
      return <XCircle className={cn(cls, "text-destructive")} aria-label="Failed" />;
    default:
      return <Circle className={cn(cls, "text-border")} aria-label="Waiting" />;
  }
}
