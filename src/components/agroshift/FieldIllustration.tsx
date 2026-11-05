/** Simple drawn illustration of field parcels. It is not a map and is labelled as such. */
export function FieldIllustration() {
  return (
    <figure className="relative overflow-hidden rounded-3xl border border-border bg-surface">
      <svg viewBox="0 0 600 460" className="block h-auto w-full" role="img" aria-label="Illustration of farm fields with one field outlined">
        <rect width="600" height="460" className="fill-primary-soft" />
        <path d="M-20 120 C 120 160, 160 40, 300 60 S 520 10, 640 40" className="fill-none stroke-info/40" strokeWidth="26" strokeLinecap="round" />
        {[
          "M30 210 L170 190 L190 300 L40 320 Z",
          "M190 180 L330 170 L340 260 L205 280 Z",
          "M360 160 L520 150 L540 250 L370 265 Z",
          "M50 340 L200 320 L215 430 L60 440 Z",
          "M230 300 L360 285 L375 420 L240 435 Z",
          "M400 290 L560 275 L575 410 L410 425 Z",
        ].map((d) => (
          <path key={d} d={d} className="fill-background stroke-border" strokeWidth="2" />
        ))}
        <path d="M205 280 L340 262 L372 285 L390 415 L240 435 L230 300 Z" className="fill-primary/25 stroke-primary" strokeWidth="4" strokeLinejoin="round" />
        {[
          [205, 280],
          [340, 262],
          [372, 285],
          [390, 415],
          [240, 435],
          [230, 300],
        ].map(([x, y]) => (
          <circle key={`${x}-${y}`} cx={x} cy={y} r="7" className="fill-background stroke-primary" strokeWidth="3" />
        ))}
        <g className="fill-highlight">
          <circle cx="520" cy="70" r="26" />
        </g>
      </svg>
      <figcaption className="absolute inset-x-4 bottom-4 rounded-2xl border border-border bg-background/95 p-4">
        <p className="text-lg font-semibold text-primary-strong">One field, many options</p>
        <p className="text-sm text-muted-foreground">Illustration only — your real field appears on a live map in the next step.</p>
      </figcaption>
    </figure>
  );
}
