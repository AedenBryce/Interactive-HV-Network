# Interactive HV Network

A local browser application for understanding represented network connections and downstream switching impacts.

**Current models: synthetic demonstrations, 13 provisional site areas and an assembled whole-network construction.** The construction has owner-selected starting positions and complete V1 local control profiles. Remaining electrical/coverage discrepancies and whole-model acceptance are open. The application reports connectivity, without electrical calculations or operational isolation authorisation.

**Confirmed scope:** only SB01 F4/TF11, SB02 F1/TF12 and SB02 F4/western TF04 remain at the station, beginning at their feeder-breaker inputs. Station buses, generators and other feeders are excluded; DB01/DB01B are no longer active detail requests. The owner has also excluded downstream mine-services, village/camp and RM718 unloading, and limited other TF-04 line branches to takeoff points while retaining the Hopper 10 route. SW441/TF441/MC441 water-tower/process-water is included, supplied from the TF12 line's OPF1-7 spur through WT1-CB to SW441 IN01. MC431A is excluded downstream of MC431. See the [owner scope amendment](docs/specs/interactive-hv-network.md#owner-scope-amendment--22-october-2026), [station boundary](drawing-review/supplemental/station-battery-limits-review.md) and [latest decisions and implementation status](drawing-review/supplemental/owner-scope-connections-review.md). Whole-network acceptance remains pending.

## Run locally

Drop Tower is included from the CV006 pole17/17-1 branch through the two confirmed HV ABS controls to P18-8 TF, which is the explicit V1 endpoint. Its LV/changeover equipment is excluded by owner87. RM713 IN02, RM714 IN02 and RM417 SW02 have no external cables; their installed controls, selected positions and local profiles remain. See [owner83–89 decisions](drawing-review/supplemental/owner-network-continuations-review.md).

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
- **Synthetic removable breaker:** select the fictional breaker, choose **Open**, then **Rack out**. Contact and racking positions are shown separately. Open/Close is blocked while racked out; Rack in/out requires the breaker Open. Rack in and Close to restore the final LV bus's source connection. Undo, reset and scenario files preserve both values independently. This example establishes no site-equipment classification or baseline.
- **Synthetic directed source transfer:** inspect the transformer's solid forward arrow and dashed unconfirmed reverse arrow, with separate evidence and review links. Disable HV source A, set DS-01 to Isolated, then enable LV source B. The supplied secondary remains connected; reverse transfer onto the primary remains a candidate path. Winding B has no transfer declared in this fictional example.
- **Synthetic unconfirmed connections:** inspect the candidate LV supply and its linked evidence/review questions. Source B availability is unknown; the main LV bus retains its established Source A path while earth and off-page information remain unconfirmed.
- **Synthetic positions and windings:** set the device to Isolated and inspect LV bus A. Disable both fictional sources before selecting Earthed. Inspect the transformer's explicitly declared source-transfer and earth-continuity relationships. LV bus B has no transfer represented in this fixture.

Use the diagram's overview/detail buttons and cross-view connection links to navigate. Drag or use the pan controls; zoom with the buttons or use **Fit view**. Focus the diagram for arrow keys, +/− and Home. Navigation does not change the electrical scenario.

## Inspect the site construction models

Select **Whole network · construction / owner review pending** to inspect the assembled package. Its overview has 13 area cards that open detailed views. Use **Find view** to filter its 92 views; **Clear view search** restores the list. The [construction guide](docs/whole-network-construction.md) records cross-area joins, supplemental LV endpoints and scoped owner confirmations. The [owner review packet](docs/model-owner-review.md) records remaining decisions.

Current package: **`site-whole-network` / `construction-2026-10-23.8`**. Inventory is684 assets,677 connections,362 controls,3 sources,139 earth terminations,318 coverage boundaries and92 views. All362 contact positions and148 racking positions are selected for the teaching baseline:121 breakers,24 contactors and3 HPGR disconnectors, with145 Rack in and3 named ties Rack out. The3 abstract supplies are available. These are simulation values, not live site states. The [local profile records](drawing-review/supplemental/owner-interlocks-review.md) and [electrical policy decisions](drawing-review/supplemental/owner-electrical-policy-review.md) retain each selection. Each removable device retains its kind; selected relationships do not promote unrelated equipment claims.

The selected local profiles cover all362 controls (281 with declared rules;81 without additional declared local rules), with559 rules and no unresolved local control reviews. Intrinsic guards remain mandatory. Bus Earth Close requires every exact listed breaker Open/Rack out. Each motor maintenance Earth Close requires both FC/RC contactors Open/Rack out; Forward and Reverse Close are mutually exclusive. The two HPGR motor-side outlets start Service and require own K101 Open/Rack out before movement; Service↔Earthed passes through Isolated, and Service also requires own DC earth Open. Only the named cross-station, owner49 sequences and owner82's two outlet Fortress-key sequences are deferred.

Owner78's31 series fuses and Drop Tower's HV fuse have fixed modeled source continuity and no fuse actions. Five included MV converters use the selected rule: either supplied AC input supplies DC, then output; output contacts/outlets still interrupt the motor route. Converter earth groups stay separate; reverse transfer, stored energy and discharge remain Unconfirmed. A supplied closed DC earth reports conflict without silently removing supply. Together with transformer claims, the model has255 source arcs:165 selected and90 unresolved. Parent metadata and actual fuse/converter behavior remain separate claims.

RM406/RM410/RM417/RM419 three-position switches must pass through Isolated between Service and Earthed; outgoing switch movement requires its CB Open, and CB Close requires its switch Service. RM714 and SW505 output/DC-earth pairs mutually gate Close on their own counterpart Open. RM714 earth presence is separately owner-confirmed; detailed paths remain under review. Stored-energy/discharge behavior remains Unconfirmed.

All61 transformers now carry176 explicit source-transfer claims:86 selected primary-to-secondary claims and90 Unconfirmed reverse/alternate-input claims. Externally supplied secondaries remain visible; no known reverse onto the primary, metallic winding link or direct secondary-secondary relationship is invented. Parent equipment and independent earth knowledge remain separate. The three selected abstract source claims and exact feeder-input software links are recorded as model inputs only. See the [transformer policy review](drawing-review/supplemental/transformer-direction-review.md).

Historical `.7`/`.6`/`.5`/`.4`/`.3`/`.2`/`.1` packages retain their original content and reopen view-only. The former22kV Hopper10 controls are owner-confirmed absent and retained only as disconnected historical markers. The current TF04 33kV route remains separate. Code identity and checks are in [implementation progress](docs/implementation-progress.md). Whole-model acceptance remains pending.

Received supplemental pages now depict Hopper3 MV, Hopper8 MV/LV, Hopper10 MC420A LV and CV006 MC410A through its first LV bar. See the [western](drawing-review/supplemental/western-endpoints-review.md), [Hopper10](drawing-review/supplemental/hopper10-lv-review.md) and [MC410A](drawing-review/supplemental/cv006-lv-review.md) reviews for exact source and provenance limits. MC410B is downstream of MC410A's first LV bar and is excluded from current runtime phase connectivity; its source evidence remains retained.

The current 23 October package retains the original MC413 detail introduced in `.14`, [00151-CB-02006-DR-EL-1001 rev11 IFC](drawing-review/supplemental/mc413-detail-review.md), depicting CB MC413 IN3000A and the first400V/3000A bar. The owner confirms RM413's TF413 feeder→TF413→MC413 as the current supply; RC001 is not its current feeder reference. The cause of that label, reference-prefix equivalence, installed revision precedence and ratings remain unconfirmed. The selected local incomer profile is recorded separately. The historical `.14` detail increment changed no electrical topology or starting state.

Separate area packages include SW411, the station/33 kV line, Crushing 1, Crushing 2/HPGR, Screening, Desands/laboratory, Stockpile/wet plant, Train loading, CV006, Western hoppers, Services, Hopper10 and Mine/camp. Select an area, open a detail view and select an asset to inspect its identity, drawing aliases, source references and open questions. Long view lists scroll within their navigation panel. Separate areas retain their original drawing interpretations; owner corrections recorded in the assembled package do not rewrite those historical area packages.

These packages are labelled **Site model under construction — Not owner accepted**. Actual starting positions and source availability remain unconfirmed. Unresolved physical interlocks disable the affected switching controls. Missing LV endpoints, disputed source connections and transformer relationships remain visible review matters; they are not silently treated as accepted connections or disconnected equipment. The synthetic examples demonstrate switching while those installed-network facts await confirmation.

The [implementation progress](docs/implementation-progress.md) records the completed area slices and remaining whole-network acceptance work. The [drawing coverage register](drawing-review/coverage.md) records dispositions for all 141 supplied PDFs; that count does not establish installed-network correctness.

The development server binds to the local machine. There is no backend, account, external API or PDF dependency in the application.

## History and scenario files

Use **Undo last action** to restore the preceding accepted device/source states. **Reset network** restores the recorded baseline and clears history. Blocked changes add no history.

**Save scenario** downloads JSON containing the original model, diagram and selected states. **Open scenario** validates that file before replacing the active scenario. A matching model identity/version can be explored. A different identity/version opens its original snapshot as **View only**, with switching, source changes, undo and reset disabled. Navigation, inspection and tracing remain available. **Start current model** returns to the current model's baseline.

A changed model package requires a new version, including changes to topology, equipment identities, relationships, interlocks, baseline, evidence or diagram organisation. Files with changed content claiming a previously loaded identity/version are rejected. PDFs and separate historical model files are not required to reopen scenarios.

## Run the production build locally

From this repository folder, with Node.js24 and pnpm11 available:

```powershell
pnpm install --frozen-lockfile
pnpm build
pnpm preview --port 4173 --strictPort
```

Keep that terminal running and open `http://127.0.0.1:4173/`. Choose **Whole network · construction / owner review pending** in **Model**. The model panel identifies the loaded version. Use **Find view** to reach a board, select an asset, then inspect its state, permitted actions, interlock explanation and source/earth paths. **Reset network** restores its selected teaching configuration.

The production files are in `dist/`. The model and diagram are bundled in the JavaScript; source drawings are excluded from that package. Keep saved scenario JSON files when updating the application: they contain the original model needed for historical viewing. [Delivery verification](docs/delivery-verification.md) records the exact package and operations checked; final accepted-model delivery is still pending. Stop the preview with Ctrl+C. A busy port produces an error because `--strictPort` prevents switching silently to another port.

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
