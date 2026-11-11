import { FALLOW, OTHER_CROP, UNKNOWN_CROP } from "./crops";
import type { LngLat } from "./geo";
import { normalisePriorities } from "./priorities";
import type { Features, Field, FieldDetailsPayload, Priorities, StrategiesResponse, StrategyRequest } from "./schemas";

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

export type BuildResult =
  | { ok: true; request: StrategyRequest; key: string }
  | { ok: false; errors: string[]; fix: "/field" | "/details" | "/priorities" };

const orNull = (v: string) => (v.trim() ? v.trim() : null);

/** Turn the S2 answers into the documented `field_details` block. Nothing is inferred. */
export function buildFieldDetails(d: FieldDetails): FieldDetailsPayload {
  const intercropping = d.intercropping === "yes";
  return {
    field_name: orNull(d.fieldName),
    field_type: d.fieldType,
    seasons: d.seasons.map((s) => {
      const status = s.crop === FALLOW ? "fallow" : s.crop === UNKNOWN_CROP ? "unknown" : "crop";
      const second = intercropping ? seasonSecondName(s) : "";
      return {
        year: s.year,
        status,
        main_crop: status === "crop" ? orNull(seasonCropName(s)) : null,
        second_crop: second && second !== FALLOW && second !== UNKNOWN_CROP ? second : null,
      };
    }),
    intercropping,
    soil_texture: orNull(d.soilTexture),
    drainage: orNull(d.drainage),
    erosion: orNull(d.erosion),
    notes: orNull(d.notes),
  };
}

/** Build the documented POST /api/strategies body from the farmer's actual inputs (S1–S3). */
export function buildStrategyRequest(
  state: Pick<SessionState, "field" | "details" | "priorities" | "constraints">,
): BuildResult {
  if (!state.field) return { ok: false, errors: ["No registered field is selected."], fix: "/field" };

  const detailErrors = Object.values(validateDetails(state.details)).filter((v): v is string => Boolean(v));
  if (detailErrors.length) {
    return { ok: false, errors: ["Field details and crop history are incomplete.", ...new Set(detailErrors)], fix: "/details" };
  }

  const errors: string[] = [];
  const priorities = normalisePriorities(state.priorities);
  if (!priorities) errors.push("At least one priority must be above 0%.");
  const cErr = validateConstraints(state.constraints);
  errors.push(...Object.values(cErr).filter((v): v is string => Boolean(v)));
  if (errors.length || !priorities) return { ok: false, errors, fix: "/priorities" };

  const request: StrategyRequest = {
    field_id: state.field.field_id,
    field_details: buildFieldDetails(state.details),
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
