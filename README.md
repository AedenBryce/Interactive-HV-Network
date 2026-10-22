# Interactive HV Network

A local browser application for understanding represented network connections and downstream switching impacts.

**Current models: synthetic demonstrations, 13 provisional site areas and an assembled whole-network construction.** The construction is available for inspection; remaining discrepancies, starting configuration and owner acceptance remain open. The application reports connectivity, without electrical calculations or operational isolation authorisation.

**Confirmed scope:** only SB01 F4/TF11, SB02 F1/TF12 and SB02 F4/western TF04 remain at the station, beginning at their feeder-breaker inputs. Station buses, generators and other feeders are excluded; DB01/DB01B are no longer active detail requests. The owner has also excluded downstream mine-services, village/camp and RM718 unloading, and limited other TF-04 line branches to takeoff points while retaining the Hopper 10 route. SW441/TF441/MC441 water-tower/process-water is included, supplied from the TF12 line's OPF1-7 spur through WT1-CB to SW441 IN01. MC431A is excluded downstream of MC431. See the [owner scope amendment](docs/specs/interactive-hv-network.md#owner-scope-amendment--22-october-2026), [station boundary](drawing-review/supplemental/station-battery-limits-review.md) and [latest decisions and implementation status](drawing-review/supplemental/owner-scope-connections-review.md). Whole-network acceptance remains pending.

## Run locally

Prerequisites: Node.js 24 and pnpm 11. The dependency lockfile records the installed versions.

```powershell
pnpm install --frozen-lockfile
pnpm dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173/`.

Select CB-01 on the diagram or in the asset list. Choose **Open**, then select **LV bus**: its source connectivity becomes **No source connection**. Close CB-01 to restore the represented connection. Selection also works with Tab and Enter. These fixture positions are fictional software examples, not installed-equipment evidence.

Use **Model** to select an example or site construction area. Changing the model starts its recorded configuration again.

- **Synthetic alternate supplies:** open CB-01 and inspect the LV bus. Source B supplies it through the bus tie or loop link. Select a source-path explanation to highlight it. Select Source B to disable its availability; device positions are retained. Inspect **Last action impacts** for changes to connectivity and routes. The listed paths are examples; the route-change calculation also accounts for alternate paths that are not the displayed example.
- **Synthetic earth connections:** open CB-01, close ES-01 and inspect the LV bus. Its earth connection is shown independently of its source connection. Closing CB-01 while ES-01 remains closed reports a source-to-earth conflict. This fictional fixture does not define a prohibiting interlock. The separate LV bus does not receive a source through a shared earth group.

- **Synthetic physical interlocks:** ES-01 cannot close until CB-01 is open. CB-01 cannot close while ES-01 is closed. ES-02 has unresolved fictional interlocks and its controls remain disabled. Inspect the interlock explanation beside the controls.
- **Synthetic unconfirmed connections:** inspect the candidate LV supply and its linked evidence/review questions. Source B availability is unknown; the main LV bus retains its established Source A path while earth and off-page information remain unconfirmed.
- **Synthetic positions and windings:** set the device to Isolated and inspect LV bus A. Disable both fictional sources before selecting Earthed. Inspect the transformer's explicitly declared source-transfer and earth-continuity relationships. LV bus B has no transfer represented in this fixture.

Use the diagram's overview/detail buttons and cross-view connection links to navigate. Drag or use the pan controls; zoom with the buttons or use **Fit view**. Focus the diagram for arrow keys, +/− and Home. Navigation does not change the electrical scenario.

## Inspect the site construction models

Select **Whole network · construction / owner review pending** to inspect the assembled package. Its overview has 13 area cards that open detailed views. Use **Find view** to filter its 91 views; **Clear view search** restores the list. The [construction guide](docs/whole-network-construction.md) records cross-area joins, supplemental LV endpoints and scoped owner confirmations. The [owner review packet](docs/model-owner-review.md) records remaining decisions.

Current package: **`site-whole-network` / `construction-2026-10-22.18`**; code commit **`045a1e1`**. The current inventory is **680 assets, 677 connections, 360 controls with null starting positions, 3 sources with null availability, 139 earth terminations, 313 coverage boundaries and 91 views**, with 13 orientation regions and 24 contactors. The latest owner decisions confirm the RM413 cable-side fork, separate Hopper3/Hopper8 supplies, Hopper9→Hopper7 route, RM418 CB03/CB04 roles and RM413/TF413→MC413 supply. See the [route decision record](drawing-review/supplemental/owner-hopper-routes-review.md). The prior [identity corrections](drawing-review/supplemental/owner-identities-review.md), RM721/RM712/RM713 and SW712 connections, corrected TF12/OPF1-7 water spur and scope exclusions remain. Historical area and `.4` snapshots retain their original content. Counts describe software content, not installed coverage or acceptance.

Received supplemental pages now depict Hopper3 MV, Hopper8 MV/LV, Hopper10 MC420A LV and CV006 MC410A through its first LV bar. See the [western](drawing-review/supplemental/western-endpoints-review.md), [Hopper10](drawing-review/supplemental/hopper10-lv-review.md) and [MC410A](drawing-review/supplemental/cv006-lv-review.md) reviews for exact source and provenance limits. MC410B is downstream of MC410A's first LV bar and is excluded from current runtime phase connectivity; its source evidence remains retained.

Current `.18` retains the original MC413 detail introduced in `.14`, [00151-CB-02006-DR-EL-1001 rev 11 IFC](drawing-review/supplemental/mc413-detail-review.md), depicting CB MC413 IN 3000 A and the first 400 V / 3000 A bar. The owner confirms RM413's TF413 feeder→TF413→MC413 as the current supply; RC001 is not its current feeder reference. The cause of the RC001 label, reference-prefix equivalence, installed revision precedence, ratings and complete interlocks remain unconfirmed. The historical `.14` detail increment changed no electrical topology or starting state. Historical `.13` is code commit `afd043a` with 127 views.

Separate area packages include SW411, the station/33 kV line, Crushing 1, Crushing 2/HPGR, Screening, Desands/laboratory, Stockpile/wet plant, Train loading, CV006, Western hoppers, Services, Hopper10 and Mine/camp. Select an area, open a detail view and select an asset to inspect its identity, drawing aliases, source references and open questions. Long view lists scroll within their navigation panel. Separate areas retain their original drawing interpretations; owner corrections recorded in the assembled package do not rewrite those historical area packages.

These packages are labelled **Site model under construction — Not owner accepted**. Actual starting positions and source availability remain unconfirmed. Unresolved physical interlocks disable the affected switching controls. Missing LV endpoints, disputed source connections and transformer relationships remain visible review matters; they are not silently treated as accepted connections or disconnected equipment. The synthetic examples demonstrate switching while those installed-network facts await confirmation.

The [implementation progress](docs/implementation-progress.md) records the completed area slices and remaining whole-network acceptance work. The [drawing coverage register](drawing-review/coverage.md) records dispositions for all 141 supplied PDFs; that count does not establish installed-network correctness.

The development server binds to the local machine. There is no backend, account, external API or PDF dependency in the application.

## History and scenario files

Use **Undo last action** to restore the preceding accepted device/source states. **Reset network** restores the recorded baseline and clears history. Blocked changes add no history.

**Save scenario** downloads JSON containing the original model, diagram and selected states. **Open scenario** validates that file before replacing the active scenario. A matching model identity/version can be explored. A different identity/version opens its original snapshot as **View only**, with switching, source changes, undo and reset disabled. Navigation, inspection and tracing remain available. **Start current model** returns to the current model's baseline.

A changed model package requires a new version, including changes to topology, equipment identities, relationships, interlocks, baseline, evidence or diagram organisation. Files with changed content claiming a previously loaded identity/version are rejected. PDFs and separate historical model files are not required to reopen scenarios.

## Development checks

```powershell
pnpm typecheck
pnpm test:session
pnpm build
pnpm preview
```

Session tests exercise the approved application-facing boundary: load model, perform switching actions and observe results. The tests do not inspect traversal internals. `pnpm test` runs the full test suite.

## Project records

- [Specification](docs/specs/interactive-hv-network.md)
- [Published implementation tickets](docs/tickets/README.md)
- [Implementation progress](docs/implementation-progress.md)
- [Domain vocabulary](CONTEXT.md)
- [Tooling and architecture](docs/adr/0001-local-application-and-session.md)
- [Drawing review queue](drawing-review/review-queue.md)

Raw drawings remain local and are excluded from Git. A real model and its starting configuration require evidence review and explicit owner acceptance against a model version.
