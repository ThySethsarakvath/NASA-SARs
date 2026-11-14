# Cambodia Flood Explorer

Vue 3 + TypeScript frontend for Dancing with the SARs. Phase 1 explores one prepared flood/water-change observation pair at a time in Cambodia. It renders supplied assets and explanations; it performs no SAR processing or flood detection.

**Current data: team-provided Tonlé Sap exports, plus a separate synthetic development fixture.** The default case imports 11 dated water/radar display pairs and three season-wide layers from the supplied webapp.zip. The team reports ASF as the download source; the archive README identifies NISAR L-band. Original product IDs, analysis script/thresholds, valid-data masks and validation evidence were not supplied, so these layers remain unreviewed rather than confirmed observations/detections.

Open Dates & data layers to choose ordered dates, water classifications or radar display, and season summaries. Date/layer selections are shareable in the URL. The first-to-last change map is available only for that exact pair, or as a separately labeled season layer. Data & method includes the supplied area series as unvalidated team estimates, distinguishing open-water area from the total of supplied classes. The synthetic case retains its own explicit label and legacy URLs.

Data-only importer: `python scripts/import-webapp-data.py` (Pillow required). It reads the archive as data, never executes its code, converts APP_DATA to JSON and prepares nearest-neighbor PNG display derivatives up to 2048 pixels. Radar PNGs are unchanged. It excludes the other app's UI/libraries and preserves the original ZIP. [Import provenance](public/data/tonle-sap-2026/provenance.json) records source/output hashes and limitations. Re-importing updates this case/index entry, so preserve any deliberate edits first.

## Home and explorer

The hero now has a rotating charcoal Earth globe, generalized country outlines, transparent photo fades for the four themes, and a transparent-to-dark gradient on the right. Pause/resume controls stop automatic globe/photo motion. Reduced-motion preference keeps a static Cambodia-facing view and removes the animated entry. The globe pauses off-screen and in hidden tabs; its renderer caps resolution at 1.5 device pixels and animation at 30 fps.

Drag the globe with a pointer or use the arrow keys while it is focused. Releasing a drag/key smoothly returns the view north up while preserving the chosen longitude; the compass control and N/Home keys also reset north. Manual rotation remains available while automatic motion is paused. Cambodia is highlighted by its generalized Natural Earth border, replacing the circle locator.

The simplified hero keeps its primary explorer action and a compact compass/pause toolbar. The left overlay is lighter so landscape photographs remain visible; photo/globe attribution stays in the footer and synthetic-data disclosure remains below the walkthrough and inside the explorer. Entire theme cards are interactive: flooding opens the prototype, while planned themes open an accessible status dialog.

The hero's normal prototype click now expands the same globe from its current position into a full-viewport layer over 850 ms, rotates toward Cambodia, and then moves the camera toward the surface. At the end of the 2.6-second flight, Earth fills the viewport with Cambodia's border in view; the prepared explorer is revealed over 650 ms. The globe moves through Vue Teleport without recreating its renderer. Desktop and mobile use the same sequence, with a wider camera distance on portrait screens to retain the country outline.

The map prepares behind this presentation. A six-second readiness deadline prevents a slow basemap from trapping navigation; loading/error states still apply. Direct links, modifier/new-tab clicks and the skip-animation link remain available. The page locks scrolling during entry and restores it on completion or browser Back; focus moves into the explorer. Reduced motion bypasses the cinematic expansion/dive. Browser history is handled without a router dependency. Camera targets and generalized country borders are geographic context, not an approved analysis footprint.

`HeroGlobe.vue` owns Three.js rendering/lifecycle; `src/globe/` owns geographic orientation and outline preparation; `src/App.vue` coordinates map preparation and reveal. Three.js 0.187 and matching TypeScript definitions are the only new dependencies for this feature. [Globe provenance](public/globe/CREDITS.md) records NASA's historical July 2004 Blue Marble display texture and Natural Earth's public-domain generalized borders. These are illustrative context assets; they do not depict live conditions or replace the project's SAR inputs.

`/` opens the Cambodia project landing page: mission, four environmental themes, explorer walkthrough, supplied team profiles and source credits. `/?page=explore` opens the flood prototype. Old `/?case=...&view=...` links still work. Query navigation needs no static-host path rewrite. The map and dataset index load only after explorer intent or a direct explorer link.

Landing source: `src/pages/LandingPage.vue`; explorer source: `src/pages/ExplorerPage.vue`; entry selection: `src/App.vue`. The five user-supplied team profiles and photo credits live in `src/data/site.ts`. Original team portraits are preserved; CSS focus/scale values frame each person.

Five real Cambodia photographs are used on the homepage, with [author, source, license and checksum records](public/images/CREDITS.md). Themes use Prey Lang forest, rice fields near Siem Reap, and Phnom Penh sky/cityscape. Credits are in the footer; older images retain their attribution in the source record. These photos are separate from the synthetic scientific fixture. Forests, climate and atmosphere are planned analytical themes.

## Run locally on this Windows machine

```powershell
cd D:\NASA\SARs\frontend
& .\scripts\run.ps1 dev
```

Open the localhost URL printed by Vite (normally http://127.0.0.1:5173). Stop with Ctrl+C. The project-local Node 24.22.1 runtime under ignored `.tools/node` avoids changing the existing global Node 18. The helper prefers `NASA_NODE`, then that portable runtime, then another supported installed runtime. `.tools` is local tooling, not part of the source deliverable.

Alternatively, double-click `START_FRONTEND.cmd` and leave that terminal open. It runs the same helper in a user-owned terminal, independent of a Codex preview session. The batch launcher was successfully executed in a terminal and served both home and explorer with HTTP 200. Dev startup uses port 5173 with `--strictPort` so a second launch reports a port conflict instead of silently moving to another URL. “127.0.0.1 refused to connect” means nothing is accepting that local connection; it is not an HTTP route error. Check that the server is still running, then refresh `http://127.0.0.1:5173/?page=explore`.

## Fresh checkout or another machine

Use Node **22.18+ on the 22 line, or 24.12+**, and npm. Node 18 cannot run this stack. With a supported Node active:

```sh
npm ci
npm run dev
```

Use the lockfile for reproducible packages. On Windows you can set `$env:NASA_NODE` to a supported `node.exe` for the helper; dependency installation still requires npm running with a supported Node. No API keys or environment secrets are required.

## Checks and production build

```powershell
& .\scripts\run.ps1 lint
& .\scripts\run.ps1 test
& .\scripts\run.ps1 e2e
& .\scripts\run.ps1 build
& .\scripts\run.ps1 preview
```

Equivalent npm commands: `npm run lint`, `npm test`, `npm run test:e2e`, `npm run build`, `npm run preview`. Build runs TypeScript checking and produces `dist/`. Preview normally uses port 4173. Browser tests use installed Google Chrome and software WebGL, and start Vite if needed. Generated review images are in ignored `output/playwright/`. Tests do not establish scientific accuracy or actual hardware GPU performance.

## Implemented experience

- Dark map-first layout, searchable case list, footprint and evidence panel.
- Desktop synchronized swipe plus keyboard divider and Before/After buttons.
- Mobile single-map Before/After controls and evidence sheet; responsive tablet layout.
- Prepared change overlay, opacity, legend, dates, source dialog and guided story.
- Case/view URL sharing, abortable case loads, explicit errors and retry.
- Plain-background map on basemap failure and static imagery without WebGL.

MapLibre and its worker load separately from the shell. The map chunk is still approximately 1.08 MB minified (296 KB gzip); Vite reports a size warning. Measure on target devices before expanding scope. OpenFreeMap tiles/fonts/styles need internet; a complete offline basemap is not included.

## Data handoff

See [DATA_HANDOFF.md](DATA_HANDOFF.md), [types](src/types.ts), and the [validator](src/data/contract.ts). Put reviewed display assets and JSON under `public/data/`. Real cases following the contract need no component changes. Keep the development case labeled or remove it from the index; never relabel synthetic images as observations.

`npm run fixtures` (or `run.ps1 fixtures`) regenerates and **overwrites** the synthetic case and index. Preserve any real-case index changes before running it.

## Ownership and release limits

`useExplorer.ts` owns state and requests, `MapWorkspace.vue` owns map lifecycle, and `contract.ts` validates metadata. The data team owns acquisition, processing, alignment, masks, legends, interpretation and validation. No backend, database, authentication, live alerts, arbitrary acquisition search or later-theme analysis is implemented. Date selection is limited to the 11 supplied exports.

Independent hackathon project; no NASA endorsement implied. Retain OpenFreeMap/OpenMapTiles/OpenStreetMap attribution. Software licensing, real-data rights, eligibility and public hosting remain pending. This task did not deploy the site.

Project records: [architecture](../../docs/ARCHITECTURE.md), [development](../../docs/DEVELOPMENT.md), [decisions](../../docs/DESIGN_DECISIONS.md), [evidence](../../docs/EVIDENCE_AND_LIMITATIONS.md).
