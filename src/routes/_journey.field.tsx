import { useQuery } from "@tanstack/react-query";
import { ClientOnly, Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Crosshair, Loader2, MapPin, PenLine, Search, Undo2, X } from "lucide-react";
import { Suspense, lazy, useMemo, useState, type FormEvent } from "react";

import { PageHeader, StepNav } from "@/components/agroshift/AppShell";
import { ErrorText, FieldLabel, inputClass } from "@/components/agroshift/form-controls";
import { ApiErrorNotice, Notice } from "@/components/agroshift/Notice";
import { Button } from "@/components/ui/button";
import { getFields } from "@/lib/agroshift/api";
import { parseCoordinate, searchPlaces, type PlaceResult } from "@/lib/agroshift/geocode";
import { formatHa, parseGeometry, pointInPolygons, polygonsAreaHa, closeRing, ringAreaM2, ringCentroid, type LngLat } from "@/lib/agroshift/geo";
import type { Field } from "@/lib/agroshift/schemas";
import { useSession } from "@/lib/agroshift/session";
import { cn } from "@/lib/utils";

const FieldMap = lazy(() => import("@/components/agroshift/FieldMap"));

export const Route = createFileRoute("/_journey/field")({
  head: () => ({
    meta: [
      { title: "Choose a Field — AgroShift" },
      { name: "description", content: "Select the one field you want AgroShift to analyse, on the map or from the list." },
      { property: "og:title", content: "Choose a Field — AgroShift" },
      { property: "og:description", content: "One analysis is for one field. Find yours on the map." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ChooseField,
});

const MAP_NOTE = "One analysis is for one field. If you farm several fields, run this once for each.";

type Mode = "select" | "draw";

function ChooseField() {
  const navigate = useNavigate();
  const { state, update, selectField, hydrated } = useSession();
  const fieldsQuery = useQuery({ queryKey: ["fields"], queryFn: ({ signal }) => getFields(signal), retry: false, staleTime: 5 * 60_000 });

  const mapFields = useMemo(
    () => (fieldsQuery.data ?? []).map((field) => ({ field, parsed: parseGeometry(field.geometry) })),
    [fieldsQuery.data],
  );

  const [mode, setMode] = useState<Mode>("select");
  const [filter, setFilter] = useState("");
  const [mapKey, setMapKey] = useState(0);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [focus, setFocus] = useState<{ lat: number; lng: number; zoom?: number; key: number } | null>(null);
  const [marker, setMarker] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const [pointNote, setPointNote] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<PlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [latInput, setLatInput] = useState("");
  const [lngInput, setLngInput] = useState("");
  const [coordError, setCoordError] = useState<string | null>(null);

  const drawPoints = state.sessionBoundary?.points ?? [];
  const selected = state.field;
  const selectedParsed = selected ? parseGeometry(selected.geometry) : null;

  function chooseField(f: Field) {
    selectField(f);
    setMode("select");
  }

  function findAtPoint(lng: number, lat: number, label: string) {
    setFocus({ lat, lng, zoom: 16, key: Date.now() });
    setMarker({ lat, lng, label });
    const hits = mapFields.filter((m) => m.parsed.ok && pointInPolygons([lng, lat], m.parsed.polygons));
    const only = hits.length === 1 ? hits[0] : undefined;
    if (only) {
      chooseField(only.field);
      setPointNote(`Field ${only.field.field_id} is at this point and is now selected.`);
    } else if (hits.length > 1) {
      setPointNote(`${hits.length} registered fields overlap this point. Choose one from the list.`);
    } else {
      setPointNote("No registered field was found at this point. Choose a field from the list, or draw your boundary.");
    }
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setSearching(true);
    setSearchError(null);
    setResults(null);
    try {
      setResults(await searchPlaces(query));
    } catch (err) {
      console.error("[AgroShift] place search failed", err);
      setSearchError("Place search is not available right now. Enter coordinates below instead.");
    } finally {
      setSearching(false);
    }
  }

  function useMyLocation() {
    setLocationError(null);
    if (!("geolocation" in navigator)) {
      setLocationError("This device cannot share its location. Search for a place or enter coordinates instead.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        findAtPoint(pos.coords.longitude, pos.coords.latitude, "Your location");
      },
      (err) => {
        setLocating(false);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission was not given. You can still search for a place, choose from the list, or enter coordinates."
            : "Your location could not be found. Try again outdoors, or enter coordinates instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }

  function onCoordinates(e: FormEvent) {
    e.preventDefault();
    const lat = parseCoordinate(latInput, "lat");
    const lng = parseCoordinate(lngInput, "lng");
    if (lat === null || lng === null) {
      setCoordError("Enter latitude between −90 and 90 and longitude between −180 and 180, e.g. 13.45 and −15.40.");
      return;
    }
    setCoordError(null);
    findAtPoint(lng, lat, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  }

  function setDrawPoints(points: LngLat[]) {
    const areaHa = points.length >= 3 ? ringAreaM2(closeRing(points)) / 10_000 : 0;
    update({ sessionBoundary: points.length ? { points, areaHa } : null });
  }

  const drawnInside = useMemo(() => {
    if (drawPoints.length < 3) return null;
    const c = ringCentroid(drawPoints);
    return mapFields.find((m) => m.parsed.ok && pointInPolygons(c, m.parsed.polygons))?.field ?? null;
  }, [drawPoints, mapFields]);

  const filtered = mapFields.filter(({ field }) => {
    const q = filter.trim().toLowerCase();
    if (!q) return true;
    return [field.field_id, field.community, field.ecotype].some((v) => v?.toLowerCase().includes(q));
  });

  const canContinue = Boolean(selected);

  return (
    <div className="mx-auto max-w-7xl">
      <PageHeader step="Step 1 of 7" title="Choose a Field" subtitle="Find your field on the map or pick it from the list" />

      <div className="mb-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
        <form onSubmit={onSearch} role="search" className="flex gap-2">
          <label htmlFor="place-search" className="sr-only">
            Search for a place
          </label>
          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <input
              id="place-search"
              className={cn(inputClass, "pl-10")}
              placeholder="Search a village or place in The Gambia…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              maxLength={120}
            />
          </div>
          <Button type="submit" variant="outline" disabled={searching || !query.trim()}>
            {searching ? <Loader2 className="animate-spin" aria-hidden /> : <Search aria-hidden />}
            <span className="hidden sm:inline">Search</span>
          </Button>
        </form>
        <Button onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="animate-spin" aria-hidden /> : <Crosshair aria-hidden />}
          {locating ? "Finding you…" : "Use My Location"}
        </Button>
      </div>

      <div className="mb-4 space-y-2" aria-live="polite">
        {searchError && <Notice tone="warning">{searchError}</Notice>}
        {results && results.length === 0 && <Notice tone="neutral">No places matched “{query}”. Try another spelling.</Notice>}
        {results && results.length > 0 && (
          <ul className="divide-y divide-border rounded-xl border border-border">
            {results.map((r) => (
              <li key={`${r.lat}-${r.lng}`}>
                <button
                  className="flex min-h-12 w-full items-center gap-2 px-4 py-2 text-left text-base hover:bg-surface"
                  onClick={() => {
                    setResults(null);
                    findAtPoint(r.lng, r.lat, r.label);
                  }}
                >
                  <MapPin className="size-4 shrink-0 text-primary" aria-hidden /> {r.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {locationError && <Notice tone="warning">{locationError}</Notice>}
        {pointNote && <Notice tone="neutral">{pointNote}</Notice>}
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="space-y-3">
          <div className="isolate relative h-[360px] overflow-hidden rounded-2xl border border-border bg-surface sm:h-[460px] lg:h-[540px]">
            {tilesFailed ? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                <p className="text-lg font-semibold">The map could not load</p>
                <p className="max-w-md text-base text-muted-foreground">
                  Map pictures did not arrive — this is often a weak connection. You can still choose your field from the
                  list or enter coordinates.
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setTilesFailed(false);
                    setMapKey((k) => k + 1);
                  }}
                >
                  Retry map
                </Button>
              </div>
            ) : (
              <ClientOnly fallback={<MapLoading />}>
                <Suspense fallback={<MapLoading />}>
                  <FieldMap
                    key={mapKey}
                    fields={mapFields}
                    selectedId={selected?.field_id ?? null}
                    onSelectField={(id) => {
                      const f = mapFields.find((m) => m.field.field_id === id)?.field;
                      if (f) chooseField(f);
                    }}
                    drawMode={mode === "draw"}
                    drawPoints={drawPoints}
                    onDrawPointsChange={setDrawPoints}
                    focus={focus}
                    marker={marker}
                    onTilesFailed={() => setTilesFailed(true)}
                  />
                </Suspense>
              </ClientOnly>
            )}
          </div>
          <Notice tone="info">{MAP_NOTE}</Notice>

          <details className="rounded-2xl border border-border p-4">
            <summary className="min-h-11 cursor-pointer content-center text-base font-semibold">Enter coordinates instead</summary>
            <form onSubmit={onCoordinates} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <div>
                <FieldLabel htmlFor="lat">Latitude</FieldLabel>
                <input id="lat" inputMode="decimal" className={inputClass} placeholder="13.45" value={latInput} onChange={(e) => setLatInput(e.target.value)} />
              </div>
              <div>
                <FieldLabel htmlFor="lng">Longitude</FieldLabel>
                <input id="lng" inputMode="decimal" className={inputClass} placeholder="-15.40" value={lngInput} onChange={(e) => setLngInput(e.target.value)} />
              </div>
              <Button type="submit" variant="outline">
                Go to point
              </Button>
            </form>
            <ErrorText>{coordError}</ErrorText>
          </details>
        </div>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 shadow-card">
            <h2 className="text-xl font-bold">Define your field</h2>
            <p className="text-base text-muted-foreground">One field per analysis</p>
            <div className="mt-4 grid grid-cols-2 gap-2" role="tablist" aria-label="How to define the field">
              <Button role="tab" aria-selected={mode === "select"} variant={mode === "select" ? "default" : "outline"} onClick={() => setMode("select")}>
                <MapPin aria-hidden /> Select existing
              </Button>
              <Button role="tab" aria-selected={mode === "draw"} variant={mode === "draw" ? "default" : "outline"} onClick={() => setMode("draw")}>
                <PenLine aria-hidden /> Draw boundary
              </Button>
            </div>

            {mode === "select" ? (
              <div className="mt-5">
                {fieldsQuery.isPending && (
                  <p className="flex items-center gap-2 text-base text-muted-foreground" aria-live="polite">
                    <Loader2 className="size-4 animate-spin" aria-hidden /> Loading registered fields…
                  </p>
                )}
                {fieldsQuery.isError && <ApiErrorNotice error={fieldsQuery.error} onRetry={() => fieldsQuery.refetch()} />}
                {fieldsQuery.data && fieldsQuery.data.length === 0 && (
                  <Notice tone="warning" title="No fields available">
                    The AgroShift service returned no registered fields yet. A field must be registered before it can be analysed.
                  </Notice>
                )}
                {fieldsQuery.data && fieldsQuery.data.length > 0 && (
                  <>
                    <FieldLabel htmlFor="field-filter">Find by field ID, community or zone</FieldLabel>
                    <input id="field-filter" className={inputClass} value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Type to filter…" />
                    <p className="mt-2 text-sm text-muted-foreground">
                      {filtered.length} of {mapFields.length} registered fields
                    </p>
                    <ul className="mt-2 max-h-72 space-y-2 overflow-y-auto pr-1">
                      {filtered.map(({ field, parsed }) => {
                        const active = field.field_id === selected?.field_id;
                        return (
                          <li key={field.field_id}>
                            <button
                              onClick={() => chooseField(field)}
                              aria-pressed={active}
                              className={cn(
                                "w-full rounded-xl border px-4 py-3 text-left transition-colors",
                                active ? "border-primary bg-primary-soft" : "border-border hover:bg-surface",
                              )}
                            >
                              <span className="block font-semibold">Field {field.field_id}</span>
                              <span className="block text-sm text-muted-foreground">
                                {[field.community, field.ecotype].filter(Boolean).join(" · ") || "Community and zone not recorded"}
                              </span>
                              {!parsed.ok && <span className="block text-sm font-medium text-warning-foreground">Boundary unavailable: {parsed.reason}</span>}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
              </div>
            ) : (
              <div className="mt-5 space-y-3">
                <p className="text-base">
                  Tap the map at each corner of your field. Drag a corner to adjust it.
                </p>
                <p className="text-base font-medium">
                  {drawPoints.length} corner{drawPoints.length === 1 ? "" : "s"} placed
                  {state.sessionBoundary && drawPoints.length >= 3 && ` · about ${formatHa(state.sessionBoundary.areaHa)} ha`}
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={!drawPoints.length} onClick={() => setDrawPoints(drawPoints.slice(0, -1))}>
                    <Undo2 aria-hidden /> Undo corner
                  </Button>
                  <Button variant="ghost" size="sm" disabled={!drawPoints.length} onClick={() => setDrawPoints([])}>
                    <X aria-hidden /> Clear
                  </Button>
                </div>
                <Notice tone="warning" title="Drawn boundaries stay on this device only">
                  The AgroShift service cannot register new fields yet, so a drawn boundary is kept for this session but
                  cannot be analysed. If your field is in the list, select it instead.
                </Notice>
                {drawnInside && (
                  <Notice
                    tone="info"
                    title={`Your drawing is inside Field ${drawnInside.field_id}`}
                    actions={
                      <Button size="sm" onClick={() => chooseField(drawnInside)}>
                        Use Field {drawnInside.field_id}
                      </Button>
                    }
                  >
                    This registered field can be analysed.
                  </Notice>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 shadow-card" aria-live="polite">
            <h2 className="text-xl font-bold">Selected field</h2>
            {!hydrated ? null : selected ? (
              <dl className="mt-3 grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-2 text-base">
                <dt className="text-muted-foreground">Field ID</dt>
                <dd className="font-semibold">{selected.field_id}</dd>
                <dt className="text-muted-foreground">Community</dt>
                <dd>{selected.community ?? "Not recorded"}</dd>
                <dt className="text-muted-foreground">Farming zone</dt>
                <dd>{selected.ecotype ?? "Not recorded"}</dd>
                <dt className="text-muted-foreground">Area (recorded)</dt>
                <dd>{selected.area_ha !== null ? `${formatHa(selected.area_ha)} ha` : "Not recorded"}</dd>
                <dt className="text-muted-foreground">Area (from boundary)</dt>
                <dd>
                  {selectedParsed?.ok && selectedParsed.polygons.length > 0
                    ? `${formatHa(polygonsAreaHa(selectedParsed.polygons))} ha`
                    : selectedParsed?.ok
                      ? "Not available — the service gave a location point, not a boundary"
                      : `Not available — ${selectedParsed && !selectedParsed.ok ? selectedParsed.reason.toLowerCase() : "no boundary"}`}
                </dd>
              </dl>
            ) : (
              <p className="mt-2 text-base text-muted-foreground">No field selected yet. Tap a field on the map or pick one from the list.</p>
            )}
          </div>
        </aside>
      </div>

      <StepNav
        back={
          <Button asChild variant="outline">
            <Link to="/">Back</Link>
          </Button>
        }
        next={
          <>
            {!canContinue && <p className="self-center text-base text-muted-foreground">Select a registered field to continue.</p>}
            <Button disabled={!canContinue} onClick={() => navigate({ to: "/details" })}>
              Next: Field details <ArrowRight aria-hidden />
            </Button>
          </>
        }
      />
    </div>
  );
}

function MapLoading() {
  return (
    <div className="flex h-full items-center justify-center gap-2 text-base text-muted-foreground" aria-live="polite">
      <Loader2 className="size-5 animate-spin" aria-hidden /> Loading map…
    </div>
  );
}
