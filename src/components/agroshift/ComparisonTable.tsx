import { DISPLAY_CRITERIA, mapBreakdown } from "@/lib/agroshift/criteria";
import type { BreakdownItem } from "@/lib/agroshift/schemas";
import type { LabelledStrategy } from "@/lib/agroshift/strategies";

function Cell({ item }: { item: BreakdownItem | null }) {
  if (!item) return <span className="text-sm text-muted-foreground">Not returned</span>;
  const primary = item.normalised ?? item.raw;
  return (
    <div>
      <span className="text-base font-semibold tabular-nums">{primary === null ? "—" : primary}</span>
      {item.normalised !== null && item.raw !== null && (
        <span className="block text-sm text-muted-foreground tabular-nums">raw {item.raw}</span>
      )}
    </div>
  );
}

/** Six-criterion comparison. Values are shown exactly as returned; nothing is scored here. */
export function ComparisonTable({ items }: { items: LabelledStrategy[] }) {
  const mapped = items.map((i) => ({ item: i, ...mapBreakdown(i.strategy) }));
  const otherNames = Array.from(new Set(mapped.flatMap((m) => m.other.map((o) => o.criterion))));

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[34rem] text-left">
          <caption className="sr-only">Comparison of strategies across six criteria</caption>
          <thead className="bg-primary-soft text-primary-strong">
            <tr>
              <th scope="col" className="px-4 py-3 text-base font-semibold">
                Criterion
              </th>
              {items.map((i) => (
                <th key={i.strategy.id} scope="col" className="px-4 py-3 text-base font-semibold">
                  {i.role === "baseline" ? "Current" : i.label}
                  {i.strategy.blocked && <span className="block text-sm font-medium text-blocked">Blocked</span>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {DISPLAY_CRITERIA.map((c) => {
              const sourceNames = Array.from(new Set(mapped.map((m) => m.rows[c.key]?.criterion).filter(Boolean)));
              return (
                <tr key={c.key} className="border-t border-border">
                  <th scope="row" className="px-4 py-3 text-base font-medium">
                    {c.label}
                    <span className="block text-sm font-normal text-muted-foreground">
                      {sourceNames.length ? `from “${sourceNames.join("”, “")}”` : "not in the analysis"}
                    </span>
                  </th>
                  {mapped.map((m) => (
                    <td key={m.item.strategy.id} className="px-4 py-3 align-top">
                      <Cell item={m.rows[c.key]} />
                    </td>
                  ))}
                </tr>
              );
            })}
            {otherNames.map((name) => (
              <tr key={name} className="border-t border-border bg-surface">
                <th scope="row" className="px-4 py-3 text-base font-medium">
                  {name}
                  <span className="block text-sm font-normal text-muted-foreground">other criterion from the analysis</span>
                </th>
                {mapped.map((m) => (
                  <td key={m.item.strategy.id} className="px-4 py-3 align-top">
                    <Cell item={m.other.find((o) => o.criterion === name) ?? null} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted-foreground">
        Main number is the normalised value from the analysis, with the raw value underneath. How “good” a number is depends
        on the criterion — check the strategy detail for the explanation.
      </p>
    </div>
  );
}
