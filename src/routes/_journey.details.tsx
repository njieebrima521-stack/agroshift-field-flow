import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useState } from "react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { CropSelect } from "@/components/agroshift/CropSelect";
import { Card, ErrorText, FieldLabel, HelpText, NativeSelect, Segmented, inputClass } from "@/components/agroshift/form-controls";
import { Notice } from "@/components/agroshift/Notice";
import { RequireField } from "@/components/agroshift/RequireField";
import { Button } from "@/components/ui/button";
import { detailsProgress, validateDetails, type DetailErrors, type FieldDetails, type SeasonEntry } from "@/lib/agroshift/form";
import { formatHa } from "@/lib/agroshift/geo";
import { useSession } from "@/lib/agroshift/session";

export const Route = createFileRoute("/_journey/details")({
  head: () => ({
    meta: [
      { title: "Field Details — AgroShift" },
      { name: "description", content: "Record your last three cropping seasons and what you observe about your soil." },
      { property: "og:title", content: "Field Details — AgroShift" },
      { property: "og:description", content: "A rotation is a sequence — tell AgroShift what you grew in the last three seasons." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DetailsPage,
});

const FIELD_TYPES = [
  { value: "upland", label: "Upland", hint: "Higher, rain-fed land" },
  { value: "lowland", label: "Lowland", hint: "Low-lying, may flood" },
  { value: "valley", label: "Valley bottom / swamp" },
  { value: "unsure", label: "Not sure" },
];

function DetailsPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader step="Step 2 of 7" title="Field Details" subtitle="Tell us about your field and its history — things satellites cannot see" />
      <RequireField>
        <DetailsForm />
      </RequireField>
    </div>
  );
}

function DetailsForm() {
  const navigate = useNavigate();
  const { state, update } = useSession();
  const d = state.details;
  const field = state.field!;
  const [errors, setErrors] = useState<DetailErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = (patch: Partial<FieldDetails>) => {
    const next = { ...d, ...patch };
    update({ details: next });
    if (submitted) setErrors(validateDetails(next));
  };
  const setSeason = (i: number, patch: Partial<SeasonEntry>) => {
    const seasons = d.seasons.map((s, idx) => (idx === i ? { ...s, ...patch } : s)) as FieldDetails["seasons"];
    set({ seasons });
  };

  const progress = detailsProgress(d);

  function onNext() {
    setSubmitted(true);
    const errs = validateDetails(d);
    setErrors(errs);
    const firstKey = Object.keys(errs)[0];
    if (firstKey) {
      document.getElementById(`q-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    navigate({ to: "/priorities" });
  }

  return (
    <form
      noValidate
      onSubmit={(e) => {
        e.preventDefault();
        onNext();
      }}
      className="space-y-6"
    >
      <div className="rounded-xl border border-border bg-surface p-4" aria-live="polite">
        <div className="flex items-center justify-between text-base">
          <span className="font-semibold">
            {progress.done} of {progress.total} required answers
          </span>
          <span className="text-muted-foreground">Field {field.field_id}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done} aria-label="Form progress">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
        </div>
      </div>

      <Card>
        <h2 className="text-2xl font-bold">1. Crops and cropping history</h2>
        <p className="mt-1 text-base text-muted-foreground">We need the sequence, not one crop, because a rotation is a sequence.</p>

        <div className="mt-5" id="q-intercropping">
          <Segmented
            name="intercropping"
            legend="Do you grow two crops together on this field (intercropping)?"
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            value={d.intercropping}
            onChange={(v) => set({ intercropping: v as FieldDetails["intercropping"] })}
            error={errors.intercropping}
          />
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {d.seasons.map((s, i) => (
            <div key={s.year} id={`q-season${i}`} className="rounded-xl border border-border bg-surface p-4">
              <p className="mb-3 font-semibold">
                Season {i + 1} <span className="font-normal text-muted-foreground">· rainy season {s.year}</span>
                {i === 2 && <span className="font-normal text-muted-foreground"> (most recent)</span>}
              </p>
              <FieldLabel htmlFor={`season-${i}`}>Main crop</FieldLabel>
              <CropSelect
                id={`season-${i}`}
                value={s.crop}
                other={s.cropOther}
                onChange={(v) => setSeason(i, { crop: v })}
                onOtherChange={(v) => setSeason(i, { cropOther: v })}
                invalid={Boolean(errors[`season${i}`])}
                describedBy={`season-${i}-error`}
              />
              <ErrorText id={`season-${i}-error`}>{errors[`season${i}`]}</ErrorText>
              {d.intercropping === "yes" && (
                <div className="mt-3" id={`q-second${i}`}>
                  <FieldLabel htmlFor={`second-${i}`} optional>
                    Grown together with
                  </FieldLabel>
                  <CropSelect
                    id={`second-${i}`}
                    value={s.second}
                    other={s.secondOther}
                    onChange={(v) => setSeason(i, { second: v })}
                    onOtherChange={(v) => setSeason(i, { secondOther: v })}
                    allowNone
                    placeholder="Select second crop"
                    invalid={Boolean(errors[`second${i}`])}
                  />
                  <ErrorText>{errors[`second${i}`]}</ErrorText>
                </div>
              )}
            </div>
          ))}
        </div>
        <HelpText>Crop list shows common Gambian crops. Choose “Other crop” to type any crop that is not listed.</HelpText>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">2. Field information</h2>
        <dl className="mt-4 grid gap-3 rounded-xl bg-surface p-4 text-base sm:grid-cols-3">
          <div>
            <dt className="text-muted-foreground">Field ID</dt>
            <dd className="font-semibold">{field.field_id}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Farming zone</dt>
            <dd className="font-semibold">{field.ecotype ?? "Not recorded"}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Area (recorded)</dt>
            <dd className="font-semibold">{field.area_ha !== null ? `${formatHa(field.area_ha)} ha` : "Not recorded"}</dd>
          </div>
        </dl>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div id="q-fieldName">
            <FieldLabel htmlFor="fieldName" optional>
              Field name
            </FieldLabel>
            <input
              id="fieldName"
              className={inputClass}
              value={d.fieldName}
              maxLength={80}
              placeholder="e.g. Kotu field"
              onChange={(e) => set({ fieldName: e.target.value })}
            />
            <ErrorText>{errors.fieldName}</ErrorText>
          </div>
          <div id="q-fieldType">
            <Segmented
              name="fieldType"
              legend="Type of land"
              options={FIELD_TYPES}
              value={d.fieldType}
              onChange={(v) => set({ fieldType: v })}
              error={errors.fieldType}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-2xl font-bold">3. Soil observations</h2>
        <p className="mt-1 text-base text-muted-foreground">What you see and feel on this field. Choose “Not sure” if you don’t know.</p>
        <div className="mt-5 grid gap-5 md:grid-cols-3">
          <div>
            <FieldLabel htmlFor="soilTexture" optional>
              Soil feel
            </FieldLabel>
            <NativeSelect id="soilTexture" value={d.soilTexture} onChange={(e) => set({ soilTexture: e.target.value })}>
              <option value="">Select</option>
              <option value="sandy">Sandy — loose, gritty</option>
              <option value="loamy">Loamy — soft, crumbly</option>
              <option value="clay">Clay — sticky when wet</option>
              <option value="mixed">Mixed across the field</option>
              <option value="unsure">Not sure</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel htmlFor="drainage" optional>
              After heavy rain
            </FieldLabel>
            <NativeSelect id="drainage" value={d.drainage} onChange={(e) => set({ drainage: e.target.value })}>
              <option value="">Select</option>
              <option value="drains">Water drains quickly</option>
              <option value="pools">Water stays for a day or more</option>
              <option value="floods">Field floods</option>
              <option value="unsure">Not sure</option>
            </NativeSelect>
          </div>
          <div>
            <FieldLabel htmlFor="erosion" optional>
              Signs of soil washing away
            </FieldLabel>
            <NativeSelect id="erosion" value={d.erosion} onChange={(e) => set({ erosion: e.target.value })}>
              <option value="">Select</option>
              <option value="none">None</option>
              <option value="some">Some small channels</option>
              <option value="severe">Deep channels / gullies</option>
              <option value="unsure">Not sure</option>
            </NativeSelect>
          </div>
        </div>
        <div className="mt-5" id="q-notes">
          <FieldLabel htmlFor="notes" optional>
            Other observations
          </FieldLabel>
          <textarea
            id="notes"
            className={`${inputClass} h-28 py-3`}
            value={d.notes}
            maxLength={500}
            placeholder="e.g. weeds, pests, crusting, last fertiliser used…"
            onChange={(e) => set({ notes: e.target.value })}
          />
          <ErrorText>{errors.notes}</ErrorText>
        </div>
      </Card>

      {submitted && Object.keys(errors).length > 0 && (
        <Notice tone="error" role="alert">
          Some answers are missing. They are marked in red above.
        </Notice>
      )}

      <Notice tone="neutral">
        These answers go on your farmer sheet. The current version of the analysis service does not yet use them when
        generating options.
      </Notice>

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/field">
              <ArrowLeft aria-hidden /> Back
            </Link>
          </Button>
        }
        next={
          <Button type="submit">
            Next: Priorities <ArrowRight aria-hidden />
          </Button>
        }
      />
    </form>
  );
}
