export type PlaceResult = { label: string; lat: number; lng: number };

/**
 * Place search via OpenStreetMap Nominatim (free, no key; light use only).
 * Results are limited to The Gambia. Throws when the service is unavailable.
 */
export async function searchPlaces(query: string, signal?: AbortSignal): Promise<PlaceResult[]> {
  const q = query.trim().slice(0, 120);
  if (!q) return [];
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=gm&q=${encodeURIComponent(q)}`;
  const res = await fetch(url, { signal: signal ?? null, headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Search service returned HTTP ${res.status}`);
  const data = (await res.json()) as Array<{ display_name?: string; lat?: string; lon?: string }>;
  return data
    .map((d) => ({ label: d.display_name ?? "Unnamed place", lat: Number(d.lat), lng: Number(d.lon) }))
    .filter((d) => Number.isFinite(d.lat) && Number.isFinite(d.lng));
}

export function parseCoordinate(value: string, kind: "lat" | "lng"): number | null {
  const n = Number(value.trim().replace(",", "."));
  if (!Number.isFinite(n) || value.trim() === "") return null;
  const limit = kind === "lat" ? 90 : 180;
  return Math.abs(n) <= limit ? n : null;
}
