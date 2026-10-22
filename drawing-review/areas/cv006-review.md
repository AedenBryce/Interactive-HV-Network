# CV006 / RM406 / RM410 and overhead-line source review

Reviewed: 22 October 2026. Preparation for GitHub #20 / T19. **Source preparation only. No installed arrangement, runtime model or starting configuration has been accepted.**

Using the PDF skill, ten distinct supplied pages were rendered and inspected visually in full, including all five supplied CV006 sheets, the 33 kV line sheet, both OPF overviews, the SW411 interface and the supplied Hopper 7/8 interface sheet. Eleven enlarged crops were inspected for line routes, tier-3 tags, cable references, neutral/MEN markings, hopper interfaces and revision blocks. Text extraction supported searches, not topology decisions on its own. Each listed PDF contains one page. The first table is exclusively the reviewed source register, with exact supplied filenames in column 2.

## Sources inspected

Printed grid locations are supplemented by descriptive regions. The source status/date is a transcription, not a precedence or installation decision.

| Ref | Exact supplied filename | Printed revision; date; status | PDF page | Relevant region / review purpose |
| --- | --- | --- | --- | --- |
| CV-S01 | `CB19OP001B-04057-DR-EL-0001.pdf` | 6; 28.01.25; AS FOUND 23.10.23 | 1 | Whole CV006 power distribution; 22 kV OHL A, RM410 B-C / 1-3, RM406 B-C / 9-11, RM419/RM418 centre |
| CV-S02 | `CB19OP001B-04057-DR-EL-0002.pdf` | 4; 28.01.25; AS FOUND 23.10.23 | 1 | Head RM406; incoming pole 57 A-B / 4-5; three feeder branches B-E / 6-11; historical note1 F / 11-12 |
| CV-S03 | `CB19OP001B-04057-DR-EL-0003.pdf` | 2; 17.12.20; AS BUILT | 1 | Head MC406A; TF406B A-B / 5-6; incomer/neutral C / 5-8; 415 V phase bus C-D |
| CV-S04 | `CB19OP001B-04057-DR-EL-0004.pdf` | 6; 28.01.25; AS FOUND 23.10.21; older AS BUILT stamp 11/01/2022 | 1 | Tail RM410; pole 49-40 incoming A-B / 4-5; transformer branches B-F / 6-9; RM419 continuation E / 10-12 |
| CV-S05 | `CB19OP001B-04057-DR-EL-0005.pdf` | 2A redline; underlying 2; 11.01.22 redline; underlying 27.08.21; UPDATED TIER NUMBER AND MCCB SIZE; AS BUILT changes-as-marked stamp | 1 | MC410B; source MC410A A / 5-7; incomer and 415 V phase bar C-D; red MEN-removal annotation C / 6-8; raster/markup |
| CV-S06 | `CB21OP055B-10016-DR-EL-0089.pdf` | 0; 10.06.22; ISSUED FOR CONSTRUCTION | 1 | 33 kV line; station TF04/AMR C-D / 1-7; pole 49-38-1 tie D-E / 7; IOP/Hopper10/Norfolk/Bigge routes E-G / 7-11 |
| CV-S07 | `CB-10016-DR-EL-0010.pdf` | 0; 27.10.25; ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMENDED); AS BUILT stamp 27/10/2025 | 1 | Overview sheet1; SW411 tier3 B / 3; OHL C / 2-7; RM406/RM410 C-E / 4-7; RM419/RM418 E-G / 9-12 |
| CV-S08 | `CB-10016-DR-EL-0011.pdf` | 0; 27.10.25; ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMENDED); AS BUILT stamp 27/10/2025 | 1 | Overview sheet2; Hopper10/RM420 C-D / 1-2 and explicit 33 kV line reference above it |
| CV-S09 | `11098-07110-EL-DR-5151.pdf` | 7; 28/01/25; AS FOUND 23.10.23 | 1 | SW411 tier3 OHL WEST, CB SPARE / ES SPARE and CV006 reference, D-G / 4-5 |
| CV-S10 | `CB17OP023C-01006-DR-EL-0001.pdf` | 6; 28/01/25; AS FOUND 23.10.23 | 1 | Hopper7/8 interface; RM418 incoming RM419-SW02 A / 6-7; RM406-CB03 supply to SS416-HV416 C-E / 9-10 |

CV-S06/S07/S08/S09 re-review initial sources S6/S1/S2/S3. They are not additional unique drawings for a project-wide count. The companion `cv006-evidence.json` contains exact paths and SHA-256 values; all were checked against the existing inventory. This task changes no global coverage counters. Source-table entries document inspection, not model acceptance.

## Drawn overhead supply and cross-area interfaces

Arrows give reading order, not permitted energisation direction or accepted availability. The 22 kV and 33 kV descriptions below remain separate source records until reconciled.

| Record | What is explicitly drawn | Source and region |
| --- | --- | --- |
| CV-T01 | SW411 tier 3 is headed `OHL WEST`, but the devices are labelled `CB SPARE` and `ES SPARE`. The earth branch is on the outgoing cable side. The main-power arrow below that bay explicitly names CV006 power distribution and drawing CB19OP001B-04057-DR-EL-0001. | CV-S09, p1, tier 3, D-G / 4-5 |
| CV-T02 | The OPF overview labels the tier-3 devices `CB OHL FD` and `ES OHL FD`, and draws an O/H LINE WEST route with pole references and a CV006 distribution reference. | CV-S07, p1, B-C / 2-7 |
| CV-T03 | CV006 distribution says `FED FROM SR411 TIER 03` / drawing 5151. Its top route is labelled `22kV POWERLINE TO TAIL OF CV006`, via pole 17, pole 49, ABS at pole 49-1, the 49-37-to-49-2 range, pole 49-38, pole 49-39, recloser at pole 49-39A and ABS at pole 49-40. | CV-S01, p1, top network A / 1-10 |
| CV-T04 | A branch from the pole-49 portion goes through the fused ABS at pole 57 and then to RM406's incoming SW01. A separate branch at pole 17-1 is labelled `DROP TOWER LV WORKSHOP`; no downstream transformer/bus detail for that branch is drawn here. | CV-S01, p1, A-B / 8-10 |
| CV-T05 | The pole-49-40 route supplies RM410. The detailed RM410 incoming reference explicitly says supply via pole 49-40, through cable `POLE-RM410-P1`, entering `RM410-SW01-A01`. | CV-S01, p1, A-B / 1-3; CV-S04, p1, A-B / 4-5 |
| CV-T06 | At pole 49-38 there is a branch through ABS at pole 49-38-1 to pole 201 and the pole-202-to-285 range, then the fused ABS at pole 286, an outgoing Hopper 10 reference and pole 287. That upper branch is labelled `22kV POWERLINE TO TAIL OF CV010`. | CV-S01, p1, A / 1-5 |
| CV-T07 | The separate 33 kV line sheet draws an 11 kV source reference at the power station, SR-002 panel F4 / 500CBC0002-13015-DR-EL-0001, then TF04 labelled 11/33 kV, 15/20 MVA, YNd11, and the AMR line. It includes recloser at pole 1, ABS at pole 2 and route through poles 3, 4, 8, 9, 36, 37, 49, 50 and 70. | CV-S06, p1, C-D / 1-7 |
| CV-T08 | The 33 kV sheet connects its AMR route to an `AMR/IOP TIE-IN POLE` labelled 49-38-1, then the IOP line via pole 201, ABS, pole 202, pole 214, pole 215, pole 227, pole 272, pole 284, pole 286 and end pole 287. Fused branch at pole 286 supplies RMU420 / Hopper 10, reference 520CBC0007-2130-DR-EL-0003. | CV-S06, p1, D-G / 7-11 |
| CV-T09 | The 33 kV sheet has future-feed labels at pole 4A and pole 214-2. It has off-page routes to Norfolk pole 227-2, Bigge SP1 pole 284B-1 and Bigge SP1/SP2 pole 284A-1, all referencing CB22OP050B-10018-DR-EL-0032. | CV-S06, p1, C / 4 and E-G / 7-10 |

### Reconciliation of tier 3, OHL and the 33 kV references

The above sources explicitly connect **the tier-3 power arrow** to the CV006 reference. The word SPARE is not evidence that this arrow is disconnected or that the bay should be omitted. Conversely, the OHL heading and CV006 arrow do not establish an enabled source or a current closed state.

**Unconfirmed:** canonical tier-3 device tags (`CB SPARE` / `ES SPARE` versus `CB OHL FD` / `ES OHL FD`), commissioning/availability, and which line revision describes the installed arrangement.

The shared pole identifiers 49-38-1 / 201 / 286 / 287 and the Hopper 10 reference establish an explicit comparison to resolve. They do **not** by themselves authorise joining the 22 kV SW411-fed route and the 33 kV TF04-fed route as two confirmed parallel supplies. No 22/33 kV conversion or approved connection arrangement at this common region is drawn in these pages. **The source does not confirm this.** Preserve a material unresolved interface and separate source evidence until owner review establishes the actual connection and version. Do not silently select one drawing, add a voltage-changing edge, or declare the disputed path unavailable.

The two OPF overviews have notes 1-2 at lower left explicitly describing high-level reference use and directing isolation work to relevant SLDs, HV switching programs and key-interlocking procedures. Their route simplifications cannot resolve the detailed source conflict.

## RM406 / head-end routes

| Record | What is drawn | Source and region |
| --- | --- | --- |
| CV-T10 | RM406 has a 22 kV main bar with incoming `RM406-SW01`, and three outgoing breaker/switch assemblies: CB01-A02 / SW02, CB02-A03 / SW03, CB03-A04 / SW04. Earth contact branches are shown with the corresponding switching assemblies. | CV-S01, p1, B-C / 9-11; CV-S02, p1, B-D / 3-11 |
| CV-T11 | The detailed incoming note says `SUPPLY VIA POLE 57 (NOTE 1)`, but the cable retains tag `RM418-RM406-P1`. Note 1 explicitly says `HOPPER 007 PREVIOUSLY CONNECTED TO RM418-SW01`. | CV-S02, p1, incoming A-B / 4-5; note 1 F / 11-12 |
| CV-T12 | RM406 CB01 / SW02 feeds power cable `TF406A-P1` to TF406A, labelled 22 kV/720 V/720 V, 5.0 MVA. Its two LV routes go to the VSD identified VS4061 / CV006-VS4061. | CV-S01, p1, C-F / 9-10; CV-S02, p1, CB01 branch C-E / 6-7 and VSD below |
| CV-T13 | RM406 CB02 / SW03 feeds `TF406B-P1` to TF406B, labelled 500 kVA and 22 kV/0.433 kV on the detailed RMU sheet, and 22 kV/433 V on the distribution overview. Its LV route supplies MC406A. | CV-S01, p1, C-E / 10-11; CV-S02, p1, CB02 branch C-F / 8-9 |
| CV-T14 | The MC406A LV sheet instead labels TF406B 22 kV/415 V, 500 kVA, and says `FROM 22kV RING MAIN UNIT RM406-SW02`. Its phase route passes an incomer labelled `MC406A CB TBC A. NOTE 1` to a bar labelled 415 V / TBC A. Note 1 says CB ratings are to be confirmed by the switchgear supplier; note 2 says design is pending vendor information. | CV-S03, p1, A-D / 5-9 and notes A-B / 11-12 |
| CV-T15 | RM406 CB03 / SW04 supplies Hopper 8. The Hopper 7/8 sheet explicitly identifies the receiving supply as `SUPPLY FROM RM406 (RM406-CB03)` to `SS416-HV416`, then the drawn TF416 / TF416A branches. | CV-S01, p1, C-D / 11; CV-S02, p1, CB03 outgoing branch; CV-S10, p1, C-E / 9-10 |

**Unconfirmed:** whether the retained cable name and “previously connected” note should become historical aliases only, and whether the LV sheet's SW02 reference or the RMU sheets' CB02/SW03 route governs TF406B. The current source records must remain distinguishable; an old cable tag must not create a second live RM418 feed to RM406.

## RM410 / tail-end routes

| Record | What is drawn | Source and region |
| --- | --- | --- |
| CV-T16 | RM410 has a 22 kV main bar with incoming SW01-A01, and outgoing CB01-A02 / SW02, CB02-A03 / SW03, and CB03-A04 / SW04 assemblies with earth contacts shown. | CV-S01, p1, B-C / 1-3; CV-S04, p1, B-D / 3-11 |
| CV-T17 | CB01 / SW02 feeds `TF410A-P1` to TF410A, labelled 22 kV/720 V/720 V, 5.0 MVA. The detailed sheet describes it as `12 PULSE/NO REGEN (AFE)` and routes both LV secondaries to VS4101. | CV-S01, p1, C-F / 1-2; CV-S04, p1, C-F / 6-7 |
| CV-T18 | CB02 / SW03 feeds `TF410B-P1` to TF410B, labelled 500 kVA. Its LV route reaches MC410A, then MC410B. The distribution sheet labels 22 kV/433 V; the detailed sheet's printed label is `22/0.433kV`. | CV-S01, p1, C-G / 2-5; CV-S04, p1, C-G / 8-9 |
| CV-T19 | Supplied MC410B sheet says `FROM MC410A`, reference 520CBC0003-2140-DR-EL-0079. The phase cables enter MC410B's 630 A incomer (tier 00F-16) to its bar labelled 415 V, 1000 A. A note refers to dialling down protection for the new 250 A feeder from MC410A. | CV-S05, p1, A-D / 5-10 |
| CV-T20 | RM410 CB03 / SW04 supplies RM419-SW01. RM419's other incoming/through assembly SW02 supplies RM418-SW01. The supplied Hopper 7/8 sheet confirms the RM418 incoming source as SR419-RM419 / RM419-SW02. | CV-S01, p1, RM410 and RM419/RM418 paths B-E; CV-S04, p1, C-E / 10-12; CV-S10, p1, A-B / 6-7 |

CV-T15 and CV-T20 are cross-area connections to link into the hopper-area model. They are not new duplicates of RM419, RM418 or SS416 equipment already represented there. Preserve both interface sources and the distinction between Hopper 7 / RM418 and Hopper 8 / SS416-HV416.

## Final LV boundary and missing endpoint detail

- MC406A has an explicitly drawn final LV phase bar and incomer in CV-S03. Its 415 V label, TBC rating and upstream SW02 reference must stay visible alongside the conflicting RMU information.
- MC410A is the first LV MCC drawn below TF410B in CV-S01/CV-S04, but the referenced detailed 520CBC0003 sheets were not supplied. **Unconfirmed:** detailed MC410A incomer identity, bus arrangement and the exact final bus presentation.
- MC410B is explicitly downstream of MC410A, with a supplied 415 V bar/incomer drawing. **Unconfirmed:** whether the bus-only product should retain MC410B as a separately named LV endpoint or stop at MC410A's main bar. Do not treat MC410B as a separate HV transformer feed. Its outgoing winch, air-conditioner, charger and distribution circuits remain outside scope.
- TF406A and TF410A have two LV secondary routes into VSDs. CV-S01 draws separate 2500 A input switches and rectifiers meeting at a DC bus, then inverters/motors. It does not draw a named common AC phase bus between the two transformer secondaries. **Inference for provisional bus-only presentation:** two separate LV AC supply boundaries ahead of the converter inputs may be suitable, but their endpoint identity and accepted scope require owner confirmation. Do not join the two AC windings through the DC bus using a generic conductive pair, or expand the drive outputs as ordinary LV circuits without an explicit decision.
- The cross-area Hopper 8 route remains HV below RM406 and must not be cut off as an LV endpoint. The supplied Hopper 7/8 source shows further HV transformation; the hopper-area work owns that continuation.

## Earth, protection and physical interlocks

1. CV-S03, p1, C / 6-8 separately draws the TF406B neutral path, neutral bar, MEN link and earth bar. It does not draw the phase bus as a permanent earth connection.
2. CV-S05's red annotation explicitly says `MEN LINK REMOVED LOCATED IN MC410A` and refers to CB19OP001B-04057-DR-EL-0159. The older black local MEN symbol remains visible underneath. Preserve the redline evidence; do not model a confirmed local MC410B neutral link by reading only the black symbol. Neither rendition confirms a phase-bus-to-earth connection.
3. Transformer screen, neutral grounding and surge-arrestor symbols do not confirm permanent hard earth paths from phase conductors. CV-S06's arrestors and TF04 grounding details must not be reduced to simple always-closed phase-earth edges merely because an earth symbol is drawn.
4. RMU diagrams show motor operators, earth contacts, CB/contact symbols, control/status and trip wiring. **Unconfirmed:** complete supported physical positions, key identities, interlock prerequisites and permitted transition sequence. The inspected pages do not explicitly confirm an absence of physical restrictions. Keep affected controls disabled until the interlock review is resolved.
5. Recloser, air-break and fused-air-break devices are explicitly represented on the OHL pages. Their drawn positions are not accepted starting states, and no complete physical interlock review/operating sequence is supplied here. “Future feed” is not an enabled source.
6. The source-transfer and earth channels through every transformer or converter need separate explicit definitions. In particular, the `12 PULSE/NO REGEN (AFE)` label must be retained as source wording; this review does not derive an executable reverse-transfer rule from it.
7. The pages do not establish the agreed baseline, source commissioning status or normal positions. Starting device states and source availability remain **Unconfirmed** until owner acceptance; neither the SW411 route nor the TF04 station route may be silently enabled to make the diagram appear supplied.

## Review questions

| Local ID | Question / discrepancy | Affected model data and consequence |
| --- | --- | --- |
| CV-R01 | Reconcile 22 kV SW411-fed CV006 distribution with the 33 kV TF04-fed AMR/IOP drawing at shared pole references and Hopper 10. | Source topology, pole identity and cross-area interface remain material uncertainty; do not merge both as confirmed parallel supplies. |
| CV-R02 | Confirm canonical SW411 tier-3 device tags and status: OHL WEST with CB/ES SPARE versus overview CB/ES OHL FD. | Preserve the explicit CV006 power reference while source availability and installed identity remain unconfirmed. |
| CV-R03 | Confirm RM406's present supply via pole 57 versus retained RM418-RM406-P1 cable tag and historical Hopper 007 note. | Avoid inventing an additional RM418 feed from a historical cable name. |
| CV-R04 | Confirm TF406B feeder identity: CB02/SW03 in RMU/distribution sheets versus SW02 in MC406A sheet. | Preserve the competing source records without silently rewiring TF406B. |
| CV-R05 | Confirm TF406B 433 V versus 415 V labels and the TBC MC406A incomer/bus ratings. | Rating/identity metadata and missing vendor information remain unconfirmed; no electrical calculation resolves them. |
| CV-R06 | Confirm MC410A detailed bus/incomer and MC410B downstream endpoint scope, including the explicit relocation/removal of the MEN link. | MC410A source detail is missing; MC410B is not an independent HV branch or a confirmed local MEN bond. |
| CV-R07 | Confirm accepted LV endpoint identities ahead of VS4061/VS4101 converters and explicit source/backfeed/earth relationships. | Do not represent generic transfer through rectifier/DC/inverter symbols or automatically join transformer secondaries. |
| CV-R08 | Confirm RM406/RM410/RM419/RM418/SS416 interface aliases and avoid duplicate equipment across area packages. | Link the evidenced RM410→RM419→RM418 and RM406→Hopper 8 paths to hopper-area records. |
| CV-R09 | Confirm physical interlock review and supported positions for RMU, OHL, VSD-input and LV incomer devices represented in scope. | Missing rules remain unconfirmed and controls disabled, rather than treated as confirmed no interlocks. |
| CV-R10 | Confirm source precedence and starting configuration. CV-S04's revision 6 says AS FOUND 23.10.21, while CV-S01/CV-S02 and other 2025 revisions say 23.10.23. | Retain exact descriptions, redlines and older stamps without silently choosing a governing configuration. |
| CV-R11 | Resolve external coverage and naming: CV006 versus CV010 tail labels, Drop Tower LV Workshop, Norfolk/Bigge branches, Hopper 10 and missing VSD/vendor/MC410A references. | Preserve unresolved boundaries; names and absent pages do not establish disconnection, source availability or new conductors. |

These local records should be linked/merged into existing questions, retaining source evidence and avoiding duplicate owner decisions. In particular the station/33 kV question and missing Norfolk/Bigge coverage may already be represented by upstream source-review records.

## Missing referenced material and aliases

Filename search found no supplied copies of:

- `CB22OP050B-10018-DR-EL-0032` (Norfolk/Bigge continuation); `CB21OP055B-10016-DR-EL-0088` (UG crossing detail); the referenced `10016-SC-EL-0001/0002` pole/cable schedules and TF04 cable schedule `CB21OP055B-10016-DR-EL-0010`.
- MC410A references `520CBC0003-2140-DR-EL-0002`, `520CBC0003-2140-DR-EL-0003`, `520CBC0002-2140-DR-EL-0003` as differently printed on the supplied overview/detail pages, or `520CBC0003-2140-DR-EL-0079` on the MC410B sheet. The prefix difference also needs reconciliation.
- Detailed VSD vendor packages represented by `%` placeholders on CV-S01, or referenced CV006-VS4061 drawing `CB19OP001B-04057-DR-EL-0232`.
- Referenced MC406A earthing `CB19OP001B-04057-DR-EL-0401`, MC410B earthing `...-0409` and MEN-location reference `...-0159`.

Missing pages do not confirm a disconnected circuit, no interlock or permitted operation. The 33 kV station SLD, Hopper 10 RMU and RM419/Hopper 9 source filenames are supplied and belong to their respective area reviews; their full contents were not inspected as additional pages in this task. Their boundary references were read directly on the listed sources.

The CV006 overview's “CV010 switchroom” / CV010 motor labels and its tail-line label coexist with its overall CV006 title. **Unconfirmed:** historical conveyor/project aliases versus distinct asset names. Likewise the source note about previous A/B project-number prefixes cannot be applied as a blanket rule to arbitrary supplied filenames. Preserve original document and equipment aliases and reconcile each referenced identity explicitly.

## Completion boundary

This task provides source evidence, interface comparisons and open questions. It does not complete GitHub #20: runtime area data, connected views, regression checks, integrated coverage and owner acceptance remain separate work. No runtime files, shared discrepancy queue, GitHub issues or commits were changed.
