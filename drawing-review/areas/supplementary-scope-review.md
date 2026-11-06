# Supplementary original-sheet scope classification

Reviewed 22 October 2026 to disposition the remaining supplied originals after the area source reviews. This is source classification, not runtime implementation or installed-network acceptance.

## Source register

| Ref | Original supplied filename | Verified revision / issue text | Page / visual inspection and disposition |
| --- | --- | --- | --- |
| SUP-S01 | `11098-07110-EL-DR-2471.pdf` | 6 / 04.03.16 / ISSUED FOR CONSTRUCTION - STACKER UPGRADE | 1; full SW442 sheet3; 690V D/Y bar continuations B-C / 2-9, outgoing drives D-G; SH102 key note A / 11-12; title H. Outgoing LV continuation. |
| SUP-S02 | `11098-07110-EL-DR-2664.pdf` | 3 / 11.09.09 / ISSUED FOR AS BUILT | 1; full MC434A sheet1; 400V bar C / 1-10, outgoing lube/hydraulic/heater circuits D-G; continuation right to2665; title H. Outgoing LV continuation. |
| SUP-S03 | `11098-07110-EL-DR-2665.pdf` | 4 / 11.09.09 / ISSUED FOR AS BUILT | 1; full MC434A sheet2; MC431 source A-B / 5, main isolator/bar C / 5, DC control supplies A-C / 4 and9, outgoing circuits D-G; title H. Subordinate LV board after MC431 first bus. |
| SUP-S04 | `11098-07110-EL-DR-2666.pdf` | 3 / 11.09.09 / ISSUED FOR AS BUILT | 1; full MC434A sheet3; 400V bar continuation C / 1-10 from2665 to2685, outgoing motors/heaters D-G; title H. Outgoing LV continuation. |
| SUP-S05 | `11098-07110-EL-DR-2667.pdf` | 4 / 15.07.25 / ISSUED FOR CONSTRUCTION - CP25OP003A | 1; full MC434B sheet1; 400V bar C / 1-12 to2668, outgoing auxiliaries D-G, construction notes A / 10-12; title H. Outgoing LV continuation. |
| SUP-S06 | `11098-07110-EL-DR-2668.pdf` | 4 / 11.09.09 / ISSUED FOR AS BUILT | 1; full MC434B sheet2; MC435 source A-B / 7, main isolator/bar C / 7, DC supplies A-C / 4-6; outgoing circuits D-G; title H. Subordinate LV board after MC435 first bus. |
| SUP-S07 | `11098-07110-EL-DR-2669.pdf` | 5 / 15.05.26 / AS BUILT; separate stamp15/05/2026 | 1; full MC434B sheet3; 400V bar C / 2-10 from2668 to2686, outgoing motors/heaters D-G; title H. Outgoing LV continuation. |
| SUP-S08 | `11098-07110-EL-DR-2675.pdf` | 13 / 28.11.25 / ISSUED FOR CONSTRUCTION in red revision row/title; row12 dated18.11.25 retained | 1; full MC453 stockpiling-apron-feeders sheet; MC435 source A-B / 5, incoming isolator/bar B-C / 5, outgoing circuits C-G including red PU371A fire-pump DB; title H. Subordinate400V board after MC435 first bus. |
| SUP-S09 | `11098-07110-EL-DR-2678.pdf` | 4 / 21.05.25 / ISSUED FOR CONSTRUCTION - CP25OP003A | 1; full MC411 main-HV-substation auxiliary sheet; source MC435 A-B / 5, CB MC411 IN/main400V bar C / 2-7, UPS/DB/AC outgoing circuits D-G; title H. Location title does not make its400V circuit an HV supply. |
| SUP-S10 | `11098-07110-EL-DR-2679.pdf` | 4 / 08.01.26 / ISSUED FOR CONSTRUCTION - CB25OP003A | 1; full MC415 central-control-room sheet; MC426 source A-B / 5, CB MC415 IN/400V bar C / 2-7, outgoing UPS/DB D-G; title H. Subordinate LV board after MC426 first bus. |
| SUP-S11 | `11098-07110-EL-DR-2685.pdf` | 1 / 11.09.09 / ISSUED FOR AS BUILT | 1; full MC434A sheet4; continuation from2666 C / 4, outgoing DB/AC/JB circuits D-G; title H. Outgoing LV continuation. |
| SUP-S12 | `11098-07110-EL-DR-2686.pdf` | 2 / 05.05.25 / ISSUED FOR CONSTRUCTION - CP25OP003A | 1; full MC434B sheet4; continuation from2669 C / 2, outgoing AC/drive-brake circuits D-G, construction notes G / 10-12; title H. Outgoing LV continuation. |
| SUP-D01 | `11098-07110-EL-DR-2465 (2).pdf` | Byte-identical to2465.pdf; inherits its recorded rev7 source content, not a separate revision | 1; verified SHA-256 relationship only. **No new visual-review claim.** Identical content was visually reviewed as screening SC-S02. Not another unique topology source. |

Twelve original pages were rendered at90dpi and visually inspected in full. Eighteen crops from180dpi renders were inspected: all twelve revision-history strips, the five subordinate-board source/incomer regions and SW442's key note. The duplicate row was checked using SHA-256, not counted as a thirteenth visual review. Hashes, crop boxes and dispositions are in `supplementary-scope-evidence.json`. Poppler warned `No display font for 'Symbol'` for two renders; source labels, conductor geometry and cited notes remained legible. This does not certify every protection glyph. Text search served only to locate candidate pages.

## Scope conclusions

**Inference:** all twelve inspected sheets depict LV continuation, auxiliary distribution or outgoing loads after a first LV endpoint already represented by the relevant area source review. No inspected page explicitly establishes a new external source, additional upstream HV feeder, or additional transformer before those endpoints. This conclusion is limited to the cited supplied revisions; it is not a completeness or installed-current assertion.

The controlling upstream references are explicit on the inspected pages:

- SUP-S03 p1 A-C / 5 says **FROM MC431 /07110-EL-DR-2654**, entering MC434A's1250A isolator. The24VDC and48VDC supplies fromUP431A/B are separate control buses. MC431's first phase bus is the crushing1 endpoint; do not extend its runtime to MC434A's outgoing loads.
- SUP-S06 p1 A-C / 7 says **FROM MC435 /07110-EL-DR-2660**, entering MC434B's1250A isolator. UP435A/B supply the separate control buses. This supports the subordinate-board disposition already stated in the crushing2/HPGR review, not another HV supply.
- SUP-S08 p1 A-C / 5 says **FROM MC435 /07110-EL-DR-2660**, entering `MC453 IN630A(ISOLATOR)` and a400V phase bar. **MC453** here is a subordinate apron-feeder board. Do not merge it with **SW453**, the separately named690V D/Y transformer-fed switchboard, by the shared numeric suffix or stockpiling description. The newly redlined PU371A-DB01/CSSS fire-pump-skid DB is downstream LV content, with a TBC reference; it creates no in-scope external source.
- SUP-S09 p1 A-C / 5 says **FROM MC435 /07110-EL-DR-2660**, through `CB MC411 IN250A` to a400V bar. The title **MAIN HV SUBSTATION** is a location/board description; its drawing does not identify an11/22kV power route or an independent station auxiliary source. Preserve MC411 versus SW411 identities.
- SUP-S10 p1 A-C / 5 says **FROM MC426 /07110-EL-DR-2653**, through `CB MC415 IN250A` to a400V bar. This confirms downstream central-control-room supply context and does not extend the Desands model past MC426's endpoint.
- SUP-S01 p1 B-C / 2-9 has two690V D/Y bars continued from2470; it adds outgoing VSD circuits without an inter-bar phase tie or another incoming source. Shared control/PROFIBUS/DC lines are not phase ties. Existing crushing1 source review owns TF442/SW442's first buses.

## Interlocks, earth and revision limits

SUP-S01 rev6 p1 note2 A / 11-12 expressly describes an SH102 power-isolator key switch and auxiliary contact that trips its statutory-safety-relay/VSD-contactor circuit. That is evidence about the **outgoing LV shuttle drive**. It must not be applied as an invented physical interlock on SW431 HV devices or on every area switch. The note does not establish the complete installed key-release truth table or switching permission.

SUP-S05 andSUP-S12's construction notes describe planned motor-protection-relay/contactor upgrades and removal of notes after construction. The source does not confirm completion. Their construction issue status and SUP-S07's AS BUILT revision do not establish a current switching baseline. Preserve exact revisions without declaring any one automatically authoritative.

The subordinate sheets distinguish phase, neutral, earth and DC-control bars. No earth/neutral depiction authorizes converting a neutral or equipment bond into a phase-bus earth connection. No upstream phase-earth branch or additional physical interlock is created from these details.

## Reconciliation and disposition

The following existing area reviews are referenced for context only, without claiming their original pages were re-reviewed here:

- `crushing-1-review.md`: MC431 and SW442 endpoints; SUP-S01/03 extend outgoing coverage.
- `crushing-2-hpgr-review.md`: MC435 endpoint and already identified MC434B/MC453/MC411 outgoing boards; SUP-S06/08/09 independently confirm the printed source references on those subordinate pages.
- `desands-laboratory-review.md`: MC426 endpoint; SUP-S10 confirms the downstream MC415 context.
- `screening-review.md`: SC-S02 is the prior visual review of2465.pdf. Both2465.pdf and2465(2).pdf hash to `32250465eab4a6ec8b5ca14cfb4169911eb7a2cd6c3ce2d2649451da87fa143b`.

No runtime extension is proposed from these sheets. **Unconfirmed:** present installation, completed upgrades, full interlocks, actual positions and source availability. No source here expressly authorizes switching; switching permission is **not confirmed as permitted**. No shared coverage file, runtime model, issue or original PDF was modified.
