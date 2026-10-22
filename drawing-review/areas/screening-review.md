# Screening / SW421 source review

Reviewed: 22 October 2026. Preparation for GitHub #16 (T15). **Source review only. No runtime model, installed configuration or starting configuration is accepted by this review.**

The PDF skill was used for read-only review. Ten distinct supplied PDF pages were rendered and visually inspected in full; enlarged crops were also inspected for SW421 incomer/feeder connections, TF423's two LV incomers, TF421/TF422 neutral connections and revision blocks. Text extraction was used to locate and cross-check labels, not to establish topology on its own. Each listed file contains one PDF page. Regions below use the printed drawing grid plus descriptive locations.

## Sources inspected

| Ref | Exact supplied filename | Printed revision, date and status | Page | Relevant region |
| --- | --- | --- | --- | --- |
| SC-S01 | `11098-07110-EL-DR-2351.pdf` | 5, 28/01/25, AS FOUND 23.10.23 | 1 | Complete SW421 HV SLD; incoming route A-C / 1-2; bus C / 1-10; bus earth and transformer feeders C-G / 3-8; spare bays at left and right |
| SC-S02 | `11098-07110-EL-DR-2465.pdf` | 7, 28/10/25, ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | SW423 sheet 1; TF423 A / 5-6; left D incomer A-C / 1-2, right Y incomer A-C / 9-10; two LV bars C / 1-10 |
| SC-S03 | `11098-07110-EL-DR-2466.pdf` | 5, 18/11/25, ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | SW423 sheet 2; two 690 V bar continuations C / 1-10; arrows to 2465 and 2467 |
| SC-S04 | `11098-07110-EL-DR-2467.pdf` | 10, 18/11/25, ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | SW423 sheet 3; two bar continuations B-C / 1-10; notes 1-4 A-B / 11-12; outgoing SH101/SH106 equipment F-G |
| SC-S05 | `11098-07110-EL-DR-2474.pdf` | 4, 20/08/09, ISSUED FOR AS-BUILT | 1 | SW423 sheet 4; two LV bars B-C, ending near column 7; continuation arrow from 2467 at left |
| SC-S06 | `11098-07110-EL-DR-2650.pdf` | 10, 23/01/26, ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | MC421 sheet 1; TF421 A-C / 5-6; incomer C-D / 5; neutral/MEN branch C-D / 6-8; 400 V bar D / 1-10 |
| SC-S07 | `11098-07110-EL-DR-2652.pdf` | 10, 23/01/26, ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | MC422; TF422 A-C / 5-6; incomer C-D / 5; neutral/MEN branch C-D / 6-8; 400 V bar D / 1-12 |
| SC-S08 | `11098-07110-EL-DR-2671.pdf` | 5B, 10/02/26, RE-ISSUED FOR REVIEW - CB25OP003A | 1 | MC421 sheet 2; same 400 V bar D / 1-10, continuation from 2650; revision block at lower left |
| SC-S09 | `CB-10016-DR-EL-0011.pdf` | 0, 27/10/25; revision entry says ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMENDED); AS BUILT stamp dated 27/10/2025 | 1 | Overview sheet 2; SW411 tier 15 feeder B / 5; SS421 panel E-G / 6-8; overview-use notes lower left |
| SC-S10 | `11098-07110-EL-DR-5151.pdf` | 7, 28/01/25, AS FOUND 23.10.23 | 1 | SW411 tier 15 SW421 feeder D-G / 10-11; source connections above the main bar; note 3 at upper right |

SC-S09, SC-S10 and SC-S04 were previously listed as initial review sources S2, S3 and S7. Their inspection here is a **re-review**, not three additional unique drawings for a project-wide coverage count. SC-S02's identical `(2)` copy was not separately visually reviewed and adds no independent evidence. The machine-readable companion records the ten reviewed file hashes. This report does not update or claim a project-wide reviewed total.

Revision status is transcribed, not a precedence rule. **Unconfirmed:** which supplied revision governs the installed arrangement, and whether changes marked construction or review have been installed.

SC-S09, p1, notes 1-2 at lower left explicitly identify the drawing as a high-level overview/reference document and direct isolation work to relevant SLDs, HV switching programs and key interlocking procedures. Those notes do not confirm a particular device's physical switching conditions.

## Drawing-supported supply routes

The table describes what is drawn. Arrows give reading order, not permission to energise in either direction. Reverse energisation behaviour remains **Unconfirmed** unless separately established.

| Record | Drawn route / identity | Exact source and region |
| --- | --- | --- |
| SC-T01 | SW411's SW421 feeder is tagged `CB SW421 FD 01`, with outgoing cable `SW421-P-01` to SS421 / SW421. `ES SW421 FD 01` branches from the outgoing cable side. | SC-S10, p1, tier 15, D-G / 10-11; SC-S09, p1, SW411 tier 15 and route into SS421 |
| SC-T02 | At SW421, power cable `SW421-P-01` enters the route tagged `CB SW421 IN 01` and reaches the single drawn 22 kV main bar. `ES SW421 IN 01` branches from the incoming cable side, above the breaker. The off-page reference names HV switchboard SW411 / 07110-EL-DR-5151. | SC-S01, p1, A-C / 1-2; SC-S09, p1, top of SS421 panel |
| SC-T03 | A separate direct bar-earth branch is tagged `ES SW421`, in the bus-earth tier 3. It is distinct from the incoming and outgoing cable-side earth switches. | SC-S01, p1, C-E / 3-4; SC-S09, p1, SS421 tier 3 |
| SC-T04 | SW421 bar -> `CB TF421 FD` -> power cable `TF421-P-01` -> TF421. `ES TF421 FD` branches from the transformer cable side of that feeder. The lower reference names MC421 / drawings 2650 and 2671. | SC-S01, p1, tier 4, C-G / 4-5; SC-S06, p1, upper TF421 route |
| SC-T05 | TF421 is labelled 22 kV/400 V, 2.0 MVA; its LV phase route passes through `CB MC421 IN` to the 400 V MC421 bar. | SC-S06, p1, TF421 A-C / 5-6, incomer C-D / 5 and bar D |
| SC-T06 | MC421's 400 V bar continues from 2650 to 2671. Sheet 2 shows the continuation and the same 400 V, 3000 A bar, with no additional upstream incomer drawn there. | SC-S06, p1, right continuation at D-E / 10; SC-S08, p1, left continuation and row D |
| SC-T07 | SW421 bar -> `CB TF422 FD` -> power cable `TF422-P-01` -> TF422. `ES TF422 FD` branches from the transformer cable side. The lower reference names MC422 / 2652. | SC-S01, p1, tier 5, C-G / 5-6; SC-S07, p1, upper TF422 route |
| SC-T08 | TF422 is labelled 22 kV/400 V, 2.0 MVA; its LV phase route passes through `CB MC422 IN` to the 400 V MC422 bar. | SC-S07, p1, A-D / 5-8 and bar D |
| SC-T09 | SW421 bar -> `CB TF423 FD` -> power cable `TF423-P-01` -> TF423. `ES TF423 FD` branches from the transformer cable side. The lower reference labels TF423 22 kV/690 V/690 V and points to SW423 sheets 2465-2467. | SC-S01, p1, tier 6, C-G / 7-8 |
| SC-T10 | TF423 is drawn as a three-winding transformer, labelled 22 kV/690 V/690 V, 5 MVA. The left LV winding route goes through cable group `SW423-P-01-1` to `-5`, then `CB SW423 IN D`, to the delta-marked 690 V bar. The right route uses `SW423-P-02-1` to `-5`, then `CB SW423 IN Y`, to the Y-marked 690 V bar. | SC-S02, p1, TF423 A / 5-6, left/right routes A-C / 1-10, two bars C |
| SC-T11 | The two SW423 bars continue across 2466 and 2467 to 2474, where both end. The sheets retain separate delta and Y labels. No bus-tie between these bars is drawn on these four inspected sheets. | SC-S02-SC-S05, p1 each, main 690 V bars and continuation arrows |
| SC-T12 | Two SW421 bays are marked spare: tier 2 at the left and tier 7 at the right. Each shows a `CB SPARE FD` and `ES SPARE FD`; no named downstream power asset is attached to their outgoing arrows on this sheet. | SC-S01, p1, tier 2 C-G / 1-2 and tier 7 C-G / 8-10; SC-S09, p1, SS421 spares |

**Inference for the model boundary:** use MC421's 400 V bar, MC422's 400 V bar, and SW423's separate delta and Y 690 V bars as this area's final LV bus endpoints. Their outgoing drives, motors, UPS/control/distribution circuits are outside the agreed project boundary. SC-S06/SC-S08 are one continued MC421 bar, and SC-S02-SC-S05 are two continued SW423 bars; page continuations must not create duplicate buses.

### Transformer and earth evidence boundaries

- SC-S06 and SC-S07, p1, C-D / 6-8 explicitly draw the LV neutral route, neutral bar, MEN link and earth bar separately from the phase route through the LV incomer. Their referenced earthing drawings are 07110-EL-DR-1170 and 07110-EL-DR-1172 respectively. **The source does not confirm a permanent phase-bus-to-earth connection.** A phase bus must not be attached to earth merely because this neutral/MEN arrangement is drawn.
- SC-S02, p1, A / 5-6 labels a transformer screen earth. **The source does not confirm that either LV phase bus is directly connected to earth through that screen.**
- **Unconfirmed:** permitted reverse energisation, transfer between TF423's two LV windings, any additional winding/neutral/earthing restrictions and detailed installed transformer arrangements. The winding symbols and ratings do not establish a universal source-transfer or galvanic earth relationship. Any provisional transfer relationship in the runtime model must be labelled provisional and linked to a review question.
- Instrument/voltage-transformer, CT, communications and protection lines on SC-S01 are not additional main-power supply routes merely because lines cross. For example `MC421-C-01/-02`, `MC422-C-01/-02` and `SW423-C-01...-04` are shown as CT/control references; the power routes above use the P-labelled routes and visible main-power lines.

## Identities and aliases

| Item | Source evidence | Treatment / remaining confirmation |
| --- | --- | --- |
| SW421 / SS421 | SC-S01 titles the HV switchboard SW421; SC-S09 and SC-S10 name the substation SS421 / Screening and its switchboard SW421. | Preserve switchboard and area identity separately; do not create a second switchboard from SS421. |
| SW421 feeder labels with whitespace | SC-S10 shows `CB SW421 FD 01`, `ES SW421 FD 01`; SC-S09 has compact FD01 forms. | **Inference:** whitespace variants describe the matching tier 15 route. Preserve original labels as aliases for owner review. |
| TF421/TF422 feeder label adjacent protection number | SC-S01 enlarged visual shows `CB TF421 FD`, `ES TF421 FD`, `CB TF422 FD`, `ES TF422 FD`. Extracted text joins some nearby `51` relay labels to `FD`. | Use the visually verified labels, not fabricated FD51 asset identities. |
| SW423 vs SW243 reference descriptions | SC-S04's main title is SW423, while its lower reference-table descriptions for other screening sheets read SW243; the referenced drawing numbers are 2465, 2466 and 2474. | **Unconfirmed:** reference-description typo/alias. Do not create separate SW243 equipment solely from that table. |
| Two spare bay labels | SC-S01 repeats CB/ES SPARE FD for tiers 2 and 7. | **Inference:** separate stable identities should include switchboard and tier. The repeated display tag is not a globally unique identity. |

## Physical interlocks and unaccepted configuration

The following are source limitations, not generic switching permissions:

1. **SW421 switching conditions Unconfirmed.** SC-S01 shows breaker, earth-switch and withdrawal/contact symbols but supplies no explicit key identities, permitted operating sequence or complete position interlock conditions. SC-S09's overview legend identifies withdrawable breakers, but its notes defer key-interlocking procedures. **The source does not confirm this** for the detailed allowed transitions of SW421 IN01, bus earth, TF421/TF422/TF423 feeder devices or the spare bays. Keep affected controls disabled until their physical interlock review is resolved.
2. **LV incomer switching conditions Unconfirmed.** SC-S02, SC-S06 and SC-S07 show the relevant incomers; their inspected content does not explicitly establish the physical interlock conditions or absence of restrictions. An empty model rule list must not be treated as confirmation. The sources do not confirm mutual exclusion, ganged operation or a key sequence for `CB SW423 IN D` and `CB SW423 IN Y`.
3. **Explicit outgoing interlock outside scope.** SC-S04, p1, note 2 at A-B / 11-12 explicitly describes SH101/SH106 power-isolator key-switch operation before turning the isolator off, with an auxiliary contact into their statutory safety relay circuit to trip the VSD contactor. Those outgoing isolators and drives are beyond the LV bus endpoints. This note does not establish an SW421 or SW423 incomer rule. Record it as reviewed/outside scope; do not generalise it to upstream devices.
4. **Starting states and source availability Unconfirmed.** None of these pages is an owner acceptance of the project's starting configuration. Drawn switch positions and an AS FOUND revision description do not establish agreed current/normal positions. Maintain nullable/unconfirmed starting positions and source availability until owner review; avoid inserting a new local source just to make the area appear energised.

## Open review questions for integration

| Local ID | Question / affected model elements | Evidence and consequence |
| --- | --- | --- |
| SC-R01 | Which supplied revisions govern the installed screening arrangement? | SC-S01/SC-S10 are AS FOUND 23.10.23, SC-S02-SC-S04/SC-S06/SC-S07 are later construction issues, SC-S08 is for review and SC-S05 is an older as-built. Keep provenance/status, without choosing precedence silently. |
| SC-R02 | Confirm SW421 device identities, supported withdrawal/earthing positions and physical interlock conditions, including spares. | SC-S01 and SC-S09; affected controls remain disabled pending explicit confirmation. |
| SC-R03 | Confirm physical interlock conditions for MC421/MC422 and SW423 D/Y incomers. | SC-S02/SC-S06/SC-S07; absence of stated rules does not establish no restrictions. |
| SC-R04 | Confirm transformer source-transfer/backfeed and independent earth relationships for TF421, TF422 and all three TF423 windings. | SC-S01/SC-S02/SC-S06/SC-S07; no inferred secondary-to-secondary bus tie or phase-earth connection. |
| SC-R05 | Confirm all starting positions and SW411 source/bus availability affecting SW421. | SC-S01/SC-S09/SC-S10; source status must link to the integrated SW411 model, whose upstream source questions remain separate. |
| SC-R06 | Confirm whether SW243 in SC-S04's reference table is only a description typo for SW423. | SC-S04 lower-left reference table; preserve as unresolved alias, not extra equipment. |

These local IDs are not replacements for global discrepancy records. Integration should link or merge matching existing questions, retaining all evidence rather than duplicating owner decisions.

## Missing referenced material and coverage status

A filename search of the supplied drawing directory found no 07110-EL-DR-1170/1172, 07110-EL-DR-2370, 07110-EL-DR-2360 or 07000-EL-DR-2360. The overview's key-interlocking procedures were not identified among the sources inspected for this review. These gaps do not prove a disconnected boundary, absence of an interlock or any operating permission. Their detailed content remains **Unconfirmed**. It is not necessary to expand outgoing LV control circuits merely because other missing referenced documents concern those circuits.

This source review establishes visible main-power routes and endpoint candidates for the SW421 area. It does **not** complete GitHub #16: runtime modelling, rendering, regression checks, integrated coverage reconciliation and owner acceptance remain separate work. No runtime files or global coverage counters were changed.
