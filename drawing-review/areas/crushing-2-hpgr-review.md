# Crushing No. 2 / SW435 / HPGR source review

**Further owner answers13/15, 22 October 2026:** the TF436 spare cubicle has a breaker and earth switch, with no outgoing cables or downstream feed. MC001 and MC438 are names for the same TF004-fed HPGR LV board; one endpoint is retained. Actual positions, full interlocks and the other voltage/bay/reference questions remain open. See the [exact identity/hardware decisions](../supplemental/owner-identities-review.md).

**Additional source received:** indexed full-page captures of `CB112-02006-DR-EL-0008`, printed revision4, Sheet1, were visually reviewed. The original intake still does not contain that exact PDF. Its transformer control/alarm/trip terminations do not establish complete installed key/interlock conditions. See [provenance and limits](../supplemental/hpgr-control-review.md). The original comparisons below are retained as source-review history.

**Later owner decisions, 22 October 2026:** C2-R01: “TF436 is a spare cubicle. Nothing installed”, in response to the installed downstream TF436/MC436 versus spare question. No downstream TF436/MC436 endpoint is required; exact cubicle hardware/state/interlocks remain unconfirmed. C2-R02: “Yes, installed and connected”, in response to whether TF453/SW453 is installed and connected to SW435 tier8. Installed/connected status is confirmed; baseline and interlocks remain separate. Original FUTURE/SPARE source descriptions below remain historical evidence. See the [exact decision record](../supplemental/owner-scope-connections-review.md).

Reviewed: 22 October 2026. Preparation for GitHub #15. **Source preparation only. No runtime model, installed configuration, baseline or interlock review has been accepted.**

Full pages and detailed crops were visually inspected after rendering the PDFs. Text searches identified candidate documents; power connectivity below was checked visually. All listed PDFs contain one page. Source IDs below always refer to page 1; printed grid regions and equipment headings identify the relevant location.

## Inspected source register

| Ref | Exact supplied filename | Printed revision / date / issue entry | Relevant region |
| --- | --- | --- | --- |
| C2-S01 | `11098-07110-EL-DR-2354.pdf` | 9 / 28/01/25 / AS FOUND 23.10.23 | Complete SW435 HV SLD, rows A-G, columns 1-11 |
| C2-S02 | `11098-07110-EL-DR-5151.pdf` | 7 / 28/01/25 / AS FOUND 23.10.23 | SW411-to-SW435 feeder tier 4, rows D-G / 3-4 |
| C2-S03 | `11098-07110-EL-DR-2353.pdf` | 5 / 28/01/25 / AS FOUND 23.10.23 | Opposite end of SW431/SW435 link, rows C-G / 2-3 |
| C2-S04 | `11098-07110-EL-DR-2660.pdf` | 7 / 18/07/25 / issued for construction, CB25OP003A | MC435 sheet 1: TF435 and incoming breaker at A-D / 4-6; phase bar row D |
| C2-S05 | `11098-07110-EL-DR-2682.pdf` | 3 / 18/07/25 / issued for construction, CB25OP003A | MC435 sheet 2: continuation from 2660 in rows C-D / 4-9 |
| C2-S06 | `11098-07110-EL-DR-2456.pdf` | 5 / 17/08/09 / issued for as-built | SW433 transformer/incomers and dual bars, rows A-C / 1-10 |
| C2-S07 | `11098-07110-EL-DR-2468.pdf` | 5 / 12/08/09 / issued for as-built | SW453 sheet 1: transformer/incomers and dual bars, A-C / 1-10 |
| C2-S08 | `11098-07110-EL-DR-2469.pdf` | 6 / 18/11/25 / issued for construction | SW453 sheet 2: same bars continue from 2468 in row C |
| C2-S09 | `CB112-02006-DR-EL-0005.pdf` | 7 / 28.01.25 / AS FOUND 23.10.23 | Complete HPGR HV supply SLD: JB001/TF001 left; SW002 top; TF003/004/002 and drives/MCC below |
| C2-S10 | `CB-10016-DR-EL-0010.pdf` | 0 / 27/10/25 / issued for use, site verification and comments amended | OPF overview sheet 1: SW435 at upper right; SW002/HPGR at middle right |
| C2-S11 | `11098-07110-EL-DR-2350.pdf` | 16 / 31/05/16 / as-built | Earlier mine overview: SW435 and downstream branches in C-F / 1-5; raster source |

Revision dates and issue status are transcribed source information, not a precedence decision. C2-S10, page 1, notes 1-2 at lower left expressly identify it as a high-level reference overview and direct the reader to relevant SLDs, HV switching programs and key interlocking procedures. No particular device's interlock rule follows from those notes.

## SW435 HV topology and cross-area interfaces

These records describe drawn connections. They do not establish current equipment positions or enabled supply sources. Arrows follow the drawing for readability; they do not confirm reverse energisation behaviour.

| Record | Drawn power route and earth branch | Evidence |
| --- | --- | --- |
| C2-T01 | SW411 bus A feeder `CB SW435 FD 01`, with cable-side `ES SW435 FD 01`, connects by `SW435-P-01` to SW435. The SW435 end is `CB SW435 IN 01`; `ES SW435 IN 01` is on its incoming cable side. The local breaker then joins the SW435 single 22 kV phase bar. | C2-S02, p1, tier 4, D-G / 3-4; C2-S01, p1, incomer tier 1, A-C / 1-2. C2-S10, p1, SW411 tier 4 and SW435 tier 1. |
| C2-T02 | SW435 bar to `CB SW431 FD 02`, cable-side `ES SW431 FD 02`, and power cable `SW431-P-02` toward SW431. At SW431 the opposite end uses `CB SW435 FD 02` and `ES SW435 FD 02`. | C2-S01, p1, tier 2, C-G / 2-3; C2-S03, p1, SW435 feeder C-G / 2-3. C2-S10, p1, SW435 tier 2. |
| C2-T03 | A separate direct bus-earth branch is labelled `ES SW435`. It is distinct from the incomer and feeder cable-side earth switches. | C2-S01, p1, bus-earth tier 4, C-E / 5; C2-S10, p1, SW435 tier 4. |
| C2-T04 | SW435 bar to `CB TF435 FD`, cable-side `ES TF435 FD`, and `TF435-P-01` to transformer TF435. | C2-S01, p1, tier 3, C-G / 3-4; C2-S04, p1, TF435 incoming power reference A-B / 4-6. |
| C2-T05 | Tier 5 identifies `CB TF436 FD` and `ES TF436 FD`; the outgoing power continuation is dashed and the destination says FUTURE, TF436 22 kV/400 V, MC436 - Crushing No.2. | C2-S01, p1, C-G / 6. C2-S10 calls this tier a spare feeder instead; retain C2-R01 below. |
| C2-T06 | SW435 bar to `CB TF433 FD`, cable-side `ES TF433 FD`, and `TF433-P-01` to TF433. | C2-S01, p1, tier 6, C-G / 7; C2-S06, p1, transformer power reference A-B / 5-6. |
| C2-T07 | SW435 bar to `CB HPGR FD` with cable-side `ES HPGR FD`, and power cable `SW438-P-01` toward the HPGR 22 kV junction cabinet. | C2-S01, p1, tier 7, C-G / 8-9; C2-S09, p1, A-C / 2-4. The reference-number discrepancy is retained below. |
| C2-T08 | SW435 bar to `CB TF453 FD`, cable-side `ES TF453 FD`, and `TF453-P-01` toward TF453 / SW453. The destination on this HV sheet is marked SW453 (FUTURE). | C2-S01, p1, tier 8, C-G / 10-11; C2-S07, p1, transformer power reference A-B / 5-6 shows the downstream arrangement. |

**Inference for construction:** C2-T02 and the SW431 review's C1-T04/T05 describe opposite physical ends of the same `SW431-P-02` cross-area circuit. Keep both end breakers and both end earth switches. Do not merge them because their names describe the opposite destination, or introduce a second duplicate cross-link.

The VT 22 kV/110 V branch, CT wiring, DC supplies, communications and relay contacts on C2-S01 are not additional HV distribution routes. In particular, control contact `Q63` beside the SW435 incomer is not evidence of another independent HV feeder.

## SW435 transformer branches and LV bus boundaries

| Record | Explicit drawing information | Retained endpoint / gap | Evidence |
| --- | --- | --- | --- |
| C2-L01 | TF435 is drawn delta/star, 22 kV/400 V, 2.0 MVA. Its phase output goes through `CB MC435 IN` (3000 A) to the 400 V, 3000 A MC435 phase bar. | One MC435 final LV phase-bus section. | C2-S04, p1, TF435/incomer A-D / 4-6 and main bar row D. C2-S05 continues that same bar; no extra incoming power supply is shown there. |
| C2-L02 | TF436/MC436 is labelled future on C2-S01; C2-S11 also depicts future MC436. No exact MC436 endpoint SLD was identified by the current source search. | **Unconfirmed:** whether installed and the actual endpoint arrangement. Preserve a future/uncertain branch coverage record, not a confirmed open circuit or an invented LV incomer. | C2-S01, p1, tier 5 and G / 6; C2-S11, p1, SW435 transformer branch C-E / 2-3. |
| C2-L03 | TF433 is drawn with HV delta and two separate LV delta/star windings, labelled 22 kV/690 V/690 V, 5 MVA. `SW433-P-01-*` enters `CB SW433 IN D`; `SW433-P-02-*` enters `CB SW433 IN Y`; each breaker is 2500 A. | Two SW433 phase bars, delta-marked and star-marked, each 690 V / 2500 A. | C2-S06, p1, A-C / 1-10; C2-S01, p1, TF433 destination G / 7. |
| C2-L04 | TF453 has the corresponding delta / delta / star drawing, 22 kV/690 V/690 V, 5 MVA. `SW453-P-01-*` enters `CB SW453 IN D`; `SW453-P-02-*` enters `CB SW453 IN Y`; each breaker is 2500 A. | Two SW453 phase bars, delta-marked and star-marked, each 690 V / 2500 A. Installation/future status remains unresolved. | C2-S07, p1, A-C / 1-10; C2-S08, p1, row C continues those bars from 2468. |

C2-S04, p1, C-D / 5-7 draws the TF435 star-neutral connection to a separate neutral bar, MEN link and earth bar. **Inference for construction:** do not convert that neutral/MEN route into a phase-bus earth-switch path. Likewise, C2-S09 shows TF004's neutral MEN connection separately from its phase output.

**Unconfirmed:** reverse energisation and inter-winding relationships for TF433/TF453. Preserve their three winding terminals and separate LV bars. The drawn symbols do not establish a universal bidirectional all-windings connectivity rule.

The subordinate boards and outgoing circuits fed from MC435 are beyond its final LV phase bus. The overview names MC411, MC453 and MC434B below TF435; C2-S04 visibly shows outgoing LV feeds to those boards. They do not require additional HV supply branches for this area slice. The fire pump circuits on C2-S08 and other outgoing SW453 circuits are also beyond the selected bus endpoints.

## HPGR: intermediate HV equipment and drawn paths

| Record | Explicit path / equipment relationships | Source region |
| --- | --- | --- |
| C2-H01 | `SW438-P-01` from SW435 enters `JB001`, labelled ABB 22 kV HDC-A cable connection cabinet. `TF001-P-01` continues from JB001 to TF001. No separate power-switch contact is shown inside JB001. | C2-S09, p1, A-C / 2-3; C2-S10, p1, SW435 HPGR feeder and JB001 above TF001. |
| C2-H02 | TF001 is drawn delta/star, 22/6.6 kV, 4500 kVA. Its 6.6 kV output, labelled `SW002-P-02` twice with a note for 2 x 3-core cables, goes to the SW002 incomer branch and common 6.6 kV bar. | C2-S09, p1, B-C / 2-4 and A01 incomer A-C / 4. The duplicate cable text describes the shown cable grouping; it is not two independent sources. |
| C2-H03 | SW002 is labelled 6.6 kV ring main unit, ABB UniGear PE ZS1/ZVC. The incomer column `A01` has a branch earth switch `Q8`; no inline incomer breaker/isolator contact is drawn between TF001 and the common bar. | C2-S09, p1, A-C / 4, incomer column. C2-S10 depicts the same branch earth switch. |
| C2-H04 | SW002 TF003 feeder is column `A02`. Its main branch includes `F1` (225 A), switch contact `K101`, then a cable-side earth branch `Q8`, and `TF003-P-01` to TF003. A separately drawn 6.6 kV/240 VAC VT branch is auxiliary to this feeder. | C2-S09, p1, A-C / 6. |
| C2-H05 | SW002 TF002 feeder is column `A04`, with the corresponding `F1` (225 A), `K101`, cable-side `Q8`, and `TF002-P-01` to TF002. | C2-S09, p1, A-C / 9. |
| C2-H06 | The central feeder is labelled `A01 TE004 FEEDER` on C2-S09. It includes `K202`, `F101` (40 A), a cable-side `Q8`, and `TF004-P-01` to transformer TF004. C2-S10 instead labels its bay `A03`. | C2-S09, p1, A-C / 7-8. Preserve the duplicate A01 and TE004/TF004 differences in C2-R05. |
| C2-H07 | TF004 is drawn delta/star, 6.6 kV/440 V, 500 kVA, with an explicit MEN connection at its star neutral. Phase cable group `MC001-P-01-XX` enters an MCCB, described as Terasaki XS1250SE with O/C and E/F, then an MC001 bar labelled 415 VAC, 3-phase, 50 Hz, 1200 A. | C2-S09, p1, C-E / 7-8. The source names the endpoint MC001 415 V MCC and references CB112-02006-DR-EL-0001 & 0002. |
| C2-H08 | TF003 and TF002 each have an HV delta winding and lower star/delta winding symbols, labelled 6.6 kV/2305 V/2305 V, 1440 kVA, 720 kVA per winding. TF003 feeds two rectifier inputs of `VS-CR005MEB`; TF002 feeds two rectifier inputs of `VS-CR005MEA`; both VSDs are labelled ABB ACS-1000. | C2-S09, p1, C-E / 5-6 and 9. C2-S10 corroborates the two 2.305 kV winding labels and VSD destinations. |
| C2-H09 | Each VSD contains depicted AC/DC conversion, an inverter and a DC-bus earthing switch labelled with VSD internal Fortress key. The output continues through a motor-operated switched outlet isolator with earth-switch contact, then cable `CR005MEB-P-01` / `CR005MEA-P-01` to the respective motor, each labelled 4000 V, 1150 kW. The outlet drawing shows distinct VSD and earth contacts to a common motor-side pole. | C2-S09, p1, D-G / 5-6 and 9. |

**Unconfirmed:** the accepted simulation boundary and conductive relationships inside the two VSD branches. No final LV phase-bus endpoint is depicted on the 2305 V winding / 4000 V motor paths. Do not relabel these as LV endpoints or silently omit them. Retain the represented HV branches and a review question for their termination and converter/earthing behaviour. A converter symbol does not establish an ordinary undirected metallic path from AC input through DC earth to motor output.

**Inference for construction:** model converter input, DC section and output as distinct terminal groups. Preserve the outlet changeover contact relationships without inventing position names or operating sequences. Any provisional state/transfer model requires an explicit review item; the source does not confirm the complete permitted state set or backfeed behaviour.

The supported endpoint records in this review therefore identify six drawn final LV phase-bus sections: MC435 (one), SW433 (two), SW453 (two), and HPGR MC001 (one). Future MC436 remains a coverage gap. The two HPGR VSD/motor branches remain separately represented review scope, not additional LV bus sections.

## Interlock and protection evidence

- C2-S01, p1, the HV device columns, depicts breaker/earth-switch associations. Complete physical operating conditions, key exchanges, racking states and accepted positions are **Unconfirmed**. The source does not confirm this.
- C2-S09, p1, A-B / 4-9 shows dashed associations between feeder contacts and Q8 earth switches, and an incomer-Q8 lock association running off page toward SW435. D-E / 5-6 and 9 explicitly labels internal Fortress keys beside DC-bus earthing switches. **Unconfirmed:** complete conditions and the mapping of keys and device positions. Do not translate the symbols alone into a complete generic interlock rule.
- C2-S09, p1, note 1 at lower right states that the SEL751 protection relay supplies an input to the PLC, which shuts down the VSD in a controlled sequence. It does not establish the sequence steps or the physical interlock conditions for switching controls.
- C2-S09, p1, note 2 describes cable joints below the RMU platform. This is cable routing/joint information, not an extra independent supply or a switch.
- C2-S09's TF001 protection/control junction box `JB002` references `CB112-02006-DR-EL-0008`, with an intertrip toward SW435 through the HPGR communications cubicle. That exact referenced file is absent from the supplied inventory. No trip/physical-interlock sequence is inferred.
- C2-S07/S08, p1, note 1 concerns statutory safety relays in outgoing master VSDs. Those outgoing LV circuits are beyond the bus endpoint. It does not confirm the SW435 HV interlocks.
- All starting device states, source availability, installed future equipment and real-model acceptance remain **Unconfirmed**. Drawn open-style symbols and an AS FOUND revision entry do not provide an owner-accepted baseline by themselves.

## Unresolved items for owner review

| Local ID | Exact evidence difference / gap | Pending construction decision |
| --- | --- | --- |
| C2-R01 | C2-S01 tier 5 names TF436/MC436 and marks the continuation FUTURE. C2-S10's SW435 tier 5 is labelled SPARE FD. C2-S11 also depicts future MC436. No MC436-specific endpoint SLD was located in the supplied inventory/text search. | **Unconfirmed:** installed equipment and final endpoint. Preserve uncertainty rather than choose a disconnected branch or delete it as a spare. |
| C2-R02 | C2-S01 labels SW453 (FUTURE), while C2-S07 is an as-built SW453 endpoint SLD and C2-S08 contains an 18/11/25 construction revision for outgoing circuits. C2-S10 depicts TF453/SW453 without a future label. | **Unconfirmed:** present installation/commissioning status and accepted baseline. Later issue dates alone do not resolve the contradiction. |
| C2-R03 | TF435 is 22 kV/400 V on C2-S01/S04, while C2-S10/S11 label 22 kV/415 V. C2-S11 labels TF433/TF453 720 V secondary windings, while C2-S01/S06/S07/S10 use 690 V. | **Unconfirmed:** agreed rating/display labels; do not infer an electrical explanation or drawing precedence. |
| C2-R04 | C2-S01 HPGR off-page reference reads `CB112-02066-DR-EL-00005`. The supplied relevant source is `CB112-02006-DR-EL-0005.pdf`. C2-S10 references that supplied identifier. | **Unconfirmed:** intended reference correction. Preserve the exact mismatching source text. |
| C2-R05 | C2-S09 labels the TF004 feeder `A01 TE004 FEEDER`, duplicating incomer A01; its transformer/cable is TF004, and C2-S10 labels this bay A03. | **Unconfirmed:** canonical bay identity and TE004 text. Use provisional local IDs that retain both source aliases; do not silently correct the drawing. |
| C2-R06 | C2-S09 names the HPGR endpoint `MC001` and shows TF004 440 V / MC001 415 V. C2-S10 names its endpoint `MC438` and TF004 6.6/0.44 kV. The exact referenced MCC drawings `CB112-02006-DR-EL-0001.pdf` and `...0002.pdf` are absent from the supplied inventory. | **Unconfirmed:** MC001/MC438 identity reconciliation and agreed endpoint voltage label. C2-S09 already supplies a drawn incoming MCCB and bus; record the missing detailed sources without inventing outgoing circuitry. |
| C2-R07 | C2-S06 body heading says Crushing No.1 variable speed drive switchboard 2; its title block says SW433 - Crushing No.2. Its power feed names SW435/2354. | **Unconfirmed:** area/display alias correction. Preserve the SW433 tag and source-specific names. |
| C2-R08 | C2-S07's power source/transformer reference is SW435/2354, but the left incoming CT/control reference says SW451/2356; the right control reference says SW435/2354. The body calls it train loading; its title calls it stock piling apron feeders. | **Unconfirmed:** control reference and location/display aliases. Do not add an SW451 power supply from a CT/control annotation. |
| C2-R09 | C2-S09 depicts internal DC earthing, Fortress keys and switched outlet earth contacts but gives no complete converter conductivity/backfeed state table or key sequence. | **Unconfirmed:** converter transfer relationships, device state sets and interlock conditions. Separate AC/DC/output terminals and flag the affected controls pending confirmation. |
| C2-R10 | TF003/TF002 VSD branches end in motors labelled 4000 V rather than final LV phase bars. | **Unconfirmed:** agreed representation of these terminal HV load branches within the project boundary. Keep them visible in coverage until the owner decides; do not omit them while claiming complete HPGR coverage. |
| C2-R11 | None of these sheets supplies an owner-accepted whole-network starting configuration or complete reviewed physical-interlock records. | All affected baseline/interlock decisions remain open; software tests or a drawn symbol do not resolve them. |

## Construction handoff

The following are **Inference / proposed construction choices**, not installed-network confirmations:

1. Keep the SW411 feeder circuit and SW431 cross-link distinct, using their exact power cable identities and both physical end devices. Preserve the single SW435 bar and its separate bus-earth switch.
2. Keep the TF436/spare and SW453 future contradictions visible through provisional connection/equipment metadata. Do not convert uncertainty into fixed source absence.
3. Keep LV delta/star buses independent for SW433/SW453. Model neutral/MEN links separately from phase earth switching.
4. Continue the HPGR path through JB001, TF001 and SW002, including all three represented feeder branches. Do not add an inline SW002 incomer breaker absent from the source.
5. Qualify repeated device labels by board and bay: K101, F1 and Q8 repeat. Retain the duplicate A01 issue rather than allowing it to merge TF004 and incomer controls.
6. Keep one HPGR MCC incoming-breaker/bus representation with MC001/MC438 identity unresolved. Its generic MCCB description is not a verified unique equipment tag; a code identifier would be a proposed model ID.
7. Record HPGR converter/earthing/interlock questions as material unresolved relationships. No generic AC-to-DC earth path or universal transformer backfeed rule is established.

No runtime data, central review queue or issue state was modified by this source preparation. Whole-network owner acceptance remains pending.
