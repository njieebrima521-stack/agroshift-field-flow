# AgroShift Gambia — backend integration plan

## What I inspected
- The whole frontend: 9 screens, API client, data checks, the backend relay, session storage, tests.
- Your pilot data package (20 files; checksums match the manifest). It contains NASA POWER, MODIS, SMAP, SRTM and SoilGrids outputs for one pilot point (Brikama Manduar, 13.2489, -16.6153), plus the download scripts.
- **Missing:** the package has no FastAPI code. To compare the frontend with your real endpoints, I need the backend repo or its `/openapi.json`. Until then, the mismatches below compare the frontend contract with what your data can actually supply.

## 1. Current frontend architecture
- TanStack Start (React/TS), with the screens Landing → S1 → S2 → S3 → Analysing → S4 → S5 → S6 → S7.
- `api.ts` is the only caller. Every response is checked against `schemas.ts`; a mismatch shows "Unexpected data format" rather than broken data.
- Missing values stay `null` and show as "Not available for this field". The frontend does no scoring; it only rescales the sliders to 100.
- Answers are kept in the browser session only (no accounts, no database).

## 2. Current backend integration
```text
Browser -> same-site /api/fields, /api/fields/:id/features, /api/strategies
        -> relay (backend-proxy.ts) -> AGROSHIFT_BACKEND_URL (+ optional Bearer AGROSHIFT_BACKEND_TOKEN)
        -> (not set yet) 503 backend_not_configured
```
- Neither secret is set yet.
- The relay runs on a cloud edge, so the FastAPI server must have a public HTTPS address (not localhost). CORS is not needed because the backend is called server to server.

## 3. API contract mismatches (contract vs pilot data)

**GET /api/fields**
- The data has one coordinate, but no `field_id`, `farmer_code`, `community`, `ecotype`, `area_ha` or boundary.
- The backend needs a small field registry file for the pilot field. The boundary and details must come from your team; I will not invent them.
- The frontend only draws Polygon and MultiPolygon boundaries. If only the point is available, I will add Point support: a marker, and area shown as "Not available".

**GET /api/fields/{id}/features**
| Contract field | Pilot data | Gap |
|---|---|---|
| rainfall_total_mm | MERRA-2 and IMERG June–Oct totals per year | The contract holds one number. The backend must choose the source and season year. IMERG 2026 is incomplete and must stay null. |
| dry_spell_days | Longest dry spell and count of spells of 7+ days, Jul–Sep | Need to define which one it means (suggest longest dry spell). |
| hot_days_35 | Not computed | The backend must count days with T2M_MAX ≥ 35 °C from daily_raw, over a stated window. |
| smap_departure | Mid-month surface and root-zone snapshots (2015–2025), cell 6.2 km away | Need to define it: which layer, departure from which baseline, and its unit (m³/m³). The data is snapshots, not averages. |
| ndvi_curve | 272 composites, 53 cloudy | Point shape: `{date, ndvi, quality_label, usable}`. Cloudy points are `ndvi: null`, never dropped or filled. |
| soil{clay_pct, ph, soc_g_kg} | 4 depths; also sand, nitrogen, bulk density | Need a depth choice (suggest 0–5 cm topsoil, stated). No silt is available, so no texture class. |
| (none) | SRTM elevation 25 m | Not in the contract (optional addition). |

**POST /api/strategies**
- **Request:** the S2 crop history and field details are not sent today and must be added. Limit values (`rainfed/well/irrigation`, `low/medium/high`) must match the FastAPI enums.
- **Response:** needs confirmation of:
  - month numbering (1–12)
  - confidence scale (is "below 3" low?)
  - criterion names for the 6-row comparison table

## 4. Missing request and response fields (all additions optional, so the old contract still works)
**Request: add `field_details`**
```json
"field_details": {
  "field_name": "string|null", "field_type": "upland|lowland|valley|unsure",
  "seasons": [{"year": 2024, "main_crop": "Groundnut", "second_crop": null}, ...3 items],
  "intercropping": true, "soil_texture": "sandy|loamy|clay|mixed|unsure|null",
  "drainage": "drains|pools|floods|unsure|null", "erosion": "none|some|severe|unsure|null",
  "notes": "string|null"
}
```
**Response additions**
- **Provenance:** `unit`, `source_series` (e.g. MERRA-2 vs IMERG), `distance_km`, `depth`, `quantile`, `notes`, `coverage_pct`.
- **Features:** `soil.depth`, `elevation_m`, `data_snapshot` (date the files were prepared, so the app can label data as preprocessed, not live).
- **Strategies:**
  - `confidence_scale_max`
  - `constraint_checks[{constraint, passed, reason}]` (shows limits were checked before scoring)
  - `engine_version`
- **Comparison criteria:** fix the names to `water_demand`, `soil_health`, `nitrogen`, `erosion`, `income`, `labour_fit`.
- **Optional:** `GET /api/crops`, to replace the suggested crop list.

## 5. NASA data integration requirements (backend side)
- The backend reads only the preprocessed CSV/JSON files shipped with it. It makes no NASA calls at runtime, and the download scripts stay offline.
- At startup it checks the SHA256 manifest and refuses to serve a changed file.
- **NaN / blank → JSON `null`.** pandas NaN and Python NaN must never become 0 or invalid JSON.
- Every value carries the dataset, variable, resolution, period, type, unit and notes:
  - POWER (MERRA-2): `modelled`, ~55 km
  - IMERG: satellite estimate, ~11 km
  - MODIS: `observed`, 250 m
  - SMAP L4: `modelled`, 9 km
  - SoilGrids: `modelled` (predicted), 250 m
  - SRTM: `observed`, 30 m
- Each step that turns raw data into a contract value (season totals, hot days, the SMAP departure baseline) is documented in the backend README.
- Wording guards: NDVI is greenness, not yield; there are no yield-improvement claims.

## 6. Backend deployment requirements
- Python 3.11+, FastAPI + uvicorn, pinned requirements, data folder bundled in the image.
- Host: any public HTTPS host (Render, Railway, Fly.io, Cloud Run). Lovable cannot host Python.
- Required:
  - `GET /health`
  - Bearer token check that matches `AGROSHIFT_BACKEND_TOKEN`
  - Responses within 85 s
  - The server kept awake before the demo (free tiers sleep)
- Then set the `AGROSHIFT_BACKEND_URL` and `AGROSHIFT_BACKEND_TOKEN` secrets in Lovable.

## 7. Staged implementation plan
**Stage 0: inputs from your team (blocking)**
- FastAPI repo or `/openapi.json`.
- Pilot field record: ID, community, ecotype, boundary or point.
- Answers to the open choices in section 3.

**Stage 1: contract v1.1**
- I write `docs/api-contract.md` with every request/response field, its unit and null rules. You share it with the backend team.
- Using your FastAPI code, I list the exact endpoint differences.

**Stage 2: backend changes (your team; I can draft the Python code as a downloadable package if you want)**
- A data loader with manifest checks.
- A feature builder (section 3 table).
- A rule engine:
  1. Hard limits run first; a failing option is marked `blocked` with a reason.
  2. Weighted scoring runs on the remaining options only.
  3. The baseline comes from the latest S2 season.
  4. Confidence comes from data coverage and quality.
- Add `field_details` to the request model.

**Stage 3: frontend changes (additive; design, screens and routing unchanged)**
- `schemas.ts`: optional new fields; `null` kept everywhere.
- `form.ts`: send `field_details`. If S2 answers are incomplete, the analysis sends you back to Field Details.
- Analysing: the "Your crops and choices" step reflects the real request.
- Small display additions: unit, distance and depth on source tags; "Preprocessed data, prepared <date>" label; NDVI cloudy points shown as gaps; elevation only if returned.
- Point-geometry support on S1, only if needed.
- Update the rule tests: crop history sent, nulls kept, constraint checks shown, confidence scale. Update `AGENTS.md`.

**Stage 4: connect**
- Set the two secrets, then check each endpoint through the relay. A response that does not match the format is shown, never hidden.

**Stage 5: end-to-end check**
- Run the full journey against the real backend at desktop and 390px width.
- Confirm: no live NASA calls, nulls shown as "Not available", blocked options last, the PDF downloads.
- Report the remaining gaps.

## Technical notes
- The relay, `api.ts` and the error states stay as they are; only additive edits.
- `isModelled` already treats any type other than `observed` as modelled, which covers the SoilGrids, SMAP L4 and MERRA-2 labels.
