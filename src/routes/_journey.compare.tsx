import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Copy, Download, Loader2, Printer, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { ComparisonTable } from "@/components/agroshift/ComparisonTable";
import { FarmerSheetPrint } from "@/components/agroshift/FarmerSheetPrint";
import { Card, FieldLabel, NativeSelect } from "@/components/agroshift/form-controls";
import { Notice } from "@/components/agroshift/Notice";
import { RequireAnalysis } from "@/components/agroshift/RequireField";
import { TradeoffScatter } from "@/components/agroshift/TradeoffScatter";
import { Button } from "@/components/ui/button";
import { buildSheet, sheetToText } from "@/lib/agroshift/farmer-sheet";
import { detectZeroBased } from "@/lib/agroshift/months";
import { arrangeStrategies } from "@/lib/agroshift/strategies";
import { useSession } from "@/lib/agroshift/session";

export const Route = createFileRoute("/_journey/compare")({
  head: () => ({
    meta: [
      { title: "Compare & Take Away — AgroShift" },
      { name: "description", content: "Compare all three strategies, see the water versus soil-health trade-off, and download your farmer sheet." },
      { property: "og:title", content: "Compare & Take Away — AgroShift" },
      { property: "og:description", content: "Leave with a printed page or PDF — no account needed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ComparePage,
});

function ComparePage() {
  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader step="Step 7 of 7" title="Compare & Take Away" subtitle="See the full comparison and keep a one-page summary" />
      <RequireAnalysis>
        <CompareBody />
      </RequireAnalysis>
    </div>
  );
}

function CompareBody() {
  const { state, update } = useSession();
  const list = state.analysis!.strategies.strategies;
  const arranged = arrangeStrategies(list);
  const zeroBased = detectZeroBased(list.flatMap((s) => s.sequence));
  const topAlternative = arranged.alternatives.find((a) => !a.strategy.blocked) ?? null;

  const chosen =
    arranged.all.find((a) => a.strategy.id === state.sheetStrategyId) ?? topAlternative ?? arranged.baseline ?? arranged.all[0] ?? null;

  const [pdfState, setPdfState] = useState<"idle" | "working" | "done" | "error">("idle");
  const [canShare, setCanShare] = useState(false);
  useEffect(() => setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  if (!chosen) {
    return <Notice tone="warning">No strategies were returned, so there is nothing to compare.</Notice>;
  }
  const sheet = buildSheet(state, chosen, zeroBased);
  const filename = `agroshift-field-${state.field?.field_id ?? "sheet"}-${chosen.short.toLowerCase()}.pdf`.replace(/[^a-z0-9.-]+/gi, "-");

  async function onDownload() {
    setPdfState("working");
    try {
      const { downloadSheetPdf } = await import("@/lib/agroshift/pdf");
      await downloadSheetPdf(sheet, filename);
      setPdfState("done");
      toast.success("Farmer sheet downloaded", { description: filename });
    } catch (err) {
      console.error("[AgroShift] PDF generation failed", err);
      setPdfState("error");
    }
  }

  function onPrint() {
    try {
      window.print();
    } catch (err) {
      console.error("[AgroShift] print failed", err);
      toast.error("Printing is not available here. Download the PDF instead.");
    }
  }

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(sheetToText(sheet));
      toast.success("Summary copied", { description: "Paste it into a message or note." });
    } catch {
      toast.error("Could not copy on this device. Download the PDF instead.");
    }
  }

  async function onShare() {
    try {
      await navigator.share({ title: "AgroShift farmer sheet", text: sheetToText(sheet) });
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") toast.error("Sharing did not work. Try “Copy summary” instead.");
    }
  }

  return (
    <>
      <div className="no-print space-y-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
          <Card>
            <h2 className="mb-4 text-2xl font-bold">Strategic comparison</h2>
            <ComparisonTable items={arranged.all} />
          </Card>
          <Card>
            <h2 className="mb-4 text-2xl font-bold">Trade-off view</h2>
            <TradeoffScatter items={arranged.all} />
          </Card>
        </div>

        {topAlternative && (
          <Notice tone="info" title={`The analysis ranked ${topAlternative.label} first among options you can use`}>
            <p>
              {topAlternative.strategy.name}
              {topAlternative.strategy.why ? ` — ${topAlternative.strategy.why}` : ""}
            </p>
          </Notice>
        )}

        <Card>
          <h2 className="text-2xl font-bold">Take it with you</h2>
          <p className="mt-1 text-base text-muted-foreground">The one-page sheet is designed for printing in black and white.</p>
          <div className="mt-4 max-w-md">
            <FieldLabel htmlFor="sheet-strategy">Strategy on the sheet</FieldLabel>
            <NativeSelect id="sheet-strategy" value={chosen.strategy.id} onChange={(e) => update({ sheetStrategyId: e.target.value })}>
              {arranged.all.map((a) => (
                <option key={a.strategy.id} value={a.strategy.id}>
                  {a.label} — {a.strategy.name}
                  {a.strategy.blocked ? " (blocked)" : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Button onClick={onDownload} disabled={pdfState === "working"}>
              {pdfState === "working" ? <Loader2 className="animate-spin" aria-hidden /> : <Download aria-hidden />}
              {pdfState === "working" ? "Making your PDF…" : "Download farmer sheet (PDF)"}
            </Button>
            <Button variant="outline" onClick={onPrint}>
              <Printer aria-hidden /> Print
            </Button>
            <Button variant="outline" onClick={onCopy}>
              <Copy aria-hidden /> Copy summary
            </Button>
            {canShare && (
              <Button variant="outline" onClick={onShare}>
                <Share2 aria-hidden /> Share summary
              </Button>
            )}
          </div>
          <div className="mt-4" aria-live="polite">
            {pdfState === "done" && <Notice tone="success">Your PDF was created and downloaded as {filename}.</Notice>}
            {pdfState === "error" && (
              <Notice tone="error" role="alert" actions={<Button variant="outline" onClick={onPrint}>Print instead</Button>}>
                The PDF could not be created on this device. Try again, or use Print and choose “Save as PDF”.
              </Notice>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Nothing is saved to an account or online. The sheet is made on this device from this session only.
          </p>
        </Card>

        <StepNav
          back={
            <Button asChild variant="outline">
              <Link to="/options">
                <ArrowLeft aria-hidden /> Back to options
              </Link>
            </Button>
          }
        />
      </div>
      <FarmerSheetPrint content={sheet} />
    </>
  );
}
