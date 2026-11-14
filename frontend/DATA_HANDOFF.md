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
| `dataKind` | `real-observation`, `surrogate`, or `synthetic-demo`, matching the index. Real observation does not automatically mean NISAR: specify the instrument and input IDs. |
| `interpretation` | `radar-response-change`, `possible-inundation`, or `supported-flood-interpretation`. Scientific evidence must justify the choice. |
| `reviewStatus` | `unreviewed`, `qualitatively-reviewed`, or `independently-validated`. Synthetic fixtures must be `unreviewed`. Parser acceptance does not verify the claim. |
| `instrument`, `product`, `measurement`, `units` | Actual source/product and displayed quantity. Include product/version/channel in product or method. Colors alone do not define a measurement. |
| `method` | Plain-text processing, scaling, masking and analysis summary with reproducibility references. |
| `bounds` | Ordered `[west, south, east, north]` in longitude/latitude. No antimeridian wrapping; latitude restricted to -85..85. |
| `coordinates` | Four rectangle corners matching bounds: top-left, top-right, bottom-right, bottom-left; each `[longitude, latitude]`. |
| `coverage` | GeoJSON `Feature` containing a closed `Polygon` or `MultiPolygon` for analyzed support. Empty support must not be published as a usable case. |
| `before`, `after` | Objects with string `label`, `date`, `image`, `inputId`. Real UTC timestamp ending `Z`; after follows before. Input ID identifies the exact observation. Processing dates do not belong here. |
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
- No statistics interface exists. Flood area or affected population needs documented support and a separately reviewed structured contract.

## Spatial requirements and safety

Export images for a rectangular **EPSG:3857 / Web Mercator display grid**, with geographic corners in EPSG:4326. Reproject native satellite grids before handoff. The viewer does not reproject pixels, register observations, enforce coverage masking, or verify geolocation. Clip and mask unusable regions in prepared images. GeoJSON uses longitude/latitude and closed polygon rings. Topology, physical alignment and scientific validity need independent review beyond schema checks.

Image/manifest paths must be local `/data/` paths without traversal, query strings, fragments or backslashes. Use simple filenames. Never put passwords, tokens, signed URLs, private metadata or restricted inputs in `public/`. Text is rendered as plain text rather than HTML.

Missing observations produce a failure and retry, with no substitute dataset. A WebGL failure offers static Before/After and evidence, with the overlay disabled. A basemap outage retains case assets on a plain background; full offline geographic context is not promised.

The included fixture uses deterministic shapes generated by [create-fixture.mjs](scripts/create-fixture.mjs). Its dates and location are illustrative. Background references to NISAR documentation do not make it NISAR data.
