import type { Priorities, PriorityKey } from "./schemas";

export const PRIORITY_KEYS: PriorityKey[] = ["water", "soil", "income", "food", "resilience"];

export function priorityTotal(p: Priorities): number {
  return PRIORITY_KEYS.reduce((sum, k) => sum + (Number.isFinite(p[k]) ? p[k] : 0), 0);
}

/**
 * Scale the five slider values so they sum to exactly 100 (whole numbers),
 * using the largest-remainder method. Returns null when every value is zero,
 * because there is nothing to scale.
 * This only rescales the farmer's own inputs; it is not scoring.
 */
export function normalisePriorities(p: Priorities): Priorities | null {
  const clean = PRIORITY_KEYS.map((k) => Math.max(0, Number.isFinite(p[k]) ? p[k] : 0));
  const total = clean.reduce((a, b) => a + b, 0);
  if (total <= 0) return null;

  const exact = clean.map((v) => (v / total) * 100);
  const floors = exact.map(Math.floor);
  let remaining = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((v, i) => ({ i, rem: v - Math.floor(v) }))
    .sort((a, b) => b.rem - a.rem || a.i - b.i);
  for (const { i } of order) {
    if (remaining <= 0) break;
    floors[i] = (floors[i] ?? 0) + 1;
    remaining -= 1;
  }
  return Object.fromEntries(PRIORITY_KEYS.map((k, i) => [k, floors[i] ?? 0])) as Priorities;
}
