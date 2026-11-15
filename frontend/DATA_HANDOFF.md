# Frontend data handoff v1

Implemented display contract, 2026-11-14. The user approved the Vue frontend plan; scientific review of real assets is still required. This contract covers bounded display artifacts, not raw NISAR products or the full reproducibility record. Keep that record with processing outputs and the [dataset registry](../../docs/DATASET_REGISTRY.md).

## Integration order

1. Prepare aligned before/after images and optional reviewed change output. Export PNG/WebP using identical scaling/palette and transparent invalid regions. Initial budget: longest side <= 2,048 pixels and about 2 MB per image, a display target rather than scientific resolution.
2. Put files under `public/data/<case-id>/`. Browser paths begin `/data/`; hosting is assumed at the domain root.
3. Create `case.json` using [the synthetic case](public/data/synthetic-tonle-sap/case.json) as a structural example. Replace every illustrative value with reviewed metadata. Its coordinates, dates, descriptions and images are not observations.
4. Add a matching entry to `public/data/index.json`. Run checks; review placement, scaling, masks, dates, interpretation and sources with the data team.
5. Keep exact product/version/maturity, polarization/layer, processing configuration, grid/CRS, checksums and independent reference evidence in the scientific record. Link public references in `sources` and summarize relevant processing in `method`.

Example index (replace placeholders):

```json
{
  "cases": [{
    "id": "reviewed-case-id",
    "title": "Team-selected study window",
    "location": "Cambodia · actual location",
    "manifest": "/data/reviewed-case-id/case.json",
    "dataKind": "real-observation"
  }]
}
```

An empty `cases` array means no available study windows, not no flooding or zero change. Each case has a fixed pair; arbitrary dates and interpolation are unsupported.

## Required manifest fields

[FloodCase](src/types.ts) and [parseCase](src/data/contract.ts) are authoritative. Extra fields are ignored by the display.

| Field | Shape / meaning |
| --- | --- |
| `schemaVersion` | Exactly `1`. |
| `id`, `title`, `location`, `description` | Non-empty strings; ID matches the index. |
| `dataKind` | `real-observation`, `surrogate`, `synthetic-demo`, or `team-export`, matching the index. Real observation does not automatically mean NISAR: specify the instrument and input IDs. |
| `interpretation` | `radar-response-change`, `possible-inundation`, or `supported-flood-interpretation`. Scientific evidence must justify the choice. |
| `reviewStatus` | `unreviewed`, `qualitatively-reviewed`, or `independently-validated`. Synthetic fixtures must be `unreviewed`. Parser acceptance does not verify the claim. |
| `instrument`, `product`, `measurement`, `units` | Actual source/product and displayed quantity. Include product/version/channel in product or method. Colors alone do not define a measurement. |
| `method` | Plain-text processing, scaling, masking and analysis summary with reproducibility references. |
| `bounds` | Ordered `[west, south, east, north]` in longitude/latitude. No antimeridian wrapping; latitude restricted to -85..85. |
| `coordinates` | Four rectangle corners matching bounds: top-left, top-right, bottom-right, bottom-left; each `[longitude, latitude]`. |
| `coverage` | GeoJSON `Feature` containing a closed `Polygon` or `MultiPolygon` for analyzed support. Empty support must not be published as a usable case. |
| `before`, `after` | Objects with string `label`, `date`, `image`, `inputId`. UTC timestamp ending `Z`; team exports may instead carry an honest `YYYY-MM-DD` label when exact acquisition time/time zone is unknown. After follows before; no invented midnight timestamp. Input ID identifies the exact observation. Processing dates do not belong here. |
| `legend` | Non-empty array of `{ "label", "color" }`, color `#RRGGBB`. Label meaningful ranges/categories and invalid regions, including change-layer meaning. |
| `observed` | What is actually shown, separate from explanation or causal claim. |
| `explanation` | How to read the pair, possible meaning, alternatives and caveats. |
| `limitations` | Array of plain-text limitations: seasonality, alignment, shadows, masks and reference-evidence limits as applicable. |
| `sources` | Array of `{ "title", "url" }`, public HTTPS links without credentials. Cite inputs, processing and independent references. Redistribution rights still require review. |
| `story` | Array (empty allowed) of `{ "title", "body", "center": [lon, lat], "zoom", "view" }`. Prefer <= 3 reviewed viewpoints; view is `before`, `compare`, or `after`. Mobile converts comparison steps to a single observation. |

## Optional change output

- `change`: `{ "image": "/data/<case-id>/change.png", "label": "Reviewed meaning" }`, transparent raster aligned to the same corners.
- `areas`: inline GeoJSON `FeatureCollection` of closed `Polygon`/`MultiPolygon` features. The renderer uses the **first legend color for all areas**; supply a single class only. No property-based styling or numeric calculations are performed.
- Omit both to retain Before/After with a disabled change switch. Failed change imagery produces a notice and disables the switch; it does not become a zero-change result.
- An optional imported `collection.series` table displays team-reported class areas in km² as unreviewed estimates. It performs no calculations from PNGs. Validated flood extent or affected population still requires documented independent support.

## Spatial requirements and safety

Export images for a rectangular **EPSG:3857 / Web Mercator display grid**, with geographic corners in EPSG:4326. Reproject native satellite grids before handoff. The viewer does not reproject pixels, register observations, enforce coverage masking, or verify geolocation. Clip and mask unusable regions in prepared images. GeoJSON uses longitude/latitude and closed polygon rings. Topology, physical alignment and scientific validity need independent review beyond schema checks.

Image/manifest paths must be local `/data/` paths without traversal, query strings, fragments or backslashes. Use simple filenames. Never put passwords, tokens, signed URLs, private metadata or restricted inputs in `public/`. Text is rendered as plain text rather than HTML.

Missing observations produce a failure and retry, with no substitute dataset. A WebGL failure offers static Before/After and evidence, with the overlay disabled. A basemap outage retains case assets on a plain background; full offline geographic context is not promised.

The included fixture uses deterministic shapes generated by [create-fixture.mjs](scripts/create-fixture.mjs). Its dates and location are illustrative. Background references to NISAR documentation do not make it NISAR data.

## Team-export extension (schema v1, 2026-11-14)

`team-export` is a distinct pending-provenance category, never silently synthetic, surrogate or verified real observation. It requires `reviewStatus: unreviewed` and `coverageType: display-extent`; its rectangle is export placement, not validated analysis support. `provenance` optionally links a safe local /data/ JSON record.

`collection` optionally contains 2–50 chronological unique `observations` with calendar `date`, water `image`, `radarImage` and export `inputId`; `layers` with unique frequency/water_class/change IDs, label, description, image and legend; and `series` with matching dates and finite nonnegative open_water/flooded_veg/total values. These are imported claims, not independently verified metrics. The default pair must match collection observations. Exact acquisition IDs remain separate from export filenames.

Optional `change.legend` identifies the overlay categories. The provided first-to-last change is disabled for intermediate comparisons. Aggregate layers are single sampled-period views, not before/after acquisitions. The UI preserves source bounds and unknown-support limitations; it does not establish mask validity, alignment or physical causes. Existing fixture manifests remain supported.

## Optional exposure and combined-display extension (2026-11-15)

- A prepared observation may add `unusualImage`, a safe local /data/ path to a team-derived historical-reference-filtered open-water image. Its presence does not validate an anomaly detector. A derived display observation may add `backgroundImage` for radar context; the renderer probes both required images and does not silently fall back if one fails.
- `collection.exposure.records` contains chronological unique supplied dates, with `classifiedWater` and `baselineFiltered` values. Each has `areaKm2`, `population`, `roadKm`, `croplandHa`: finite nonnegative numbers or explicit null. Zero remains zero; unknown stays null. Area totals are checked against the supplied series; these checks establish consistency, not scientific validity.
- `collection.exposure.sources` holds population/cropland filename arrays, cropClass, roads/roadsFilter, baseline, recurrenceBelowPct and a plain-text method. Nullable source fields use null. A percentage must be 0–100. Source filenames do not establish authentic inputs, valid reprojection, independent review or redistribution rights.
- Current source uses WorldPop 2025, WorldCover 2021 class 40, an OSM roads shapefile with unknown snapshot date, and a reported JRC v1.4 recurrence reference ending 2021. Baseline-filtered water is open-water screening, excludes flooded vegetation and does not establish a season-matched anomaly.
- URL `display=both` requests water on radar. `baseline=rare-water` requests the supplied orange primary layer. Missing layer metadata produces a recoverable selection error; missing image assets produce a display error. Neither becomes a substitute water layer.
- Exposure figures follow Before/After (After in Compare); season maps show no single-date metrics. Displayed differences are simple differences between team estimates, not newly affected people or confirmed damage.

## Separate agriculture API contract

The user-authorized Agriculture Explorer uses the live teammate API rather than this prepared flood manifest. Its response fields, configuration, source dates, validation and missing metadata are documented in [AGRICULTURE_API.md](AGRICULTURE_API.md). Do not add agriculture responses to a FloodCase or recompute scientific intersections from rendered images. Shared exposure/change analysis requires separately reviewed backend outputs.
