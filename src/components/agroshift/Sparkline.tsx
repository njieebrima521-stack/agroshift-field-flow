import type { NdviPoint } from "@/lib/agroshift/schemas";

/** Lightweight SVG line for the NDVI curve. Missing points break the line rather than drop to zero. */
export function Sparkline({ points, label }: { points: NdviPoint[]; label: string }) {
  const values = points.map((p) => p.value).filter((v): v is number => v !== null);
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const W = 300;
  const H = 90;
  const pad = 6;
  const x = (i: number) => pad + (i / Math.max(1, points.length - 1)) * (W - pad * 2);
  const y = (v: number) => H - pad - ((v - min) / span) * (H - pad * 2);

  const segments: string[] = [];
  let current = "";
  points.forEach((p, i) => {
    if (p.value === null) {
      if (current) segments.push(current);
      current = "";
      return;
    }
    current += `${current ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)} `;
  });
  if (current) segments.push(current);

  const first = points[0]?.label;
  const last = points[points.length - 1]?.label;

  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-24 w-full" role="img" aria-label={label} preserveAspectRatio="none">
        <line x1={pad} x2={W - pad} y1={y(min)} y2={y(min)} className="stroke-border" strokeWidth="1" />
        <line x1={pad} x2={W - pad} y1={y(max)} y2={y(max)} className="stroke-border" strokeWidth="1" />
        {segments.map((d) => (
          <path key={d} d={d} className="fill-none stroke-primary" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
        ))}
      </svg>
      <figcaption className="mt-1 flex justify-between text-sm text-muted-foreground">
        <span>{first ?? "start"}</span>
        <span>
          range {min.toFixed(2)}–{max.toFixed(2)}
        </span>
        <span>{last ?? "end"}</span>
      </figcaption>
    </figure>
  );
}
