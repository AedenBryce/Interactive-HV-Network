# Power station and 33 kV line: visual evidence review

Review date: 22 October 2026. Preparation for GitHub #13 / T12. This is source review, not an accepted installed-network model. No runtime model or source PDF was changed.

## Sources and review method

| Ref | Supplied PDF | Visually verified revision | Page / relevant regions |
| --- | --- | --- | --- |
| PS1 | `500CBC0002-13015-DR-EL-0001.pdf`, **Cloudbreak power station power distribution single line diagram** | 3, 18 July 2022, entry "UPDATED AS PER REDLINES" | Page 1; SB01 in rows A-C; tie in C-E; SB02 in E-G; title/history in H |
| PL1 | `CB21OP055B-10016-DR-EL-0089.pdf`, **Cloudbreak 33 kV powerline general arrangement single line diagram** | 0, 10 June 2022, "ISSUED FOR CONSTRUCTION" | Page 1; AMR line in C-D; IOP line in E-G; legend/notes in A-D at right; title/history in H |

Both complete pages were rendered with bundled Poppler at 140 dpi and visually inspected. Enlarged crops were inspected for feeder paths, the tie/fuse arrangement, pole switches, off-page labels, the legend and both title blocks. Text extraction was used to locate candidates, not to establish junctions. Poppler returned `No display font for 'Symbol'`; the diagram geometry and cited labels were visually legible in the inspected renders. This review does not certify every protection/metering glyph.

Context read: [initial review register](../README.md) and [R001-R005](../review-queue.md). The high-level overview has no agreed precedence over detailed sheets. Drawn switch positions and source symbols are not the owner-agreed starting configuration.

**Coverage limitation:** tag/text searches of the supplied register and extracted text found no further station SLD candidate containing SB01/SB02 or station LV-board identifiers. This is not an exhaustive visual review of all 141 PDFs; 53 PDFs have limited text extraction. The source set does not confirm that every external continuation is supplied under another name.

## PS1: bus and generator branches

These are statements about what PS1 draws, not confirmations of current installation or source availability.

- Page 1, A-C: `SB01`, labelled "CLOUDBREAK OPF POWER STN. 11kV MAIN SWITCHBOARD", has one continuous horizontal 11 kV bus drawn across its generator and feeder branches. No internal sectionalising switch is drawn in that horizontal bus.
- Page 1, E-G: `SB02` carries the same description and has one continuous horizontal 11 kV bus drawn across its generator and feeder branches. It is a separate bus from SB01, connected by the tie described below.
- Page 1, A-B: generator branches connected to SB01 are labelled, from left to right, `CB-GEN23`, then `CB-GEN15` down through `CB-GEN01`. This is 16 drawn generator branches. Every generator symbol carries `11kV` and `2420kW`.
- Page 1, E-F: SB02 generator branches are labelled `CB-GEN16` through `CB-GEN22`, seven drawn generator branches. Each also carries `11kV` and `2420kW`.
- Each generator branch has its own series breaker symbol between the generator-side conductor and the corresponding bus, and an earth-switch symbol on the generator side. CT, VT/fuse and indication details are also drawn; they do not identify another main supply branch.
- The source labels are `CB-GENnn`. **Unconfirmed:** the source does not separately print canonical identities for each generator, series breaker and earth switch. Do not merge these separate device roles into one switchable asset simply because they share a branch label.
- **Unconfirmed:** which generators are installed, commissioned, available or enabled at session start. Twenty-three drawn source symbols do not establish twenty-three enabled sources.

### SB01-to-SB02 tie

PS1 page 1, C-E, shows this solid-line series connection:

```text
SB01 bus
  -> SB-01 F2 breaker (BUS TIE, 2500A)
  -> fault-current limiting fuse (label 4/6kA)
  -> SB02 incoming BUS COUPLER breaker (2500A)
  -> SB02 bus
```

The incoming SB02 coupler is at the left of its generator row and has no `SB-02 Fn` feeder number printed beside it. The solid line descends from SB-01 F2, turns left through the fuse, then turns up/right to the incoming side of the SB02 coupler. It is not a direct fixed bus join and must retain the two independently represented series breakers. An earth-switch symbol exists on the interconnecting-conductor side of each breaker.

A dashed line with triangle marks links the earth-switch area of SB-01 F2 to the earth-switch area of the SB02 coupler. Similar shorter dashed links appear between the breaker and earthing mechanism in feeder and generator branches. **Inference:** these are candidate interlock/mechanical-linkage indications. **Unconfirmed:** PS1 has no legend or written condition establishing their exact meaning, permitted combinations, keys, or sequence. No concrete physical-interlock predicate can be derived from these links alone. Keep affected controls unresolved until confirmed; absence of written rules does not establish permission.

## PS1: outgoing branches and transformer relationships

The `SB-01 Fn` / `SB-02 Fn` labels below are printed feeder labels. Each listed non-spare feeder has a series breaker symbol and an earth-switch branch on the outgoing side unless stated otherwise. Those are drawn devices, not accepted initial states or confirmed interlock conditions.

| Feeder / region on PS1 page 1 | Drawn series path from the bus | Explicit endpoint / continuation | Model boundary or uncertainty |
| --- | --- | --- | --- |
| SB-01 F1, B-D | Breaker -> `TF-03`, `11kV/22kV`, `20/27MVA` | `MINE SERVICES O/H LINE` | External HV interface. Its downstream network is not on PS1. |
| SB-01 F2, B-E | Tie breaker -> limiting fuse -> SB02 coupler | SB02 bus | Retain two breakers and separate tie-side earth switches; see tie above. |
| SB-01 F3, B-D | Breaker -> vertical line with pole symbols | `CLOUDBREAK VILLAGE O/H LINE`; `CONTINUED ON DRG. 07110-EL-DR-6160` | No transformer is drawn on this feeder in PS1. Do not insert TF-03 into this branch. Exact referenced drawing filename is not supplied. |
| SB-01 F4, B-D | Breaker -> `TF-11`, `11kV/22kV`, `20/27MVA` | `MINE OPF O/H LINE No.2`; drawings `07110-EL-DR-2350` and `07110-EL-DR-5151` | Named main-switchroom interface. Map the remote SW411 device only after reconciling its detailed sheet and R001. |
| SB-01 F5, B-D | Breaker -> `TF-02`, `11kV/400V`, `1MVA` | `FEEDER 5 POWER STATION AUX. TO DB-01`, `REFER DWG DB01-SL-001` | LV winding/continuation is explicit, but the final DB-01 bus and its incoming switching are not drawn. A final LV bus must not silently be invented as confirmed. |
| SB-01 F6, B-D | Breaker -> `TF-01`, `EARTHING TX` | Ground symbol on earthing transformer | Earth-transformer branch, not a consumer LV bus or electrical source. Winding transfer/earth semantics require confirmation before assigning ideal conductive pairs. |
| SB-02 F1, F-G | Breaker -> `TF-12`, `11kV/22kV`, `20/27MVA` | `MINE OPF O/H LINE No.1`; drawings `07110-EL-DR-2350` and `07110-EL-DR-5151` | Second named main-switchroom interface. Do not interchange line No.1 / No.2 or TF-12 / TF-11. |
| SB-02 F2, F-G | Breaker -> `TF-201`, `EARTHING TX` | Ground symbol on earthing transformer | Independent earthing-transformer branch; exact modelled earth relationships remain unconfirmed. |
| SB-02 F3, F-G | Breaker -> `TF-202`, `11kV/400V`, `0.5MVA` | `FEEDER 3 POWER STATION AUX. TO DB-01B` | No DB-01B bus or incoming LV device is drawn on PS1. Retain the unresolved LV continuation. |
| SB-02 F4, F-G | Breaker -> `TF-04`, `11kV/33kV`, `15/20MVA` | `FEEDER 4 WEST FEEDER O/H LINE`; `CB21OP055B-10016-DR-EL-0089` | Explicit station-to-33 kV line interface. PL1 provides the continuation below. |
| SB-02 F5, F-G | Breaker -> conductor ending `SPARE` | Spare branch | No downstream load or source is drawn. Do not assign an enabled source or LV bus. |
| SB-02 F6, F-G | Breaker -> off-page solid-line arrow | `TO ALINTA`; `CBSS-ES-SLD-70-80-0001` | Separate dotted secondary/protection line also exits the bay. It is not another conductive power path. External topology and source availability remain unconfirmed. |

### Other SB01 branches and duplicate label

PS1 page 1, A-B, between CB-GEN23 and CB-GEN15, draws:

1. A separate transformer branch labelled `TF-04`, `11kV/0.4kV`, `11MVA`, `SPARE`, connected to SB01 through a series breaker and with an earth-switch branch.
2. An adjacent switchgear branch labelled `SPARE` with no generator or transformer symbol above it, again connected to SB01 through its own series breaker.

**Unconfirmed identity collision:** the SB01 spare transformer and the SB02 F4 west-feeder transformer both print `TF-04`, despite different drawn voltages/duties. Preserve both source labels as aliases. A unique model identity should be scoped to the source branch until the owner confirms the correct canonical tags. Do not overwrite one with the other or connect their windings together.

**Unconfirmed LV completion:** PS1 does not draw final LV buses for DB-01, DB-01B or the spare TF-04 branch. A provisional LV endpoint can be proposed during model construction only with that incompleteness visible; it is not source-confirmed bus detail.

## PL1: station interface and 33 kV trunk

PL1 page 1, C, left, identifies its origin as `CLOUDBREAK POWER STATION`, `11kV MAIN SWITCHBOARD SR-002 PANEL F4`, referring to PS1. It shows `TF04`, `11/33kV`, `GND TX`, `15/20MVA`, `YNd11`, `Z=8%`, and a grounded star winding symbol. PS1 labels its matching west feeder `SB-02 F4` and `TF-04`.

**Inference / unconfirmed alias:** the matching feeder number, transformer duty and reciprocal drawing references support treating `SR-002 PANEL F4` and `SB-02 F4` as the intended interface during provisional construction. Neither sheet explicitly states that `SR-002` is an alias of `SB02`; canonical identity needs confirmation. Preserve the spelling distinction in evidence. The grounded winding symbol is not a universal transfer/backfeed rule for the simulation.

### Ordered trunk and switching locations

PL1's legend (page 1, upper right) explicitly identifies recloser, air-break switch, fused air-break switch, power-pole/overhead line, underground cable, transformer and surge-arrestor symbols. Using those drawn symbols, the continuous series route is:

```text
TF04 33 kV side
 -> underground segment (note 3)
 -> POLE 1 RECLOSER
 -> POLE 2 air-break switch
 -> POLE 3
 -> underground segment (note 3)
 -> POLE 4 junction
 -> POLE 8
 -> underground segment (note 3)
 -> POLE 9
 -> POLE 36
 -> underground segment (note 3)
 -> POLE 37
 -> POLE 49
 -> underground segment (note 3)
 -> POLE 50
 -> POLE 70
 -> air-break switch at POLE 49-38-1 (AMR/IOP TIE-IN POLE)
 -> POLE 201
 -> air-break switch departing POLE 201
 -> underground segment (note 3)
 -> POLE 202
 -> POLE 214
 -> underground segment (note 3)
 -> POLE 215
 -> POLE 227
 -> POLE 272
 -> POLE 284
 -> POLE 286
 -> air-break switch before POLE 287
 -> POLE 287
 -> END OF LINE
```

AMR region: page 1, C-D. IOP region: page 1, E-G. The symbols for the pole-2 switch, tie-in switch and end switch lie immediately before their respective printed pole symbols. PL1 does not print unique switch asset tags. The location descriptions above are evidence locators, not confirmed switch identities. The `AMR LINE` and `IOP LINE` dashed envelopes are region boundaries, not conductive buses.

### Branch junctions and off-page continuations

| Junction / PL1 page 1 region | Drawn branch chain | Explicit terminus | Required uncertainty |
| --- | --- | --- | --- |
| Pole 4, C | Pole 4 -> pole 4A -> fused air-break switch -> cable/end arrow | `FUTURE FEED` | No referenced source or commissioning status. Future annotation is retained, not turned into enabled supply or definite disconnected/open equipment. |
| Pole 214, E-F | Pole 214 -> branch air-break switch -> pole 214-1 -> pole 214-2 -> cable/end arrow | `FUTURE FEED` | Same source/topology/baseline uncertainty. |
| Pole 227, F-G | Pole 227 -> branch air-break switch -> pole 227-1 -> off-page arrow | `TO POLE 227-2 NORFOLK LINE`, `CB22OP050B-10018-DR-EL-0032` | Exact reference is not among supplied filenames; full downstream extent/availability unconfirmed. |
| Pole 272, E-F | Pole 272 -> branch air-break switch -> pole 272-1 | Drawn pole 272-1 only | No named load, transformer or off-page source is printed on this branch. Do not invent one. |
| Pole 284, E-G | Pole-284 junction directly up to an off-page arrow | `TO POLE 284B-1 BIGGE SP1 LINE`, same `...0032` reference | No series switch is drawn on this branch in PL1; external continuation unresolved. |
| Pole 284, F-G | Same pole-284 junction directly down to an off-page arrow | `TO POLE 284A-1 BIGGE SP1 AND SP2 LINE`, same `...0032` reference | This is a real drawn junction with the horizontal trunk and upper branch, not a crossing without connection. External continuation unresolved. |
| Pole 286, F-G | Pole 286 -> `80A` fused air-break switch -> cable termination / underground cable | `SUPPLY TO RMU420 (HOPPER 10)`, `520CBC0007-2130-DR-EL-0003`; cable `3C 70 sqmm Cu XLPE` | Named Hopper 10 interface. Exact downstream RMU terminal/device requires its detailed sheet; do not infer it from the arrow alone. |

The supplied Hopper 10 PDF filename is `520CBC0007-2130-DR-EL-0003.pdf`, matching this printed continuation. PL1 does not itself show an LV transformer or final LV bus at Hopper 10.

### Earth and interlock limits for PL1

- Page 1, C-F, has grounded surge-arrestor symbols at numerous poles, at the transformer/recloser region, and on the Hopper 10 branch. The legend calls these **SURGE ARRESTOR**. They are not drawn earth switches and must not become permanently closed earth paths in the connectivity model.
- Page 1, C, has a grounded transformer winding symbol. Transformer neutral earthing and fault/protection behaviour require explicit modelling decisions; no electrical calculations are in scope.
- General notes 1-5 (page 1, right) describe conductors, fibre, underground cable, road crossings and cable schedule references. They contain no explicit physical-interlock conditions or switching sequence.
- **Unconfirmed:** installed switch IDs, supported physical positions beyond the symbol representation, physical interlocks, device starting positions and future-feed availability. The source does not confirm these. An absent interlock condition is not confirmation that switching is permitted.

## Named cross-area interfaces to preserve

| Interface identity for discussion (not a canonical installed tag) | Evidence chain | Receiving evidence needed |
| --- | --- | --- |
| Station TF-11 / OPF line No.2 | PS1 SB01 F4 -> TF-11 -> line No.2 -> references 2350/5151 | SW411 remote incomer device and R001 reconciliation |
| Station TF-12 / OPF line No.1 | PS1 SB02 F1 -> TF-12 -> line No.1 -> references 2350/5151 | SW411 remote incomer device and R001 reconciliation |
| Station west feeder | PS1 SB02 F4 -> TF-04 -> PL1 SR-002 F4 / TF04 | Confirm SB02/SR-002 identity alias; retain duplicate TF-04 ambiguity |
| Hopper 10 supply | PL1 pole 286 fused switch -> cable -> 520CBC0007-2130-DR-EL-0003 | RMU420 exact incoming terminal and downstream transformer/LV boundary |
| Mine services | PS1 SB01 F1 -> TF-03 -> mine-services O/H line | Legacy mine/camp sheets; exact continuation is not named on PS1 |
| Village | PS1 SB01 F3 -> village O/H line -> 07110-EL-DR-6160 | Equivalent supplied camp/legacy coverage or missing source |
| Station LV auxiliary DB-01 | PS1 SB01 F5 -> TF-02 LV -> DB-01 | DB01-SL-001 or explicit owner confirmation of final LV bus / incoming device |
| Station LV auxiliary DB-01B | PS1 SB02 F3 -> TF-202 LV -> DB-01B | Bus/incoming arrangement and source evidence |
| Alinta | PS1 SB02 F6 -> external Alinta | CBSS-ES-SLD-70-80-0001; source direction/availability and topology |
| Norfolk / Bigge | PL1 pole 227 / pole 284 off-page arrows | CB22OP050B-10018-DR-EL-0032 or equivalent coverage |

## Unconfirmed items for later consolidated owner review

These extend the area evidence; the root review queue was not modified by this preparation task.

1. **Source/baseline acceptance (R001/R005 related):** generator availability, intertie availability and every starting device state are unaccepted. Drawn open contacts do not establish the desired baseline.
2. **Station branch identities:** separately identify generator, branch breaker and branch earth switch; identify the unnumbered SB02 coupler and other unlabelled devices without fabricating physical tags.
3. **Duplicate TF-04:** confirm SB01 spare transformer's identity/status and the west-feeder transformer's canonical identity.
4. **SB02 versus SR-002:** confirm the intended cross-sheet switchboard alias.
5. **Interlocks (R003 related):** confirm the meaning/conditions of station dashed linkage symbols, including the tie's linked earth switches; confirm line-device interlocks. Affected unresolved controls remain disabled.
6. **Earthing-transformer relationships:** confirm TF-01/TF-201 and grounded TF04 winding relationships used for source/earth connectivity; do not infer ideal through-earth relationships from the symbols.
7. **LV completeness:** obtain or confirm DB-01 and DB-01B final bus/incoming arrangements; decide how the SB01 spare transformer is represented without inventing accepted LV equipment.
8. **External scope (R004 related):** reconcile mine services/village/Alinta/Norfolk/Bigge continuations, future feeds and the unnamed pole-272-1 branch. Missing exact filenames do not prove no equivalent drawing exists or no supply is possible.
9. **Station-to-SW411 mapping:** preserve the explicit TF-11 / line No.2 and TF-12 / line No.1 source paths; reconcile remote incomers against the main-switchroom detailed source rather than choosing overview precedence.

## Handoff for implementation

**Inference / proposed construction approach:** use source-scoped internal IDs for unnamed devices and colliding labels; retain printed labels and references as aliases. Each active control should identify its supporting drawing branch and unresolved interlock status. Split diagram coordinates from the above topology. Model the bus tie as a series chain and future/external feeds as visible unresolved interfaces. Keep station generator availability unconfirmed until accepted. Preserve LV continuation uncertainty rather than creating confirmed final buses from off-page arrows.

No installed-network acceptance, operating permission, calculated electrical result or owner resolution is established by this review.
