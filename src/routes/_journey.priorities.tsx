import * as SliderPrimitive from "@radix-ui/react-slider";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, Coins, Droplets, Leaf, ShieldCheck, Wheat, type LucideIcon } from "lucide-react";
import { useState } from "react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { Card, ErrorText, Segmented } from "@/components/agroshift/form-controls";
import { Notice } from "@/components/agroshift/Notice";
import { RequireField } from "@/components/agroshift/RequireField";
import { Button } from "@/components/ui/button";
import { FALLOW, SUGGESTED_CROPS } from "@/lib/agroshift/crops";
import { seasonCropName, validateConstraints, type ConstraintErrors, type Constraints } from "@/lib/agroshift/form";
import { PRIORITY_KEYS, normalisePriorities, priorityTotal } from "@/lib/agroshift/priorities";
import type { PriorityKey } from "@/lib/agroshift/schemas";
import { useSession } from "@/lib/agroshift/session";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_journey/priorities")({
  head: () => ({
    meta: [
      { title: "Priorities & Limits — AgroShift" },
      { name: "description", content: "Set what matters most to you and the practical limits on water, seed, labour and budget." },
      { property: "og:title", content: "Farmer Priorities & Limits — AgroShift" },
      { property: "og:description", content: "Separate what you want from what you can realistically do." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PrioritiesPage,
});

const PRIORITY_META: Record<PriorityKey, { label: string; icon: LucideIcon; iconClass: string }> = {
  water: { label: "Conserve water", icon: Droplets, iconClass: "text-info" },
  soil: { label: "Improve soil health", icon: Leaf, iconClass: "text-primary" },
  income: { label: "Increase income", icon: Coins, iconClass: "text-highlight-text" },
  food: { label: "Grow more food", icon: Wheat, iconClass: "text-primary" },
  resilience: { label: "Resilience to bad seasons", icon: ShieldCheck, iconClass: "text-primary" },
};

const LIMITS_TEXT =
  "Limits are checked first. A rotation that needs water you do not have will be shown as blocked, not ranked lower.";

function PrioritiesPage() {
  return (
    <div className="mx-auto max-w-6xl">
      <PageHeader step="Step 3 of 7" title="Farmer Priorities & Limits" subtitle="Tell us what matters most and what you can realistically do" />
      <RequireField>
        <PrioritiesForm />
      </RequireField>
    </div>
  );
}

function PrioritiesForm() {
  const navigate = useNavigate();
  const { state, update } = useSession();
  const p = state.priorities;
  const c = state.constraints;
  const [errors, setErrors] = useState<ConstraintErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const total = priorityTotal(p);
  const normalised = normalisePriorities(p);

  const setPriority = (k: PriorityKey, v: number) => {
    const value = Math.max(0, Math.min(100, Math.round(Number.isFinite(v) ? v : 0)));
    update({ priorities: { ...p, [k]: value } });
  };
  const setConstraints = (patch: Partial<Constraints>) => {
    const next = { ...c, ...patch };
    update({ constraints: next });
    if (submitted) setErrors(validateConstraints(next));
  };

  // Seeds the farmer already grows come first in the list.
  const historyCrops = state.details.seasons.map(seasonCropName).filter((n) => n && n !== FALLOW && n !== "Not sure");
  const seedOptions = Array.from(new Set([...historyCrops, ...SUGGESTED_CROPS, ...c.seed_available]));
  const toggleSeed = (crop: string) =>
    setConstraints({
      seed_available: c.seed_available.includes(crop) ? c.seed_available.filter((s) => s !== crop) : [...c.seed_available, crop],
    });

  function onStart() {
    setSubmitted(true);
    const errs = validateConstraints(c);
    setErrors(errs);
    if (!normalised) return;
    if (Object.keys(errs).length) {
      document.getElementById("constraints")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    navigate({ to: "/analysing" });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card>
          <h2 className="text-2xl font-bold">A. Your priorities</h2>
          <p className="mt-1 text-base text-muted-foreground">Move each slider to show how much it matters to you.</p>
          <ul className="mt-6 space-y-6">
            {PRIORITY_KEYS.map((k) => {
              const meta = PRIORITY_META[k];
              const Icon = meta.icon;
              const share = total > 0 ? Math.round((p[k] / total) * 100) : 0;
              return (
                <li key={k} className="grid grid-cols-[2rem_minmax(0,1fr)_4.5rem] items-center gap-3">
                  <Icon className={cn("size-6", meta.iconClass)} aria-hidden />
                  <div className="min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <label id={`label-${k}`} htmlFor={`num-${k}`} className="text-base font-medium">
                        {meta.label}
                      </label>
                      <span className="text-base font-bold tabular-nums" aria-live="polite">
                        {share}%
                      </span>
                    </div>
                    <SliderPrimitive.Root
                      className="relative mt-1 flex h-11 w-full touch-none select-none items-center"
                      min={0}
                      max={100}
                      step={1}
                      value={[p[k]]}
                      onValueChange={(v) => setPriority(k, v[0] ?? 0)}
                      aria-labelledby={`label-${k}`}
                    >
                      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-muted">
                        <SliderPrimitive.Range className="absolute h-full bg-primary" />
                      </SliderPrimitive.Track>
                      <SliderPrimitive.Thumb
                        aria-label={meta.label}
                        className="block size-7 rounded-full border-[3px] border-primary bg-background shadow focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      />
                    </SliderPrimitive.Root>
                  </div>
                  <input
                    id={`num-${k}`}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    value={p[k]}
                    onChange={(e) => setPriority(k, Number(e.target.value))}
                    className="h-12 w-full rounded-lg border border-input bg-background px-2 text-center text-base tabular-nums"
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-6 rounded-xl bg-surface p-4" aria-live="polite">
            <p className="text-base font-semibold">
              Running total of your sliders: <span className="tabular-nums">{total}</span>
            </p>
            {!normalised ? (
              <ErrorText>Move at least one slider above 0 so we know what matters to you.</ErrorText>
            ) : total !== 100 ? (
              <p className="mt-1 text-base text-muted-foreground">
                Your sliders add up to {total}, so we scale them to 100 before sending:{" "}
                {PRIORITY_KEYS.map((k) => `${PRIORITY_META[k].label.toLowerCase()} ${normalised[k]}%`).join(", ")}.
              </p>
            ) : (
              <p className="mt-1 flex items-center gap-1.5 text-base text-primary-strong">
                <Check className="size-4" aria-hidden /> Your priorities add up to 100%.
              </p>
            )}
          </div>
        </Card>

        <Card className="scroll-mt-24">
          <div id="constraints" className="scroll-mt-24" />
          <h2 className="text-2xl font-bold">B. Practical limits</h2>
          <p className="mt-1 text-base text-muted-foreground">These are hard limits, not preferences.</p>
          <Notice tone="info" className="mt-4">
            {LIMITS_TEXT}
          </Notice>
          <div className="mt-5 space-y-6">
            <Segmented
              name="water_source"
              legend="Water you can rely on"
              options={[
                { value: "rainfed", label: "Rain only" },
                { value: "well", label: "Well or borehole" },
                { value: "irrigation", label: "Irrigation / pump" },
              ]}
              value={c.water_source}
              onChange={(v) => setConstraints({ water_source: v })}
              error={errors.water_source}
            />
            <Segmented
              name="labour"
              legend="Labour available"
              options={[
                { value: "low", label: "Little" },
                { value: "medium", label: "Some" },
                { value: "high", label: "Plenty" },
              ]}
              value={c.labour}
              onChange={(v) => setConstraints({ labour: v })}
              error={errors.labour}
            />
            <Segmented
              name="budget"
              legend="Budget for seed and inputs"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={c.budget}
              onChange={(v) => setConstraints({ budget: v })}
              error={errors.budget}
            />
          </div>
        </Card>
      </div>

      <Card>
        <fieldset aria-describedby={errors.seed_available ? "seed-error" : undefined}>
          <legend className="text-xl font-bold">Seeds you can get this season</legend>
          <p className="mt-1 text-base text-muted-foreground">
            Tap every crop you can get seed for. Options needing other seed will be shown as blocked.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {seedOptions.map((crop) => {
              const on = c.seed_available.includes(crop);
              return (
                <button
                  key={crop}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSeed(crop)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-base transition-colors",
                    on ? "border-primary bg-primary-soft font-semibold text-primary-strong" : "border-input hover:bg-surface",
                  )}
                >
                  {on && <Check className="size-4" aria-hidden />}
                  {crop}
                </button>
              );
            })}
          </div>
          <ErrorText id="seed-error">{errors.seed_available}</ErrorText>
        </fieldset>
      </Card>

      {submitted && Object.keys(errors).length > 0 && (
        <Notice tone="error" role="alert">
          Some limits are missing. They are marked in red above.
        </Notice>
      )}

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/details">
              <ArrowLeft aria-hidden /> Back
            </Link>
          </Button>
        }
        next={
          <Button onClick={onStart} disabled={!normalised}>
            Start analysis <ArrowRight aria-hidden />
          </Button>
        }
      />
    </div>
  );
}
