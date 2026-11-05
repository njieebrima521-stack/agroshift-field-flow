import { z } from "zod";

/**
 * Typed models for the documented AgroShift API contract.
 * Missing values are normalised to `null` — never to zero.
 */

const nullableNumber = z
  .number()
  .finite()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v));

const nullableString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v));

const id = z.union([z.string().min(1), z.number()]).transform(String);

const stringList = z
  .array(z.string())
  .nullable()
  .optional()
  .transform((v) => (v === undefined ? null : v));

/* ---------- GET /api/fields ---------- */

export const fieldSchema = z.object({
  field_id: id,
  farmer_code: nullableString,
  community: nullableString,
  ecotype: nullableString,
  area_ha: nullableNumber,
  geometry: z.unknown().optional(),
});
export const fieldsResponseSchema = z.array(fieldSchema);
export type Field = z.infer<typeof fieldSchema>;

/* ---------- GET /api/fields/{field_id}/features ---------- */

export const provenanceSchema = z.object({
  dataset: z.string(),
  variable: z.string(),
  resolution_m: nullableNumber,
  period: nullableString,
  type: z.string(),
});
export type Provenance = z.infer<typeof provenanceSchema>;

/**
 * The contract shows `ndvi_curve: []` without an element shape.
 * Accept plain numbers or objects carrying a value and an optional label.
 */
const ndviPointSchema = z.union([
  z.number(),
  z.null(),
  z
    .object({
      value: z.number().nullable().optional(),
      ndvi: z.number().nullable().optional(),
      date: z.string().optional(),
      month: z.union([z.string(), z.number()]).optional(),
      period: z.string().optional(),
    })
    .passthrough(),
]);

export const soilSchema = z.object({
  clay_pct: nullableNumber,
  ph: nullableNumber,
  soc_g_kg: nullableNumber,
  source: nullableString,
});

export const featuresResponseSchema = z.object({
  field_id: id,
  rainfall_total_mm: nullableNumber,
  dry_spell_days: nullableNumber,
  hot_days_35: nullableNumber,
  smap_departure: nullableNumber,
  ndvi_curve: z
    .array(ndviPointSchema)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  soil: soilSchema
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  provenance: z
    .array(provenanceSchema)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
});
export type Features = z.infer<typeof featuresResponseSchema>;

export type NdviPoint = { label: string | null; value: number | null };

export function normaliseNdviCurve(curve: Features["ndvi_curve"]): NdviPoint[] | null {
  if (!curve) return null;
  return curve.map((p, i) => {
    if (p === null) return { label: null, value: null };
    if (typeof p === "number") return { label: null, value: p };
    const value = typeof p.value === "number" ? p.value : typeof p.ndvi === "number" ? p.ndvi : null;
    const label =
      p.date ?? (p.month !== undefined ? String(p.month) : undefined) ?? p.period ?? null;
    return { label: label ?? `#${i + 1}`, value };
  });
}

/* ---------- POST /api/strategies ---------- */

export const sequenceItemSchema = z.object({
  crop: z.string(),
  month_start: z.number().int(),
  month_end: z.number().int(),
});
export type SequenceItem = z.infer<typeof sequenceItemSchema>;

export const breakdownSchema = z.object({
  criterion: z.string(),
  weight: nullableNumber,
  raw: nullableNumber,
  normalised: nullableNumber,
});
export type BreakdownItem = z.infer<typeof breakdownSchema>;

export const evidenceSchema = z.object({
  claim: z.string(),
  value: z
    .union([z.number(), z.string()])
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  dataset: nullableString,
  period: nullableString,
  resolution_m: nullableNumber,
});
export type EvidenceItem = z.infer<typeof evidenceSchema>;

export const strategySchema = z.object({
  id,
  rank: nullableNumber,
  name: z.string(),
  is_baseline: z.boolean(),
  blocked: z.boolean(),
  blocked_reason: nullableString,
  sequence: z.array(sequenceItemSchema),
  score: nullableNumber,
  breakdown: z
    .array(breakdownSchema)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  why: nullableString,
  benefits: stringList,
  tradeoffs: stringList,
  gaps: stringList,
  risks: stringList,
  evidence: z
    .array(evidenceSchema)
    .nullable()
    .optional()
    .transform((v) => (v === undefined ? null : v)),
  confidence: nullableNumber,
});
export type Strategy = z.infer<typeof strategySchema>;

export const strategiesResponseSchema = z.object({
  strategies: z.array(strategySchema),
});
export type StrategiesResponse = z.infer<typeof strategiesResponseSchema>;

/* ---------- Request ---------- */

export type PriorityKey = "water" | "soil" | "income" | "food" | "resilience";
export type Priorities = Record<PriorityKey, number>;

export type StrategyRequest = {
  field_id: string;
  priorities: Priorities;
  constraints: {
    water_source: string;
    seed_available: string[];
    labour: string;
    budget: string;
  };
};

export function formatZodIssues(error: z.ZodError): string[] {
  return error.issues.slice(0, 8).map((issue) => {
    const path = issue.path.length ? issue.path.join(".") : "(root)";
    return `${path}: ${issue.message}`;
  });
}
