import { MONTHS, monthRangeLabel, toSegments } from "@/lib/agroshift/months";
import type { SequenceItem } from "@/lib/agroshift/schemas";
import { cn } from "@/lib/utils";

const PATTERNS = [
  "crop-pattern-1",
  "crop-pattern-2",
  "crop-pattern-3",
  "crop-pattern-4",
  "crop-pattern-5",
  "crop-pattern-6",
];

/** Stable pattern per crop name so the same crop looks the same on every card. */
export function cropPatternClass(crop: string): string {
  let h = 0;
  for (const ch of crop.trim().toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PATTERNS[h % PATTERNS.length] ?? "crop-pattern-1";
}

type Placed = { item: SequenceItem; start: number; end: number; lane: number };

function layout(sequence: SequenceItem[], zeroBased: boolean) {
  const placed: Placed[] = [];
  const invalid: SequenceItem[] = [];
  const lanes: Array<Array<[number, number]>> = [];
  for (const item of sequence) {
    const segs = toSegments(item, zeroBased);
    if (!segs) {
      invalid.push(item);
      continue;
    }
    for (const seg of segs) {
      let lane = lanes.findIndex((l) => l.every(([s, e]) => seg.end < s || seg.start > e));
      if (lane === -1) {
        lanes.push([]);
        lane = lanes.length - 1;
      }
      lanes[lane]!.push([seg.start, seg.end]);
      placed.push({ item, start: seg.start, end: seg.end, lane });
    }
  }
  return { placed, invalid, laneCount: Math.max(1, lanes.length) };
}

export function SequenceBar({
  sequence,
  zeroBased,
  showLegend = true,
  compact = false,
  className,
}: {
  sequence: SequenceItem[];
  zeroBased: boolean;
  showLegend?: boolean;
  compact?: boolean;
  className?: string | undefined;
}) {
  if (sequence.length === 0) {
    return <p className="text-base text-muted-foreground">No crop sequence was returned for this strategy.</p>;
  }
  const { placed, invalid, laneCount } = layout(sequence, zeroBased);
  const description = sequence.map((s) => `${s.crop} ${monthRangeLabel(s, zeroBased)}`).join("; ");

  return (
    <div className={className}>
      <div role="img" aria-label={`12-month crop calendar: ${description}`}>
        <div
          className="relative grid grid-cols-12 gap-y-1 rounded-lg border border-border bg-surface p-1"
          style={{ gridTemplateRows: `repeat(${laneCount}, 2.25rem)` }}
        >
          {MONTHS.map((m, i) => (
            <div
              key={m}
              aria-hidden
              className={cn("pointer-events-none border-border", i > 0 && "border-l")}
              style={{ gridColumn: i + 1, gridRow: `1 / span ${laneCount}` }}
            />
          ))}
          {placed.map((p, idx) => (
            <div
              key={`${p.item.crop}-${idx}`}
              className={cn(
                "z-[1] mx-px flex min-w-0 items-center overflow-hidden rounded-md border border-foreground/25 px-1.5 text-sm font-semibold text-foreground",
                cropPatternClass(p.item.crop),
              )}
              style={{ gridColumn: `${p.start + 1} / ${p.end + 2}`, gridRow: p.lane + 1 }}
              title={`${p.item.crop}: ${monthRangeLabel(p.item, zeroBased)}`}
            >
              <span className="truncate rounded bg-background/80 px-1">{p.item.crop}</span>
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-12 text-center text-sm text-muted-foreground" aria-hidden>
          {MONTHS.map((m) => (
            <span key={m}>
              {compact ? (
                m[0]
              ) : (
                <>
                  <span className="sm:hidden print:hidden">{m[0]}</span>
                  <span className="hidden sm:inline print:inline">{m}</span>
                </>
              )}
            </span>
          ))}
        </div>
      </div>
      {showLegend && (
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {sequence.map((s, i) => (
            <li key={`${s.crop}-${i}`} className="flex items-center gap-2">
              <span className={cn("inline-block size-4 rounded border border-foreground/30", cropPatternClass(s.crop))} aria-hidden />
              <span className="font-semibold">{s.crop}</span>
              <span className="text-muted-foreground">{monthRangeLabel(s, zeroBased)}</span>
            </li>
          ))}
        </ul>
      )}
      {invalid.length > 0 && (
        <p className="mt-2 text-sm font-medium text-warning-foreground">
          {invalid.length} crop period{invalid.length > 1 ? "s" : ""} returned with month values outside 1–12 and could not be drawn.
        </p>
      )}
    </div>
  );
}
