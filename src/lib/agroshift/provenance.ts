import type { Provenance } from "./schemas";

export type FeatureMetric =
  | "rainfall_total_mm"
  | "dry_spell_days"
  | "hot_days_35"
  | "smap_departure"
  | "ndvi_curve"
  | "soil";

/**
 * Provenance entries are matched to displayed values by their `variable` name.
 * Exact match first, then these explicit aliases (normalised, exact). No fuzzy matching.
 */
const ALIASES: Record<FeatureMetric, string[]> = {
  rainfall_total_mm: ["rainfall_total_mm", "rainfall_total", "rainfall", "precipitation", "prectotcorr", "precip"],
  dry_spell_days: ["dry_spell_days", "dry_spells", "dry_spell", "rainfall", "precipitation", "prectotcorr"],
  hot_days_35: ["hot_days_35", "hot_days", "t2m_max", "tmax", "temperature_max", "temperature"],
  smap_departure: ["smap_departure", "soil_moisture_departure", "soil_moisture", "smap", "sm_anomaly"],
  ndvi_curve: ["ndvi_curve", "ndvi"],
  soil: ["soil", "clay_pct", "ph", "soc_g_kg", "soil_properties"],
};

const norm = (s: string) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

export function findProvenance(list: Provenance[] | null, metric: FeatureMetric): Provenance | null {
  if (!list || list.length === 0) return null;
  const exact = list.find((p) => norm(p.variable) === metric);
  if (exact) return exact;
  for (const alias of ALIASES[metric]) {
    const hit = list.find((p) => norm(p.variable) === alias);
    if (hit) return hit;
  }
  return null;
}

export function isModelled(p: Provenance | null): boolean {
  if (!p) return false;
  const t = norm(p.type);
  return t !== "observed";
}

export function formatResolution(m: number | null): string {
  if (m === null) return "resolution not stated";
  if (m >= 1000) return `~${(m / 1000).toFixed(m >= 10_000 ? 0 : 1)} km grid`;
  return `${Math.round(m)} m grid`;
}
