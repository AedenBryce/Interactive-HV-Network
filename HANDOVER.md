# Project handover — 6 November 2026

## Start here in the next chat

The owner considers the local tool good and has selected the current drawing as final. Preserve it. On 6 November 2026 the owner formally accepted the assembled educational model and its recorded starting configuration; GitHub issue #25 is closed as completed with all eight criteria checked. The accepted pair is electrical model `construction-2026-11-06.12` and layout `authored-2026-11-06.9`. Issue #26 remains open for delivery evidence; PR #27 is the delivery branch. Do not resume layout optimisation, restart the old layout goal, rerun experimental layout generators, or change positions to satisfy historical tests.

Read `AGENTS.md`, this file, `CONTEXT.md`, and the current distribution section of `README.md`. GitHub is AedenBryce/Interactive-HV-Network. The implementation and this handover are on `codex/final-local-tool-handover-2026-11-06`. The snapshot is published in [PR #27](https://github.com/AedenBryce/Interactive-HV-Network/pull/27). It was open, not merged, at handover. Check its current status before editing; do not assume it has merged into main.

Suggested first message for a new chat:

> Continue this project from HANDOVER.md on branch codex/final-local-tool-handover-2026-11-06. Preserve the final owner layout authored-2026-11-06.9 and all electrical confirmations. Do not regenerate or optimise the drawing. Read the handover and GitHub PR/open issues, report the current state briefly, then wait for my next requested change.

## Final version and exact sources of truth

| Item | Current value / location |
| --- | --- |
| Electrical model | `construction-2026-11-06.12`, assembled by `src/models/site/current-network.ts` |
| Default model choice | `src/ui/model-catalog.ts` |
| Final layout revision | `authored-2026-11-06.9` |
| Opening layout, user edits | `src/models/site/reviewed-layout.json` |
| Authored geometry and ownership | `src/models/site/authored-network.json` |
| Immutable release layout pair | `docs/layout-versions/owner-layout-distribution-2026-11-06.json` + `authored-distribution-2026-11-06.json` |
| Exact browser export before .9 revision change | `docs/layout-versions/owner-export-distribution-2026-11-06.json` |
| Fallback history | `docs/layout-versions/README.md` |
| Final saved simulation snapshot | `docs/layout-versions/owner-scenario-final-2026-11-06.json` (separate from layout defaults) |

The `.9` layout was exported from the active Chrome instance and copied exactly into the built-in default; only its revision changed. A fresh portable browser export was compared structurally and matched it. `.8` and earlier pairs are retained as fallbacks. The owner made additional edits after `.8`; use `.9`, not the earlier file named `final`.

PDF sources remain local under `drawings/Asset Drawing Repo` and are excluded from Git/distribution. They are not runtime dependencies. Do not re-extract or remodel the network to continue ordinary UI/distribution work.

## Owner decisions to preserve

- One continuous, dark, top-down single-line overview with pan, wheel zoom, asset search and action popups. Aesthetic decisions were refined extensively with the owner; the final manual arrangement takes precedence over abandoned automatic candidates.
- Educational network/source-connectivity tool, no electrical calculations and no live equipment status or isolation authorisation.
- Station battery limits begin at the three retained feeder breakers for TF11, TF12 and TF04. Mine services/camp are excluded. TF04 continues to Hopper10; selected other takeoffs are boundaries. The model contains the detailed earlier owner confirmations; keep them.
- Starting configuration and physical action profiles are recorded in the model. Do not equate a visual default with live plant state. Do not silently resolve unconfirmed installed facts.
- Key/door sequences expressly deferred by the owner remain deferred. Other unresolved interlocks remain blocked unless explicitly confirmed.
- Final owner drawing selection is recorded. The owner explicitly accepted `construction-2026-11-06.12`, paired with `authored-2026-11-06.9`, including its recorded starting configuration. GitHub #25 records that acceptance and is closed. This accepts the educational model as represented, with documented boundaries and unresolved claims retained; it does not establish live status or operational isolation authority.
- Final drawing must not change unless the owner requests it. Subsequent changes in this chat were launcher/packaging fixes only.

## Editing and persistence

`NetworkDiagram.tsx` exposes Edit Layout behind a password gate. The password was supplied by the owner in the preceding chat; do not print it into handover files or release notes. `editing-password.ts` stores a SHA-256 verifier. This is a local UI lock, not server authentication or protection against a developer using browser tools. Finish Editing and reload require unlocking again. Switching simulation remains available without unlocking layout editing.

`use-layout-review.ts` stores edits in localStorage keyed by model ID, model version and layout revision. A stored browser layout overrides that release's default. Browser edits do not update source files or other users' copies. Export Download Review before reload/revision updates whenever owner edits may exist. Save Scenario is separate and captures simulation model/states; a fresh session starts at the agreed model baseline.

Layout review data includes asset/room positions, routes and manual-route ownership, independent asset positions, object rotations, custom names, appearance, bus takeoffs, manual label positions, hidden labels and deletion proposals. Manual labels are relative to their equipment anchor; apply after automatic layout so moving text cannot reroute wires. Embedded earth tags use `asset-id#earth`. Label deletion hides text only; Undo/Restore Deleted Labels works. Preserve all fields when copying/committing reviews.

Three previously marked graphical markers (TF420A/B primary-connection markers and Hopper9 motor2 common marker) were removed visually through authored `hiddenAssetIds`; their conductor terminals and graph remain intact. Pending deletion marks were cleared. Do not electrically remove these shared junctions to match visual hiding.

## Working code map

- `src/session/`: model validation, immutable session commands, connectivity, interlocks, scenarios; the approved testing seam is SimulationSession.
- `src/models/site/current-network.ts`: composition of owner confirmations, historical increments and overview-device corrections. Stable identities/evidence are important.
- `src/ui/authored-layout-loader.ts` + `authored-schematic.ts`: load/fingerprint validation and fixed authored composition. Model fingerprints must match the model; layout-only changes do not require electrical-model edits.
- `NetworkDiagram.tsx`: authored overview, camera, edit interactions and labels.
- `EquipmentSymbol.tsx`, `ThreePositionSymbol.tsx`, `Symbol.tsx`, `transformer-windings.ts`: symbols, grouped main/earth functions and role-aware transformer windings.
- `conductor-paths.ts` + `conductor-reservations.ts`: shared-conductor drawing and avoidance of duplicated paint. Multiple graph edges may legitimately share the same conductor; do not merge unrelated electrical groups for appearance.
- `combined-switch-actions.ts`, `AssetActions.tsx`, `switch-display-tags.ts`: explicit main/CB/earth action names and grouped physical symbols with independent electrical actions.
- `manual-label-layout.ts`, `layout-review.ts`, `use-layout-review.ts`: manual label movement/deletion and persistence.
- `scripts/portable-server.mjs` + `package-distribution.py`: final Windows/Web packaging.

Numerous `*-candidate`, `trial*`, prototype and temporary-test modules record earlier layout experiments. They are not the accepted drawing. `tsconfig.json` uses explicit production roots; `vitest.config.ts` lists production test roots. Do not enable every experimental test or replace the production path with a promising old candidate. ADR0012 describes the staged authoring direction; the owner's final authored coordinates are now the accepted visual output.

## Build, run and package

Use Node.js24 and pnpm11; dependency versions are in pnpm-lock.yaml. From a clean checkout:

```powershell
pnpm install --frozen-lockfile
pnpm typecheck
pnpm exec vite build --configLoader native --base=./
pnpm preview --port 5176 --strictPort
```

The relative base is used for distributable static hosting. `dist/` and `output/` are generated and ignored. The local environment also has Node at `C:/Users/f676001/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe` if Node is not on PATH.

For Windows packaging, obtain the official Node.js v24.19.0 Windows x64 distribution and retain its LICENSE. Python3 is needed to create ZIPs, not to run them:

```powershell
python scripts/package-distribution.py --runtime "C:/path/to/node.exe" --runtime-license "C:/path/to/LICENSE"
```

Build `dist/` first. The script's default runtime/license paths work on the original PC; explicit arguments support another checkout. It produces:

- `output/HV-Network-2026-11-06-r9-Windows.zip` (~35MB): extract completely, run START-HV-NETWORK.cmd, keep the console open. Bundled runtime; no installation or internet required.
- `output/HV-Network-2026-11-06-r9-Web.zip` (~0.6MB): host contents of `site/` on an approved HTTPS static host. No publication has been performed.

Both contain the site network data and third-party notices; PDFs, installers and credentials are excluded. Binary distribution archives are not committed to Git. Rebuild them or use the existing local output folder; no GitHub Release upload has been made.

The portable server binds only to 127.0.0.1. It starts at8765 and skips occupied ports (up to100). Browser-local edits are tied to the selected origin/port; the built-in default is available on every port. It opens the actual chosen address with Windows PowerShell Start-Process. Browser-launch errors are caught and print a manual address without stopping the server.

### Launcher fixes already verified

- The first failed launch was EADDRINUSE because the test server still occupied8765. The test copy was stopped; automatic port fallback was added.
- Two deliberately occupied test ports were skipped and the app returned HTTP200 on the third.
- The original cmd/start browser command was replaced with PowerShell. A real --open invocation outside the restricted execution sandbox launched Chrome at8765, with a visible app and no console errors.
- Within the agent sandbox, spawning PowerShell can throw EPERM; that is now caught. Do not confuse sandbox process restrictions with a broken web app.
- Server session58922 was running at8765 at handover preparation. This is ephemeral; verify current processes/ports before use. Do not terminate unrelated Node processes. Old5176 is a Vite preview, not the portable launcher.

## Verification and known limits

### Issue #25 acceptance audit — 6 November 2026

GitHub issue [#25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25) is closed as completed. The owner checked all eight criteria and formally accepted model `construction-2026-11-06.12`, final layout `authored-2026-11-06.9`, and the recorded starting configuration. The frozen scenario is `docs/layout-versions/owner-scenario-final-2026-11-06.json`.

1. **Assembled model and interfaces:** `current-network.test.ts` and `whole-network.test.ts` cover stable identities, area packages, reconciled joins and cross-area scenarios; that focused run passed 20/20 tests. The exact `.12` package also passed `overview-device-corrections.test.ts` (3/3), including schema validation, identity/baseline preservation, restored-control blocking and historical view-only behavior.
2. **Drawing coverage:** `drawing-review/coverage.json` records 141 supplied files, 140 unique hashes, one byte-identical duplicate, 141 explicit review-source rows and zero unmatched rows. The register documents review scope and limitations; it does not promote every drawing claim to confirmed installed fact.
3. **Agreed scope and LV boundaries:** the accepted `.12` package retains its scoped boundaries and final LV endpoints. Outgoing LV circuits and other owner-excluded scope remain outside the model as documented; unresolved external source/earth coverage remains labelled.
4. **Discrepancy evidence and decisions:** area and supplemental review records carry drawing references, affected model identities, scoped owner decisions and open review questions. The frozen `.12` model contains 223 resolved and 193 open review records; the owner accepted it with those unresolved claims retained.
5. **Whole-model owner review:** the owner confirmed review and approval in the conversation; the GitHub #25 acceptance comment records the exact immutable model/layout pair and starting configuration.
6. **Ambiguity treatment:** the owner's acceptance explicitly retains documented scope boundaries and unresolved claims. It does not declare an unconfirmed installation arrangement correct.
7. **Immutable acceptance:** the scenario, source layout and authored layout pair identify model `.12` and layout `.9`; the acceptance is recorded externally on #25 without rewriting the accepted model.
8. **Cross-area scenarios and regression:** the focused current-network/whole-network run passed 20/20 tests, including real-package structure/evidence checks and an explicitly fictional cross-area path/impact scenario; the exact `.12` package test passed 3/3. The separate authored-layout-loader suite currently has 15 passing and 6 failing geometry assertions. Full-suite pass status remains unconfirmed. Preserve `.9`; these layout assertions do not authorise changing the accepted drawing.

This audit distinguishes owner acceptance from software verification. Issue #25's completion does not close delivery ticket #26 or establish field installation, live equipment state, source/earth coverage, electrical calculations or operational isolation authority.

On6November2026:

- TypeScript check and Vite production build passed (large-bundle advisory remains).
- Focused tests:24/24 passed across layout-review, manual-label-layout, conductor-paths and transformer-windings.
- Authored layout-loader suite:15 passed,6 failed. These are NOT a green full-suite result. Failures concern old earth-takeoff spacing, symbol lead coordinates, room hierarchy assumptions, single-primary transformer assumptions, global frame clearance, and paired-load alignment. Five also failed against the prior .6 default; the load-column test additionally disagrees with owner manual edits. Inspect and classify them with the owner before changing tests or drawing.
- A full configured test run was attempted during handover preparation but stopped after it exceeded the bounded check without a report. Full-suite pass status remains unconfirmed. Do not claim all tests pass.
- Browser checks already covered label movement/deletion, no unintended wire/equipment changes, Undo/reset/restoration, saved-layout roundtrip, password rejection/unlock/relock, fresh portable default, search and launch.
- ZIP CRC and manifest SHA-256 checks passed. Another PC and real hosted deployment remain untested.

Focused command:

```powershell
pnpm exec vitest run --configLoader native --pool=threads --maxWorkers=1 --no-file-parallelism src/ui/layout-review.test.ts src/ui/manual-label-layout.test.ts src/ui/conductor-paths.test.ts src/ui/transformer-windings.test.ts
```

## Next work, ordered

1. Check PR #27's current GitHub state and preserve the `.9` source pair. Issue #25 is complete; do not reopen acceptance or alter the accepted model without an owner request.
2. Validate the portable ZIP on a second Windows PC, including blocked/busy port and browser-launch behaviour under its company controls.
3. Reconcile the six layout assertions and investigate the slow full test run without changing the owner-final drawing blindly.
4. Continue issue #26's delivery criteria against the accepted `.12` / `.9` pair. Keep remaining unconfirmed installed facts labelled; #1 remains the specification.
5. If requested, choose an internal hosting destination, implement real access control there, and deploy. The GPT/internal-site deployment is not already completed or authorised by the earlier local packaging request.

The earlier goal documents under docs/goals are historical. Preserve the accepted layout and electrical confirmations during later delivery work; do not restart layout optimisation unless the owner asks.
