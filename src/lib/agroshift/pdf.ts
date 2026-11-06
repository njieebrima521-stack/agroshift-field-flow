import { SHEET_FOOTER, type SheetContent } from "./farmer-sheet";
import { MONTHS, monthRangeLabel, toSegments } from "./months";

/**
 * Generates the one-page farmer sheet as a black-and-white friendly PDF.
 * jsPDF is loaded only when the farmer asks for the file.
 */
export async function downloadSheetPdf(c: SheetContent, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  const M = 14;
  const inner = W - M * 2;
  let y = M;

  const text = (t: string, size = 11, bold = false, gap = 1.5) => {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(t, inner) as string[];
    doc.text(lines, M, y + size * 0.35);
    y += lines.length * size * 0.42 + gap;
  };
  const heading = (t: string) => {
    y += 2;
    doc.setDrawColor(0);
    doc.setLineWidth(0.3);
    doc.line(M, y, W - M, y);
    y += 2;
    text(t, 12, true, 1);
  };
  const bullets = (items: string[], empty: string) => {
    if (items.length === 0) return text(empty, 10);
    items.forEach((it, i) => text(`${i + 1}. ${it}`, 10, false, 1));
  };

  text("AgroShift — Farmer sheet", 18, true, 1);
  text(`Prepared ${c.generatedOn} · No account, nothing saved online`, 9, false, 2);

  heading("Your field");
  c.fieldRows.forEach(([k, v]) => text(`${k}: ${v}`, 10, false, 0.5));
  text(`Last three seasons: ${c.cropHistory.join("; ")}`, 10, false, 1);

  heading(`Strategy: ${c.strategyLabel} — ${c.strategyName}`);
  if (c.isBaseline) text("This is what you do now. It is the reference point, not a recommendation.", 10, true);
  if (c.blockedReason) text(`BLOCKED: ${c.blockedReason}`, 10, true);
  text(`Sequence: ${c.sequence.map((s) => `${s.crop} (${monthRangeLabel(s, c.zeroBased)})`).join(" -> ")}`, 10);

  // Crop calendar bar: grey fills plus distinct hatch per crop, labelled.
  const barY = y + 1;
  const cell = inner / 12;
  const barH = 9;
  doc.setLineWidth(0.2);
  doc.setDrawColor(0);
  MONTHS.forEach((m, i) => {
    doc.rect(M + i * cell, barY, cell, barH);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(m, M + i * cell + cell / 2, barY + barH + 4, { align: "center" });
  });
  const greys = [225, 190, 245, 205, 170, 235];
  c.sequence.forEach((item, idx) => {
    const segs = toSegments(item, c.zeroBased);
    if (!segs) return;
    const g = greys[idx % greys.length] ?? 220;
    for (const seg of segs) {
      const x = M + seg.start * cell;
      const w = (seg.end - seg.start + 1) * cell;
      doc.setFillColor(g, g, g);
      doc.rect(x, barY, w, barH, "FD");
      if (idx % 2 === 1) {
        doc.setDrawColor(90);
        for (let hx = x; hx < x + w; hx += 2.5) doc.line(hx, barY + barH, Math.min(hx + barH * 0.6, x + w), barY);
        doc.setDrawColor(0);
      }
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      const label = doc.splitTextToSize(item.crop, w - 1)[0] as string;
      doc.setFillColor(255, 255, 255);
      doc.text(label, x + 1, barY + barH / 2 + 1.2);
    }
  });
  y = barY + barH + 8;

  heading("Three reasons it may suit your field");
  bullets(c.reasons, "No reasons were returned by the analysis.");
  if (c.reasonsNote) text(c.reasonsNote, 9);

  heading("Three cautions");
  bullets(c.cautions, "No cautions were returned by the analysis.");
  if (c.cautionsNote) text(c.cautionsNote, 9);

  heading("Where the evidence runs out");
  bullets(c.limitations, "No evidence limits were reported by the analysis.");
  text("Satellite data describes conditions around a field, not inside it.", 9);

  y = Math.max(y + 4, 280);
  doc.setLineWidth(0.3);
  doc.line(M, y - 3, W - M, y - 3);
  text(SHEET_FOOTER, 9, true, 0);

  doc.save(filename);
}
