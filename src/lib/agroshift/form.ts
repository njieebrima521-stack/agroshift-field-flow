import { OTHER_CROP } from "./crops";
import type { LngLat } from "./geo";
import { normalisePriorities } from "./priorities";
import type { Features, Field, Priorities, StrategiesResponse, StrategyRequest } from "./schemas";

export type SeasonEntry = { year: number; crop: string; cropOther: string; second: string; secondOther: string };

export type FieldDetails = {
  fieldName: string;
  fieldType: string;
  seasons: [SeasonEntry, SeasonEntry, SeasonEntry];
  intercropping: "" | "yes" | "no";
  soilTexture: string;
  drainage: string;
  erosion: string;
  notes: string;
};

export type Constraints = {
  water_source: string;
  seed_available: string[];
  labour: string;
  budget: string;
};

export type SessionBoundary = { points: LngLat[]; areaHa: number };

export type AnalysisResult = {
  key: string;
  fieldId: string;
  features: Features;
  strategies: StrategiesResponse;
  completedAt: string;
};

export type SessionState = {
  field: Field | null;
  sessionBoundary: SessionBoundary | null;
  details: FieldDetails;
  priorities: Priorities;
  constraints: Constraints;
  analysis: AnalysisResult | null;
  sheetStrategyId: string | null;
};

/** Rainy-season years for the last three seasons. The Gambian main season ends ~October. */
export function recentSeasonYears(now: Date): [number, number, number] {
  const latest = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  return [latest - 2, latest - 1, latest];
}

export function emptyDetails(now: Date = new Date()): FieldDetails {
  const years = recentSeasonYears(now);
  const season = (year: number): SeasonEntry => ({ year, crop: "", cropOther: "", second: "", secondOther: "" });
  return {
    fieldName: "",
    fieldType: "",
    seasons: [season(years[0]), season(years[1]), season(years[2])],
    intercropping: "",
    soilTexture: "",
    drainage: "",
    erosion: "",
    notes: "",
  };
}

export const DEFAULT_PRIORITIES: Priorities = { water: 20, soil: 20, income: 20, food: 20, resilience: 20 };

export const EMPTY_CONSTRAINTS: Constraints = { water_source: "", seed_available: [], labour: "", budget: "" };

export function initialSession(): SessionState {
  return {
    field: null,
    sessionBoundary: null,
    details: emptyDetails(),
    priorities: { ...DEFAULT_PRIORITIES },
    constraints: { ...EMPTY_CONSTRAINTS, seed_available: [] },
    analysis: null,
    sheetStrategyId: null,
  };
}

export function seasonCropName(s: SeasonEntry): string {
  return s.crop === OTHER_CROP ? s.cropOther.trim() : s.crop;
}
export function seasonSecondName(s: SeasonEntry): string {
  return s.second === OTHER_CROP ? s.secondOther.trim() : s.second;
}

export type DetailErrors = {
  fieldType?: string;
  fieldName?: string;
  intercropping?: string;
  notes?: string;
  [key: string]: string | undefined;
};

export function validateDetails(d: FieldDetails): DetailErrors {
  const errors: DetailErrors = {};
  if (!d.fieldType) errors.fieldType = "Choose the type of land this field is on.";
  if (d.fieldName.length > 80) errors.fieldName = "Keep the field name under 80 characters.";
  d.seasons.forEach((s, i) => {
    if (!s.crop) errors[`season${i}`] = "Choose the main crop for this season, or “Fallow” / “Not sure”.";
    else if (s.crop === OTHER_CROP && !s.cropOther.trim()) errors[`season${i}`] = "Type the crop name.";
    else if (s.cropOther.length > 60) errors[`season${i}`] = "Keep the crop name under 60 characters.";
    if (d.intercropping === "yes" && s.second === OTHER_CROP && !s.secondOther.trim())
      errors[`second${i}`] = "Type the second crop name.";
  });
  if (!d.intercropping) errors.intercropping = "Tell us whether you grow two crops together.";
  if (d.notes.length > 500) errors.notes = "Keep notes under 500 characters.";
  return errors;
}

export function detailsProgress(d: FieldDetails): { done: number; total: number } {
  const checks = [
    Boolean(d.fieldType),
    ...d.seasons.map((s) => Boolean(s.crop) && (s.crop !== OTHER_CROP || Boolean(s.cropOther.trim()))),
    Boolean(d.intercropping),
  ];
  return { done: checks.filter(Boolean).length, total: checks.length };
}

export type ConstraintErrors = Partial<Record<keyof Constraints, string>>;

export function validateConstraints(c: Constraints): ConstraintErrors {
  const e: ConstraintErrors = {};
  if (!c.water_source) e.water_source = "Choose the water you can rely on.";
  if (c.seed_available.length === 0) e.seed_available = "Choose at least one seed you can get this season.";
  if (!c.labour) e.labour = "Choose how much labour you have.";
  if (!c.budget) e.budget = "Choose your budget level.";
  return e;
}

export type BuildResult = { ok: true; request: StrategyRequest; key: string } | { ok: false; errors: string[] };

/** Build the documented POST /api/strategies body from the farmer's actual inputs. */
export function buildStrategyRequest(state: Pick<SessionState, "field" | "priorities" | "constraints">): BuildResult {
  const errors: string[] = [];
  if (!state.field) errors.push("No registered field is selected.");
  const priorities = normalisePriorities(state.priorities);
  if (!priorities) errors.push("At least one priority must be above 0%.");
  const cErr = validateConstraints(state.constraints);
  errors.push(...Object.values(cErr).filter((v): v is string => Boolean(v)));
  if (errors.length || !state.field || !priorities) return { ok: false, errors };

  const request: StrategyRequest = {
    field_id: state.field.field_id,
    priorities,
    constraints: {
      water_source: state.constraints.water_source,
      seed_available: [...state.constraints.seed_available],
      labour: state.constraints.labour,
      budget: state.constraints.budget,
    },
  };
  return { ok: true, request, key: JSON.stringify(request) };
}
