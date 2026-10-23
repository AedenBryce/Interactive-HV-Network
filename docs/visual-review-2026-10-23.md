# Visual review changes —23October2026

Owner requested horizontal/vertical connectors, standard transformer and CB symbols, text clear of lines, solid lines, earth switches with the earth symbol on the load side, fewer overlapping lines, minimisable Asset details and wheel zoom over the map. The owner also selected Closed for any otherwise unconfirmed breaker/switch starting contacts and Open for otherwise unconfirmed earth switches, retaining all previously confirmed states.

## Implementation

Rendering derives spaced geometry from each saved view without changing model terminals, connections, claims or coordinates in the immutable package. Orthogonal routes avoid equipment/label boxes and penalise coincident separate wires and crossings. A rectilinear visibility search handles routes requiring more bends; connections sharing an actual model terminal may use a common trunk. Crossing avoidance is a routing preference, not a proof of graph planarity. Layout is cached by immutable model identity/version and view.

Equipment uses winding-circle transformer symbols instead of drawing the transfer graph inside each transformer. Multiwinding transformers retain separate leads. Breaker symbols use a contact blade and breaking-contact cross, matching the reviewed processing-overview legend crop `tmp/removability-review/area2-overview-legend.png`; this is a drawing convention, not a claim of standards certification. Earth-switch symbols place the earth bars beyond the switched contact on the load side. Displayed open/closed/racked states still come from the session. Detailed winding/source/earth claims and evidence remain available in Asset details.

All map connector and uncertainty strokes are solid. Amber outlines/badges, legend text and inspector evidence retain uncertainty. Wrapped asset labels have reserved boxes; labels can be selected and full text remains in tooltips/details. The details panel can be minimised and restored; wheel zoom is centred on the pointer and does not scroll the page while over the diagram. Existing drag, keyboard, toolbar and Fit controls remain.

The frozen `.10` baseline has362 controls with no unknown contact/racking axes. Thus the new otherwise-unconfirmed default changes no existing `.10` state. Confirmed spare/tie/motor exceptions and all previous owner selections remain. Historical scenarios and provisional standalone area packages retain their original recorded data; this presentation increment does not rewrite them. No live equipment state, local action permission or whole-model acceptance is inferred.

## Verification so far

Typecheck and production build pass.20 focused session checks pass across current `.10`, preserved `.9` and scenario files; the whole-goal full suite remains reserved for final accepted delivery. Browser checks use the existing in-app browser at127.0.0.1:4174. The former Chrome tab was missing, so the already open in-app tab was used.

Rendered checks across all92 whole-network views cover1,512 displayed connection routes: no diagonal wire segments, wire intersections with asset-label boxes, or overlapping label boxes. The final three coincident separate-wire segments in the whole overview/western overview were routed apart and those views rechecked. Shared-terminal trunks are intentionally exempt from separate-wire overlap checks. Detailed all-view final checks, interactions and review results are recorded in implementation progress when completed.

Wheel input over the diagram changes100%→162%; panel restore works at the narrow in-app viewport. At1280×900, minimising Asset details expands the diagram panel from630px to970px. A temporary desktop viewport is used to check that breakpoint and will be reset afterward. An attempted wheel coordinate outside the resized in-app viewport was rejected; reading the current diagram bounds and using its visible point resolved it without changing electrical state.

Current delivery remains a construction under owner visual review. The original `.10` review ZIP is a historical build; a new visual review archive will be published after these checks, preserving the original archive and the `.10` scenario fingerprint.
