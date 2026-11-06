import { SHEET_FOOTER, type SheetContent } from "@/lib/agroshift/farmer-sheet";

import { SequenceBar } from "./SequenceBar";

/** Print-only one-page sheet. Hidden on screen; shown by the print stylesheet. */
export function FarmerSheetPrint({ content: c }: { content: SheetContent }) {
  return (
    <div className="print-only text-foreground" aria-hidden>
      <h1 className="text-2xl font-bold">AgroShift — Farmer sheet</h1>
      <p className="text-sm">Prepared {c.generatedOn}</p>

      <h2 className="mt-4 border-t border-foreground pt-2 text-lg font-bold">Your field</h2>
      <dl className="grid grid-cols-2 gap-x-6 text-sm">
        {c.fieldRows.map(([k, v]) => (
          <div key={k}>
            <dt className="inline font-semibold">{k}: </dt>
            <dd className="inline">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-1 text-sm">
        <strong>Last three seasons:</strong> {c.cropHistory.join("; ")}
      </p>

      <h2 className="mt-4 border-t border-foreground pt-2 text-lg font-bold">
        Strategy: {c.strategyLabel} — {c.strategyName}
      </h2>
      {c.isBaseline && <p className="text-sm font-semibold">This is what you do now. It is the reference point, not a recommendation.</p>}
      {c.blockedReason && <p className="text-sm font-semibold">BLOCKED: {c.blockedReason}</p>}
      <SequenceBar sequence={c.sequence} zeroBased={c.zeroBased} className="mt-2" />

      <h2 className="mt-4 border-t border-foreground pt-2 text-lg font-bold">Three reasons it may suit your field</h2>
      <ol className="list-decimal pl-5 text-sm">
        {c.reasons.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {c.reasonsNote && <p className="text-sm italic">{c.reasonsNote}</p>}

      <h2 className="mt-4 border-t border-foreground pt-2 text-lg font-bold">Three cautions</h2>
      <ol className="list-decimal pl-5 text-sm">
        {c.cautions.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {c.cautionsNote && <p className="text-sm italic">{c.cautionsNote}</p>}

      <h2 className="mt-4 border-t border-foreground pt-2 text-lg font-bold">Where the evidence runs out</h2>
      <ul className="list-disc pl-5 text-sm">
        {c.limitations.length ? c.limitations.map((r) => <li key={r}>{r}</li>) : <li>No evidence limits were reported by the analysis.</li>}
        <li>Satellite data describes conditions around a field, not inside it.</li>
      </ul>

      <p className="mt-6 border-t border-foreground pt-2 text-sm font-bold">{SHEET_FOOTER}</p>
    </div>
  );
}
