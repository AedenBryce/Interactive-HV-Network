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

## GitHub #20–#24: CV006, western hoppers, services, Hopper10 and mine/camp

Implemented locally in `189841d`, independently reviewed against the approved baseline `d753765`, and closed in GitHub. API verification confirms six checked acceptance items and no unchecked items on each ticket. Twenty-three of 25 implementation tickets are now closed (#2–#24). Whole-network reconciliation/owner acceptance (#25) and final accepted delivery (#26) remain open.

| Ticket | Construction model | Targeted session checks |
| --- | --- | --- |
| #20 | CV006 overhead/RM406/RM410, separate VSD AC boundaries, MC406A and the unconfirmed MC410A→MC410B chain | 6 passed |
| #21 | Western Hopper 1/3/7/8/9, scoped SS416 identities, RM417/418/419 and three final LV buses | 12 passed |
| #22 | RM721/services, RM712 DG1/DG7 with undefined MCS matrix and removed TF712 cable, RM412/413/413A and seven first LV buses | 8 passed |
| #23 | Hopper10/RM420, unjoined 22/33 kV alternatives and dual-primary selection gaps, distinct MV contactor paths and missing MC420A detail | 6 passed |
| #24 | Mine/camp ring, generation, RM700/732, supplied mine branches and water-tower endpoint; legacy/study conflicts retained | 7 passed |

All 39 checks passed together after the area refinements. Fictional switching examples remain separately identified and versioned. Actual controls remain null and blocked where interlocks are unresolved; actual source availability remains unconfirmed. Missing endpoint and external-source coverage remains explicit.

Chrome checks at 1704 × 1214 covered model selection and detail navigation, first-LV inspection, Hopper10 primary gaps and paired motor paths, disabled binary/three-position controls, the undefined services MCS matrix and separate RM412 LV conductors. Readability repairs widened CV006 AC input spacing, narrowed western two-asset LV views, cleared services transformer captions and repaired mine/camp text encoding. Those area packages now use `construction-2026-10-22.2`. Unknown-position question marks stay upright when symbols rotate. View navigation now scrolls within 140 px so the mine/camp's 43 views leave usable diagram space. No warning/error console entries were returned in the fresh browser check. Individual narrow area layouts remain unchecked.

The integrated application build/typecheck passed before whole-network test construction began (655.04 kB application chunk; 194.55 kB gzip, with Vite's size advisory). A subsequent build encountered the assembly agent's intentionally unresolved first test import; this is not recorded as a final passing workspace build. The whole-goal full-suite run remains pending.

### Standards

No actionable documented-standard violations or material Fowler heuristic findings in `d753765...189841d`, including the prior stockpile presentation refinement. Evidence, unknown baselines, blocked controls, separate transformer channels, immutable versions and the approved session test seam are preserved.

### Spec

No material missing requirements, incorrect behavior or scope creep found for these five area slices or the stockpile refinement. Identity conflicts, unconfirmed interfaces, missing endpoints and physical-interlock gaps remain visible. Whole-network assembly and owner acceptance remain separate requirements.

Review summary: Standards 0 material findings; Spec 0 material findings. Neither review establishes installed-network correctness or owner acceptance.

## Whole-network construction and owner review (#25, open)

Commit `848bdfd` records the stable `site-whole-network` / `construction-2026-10-22.4` assembly: 13 original area packages, 961 assets, 558 null controls, 28 null sources, 357 coverage boundaries and 123 views. The orientation has 13 navigable area cards; view search filters the detail list. The CV006 conducting proxy through RM419 is removed, retaining the western area's actual RM419/RM418 devices and cable once. Seventeen cross-area joins retain their supported, provisional or owner-confirmed status; unsupported interfaces remain explicit gaps.

Five scoped owner decisions dated 22 October 2026 record the TF04 33 kV Hopper10 feed, both selected 33 kV transformer inputs, SW411 tier03's current RM406/RM410 22 kV feed and removal of the former 22 kV Hopper10 line, TF11/TF12 to IN03/IN04 with IN01/IN02 unused, and corrected tier16 CB/ES model tags. Remaining hardware, cable, winding, source availability, baseline and interlock questions are retained. See the [construction guide](whole-network-construction.md) and [owner packet](model-owner-review.md). No whole-network acceptance has been given.

The coverage register names all 141 original PDFs in explicit area-review source rows, with 140 unique hashes and no unmatched files. The byte-identical duplicate has an explicit disposition; a row is a pointer to the recorded inspection scope, not an independent topology approval or model acceptance.

Shared calculation/indexing changes in `400a7b3` reduced measured snapshot time for the same pinned construction from roughly 6–7 seconds to 2.13–2.64 seconds, with identical serialized snapshots in each comparison. These are local diagnostic timings, not an agreed performance acceptance threshold. The UI yields before whole-network actions and shows progress. Evidence/path groups are collapsed so the inspector is usable; the view list scrolls separately. The unused graph-walk wrapper noted by Standards was removed in `c2f1c5d` and checked by that reviewer.

The 13 targeted whole-network session checks pass, including owner decisions, removed former-line connections, package round trips, region navigation data and explicitly fictional cross-area switching contracts. `pnpm build` passes (689.69 kB minified application chunk / 204.34 kB gzip, Vite size advisory). Chrome at 1704 × 1214 opens `.4`, follows the Hopper10 overview card, filters views and displays the confirmed TF04 route with switching still blocked. A saved `.4` scenario was downloaded and reopened with a matching-version restoration message. The browser automation's large accessibility-tree capture timed out during that check; subsequent focused DOM reads confirmed the result. The full suite remains reserved for final whole-goal delivery.

### Standards

No hard documented-standard violations in `d753765...848bdfd`. One optional P3 heuristic remains: intermediate review-question/evidence-summary assignments in `whole-network.ts` are overwritten by later owner-decision processing. Consolidating those final assignments would make construction easier to audit; no incorrect final package content was reported. Shared performance/UI review through `400a7b3` otherwise had no remaining hard findings.

### Spec

No actionable implementation defects or scope creep in the reviewed assembly at `848bdfd`. The explicit owner-acceptance and agreed starting-configuration requirement remains open. Software review and test results do not establish installed-network correctness.

Review summary: Standards 0 hard violations and 1 optional heuristic; Spec 0 actionable findings. #25 and #26 remain open.

An additional Farwest revision-9 drawing was retrieved from PIMS and visually inspected as a supplemental source lead. It is outside the original 141-file count and has not been incorporated into the runtime model. Its interfaces, V1 extent and final LV coverage require reconciliation. The station manual download was blocked by the browser; the missing DB01 drawing revision/topology remains unconfirmed. See `drawing-review/supplemental/farwest-review.md`.

## Supplemental LV endpoints and sixth owner decision

Commit `3e44704` records current `site-whole-network` / `construction-2026-10-22.8`. The immutable `.4` assembly remains unchanged. Current construction adds four first LV bars and four null/blocked incomers from three visually reviewed supplemental source pages: SW455 D/Y, Hopper3 SS416-MC416A and MC454. Three detail views and reverse navigation bring the package to 969 assets, 562 controls, 28 sources, 361 boundaries and 126 views. Outgoing LV circuits are excluded; existing transformer channels and independent earth coverage are preserved. The original source inventory remains 141 files, with these additional sources recorded separately.

The sixth exact owner response, “your assumption is correct tht it is RM721-P-01”, is recorded as `WN-SW411-TIER16-CABLE`, dated 22 October 2026 by Project owner (conversation). It confirms the cable tag; original SW454-P-01 drawing text remains traceable. Physical nameplate inspection, whole-route acceptance, actual states and complete interlocks are not inferred. The partial R002/SV-Q01/WN-JOIN-rm721 questions no longer ask for the cable tag.

Supplemental installed precedence remains unconfirmed. MC454's printed 3000 A incomer and 500 A phase-bar ratings remain an explicit discrepancy, without correcting either value. The [source review](../drawing-review/supplemental/endpoint-sources-review.md) records exact document/revision/page/region references, capture fingerprints and the local original MC454 PDF hash. Original source captures/PDF are retained under ignored `drawings/supplemental/`; runtime exploration does not read them.

### Checks and browser evidence

- Five targeted supplemental session checks and two current-package checks pass. The combined run initially exceeded the default five-second timeout in the whole-model historical round-trip test; its explicit allowance is now 20 seconds, and the combined endpoint/current checks passed. The two current-package checks passed again after the sixth owner decision.
- Production build/typecheck pass at `.8`: 706.16 kB minified application chunk, 208.56 kB gzip, with Vite's size advisory. The built directory contains only HTML, JavaScript and CSS.
- Chrome production preview at `http://127.0.0.1:4173/`, 1704 × 1214, opens `.8` and the new endpoint views. Caption overlaps found in intermediate `.5`/`.6` were corrected under new versions; `.7` introduced the final spacing and `.8` retains it. Endpoint controls remain disabled with explicit unresolved-interlock reasons.
- Saving `.8` produced a 9,032,487-byte self-contained scenario. Reopening it against current `.8` reports restoration, with reset enabled and no historical notice. Opening the original saved `.4` against current `.8` displays both versions and view-only mode; device controls, source Enable/Disable, undo and reset are disabled. **Start current model** returns to `.8`.
- These checks used the production server serving only `dist`; it has no source PDFs or separate historical model file. No warning/error console entries were returned from the production tab.
- The full suite remains reserved for final whole-goal delivery. Narrow whole-network layouts and overall owner acceptance remain pending.

### Standards

No new hard documented-standard violations or actionable Fowler heuristics in `848bdfd..3e44704`, reviewed within `d753765...3e44704`. Clone/version contracts, source references, null/blocked controls, separate D/Y conductors, scoped cable confirmation and the public session test seam are preserved. The existing optional P3 repeated-assignment cleanup in `.4` remains unchanged.

### Spec

No actionable missing behavior, incorrect implementation or scope creep in the supplemental/current-package increment. Endpoint scope, separate Hopper3/Hopper8 identity, historical presentation/evidence and unresolved physical information are preserved. Explicit owner model acceptance and an agreed starting configuration remain open under #25.

Review summary: Standards 0 new hard/heuristic findings, 1 existing optional P3; Spec 0 actionable findings. GitHub #25 has four checked and four unchecked criteria and remains open. #26 remains open. No model acceptance, final delivery completion, remote push or production GPT Site deployment is claimed.


## Further endpoint details, contactors and scoped owner decisions (`.11`)

Commit `90b5663` records `site-whole-network` / `construction-2026-10-22.11`. Five additional visually inspected source pages extend Hopper 3/8 MV, Hopper 8 LV, Hopper 10 MC420A LV and CV006 MC410A. The source registers distinguish indexed captures from verified local PDFs and do not claim a successful original download or portal-byte equivalence where unconfirmed. These supplements are separate from the original 141-file inventory. Runtime exploration continues to use no PDFs.

- Hopper 3 and Hopper 8 each retain separate source-scoped incoming devices, cable-side incoming earths and two motor groups with parallel fused RC/FC phase paths and independent maintenance earths. Their 6.6/6.9 kV discrepancy, fuse conditions and complete key/interlock mapping remain open.
- MC420A now includes ACB01 MAIN SWITCH 2000 A and the first 415 VAC / 2600 A phase bar. MC410A now includes its 630 A incomer and first 415 V / 630 A phase bar, preserving the TF410B 433 V / 415 V discrepancy. The former runtime MC410A→MC410B bypass and outgoing MC410B circuit are excluded; historical packages and evidence remain intact. Removal rejects a source attached to excluded equipment or a retained interlock depending on it.
- The schema and inspector now support **Contactor**. Exactly 24 evidenced RC/FC assets in the current clone receive this classification. Their terminals, conductive candidates, unknown positions and unresolved interlock reviews are preserved; historical area packages retain their original classification.
- Owner response 7, exactly “confirmed”, records the current SW431-P-02 tie with CB SW435 FD02 at SW431 and CB SW431 FD02 at SW435. Response 8, exactly “It does”, confirms SB01 F1 through TF03 currently supplies RM711/the mine-services 22 kV line. Both records retain their full question context, owner/date and source references. These scoped confirmations do not accept states, source availability, complete interlocks, study overlaps or the whole model.

The saved browser `.11` scenario verifies 1,007 assets, 580 null controls, 28 null sources, 365 coverage boundaries, 1,006 connections and 135 views. Its 17 cross-area joins comprise 9 supported, 2 provisional and 6 owner-confirmed; the 2 owner-confirmed selected 33 kV primary links are separate. All global acceptance/configuration gates remain open.

### Checks

Twenty targeted checks across the current package, western extension, Hopper 10 LV, CV006 LV and contactor session files passed together with one worker. The owner-feed regression first failed on the absent confirmation and then passed. Typecheck/production build passed: 739.72 kB minified application chunk, 217.36 kB gzip, with Vite's size advisory. The whole-goal full suite remains reserved for final delivery.

Chrome at 1704 × 1214 on the built-only production preview verified the contactor inspector/blocked controls and Hopper 3 motor, Hopper 8 LV, MC420A and MC410A details. A matching `.11` scenario (9,167,858 bytes) reopened with “Scenario opened. Connectivity restored.” and reset enabled. Historical `.8` reopened against `.11` with both versions shown, view-only status and source changes/undo/reset disabled. Start current model restored `.11`. No warning/error console entries were returned. Large-model browser commands sometimes exceeded their initial response timeout; subsequent focused DOM reads confirmed the resulting state without restarting the server or repeating the action.

### Review and subsequent scope amendment

Separate Standards and Spec reviews of `d753765...90b5663` each identified the stale `.8` owner packet/current inventory as one P2 documentation finding; neither identified an electrical implementation defect in this increment. The existing optional P3 repeated-assignment cleanup in historical `.4` remains unchanged. Commit `e649563` corrects the owner packet, construction guide, README and scope record. Both reviewers independently confirmed their P2 finding resolved, with no new hard Standards or actionable Spec findings. The optional historical P3 remains.

The owner subsequently limited station coverage to TF11, TF12 and western TF04, beginning at their SB01/SB02 feeder breakers and retaining those feeders/transformers while excluding station buses, generators and other feeders. See the [scope amendment](specs/interactive-hv-network.md#owner-scope-amendment--22-october-2026). `.11` is the pre-amendment snapshot. Downstream mine/camp exclusion versus retention behind boundaries remains **Unconfirmed**, with a required question pending. The TF03 feeding fact remains recorded historically; it does not override the newer scope instruction. Station DB01/DB01B details are no longer active station-coverage requests under the amended scope. Boundary implementation requires a new immutable version. #25 and #26 remain open; no accepted baseline or whole-model acceptance is claimed.


## Station feeder battery limits (`.13`, #25 still open)

Commit `afd043a` applies the owner's confirmed station cut in `construction-2026-10-22.13`: retain SB01 F4 / TF11, SB02 F1 / TF12 and SB02 F4 / western TF04 from their feeder-breaker inputs, including their existing CB/ES/transformer assemblies. Other station feeders, station buses and 23 generator branches are excluded. The separate SB01 spare TF04 is not the retained western transformer. Historical packages and source evidence remain unchanged.

Three abstract supply boundaries (`boundary:tf11`, `boundary:tf12`, `boundary:tf04`) feed the retained breaker inputs. Their representation is explicitly provisional and their availability is null; outside source coupling/backfeed and independent earth coverage remain unconfirmed. No external bus tie or metallic earth bridge is invented. Retained feeder assets, relationships, positions and interlock reviews are unchanged. A retained interlock depending on excluded equipment/source causes an explicit review failure, including nested conditions. Removed mine/village station joins leave unconfirmed coverage at the surviving ports. The earlier TF03 feeding confirmation remains historical evidence, not a runtime station join.

**Unconfirmed:** whether downstream mine-services and village/camp are excluded or retained behind boundaries. They remain provisionally represented while the owner's second scope question is pending. Services DG1/DG7 are separate and retained. Station DB01/DB01B and other excluded feeder details are no longer active coverage requests. See the [station scope record](../drawing-review/supplemental/station-battery-limits-review.md).

The saved current package contains 900 assets, 895 connections, 510 null controls, 8 null sources, 350 coverage boundaries, 127 views, 13 orientation regions and 24 contactors. Fifteen retained cross-area joins comprise 9 supported drawing relationships, 5 owner-confirmed and 1 provisional; the 2 selected-primary33 links are separate. Source inventory is 3 provisional external inputs, 3 camp generators and 2 Services sources. Counts are software inventory, not coverage acceptance.

### Checks and review

- Five station-boundary session checks and six current-package checks passed together. The integration regression first failed with the old station buses present, then passed with the boundary composed. Typecheck and production build pass (748.64 kB application chunk / 219.62 kB gzip; Vite size advisory). The whole-goal full suite remains pending final delivery.
- Chrome at 1704 × 1214 verified the three-feeder detail, retained breaker identity and disabled controls. Overlapping source/output captions found in intermediate `.12` were corrected in `.13`; its electrical inventory is unchanged. The current scenario is self-contained (8,286,268 bytes).
- Matching `.13` reopened with restoration and reset enabled. Historical `.11` reopened against `.13` with both versions shown, view-only mode, reset disabled and GEN23 Enable/Disable disabled despite its removal from current scope. Start current model returned to `.13`. No warning/error console entries were returned in the production tab.
- **Standards:** no new hard violations or actionable Fowler heuristics in `e649563..afd043a`, reviewed within `d753765...afd043a`. The existing optional historical P3 remains.
- **Spec:** no actionable implementation defects in that increment. Review confirmed that unresolved downstream scope, baseline and owner acceptance remain gates. Separate historical area packages do not expand the current whole-model boundary.

#25 and #26 remain open. No whole-model acceptance or agreed starting configuration has been recorded. No remote push, PR or GPT Site deployment is claimed.


## Received MC413 detail (`.14`, #25 still open)

Commit `db7a756` refines the existing MC413 endpoint from a successfully downloaded and visually inspected original PIMS source: `00151-CB-02006-DR-EL-1001`, revision 11, 14.11.25 IFC, one PDF page. Root and a separate source reviewer checked the complete page, incoming detail and PDF hash. The [source review](../drawing-review/supplemental/mc413-detail-review.md) records provenance, exact regions and the distinction between the principal revision, vendor revision and outgoing MC413A reference. The supplied 2350 overview was revisited for comparison; it is not a new original-source disposition. The original 141-file inventory remains unchanged.

The page depicts CB MC413 IN 3000 A and the first 400 V / 3000 A / 50 kA for 1 sec phase bar. **Inference:** these captions and ratings are provisionally attached to existing MC413 assets. **Unconfirmed:** upstream RC001 / ref 2350 versus the RM413 detail, shortened/longer 1001 document-reference equivalence, installed revision precedence, complete positions/interlocks and winding policies. `SV-MC413-INSTALLED` stays open; `SV-Q08` no longer asks for an unavailable 1001 page. All existing electrical connections, transformer relationships, sources, earths, null states and unresolved interlocks are preserved. MC413A remains beyond the first-LV boundary.

Current `.14` adds only evidence/review/caption refinement and one view, `supplemental/mc413-lv`: 128 views total. Its 900 assets, 895 connections, 510 null controls, 8 null sources and 350 coverage boundaries are unchanged from `.13`. The station scope is unchanged. Mine/camp disposition, baseline and model acceptance remain pending.

### Checks and review

- Two new public-session tests first failed against the no-op helper, then passed. Combined with seven current-package checks, all 9 targeted tests pass. They check unchanged electrical data/baseline, blocked controls, original-package preservation, navigation and self-contained historical scenarios.
- Typecheck/production build pass: 753.61 kB application chunk / 220.76 kB gzip, with Vite's size advisory. The whole-goal full suite remains reserved for final delivery.
- Chrome production preview at 1704 × 1214 displayed `.14`, the source-scoped MC413 detail, retained upstream navigation and disabled Open/Close controls. No warning/error console entries were returned. Saving produced an 8,291,581-byte self-contained scenario. Reopening that matching file reported restoration with reset enabled. No PDF is read by the runtime application.
- **Standards:** no new hard violations or actionable Fowler heuristics in `7b50e40..db7a756`, within `d753765...db7a756`. The existing optional historical P3 remains.
- **Spec:** no actionable findings in this increment. Source-supported printed content is distinguished from provisional installed binding; unresolved acceptance/configuration gates remain open.

#25 and #26 remain open. This increment made source/endpoint-review progress; it did not accept the installed model or answer the pending mine/camp scope question.

## Downstream scope and RM712 owner decisions (`.15`, #25 still open)

The owner explicitly excluded mine-services and village/camp, limited the TF04 line to the Hopper10 route with other branches shown at takeoffs only, and confirmed RM721 IN02 enters SF RM712 IN02. The [decision and implementation record](../drawing-review/supplemental/owner-scope-connections-review.md) preserves the exact answers, affected terminals, historical source differences and remaining questions.

Current `.15` has 695 assets,691 connections,368 null controls,5 null sources,142 earth terminations,317 coverage boundaries and93 views. RM718 unloading and SW441/water are provisionally retained pending their separate explicit scope decision; namespace grouping is not scope evidence. Seven other33kV branches stop at abstract takeoff markers with unknown external source/earth coverage. No Farwest downstream topology is added. `owner:join:rm721-rm712` is owner-confirmed; old SW426 labels are disputed historical references, not a second current supply. The former RM712 IN01→RM713 route and current TF712 LV/DG/MCS arrangement remain unconfirmed.

Ten focused public-session tests passed, as did typecheck and production build (765.38kB /223.91kB gzip; Vite size advisory). Browser review at1704×1214 confirmed the current version, reciprocal RM721/RM712 navigation, the SF RM712 IN02 identity and disabled controls. Historical packages are unchanged. Full-suite testing remains reserved for final accepted delivery; no source availability, device baseline, complete interlocks or whole-model acceptance is claimed. #25 and#26 remain open.

## Further owner clarifications and corrected water supply (`.16`, #25 still open)

Code commit `6a4b048` applies the next owner answers in immutable `construction-2026-10-22.16`. The [complete decision record](../drawing-review/supplemental/owner-scope-connections-review.md) retains exact answers, the mistaken TF712 water-source statement and its explicit TF12/OPF1-7 correction. Current counts are680 assets,677 connections,360 null/blocked controls,3 null sources,139 earth terminations,312 coverage boundaries and91 views. Historical packages and `.15` behavior remain unchanged.

RM718 is excluded and water included. The water spur leaves the TF12 line at OPF1-7 and runs through WT1-CB to SW441 IN01; the new junction is a connectivity point, not an invented switch. RM721 feeds SF RM713 IN01 at both ends, nothing is externally connected to RM712 IN01, and TF712's LV cable reaches the SW712 incomer with that breaker retained in series. MCS/DG alternative detail is excluded as model scope, not declared physically removed. MC431A is excluded downstream of MC431. TF436 is a spare with no installed downstream branch; cubicle control hardware remains unconfirmed. TF453/SW453 is installed and connected to SW435 tier8. Actual positions, source availability, winding policies and physical interlocks remain unconfirmed.

Sixteen focused public-session tests passed across the follow-up and current-package files; typecheck and production build pass (781.16kB /227.97kB gzip; Vite size advisory). Browser review at1704×1214 confirmed `.16`, the new TF12/OPF1-7 water-source view, its upstream TF12, SW411 IN04 and downstream SW441 navigation, and the selected WT1-CB identity with blocked controls. No warning/error console entries were returned. Full-suite testing remains reserved for whole-goal final delivery.

Separate Standards and Spec reviews of `d753765...6a4b048`, focused on `94eb9e4..6a4b048`, found one shared P2: stale README package data and older questions described as current. The README and decision-record dispositions have been corrected. Standards also identified an optional P3 repeated intermediate-caption assignment in the new follow-up helper; it changes no model output and is retained as a cleanup opportunity. No electrical implementation defect was identified. #25/#26, the starting configuration and whole-model acceptance remain open.

## Spare hardware, tier and HPGR board identities (`.17`, #25 still open)

Code commit `853a9e8` applies exact owner answers13–15 in immutable `construction-2026-10-22.17`: TF436 has a breaker and earth switch but no outgoing cables/downstream feed; TF432 at SW431 is tier5; MC001 and MC438 identify the single TF004-fed HPGR LV board. Historical aliases remain traceable. C1-R02 is resolved for the tier label; C2-R06 retains its other voltage, incoming-tag and reference questions. No electrical connection, state or interlock rule changed. One source-coverage record for the spare's lack of outgoing cable brings the total to313 boundaries; earth/state/interlock coverage remains unconfirmed. The other counts remain680 assets,677 connections,360 null/blocked controls,3 null sources,139 earths and91 views.

The [identity decision record](../drawing-review/supplemental/owner-identities-review.md) preserves the exact questions/answers and distinguishes the later RM413 double-boot answer16, received after this batch froze and recorded for the next increment. Hopper8 and Hopper9/Hopper7 route questions17–18 remain pending. The [HPGR control source review](../drawing-review/supplemental/hpgr-control-review.md) records three complete indexed page captures of0008Sheet1 rev4, their hashes and provenance limits. Root and a separate reviewer visually checked them. Control/alarm/trip terminals are evidence only; no complete installed physical-interlock sequence or switching permission was established. Original PDFs/hashes remain unavailable and the original141-filename inventory is unchanged.

Eleven focused session tests and typecheck pass; production build passes (786.67kB JavaScript /229.52kB gzip; Vite size advisory). Chrome production preview at1704×1214 verified tier5 with the retained tier3 alias, the TF436 spare hardware captions with blocked controls, and one HPGR bus carrying both MC001/MC438 aliases. A4,117,314-byte `.17` scenario saved and reopened with restoration/reset enabled. Historical `.14` reopened view-only against `.17`, retained its original DG1 equipment, and disabled Enable/Disable/undo/reset. Start current model restored `.17`; a slower observation completed on the same tab without restarting. No warning/error console entries were returned. Narrow/mobile viewport remains unverified because the available browser surface does not expose viewport resizing.

The whole-goal full suite remains reserved for final delivery. No accepted model/baseline is claimed. GitHub#25 remains open with4/8 criteria checked;#26 remains open with#25 as its open blocker. No owner decisions were present in#25 comments when rechecked. No push, PR, external issue comment or GPT Site deployment was performed.

Separate Standards and Spec reviews of `d753765...2f0428f`, focused on `6b23ba6..2f0428f`, found no new documented-standard breaches, actionable Fowler heuristics or Spec defects. The two previously acknowledged optional P3 cleanups remain unchanged. Answers16–21 arrived after `.17` froze and are recorded in the [following hopper-route increment](../drawing-review/supplemental/owner-hopper-routes-review.md); the original question17/18 pending statement above describes the `.17` check point, not their current interview status.

## Hopper and MC413 route confirmations (`.18`, #25 still open)

Implemented and checked 23 October 2026 from owner answers16–21 received on 22 October. `construction-2026-10-22.18` records the RM413 IN02 cable-side double boot, separate RM406-fed Hopper8 and RM417-fed Hopper3 groups, RM410→RM419→RM418 route, RM418 CB03 transformer feeder/CB04 spare roles and RM413/TF413→MC413 supply. The [exact decision record](../drawing-review/supplemental/owner-hopper-routes-review.md) retains every answer and source comparison. RC001 is not MC413's current feeder reference; whether that label was old or erroneous remains unconfirmed.

The new helper checks existing connection IDs/terminal pairs before changing their knowledge. No connection is added, removed or remapped. Transformer assets and source/earth pairs, starting positions, source availability and physical-interlock rules remain unchanged. The receiving RM417 SW01 edge stays drawing-supported because answer16 did not explicitly name it. Broad reference/hardware and electrical-behavior reviews remain open. Current inventory is 680 assets, 677 connections, 360 null/blocked controls, 3 null sources, 139 earth terminations, 313 coverage boundaries, 91 views, 13 orientation regions and 24 contactors.

Thirteen focused public-session tests pass (seven current-package and six route tests); typecheck passes. Production build passes: 800.08 kB JavaScript / 232.76 kB gzip, with Vite's size advisory. The whole-goal full suite remains reserved for final delivery. Chrome production preview at 1704 × 1214 verified `.18`, the confirmed MC413 supply caption and disabled Open/Close controls. A 4,135,754-byte self-contained `.18` scenario saved; parsing its actual file verified 680 assets, 677 links, 313 boundaries and 91 views. It reopened with “Scenario opened. Connectivity restored.” and reset enabled. Historical `.17` opened view-only against `.18`, with both versions displayed and undo/reset disabled. Start current model restored `.18`. No warning/error console entries were returned in the checked tab. Some browser observations timed out; focused rereads on the same tab verified completion without repeating the action or restarting the server. The download event observation timed out although the actual scenario file was saved successfully.

GitHub #25 was rechecked open with 4/8 criteria checked; #26 remains open with #25 as its open blocker. No accepted starting configuration or whole-network acceptance has been recorded. No push, PR, issue comment or GPT Site deployment was performed.

Separate Standards and Spec reviews of `d753765...ef4024e`, focused on `2f0428f..ef4024e`, found no new documented-standard breaches, actionable Fowler heuristics or Spec defects. Both confirmed the narrow route scope, preserved transformer/state/interlock data, immutable historical packages and current `.18` / `045a1e1` documentation. The two earlier optional P3 cleanups remain unchanged.

The owner then confirmed the six named SW411 processing cable routes (answers22–23) and explicitly deferred the known cross-station key interlocks asked about in question24. Those later decisions are recorded in the [SW411 feed/key-scope record](../drawing-review/supplemental/owner-sw411-feeds-review.md) for the next immutable package; they do not rewrite `.18` or establish actual switch states.

## SW411 feeds and explicit cross-station key deferral (`construction-2026-10-23.1`)

Answers22–24 are implemented in a new immutable package. The six existing processing joins become owner-confirmed for their named routes and cable tags. Key interlocks between SW411 IN03/IN04 and upstream TF11/TF12 assemblies are recorded as known to exist and explicitly deferred from the current simulation. Their complete installed conditions remain unconfirmed; other network keys are not silently deferred. The eight related CB/ES review notes record that scope decision while preserving their unresolved status for other physical-position/mechanism/interlock details. No rule, device, electrical connection, transformer pair or starting state is changed.

Nine focused public-session tests pass, as does typecheck. The production build passes at805.34kB JavaScript /234.09kB gzip, with Vite's size advisory. Inventory is unchanged:680 assets,677 connections,360 null/blocked controls,3 null sources,139 earths,313 coverage boundaries and91 views. Historical snapshots retain their content. The browser production preview at1704×1214 confirms `construction-2026-10-23.1`, the IN03 key-deferral note and disabled Open/Close controls; no warning/error console entries were returned. The whole-goal full suite remains reserved for final delivery.

Later answers25–31 are recorded separately in the [model rules/racking/partial-baseline record](../drawing-review/supplemental/owner-configuration-review.md) and are not applied to this package. Primary→secondary source connectivity is selected as a modeling assumption, and an externally supplied secondary must remain visibly source-connected when the normal primary feed is open; known reverse transfer onto the primary is still unconfirmed. All drawing-shown removable breakers require separate Open/Close and Rack in/out actions. Racking requires an open contact; Open/Close is blocked while racked out. The three supply availabilities and complete SW411 contact/earth baseline are selected. Answer30 selects Rack in for removable breakers except loop feeds, which require individual confirmation; eligibility and loop-feed cases must first be established. Removable-device source review and representation design are the next implementation work. #25/#26 and whole-model acceptance remain open.

Separate Standards and Spec reviews of `d753765...1a41112`, focused on `ef4024e..1a41112`, found no new findings. Both confirmed the six route-only decisions, the narrow key deferral and its preserved unresolved statuses, current package/version provenance and explicit separation of later unapplied requirements. The two historical optional P3 cleanups remain.

The next generic implementation slice uses independent nullable contact/racking state and preserves legacy scenario semantics; see [ADR0008](adr/0008-independent-breaker-racking.md). It is being developed against an explicitly synthetic fixture before any site conversion. Two read-only source audits are checking removable-device eligibility and explicit loop/tie roles in the included areas. No source-based eligibility or loop-feed racking value has yet been accepted from those audits.

## Independent breaker contact/racking software slice

The generic session now supports an explicitly declared removable-breaker main pair with independent nullable contact/racking values. Each accepted action changes one value only; unknown prerequisites block actions. Main-path connectivity follows compatible contact/racking combinations without erasing independent fixed earth relationships. The session supplies four action labels and reasons to the UI, and preserves complete states through undo/reset and self-contained scenarios. Legacy discrete devices retain their existing behavior.

Separate Standards and Spec reviews of `d753765...ff2c23c`, focused on `1a41112..ff2c23c`, found no new actionable findings. They distinguish the generic implementation from the pending site classification, baseline, local rules and transformer-direction work.

Format2 is used only for structured-state mechanism models. Legacy-only models, including unchanged site `construction-2026-10-23.1`, still save format1. Original format1 snapshots remain readable without migration/defaults; format1 envelopes cannot contain the new mechanism states. Immutable-package and historical mutation gates apply to both formats. The new model-picker example is explicitly synthetic, `synthetic-removable-breaker` / `fictional-1`; no site classification, baseline, source-direction relationship or physical-interlock matrix is changed by this software increment.

All 116 targeted tests across 11 affected files pass, including 13 mechanism tests and the affected legacy session/scenario/interlock/relationship/earth/uncertainty/history/presentation/current/view-only checks. A final 20-test mechanism/current rerun passes and explicitly proves unchanged current-site format1 output. Typecheck passes. Production build passes at 815.44 kB JavaScript / 236.66 kB gzip, with Vite's size advisory. These are targeted regressions; the whole-goal full suite remains reserved for final delivery.

Chrome production preview at 1704 × 1214 verified that Rack out is disabled while Closed, Open then Rack out retains Open, Open/Close are disabled while out, the LV bus loses its source path, undo restores Open/Rack in, and Rack in then Close restores the LV bus connection. Reset clears history. A 5,073-byte format2 file saved with both state fields and reopened with restoration. A deliberately different-version fictional snapshot opened view-only with all four actions plus undo/reset disabled. No warning/error console entries were returned. The UI shows contact/racking separately in both inspector and diagram.

The source audits reviewed 156 retained breaker-kind assets: 77 in the first area group and 79 in the second. Sixty have an explicit same-page withdrawable legend/depiction. Further plug-contact categories were submitted for owner review; answers35–37 now confirm the LV/MV symbol categories, the remaining-area baseline and the local SW411 line-earth rule set. The three named ties are individually selected Open/Rack out (answers32–34). Five station/water HV cases are separately pending question38. These later data selections require another immutable site package; no site conversion has yet been claimed.

## Explicit contact/racking interlock rules

The generic interlock schema now supports explicit contact/racking predicates and removable-command targets alongside unchanged legacy position rules. Declared matching rules combine with intrinsic mechanism guards and mandatory review gates; null axes retain Unconfirmed reasons. Legacy position predicates cannot silently target a structured mechanism. The inspector receives target labels from the session. The published synthetic `fictional-1` package remains unchanged; a separately versioned test clone exercises the local earth matrix.

The implementation agent reports83/83 targeted tests passing across seven affected files, including11 new matrix tests. Root typecheck also passes after the concurrent owner-mapping module was completed. No site rule, interlock-review acceptance, baseline or transformer relationship is changed by this generic slice. The full suite remains reserved for final delivery.

Separate Standards and Spec reviews of `d753765...620ea64`, focused on `ff2c23c..620ea64`, found no new actionable findings. Both exclude the concurrent site mapping and future source-direction work.

## Source-reviewed site mechanisms and selected SW411 local matrix

An exact asset-ID audit reconciles157 retained breaker-kind assets (77+79+the previously omitted TF04 pole1 recloser). Owner answer38 selects all five separately queried station/water HV breakers as removable. Together with60 same-page legend depictions and54 detailed LV/hopper MV symbol selections from answer35,119 mechanisms are selected;38 remain Unconfirmed. The [complete register](../drawing-review/supplemental/removable-breakers-review.md) preserves source classifications, exact references, correspondence limits and owner selection separately. No generic symbol is classified fixed by default.

New guarded composition helpers convert only those119 existing closed main pairs into independent nullable mechanisms, and express the owner37 local matrix for12 SW411 line-earth CB/ES pairs. The24 local reviews become confirmed-rules only within that selected V1 scope. The two bus-earth switches, bus tie, station breakers and all other switchgear retain their separate unresolved interlock reviews. Existing wires, earth terminations, presentation and original package remain unchanged. These helpers are checked through SimulationSession but are not yet composed into the current `construction-2026-10-23.1` catalog entry.

Two focused mechanism-mapping tests and one focused site-local-matrix test pass, including exact119/38 coverage, no state assignment by classification alone, unchanged input, fail-closed stale mappings and the full Open→Rack out→Earth Close→Earth Open→Rack in→Close sequence. The full suite remains reserved for final delivery. Later owner answers39–40 select the remaining contact proposal; mapping its three-position contact names is being confirmed separately before the next package is distributed.

## Generic directed source relationships

The generic session now accepts optional claim-bearing source arcs on fixed assets. Legacy sourcePairs remain bidirectional; arcs retain direction and have strict owned-terminal/identity/evidence validation. Definite connectivity requires supported asset and arc claims. Explicit unresolved reverse candidates enter only conservative source evaluation; reverse arcs are never invented. Earth-continuity graphs are unchanged. The shared private source-query module supplies direction-aware reachability, witnesses and exact simple-route unions for connectivity, uncertainty, boundaries and source-to-earth conflicts.

The implementation agent reports101/101 targeted tests passing across10 affected files, including10 new directed-source cases, and TypeScript passes at its stable handoff. Tests cover forward transfer, externally supplied secondary, explicit reverse uncertainty, alternate-route loss, dangling directed cycles, earth/conflict separation, validation and historical packages. Exact mixed-route searches are localized and cached; asymmetric cyclic blocks retain worst-case exponential complexity with no truncation. See ADR0005's extension. No site transformer is converted in this generic slice; representative site behavior and presentation remain to be checked. The whole-goal full suite remains reserved for final delivery.

## Owner-configured site package `construction-2026-10-23.2`

Owner39 selects the AMR/IOP tie-in ABS Closed. Owner40 approves the exact199-row contact proposal (184 Closed,10 Open,4 Unconfirmed and the tie answered separately). Owner41 explicitly maps the sixteen named RM406/RM410/RM417/RM419 three-position Closed selections to Service. These decisions combine with the earlier161 contact selections:356 positions are selected and4 remain Unconfirmed. All119 removable mechanisms have selected racking positions (116 In,three named ties Out), and the3 abstract supplies are available. See the exact owner record and structured proposal. No live-site status or installed service/spare category is asserted.

The current catalog now composes the reviewed mechanism, local-rule and starting-configuration helpers as a new immutable `.2`. Preserved `preConfigurationNetworkModel` exports unchanged `.1`, and its existing tests now explicitly target that historical package. The current package saves format2; old `.1` remains format1 with null states and loads view-only, with source/undo/reset gates retained. Topology, source/earth pairs, boundaries and presentation are unchanged. The119 mechanisms and24 scoped SW411 reviews are applied;336 other control reviews remain unresolved and blocked. The4 contact exceptions remain explicit, and transformer-direction site conversion is still pending.

Root checks pass:14 tests across mechanism mapping/local matrix/generic axis-rule files, plus9 tests across baseline/current composition/preserved `.1` files (23 distinct targeted tests across6 files). Typecheck passes. The new current-package test executes Open→Rack out→Earth Close, undo/reset, matching format2 restoration and historical format1 view-only behavior. Production build and browser checks are next. Whole-model acceptance, #25 and #26 remain open; the full suite is reserved for final delivery.

Separate Standards and Spec reviews of `d753765...3c3c072` and `d753765...3a52f67`, focused on their respective increments, found no new actionable findings. The directed engine review explicitly retains the source-arc presentation gate before any arc-bearing site distribution.

## `.2` browser check and directed-relationship presentation

Model code `0a38fae` distributes `.2`. Production build passes at1,134.10kB JavaScript /263.40kB gzip (Vite size advisory). Chrome preview verified selected IN03 Closed/Rack in; Rack out blocked while Closed; Open then Rack out; Open/Close blocked while out; earth Close allowed only after the selected sequence; Rack in blocked while earthed; Earth Open then Rack in/Close; and reset. A4,475,181-byte self-contained format2 scenario saved with360 controls,119 mechanisms,4 null contacts, the3 exact Rack out exceptions and3 true source availabilities. Matching reopen restored connectivity/reset. Historical `.18` format1 opened view-only against `.2`, retained both version labels and disabled undo/reset. Start current model restored `.2`. No warning/error console entries were returned. Some action/observation timeouts were resolved by reading the same tab; the actual completed state was checked before any retry.

The separate directed-source presentation slice shows arrowheads, offsets opposing arcs, styles unresolved claims amber/dashed and exposes each arc's own evidence/review records. Earth and bidirectional relationships remain separate. New `synthetic-directed-source` / `fictional-directed-1` is an explicitly fictional model, preserving the published bidirectional fixture. One focused session test passes, including supplied secondary visibility, candidate reverse, no winding-B transfer and scenario roundtrip. Root typecheck passes at this slice; its production build is1,136.57kB /264.04kB gzip. Browser inspection verified the two arrow directions, solid versus dashed claims/evidence/reviews, and LV source B supplying the secondary with source A disabled and the primary disconnector Isolated. No warning/error entries were returned.

Standards review of `.2` found no new findings. Spec review identified one P2: inherited active review/interlock descriptions still say all baselines are null. A new-version metadata helper is being checked to preserve `.2` while refreshing only stale statements and neutral source captions in the next package. Transformer role audit maps all60 transformers/87 prior pairs from explicit builder roles and drawing references, without using tuple order; installed binding, reverse behavior and earth policy remain separate. No site source arc is yet distributed. Owner42–44 now select48 additional HV local pairs,48 LV intrinsic profiles and the bus-tie profile; these are pending the next immutable package. The full suite and whole-model acceptance remain pending.

## Additional selected local profiles and current review notes (`construction-2026-10-23.3`)

The new immutable `.3` applies owner42–44 from the exact [profile decision record](../drawing-review/supplemental/owner-interlocks-review.md). It verifies48 additional HV CB/line-earth associations against explicit terminal/branch/termination guards, selects48 LV incomers' intrinsic guards as their complete additional-rule profile, and gates SW411 BT Rack in/Close on both bus earths known Open. There are169 reviewed controls (121 with declared rules and48 with intrinsic guards alone),191 unresolved controls and304 declared rules. No baseline, topology, source/earth relationships or equipment claim knowledge changes.

The P2 stale-description finding is addressed in this new version:5 review questions,1 abstract-source evidence summary and8 unqualified null-baseline interlock notes retain their original wording as explicitly historical and link to current selected values. Three abstract-source captions become neutral Simulation supply input. Actual-position/earth/hardware uncertainty and review statuses remain separate. The original `.2` export is preserved as ownerConfiguredNetworkModel; `.1` remains preConfigurationNetworkModel. Changed interlock notes lead with the current selected profile and qualify prior construction wording as historical.

The implementation agent reports18/18 focused tests passing across the additional-profile, SW411 and generic-matrix files. Root passes4/4 tests across current `.3`, preserved `.2` and metadata-note files. These cover selected counts, bothbus-earth tie guards, independent D/Y behavior, unknown prerequisites, exact manifest rejection, unchanged electrical data and historical scenario roundtrips. The whole-goal full suite remains reserved. Build/browser checks and separate two-axis review of this version follow. No whole-model acceptance or ticket completion is claimed.

## Relationship-scoped source-transfer claims

ADR0009 adds an explicit opt-in for a narrowly evidenced source arc to establish only its modeled transfer while parent equipment metadata remains provisional. supportScope=relationship requires an explicit claim and linked evidence; omitted scope keeps the existing asset-and-arc gate. Legacy pairs, mechanisms and earth continuity retain parent gating. A shared predicate drives graph and UI behavior. No parent knowledge or unrelated earth/reverse claim is promoted, and old snapshots retain their prior semantics. This addresses the coarse-parent evidence issue identified before site conversion; no site arc has yet been composed.

The implementation agent reports59 targeted tests passing across six session files (7 scoped-source,10 directed-source,8 relationships,11 uncertainty,7 earth,16 scenario), plus typecheck. Seven new tests cover exact scoped support, missing claim/evidence rejection, unresolved reverse, unchanged earth/metadata and default/history compatibility. No full suite was run. Independent Standards and Spec reviews of both committed4989d19 and4d8e6e1 found0 new findings, using fixed baseline d753765.

### Production browser verification of `.3`

Model code identity:4989d19; core relationship-support extension:4d8e6e1. Typecheck and production build pass; Vite reports the existing chunk-size advisory (1,363.89kB JavaScript,287.71kB gzip). No browser warning/error was reported during the checked flows.

In the production preview, SW411 BT starts Open/Rack out, blocks contact actions, permits Rack in with both bus earths Open, then permits Close. Reset restores its selected baseline. MC431's LV incomer opens and racks out; both contact actions then disable. The inspection heading explicitly says no **additional** local interlocks, retaining intrinsic guards.

The actual saved `.3` format2 scenario is5,281,216bytes and contains169 reviewed controls,304 declared rules,4 null contacts and3 available sources. Matching reopen restores connectivity. The saved `.2` format2 scenario opens view-only against `.3`, displays both versions, and blocks Undo/Reset. Start current model restores `.3`. Screenshot: `hv-v3-lv-interlocks.png` in the task visualization directory. Narrow/mobile layout remains unverified.

### Next increment decisions

Owner answers45–52 are recorded in `drawing-review/supplemental/owner-interlocks-review.md`: ten bus-earth profiles; nine fixed LV interactions and two removable LV incomers; ten OHL controls; bounded key/door/inching deferral;24 removable contactors with their complete local matrix and Open/Rack in baseline; and six hopper MV incomer/earth profiles. The transformer direction audit and helper implement the scoped25/28 policy without accepting reverse or earth behavior. These prepared changes are not part of immutable `.3` until a new version is composed and checked.

## Expanded owner profiles and scoped source transfers (`construction-2026-10-23.4`)

The new immutable `.4` applies owner45–54 and the scoped25/28 transformer policy. Software inventory remains680 assets/677 connections/360 controls/3 sources/139 earths/313 boundaries/91 views. There are260 reviewed controls (191 declared-rule and69 without additional declared rules),100 unresolved reviews and419 rules.145 independent mechanisms comprise121 breakers and24 contactors;142 start Rack in and3 named ties Rack out. All24 contactors retain their kind and Open contact baseline.356 contacts are selected;4 remain Unconfirmed. Three abstract inputs remain available. Parent equipment/earth knowledge is preserved;85 forward source claims are selected while89 reverse/alternate claims remain Unconfirmed.

The generic contactor extension shares mechanism evaluation and intrinsic guards while preserving old breaker declarations/history and format1/format2 fingerprints. Owner49's exact82-control key/door/inching scope deferral does not itself expand permissions. P06/P07/P08 local profiles separately require that evidence before enabling actions. Ten bus-earth profiles require all exact listed breakers Open/Rack out. Nine fixed LV profiles, two new removable LV incomers, ten OHL controls and six independent converter AC inputs are selected separately. Current inherited configuration counts are refreshed; prior119-count statements remain explicitly historical. Immutable `.3` is exported as `interlockReviewedNetworkModel`.

Focused checks: generic contactor/breaker/interlock/scenario/view-only/history/source regressions76 passing across eight files; hopper local profiles7/7; drive profiles5/5; root bus/LV/OHL + deferral + transformer regression15/15 across three files; root current/preserved-version/metadata checks5/5 across three files. These are targeted runs, with overlaps, not a full-suite total. Typecheck and production build pass. The build reports a chunk-size advisory (1,575.10kB JavaScript;313.56kB gzip). The whole-goal full suite remains reserved.

Production browser checks verify MC417 M1 Forward Close blocks Reverse Close and Rack out while Closed. Opening/racking out both FC/RC permits maintenance Earth Close; Earth Closed blocks Rack in and contact actions while Out. History preserves independent axes; Reset restores Open/Rack in. The actual format2 saved file is7,105,246bytes, contains24 removable contactors/260 reviewed controls/419 rules, and matching reopen restores connectivity. Prior `.3` opens view-only against `.4`, shows both versions and disables Undo/Reset. Browser warnings/errors were empty during these checks. Screenshot `hv-v4-removable-contactor.png` shows the retained contactor classification and separate actions. Narrow/mobile layout remains unverified.

Owner55's26-control integrated RMU profile and56's three RM714 earth-presence confirmations are recorded for a later increment, not applied in `.4`.57/58 local-profile questions remain pending. Whole-model acceptance and GitHub25/26 remain open. Separate Standards/Spec review of this increment follows.

The committed `.4` code identity is2398a2c. Independent Standards and Spec reviews of `d753765...2398a2c`, focused on the new commits after4d8e6e1, each report0 actionable findings. Both excluded dirty/untracked future work and ran no tests. Owner57/58 have since selected the RM714 and SW505 output/DC-earth local matrices; their next-version composition is in progress. The separate P13 helper passes5/5 focused session checks and typecheck; it adds only owner55's26 reviews/52 rules and preserves baseline/topology/knowledge. It is not applied to `.4`.

## RMU and drive-output profiles (`construction-2026-10-23.5`)

The immutable `.5` applies owner55–58 to preserved `.4`. It adds26 P13 integrated RMU profiles/52 rules, six RM714 profiles/six rules and six SW505 output/DC-earth profiles/six rules. There are298 reviewed controls (229 with declared rules;69 without additional declared rules),62 unresolved reviews and483 rules. Inventory, selected baseline,145 mechanisms, source-transfer claims and independent earth knowledge remain unchanged. RM714 earth presence56 is a separate scoped evidence/review record linked to three earth assets; their captions distinguish presence from remaining path review. The P09 profile requires the recorded owner49 bounded deferral and leaves converter transfer, stored energy and discharge Unconfirmed.

Both new helper files pass5/5 focused session tests each and typecheck. Root current `.5` and preserved `.4`/`.3` checks pass4/4 across three files. Production build passes (1,594.54kB JavaScript;317.48kB gzip, with chunk-size advisory). The whole-goal full suite remains reserved.

Production browser checks verify RM406 CB01 Open before SW02 movement, blocked direct Service→Earthed, permitted Isolated→Earthed, and CB Close blocked while Earthed. Reset restores the baseline. VS50501 output Open permits DC Earth Close, which then blocks output Close. RM714's current presence/path-review caption is visible and its earth Close is blocked with its main Closed. Browser warnings/errors are empty. The actual saved format2 `.5` file is7,446,252bytes with298 reviews/483 rules; matching reopen restores connectivity. Prior `.4` opens view-only, displays both versions and blocks Undo/Reset. Start current model restores `.5`. Screenshot: `hv-v5-rmu-profile.png`. Narrow/mobile remains unverified.

Questions59–61 for Hopper7, Hopper10 and RM721 remain pending. The [remaining HPGR/RM412 review](../drawing-review/supplemental/remaining-hpgr-rm412-review.md) records exact source locations and unresolved mechanisms/common-bar-earth prerequisites for later owner clarification. No local conditions are inferred from those drawings. Whole-model acceptance and GitHub25/26 remain open. Independent review of the new committed increment follows.

Current `.5` code identity:6b76046. Independent Standards and Spec reviews of `d753765...6b76046`, focused on the increment after2398a2c, each report0 actionable findings. Reviews were read-only and ran no tests/build/browser checks. Current local preview remains on the `.5` RM406 diagram at the selected teaching baseline; questions59–61 await owner input.

## Complete selected local controls (`construction-2026-10-23.6`)

Owner59–77 complete the local control decisions. The immutable `.6` composes29 separated RMU profiles,11 HPGR profiles,17 fixed RMU/RM412 profiles and3 RM413A profiles over preserved `.5`. Two owner-confirmed absent former22kV controls become disconnected historical markers. Inventory is680 assets/676 connections/358 controls/3 sources/139 earths/313 boundaries/91 views. All358 local profiles are selected:279 with declared rules and79 without additional declared rules;553 rules, no unresolved local control reviews. Electrical knowledge, coverage treatment and whole-model acceptance remain separate.

Generic removable-disconnector support preserves disconnector kind, independent nullable axes and format1/format2 historical snapshots. The three named HPGR disconnectors start Closed/Rack in; together with121 breakers and24 contactors there are148 mechanisms,145 In and3 named ties Out. RM712 IN01 starts Open; RM413A lower switch starts Service. All358 current contact values are selected. No new key deferral is introduced. Upper RM413A earth follows the exact clarified77 profile, without inventing a remote-end prerequisite or removing the incoming double-boot connection.

Focused checks pass: removable disconnector/breaker/contactor/interlock regression42/42 across four files; separated RMU6/6; fixed RMU4/4; HPGR5/5; final control decisions3/3. A subsequent integration run passes15/15 across five files, including preserved `.5` and current `.6` scenario roundtrips (overlaps earlier counts). Typecheck and production build pass. Build output:1,629.60kB JavaScript/324.91kB gzip with the existing chunk-size advisory. The whole-goal full suite remains reserved. Browser verification and separate Standards/Spec review follow; GitHub25/26 and owner acceptance remain open.

The prior construction's isolated three-file PDF-free runtime check is recorded in [delivery verification](delivery-verification.md). That bounded finding does not constitute accepted-model delivery.
