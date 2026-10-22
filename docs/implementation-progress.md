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

## Current area-model work

Ten of 25 implementation tickets are closed (#2–#11). The 13 real-area models, whole-network reconciliation/owner acceptance and final delivery remain required.

SW411, power station/33 kV, Crushing 1, Crushing 2/HPGR and screening evidence reviews are prepared. Desands/laboratory and stockpile/wet-plant reviews are in progress. These local reviews retain exact source references and discrepancies; they do not establish installed status, starting states or owner acceptance. Counts from separate reviews must be deduplicated before updating whole-drawing coverage.

SW411 runtime construction has started with unconfirmed baseline/source/interlock records. Its source and downstream interfaces must retain incomplete coverage until the adjoining areas are reconciled.

