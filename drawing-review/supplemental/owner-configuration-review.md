# Owner modeling rules, breaker actions and partial baseline

Source: **Project owner (conversation)**, 23 October 2026. Answers25–27 were received after `construction-2026-10-23.1` completed its focused checks. They are recorded here for a subsequent immutable increment and are **not applied to that package**.

## Exact answers

| Question | Exact answer | Scope |
| --- | --- | --- |
|25: proposed transformer source connectivity in both directions, with separate earth behavior and no metallic winding link|“For this model, transformers should be assumed to have connectivity between primary and secondary windings in the sense that if the primary winding is energisd, the secondary will also be energised.”|Owner-selected simulation assumption: primary→secondary source connectivity. The answer does not explicitly confirm reverse source transfer. Reverse behavior is **Unconfirmed**, pending question28. No physical winding/earthing field verification follows.|
|26: SW411 Open/Closed versus distinct racking positions|“For all breakers that show they are removable, There should be an action for Open/Close and also Rack in/Rack out.”|Applies to all breakers shown as removable, not just SW411. The tool needs separate contact and racking actions. Which devices the supplied sources actually show as removable must be verified; no generic removable classification follows from the word breaker alone. Actual positions and racking restrictions are not confirmed by this answer.|
|27: three source availabilities and SW411 IN03/IN04/bus-tie baseline|“all three supplies available, IN03 and IN04 closed, Bus tie Open.”|Agreed simulation starting values for abstract TF11/TF12/TF04 supplies and the three named SW411 breaker contacts. This is not a live-site status report or acceptance of other devices' positions. Racking positions and earth-switch baselines remain **Unconfirmed**.|

## Named model values for answer27

- `boundary:tf11`, `boundary:tf12`, `boundary:tf04`: source availability true.
- `sw411:in-03:cb`, `sw411:in-04:cb`: contact closed.
- `sw411:bus-tie:cb`: contact open.

These names identify the already represented supplies/devices; they do not establish a physical external-generation topology or its coupling/earth behavior. Other baseline values remain unconfirmed.

## Follow-up answers28–29

Question28 asked whether secondary supply should also make the primary source-connected, or whether V1 should represent primary→secondary only. Exact answer:

> Transformer should only be supplied from the Primary, but if there is a ring supply that energises the secondary of the transformer and that is energisd then it should show that so its clear that the isolations are not safe for the transformer.

Confirmed model behavior: normal supply is primary→secondary; an external ring supply on the secondary must remain visible as source connectivity when the normal primary feed is open. The tool must not hide that supplied secondary by considering only the normal primary route. **Unconfirmed:** whether to establish reverse transfer onto the primary as a known modeled relationship. The answer does not explicitly resolve that terminal-level behavior. Showing the secondary supply must not become an operational declaration that an isolation is safe or unsafe; this tool reports connectivity and unresolved information.

Question29 asked for racking restrictions, including whether racking requires an open breaker and whether Open/Close remains available while racked out. Exact answer:

> Rack in/out is only permitted wit Breaker Open. No open/close when breaker racked out.

The selected V1 rules therefore require an open breaker for Rack in/out and block both Open/Close actions while racked out. An unknown contact or racking value must not silently become open or racked in. The answer selects action restrictions, not starting positions. No switchgear exceptions were supplied.

Removable-device source review and a representation supporting independent Open/Close and Rack in/out actions are required before implementing answer26. Remaining racking and other baseline values are unconfirmed. A model-boundary decision for cross-station keys in answer24 remains separate from these position/mechanism questions. Whole-network acceptance is still pending.

## Baseline follow-up answers30–31

For question30, asking whether all drawing-confirmed removable breakers should start Rack in, the owner answered exactly:

> ALl racked in unless there is a loop feed, in which case you can ask me what state individually.

This selects Rack in for removable breakers other than loop feeds. Loop-feed racking positions require individual owner confirmation. Which breakers the sources show as removable, and which cases need the loop-feed exception, must be established before applying the default; no loop-feed position is silently assigned.

For question31, the complete proposal was outgoing SW411 feeder breakers at tiers01/02/03/04/13/14/15/16 closed; spare incomers IN01/IN02 open; all SW411 earth switches open, including bus earths. The previously selected IN03/IN04 closed and bus-tie open values were explicitly retained. The owner answered exactly **“Confirm these starting positions”**.

These answers select the remaining SW411 contact/earth baseline. They do not resolve loop-feed racking values, other areas' contact/earth baseline, complete physical interlocks or whole-model acceptance. Answers25–31 remain unapplied to immutable `construction-2026-10-23.1`.

## Individual tie answers32–34

| Question / asset | Exact answer | Selected simulation baseline |
| --- | --- | --- |
|32: `sw411:bus-tie:cb`, CB SW411 BT|“Rack out”|Contact Open from answer27; Rack out from answer32.|
|33: `sw431:sw435:cb`, CB SW435 FD02 at SW431|“CB should be open, and racked out”|Open / Rack out.|
|34: `sw435:sw431:cb`, CB SW431 FD02 at SW435|“open and racked out”|Open / Rack out.|

Question32 cited `CB-10016-DR-EL-0011.pdf`, rev0, p1 B/3, tier8. Question33 cited that overview, p1 C/3–4, and `11098-07110-EL-DR-2353.pdf`, rev5, p1 C–G/2–3. Question34 cited `CB-10016-DR-EL-0010.pdf`, rev0, p1 A–B/8, and `11098-07110-EL-DR-2354.pdf`, rev9, p1 B–G/2–3. The previously confirmed SW431-P-02 tie and exact named end devices are retained.

These are explicit individual values; they do not depend on assuming whether every graph-cycle member counts as a loop feed. Other loop-feed exceptions still require their own source/owner review. These later selections are not applied to immutable `construction-2026-10-23.1`.

## Answers35–37: symbol categories, baseline and SW411 local rules

- **35, exact answer “Yes, both LV and MV examples”:** for this tool, plug/U-contact symbols on the detailed LV and hopper MV sheets are classified as removable, matching the processing overview's explicit withdrawable legend. The question named CB SW456 IN D (`11098-04400-EL-DR-8021.pdf`, rev7, p1 B–C/2) and Hopper7 MC418 incoming VCB (`CB17OP023C-01006-DR-EL-0002.pdf`, rev2, p1 B–D/4–5). This confirms the depicted symbol categories where the marks actually appear; it does not classify generic CB symbols without them.
- **36, exact answer “Confirm this baseline proposal”:** in-service feeder breakers/disconnectors Closed; spare feeders Open; all earth switches Open; all motor Forward/Reverse contactors Open (motors stopped). The three confirmed tie breakers remain Open/Rack out; other removable breakers use Rack in except further loop feeds requiring individual confirmation. Where in-service/spare identity remains unconfirmed, retain Unconfirmed. These are teaching-scenario starting values, not live-site states.
- **37, exact answer “Confirm this local rule set”:** the complete selected rule set below applies to SW411 incoming/outgoing line-earth pairs. It excludes the two bus-earth switches. Unknown prerequisites block the affected action; the previously deferred cross-station key sequence remains excluded.

| SW411 local action | Selected prerequisite |
| --- | --- |
| Breaker Open | Rack in |
| Breaker Close | Rack in and its earth switch Open |
| Rack out | Breaker Open |
| Rack in | Breaker Open and its earth switch Open |
| Earth Open | Allowed |
| Earth Close | Breaker Open and Rack out |

No additional local condition was supplied in answer37. This is an explicit selected V1 rule set for these pairs, not a generalised rule for every switchgear family. Whole-model acceptance remains separate. The later source classification, baseline and rule selections are not yet applied to immutable `construction-2026-10-23.1`.

Question38 asks separately whether the three retained station feeder breakers and two SW441 HV breakers are removable. Those five cases remain unconfirmed pending that answer.
