# SW451 / Train loading source review

Reviewed: 22 October 2026. Preparation for GitHub #19 / T18. **Source review only. No installed arrangement, runtime model or starting configuration has been accepted.**

The PDF skill was used for read-only inspection. Ten distinct supplied pages were rendered and visually inspected in full. Eight enlarged crops were inspected for source references, neutral/MEN details, bus ratings, the MC451B bridge, an overview tag difference and revision blocks. Text search located candidates; topology was checked visually. Every listed PDF contains one page. The first table is exclusively the reviewed source register, with the exact filename in its second column.

## Reviewed sources

Grid references describe the printed drawing grid; descriptive locations supplement grid boundaries. Revisions and issue statuses are transcribed from the supplied copies and do not establish precedence or installation status.

| Ref | Exact supplied filename | Printed revision; date; status | PDF page | Relevant region / inspection purpose |
| --- | --- | --- | --- | --- |
| TL-S01 | `11098-07110-EL-DR-2356.pdf` | 5; 28/01/25; AS FOUND 23.10.23 | 1 | SW451 HV SLD; incomer A-C / 1-2; bus C; feeders/spares C-G / 2-10 |
| TL-S02 | `11098-07110-EL-DR-2460.pdf` | 5; 17/08/09; ISSUED FOR AS-BUILT; stamp 17/08/2009 | 1 | SW452; TF452 A / 5-6; two incomers A-C / 1-10; two 690 V bars C-D |
| TL-S03 | `11098-07110-EL-DR-2658.pdf` | 12A; 17/02/26; ISSUED FOR REVIEW - CB25OP003A | 1 | MC451 sheet 1; TF451 A-C / 5-7; LV incomer/neutral C-D; phase bus D |
| TL-S04 | `11098-07110-EL-DR-2672.pdf` | 7; 13/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | MC451 sheet 2; continued phase bar D; main rating text D / 2-4 |
| TL-S05 | `11098-07110-EL-DR-2673.pdf` | 6; 13/01/26; ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | MC451 sheet 3; phase continuation C; bridge into MC451B at B-C / 4-5; outgoing drives below |
| TL-S06 | `11098-07110-EL-DR-2468.pdf` | 5; 12/08/09; ISSUED FOR AS-BUILT; stamp 12/08/2009 | 1 | Cross-area classification: SW453 / TF453; main-power upstream SW435 A / 4-6, CT/control upstream SW451 A / 1 |
| TL-S07 | `11098-07110-EL-DR-2469.pdf` | 6; 18/11/25; ISSUED FOR CONSTRUCTION | 1 | SW453 continuation sheet 2; two 690 V bars C; cross-area classification, outgoing LV loads below |
| TL-S08 | `11098-07110-EL-DR-2361.pdf` | 8; 19/07/23; AS BUILT - CB220P055A; AS BUILT stamp 12/07/2023 | 1 | HV protection communications network; SW451 communications panel C-D / 7-10; not a main-power SLD |
| TL-S09 | `CB-10016-DR-EL-0010.pdf` | 0; 27.10.25; ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMENDED); AS BUILT stamp 27/10/2025 | 1 | Overview; SW451 panel E-G / 5-8; SW411 feeder B / 2; SW435/TF453 panel A-C / 7-12 |
| TL-S10 | `11098-07110-EL-DR-5151.pdf` | 7; 28/01/25; AS FOUND 23.10.23 | 1 | SW411 main switchroom; SW451 feeder tier 2, D-G / 2-3 |

TL-S09 and TL-S10 are re-reviews of initial sources S1 and S3. This task does not increment or claim a project-wide unique review count. The companion `train-loading-evidence.json` records exact source paths and SHA-256 values, all checked against the existing inventory. TL-S06/TL-S07 are reviewed cross-area sources; their “train loading” body text is not a reason to move their power connection into SW451.

## Main-power paths explicitly drawn

The following records describe the drawing. Arrow notation gives reading order; it does not establish energisation permission, allowed reverse transfer or accepted device positions.

| Record | Drawn route / equipment | Source and region |
| --- | --- | --- |
| TL-T01 | SW411 tier 2 has `CB SW451 FD 01`, outgoing power cable `SW451-P-01` to SS451 / SW451, and outgoing cable-side earth switch `ES SW451 FD 01`. | TL-S10, p1, D-G / 2-3; TL-S09, p1, main-switchroom tier 2 and route into SW451 |
| TL-T02 | At SW451, `SW451-P-01` enters `CB SW451 IN 01` and reaches the single drawn 22 kV main bar. `ES SW451 IN 01` branches from the incoming cable side of the breaker. The off-page source reference is SW411 / 07110-EL-DR-5151. | TL-S01, p1, A-C / 1-2 |
| TL-T03 | A separate direct bus-earth branch is tagged `ES SW451`, in tier 3. It is separate from the incomer and transformer cable-side earth branches. | TL-S01, p1, C-E / 3-4 |
| TL-T04 | SW451 bar -> `CB TF451 FD` -> `TF451-P-01` -> TF451. `ES TF451 FD` branches from the transformer cable side of that breaker. The lower reference names TF451 22 kV/400 V and MC451, with drawings 2658 and 2659. | TL-S01, p1, tier 4 C-G / 4-5 |
| TL-T05 | TF451 is labelled 22 kV/400 V, 2.0 MVA. Its LV phase route passes through `CB MC451 IN`, rated 3000 A, to the MC451 phase bar, labelled 400 V / 3000 A on this sheet. | TL-S03, p1, transformer A-C / 5-7; incomer C-D / 5; bar D |
| TL-T06 | The MC451 phase bar continues from 2658 to 2672 and then 2673. On 2672 it is labelled 400 V / 500 A. On 2673 a drawn bridge takes the phase-bar continuation from the MC451 enclosure into an enclosure labelled MC451B, without a switching symbol on that bridge. | TL-S03, p1, right continuation D-E / 10; TL-S04, p1, main bar D and left/right arrows; TL-S05, p1, C / 1-10 and bridge B-C / 4-5 |
| TL-T07 | SW451 bar -> `CB TF452 FD` -> `TF452-P-01` -> TF452. `ES TF452 FD` branches from the transformer cable side. The reference names TF452 22 kV/690 V/690 V, SW452 and drawing 2460. | TL-S01, p1, tier 5 C-G / 5-6 |
| TL-T08 | TF452 is a three-winding symbol labelled 22 kV/690 V/690 V, 5 MVA. Its primary power reference names SW451 / 2356. Left and right secondary cable groups `SW452-P-01-1...-5` and `SW452-P-02-1...-5` go through `CB SW452 IN D` and `CB SW452 IN Y` to separate delta and Y 690 V phase bars. No bus tie between those bars is drawn on this supplied sheet. | TL-S02, p1, transformer A / 5-6; power routes and incomers A-C / 1-10; bars C-D |
| TL-T09 | SW451 tiers 2, 6 and 7 are marked spare. Each shows `CB SPARE FD` and `ES SPARE FD` with outgoing arrows not attached to a named downstream power asset on this sheet. | TL-S01, p1, tier 2 C-G / 2-3 and tiers 6-7 C-G / 7-10; TL-S09, p1, SW451 panel |

**Inference for the LV boundary:** use the MC451 400 V phase-bar arrangement and the two separate SW452 690 V phase bars as final LV endpoints. Preserve the explicitly drawn MC451/MC451B section relationship for owner review; it must not be silently converted into an independent source or a new HV transformer branch. Whether MC451B needs a separately named endpoint section within the agreed bus-only presentation remains **Unconfirmed**. Do not expand the outgoing drive, motor, brake, heater, UPS or lighting circuits below these bars.

### CT and control references are not additional power sources

On TL-S02, p1, A / 1, the left arrows say `FROM HV SWITCHBOARD SW441 07110-EL-DR-2355`, but they are the routes labelled `SW452-C-01` / `SW452-C-02`, “PHASE CT'S” and “CB SW452 IN Δ CONT”. The actual TF452 primary power cable `TF452-P-01` is drawn separately and referenced to SW451 / 2356. **The source does not confirm an alternative SW441 main-power feed.** Preserve the control-reference difference as a review item without creating a power connection from a text label.

TL-S01's other MC451 and SW452 C-labelled control/CT routes likewise must not duplicate the P-labelled main-power routes. TL-S08 is explicitly an HV protection communications network: Ethernet, fibre and relay communications lines do not supply the main electrical graph.

## Source classification across the train-loading label

TL-S06/TL-S07 have body text “TRAIN LOADING VARIABLE SPEED DRIVE SWITCHBOARD” but identify the board as **SW453**, with title “SW453 - STOCKPILING APRON FEEDERS”. TL-S06's actual transformer is TF453, whose primary power cable `TF453-P-01` is referenced to **SW435 / 07110-EL-DR-2354**. Its left CT/control references instead name SW451 / 2356; its right CT/control references name SW435 / 2354. TL-S09's upper-right SW435 panel also shows TF453 -> SW453.

**Inference for integrated model ownership:** retain TF453/SW453 with its evidenced SW435 main-power interface and link the source review into the crushing-area work. Do not duplicate SW453 below SW451 merely because the body text or one control reference says train loading. The conflicting area/control labels remain **Unconfirmed** aliases/reference errors until owner review. TL-S07 continues the same two SW453 bars; its downstream fire-pump, ventilation and apron-feeder circuits are outgoing LV circuits, not an additional SW451 supply.

## Earth and interlock boundaries

- **MC451 neutral/MEN is not a phase-bus earth.** TL-S03, p1, C-D / 6-8 draws TF451's neutral conductors to a neutral bar, MEN link and earth bar separately from the phase route through `CB MC451 IN`. The reference is 07110-EL-DR-1170. The source does not confirm a permanent phase-bus-to-earth connection. Do not attach the phase bus to earth merely because the neutral/MEN link is present.
- **TF452 screen earth is not a winding transfer rule.** TL-S02, p1, A / 5-6 depicts a screen-earth symbol. The source does not confirm that the phase buses are connected to earth through the screen, nor universal transfer between the two LV windings or reverse energisation. Source-transfer and earth relationships need separate explicit evidence or owner confirmation.
- **In-scope physical interlocks remain Unconfirmed.** The inspected HV and LV incomer SLDs do not explicitly provide complete key identities, operating sequence, withdrawal-position restrictions, D/Y incomer conditions or confirmation of no physical restrictions. Drawout/contact/protection symbols cannot supply missing conditions. Affected switching controls must remain disabled pending resolved interlock review, consistent with the agreed product behaviour.
- **Outgoing relay/control notes do not establish upstream switching rules.** TL-S02 note 1 locates the CV112 statutory safety relay in the master VSD. TL-S03 note 1 says the motor-starter configuration and control system are to be confirmed. TL-S04's construction notes and TL-S05's brake/starter notes concern outgoing LV loads. These notes must not be generalised into an SW451 or SW452 incomer interlock or a reason to expand outgoing circuits.
- **Starting configuration remains Unconfirmed.** No inspected page records the owner's agreed starting states or source availability. Drawn positions, AS FOUND descriptions, older AS BUILT stamps and construction/review issue dates are source metadata, not an accepted simulation baseline. SW451 must connect to the integrated SW411 source model, not an invented local source.

## Discrepancies and review questions

| Local ID | Question / source difference | Affected elements and consequence |
| --- | --- | --- |
| TL-R01 | Which revisions govern the installed arrangement? TL-S01/TL-S10 are AS FOUND 23.10.23; TL-S02 is an older as-built; TL-S03 is revision 12A for review, 17/02/26; TL-S04/TL-S05 are construction issues, 13/01/26. | Preserve statuses and avoid silently preferring a drawing or treating planned changes as installed. |
| TL-R02 | TL-S01 tags the train-loading bus earth `ES SW451`; TL-S09's SW451 panel, tier 3, labels it `ES SW454`. Confirm the canonical tag. | SW451 bus earth. Preserve both labels and their source locations; do not create another stockpile bus-earth connection from the overview text. |
| TL-R03 | Confirm the SW441 / 2355 control/CT reference on TL-S02 against the SW451 / 2356 primary power reference. | SW452 control/protection provenance. No alternate SW441 power edge is established. |
| TL-R04 | Confirm MC451's 3000 A vs 500 A bar labels, the MC451B section identity, and the 2659 reference on TL-S01 vs actual continuation 2672/2673. | MC451 bus-section and document identities. Retain the visible continuity; do not infer a switching point, extra source or unrelated disconnected bar. |
| TL-R05 | Confirm physical interlock review, supported positions and conditions for the SW451 incomer/bus earth/transformer and spare devices, plus the MC451 and SW452 LV incomers. | Keep unresolved controls disabled. An empty executable rule set does not establish absence of interlocks. |
| TL-R06 | Confirm TF451 and TF452 source-transfer/backfeed and independent earth relationships. | Model winding relationships explicitly; a symbol/rating does not establish every possible path. |
| TL-R07 | Confirm all starting device positions and upstream SW411 availability affecting SW451. | Baseline remains nullable/unconfirmed and owner acceptance remains outstanding. |
| TL-R08 | Confirm SW453 area/control aliases and reconcile cross-area ownership with the SW435 power interface. | TL-S06/TL-S07 are not additional SW451-fed boards; link existing crushing-area records rather than duplicate equipment. |

Local question IDs are preparation records. Integration should merge/link existing matching discrepancy questions while retaining every source reference and avoiding duplicate owner decisions.

### Stable identities and spare equipment

- TL-S01 repeats the spare CB/ES display tags in three tiers. **Inference:** canonical identities should include SW451 and tier (2, 6 or 7); the repeated tag alone cannot distinguish these assets. No downstream active asset or source is established by a spare arrow.
- TL-S10 and TL-S09 show FD01 / FD 01 and IN / IN01 whitespace/tag variants. **Inference:** retain them as candidate aliases of the matching drawn routes, subject to owner confirmation. Do not replace the evidence's original wording.
- The nearby relay number `51` is joined to `ES TF451 FD` by some extracted text. The visually inspected HV tag is `ES TF451 FD`; no FD51 identity is established.

## Referenced documents and unresolved coverage

Filename search did not find 07110-EL-DR-2659, 07110-EL-DR-1170, 07110-EL-DR-2370, 07110-EL-DR-2360 or 07000-EL-DR-2360 among the supplied PDFs. The actual supplied MC451 sheets 2658/2672/2673 explicitly show their continuation sequence; the absent 2659 reference still needs reconciliation. Its absence does not justify dropping the supplied continuations or inventing a missing disconnected endpoint.

The referenced SW441/2355 and SW435/2354 filenames are supplied, but their full pages were not reviewed in this task; their contents are outside this task's source-register claims. The corresponding main-power references were read directly on TL-S02/TL-S06. Cross-area review should confirm those references with the relevant source-review records.

No key-interlocking procedure was identified among this task's inspected sources. TL-S09, p1, notes 1-2 at lower left explicitly identify the overview as a high-level reference and direct isolation work to relevant SLDs, HV switching programs and key-interlocking procedures. Those notes do not confirm a particular permitted switching transition. Missing material does not establish permission or absence of an interlock.

## Completion boundary

This review supplies source evidence and open questions for train-loading preparation. It does not complete GitHub #19: runtime area data, rendered views, integrated coverage reconciliation, regression checks and owner model acceptance remain separate work. No runtime files, shared discrepancy queue, GitHub issues or commits were changed.
