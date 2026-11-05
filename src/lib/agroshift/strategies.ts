import type { Strategy } from "./schemas";

export type LabelledStrategy = {
  strategy: Strategy;
  label: string; // "Current practice" | "Option A" | "Option B" ...
  short: string; // "Current" | "A" | "B"
  role: "baseline" | "alternative";
};

export type ArrangedStrategies = {
  baseline: LabelledStrategy | null;
  alternatives: LabelledStrategy[];
  all: LabelledStrategy[];
  notes: string[];
};

/**
 * Display order only: baseline first, then unblocked alternatives in the rank order
 * supplied by the backend, then blocked alternatives last. No ranking is computed here.
 */
export function arrangeStrategies(list: Strategy[]): ArrangedStrategies {
  const notes: string[] = [];
  const baselines = list.filter((s) => s.is_baseline);
  if (baselines.length === 0) notes.push("The analysis did not return a current-practice strategy.");
  if (baselines.length > 1)
    notes.push(`The analysis marked ${baselines.length} strategies as current practice; the first is shown.`);

  const baseline = baselines[0] ?? null;
  const rest = list.filter((s) => s !== baseline);
  const byRank = (a: Strategy, b: Strategy) => {
    if (a.rank === null && b.rank === null) return 0;
    if (a.rank === null) return 1;
    if (b.rank === null) return -1;
    return a.rank - b.rank;
  };
  const open = rest.filter((s) => !s.blocked).sort(byRank);
  const blocked = rest.filter((s) => s.blocked).sort(byRank);
  const ordered = [...open, ...blocked];
  if (ordered.length !== 2) {
    notes.push(`Expected two alternatives; the analysis returned ${ordered.length}.`);
  }

  const alternatives: LabelledStrategy[] = ordered.map((s, i) => {
    const letter = String.fromCharCode(65 + i);
    return { strategy: s, label: `Option ${letter}`, short: letter, role: "alternative" };
  });
  const base: LabelledStrategy | null = baseline
    ? { strategy: baseline, label: "Current practice", short: "Current", role: "baseline" }
    : null;
  return {
    baseline: base,
    alternatives,
    all: base ? [base, ...alternatives] : alternatives,
    notes,
  };
}

/** The confidence threshold below which the strategy detail shows an amber warning. */
export const LOW_CONFIDENCE_THRESHOLD = 3;

export function isLowConfidence(s: Strategy): boolean {
  return s.confidence !== null && s.confidence < LOW_CONFIDENCE_THRESHOLD;
}
