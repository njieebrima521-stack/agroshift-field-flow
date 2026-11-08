import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";

import type { LngLat, ParsedGeometry } from "@/lib/agroshift/geo";
import type { Field } from "@/lib/agroshift/schemas";

export type MapField = { field: Field; parsed: ParsedGeometry };

export type FieldMapProps = {
  fields: MapField[];
  selectedId: string | null;
  onSelectField: (id: string) => void;
  drawMode: boolean;
  drawPoints: LngLat[];
  onDrawPointsChange: (pts: LngLat[]) => void;
  focus: { lat: number; lng: number; zoom?: number; key: number } | null;
  marker: { lat: number; lng: number; label: string } | null;
  onTilesFailed: () => void;
};

const GAMBIA_CENTER: L.LatLngTuple = [13.45, -15.4];

function cssVar(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export default function FieldMap(props: FieldMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const fieldsLayer = useRef<L.LayerGroup | null>(null);
  const drawLayer = useRef<L.LayerGroup | null>(null);
  const markerLayer = useRef<L.LayerGroup | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const fittedRef = useRef(false);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current, { center: GAMBIA_CENTER, zoom: 8, zoomControl: true });
    let loaded = 0;
    let errors = 0;
    const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    });
    tiles.on("tileload", () => (loaded += 1));
    tiles.on("tileerror", () => {
      errors += 1;
      if (errors >= 6 && loaded === 0) propsRef.current.onTilesFailed();
    });
    tiles.addTo(map);
    const failTimer = window.setTimeout(() => {
      if (loaded === 0) propsRef.current.onTilesFailed();
    }, 15000);

    fieldsLayer.current = L.layerGroup().addTo(map);
    drawLayer.current = L.layerGroup().addTo(map);
    markerLayer.current = L.layerGroup().addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const p = propsRef.current;
      if (!p.drawMode) return;
      p.onDrawPointsChange([...p.drawPoints, [e.latlng.lng, e.latlng.lat]]);
    });
    mapRef.current = map;
    return () => {
      window.clearTimeout(failTimer);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Field boundaries.
  useEffect(() => {
    const map = mapRef.current;
    const layer = fieldsLayer.current;
    if (!map || !layer) return;
    layer.clearLayers();
    const primary = cssVar("--primary", "#0b6b3a");
    const highlight = cssVar("--highlight", "#f28c1b");
    const bounds = L.latLngBounds([]);
    for (const { field, parsed } of props.fields) {
      if (!parsed.ok) continue;
      const selected = field.field_id === props.selectedId;
      const latlngs = parsed.polygons.map((rings) => rings.map((ring) => ring.map(([lng, lat]) => [lat, lng] as L.LatLngTuple)));
      const poly = L.polygon(latlngs, {
        color: selected ? highlight : primary,
        weight: selected ? 4 : 2,
        fillColor: primary,
        fillOpacity: selected ? 0.35 : 0.15,
      });
      poly.bindTooltip(`Field ${field.field_id}${field.community ? ` · ${field.community}` : ""}`);
      poly.on("click", (e) => {
        if (propsRef.current.drawMode) return;
        L.DomEvent.stopPropagation(e);
        propsRef.current.onSelectField(field.field_id);
      });
      poly.addTo(layer);
      bounds.extend(poly.getBounds());
      if (selected && fittedRef.current) map.fitBounds(poly.getBounds(), { maxZoom: 17, padding: [40, 40] });
    }
    if (!fittedRef.current && bounds.isValid()) {
      const sel = props.fields.find((f) => f.field.field_id === props.selectedId);
      if (sel?.parsed.ok) {
        const b = L.latLngBounds(sel.parsed.polygons.flatMap((r) => (r[0] ?? []).map(([lng, lat]) => [lat, lng] as L.LatLngTuple)));
        map.fitBounds(b, { maxZoom: 17, padding: [40, 40] });
      } else {
        map.fitBounds(bounds, { maxZoom: 15, padding: [30, 30] });
      }
      fittedRef.current = true;
    }
  }, [props.fields, props.selectedId]);

  // Drawn session boundary.
  useEffect(() => {
    const layer = drawLayer.current;
    if (!layer) return;
    layer.clearLayers();
    const pts = props.drawPoints;
    if (pts.length === 0) return;
    const highlight = cssVar("--highlight", "#f28c1b");
    const latlngs = pts.map(([lng, lat]) => [lat, lng] as L.LatLngTuple);
    if (pts.length >= 3) {
      L.polygon(latlngs, { color: highlight, weight: 3, dashArray: "6 6", fillOpacity: 0.2 }).addTo(layer);
    } else if (pts.length === 2) {
      L.polyline(latlngs, { color: highlight, weight: 3, dashArray: "6 6" }).addTo(layer);
    }
    pts.forEach(([lng, lat], i) => {
      const m = L.marker([lat, lng], {
        draggable: true,
        keyboard: true,
        title: `Corner ${i + 1}`,
        icon: L.divIcon({ className: "", html: '<div class="agro-vertex"></div>', iconSize: [18, 18], iconAnchor: [9, 9] }),
      });
      m.on("dragend", () => {
        const ll = m.getLatLng();
        const next = [...propsRef.current.drawPoints];
        next[i] = [ll.lng, ll.lat];
        propsRef.current.onDrawPointsChange(next);
      });
      m.addTo(layer);
    });
  }, [props.drawPoints]);

  // Focus requests (search result, coordinates, my location).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !props.focus) return;
    map.setView([props.focus.lat, props.focus.lng], props.focus.zoom ?? 15);
  }, [props.focus]);

  useEffect(() => {
    const layer = markerLayer.current;
    if (!layer) return;
    layer.clearLayers();
    if (!props.marker) return;
    L.circleMarker([props.marker.lat, props.marker.lng], {
      radius: 9,
      color: cssVar("--info", "#2563eb"),
      weight: 3,
      fillOpacity: 0.6,
    })
      .bindTooltip(props.marker.label, { permanent: false })
      .addTo(layer);
  }, [props.marker]);

  useEffect(() => {
    const el = containerRef.current;
    if (el) el.style.cursor = props.drawMode ? "crosshair" : "";
  }, [props.drawMode]);

  return <div ref={containerRef} className="h-full w-full" role="application" aria-label="Field map" />;
}
