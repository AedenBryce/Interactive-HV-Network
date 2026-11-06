# Local delivery verification

Current continuation point: [6 November 2026 handover](../HANDOVER.md). This opening section is the current accepted delivery record. All dated records below it describe earlier builds and are historical where they differ from the current `.12` / `.9` package.

## Accepted V1 evidence — 6 November 2026

The owner formally accepted educational model `construction-2026-11-06.12`, final layout `authored-2026-11-06.9`, and its recorded starting configuration in GitHub issue [#25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25). The drawing and electrical confirmations were not changed during these delivery checks.

| Package | Size | Manifest entries | Result |
| --- | ---: | ---: | --- |
| `output/HV-Network-2026-11-06-r9-Windows.zip` | 35,294,901 bytes | 14 | ZIP integrity and every manifest SHA-256 passed |
| `output/HV-Network-2026-11-06-r9-Web.zip` | 595,666 bytes | 10 | ZIP integrity and every manifest SHA-256 passed |

Both manifests identify model `.12` and layout `.9`. Neither archive contains PDFs or separate JSON model/scenario files. The network and built-in historical model choices are bundled in the application. The Web ZIP has not been published to a host.

The Windows ZIP was launched on the preparation PC using `START-HV-NETWORK.cmd`. The bundled runtime served the app on `127.0.0.1:8765`; the page returned HTTP 200 and loaded the whole-network application. The model panel displayed `.12` and the current selected starting states. The Web ZIP was integrity-checked but not hosted or opened in a browser.

Targeted browser checks on the packaged Windows app covered whole-network startup, asset search and detail selection, `.12` model selection, historical model selection and return to `.12`, source availability, source-path highlighting, independent source and earth connectivity, action impacts, Undo and Reset. The SW411 exercise showed Close blocked while the breaker was racked out and Rack in blocked while its earth switch was closed, with the selected interlock evidence visible. A source availability change and each temporary breaker/earth action were undone; Reset then confirmed the recorded baseline. These were educational session changes only. The UI explicitly says that it does not authorise actual switching.

The focused accepted-model test file serialises and reopens a `.12` scenario, loads the earlier real `.9` package as view-only, verifies Reset and Undo are blocked there, then restores the `.12` scenario. The complete `src/session` suite passed after the `.12` regression check was corrected: 84 files and 471 tests. `pnpm typecheck` passed. The app's historical model selector also opened the bundled SW411 `.10-22.2` snapshot without a separate model file, then returned to `.12`.

Known limits: the full configured test suite has not been verified green. The authored-layout-loader suite has 15 passing and 6 historical geometry assertions failing; do not change accepted layout `.9` to satisfy those assertions. A second-PC launch and Web hosting were not tested. No live equipment state, installation, source/earth coverage beyond the explicit model records, electrical calculation, or switching authorisation is established by this verification.

## Historical delivery records

The following records predate acceptance of `.12` / `.9`. Their pending-acceptance and ticket-status statements describe their own dated builds, not the current package above.

## Historical .5 evidence

Verified on 23 October 2026 against construction `construction-2026-10-23.5`, code commit `6b76046`. Whole-model acceptance remains pending under tickets [#25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25) and [#26](https://github.com/AedenBryce/Interactive-HV-Network/issues/26).

An isolated directory, `tmp/pdf-free-check-20261023`, contained only these production files:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| index.html | 466 | E2CDDBFEB95C875D76C6807A7C4495F06AEAA78061F98B10573239B23AF308B7 |
| assets/index-D-Oih6Pk.css | 13,126 | D6A60C468404369FC4ABFE7A254A7DF0248B4F09E2291849CF346C0E142ABC05 |
| assets/index-DYYZdack.js | 1,594,542 | 39BCFFC613A2B1F2194CEB8CC8FDB74C184F70C8F7EE0F9C6ED9C802E9D102E8 |

There were no PDFs, model JSON files or separate historical-model files in that directory. A temporary HTTP server served it at local port4185 and has been stopped.

Browser checks completed:

- Application startup and selection of the whole `.5` construction.
- Reopening the actual self-contained `.4` scenario as view-only against `.5`, with Undo and Reset disabled.
- Reopening the matching `.5` scenario, opening CB SW411 IN03, and using Undo to restore Closed/Rack in.
- No browser warnings or errors recorded. HTTP requests comprised successful HTML, JavaScript and CSS requests, plus favicon404; no PDF or separate model JSON request occurred.

These observations confirm those tested runtime operations work from the three-file production package. They do not establish acceptance of the construction network. Evidence image: `hv-pdf-free-runtime.png`, captured in the task visualization folder during this check.

## Remaining delivery gates

Complete agreed network coverage and discrepancy review, select a final immutable model, obtain whole-model acceptance, and repeat delivery checks against that accepted package. The full test suite remains reserved for the end of the whole goal. Current focused verification does not close tickets25 or26.

## Visual review v2 package

The v2 archive passes ZIP integrity and every manifest payload hash. It extracts into tmp/visual-review-v2-extracted; its www folder has exactly index.html(466bytes),assets/index-Br_6-Djt.js(1,770,575bytes) and assets/index-CPijND68.css(13,883bytes). The final preview serves only that folder. Scenario bytes and fingerprint remain unchanged. The earlier original and first visual archives remain preserved. The visual record covers92views/1,512 external routes and internal equipment leads, panel collapse, wheel zoom, symbol state changes and console checks. No whole-model acceptance or full-suite result is implied.

## State and review display cleanup

Presentation4242ef0 opens the current whole network by default. Known historical area models and fictional demonstrations have separate selector groups. Different imported snapshots use neutral wording, without inferring chronology. Current and starting states are displayed independently; the live model summary derives362/362 selected starting states,362/362 reviewed local profiles,0 unresolved profiles and3/3 selected source starting values from the model. Twenty-one version-scoped review annotations supersede construction wording about unknown model baselines and unresolved local profiles; original questions/statuses/evidence remain in the immutable .10 package and are accessible under disclosures. Actual installation, deferred sequences, source/earth uncertainty and whole-model acceptance are not promoted.

Typecheck/build pass(216modules,1,774.70kB JS/351.72kB gzip,14.41kB CSS; existing chunk-size advisory). No test suite was run for this display increment. Browser checks: default .10 startup; IN03 Open changes current only; Reset restores Closed/Rack in; review updates present; historical SW411 remains0/27 selected states/reviews with unresolved controls; return-current button works. Final extracted status package starts at4174 without PDFs; desktop1280x900 and native narrow layout show no page horizontal overflow, console warnings/errors are empty. Proof is hv-state-review.png in the task visualization folder outside the repository. Both independent review axes report0 remaining findings; one chronology wording finding was corrected.

The status-review ZIP passes integrity and every manifest payload hash. It extracts into tmp/status-review-extracted/www with exactly index.html(466bytes),assets/index-Bur4IiPu.css(14,413bytes),assets/index-D4yzgv56.js(1,774,708bytes). This is the current4174 server folder. Archive801,999bytes,SHA256 0CD331343151C16AAAB9A1697F3F16FF1A543771FBCDE68366601527E851ABEB. All previous archives and the exact .10 scenario fingerprint are preserved. Whole acceptance and final full-suite delivery remain pending.

## Continuous dark whole-network canvas

Presentation107d9e1/54422a0 renders all684 model assets and677 actual model connections once on a single canvas. Thirteen source-area outlines organise the diagram; area and asset controls change camera position without loading another electrical view. Twenty-four isolated reference assets are kept in a separate strip. No currently connected asset lacks area membership. Local drawing forests/order/labels/routes are derived from model identities, existing view membership and connections, independently of switching states. The frozen .10 model and its saved presentation/scenario remain unchanged.

Production typecheck/build pass(218modules,1,782.46kB JS/354.19kB gzip,18.71kB CSS; existing chunk-size advisory). No tests were added/run for this presentation increment; full suite remains reserved for accepted final delivery. Browser checks in IAB:684asset identities,677 routes;0 diagonal connector/lead segments;0 line/label intersections or label overlaps;0 unrelated coincident wire segments;0 internal equipment-lead overlaps. Search accepts CB SW435 IN01 and finds CB SW435 IN 01; area selection and Locate selected move the camera; SW435 incomer Open changes current only and Reset restores Closed/Rack in. Wheel zoom changes10053% to16246% at the tested native close-up. Desktop1440x1000 and native357px layouts were inspected; native page has no horizontal overflow. Final extracted package starts with the whole-network canvas and no console warnings/errors. Independent Standards and Spec reviews each report0 actionable findings.

The supplied CB HV Single Line - V3.jpeg is a layout reference only; the owner explicitly said its information is incorrect. Its attachment preview was inspected; view_image could not process the original very large JPEG. The runtime uses code-native SVG, not that raster or its electrical content. Fidelity checks: one continuous overview; labeled area groupings; orthogonal solid connectors; standard existing device glyphs; dark surfaces/readable contrast at close zoom; live asset selection, pan/zoom and collapsible inspector. Spatial positions are derived for the current model, not copied from the incorrect reference. Whole-network and SW435 browser evidence is saved outside the repository as hv-continuous-whole.png and hv-continuous-sw435.png in the task visualization directory. Desktop viewport override captures are softer than native captures; the native detail proof was inspected using view_image.

Current package output/hv-network-v10-continuous-dark-review.zip(805,817bytes,SHA256 24F547C2AB379C9A5EBF47A0D4A54EA68168085C2DC207BD9EAA3AB16BBCC3B6) passes ZIP integrity and every manifest payload hash. Extracted tmp/continuous-dark-extracted/www contains only index.html(466bytes),assets/index-C0-xUkQY.css(18,719bytes),assets/index-D3AQhMxL.js(1,782,462bytes), and is served at127.0.0.1:4174. Scenario fingerprint remains D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D. Earlier archives are preserved. Remaining limits and whole-model acceptance/tickets25/26 remain open.


## Downward supply tree — supersedes the area grid

The owner rejected the continuous area-grid layout as hard to follow and requested a tree working downward, referencing C:/Users/f676001/Documents/Codex/2026-07-30/can/isolation-visualiser.html. Browser file:// navigation was blocked by URL policy; its HTML was read statically, without serving or executing a workaround. Its layout concepts (sources above, busbars, vertical feeder drops and side alternate routes) informed the presentation; its different electrical data was not imported. Prior reference JPEG and all earlier archives remain historical references.

Presentation57ca464/bc157df derives a source-rooted forest from actual .10 asset/terminal relationships, preferring agreed conducting paths before open ties. It has657 tree connections and20 alternate/cycle connections; all684 assets/677 connections remain. Earth switches are side branches. Isolated drawing references remain separate below the tree. Layout uses immutable starting states, so live switching cannot move the diagram. Area/search shortcuts move the camera in the same canvas. Dark mode, solid orthogonal wires, existing standard device symbols, collapsible inspector and wheel/pan navigation remain.

Verification preservation: the model object saved by the rebuilt browser was compared structurally to tmp/whole-network-v23-10-browser.scenario.json and is identical, including all evidence and starting configuration. The frozen scenario remains8,382,404bytes, SHA256 D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D. It retains233 owner-confirmed evidence records,362 selected starting states,275 confirmed-rules plus87 confirmed-none local profiles, and the three Open/Rack out ties. No electrical/model/scenario files changed.

The former uncertainty outline propagated source/earth unknowns onto otherwise supported connection records. The UI now outlines only the connection record's own uncertainty: seven excluded33kV takeoff marker links. Source/earth result colors, coverage badges, evidence and unknowns remain intact. Asset details distinguish selected states/local profiles/adjacent supported connections from parent equipment metadata. Version-scoped superseded transformer-transfer, spare-earth-state and RM714 path annotations are clarified from recorded scoped claims; original labels remain disclosed. No actual installation or unconfirmed reverse/earth behavior is promoted to verified.

Typecheck/production build passes:218modules,1,784.98kB JS/355.02kB gzip,18.71kB CSS; existing Vite bundle-size advisory remains. No tests added or run for this rendering increment. Extracted final package browser checks:684assets/677connections;0diagonals,0external-label hits,0overlapping label boxes,0unrelated collinear wire overlaps; internal equipment leads0diagonals/label hits/overlaps. Three source roots share top y120. Native372px CSS viewport has no horizontal page overflow. Search SW435 IN01, area camera, mouse-wheel122%→198%, inspector minimise/restore, CB Open and Reset to Closed/Rack in were exercised. Console warning/error capture is empty. Source-connected classification for an open asset can remain because its upstream terminal is still supplied; individual terminal paths remain inspectable.

Independent Spec review reports0 actionable findings. Standards found duplicated routing math as a heuristic concern; bc157df reuses the existing primitives/type and the recheck reports0 remaining findings. Screenshot proof outside the repo: C:/Users/f676001/.codex/visualizations/2026/10/22/01a16108-5b87-7533-9f09-5ef5beb5eebb/hv-downward-tree-sw435.png. This native narrow close-up shows the descending incomer, side earth controls and horizontal bus; a whole-network fit cannot make every label readable at that narrow width. Zoom/search remains needed on the large overview. This is a code-native diagram, not a raster reproduction of either reference.

Current portable review package: output/hv-network-v10-downward-tree-review.zip,805,893bytes, SHA256 CBCA83E6C58E1C3A815F5D233A383ECCBB673E897D2ACB9387E8C91C24637EEF. ZIP integrity and every manifest payload hash pass. Its extracted tmp/downward-tree-extracted/www is served at127.0.0.1:4174 with exactly index.html(466bytes),assets/index-C0-xUkQY.css(18,719bytes),assets/index-CupiHFCJ.js(1,784,983bytes). Electrical model57a2ee9, presentationbc157df; owner-review-pending. Earlier archives are preserved. Whole-model acceptance, final full suite and tickets25/26 remain pending; no issue status changed.


## Equipment actions and grouped motor/drive layout

User's earth-switch sketch (codex-clipboard-a9df00b5-4b59-46c2-b65e-56ab1e64e0f3.png) specifies line geometry, not colors. The glyph now enters horizontally from the left, turns downward to the hinged blade, opens diagonally down/right, and keeps horizontal ground bars below. Earth symbols remain upright. Device boxes include their labels; passive equipment uses leader lines.32 already-selected intact fixed fuses show Closed/intact without fuse-removal actions; all362 recorded control states and confirmed exceptions remain unchanged. The original condition/identity annotations remain available in details.

Commits e8dfad5/2fc1e4e/fa44130 add a compact popup for canvas symbols, labels, search results and asset-list selections. It uses session-provided discrete/independent actions and their restrictions, calls the same session commands, and disables current, blocked and view-only actions. It includes source availability actions where applicable, reasons for blocked actions and the evidence-inspector link. Escape/close/outside click dismisses it; connected origin controls regain focus.

All12 RC/FC pairs align symmetrically around a central merge and Motor. Ten existing motor conductor/junction identities remain in the model and connection graph but have no canvas glyph, label, search result or list item.674 glyphs represent684 model assets and all677 original connections.17 endpoint Motors use M-in-circle glyphs. All five MV drives have separate winding inputs into AC/DC/AC VSD blocks, side DC-earth branches, output contacts and Motors aligned downward. TF505A/B/C retain their separate Delta/Star leads. No phase/earth or inter-winding electrical link is added by the symbols/layout.

85 named equipment-group borders derive from recorded drawing-view memberships and directly connected LV incomer/fuse/bus endpoints. These are diagram groups; physical room boundaries are not verified. Titles use concise tags, retaining full group names in tooltips/selector. Zoom to group focuses them on the same continuous canvas. Native MC431/MC418 views were inspected. Group/title positioning is rendering information, not electrical topology.

Final typecheck/production build passes:222modules;1,795.60kB JS/358.40kB gzip;20.51kB CSS. Existing Vite bundle-size advisory remains. No tests were added/run for this UI increment. Final extracted-package browser audits:677 routes,0diagonal connectors,0label hits/overlaps,0unrelated collinear overlaps; internal equipment leads0diagonals/label hits/overlaps. Native in-app preview startup, search popup, diagram popup, sidebar popup, Open→Rack out→Rack in→Close with blocked contact actions while out, board camera, Escape/close and panel behavior were exercised. Current model retained362 selected states/profiles and233 owner-confirmed evidence records. Console warning/error capture is empty. This increment edits only src/ui; the immutable model/scenario are unchanged. Full-suite verification and owner acceptance remain pending.

Native narrow proof is outside the repository: hv-equipment-actions.png (popup), hv-motor-group.png (centred pairs/group), hv-vsd-earth.png (final VSD/earth), in C:/Users/f676001/.codex/visualizations/2026/10/22/01a16108-5b87-7533-9f09-5ef5beb5eebb/. The narrow viewport requires zoom/pan to read large groups; the proof does not establish full desktop/browser coverage. Independent Standards and Spec reviews of5e89419...e8dfad5 and e8dfad5...2fc1e4e each report0 remaining actionable findings.

Current portable archive output/hv-network-v10-equipment-review.zip is810,332bytes, SHA256 633CBE6116709CE9C7C0B0CE6BE5FC107A4EC89E305806BDB06C74A600F04277. ZIP integrity and all manifest payload hashes pass. Extracted tmp/equipment-review-final-extracted/www contains exactly index.html(466bytes),assets/index-DuqInJTv.css(20,515bytes),assets/index-DJipD_89.js(1,795,598bytes), served at127.0.0.1:4174. Its exact8,382,404byte scenario retains SHA256 D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D. Electrical model57a2ee9, presentationfa44130; owner-review-pending. Earlier archives remain preserved; tickets25/26 and final delivery remain open.

Final popup-fit followup fa44130 excludes the vertical scrollbar from width/anchor calculations. Native client width357px now contains the popup atx12..344.8px; no edge clipping. Screenshot hv-equipment-actions.png is refreshed from the final extracted package. Final Standards/Spec rechecks off8f1802...fa44130 each report0 actionable findings.


## Larger text and source-status colours

Owner requested larger text and bright green/red for energised/isolated lines. Commit65564b5 raises whole-network names17→20px, state labels14→17px, popup body13→14px and titles16→18px. Corresponding label boxes/line spacing and main terminal margins expand to avoid overlaps or hidden wire ends. Base source-connected color is#39ff14; established no-source paths use#ff3b3b, including known disconnected/earthed paths. Source-unconfirmed amber, conflicts and selected-trace highlights retain separate presentation. Colours describe the model result, without changing electrical/uncertainty claims or confirmed states.

Typecheck/production build passes222modules,1,795.63kB JS/358.43kB gzip,20.89kB CSS; existing size advisory remains. No tests added/run. In-app browser computed styles confirm name20px, state17px, connected rgb(57,255,20), disconnected rgb(255,59,59). All677 external routes and internal leads retain0diagonals,0label hits/overlaps and0unrelated collinear overlaps. Native popup/readability and an Open SW411 IN01 with green upstream/red line-side were inspected. Proof outside repo: hv-larger-text-colours.png and hv-green-red-lines.png in the task visualization folder. Standards and Spec reviews9563dc6...65564b5 each report0 actionable findings.

Current package output/hv-network-v10-legibility-review.zip (810,671bytes; SHA256 A05EDAEC03146A7F5513D12709C199CA01A7DED1F9005A26AC66509DEE1543F1) passes ZIP integrity/all manifest hashes. Exactly the current index.html and its two referenced CSS/JS files are extracted to tmp/legibility-review-extracted/www. Manifest presentation65564b5/electrical57a2ee9; original scenario fingerprint unchanged. Earlier archives remain preserved; owner review, final full suite and tickets25/26 remain pending.


## Separated feeder trees and combined earthing selectors

Presentation b0ae27a addresses the owner's box-clearance, earth-symbol and subtree/incomer layout feedback. Device cards start24 drawing units left of the orange impact outline. Wider leaf spacing and480-unit gaps between branched sibling subtrees separate neighbouring trees; bus branches share their actual bus level instead of parallel horizontal channels. SW411 IN01 and IN02 are600 drawing units above their respective buses. Their selected Open/Rack in states remain unchanged.

All19 combined Service/Isolated/Earthed selectors derive their main, common and earth terminal roles from recorded contact matrices. Their glyphs show main Closed/earth Open in Service, both Open in Isolated, and main Open/earth Closed in Earthed. The earth contact remains part of that single selector, with its existing action rules. This does not add independent controls or installed-equipment claims. All120 standalone earth-switch glyphs remain present. Parent metadata and external coverage question marks remain separately Unconfirmed.

`pnpm build` passed (existing bundle-size advisory). In-app browser checks at1600x1000 against the extracted archive verified page identity, meaningful app content, no framework overlay and no warning/error entries. All677 connectors remained orthogonal, with0 label intersections, label overlaps or unrelated collinear overlaps. Internal equipment leads had0 diagonals, label intersections or unrelated overlaps. All19 selectors showed Closed main/Open earth at the baseline. RM406-SW01's popup blocked direct Service→Earthed, allowed Service→Isolated→Earthed, showed the selected earth path/source-to-earth conflict, and returned through Isolated to Service. Final packaged preview was reloaded to baseline; the SW411 IN01 above-bus view was reopened. Other viewports and every device's interaction sequence were not re-exercised in this increment. No tests added/run.

Independent Standards and Spec reviews of0a9ca19...b0ae27a each reported0 actionable findings. The immutable model/scenario was not edited. Packaged scenario remains8,382,404bytes, SHA256 `D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D`. ZIP integrity and every payload checksum passed. Exact production files are recorded in the archive manifest. Earlier archives remain preserved.

Screenshot evidence is in the task visualization folder: `hv-selector-service.png`, `hv-separated-feeder-trees.png`, `hv-sw411-incomers-above-bus.png`. Whole-model owner acceptance, final suite and tickets25/26 remain pending.
