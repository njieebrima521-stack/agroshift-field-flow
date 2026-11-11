/** GeoJSON helpers. Coordinates are [lng, lat]. */

export type LngLat = [number, number];
export type Ring = LngLat[];
export type PolygonRings = Ring[]; // [outer, ...holes]

/**
 * A registered field has either a boundary (polygons) or, when the backend only knows
 * a location, a single point. A point has no area.
 */
export type ParsedGeometry =
  | { ok: true; polygons: PolygonRings[]; point: LngLat | null }
  | { ok: false; reason: string };

function isPosition(p: unknown): p is LngLat {
  return (
    Array.isArray(p) &&
    p.length >= 2 &&
    typeof p[0] === "number" &&
    typeof p[1] === "number" &&
    Math.abs(p[0]) <= 180 &&
    Math.abs(p[1]) <= 90
  );
}

function parseRings(raw: unknown): PolygonRings | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const rings: PolygonRings = [];
  for (const ring of raw) {
    if (!Array.isArray(ring) || ring.length < 4 || !ring.every(isPosition)) return null;
    rings.push(ring.map((p: number[]) => [p[0], p[1]] as LngLat));
  }
  return rings;
}

export function parseGeometry(geometry: unknown): ParsedGeometry {
  if (geometry === null || geometry === undefined) return { ok: false, reason: "No boundary supplied" };
  if (typeof geometry !== "object") return { ok: false, reason: "Boundary is not a geometry object" };
  const g = geometry as { type?: unknown; coordinates?: unknown };
  if (g.type === "Polygon") {
    const rings = parseRings(g.coordinates);
    return rings ? { ok: true, polygons: [rings], point: null } : { ok: false, reason: "Polygon coordinates are invalid" };
  }
  if (g.type === "MultiPolygon") {
    if (!Array.isArray(g.coordinates) || g.coordinates.length === 0)
      return { ok: false, reason: "MultiPolygon coordinates are invalid" };
    const polys: PolygonRings[] = [];
    for (const p of g.coordinates) {
      const rings = parseRings(p);
      if (!rings) return { ok: false, reason: "MultiPolygon coordinates are invalid" };
      polys.push(rings);
    }
    return { ok: true, polygons: polys, point: null };
  }
  if (g.type === "Point") {
    return isPosition(g.coordinates)
      ? { ok: true, polygons: [], point: [g.coordinates[0], g.coordinates[1]] }
      : { ok: false, reason: "Point coordinates are invalid" };
  }
  return { ok: false, reason: `Unsupported geometry type: ${String(g.type ?? "none")}` };
}

const EARTH_RADIUS_M = 6378137;
const rad = (d: number) => (d * Math.PI) / 180;

/** Geodesic ring area in m² (spherical approximation, same method as common GIS libraries). */
export function ringAreaM2(ring: Ring): number {
  const n = ring.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = ring[i]!;
    const [lng2, lat2] = ring[(i + 1) % n]!;
    total += rad(lng2 - lng1) * (2 + Math.sin(rad(lat1)) + Math.sin(rad(lat2)));
  }
  return Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
}

export function polygonsAreaHa(polygons: PolygonRings[]): number {
  let m2 = 0;
  for (const [outer, ...holes] of polygons) {
    if (!outer) continue;
    m2 += ringAreaM2(outer);
    for (const h of holes) m2 -= ringAreaM2(h);
  }
  return m2 / 10_000;
}

function pointInRing([x, y]: LngLat, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function pointInPolygons(point: LngLat, polygons: PolygonRings[]): boolean {
  return polygons.some(
    ([outer, ...holes]) => outer !== undefined && pointInRing(point, outer) && !holes.some((h) => pointInRing(point, h)),
  );
}

export function ringCentroid(ring: Ring): LngLat {
  const first = ring[0];
  const last = ring[ring.length - 1];
  const closed = ring.length > 1 && first && last && first[0] === last[0] && first[1] === last[1];
  const pts = closed ? ring.slice(0, -1) : ring;
  if (pts.length === 0) return [0, 0];
  const sum = pts.reduce<LngLat>((acc, p) => [acc[0] + p[0], acc[1] + p[1]], [0, 0]);
  return [sum[0] / pts.length, sum[1] / pts.length];
}

export function closeRing(points: LngLat[]): Ring {
  const first = points[0];
  const last = points[points.length - 1];
  if (!first || !last) return [];
  return first[0] === last[0] && first[1] === last[1] ? points : [...points, first];
}

export function formatHa(ha: number): string {
  return ha < 10 ? ha.toFixed(2) : ha.toFixed(1);
}
