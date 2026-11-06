# Visual review changes —23October2026

Owner requested horizontal/vertical connectors, standard transformer and CB symbols, text clear of lines, solid lines, earth switches with the earth symbol on the load side, fewer overlapping lines, minimisable Asset details and wheel zoom over the map. The owner also selected Closed for any otherwise unconfirmed breaker/switch starting contacts and Open for otherwise unconfirmed earth switches, retaining all previously confirmed states.

## Implementation

Rendering derives spaced geometry from each saved view without changing model terminals, connections, claims or coordinates in the immutable package. Orthogonal routes avoid equipment/label boxes and penalise coincident separate wires and crossings. A rectilinear visibility search handles routes requiring more bends; connections sharing an actual model terminal may use a common trunk. Crossing avoidance is a routing preference, not a proof of graph planarity. Layout is cached by immutable model identity/version and view.

Equipment uses winding-circle transformer symbols instead of drawing the transfer graph inside each transformer. Multiwinding transformers retain separate leads. Breaker symbols use a contact blade and breaking-contact cross, matching the reviewed processing-overview legend crop `tmp/removability-review/area2-overview-legend.png`; this is a drawing convention, not a claim of standards certification. Earth-switch symbols place the earth bars beyond the switched contact on the load side. Displayed open/closed/racked states still come from the session. Detailed winding/source/earth claims and evidence remain available in Asset details.

All map connector and uncertainty strokes are solid. Amber outlines/badges, legend text and inspector evidence retain uncertainty. Wrapped asset labels have reserved boxes; labels can be selected and full text remains in tooltips/details. The details panel can be minimised and restored; wheel zoom is centred on the pointer and does not scroll the page while over the diagram. Existing drag, keyboard, toolbar and Fit controls remain.

The frozen `.10` baseline has362 controls with no unknown contact/racking axes. Thus the new otherwise-unconfirmed default changes no existing `.10` state. Confirmed spare/tie/motor exceptions and all previous owner selections remain. Historical scenarios and provisional standalone area packages retain their original recorded data; this presentation increment does not rewrite them. No live equipment state, local action permission or whole-model acceptance is inferred.

## Verification

Typecheck and production build pass.20 focused session checks pass across current `.10`, preserved `.9` and scenario files; the whole-goal full suite remains reserved for final accepted delivery. Browser checks use the existing in-app browser at127.0.0.1:4174. The former Chrome tab was missing, so the already open in-app tab was used.

Rendered checks across all92 whole-network views cover1,512 displayed connection routes: no diagonal wire segments, wire intersections with asset-label boxes, or overlapping label boxes. The final three coincident separate-wire segments in the whole overview/western overview were routed apart and those views rechecked. Shared-terminal trunks are intentionally exempt from separate-wire overlap checks. Detailed all-view final checks, interactions and review results are recorded in implementation progress when completed.

Wheel input over the diagram changes100%→162%; panel restore works at the narrow in-app viewport. At1280×900, minimising Asset details expands the diagram panel from630px to970px. The temporary desktop viewport was reset after checking that breakpoint. The native narrow asset rail is limited to240px with internal scrolling so the diagram remains visible; its height rule is in the owning navigation stylesheet. An attempted wheel coordinate outside the resized in-app viewport was rejected; reading the current diagram bounds and using its visible point resolved it without changing electrical state.

Final code commits:20cf66a,b9105bd,4ac5cc4,70139b4 and789cf16. The first independent Spec review identified two rendering findings: converter DC/output leads omitted by a two-port limit, and inline interface leads stopping12units short of the circle. Both are corrected inb9105bd: all interface terminals have leads, anchored on the circle boundary. The final Spec and Standards rechecks each report0 remaining actionable findings. Three-position selector glyphs also retain selected contacts declared in source/earth position pairs.

Final browser audit repeats all92 views/1,512 routes:0 diagonal connectors,0 label-box intersections/overlaps and0 coincident segments between wires without a shared terminal. Ten rendered instances of four-terminal converter symbols retain all four leads; interface anchors show0 circle-boundary gap errors. These checks are scoped to the rendered whole-network views, not a claim of field topology verification. A breaker Open action updates both the inspector state and open contact blade; Reset restores Closed/Rack in. Console warning/error entries are empty.

Current delivery remains a construction under owner visual review. The updated local archive is `output/hv-network-v10-visual-review-v2.zip`,800,439bytes; SHA256 `86EC1178B8DF8909654E60C82B1B18203D583BDFF388233E519A7476D162DBDB`. ZIP integrity and every manifest payload hash pass. It contains only three production files, baseline scenario, README and manifest. It was extracted and its `www` folder served on127.0.0.1:4174; startup and whole-model selection succeed. The original review ZIP is preserved, and the unchanged `.10` scenario fingerprint remains `D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D`. Entry assets are selected from index.html, excluding stale unused build files. No PDFs or repository source files are required by the extracted app.

A magnified transformer review found secondary-lead ordering/orientation issues not covered by the earlier external-wire audit. Commit789cf16 derives transformer orientation from its primary relative to the symbol centre, sorts secondary anchors spatially, and shares equipment-port geometry between the glyph and routing/label obstacles. The final92-view audit includes equipment leads:0 diagonal lead segments,0 lead/label intersections and0 overlapping lead segments inside an asset, as well as the external-route checks above. Independent final Spec and Standards followups through789cf16 each report0 actionable findings. Typecheck/build pass with214modules,1,770.57kB JavaScript/350.49kB gzip and13.88kB CSS; the existing Vite chunk-size advisory remains. The full suite is not run. Corrected narrow-view proof is saved outside the repository as hv-visual-native.png in the task visualization directory.

## Current state and review wording

The later status cleanup4242ef0 is now the current renderer and portable copy: output/hv-network-v10-status-review.zip(801,999bytes,SHA256 0CD331343151C16AAAB9A1697F3F16FF1A543771FBCDE68366601527E851ABEB). The state/review checks are recorded in delivery-verification.md. It adds explicit current/starting states, current-model startup, historical selector groups and21 scoped notes with original construction wording retained. Underlying .10 model content is unchanged. This supersedes the current-preview/archive references above while preserving those prior artifacts as history.

## Continuous dark canvas requested by owner

Current presentation54422a0 replaces the whole-network orientation/detail-page navigation with one dark canvas containing all684assets and677connections. The13area groupings and24isolated references preserve every identity; actual SW435 and all other details are present directly. Asset search, area focus, Locate and enlarged wheel zoom operate on the same canvas. Existing electrical model/scenario remain immutable. The supplied incorrect JPEG contributes layout direction only. Build/browser/review checks and reference-inspection limitations are recorded in delivery-verification.md. Latest portable copy: output/hv-network-v10-continuous-dark-review.zip(805,817bytes,SHA256 24F547C2AB379C9A5EBF47A0D4A54EA68168085C2DC207BD9EAA3AB16BBCC3B6). All older visual/status archives remain history.


## Downward supply tree — supersedes the area grid

The owner rejected the area grid and requested a tree working downward. Commits57ca464/bc157df derive657 tree links and20 alternate links from the unchanged .10 model, with three supply roots at the top and earth controls beside their terminals. The example HTML was read statically after the browser blocked file://; its different network data was not imported.

A browser-saved model is structurally identical to the frozen .10 scenario, including233 owner-confirmed evidence records,362 starting states/local profiles and three Open/Rack out ties. The UI separates connection-record uncertainty from source/earth coverage and clarifies superseded construction labels while retaining originals. No unknown electrical or installation claim is promoted.

Build and native in-app browser checks pass; all684 assets/677 connections remain, with0diagonal connectors, label hits/overlaps or unrelated collinear overlaps. Both independent review axes have0 remaining actionable findings after sharing geometry helpers. No tests added/run for this increment. Current archive is output/hv-network-v10-downward-tree-review.zip; extracted preview remains at127.0.0.1:4174. Exact artifact hashes, preservation comparison, reference limitations and screenshot proof are recorded in [delivery verification](delivery-verification.md#downward-supply-tree--supersedes-the-area-grid). Earlier archives are preserved; owner acceptance, final suite and tickets25/26 remain pending.


## Equipment popups, boxes and motor/drive diagrams

Owner's next visual feedback is implemented in e8dfad5/2fc1e4e: upright earth-switch sketch paths; compact asset-action popups; label/device boxes; named switchroom/LV-board borders;32 fixed Closed/intact fuse labels; centred RC/FC feeds;10 junction glyphs removed;17 Motor and five AC/DC/AC VSD symbols. Existing .10 model,362 states/profiles,233 owner evidence records and all677 connection identities remain unchanged.85 diagram groups derive from recorded view/connection membership, without asserting physical room boundaries.

Build and final extracted-package browser checks pass; external/internal geometry audits are0 for diagonal/label/collinear conflicts. Popup switching/racking guards and map/search/list entry paths were exercised. Both independent review axes report0 remaining findings. No tests added/run. Current package is output/hv-network-v10-equipment-review.zip, served at127.0.0.1:4174. [Delivery verification](delivery-verification.md#equipment-actions-and-grouped-motor-drive-layout) records exact hashes, screenshot proof, reference fidelity and limitations. Earlier packages are preserved; whole-model owner acceptance/final suite/tickets25/26 remain pending.

Popup-fit followup fa44130 keeps the compact menu inside the scrollbar-excluding viewport (native357px; popupx12..344.8px). Final archive/header/manifest identities are updated in delivery-verification.md; both independent rechecks report0 remaining findings.


## Larger text and green/red lines

65564b5 enlarges diagram names/states and popup text, with matching reserved geometry. Connected lines use bright green#39ff14; established no-source paths red#ff3b3b. Uncertainty/conflict/trace indicators remain separate. Build/browser geometry and computed-colour checks pass; both review axes0findings. No tests run. Current package is output/hv-network-v10-legibility-review.zip; exact hashes/proof are in delivery-verification.md. Model, baseline and remaining acceptance status are unchanged.


## Separated trees and explicit selector earth contacts

b0ae27a adds wider subtree spacing, common bus-level routing, SW411 IN01/IN02 above the buses and card clearance around orange highlights. All19 combined selectors show the recorded main/earth contacts rather than a floating ground symbol;120 standalone earth switches remain. The .10 model, starting states, rules and evidence are unchanged. Build, extracted-preview browser/geometry checks and both independent review axes pass. No tests run. Current package is `output/hv-network-v10-selector-review.zip`; [delivery verification](delivery-verification.md#separated-feeder-trees-and-combined-earthing-selectors) records hashes, interactions, proof and limits. Owner acceptance/final suite/tickets25/26 remain pending.
