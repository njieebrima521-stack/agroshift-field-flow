# AgroShift roadmap

- [x] Design system, sidebar shell, logo
- [x] S0–S7 screens + analysing state, wired to the documented API contract
- [x] Error / empty / partial / blocked / low-confidence states
- [x] PDF farmer sheet, print, copy/share summary
- [x] Rule tests; desktop + 390px journey checked with test data
- [ ] Connect the real backend (needs AGROSHIFT_BACKEND_URL from the team)
- [ ] Confirm with backend: month numbering, confidence scale, constraint values, NDVI point shape, criterion names, smap_departure unit
- [ ] Endpoint to register drawn field boundaries (not in the contract)
- [x] Send S2 crop history and field details in POST /api/strategies (contract v1.1)
- [x] Contract v1.1 doc, optional provenance/snapshot/elevation/limit-check fields, Point fields
- [ ] Compare with the FastAPI code (needs the backend repo or /openapi.json)
- [ ] Pilot field record: ID, community, ecotype, boundary (from the team)
- [ ] Optional crop list endpoint
- [ ] Higher-resolution original logo file (current one was cut from the design image)
