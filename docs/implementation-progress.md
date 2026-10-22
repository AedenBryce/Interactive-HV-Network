# Implementation progress

The complete scope remains all 25 published implementation tickets and owner acceptance of the whole-network model. This record does not replace GitHub acceptance criteria.

## GitHub #2: first switching simulation

Implemented and reviewed locally. Implementation commit: `0836d48`; review baseline: `d753765` (owner approved).

- Synthetic source → CB-01 → TF-01 → LV bus model, version `fixture-1.0`.
- React/Vite local application, SVG single-line diagram, list/diagram selection, asset inspector and switching controls.
- Session-owned source connectivity, detached snapshots and atomic model validation.
- Session tests observed red before implementation, then passed for switching and invalid-input preservation.
- Typecheck and production build passed.
- Chrome browser check: Open CB-01, select LV bus and observe no source connection; Close CB-01 and observe the bus reconnect. No warning/error console messages were returned during the check.
- Separate standards and specification reviews reported no material findings for this ticket.
- Desktop screenshot compared with the design reference using image inspection: header/rail/canvas/inspector arrangement, copy, navy/teal/orange palette, symbol treatment and control spacing checked. The first direct screenshot was 1704 × 1214; later checks used temporary same-origin frames at the reference size of 1586 × 992 and a narrow 390 × 844 viewport. Narrow diagram labels now retain a readable scale in a dedicated scroll region.
- Model construction, other simulation features and all real-area tickets remain outstanding.

## Remaining acceptance gates

Whole-network source review, area models, cross-area reconciliation, baseline/interlock/source confirmation and explicit owner acceptance remain required. No installed-network fact has been confirmed by this software slice.

## GitHub #3 and #4: alternate supplies and earth connectivity

Implemented locally in parallel, reviewed and closed in GitHub. Implementation commit: `81e26d0`; review fix: `f51e2e0`.

- #3: two sources, two HV buses, bus tie and loop-link fixture; source availability actions; example source paths; exact alternate-route change detection without enumerating all paths; affected-asset and path highlights.
- #4: explicit earth terminations, independent terminal earth results, source-to-earth conflict paths and two separate circuits sharing earth group metadata. Earth is a trace sink, never a supply-through node.
- Both use the same active conductive graph and session boundary. UI components only display returned connectivity, paths and impacts.
- Targeted source/path, earth and original switching test files and typechecking pass. The production build passes.
- Chrome: open CB-01 in the alternate fixture, inspect the surviving Source B path, highlight it, disable Source B and inspect the disconnected LV bus. In the earth fixture, open CB-01, close ES-01 and inspect an earthed LV bus without source connectivity; close CB-01 and inspect the explicit conflict. No console warning/error messages returned.
- Desktop layout fixed after browser inspection: contain the inspector scroll within the viewport; move HV bus and tie labels clear of the vertical connection.
- Standards review found duplicated path reconstruction, consolidated into the shared path helper. Specification review found source-set changes being reported as changed connectivity classifications; regression tests reproduced the issue before the classification/explanation distinction was corrected. Both review axes then reported no remaining material findings.
- Fresh-browser verification confirms the retained Source B path is shown as “Supply route changed; source connection retained.”
- All models remain synthetic. Real model acceptance and physical interlock enforcement remain outstanding.

## GitHub #5–#11: interlocks, uncertainty, equipment, navigation and scenarios

- #5: physical interlocks, explicit review status and blocked-control explanations.
- #6: provisional/unknown facts, source evidence and material connectivity uncertainty.
- #9: overview/detail navigation and pan/zoom over one simulation session.
- #7: explicit multi-position and multi-winding source/earth relationships.
- #8: accepted action history, full-state undo and baseline reset.
- #10/#11: self-contained scenario files, immutable package identity and original-snapshot historical viewing.

These seven software slices are implemented locally and closed in GitHub after review. Implementation commit: `887ccde`; approved review baseline: `d753765`. The completion checklists and closed states were verified through the GitHub API.

- #5 has 23 targeted session checks passing for allowed/blocked transitions, explicit/missing/unresolved review, evidence, source predicates and three-valued AND/OR conditions. Browser checks confirm disabled close controls and the permitted fictional breaker/earth-switch sequence.
- #6 has 10 targeted session checks passing for provisional routes, unknown source/device states, independent uncertain earths/conflicts, off-page coverage, evidence integrity, retained definite supply and invariant relationships. Browser checks show exact fictional source references and review questions, unknown Source B availability, and the known Source A path beside uncertain earth/off-page data.
- #9 browser checks demonstrate switching across incoming/transformer views, following cross-view connections, retained selection/tracing, zoom, pan and Fit. Presentation remains separate from topology.
- Earlier switching (11), alternate supply (4) and earthing (7) checks pass after integration. Typechecking and production build pass.
- Detailed SW411 and power-station/33 kV evidence reviews are prepared under `drawing-review/areas/`. They are construction evidence, not runtime models or owner acceptance. No additional unique-PDF coverage count is claimed because these reviews revisit initial sheets in more detail.

- #7: eight targeted session checks pass for declared positions, explicit source transfer/backfeed, separate earth continuity, blocked/unsupported requests, unknown positions and real-transformer validation. Browser checks show Service → Isolated removing LV supply, disabled Earthed until both fictional sources are disabled, then the selected earth relationship. Enabling the explicitly represented LV source demonstrates the reverse source path and conflict while terminal earth results remain separate.
- #8: seven targeted checks pass for accepted history, blocked/no-op exclusion, null-state preservation, complete-state undo, reset and atomic model replacement. Browser checks cover switching, source toggling, undo/reset and a blocked interlock control.
- #10/#11: 16 scenario and six historical-view checks pass. Browser Save downloads the changed breaker state; Open restores it after reset. A different version with a renamed breaker opens its original diagram and identity, disables device/source/undo/reset controls and permits navigation, zoom and tracing. Malformed JSON preserves the historical scenario and displays its error.
- Model-presentation validation has three session checks. A standards review reproduced an immutable-package collision between topology-only fixtures and complete diagram packages. Complete packages now have distinct `-presentation.1` versions; the regression passed after the repair and re-review confirmed resolution.
- Specification review found two uncertainty defects: missing earth-route evidence and unsupported boundary completeness being trusted. Both were reproduced by session regressions, repaired and independently re-reviewed. Standards and specification reviews reported no remaining material findings in these completed software slices.
- There are 95 passing targeted checks across ten session test files. Files were run individually; the whole-goal final full-suite check remains pending. Production build and typecheck pass.
- The browser download-event wait stalled once; the actual downloaded file was verified on disk. Subsequent direct Save and concurrent file-chooser handling completed successfully. This was not reported as a successful check until the saved content and reopened UI were observed.

## GitHub #12–#15: four provisional site areas

Implemented locally in commit `58df8a7`, reviewed against the approved baseline `d753765`, and closed in GitHub. API verification confirms all six acceptance items checked on each ticket and no open blockers. These construction slices do not establish installed-network correctness or owner acceptance.

| Ticket | Runtime model | Targeted session checks |
| --- | --- | --- |
| #12 | SW411 bus sections, incomers, tie, earth devices, feeder aliases and unconfirmed external interfaces | 30 passed |
| #13 | Station SB01/SB02, 23 generator branches, separate tie breakers/fuse and 33 kV line interfaces | 11 passed |
| #14 | SW431/Crushing No.1, SW435 interface, transformer branches and seven distinct final LV buses | 5 passed |
| #15 | SW435/Crushing No.2, HPGR intermediate HV, six final LV buses and separate unresolved MV converter groups | 6 passed |

All 52 checks passed together as a targeted four-file run. The production build passed after catalog integration. A subsequent station label-only presentation adjustment has a distinct model version (`construction-2026-10-22.2`); its 11 checks passed again.

The app distinguishes these real construction models from the synthetic demonstrations. Drawing aliases, exact evidence references, open questions, unknown device/source baselines and unconfirmed coverage remain inspectable. Unresolved physical interlocks disable affected controls. No converter AC/DC shortcut or neutral/MEN-to-phase earth connection is invented.

Browser verification used the existing Chrome tab at `http://127.0.0.1:5173/`, at 1704 × 1214. The Browser plugin was not available; CUA's documented Playwright/Chrome controls were used. Model selection, station generator/detail/line navigation, source Enable and Undo, disabled unresolved breaker controls, distinct Crushing LV buses, and HPGR converter terminal inspection were exercised. A downloaded HPGR scenario reopened with its original model and unresolved relationships. No warning/error console messages were returned during the fresh check. The station generator earth-switch labels were moved clear of breaker labels and visually rechecked. Narrow layouts were checked earlier for the shared application; these four new area layouts have not each been checked at a narrow viewport.

### Standards

No material documented-standard violations found in `d753765...58df8a7`. Evidence, nullable baselines, blocked unresolved controls and separate transformer channels follow ADRs 0003–0005. Fowler heuristics were considered; repeated declarative records and area helpers did not warrant a material finding in this scope.

### Spec

No material findings for #12–#15 in `d753765...58df8a7`. Documented topology, device/winding identities, aliases, continuation gaps and provisional state/interlock information are preserved. No scope creep identified. Whole-network assembly, missing-source reconciliation and owner acceptance remain pending under later tickets.

Review summary: Standards 0 material findings; Spec 0 material findings. Neither review establishes installed-network acceptance.

## GitHub #16–#19: screening, Desands, stockpile/wet plant and train loading

Four more provisional area slices are implemented locally and closed in GitHub after targeted checks, rendered inspection and parallel review. Commits: `ccacd3a` (#16/#17/#19), `dc5b557` (#18), and `e84a55b` (stockpile diagram refinements). The closure/checklist states were verified through the GitHub API.

| Ticket | Runtime boundary | Targeted session checks |
| --- | --- | --- |
| #16 | SW421, three transformers, four final LV buses and spare interfaces | 6 passed |
| #17 | SW426, laboratory RM714/SW714, nine transformers and 14 final LV buses; services references remain separate interfaces | 6 passed |
| #18 | SW454/SW505, six evidenced LV buses, missing-endpoint interfaces and three unresolved MV converter branches | 6 passed |
| #19 | SW451, TF451/TF452, three final LV buses and the drawn MC451B section bridge | 6 passed |

All actual area positions remain null and affected unresolved interlocks block controls. Fictional operability examples have distinct identities/versions and explicitly defined software constraints; their results do not establish installed behavior. Model-owned views, exact source references, open questions and scenario round trips are included.

Chrome checks at 1704 × 1214 covered model selection, detailed LV bus navigation and inspection, laboratory navigation, disabled controls, converter/DC-earth inspection and zoom. Screening newline labels now render on separate lines. Desands has readable two-transformer details (`construction-2026-10-22.2`). Stockpile has two closer LV views, separated fuse/converter/DC-earth/output labels and version `construction-2026-10-22.3`; its six checks passed again after refinement. No warning/error console messages were returned in the fresh browser check. Individual narrow area layouts remain unchecked.

Production build passed at `dc5b557`, with Vite's advisory for a 520.43 kB minified application chunk (153.05 kB gzip). A later typecheck reported only unfinished, untracked CV006/western-hopper worker declarations; it is not recorded as a passing whole-workspace check. No final whole-suite run has been performed yet.

### Standards

No material documented-standard breaches or actionable Fowler findings in `d753765...ccacd3a` for #16/#17/#19, or in the stockpile increment through `dc5b557`. Unknown baselines, blocked unresolved controls, separate channels and provisional evidence are preserved. The subsequent stockpile label/detail refinements were checked through session tests and browser inspection; final whole-goal review remains pending.

### Spec

No material missing/wrong behavior or scope creep found for these four area slices at the pinned commits. Laboratory/services references remain distinct; MC451B continuity does not create another source; incomplete LV endpoints and MV converter groups remain explicit questions. Whole-network integration and owner acceptance remain pending.

Review summary: Standards 0 material findings; Spec 0 material findings. Neither axis constitutes installed-network acceptance.

## Current area-model work

Eighteen of 25 implementation tickets are closed (#2–#19). Five real-area slices, whole-network reconciliation/owner acceptance and final delivery remain required.

CV006 and western-hopper runtime models are being built in parallel in separately owned files. Services and Hopper10 source reviews are prepared; mine/camp and remaining source dispositions are being reviewed. The coverage register names all 141 original PDFs and their dispositions; its current committed table names 115 files in explicit area-review source rows, before reconciliation of the latest Hopper10/mine work. That count describes recorded inspection scope, not blanket topology approval or model acceptance.

An additional Farwest revision-9 drawing was retrieved from PIMS and visually inspected as a supplemental source lead. It is outside the original 141-file count and has not been incorporated into the runtime model. Its interfaces, V1 extent and final LV coverage require reconciliation. The station manual download was blocked by the browser; the missing DB01 drawing revision/topology remains unconfirmed. See `drawing-review/supplemental/farwest-review.md`.

