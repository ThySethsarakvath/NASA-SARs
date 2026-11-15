# Public deployment

## Current status: public on Vercel

On November 15, 2026 the user requested withdrawal of the Sites deployment and public hosting on Vercel instead. The previous Site is now private (`custom` access with no additional allowed users); its version is retained for rollback. The connector provides no unpublish/delete action, so this revokes public access rather than deleting hosted files.

Vercel production deployment succeeded on November 15, 2026 in the user's **DF5 Hobby** scope (`df-5-af5b`). No paid plan, billing change or domain purchase was performed.

- Home: https://sarwatch-cambodia.vercel.app/
- Flood explorer: https://sarwatch-cambodia.vercel.app/?page=explore
- Agriculture: https://sarwatch-cambodia.vercel.app/?page=agriculture
- Project: `prj_MYnJNzEQKHmj4pIaOgLo1MWq0ro4`, name `sarwatch-cambodia`, scope `df-5-af5b`.
- Deployment: `dpl_E8mzQDpkMjGUYDmYJuvkKEVhTGvX`, production, **READY**.
- Dashboard: https://vercel.com/df-5-af5b/sarwatch-cambodia/E8mzQDpkMjGUYDmYJuvkKEVhTGvX
- Immutable deployment URL: https://sarwatch-cambodia-dny8o2y7d-df-5-af5b.vercel.app (Vercel authentication protected; share the public production domain above).

Forests and atmosphere are marked **Upcoming** on their cards, accessible names and explanatory dialogs. Only flood and agriculture open implemented explorers.

### Build and updates

`vercel.json` selects Vite, `npm run build`, and `dist`. `.vercelignore` excludes local tools, environments and generated output. Test fixtures remain in source uploads because TypeScript compilation references them. The local build uses Node 24; Vercel currently selected Node 26.x under the existing package engine range. No app dependency or lockfile changed for hosting. Existing Vite large-renderer chunk warnings remain.

The ignored `.vercel/project.json` links this working frontend to the existing project. After reviewing/building changes, run the official CLI from this directory with `deploy --prod --scope df-5-af5b`. The local CLI is `.tools/vercel-cli/node_modules/vercel/dist/vc.js`, invoked with `.tools/node/node.exe`. Do not run `--public`, which changes source/log visibility. No Git connection, push or automatic deployment pipeline was added. The CLI-generated local OIDC environment file was removed; no local environment credentials were uploaded.

Verify the production domain anonymously after each release, including home, both query routes, JSON/PNG assets and the external Railway API. Vercel deployment/preview URLs can require sign-in while the assigned production domain remains public; authentication HTML can return HTTP 200, so check actual content types and rendered app. The production domain points to future production releases; preserve a known-good deployment ID for rollback through the Vercel dashboard. The old Sites archive remains private and is a separate historical fallback.

### Vercel verification

Vercel's remote TypeScript/Vite production build succeeded and the deployment is READY. Anonymous HTTP requests to the production domain returned the app HTML for home and both explorer query routes, actual JSON for the data index, and PNG content for representative before/after and baseline-filtered water layers. The Railway summary endpoint returned 200 with `Access-Control-Allow-Origin: *` for the production origin.

The live browser completed the hero globe-to-flood handoff, rendered both comparison maps and imported water imagery, navigated to agriculture, and loaded province metrics, province polygons, rainfall and historical vegetation charts. Returning home confirmed Upcoming labels and the unavailable forest dialog. Screenshots are `D:\NASA\deployments\verification\sarwatch-vercel-upcoming.jpg` and `sarwatch-vercel-agriculture.jpg`. One OpenFreeMap missing `circle-11` sprite warning was observed; no browser errors were captured in this check. This is a deployment smoke check; the earlier local seven-test suite/build/lint remain separately recorded in E-033.

The large renderer bundle warning, external basemap/API availability, source rights/provenance and scientific review limitations remain. No full regression rerun, physical-device test, load test or new scientific validation was performed for this production release.

## Previous Sites release (now private)

Published November 15, 2026 using the Sites plugin, then made private at the user's request. The following records describe that historical release, not a current public link.

- Home: https://sarwatch-cambodia-df5.uddamvirak.chatgpt.site/
- Flood explorer: https://sarwatch-cambodia-df5.uddamvirak.chatgpt.site/?page=explore
- Agriculture: https://sarwatch-cambodia-df5.uddamvirak.chatgpt.site/?page=agriculture
- Project: `appgprj_6af953c88d80819192682989a52d96e1` (persisted in `.openai/hosting.json`). Reuse this identity; do not create another Site for updates.
- Version: 1, saved ID `appgprj_6af953c88d80819192682989a52d96e1~appgver_d9ffafa2e5b081919c87ad5827c3cf8d`.
- Successful deployment: `appgdep_6af954ee8b948191bbb6cc2bb9bee76b`.
- Deployed source commit: `0efd0fe019017a1dce24dcef48ad4e5a0d0987e7` in the isolated Sites checkout `D:\NASA\deployments\sarwatch-cambodia-df5`.
- Package: `D:\NASA\deployments\sarwatch-cambodia-df5.tar.gz`; uploaded content hash `sha256:a9ef0c6584bb863fe99a5213e429430c9516c53243f2cb3f61dc49176234ad6c`.

## Build and dependencies

The existing Vue application builds with `& .\scripts\run.ps1 build`, emitting static `dist/`. Hosting serves these files at the domain root; the query routes require no custom path rewrites. Local flood imagery/JSON, globe geography/texture and credited photographs ship with the build. Existing source/validation limitations remain visible. No production detector or new scientific processing was added.

Agriculture still requests the teammate-operated HTTPS Railway backend. `VITE_API_BASE_URL` is a build-time setting; changing the host environment after build will not alter the bundled URL. No new credentials or local environment files were uploaded. Production API requests returned the permitted origin header, and rainfall/vegetation charts worked in the public browser check. OpenFreeMap remains an external dependency of the flood basemap.

Sites hosting is currently included with Plus/Pro, subject to shared usage/storage limits; review [current hosting terms](https://help.openai.com/en/articles/20001339-creating-and-using-chatgpt-sites) before relying on future pricing. Railway hosting is separate and unchanged. No domain purchase, paid hosting plan or billing change was performed.

## Historical Sites update procedure

The application working repository is `D:\NASA\SARs`; it retains its original history and uncommitted work. Only the isolated deployment checkout was committed/pushed to the Sites source repository by the supported Sites workflow. It contains an explicit source-file selection, excluding local environments, tools, logs, output artifacts and original workspace Git metadata.

Only if the user later explicitly requests a return to Sites: inspect its access policy, keep its project ID, obtain a fresh short-lived repository credential, and open its isolated checkout through the Sites source helper. Build reviewed frontend changes and synchronize source and `dist/` into that checkout, then use the helper to commit/push/package that state. Save the returned commit/archive as a new version. Never persist repository tokens or put them in shell commands. Do not run the Sites helper against the parent application repository or overwrite the version-1 rollback archive. Keep the Site private unless the user authorizes reopening it.

## Historical Sites verification

Production build/TypeScript passed. Anonymous HTTP GETs returned 200 for home, both explorer query routes, data index/case JSON and Cambodia outline. The published browser rendered the globe, completed the hero-to-flood handoff, displayed the imported water layers, and loaded province metrics plus rainfall/vegetation charts. No errors were observed in that browser check. Screenshots are under `D:\NASA\deployments\verification`.

This was a deployment smoke check, not a new full automated suite or scientific accuracy evaluation. Prior tests remain documented separately. Physical mobile devices, broad browser coverage, load limits and ongoing backend availability were not tested. The existing Vite MapLibre/Three bundle-size warning remains. Public release does not establish source-product authenticity, data-use terms or scientific validation; continue the team review recorded in the dataset/evidence documents.
