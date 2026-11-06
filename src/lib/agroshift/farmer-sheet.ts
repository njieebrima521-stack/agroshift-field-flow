import { seasonCropName, seasonSecondName, type SessionState } from "./form";
import { formatHa } from "./geo";
import { monthRangeLabel } from "./months";
import type { SequenceItem } from "./schemas";
import { isLowConfidence, type LabelledStrategy } from "./strategies";

export const SHEET_FOOTER =
  "This supports your judgement. It does not replace your own experience or local agricultural advice.";

export type SheetContent = {
  generatedOn: string;
  fieldRows: Array<[string, string]>;
  cropHistory: string[];
  strategyLabel: string;
  strategyName: string;
  isBaseline: boolean;
  blockedReason: string | null;
  sequence: SequenceItem[];
  zeroBased: boolean;
  reasons: string[];
  reasonsNote: string | null;
  cautions: string[];
  cautionsNote: string | null;
  limitations: string[];
  confidence: number | null;
};

/** Assemble the one-page sheet strictly from session inputs and the returned strategy. */
export function buildSheet(state: SessionState, item: LabelledStrategy, zeroBased: boolean, now = new Date()): SheetContent {
  const f = state.field;
  const s = item.strategy;
  const fieldRows: Array<[string, string]> = [
    ["Field", f ? `${f.field_id}${state.details.fieldName ? ` (${state.details.fieldName})` : ""}` : "Not selected"],
    ["Community", f?.community ?? "Not recorded"],
    ["Farming zone", f?.ecotype ?? "Not recorded"],
    ["Area", f?.area_ha !== null && f?.area_ha !== undefined ? `${formatHa(f.area_ha)} ha (recorded)` : "Not recorded"],
  ];
  const cropHistory = state.details.seasons.map((season) => {
    const main = seasonCropName(season) || "not given";
    const second = seasonSecondName(season);
    return `${season.year}: ${main}${second && second !== "None" ? ` + ${second}` : ""}`;
  });

  const reasons = [...(s.benefits ?? [])].slice(0, 3);
  if (reasons.length < 3 && s.why) reasons.unshift(s.why);
  const finalReasons = reasons.slice(0, 3);
  const cautions = [...(s.tradeoffs ?? []), ...(s.risks ?? [])].slice(0, 3);

  const limitations = [...(s.gaps ?? [])].slice(0, 4);
  if (isLowConfidence(s)) limitations.unshift(`Low confidence (${s.confidence}): discuss with a local extension officer before planting.`);
  if (s.confidence === null) limitations.push("No confidence value was returned for this strategy.");

  return {
    generatedOn: now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }),
    fieldRows,
    cropHistory,
    strategyLabel: item.label,
    strategyName: s.name,
    isBaseline: item.role === "baseline",
    blockedReason: s.blocked ? s.blocked_reason ?? "Blocked by your limits (no reason given)." : null,
    sequence: s.sequence,
    zeroBased,
    reasons: finalReasons,
    reasonsNote: finalReasons.length < 3 ? `Only ${finalReasons.length} reason(s) were returned by the analysis.` : null,
    cautions,
    cautionsNote: cautions.length < 3 ? `Only ${cautions.length} caution(s) were returned by the analysis.` : null,
    limitations,
    confidence: s.confidence,
  };
}

export function sheetToText(c: SheetContent): string {
  const lines = [
    "AgroShift — Farmer sheet",
    `Prepared ${c.generatedOn}`,
    "",
    ...c.fieldRows.map(([k, v]) => `${k}: ${v}`),
    `Last three seasons: ${c.cropHistory.join("; ")}`,
    "",
    `Strategy: ${c.strategyLabel} — ${c.strategyName}${c.isBaseline ? " (current practice, reference only)" : ""}`,
    ...(c.blockedReason ? [`BLOCKED: ${c.blockedReason}`] : []),
    `Sequence: ${c.sequence.map((s) => `${s.crop} (${monthRangeLabel(s, c.zeroBased)})`).join(" → ")}`,
    "",
    "Reasons:",
    ...c.reasons.map((r) => `- ${r}`),
    ...(c.reasonsNote ? [c.reasonsNote] : []),
    "",
    "Cautions:",
    ...c.cautions.map((r) => `- ${r}`),
    ...(c.cautionsNote ? [c.cautionsNote] : []),
    "",
    "Evidence limits:",
    ...(c.limitations.length ? c.limitations.map((r) => `- ${r}`) : ["- None reported by the analysis."]),
    "",
    SHEET_FOOTER,
  ];
  return lines.join("\n");
}
