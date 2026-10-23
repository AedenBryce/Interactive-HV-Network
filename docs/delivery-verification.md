# Local delivery verification

## Current evidence

The current renderer is54422a0, applying the owner's visual feedback to the unchanged `.10` electrical package. The [visual change record](visual-review-2026-10-23.md) records checks and the updated `output/hv-network-v10-continuous-dark-review.zip` (805,817bytes; SHA256 `24F547C2AB379C9A5EBF47A0D4A54EA68168085C2DC207BD9EAA3AB16BBCC3B6`). That ZIP was extracted and its three-file `www` folder is now served at127.0.0.1:4174. Startup and whole-model selection pass. The records below retain the original `.10` renderer/archive evidence; they do not identify the newer visual JavaScript bundle. Model acceptance remains pending.

Verified23October2026 against immutable `construction-2026-10-23.10`, implementation57a2ee9. The current whole-model review is pending; the owner's confirmed Section1 and preference for whole-tool visual review are recorded in [the walkthrough](v10-walkthrough.md).

The original isolated `tmp/delivery-v10` folder contained these production files; the current preview instead serves the v2 visual archive described above:

| File | Bytes | SHA256 |
| --- | ---: | --- |
| index.html |466| B22E97A498646394121959BB358F2C3742A5B5427E9F32468B5B4DC4A4E22B00 |
| assets/index-D-Oih6Pk.css |13,126| D6A60C468404369FC4ABFE7A254A7DF0248B4F09E2291849CF346C0E142ABC05 |
| assets/index-BdyJkv-T.js |1,763,805| A6195D789A859531CA6772F1243233F1CCF6829BE0D82447BE1A4D68EA8357E1 |

Original electrical-browser evidence is recorded in [implementation progress](implementation-progress.md): startup without PDFs/repository sources, laboratory LV supply interruption and racking guards, Undo/Reset, actual matching `.10` restore, and original `.9` view-only restore with Undo/Reset disabled. Browser warning/error entries were empty. The live server handle was polled again after the walkthrough began: it remains running; its request log contains successful HTML,CSS,JavaScript requests and favicon404, with no PDF or model-file request.

The local review archive `output/hv-network-v10-review.zip` is797,511bytes, SHA256 `5520826AF4D6E6D5FB8902B22789D38005286E700B8156E45AE36B7EF70C00BA`. It contains the same three production files under `www/`, the actual self-contained `.10` baseline scenario, standalone startup/review instructions and a per-file SHA256 manifest. ZIP integrity and every manifest payload hash were checked. The scenario fingerprint remains `D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D` (8,382,404bytes). Python3.12.10 is installed on the preparation PC; instructions serve the extracted `www` folder on loopback port4186 with Python's standard HTTP server. Those packaged files match the isolated build already exercised; the extracted archive itself has not been launched separately.

This is a **review copy**, not accepted final delivery. Full-suite verification, complete owner visual review, explicit immutable-version acceptance and final ticket closure remain pending. No model or acceptance status was rewritten while packaging. The updated renderer has been checked at the native narrow in-app viewport and1280×900; other browsers/viewports remain unverified.

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
