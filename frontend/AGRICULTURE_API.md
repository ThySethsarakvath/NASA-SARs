# Agriculture API integration

Implemented November 15, 2026, following the user's approval to replace the climate theme with agriculture and connect the teammate's Railway API. This is a read-only presentation integration, not a new analysis pipeline.

## Entry and configuration

Open `/?page=agriculture`; optional `province=Siem%20Reap` restores the selected province. Landing hero/card and Flood Explorer navigation link here. Existing flood query links and globe handoff are retained. Agriculture loads lazily and makes no requests from the homepage.

The default API is `https://sarwatch-backend-production.up.railway.app`. To override, copy `.env.example` to `.env.local` and set `VITE_API_BASE_URL`. Restart Vite after changes; rebuild for production changes. Vite exposes this URL in browser code: never put tokens or passwords in it. HTTPS is required except for localhost development. No credentials are sent.

## Ownership and contract

- `src/agriculture/api.ts`: configured base URL, credential-free GET, HTTP errors, cancellation and 20-second request deadlines. No automatic polling/retry loop.
- `src/agriculture/contract.ts`: validates unknown API JSON, dates, unique records, nonnegative areas, bounded percentages, reported coverage relationships and geographic polygon rings. Missing numeric values must be explicit `null`, not fabricated zero. This validates transport/data consistency, not scientific accuracy.
- `src/composables/useAgriculture.ts`: independently loads summary, changes and geometry; cancels prior requests and ignores stale responses. Province changes load vegetation/rainfall with URL-encoded filters. Missing optional resources do not block the summary. Refresh clears old displayed resources while loading replacements.
- `src/pages/AgriculturePage.vue`: selected crop class, measurement, province figures, ranked comparison, evidence and recovery states.
- `AgricultureMap.vue`: validated province geometry joined to summary by exact province name. Uses the existing MapLibre renderer/worker and a self-contained dark province map without external basemap dependencies. It shows province statistics, not geolocated changed fields. Keyboard alternatives are the selector and comparison table. Unsupported WebGL preserves those alternatives. Container resizing reframes all provinces.
- `AgricultureChart.vue`: dependency-free SVG chart, source-date axis, null/gap breaks, distinct dashed reference line and accessible numeric table. It does not calculate a scientific indicator or baseline.

| GET path | Fields consumed |
| --- | --- |
| `/api/agriculture/summary` | `region`, `province_count`, `provinces`, `data_status`, `nisar_comparison`, `interpretation`. Province fields use `pure_`/`mixed_` cropland area, valid radar area, changed area and percent; rainfall date, amount and anomaly. |
| `/api/agriculture/changes` | Province, `crop_class` 12/14 and `threshold_db`. Exact threshold direction remains unspecified. |
| `/api/agriculture/layers/agriculture.geojson` | Polygon/MultiPolygon FeatureCollection, geographic longitude/latitude coordinates and `properties.province`. Additional statistics are discarded; summary owns displayed figures. |
| `/api/agriculture/vegetation?province=...` | Date, province, scaled NDVI/EVI, valid-pixel count, source and coverage status. |
| `/api/agriculture/rainfall?province=...` | Date, province, `chirps_mm`, `monthly_climatology_mm`, `rainfall_anomaly_mm` and source. |

Empty chart arrays mean unavailable data, not zero. Non-2xx, invalid contracts, network errors and deadlines have explicit feedback. Optional method/geometry failure preserves available figures. Forecast is not fetched or displayed. Health is not used to gate useful dataset requests.

## Inspected live state and limits

On November 15 the summary and GeoJSON represented six Tonle Sap provinces. NISAR comparison metadata reported July 1–October 17, 2026, track 083/frame 008/mode 2005/polarization DHDH. These are backend assertions, not exact-product or independent scientific verification. The API reports a 3 dB change threshold. Percentages use valid radar-covered class area, not total provincial cropland; coverage is shown separately. “Pure” and “mixed” labels are backend categories, not verified rice maps or crop damage.

Vegetation returned 65 partial-sample records across five provinces, December 2020–December 2021; Battambang returned an empty array. Source was `MOD13Q1.061 AppEEARS`. The summary still reported vegetation pending. Siem Reap rainfall returned 70 monthly records January 2021–October 2026, source `CHIRPS_v3_final_monthly`. Rainfall baseline years, vegetation monthly aggregation/QA/cropland masking and original inputs are not supplied. Dataset periods are kept separate; no causal crop-health conclusion is made.

`/api/agriculture/forecast` returned HTTP 503 with `Required analysis output is not available: forecast.csv`. `/layers` listed cropland, province-ID, NISAR-change and WorldCover TIFFs. These are not rendered or recomputed in-browser; raster CRS, units, nodata, range serving, size and rendering contracts need review first. GeoJSON was approximately 673 KB with six geographic polygons; source authority/license remains pending. CORS allowed the local origin in inspected responses and live browser requests worked during integration.

Backend follow-up: provide typed/versioned OpenAPI response models, generated-at timestamps, exact product IDs, data-use terms, reproducible processing/threshold definitions, valid support, QA rules and rainfall baseline years. Reconcile pending vegetation status and extend contemporary sampling before explaining 2026 radar signals with vegetation. Current API schemas are loose dictionaries; frontend parsing remains essential.

Do not combine these province metrics mathematically with the flood export's areas or exposure counts. A flood–cropland intersection needs compatible analytical inputs and backend-owned processing.
