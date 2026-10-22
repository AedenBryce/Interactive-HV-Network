# Mine, camp and overlapping legacy source review

Reviewed 22 October 2026 for GitHub #24 / T23, including the additional SW441/MC441 supplied coverage requested during coordination. Source preparation only; no installed topology, revision precedence, starting configuration, physical-interlock acceptance or model acceptance is recorded.

## Visually reviewed original sources

| Ref | Original supplied filename | Verified printed revision / issue text | Page / inspected regions |
| --- | --- | --- | --- |
| MC-S01 | `500CB-07100-DR-EL-0022.pdf` | Project5 / 31.05.16 / AS BUILT FOR CB16OP003; vendor005001-2200-1400-SLD-0057 rev3; drawing-number-change note from500CB-07110-DR-EL-004 | 1; whole mine distribution; RM721/services B-F / 8-12; title/history H |
| MC-S02 | `CB-10016-DR-EL-0001.pdf` | 0 / 24.07.09 / AS BUILT | 1; camp power station generators A-D / 1-6; TF700/RM700 E-G / 4-6; notes A / 11-12; title/history H. PDF rotated for reading. |
| MC-S03 | `CB-10016-DR-EL-0002.002.pdf` | 3 / 08.12.11 / CAMP POWERLINE RELOCATION ADDED; printed drawingCB-10016-DR-EL-0002-002, sheet2of2 | 1; station/RM732 A-C / 6-8; SS731/SS719 D-E / 4-9; camp spurs and RM700 D-G / 5-10; title/history H |
| MC-S04 | `CB-10016-DR-EL-0003.001.pdf` | 9 / 21.01.21 / ADDITIONAL GENERATION, ALINTA TIER; printed baseCB-10016-DR-EL-0003 sheet1 | 1; complete fault/protection study; station A-C / 1-15; mine-services/workshops D-G; camp overhead line H-K; camp RMU ring H-L / 10-16; notes A-B / 15-16; title/history M. Rotated for reading. |
| MC-S05 | `CB-10016-DR-EL-0003.002.pdf` | 4 / 02.05.18 / WESTERN POWERLINE FEEDER ADDITION; printed baseCB-10016-DR-EL-0003 sheet2 | 1; whole SW411/processing overlap; SW411 A-C / 5-12; continuations C-D / 15-16; title/history M. Rotated for reading. |
| MC-S06 | `CB-10016-DR-EL-0003.003.pdf` | 3 / 24.05.17 / REVISED AS BUILT; AS BUILT stamp31/05/2016; printed baseCB-10016-DR-EL-0003 sheet3 | 1; whole wet/services/western overlap; RM721/RM712/RM713 A-E / 7-9; RM417 A-E / 10-15; RM413/414 F-K / 11-14; title/history M |
| MC-S07 | `CB-10016-DR-EL-0003.004.pdf` | 0 / 02.05.18 / AS BUILT; printed baseCB-10016-DR-EL-0003 sheet4 | 1; whole western line; SW411-OHL A-B / 1; drop-tower spur C-E / 5; RM418 B-G / 9-15; futureSizer8; title/history M. Rotated for reading. |
| MC-S08 | `CB-10016-DR-EL-0004.pdf` | 0; title signatures date28.9.10; separate revision issue date not confirmed | 1; entire camp MSB6 sheet; TX6/main switch/bar A-C / 5-9; downstream DB062 E-G / 2-4; title H |
| MC-S09 | `CB-10016-DR-EL-0005.pdf` | 0; title signatures date28.9.10; separate revision issue date not confirmed | 1; entire camp MSB5 sheet; TX5/main switch/bar A-C / 5-8; downstream DB053/DB054 E-G; title H |
| MC-S10 | `11098-07110-EL-DR-2355.pdf` | 7 / 28.01.25 / AS FOUND23.10.23; printed drawing07110-EL-DR-2355 | 1; incoming A-C / 4; SW441 main phase bar C / 2-9; bus earth D-E / 5; transformer feeder D-G / 7-8; title/history H |
| MC-S11 | `11098-07110-EL-DR-2657.pdf` | 13 / 09.01.26 / ISSUED FOR CONSTRUCTION - CB25OP003A; older rev12 issuedAS BUILT07/09/12; printed drawing07110-EL-DR-2657 | 1; TF441 A-B / 5; MC441 incomer/bar C / 2-12; neutral/MEN C / 9-11; title/history H |

All eleven distinct original PDF pages were visually inspected in full at 90 dpi; four sideways source pages were rotated for reading. Twenty-eight enlarged crops from 180 dpi renders were inspected for the cited power paths, endpoint labels, study notes, disputed generator/transformer identities and revision blocks. Exact original-file SHA-256 values and crop boxes are in `mine-camp-evidence.json`. Text search was a locator only, never topology evidence.

These eleven filenames had no completed source-table entry in the coverage snapshot read for this task. Their repeated station/processing topics are **overlapping depictions of shared equipment**, not eleven independent new networks. No duplicate physical assets or accepted joins are implied. Other already-reviewed originals and supplemental PIMS sources mentioned below are referenced only, not counted again in this table.

## Camp station and village supply

The following describes drawing depictions. All present installation and baseline choices remain **Unconfirmed**.

### Emergency generation and RM700

- MC-S02 p1 A-D / 1-6 depicts three415 V / 1250 kVA generators `07DG703`, `07DG702`, `07DG701`, each through a separately labelled `DG70n-CB01` and `DG70n-IN01` incomer isolator to the `07SW701` emergency-generator415 V phase bar. Auxiliary DB-01 and its external A-block supply are separate LV auxiliary circuitry; do not treat their controls as another HV supply path.
- MC-S02 p1 D-G / 4-6 shows `TF700-FDR-01` breaker between07SW701 and `TF700 415V/11kV 3.15MVA`, then the RM700 emergency-generator branch. `SW02 CAMP` and `SW03 MAIN POWERSTATION` have underground continuations to/from07110-EL-DR2331. The source establishes intended step-up use, but does not establish universal bidirectional transfer or transformer earth continuity.
- MC-S03 p1 F-G / 7-9 depicts RM700 more explicitly: SW03/ES03 incoming line, SW02/ES02 camp branch and CB01/SW01/ES01 transformer branch. The key-symbol link fromV52-ABS toSW01 is not a conductor. **Unconfirmed:** MC-S02's genericSW01 earthing depiction versus MC-S03's separateSW01/ES01 and complete key/position mapping.
- MC-S03 labelsTF700 `433V/11kV 3.15MVA`; MC-S04 p1 F-G / 14-15 instead depictsTF700 `433V/11kV 5000kVA`, generator names `GN205A`, `GN206A`, `GN210A` alongside branch labelsDG703-CB01, DG702-CB01, DG701-CB01, and omits the DG701-IN01 isolator drawn inMC-S02. Preserve those exact aliases and rating/lineup differences. The source does not confirm whether they reflect replacement, historical study simplification or a current installed condition.
- MC-S02 p1 note1 says normal station operation will have one generator on standby for maintenance. This is not an agreed enabled-source list, generator-selection instruction or simulation baseline. All actual generator availability and states remain unknown.

### Station to RM732 and camp overhead network

MC-S03 p1 A-G / 4-10 depicts:

```text
powerstation CAMP O/H LINE branch (630A, referenced07110-EL-DR-2349)
 -> RM732 incoming SW/ES and bar
    -> RM719 feeder SW/ES -> SS719 incomingSW002
    -> CAMP feeder SW/ES -> VP01 -> VP09
       -> P09A-ABS + VP09B-CB/recloser -> SS731 RM731-IN01
       -> VP12-ABS -> VP12-LBS -> V07 -> V52-ABS -> V59
          -> V62-ABS -> V63-CB/recloser -> campRMU6 continuation
          -> V60-CB01/recloser -> RM700-SW03
```

The route is a depiction, not an accepted pole equivalence/state list. MC-S04 p1 H-K uses relatedVP/V labels but, for example, places `V60-CB` atV61 and `V63-CB` belowV62. Preserve printed pole and switch aliases instead of silently renumbering them. Generic SW/ES labels need stable **role-based software identities**, not fabricated installed tags.

MC-S03 p1 D-E / 4-9 also depicts TF716 pole-top100kVA toDB716 camp sewage treatment plant and TF715100kVA toDB715 camp bore pump station, each on a separately fused spur. MC-S04 p1 K / 6-8 labelsTF716 `11kV/433V 200kVA` andTF715 `11kV/433V 100kVA`, with LV incoming breakers/bus marks atDB716/DB715. KeepTF716's100/200kVA difference unresolved. Surge-arrestor and screen-arrestor glyphs are identified byMC-S03's legend; they do not create an operable earth switch or a permanently earthed phase conductor.

### Camp RMU ring and first LV buses

MC-S04 p1 H-L / 10-16 depicts the camp path:

```text
RM700-SW02 -> RMUA -> RMU1 -> RMU2 -> RMU3
 -> RMUB -> RMU4 -> RMU5 -> RMU6 -> V63/recloser line side
```

RMUA andRMUB have separately drawn spare/not-connected stubs. The RMUB-toRMU4 side is explicitly marked **NORMALLY OPEN POINT**. MC-S04's note says fault-study configuration; the printed normally-open marker is evidence for owner review, not an accepted starting position or permission to operate it. Source/earth contacts on both sides of each ring switch remain distinct from the transformer feeder devices. Some feeder assemblies include two drawn earth contacts around the fuse; do not collapse them into a common phase route.

| Source location | Transformer depiction | First LV endpoint depicted / limit |
| --- | --- | --- |
| MC-S04 p1 H-J / 11-12 | RMU1 ->TX1,11kV/440V1000kVA | `CB MSB1 IN` ->MSB1, blocksA/B/C/D/(U) |
| MC-S04 p1 H-J / 11-12 | SeparateRMU1 feeder ->TX1A,11kV/440V630kVA | CB ->MSB1A, campRO plant |
| MC-S04 p1 H-J / 13 | RMU2 ->TX2,11kV/440V1000kVA | `CB MSB2 IN` ->MSB2, central facilities andblocksE/F |
| MC-S04 p1 H-J / 15 | RMU3 ->TX3,11kV/440V1000kVA | `CB MSB3 IN` ->MSB3, blocksG/H/I/J/K/L |
| MC-S04 p1 K-L / 14 | RMU4 ->TX4,11kV/440V1000kVA | `CB MSB4 IN` ->MSB4, blocksM/N/O/P/Q |
| MC-S04 p1 K-L / 12-13; MC-S09 p1 A-C / 5-8 | RMU5 ->TX5,11kV/440V1000kVA | MSB5; detailed sheet explicitlysays`SUPPLY FROM TX5`, `MSB5-IN`1600A and first main phase bar. Outgoing blockDBs excluded. |
| MC-S04 p1 K-L / 11; MC-S08 p1 A-C / 5-9 | RMU6 ->TX6,11kV/440V1000kVA | MSB6; detailed sheet explicitlysays`SUPPLY FROM TX6`, `MSB6-IN`1600A and first bar1600A/25kA1sec. Outgoing blockDBs excluded. |

Seven camp-ring LV buses are depicted; this count excludes07SW701's LV generation bar, DB715/DB716, station auxiliary buses and the separate mine workshop endpoints. MC-S08/S09's DB062, DB053 andDB054 details are downstream outgoing-LV coverage; inspect/disposition them but stop the network model atMSB6 / MSB5. No source in these scans establishes current winding earth/backfeed policy or an accepted bus voltage beyond the printed labels.

## Additional mine-services and station candidates

MC-S04 is a legacy fault/protection study, with study states and calculated fault results. Its drawn topology can supply provisional candidates, while calculations, protection settings and study states remain outside simulation scope.

- P1 C-E / 2-5: stationTF03 `11kV/22kV 3MVA` supplies the package substationsSS711/SS711B; the two ring devices at each and their loop/cable are separately drawn. TF711 andTF711B each show22kV/433V1000kVA and incomingLV breakers toSW711/SW711B. TF717 is a separately fused22kV/433V100kVA spur toDB717, main sewage treatment plant. Exact installed matches and current source status remain **Unconfirmed**.
- P1 D-G / 2-8: RM732's RM719 feeder reachesSS719 / TF719 and final719 switchboard via its incoming breaker. TF719 is11kV/433V750kVA inMC-S04; MC-S03's SS719 description isGulf workshop whileMC-S04 saysApprenticeCentre. SS731 isAMSWorkshop inMC-S03 andFabricationWorkshop inMC-S04; TF731 is500kVA, with incomingSB731-IN to731switchboard. These are candidate identity/description matches, not extra duplicate substations.
- P1 A-C / 1-15 overlaps the already modelled station: SR-001/SR-002 /SB01/SB02 labels, bus-tie/coupler+fuse, generator branches andTF11/TF12 toSW411. The study also depicts Alinta incomer, G26/G27 throughGSU2, TF02/TF202 stationLV buses and a TF04 SPARE `400V/11kV` branch. **Unconfirmed:** these records' installed identity/status and TF04's relationship to PL1's11/33kVTF04. Do not merge by the repeatedTF04 tag or omit candidates simply because another station sheet differs.
- P1 E-G / 10-12: the process-water branch fromOPF1 viaWT1 recloser feedsSS441/SW441 andTF441/MC441. P1 E-G / 13 showsSS718 railcar-unloading kiosk withTF718/TF718A andSW718. Treat these as additional whole-network candidates and interfaces. No source/state acceptance follows from the study's linked OPF feeds.

## Water tower / process water: explicit supplied endpoint

MC-S10 p1 A-G / 4-8 has an incoming reference `FROM600A CIRCUIT BREAKER /07110-EL-DR-2349`, cableSW441-P-01. Through `CB SW441 IN01` it reaches a single22kV phase bar. `ES SW441 IN01` is on the incoming-cable side; `ES SW441` branches directly from the bar. The bar supplies `CB TF441 FD` and outgoing cableTF441-P-01, with `ES TF441 FD` on the transformer-cable side. Dashed key/control/protection lines do not add phase connections. The22kV/110VVT is a metering branch, not another finalLV power bus.

MC-S11 p1 A-C / 5-12 explicitly showsTF44122kV/400V2.0MVA -> phase cables -> `CB MC441 IN3000A` -> MC441 firstphase bar `400V3000A50kAFOR1Sec`. The neutralbar/MENlink/earthbar is separately labelled atC / 9-11; it must not become a phase-bus earth path. OutgoingLV motors, pumps, UPS, lighting and block circuits are excluded after this main bus. Current baseline, full physical-interlock rules, transformer source/reverse/earth policies and source feeder identity remain **Unconfirmed**. The titleWater Tower versus study Process Water is an alias/area description to reconcile, not proof of two separateTF441/MC441 assets.

## Disposition of the remaining overlapping drawings

- **MC-S01:** legacy mine distribution overview duplicates Desands/laboratory, lump stockpile, train loading, wet plant and services networks. It depictsTF712 supplyingSW712, whereas the separately reviewed2253 service sheet depicts pulled/disconnected cables and generator context. Keep the discrepancy; no newly invented join or older/newer precedence. ItsTF505A/B/C1.9kV scrubber routes are MV drive/converter context, not final LV buses to fabricate.
- **MC-S05:** overlapsSW411, crushing1/2,screening,trainloading,HPGR,Desands and lump stockpile. It supplies a historical comparison ofSW411incomer/feeder assignments and aCBW OHL FD continuation. Preserve itsFUTURE marks and dual feeds; physical shared assets belong to area models, not a duplicate mine/camp copy.
- **MC-S06:** overlapswet plant / services / laboratory/RM412/RM413/RM417 andHopper3/SS416. It depictsRM721-toRM712/TX712/SW712 continuity, disputed bylater services preparation, and historical Hopper 3 supply paths. It does not supersede the source-specific alias/identity questions in those area reviews.
- **MC-S07:** showsSW411CBW OHL FD towesternline, aP18-8 fusedspur/transformer22kV/400V315kVA toDrop Tower Changeover Switchboard, RM418/Hopper7 andFUTURE Sizer 8. Keep the future/commissioning/source differences versusCV006/RM410/RM406 sheets; this is evidence of another depiction, not a second accepted supply automatically joined toall western RMUs.

## Baseline, keys and external coverage

- MC-S04 p1 notes2-3, A-B / 15-16 expressly label **FAULT STUDY CONFIGURATION**:22 generators total(15+7), simulation with 15 running on SB01 and 3 on SB02,SW411 BT closed andSW431 FD02 / SW435 FD02 open, plus planned SS1A installation in 2013/14. The same sheet draws G23 and later added generation. These study conditions and scheduled work are not current installed facts or the agreed session baseline. Preserve the note/body tension rather than copying its states.
- MC-S03 p1 legendE-G / 1-3 distinguishes key normally locked position / key destination position. Its dashed V52-to-RM700 key link is physical/key-system evidence, not an executable complete key-release table. MC-S10 shows key/mechanical markings but no complete permitted-state table. All affected controls stay unresolved pending review. Neither absent notes nor drawn positions establish permission.
- References07110-EL-DR2349 and2331 are not exact original filenames in the intake register. HoweverMC-S03 andMC-S04 provide overlapping station/camp topology andMC-S08/S09 provide camp endpoint details. **The source does not confirm** exact document equivalence, completeness or current precedence; do not declare the whole camp network absent solely from missing exact filenames.
- Existing station/SW411/CV006/services/western area reviews and `drawing-review/supplemental/farwest-review.md` are **referenced-only leads** here. SupplementalFarwest coverage is not a runtime model or accepted whole-network extent. No extra external feeder, village continuation or interlock is inferred from it.

## Open owner-review questions

| ID | Confirmation needed |
| --- | --- |
| MC-Q01 | Resolve camp DG701 / 702 / 703 versus GN205A / GN206A / GN210A aliases, generator ratings/lineup, omitted DG701-IN01, TF700 3.15/5 MVA and 415/433 V differences. |
| MC-Q02 | Reconcile RM700 / SW01 earth-versus-series depiction,ES01 / 02 / 03 identities, key link to V52 and complete permitted physical states. |
| MC-Q03 | Confirm campstation/village source, RM732 generic roles, pole/switchaliases and actual RMUB normally open point; no study/source availability baseline accepted. |
| MC-Q04 | Confirm TX1 / TX1A / TX2..6 source/reverse/earth relationships and MSB1 / MSB1A / MSB2..6 first LV bus identities/voltages/current installation. |
| MC-Q05 | Resolve TF716 100/200 kVA; DB715/716 incoming bus details; preserve spur and control-conductor scope. |
| MC-Q06 | Reconcile SS719 Gulf Workshop / Apprentice Centre, SS731 AMS / Fabrication Workshop, SS711 / 711B / TF717 service identities and current topology. |
| MC-Q07 | Reconcile legacy station auxiliary / backup / Alinta / TF04 SPARE candidates with station / PL1 model and exact TF04 identity. No duplicated source or automatic join. |
| MC-Q08 | Confirm SW441/TF441/MC441Water Tower / Process Water alias and station OPF1 / WT1 source interface; detailed 22/400 versus study 22/415 labels andcurrent revision status. |
| MC-Q09 | Resolve processing/services overlaps, especially TF712 drawn LV continuity versus pulled-cable / generator context; keep shared physical assets in one area model. |
| MC-Q10 | Reconcile SW411 western OHL / drop-tower / RM418 future Sizer 8 depiction with CV006 and western-hoppers sources, without an invented parallel feed. |
| MC-Q11 | Confirm missing exact 2349/2331 reference equivalence/coverage, all actual states, source availability and interlocks and whole-network installed scope. AS BUILT / AS FOUND / IFC/study states are not acceptance. |

No source reviewed expressly authorizes switching. Permission is **not confirmed as permitted**. No runtime, shared coverage, GitHub issue or original PDF was modified.
