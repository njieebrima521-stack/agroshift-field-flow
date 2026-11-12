<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AgroShift project rules

- All backend calls go through `src/lib/agroshift/api.ts` and are validated with the zod models in `schemas.ts`; components never call `fetch` for contract data. Why: one place to enforce the documented API contract and error states.
- The browser calls same-origin `/api/fields`, `/api/fields/$fieldId/features`, `/api/strategies`; these server routes forward to the backend named by the `AGROSHIFT_BACKEND_URL` secret (optional `AGROSHIFT_BACKEND_TOKEN`), or answer 503 `backend_not_configured`. `VITE_AGROSHIFT_API_BASE_URL` can point the browser straight at a CORS-enabled backend instead. Why: keeps the backend address out of client code and shows an honest unconnected state.
- The frontend never computes scores, weights, rankings or confidence; it only rescales the five priority sliders to sum to 100 and orders cards by the backend `rank`. Why: the backend owns all scoring.
- Missing API values are `null`, never `0`, and are shown as "Not available for this field". Why: scientific honesty requirement.
- Session state lives in `SessionProvider` (React context + sessionStorage); there are no accounts or database. Why: product scope excludes sign-up and persistence.
- Journey screens are children of the pathless `_journey` layout (sidebar shell); the landing page `/` sits outside it.
- Leaflet is loaded only via `React.lazy` inside `<ClientOnly>` and its wrapper uses `isolate`; jsPDF is dynamically imported on click. Why: SSR safety and small initial bundle.
- Months in sequences are assumed 1–12; a response containing 0 and no 12 is treated as 0–11 (`months.ts`). Comparison rows map backend criterion names through the explicit list in `criteria.ts` only.
- The API contract lives in `docs/api-contract.md` (v1.1); new response fields are optional so older responses still validate, and `field_details` (S2 answers) is always sent in POST /api/strategies. Why: backend is FastAPI hosted separately and evolves independently.
- Registered fields may be Polygon, MultiPolygon or Point geometry; a Point has no area. Why: pilot data has a location but not always a boundary.
- Rule tests live in `src/lib/agroshift/agroshift-rules.test.ts`; run `bunx vitest run` after changing these rules.
