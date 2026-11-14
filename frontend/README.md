# Cambodia Flood Explorer

Vue 3 + TypeScript frontend for Dancing with the SARs. Phase 1 explores one prepared flood/water-change observation pair at a time in Cambodia. It renders supplied assets and explanations; it performs no SAR processing or flood detection.

**Current data: synthetic development fixture only.** The schematic images, dates and Tonle Sap window demonstrate the interface. They are not satellite observations, a finalized study area or a confirmed flood event.

## Run locally on this Windows machine

```powershell
cd D:\NASA\SARs\frontend
& .\scripts\run.ps1 dev
```

Open the localhost URL printed by Vite (normally http://127.0.0.1:5173). Stop with Ctrl+C. The project-local Node 24.22.1 runtime under ignored `.tools/node` avoids changing the existing global Node 18. The helper prefers `NASA_NODE`, then that portable runtime, then another supported installed runtime. `.tools` is local tooling, not part of the source deliverable.

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

`useExplorer.ts` owns state and requests, `MapWorkspace.vue` owns map lifecycle, and `contract.ts` validates metadata. The data team owns acquisition, processing, alignment, masks, legends, interpretation and validation. No backend, database, authentication, live alerts, arbitrary timelines or later-theme analysis is implemented.

Independent hackathon project; no NASA endorsement implied. Retain OpenFreeMap/OpenMapTiles/OpenStreetMap attribution. Software licensing, real-data rights, eligibility and public hosting remain pending. This task did not deploy the site.

Project records: [architecture](../../docs/ARCHITECTURE.md), [development](../../docs/DEVELOPMENT.md), [decisions](../../docs/DESIGN_DECISIONS.md), [evidence](../../docs/EVIDENCE_AND_LIMITATIONS.md).
