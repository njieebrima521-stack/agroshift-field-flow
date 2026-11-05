import type { BreakdownItem, Strategy } from "./schemas";

/**
 * The six comparison-table rows and the backend criterion names that map to each.
 * Matching is exact on a normalised name (lower-case, underscores). Anything not
 * listed is shown separately as "other criteria" — never silently merged.
 */
export const DISPLAY_CRITERIA = [
  {
    key: "water",
    label: "Water demand",
    accepts: ["water_demand", "seasonal_water_demand", "water_use", "water_requirement"],
  },
  { key: "soil", label: "Soil health", accepts: ["soil_health", "soil"] },
  {
    key: "nitrogen",
    label: "Nitrogen contribution",
    accepts: ["nitrogen", "nitrogen_contribution", "nitrogen_control", "n_fixation", "nitrogen_balance"],
  },
  {
    key: "erosion",
    label: "Erosion control",
    accepts: ["erosion", "erosion_control", "erosion_risk", "ground_cover"],
  },
  {
    key: "income",
    label: "Income potential",
    accepts: ["income", "income_potential", "gross_margin"],
  },
  {
    key: "labour",
    label: "Labour fit",
    accepts: ["labour", "labor", "labour_fit", "labor_fit", "labour_demand"],
  },
] as const;

export type DisplayCriterionKey = (typeof DISPLAY_CRITERIA)[number]["key"];

export function normaliseCriterionName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

export function findDisplayCriterion(name: string): DisplayCriterionKey | null {
  const n = normaliseCriterionName(name);
  for (const c of DISPLAY_CRITERIA) {
    if ((c.accepts as readonly string[]).includes(n)) return c.key;
  }
  return null;
}

export type MappedBreakdown = {
  rows: Record<DisplayCriterionKey, BreakdownItem | null>;
  other: BreakdownItem[];
};

export function mapBreakdown(strategy: Strategy): MappedBreakdown {
  const rows = Object.fromEntries(DISPLAY_CRITERIA.map((c) => [c.key, null])) as Record<
    DisplayCriterionKey,
    BreakdownItem | null
  >;
  const other: BreakdownItem[] = [];
  for (const item of strategy.breakdown ?? []) {
    const key = findDisplayCriterion(item.criterion);
    if (key && rows[key] === null) rows[key] = item;
    else other.push(item);
  }
  return { rows, other };
}
