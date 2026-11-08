import type { SequenceItem } from "./schemas";

export const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * The contract does not state whether months are 1–12 or 0–11.
 * We assume 1–12 (January = 1). If any value in the response is 0 and none is 12,
 * the whole response is treated as 0–11.
 */
export function detectZeroBased(items: SequenceItem[]): boolean {
  const values = items.flatMap((i) => [i.month_start, i.month_end]);
  return values.includes(0) && !values.includes(12);
}

export type MonthSegment = { start: number; end: number }; // 0-based, inclusive

/** Convert one sequence item into 0-based month segments, splitting ranges that wrap past December. */
export function toSegments(item: SequenceItem, zeroBased: boolean): MonthSegment[] | null {
  const offset = zeroBased ? 0 : 1;
  const s = item.month_start - offset;
  const e = item.month_end - offset;
  if (![s, e].every((m) => Number.isInteger(m) && m >= 0 && m <= 11)) return null;
  if (s <= e) return [{ start: s, end: e }];
  return [
    { start: s, end: 11 },
    { start: 0, end: e },
  ];
}

export function monthRangeLabel(item: SequenceItem, zeroBased: boolean): string {
  const seg = toSegments(item, zeroBased);
  if (!seg) return `months ${item.month_start}–${item.month_end} (invalid range)`;
  const first = seg[0]?.start ?? 0;
  const last = seg[seg.length - 1]?.end ?? first;
  return first === last ? (MONTHS[first] ?? "") : `${MONTHS[first] ?? ""}–${MONTHS[last] ?? ""}`;
}
