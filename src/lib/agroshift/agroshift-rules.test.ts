import { describe, expect, it } from "vitest";

import { findDisplayCriterion, mapBreakdown } from "./criteria";
import { buildStrategyRequest, recentSeasonYears } from "./form";
import { closeRing, polygonsAreaHa, ringAreaM2 } from "./geo";
import { detectZeroBased, toSegments } from "./months";
import { normalisePriorities, priorityTotal } from "./priorities";
import { featuresResponseSchema, strategySchema, type Strategy } from "./schemas";
import { arrangeStrategies, isLowConfidence } from "./strategies";

const strategy = (over: Partial<Strategy>): Strategy =>
  strategySchema.parse({
    id: "x",
    name: "S",
    is_baseline: false,
    blocked: false,
    sequence: [],
    ...over,
  });

describe("priority normalisation", () => {
  it("keeps five equal sliders at 20 each", () => {
    expect(normalisePriorities({ water: 20, soil: 20, income: 20, food: 20, resilience: 20 })).toEqual({
      water: 20, soil: 20, income: 20, food: 20, resilience: 20,
    });
  });
  it("scales a total of 250 down to exactly 100", () => {
    const n = normalisePriorities({ water: 50, soil: 50, income: 50, food: 50, resilience: 50 })!;
    expect(priorityTotal(n)).toBe(100);
    expect(n.water).toBe(20);
  });
  it("uses whole numbers that still sum to 100 when shares are uneven", () => {
    const n = normalisePriorities({ water: 1, soil: 1, income: 1, food: 0, resilience: 0 })!;
    expect(n).toEqual({ water: 34, soil: 33, income: 33, food: 0, resilience: 0 });
  });
  it("refuses to normalise when every slider is zero", () => {
    expect(normalisePriorities({ water: 0, soil: 0, income: 0, food: 0, resilience: 0 })).toBeNull();
  });
});

describe("strategy request", () => {
  const field = { field_id: "F-12", farmer_code: null, community: null, ecotype: null, area_ha: null };
  it("sends the selected field id, normalised priorities and the chosen limits", () => {
    const r = buildStrategyRequest({
      field,
      priorities: { water: 40, soil: 40, income: 40, food: 40, resilience: 40 },
      constraints: { water_source: "rainfed", seed_available: ["Groundnut"], labour: "low", budget: "medium" },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.request.field_id).toBe("F-12");
      expect(r.request.priorities.water).toBe(20);
      expect(r.request.constraints).toEqual({ water_source: "rainfed", seed_available: ["Groundnut"], labour: "low", budget: "medium" });
    }
  });
  it("is not built when a hard limit is missing", () => {
    const r = buildStrategyRequest({
      field,
      priorities: { water: 20, soil: 20, income: 20, food: 20, resilience: 20 },
      constraints: { water_source: "", seed_available: ["Groundnut"], labour: "low", budget: "low" },
    });
    expect(r.ok).toBe(false);
  });
});

describe("missing data is never zero", () => {
  it("keeps absent feature values as null", () => {
    const f = featuresResponseSchema.parse({ field_id: "F-1", provenance: [] });
    expect(f.rainfall_total_mm).toBeNull();
    expect(f.hot_days_35).toBeNull();
    expect(f.soil).toBeNull();
  });
});

describe("strategy display order", () => {
  it("puts current practice first and a blocked alternative last, whatever its rank", () => {
    const list = [
      strategy({ id: "b", rank: 1, blocked: true, blocked_reason: "Needs irrigation" }),
      strategy({ id: "base", is_baseline: true }),
      strategy({ id: "a", rank: 2 }),
    ];
    const arranged = arrangeStrategies(list);
    expect(arranged.all.map((s) => s.strategy.id)).toEqual(["base", "a", "b"]);
    expect(arranged.alternatives.map((a) => a.label)).toEqual(["Option A", "Option B"]);
  });
  it("flags confidence below 3 as low", () => {
    expect(isLowConfidence(strategy({ confidence: 2 }))).toBe(true);
    expect(isLowConfidence(strategy({ confidence: 3 }))).toBe(false);
  });
});

describe("comparison criteria mapping", () => {
  it("maps water_demand to the water-demand row", () => {
    expect(findDisplayCriterion("Water demand")).toBe("water");
  });
  it("does not treat the 'water' priority criterion as water demand", () => {
    const m = mapBreakdown(strategy({ breakdown: [{ criterion: "water", weight: 0.2, raw: 1, normalised: 1 }] }));
    expect(m.rows.water).toBeNull();
    expect(m.other.map((o) => o.criterion)).toEqual(["water"]);
  });
});

describe("crop calendar months", () => {
  it("splits a November–February crop across the year end", () => {
    expect(toSegments({ crop: "Onion", month_start: 11, month_end: 2 }, false)).toEqual([
      { start: 10, end: 11 },
      { start: 0, end: 1 },
    ]);
  });
  it("treats a response containing 0 and no 12 as 0-based months", () => {
    expect(detectZeroBased([{ crop: "x", month_start: 0, month_end: 3 }])).toBe(true);
  });
});

describe("field area and seasons", () => {
  it("computes about 1 ha for a 100 m square near the equator", () => {
    const d = 100 / 111320;
    const ring = closeRing([[0, 0], [d, 0], [d, d], [0, d]]);
    expect(ringAreaM2(ring)).toBeGreaterThan(9900);
    expect(polygonsAreaHa([[ring]])).toBeCloseTo(1, 1);
  });
  it("labels the last three rainy seasons from November 2026 as 2024–2026", () => {
    expect(recentSeasonYears(new Date(2026, 10, 5))).toEqual([2024, 2025, 2026]);
  });
});
