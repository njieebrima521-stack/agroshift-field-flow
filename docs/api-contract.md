# AgroShift API contract v1.1

Changes from v1.0 are additive: all new response fields are optional, and the
frontend still accepts v1.0 responses. `field_details` is new and **required**
in the POST request.

General rules
- A missing value is JSON `null`. Never send `0`, `NaN` or `""` in its place
  (convert pandas NaN to None before serialising).
- The backend reads preprocessed files only; it makes no live NASA calls.
- The backend owns all scoring, ranking, constraint checks and confidence.
- Auth: optional `Authorization: Bearer <AGROSHIFT_BACKEND_TOKEN>`.
- Also provide `GET /health` → `{"status":"ok"}`.

## GET /api/fields
```json
[{ "field_id": "BRK-001", "farmer_code": "string|null", "community": "string|null",
   "ecotype": "string|null", "area_ha": "number|null",
   "geometry": { "type": "Polygon|MultiPolygon|Point", "coordinates": [] } }]
```
`Point` is accepted when no boundary is known; the app shows area as "Not available".

## GET /api/fields/{field_id}/features
```json
{
  "field_id": "BRK-001",
  "rainfall_total_mm": "number|null",   // season total, one stated source and year
  "dry_spell_days": "number|null",      // longest dry spell (days < 1 mm), Jul–Sep
  "hot_days_35": "number|null",         // days with T2M_MAX >= 35 °C, stated window
  "smap_departure": "number|null",      // m3/m3, departure from a stated baseline
  "ndvi_curve": [{ "date": "2026-08-13", "ndvi": "number|null",
                   "quality_label": "Good|Marginal|Cloudy", "usable": true }],
  "soil": { "clay_pct": "n|null", "ph": "n|null", "soc_g_kg": "n|null",
            "source": "ISRIC SoilGrids 2.0", "depth": "0-5cm" },
  "elevation_m": "number|null",         // NEW, optional
  "data_snapshot": "2026-11-11",        // NEW, optional: date files were prepared
  "provenance": [{
    "dataset": "NASA POWER", "variable": "rainfall_total_mm",
    "resolution_m": 55000, "period": "2026-06-01/2026-10-31",
    "type": "observed|modelled|reanalysis|satellite_estimate",
    "unit": "mm", "source_series": "MERRA-2 PRECTOTCORR",
    "distance_km": null, "depth": null, "quantile": null,
    "coverage_pct": null, "notes": "string|null"
  }]
}
```
- `variable` must equal the feature key (`rainfall_total_mm`, `dry_spell_days`,
  `hot_days_35`, `smap_departure`, `ndvi_curve`, `soil`, `elevation_m`).
- Any `type` other than `observed` is shown as modelled.
- Unusable NDVI composites stay in the curve with `ndvi: null` or `usable: false`.

## POST /api/strategies
Request
```json
{
  "field_id": "BRK-001",
  "field_details": {
    "field_name": "string|null",
    "field_type": "upland|lowland|valley|unsure",
    "seasons": [{ "year": 2024, "status": "crop|fallow|unknown",
                  "main_crop": "Groundnut|null", "second_crop": "string|null" }],
    "intercropping": false,
    "soil_texture": "sandy|loamy|clay|mixed|unsure|null",
    "drainage": "drains|pools|floods|unsure|null",
    "erosion": "none|some|severe|unsure|null",
    "notes": "string|null"
  },
  "priorities": { "water": 20, "soil": 20, "income": 20, "food": 20, "resilience": 20 },
  "constraints": { "water_source": "rainfed|well|irrigation",
                   "seed_available": ["Groundnut"],
                   "labour": "low|medium|high", "budget": "low|medium|high" }
}
```
`seasons` holds exactly three items, oldest first. Priorities always sum to 100.
Crop names are free text (suggested list or typed by the farmer).

Response
```json
{
  "strategies": [{
    "id": "s1", "rank": "number|null", "name": "string",
    "is_baseline": false, "blocked": false, "blocked_reason": "string|null",
    "sequence": [{ "crop": "Groundnut", "month_start": 6, "month_end": 10 }],
    "score": "number|null",
    "breakdown": [{ "criterion": "water_demand", "weight": 0.2, "raw": 1, "normalised": 0.5 }],
    "why": "string|null", "benefits": [], "tradeoffs": [], "gaps": [], "risks": [],
    "evidence": [{ "claim": "", "value": null, "dataset": "", "period": "", "resolution_m": null }],
    "confidence": "number|null",
    "constraint_checks": [{ "constraint": "water_source", "passed": true, "reason": "string|null" }]
  }],
  "confidence_scale_max": 5,        // NEW, optional
  "engine_version": "string|null"   // NEW, optional
}
```
Engine order: (1) hard constraints → `blocked` + reason; (2) weighted scoring of
unblocked options only; (3) rank. Exactly one `is_baseline` strategy, built from the
latest S2 season. Months are 1–12. Confidence below 3 is shown as low.
Comparison criterion names: `water_demand`, `soil_health`, `nitrogen`, `erosion`,
`income`, `labour_fit`.

## Open decisions for the backend team
Rainfall source (MERRA-2 vs IMERG) and season year · dry-spell definition ·
hot-day window · SMAP layer and baseline · soil depth · pilot field ID, community,
ecotype and boundary.
