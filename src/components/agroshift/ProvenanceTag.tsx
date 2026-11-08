import { AlertTriangle, Database } from "lucide-react";

import { formatResolution, isModelled } from "@/lib/agroshift/provenance";
import type { Provenance } from "@/lib/agroshift/schemas";
import { cn } from "@/lib/utils";

export function ProvenanceTag({ provenance, className }: { provenance: Provenance | null; className?: string }) {
  if (!provenance) {
    return (
      <p className={cn("flex items-start gap-1.5 text-sm font-medium text-warning-foreground", className)}>
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        Source, resolution and period were not supplied for this value.
      </p>
    );
  }
  const modelled = isModelled(provenance);
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 text-sm", className)} aria-label="Data source">
      <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 font-semibold text-foreground">
        <Database className="size-3.5" aria-hidden />
        {provenance.dataset}
      </span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{formatResolution(provenance.resolution_m)}</span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-muted-foreground">{provenance.period ?? "period not stated"}</span>
      <span
        className={cn(
          "rounded-md border px-2 py-0.5 font-semibold",
          modelled ? "border-highlight/50 text-highlight-text" : "border-primary/40 text-primary-strong",
        )}
      >
        {modelled ? (provenance.type.toLowerCase() === "modelled" ? "Modelled" : `Modelled (${provenance.type})`) : "Observed"}
      </span>
    </div>
  );
}
