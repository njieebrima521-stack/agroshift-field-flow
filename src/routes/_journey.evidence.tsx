import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Droplets, Layers, Leaf, Sprout, Thermometer, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { Notice } from "@/components/agroshift/Notice";
import { ProvenanceTag } from "@/components/agroshift/ProvenanceTag";
import { RequireAnalysis } from "@/components/agroshift/RequireField";
import { Sparkline } from "@/components/agroshift/Sparkline";
import { Button } from "@/components/ui/button";
import { findProvenance, formatResolution, isModelled, type FeatureMetric } from "@/lib/agroshift/provenance";
import { normaliseNdviCurve, type Features, type Provenance } from "@/lib/agroshift/schemas";
import { useSession } from "@/lib/agroshift/session";

export const Route = createFileRoute("/_journey/evidence")({
  head: () => ({
    meta: [
      { title: "What the Data Says — AgroShift" },
      { name: "description", content: "Rainfall, heat, soil moisture, vegetation and soil information around your field, with sources." },
      { property: "og:title", content: "What the Data Says — AgroShift" },
      { property: "og:description", content: "Evidence first: environmental conditions around your field, and where the data runs out." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader step="Step 4 of 7" title="What the Data Says" subtitle="Conditions in the area around your field — evidence, not recommendations" />
      <RequireAnalysis>
        <EvidenceBody />
      </RequireAnalysis>
    </div>
  );
}

function fmt(n: number, digits = 0) {
  return n.toLocaleString("en-GB", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

function EvidenceBody() {
  const { state } = useSession();
  const f = state.analysis!.features;
  const prov = (m: FeatureMetric) => findProvenance(f.provenance, m);
  const ndvi = normaliseNdviCurve(f.ndvi_curve);
  const ndviValues = ndvi?.map((p) => p.value).filter((v): v is number => v !== null) ?? [];
  const soil = f.soil;

  return (
    <div className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        <EvidenceCard icon={Droplets} iconClass="text-info" title="Rainfall">
          <Metric
            label="Total rainfall"
            value={f.rainfall_total_mm}
            render={(v) => `${fmt(v)} mm`}
            provenance={prov("rainfall_total_mm")}
          />
          <Metric label="Dry-spell days" value={f.dry_spell_days} render={(v) => `${fmt(v)} days`} provenance={prov("dry_spell_days")} />
          <Plain>How much rain fell over the area around your field, and how many days in a row it stayed dry, in the period shown.</Plain>
        </EvidenceCard>

        <EvidenceCard icon={Thermometer} iconClass="text-highlight-text" title="Heat">
          <Metric label="Hot days (above 35 °C)" value={f.hot_days_35} render={(v) => `${fmt(v)} days`} provenance={prov("hot_days_35")} />
          <Plain>Days when the daily maximum air temperature for the area went above 35 °C, which can stress flowering crops.</Plain>
        </EvidenceCard>

        <EvidenceCard icon={Leaf} iconClass="text-primary" title="Soil moisture">
          <Metric
            label="Departure from normal"
            value={f.smap_departure}
            render={(v) => `${v > 0 ? "+" : ""}${fmt(v, 3)}`}
            note="Unit not stated by the service."
            provenance={prov("smap_departure")}
          />
          {f.smap_departure !== null && (
            <Plain>
              {f.smap_departure > 0 ? "Above zero means the top soil in this area was wetter than usual." : f.smap_departure < 0 ? "Below zero means the top soil in this area was drier than usual." : "Zero means about the same as usual."}{" "}
              This is a large-area satellite estimate, not a reading inside your field.
            </Plain>
          )}
        </EvidenceCard>

        <EvidenceCard icon={Sprout} iconClass="text-primary" title="Vegetation (NDVI)">
          {ndvi && ndviValues.length >= 2 ? (
            <div className="space-y-2">
              <Sparkline points={ndvi} label={`Vegetation index over ${ndvi.length} time steps`} />
              <p className="text-base">
                Peak <strong>{fmt(Math.max(...ndviValues), 2)}</strong> · Latest{" "}
                <strong>{ndvi[ndvi.length - 1]?.value !== null && ndvi[ndvi.length - 1]?.value !== undefined ? fmt(ndvi[ndvi.length - 1]!.value!, 2) : "not available"}</strong>
              </p>
              <ProvenanceTag provenance={prov("ndvi_curve")} />
            </div>
          ) : (
            <Unavailable label="Vegetation curve" reason={ndvi && ndvi.length > 0 ? "Too few valid points were returned to draw a curve." : undefined} />
          )}
          <Plain>NDVI is a satellite measure of how green and dense plants are, from 0 (bare) to about 1 (very green).</Plain>
        </EvidenceCard>

        <EvidenceCard icon={Layers} iconClass="text-highlight-text" title="Soil">
          {soil ? (
            <>
              <Metric label="Clay" value={soil.clay_pct} render={(v) => `${fmt(v, 1)} %`} provenance={prov("soil")} compact />
              <Metric label="pH" value={soil.ph} render={(v) => fmt(v, 1)} provenance={prov("soil")} compact />
              <Metric label="Soil organic carbon" value={soil.soc_g_kg} render={(v) => `${fmt(v, 1)} g/kg`} provenance={prov("soil")} compact />
              <ProvenanceTag provenance={prov("soil")} />
              <p className="text-sm text-muted-foreground">Source given: {soil.source ?? "not stated"}</p>
              {(isModelled(prov("soil")) || !prov("soil")) && (
                <p className="text-sm font-medium text-highlight-text">Mapped prediction — not a laboratory test of your soil.</p>
              )}
            </>
          ) : (
            <Unavailable label="Soil properties" />
          )}
          <Plain>Clay holds water and nutrients; pH shows how acid the soil is; organic carbon reflects soil life and fertility.</Plain>
        </EvidenceCard>

        <GapsPanel features={f} />
      </div>

      <SourcesTable provenance={f.provenance} />

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/priorities">
              <ArrowLeft aria-hidden /> Back
            </Link>
          </Button>
        }
        next={
          <Button asChild>
            <Link to="/options">
              View rotation options <ArrowRight aria-hidden />
            </Link>
          </Button>
        }
      />
    </div>
  );
}

function EvidenceCard({ icon: Icon, iconClass, title, children }: { icon: LucideIcon; iconClass: string; title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-xl font-bold">
        <Icon className={`size-6 ${iconClass}`} aria-hidden /> {title}
      </h2>
      {children}
    </section>
  );
}

function Metric({
  label,
  value,
  render,
  provenance,
  note,
  compact,
}: {
  label: string;
  value: number | null;
  render: (v: number) => string;
  provenance: Provenance | null;
  note?: string;
  compact?: boolean;
}) {
  if (value === null) return <Unavailable label={label} />;
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className={compact ? "text-xl font-bold" : "text-3xl font-bold"}>{render(value)}</p>
      {note && <p className="text-sm text-muted-foreground">{note}</p>}
      {!compact && <ProvenanceTag provenance={provenance} />}
    </div>
  );
}

function Unavailable({ label, reason }: { label: string; reason?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface p-3">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">Not available for this field.</p>
      <p className="text-sm text-muted-foreground">{reason ?? "The service did not return this value or a reason."}</p>
    </div>
  );
}

function Plain({ children }: { children: ReactNode }) {
  return <p className="mt-auto border-t border-border pt-3 text-base text-foreground/80">{children}</p>;
}

function GapsPanel({ features: f }: { features: Features }) {
  const { state } = useSession();
  const gaps: string[] = [];
  const named: Array<[FeatureMetric, string, boolean]> = [
    ["rainfall_total_mm", "Rainfall", f.rainfall_total_mm !== null],
    ["hot_days_35", "Hot days", f.hot_days_35 !== null],
    ["smap_departure", "Soil moisture", f.smap_departure !== null],
    ["ndvi_curve", "Vegetation", Boolean(f.ndvi_curve?.length)],
    ["soil", "Soil", f.soil !== null],
  ];
  for (const [metric, label, present] of named) {
    if (!present) {
      gaps.push(`${label}: not available for this field.`);
      continue;
    }
    const p = findProvenance(f.provenance, metric);
    if (!p) gaps.push(`${label}: no source, resolution or period was supplied.`);
    else if (p.resolution_m !== null && p.resolution_m >= 1000)
      gaps.push(`${label} (${p.dataset}) uses a ${formatResolution(p.resolution_m)} — it describes the wider area, not inside your field.`);
    if (p && isModelled(p)) gaps.push(`${label} (${p.dataset}) is ${p.type}, not measured on your field.`);
  }
  const fromAnalysis = Array.from(new Set(state.analysis?.strategies.strategies.flatMap((s) => s.gaps ?? []) ?? []));

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-warning/50 bg-warning-soft p-5 md:col-span-2 xl:col-span-1">
      <h2 className="text-xl font-bold text-warning-foreground">Data gaps and limits</h2>
      {gaps.length === 0 && fromAnalysis.length === 0 ? (
        <p className="text-base">No gaps were reported by the service for this field.</p>
      ) : (
        <>
          {gaps.length > 0 && (
            <ul className="list-disc space-y-1.5 pl-5 text-base">
              {gaps.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          )}
          {fromAnalysis.length > 0 && (
            <>
              <p className="pt-2 text-sm font-semibold uppercase tracking-wide text-warning-foreground">Reported by the analysis</p>
              <ul className="list-disc space-y-1.5 pl-5 text-base">
                {fromAnalysis.map((g) => (
                  <li key={g}>{g}</li>
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </section>
  );
}

function SourcesTable({ provenance }: { provenance: Provenance[] | null }) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-card">
      <h2 className="text-xl font-bold">Data sources & details</h2>
      {!provenance || provenance.length === 0 ? (
        <Notice tone="warning" className="mt-3">
          The service did not return any source information for this field.
        </Notice>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[36rem] text-left text-base">
            <thead>
              <tr className="border-b border-border text-sm text-muted-foreground">
                <th className="py-2 pr-4 font-semibold">Dataset</th>
                <th className="py-2 pr-4 font-semibold">Variable</th>
                <th className="py-2 pr-4 font-semibold">Resolution</th>
                <th className="py-2 pr-4 font-semibold">Period</th>
                <th className="py-2 font-semibold">Type</th>
              </tr>
            </thead>
            <tbody>
              {provenance.map((p, i) => (
                <tr key={`${p.dataset}-${p.variable}-${i}`} className="border-b border-border last:border-0">
                  <td className="py-2.5 pr-4 font-semibold">{p.dataset}</td>
                  <td className="py-2.5 pr-4">{p.variable}</td>
                  <td className="py-2.5 pr-4">{formatResolution(p.resolution_m)}</td>
                  <td className="py-2.5 pr-4">{p.period ?? "not stated"}</td>
                  <td className="py-2.5">{p.type}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
