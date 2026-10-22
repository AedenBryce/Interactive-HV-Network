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

Questions30–31 ask for the selected racking baseline and the remaining SW411 contact/earth starting values. They are pending; no default value is inferred from those proposals.
