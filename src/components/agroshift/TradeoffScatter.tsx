import { mapBreakdown } from "@/lib/agroshift/criteria";
import type { LabelledStrategy } from "@/lib/agroshift/strategies";

type Point = { item: LabelledStrategy; x: number; y: number };

/**
 * Water demand (x, raw value from the analysis) against soil-health score
 * (y, normalised value from the analysis). Only backend values are plotted.
 */
export function TradeoffScatter({ items }: { items: LabelledStrategy[] }) {
  const points: Point[] = [];
  const missing: string[] = [];
  for (const item of items) {
    const rows = mapBreakdown(item.strategy).rows;
    const x = rows.water?.raw ?? null;
    const y = rows.soil?.normalised ?? null;
    if (x === null || y === null) {
      const parts = [x === null && "water demand", y === null && "soil-health score"].filter(Boolean).join(" and ");
      missing.push(`${item.label}: ${parts} not returned`);
    } else points.push({ item, x, y });
  }

  if (points.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-surface p-4 text-base">
        <p className="font-semibold">The trade-off chart cannot be drawn</p>
        <p className="mt-1 text-muted-foreground">
          It needs a “water_demand” value and a “soil_health” score for each strategy from the analysis.
        </p>
        <ul className="mt-2 list-disc pl-5 text-muted-foreground">
          {missing.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      </div>
    );
  }

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const pad = (lo: number, hi: number) => {
    const span = hi - lo || Math.abs(hi) || 1;
    return [lo - span * 0.15, hi + span * 0.15] as const;
  };
  const [x0, x1] = pad(Math.min(...xs), Math.max(...xs));
  const [y0, y1] = pad(Math.min(...ys), Math.max(...ys));
  const W = 420;
  const H = 300;
  const L = 72;
  const B = 50;
  const T = 16;
  const R = 16;
  const sx = (v: number) => L + ((v - x0) / (x1 - x0)) * (W - L - R);
  const sy = (v: number) => H - B - ((v - y0) / (y1 - y0)) * (H - B - T);
  const fmt = (v: number) => (Math.abs(v) >= 100 ? v.toFixed(0) : v.toFixed(2));

  const shape = (p: Point) => {
    const cx = sx(p.x);
    const cy = sy(p.y);
    if (p.item.role === "baseline")
      return <rect x={cx - 7} y={cy - 7} width={14} height={14} className="fill-background stroke-foreground" strokeWidth={3} />;
    if (p.item.short === "A") return <circle cx={cx} cy={cy} r={8} className="fill-primary stroke-foreground" strokeWidth={1.5} />;
    return <polygon points={`${cx},${cy - 9} ${cx + 9},${cy + 7} ${cx - 9},${cy + 7}`} className="fill-highlight stroke-foreground" strokeWidth={1.5} />;
  };

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Trade-off chart: ${points.map((p) => `${p.item.label} water demand ${fmt(p.x)}, soil health ${fmt(p.y)}`).join("; ")}`}>
        <line x1={L} y1={H - B} x2={W - R} y2={H - B} className="stroke-foreground" strokeWidth={1.5} />
        <line x1={L} y1={T} x2={L} y2={H - B} className="stroke-foreground" strokeWidth={1.5} />
        {[x0, (x0 + x1) / 2, x1].map((v) => (
          <text key={`x${v}`} x={sx(v)} y={H - B + 20} textAnchor="middle" className="fill-muted-foreground" fontSize={14}>
            {fmt(v)}
          </text>
        ))}
        {[y0, (y0 + y1) / 2, y1].map((v) => (
          <text key={`y${v}`} x={L - 8} y={sy(v) + 5} textAnchor="end" className="fill-muted-foreground" fontSize={14}>
            {fmt(v)}
          </text>
        ))}
        <text x={(L + W - R) / 2} y={H - 6} textAnchor="middle" className="fill-foreground" fontSize={14} fontWeight={600}>
          Seasonal water demand →
        </text>
        <text x={16} y={(T + H - B) / 2} textAnchor="middle" transform={`rotate(-90 16 ${(T + H - B) / 2})`} className="fill-foreground" fontSize={14} fontWeight={600}>
          Soil-health score →
        </text>
        {points.map((p) => (
          <g key={p.item.strategy.id}>
            {shape(p)}
            <text
              x={sx(p.x) > W * 0.6 ? sx(p.x) - 12 : sx(p.x) + 12}
              y={sy(p.y) - 12}
              textAnchor={sx(p.x) > W * 0.6 ? "end" : "start"}
              className="fill-foreground"
              fontSize={14}
              fontWeight={700}
            >
              {p.item.short === "Current" ? "Current" : `Option ${p.item.short}`}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="mt-2 text-sm text-muted-foreground">
        Values as returned by the analysis: water demand uses the raw value, soil health the normalised score. Square = current,
        circle = Option A, triangle = Option B.
        {missing.length > 0 && <span className="block font-medium text-warning-foreground">Not plotted — {missing.join("; ")}.</span>}
      </figcaption>
    </figure>
  );
}
