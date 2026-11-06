# Lump stockpile SW454 and wet plant SW505 source review

Reviewed: 22 October 2026. Preparation for GitHub #18 / T17. **Source review only. No runtime model, installed configuration or starting configuration has been accepted.**

Using the PDF skill, 25 distinct supplied PDF pages were rendered and visually inspected in full. This includes all 21 supplied `500CB-04220` PDFs, the two supplied `11098-04400` PDFs, and the main-switchroom/overview interface sheets. Twelve enlarged crops were inspected for endpoint labels, the SW505 bus earth, inching-drive interlock wording, transformer/neutral/DC-earth details and disputed revision blocks. Text extraction supported searches; it was not the sole basis for connection records. Every listed PDF contains one page.

## Sources inspected

Grid positions below refer to the printed drawing grid; descriptive locations resolve labels crossing a grid boundary. Revisions, dates and statuses are transcribed from the supplied copies. They are not a decision about which arrangement is installed.

| Ref | Exact supplied filename | Printed revision; date; status | PDF page | Review purpose / relevant region |
| --- | --- | --- | --- | --- |
| SW-S01 | `11098-04400-EL-DR-8001.pdf` | 5; 28/01/25; AS FOUND 23.10.23 | 1 | SW454 HV SLD; supply and outgoing main-power routes B-G, bus C-D |
| SW-S02 | `11098-04400-EL-DR-8021.pdf` | 7; 14/11/25; ISSUED FOR CONSTRUCTION - CB25OP003A | 1 | SW456; TF456 and two incomers/buses A-D |
| SW-S03 | `500CB-04220-DR-EL-0054.pdf` | 3; 28.01.25; AS FOUND 23.10.24 | 1 | SW505 sheet1; incomer and bus earth B-E / 1-4; TF506-508 feeders C-G / 5-10 |
| SW-S04 | `500CB-04220-DR-EL-0055.pdf` | 3; 25.01.25; AS FOUND 23.10.23 | 1 | SW505 sheet2; continuous 22kV bar C; TF505A/B/C feeders D-G / 2-8; inching-drive interlock arrows F |
| SW-S05 | `500CB-04220-DR-EL-0036.pdf` | 3; 11/3/13 handwritten; AS BUILT | 1 | MC507 sheet1; continued 400V bar C-D; outgoing circuits only; raster |
| SW-S06 | `500CB-04220-DR-EL-0037.pdf` | 5; 08.11.24; ISSUED FOR CONSTRUCTION | 1 | MC507 sheet2; TF507 A-C / 5-7; LV incomer and neutral/MEN C-D; main bar D |
| SW-S07 | `500CB-04220-DR-EL-0038.pdf` | 6; 08.11.24; ISSUED FOR CONSTRUCTION | 1 | MC507 sheet3; same main bar C-D, outgoing circuits |
| SW-S08 | `500CB-04220-DR-EL-0039.pdf` | 4; 08.11.24; ISSUED FOR CONSTRUCTION | 1 | MC507 sheet4; same main bar C-D, outgoing circuits |
| SW-S09 | `500CB-04220-DR-EL-0041.pdf` | 5; 08.11.24; ISSUED FOR CONSTRUCTION | 1 | MC507 sheet5; same main bar C-D, outgoing circuits |
| SW-S10 | `500CB-04220-DR-EL-0040.pdf` | 8; 08.11.24; ISSUED FOR CONSTRUCTION | 1 | MC507 sheet6; main bar ends at right; outgoing circuits and drive auxiliaries |
| SW-S11 | `500CB-04220-DR-EL-0042.pdf` | 4; 28.01.25; AS FOUND 23.10.23 | 1 | TF505A/B/C A-C; VS50501/502/503 drive internals and DC bus earthing switches D-F |
| SW-S12 | `500CB-04220-DR-EL-0044.pdf` | 5; 21.06.19; ISSUED FOR CONSTRUCTION | 1 | MC508 sheet1; same 400V main bar C-D and outgoing circuits |
| SW-S13 | `500CB-04220-DR-EL-0045.pdf` | 9; 14.10.24; ISSUED FOR CONSTRUCTION | 1 | MC508 sheet2; TF508 A-C / 5-7; LV incomer and neutral/MEN C-D; main bar D |
| SW-S14 | `500CB-04220-DR-EL-0046.pdf` | 5; 11.11.24; ISSUED FOR CONSTRUCTION | 1 | MC508 sheet3; same main bar C-D, outgoing circuits |
| SW-S15 | `500CB-04220-DR-EL-0047.pdf` | 8; 11.11.24; ISSUED FOR CONSTRUCTION | 1 | MC508 sheet4; same main bar ends at right; outgoing circuits/auxiliaries |
| SW-S16 | `500CB-04220-DR-EL-0052.pdf` | 2; 11/3/13 handwritten; AS BUILT | 1 | SR507 earthing SLD; equipment bonds and MC507 earth bar, not the phase bar; raster |
| SW-S17 | `500CB-04220-DR-EL-0053.pdf` | 3; 11/3/13 handwritten; AS BUILT | 1 | SR508 earthing SLD; equipment bonds and MC508 earth bar, not the phase bar; raster |
| SW-S18 | `500CB-04220-DR-EL-0060.pdf` | 2; 11/3/13 handwritten; AS BUILT | 1 | SW506 sheet1; TF506 A / 5-7; D/Y incomers and two 690 V bars B-C; raster |
| SW-S19 | `500CB-04220-DR-EL-0061.pdf` | 5; 11.10.25; CV214-EM01 & CV214-EM02 MOTOR UPGRADE TO 110 kW | 1 | SW506 sheet2; separate D/Y bar continuations B-C; SH213 project caution lower right |
| SW-S20 | `500CB-04220-DR-EL-0062.pdf` | 3; 14.10.20 in revision row; stamp 14/10/2024; AS BUILT; dates differ | 1 | SW506 sheet3; separate D/Y bar continuations B-C; revision/date discrepancy |
| SW-S21 | `500CB-04220-DR-EL-0063.pdf` | 3A in title; red revision row 4; 09.05.26 red row 4; prior row 3 30.08.24; Redline CV215-EM01 & CV215-EM02 MOTOR UPGRADE TO 110 kW; prior IFC | 1 | SW506 sheet4; D/Y bar continuations B-C; title/revision discrepancy |
| SW-S22 | `500CB-04220-DR-EL-0064.pdf` | 6; 30.08.24; ISSUED FOR CONSTRUCTION | 1 | SW506 sheet5; two 690 V bars end at right; note1 shuttle keyinterlock A / 11-12 |
| SW-S23 | `500CB-04220-DR-EL-0204.pdf` | 0; 21.06.19; ISSUED FOR CONSTRUCTION | 1 | CL201-MP01 cooling-water panel from MC508; downstream of 400 V bus |
| SW-S24 | `CB-10016-DR-EL-0010.pdf` | 0; 27.10.25; ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMENDED); AS BUILT stamp 27/10/2025 | 1 | Overview; SW454 panel C-E / 1-4; SW505 panel E-G / 1-4; SW411 feeder B / 1 |
| SW-S25 | `11098-07110-EL-DR-5151.pdf` | 7; 28/01/25; AS FOUND 23.10.23 | 1 | SW411 SW454 feeder tier1, D-G / 1-2 |

SW-S24 and SW-S25 revisit sources S1 and S3 in the initial review. These are not additional unique sources for a project-wide count. The companion `stockpile-wet-plant-evidence.json` contains the exact source paths, hashes and per-source review scope. Every recorded hash was checked against the existing inventory. This task makes no claim about the total project-wide reviewed count and changes no global coverage counters.

## Main-power routes shown in the drawings

Arrows describe the visible route for reading. They do not establish permission to energise, reverse energisation behaviour or accepted device positions.

| Record | Drawn equipment and route | Source and region |
| --- | --- | --- |
| SW-T01 | SW411 tier 1 has `CB SW454 FD 01`, cable `SW454-P-01` to SS454 / SW454, and cable-side earth switch `ES SW454 FD 01`. | SW-S25, p1, D-G / 1-2; SW-S24, p1, main switchroom B / 1 and route into SW454 |
| SW-T02 | SW454 receives `SW454-P-01` from SW411. `ES SW454 IN 01` branches from the incoming cable side of `CB SW454 IN 01`; the breaker route reaches the single drawn 22 kV bar. | SW-S01, p1, A-D / 1-2 |
| SW-T03 | A separate direct bus-earth branch is tagged `ES SW454`, in tier 3. | SW-S01, p1, C-E / 4; SW-S24, p1, SW454 panel tier 3 |
| SW-T04 | SW454 bar -> `CB TF454 FD` -> `TF454-P-01` -> TF454. Cable-side `ES TF454 FD` branches below the feeder breaker. The lower caption labels TF454 22 kV/400 V and refers to MC454 / 04400-EL-DR-8010. | SW-S01, p1, tier 2 C-G / 2-3 |
| SW-T05 | SW454 bar -> `CB TF455 FD` -> `TF455-P-01` -> TF455. Cable-side `ES TF455 FD` is drawn. The lower caption labels TF455 22 kV/690 V/690 V and refers to SW455 / 04400-EL-DR-8020. | SW-S01, p1, tier 4 C-G / 5-6 |
| SW-T06 | SW454 bar -> `CB TF456 FD` -> `TF456-P-01` -> TF456. Cable-side `ES TF456 FD` is drawn. The lower caption labels TF456 22 kV/690 V/690 V and refers to SW456 / 04400-EL-DR-8021. | SW-S01, p1, tier 5 C-G / 7-8 |
| SW-T07 | TF456 is labelled 22 kV/690 V/690 V, 5 MVA. Separate LV routes use `SW456-P-01-1...-5` and `SW456-P-02-1...-5`, then `CB SW456 IN D` and `CB SW456 IN Y`, respectively, to two separate delta/Y 690 V bars. | SW-S02, p1, transformer A / 5-6, incomers A-C / 1-10, bars C-D |
| SW-T08 | SW454 bar -> `CB SW505 FD` -> `SW505-P-01` -> SW505. `ES SW505 FD` branches from the outgoing cable side. SW505's off-page incomer references SW454 / 04400-EL-DR-8001 and the same power cable. | SW-S01, p1, tier 6 C-G / 9-10; SW-S03, p1, A-C / 1-2 |
| SW-T09 | At SW505, `ES SW505 IN 01` branches from the incoming cable side of `CB SW505 IN 01`, whose route reaches the 22 kV bar. The bar continues from sheet 0054 to 0055 and terminates on sheet 2. | SW-S03, p1, A-C / 1-2 and right continuation; SW-S04, p1, left continuation and bar C |
| SW-T10 | SW505 has a separate direct bus-earth branch in tier 2. The detailed tag reads `ES SWXXX`; the overview labels the corresponding branch `ES SW505`. | SW-S03, p1, C-E / 3-4, bus-earth column; SW-S24, p1, SW505 panel tier 2 |
| SW-T11 | SW505 bar -> `CB TF506 FD` -> `TF506-P-01` -> TF506; `ES TF506 FD` branches from the transformer cable side. Sheet 0054 labels TF506 22 kV/690 V/690 V and points to SW506 sheet 0060. | SW-S03, p1, tier 8 C-G / 5-6 |
| SW-T12 | SW506 sheet 0060 labels TF506 22 kV/720 V/720 V and 5/2.5/2.5 MVA. Its two LV routes use `SW506-P-01-1...-4` and `SW506-P-02-1...-4`, then `CB SW506 IN D` / `CB SW506 IN Y`, to two delta/Y bars both labelled 690 V. | SW-S18, p1, transformer A / 5-7, left/right incomers A-C, two bars C |
| SW-T13 | The two separate 690 V SW506 bars continue through sheets 0061, 0062 and 0063 to 0064, where both terminate. No bus tie between them is drawn on these five inspected sheets. | SW-S18-SW-S22, p1 each, main bar rows B-C and continuation arrows |
| SW-T14 | SW505 bar -> `CB TF507 FD` -> `TF507-P-01` -> TF507, with cable-side `ES TF507 FD`. TF507 is labelled 22 kV/400 V, 2.0 MVA. Its LV phase route passes the drawn 3000 A fuse arrangement and `CB MC507 IN` to the MC507 400 V main bar. | SW-S03, p1, tier 7 C-G / 7-8; SW-S06, p1, A-D / 5-8 |
| SW-T15 | MC507's single 400 V main bar continues across six sheets. Sheet order is 0036 (1), 0037 (2), 0038 (3), 0039 (4), 0041 (5), 0040 (6). The last sheet ends the bar at the right. The inspected continuation sheets do not draw another upstream incomer. | SW-S05-SW-S10, p1 each, main bar C-D and continuation arrows |
| SW-T16 | SW505 bar -> `CB TF508 FD` -> `TF508-P-01` -> TF508, with cable-side `ES TF508 FD`. TF508 is labelled 22 kV/400 V, 2.0 MVA. Its LV phase route passes the drawn 3000 A fuse arrangement and `CB MC508 IN` to the MC508 400 V main bar. | SW-S03, p1, tier 6 C-G / 8-10; SW-S13, p1, A-D / 5-8 |
| SW-T17 | MC508's single 400 V main bar continues across 0044 (sheet 1), 0045 (2), 0046 (3) and 0047 (4), where the bar ends at the right. The other inspected sheets do not draw another upstream incomer. | SW-S12-SW-S15, p1 each, main bar C-D and continuation arrows |
| SW-T18 | SW505 sheet 2 shows separate feeder assemblies `CB TF505A FD` / `ES TF505A FD`, `CB TF505B FD` / `ES TF505B FD`, and `CB TF505C FD` / `ES TF505C FD`. Their power cables are `TF505A-P-01`, `TF505B-P-01` and `TF505C-P-01`, respectively. | SW-S04, p1, tiers 5/4/3, C-G / 2-8 |
| SW-T19 | TF505A, TF505B and TF505C are each labelled 22 kV/1.9 kV/1.9 kV, 1.75 MVA. Their two secondary routes feed VS50501, VS50502 and VS50503, respectively. The drive diagrams contain rectifier/inverter symbols and a separately labelled `DC BUS EARTHING SWITCH`. | SW-S11, p1, transformers A-C, drives D-F / 2-10 |

Control/CT cable references, protection circuits and communications lines are not additional main-power connections. In particular the C-labelled routes between the LV incomers and SW505 feeder protection must not create duplicate electrical supply edges alongside their actual P-labelled routes.

## LV endpoints and incomplete branch boundaries

**Inference for the agreed model boundary:** use the two SW456 690 V bars, two SW506 690 V bars, MC507 400 V bar and MC508 400 V bar as the final LV endpoints evidenced by supplied detailed bus/incomer drawings. Outgoing LV drives, motors, control supplies and distribution circuits beyond those bars are excluded. Continued bars are single electrical identities across pages, not additional buses.

Two stockpile branches remain incompletely evidenced:

- **MC454/MC455:** SW-S01 names TF454 -> MC454 and drawing 8010; SW-S24 names both MC454 and MC455 beneath TF454. Only 8001 and 8021 from this 04400 drawing group are supplied. Their inspected contents do not establish MC454/MC455's complete LV incomer/bus arrangement. **Unconfirmed:** whether MC455 is an additional bus, an alias, a downstream board or another arrangement. Preserve this open boundary instead of dropping MC455 or inventing its incomer.
- **SW455:** SW-S01 names TF455 -> SW455 and drawing 8020; SW-S24 depicts TF455's two secondaries ending at SW455. The detailed 8020 sheet was not found among supplied filenames. **Unconfirmed:** SW455 incomer identities and exact bus arrangement. The overview is supporting high-level evidence, not a substitute for the missing detail.

### TF505A/B/C drive branches need an explicit scope decision

SW-S04 and SW-S11 identify **1.9 kV/1.9 kV** secondary supplies to the scrubber drives, not 400 V or 690 V final LV switchboard buses. SW-S11 does not label the internal DC bus voltage or identify it as a final LV endpoint. **The source does not confirm this.** The drive internals and earthing switches must not be silently classified as excluded outgoing LV circuits merely because the other branches stop at LV buses.

**Unconfirmed:** the required endpoint and simulation representation for these branches within whole-network HV coverage. Record the three transformer/drive branches and their unresolved downstream representation visibly, and obtain owner confirmation of the boundary. A generic undirected connection through rectifier/inverter symbols would be an unsupported source-transfer and earth-path interpretation. The drawing does not establish reverse transfer, stored-energy behaviour, DC earthing operation or converter interlock conditions.

## Earth relationships and physical interlocks

1. **Neutral/MEN is separate from the phase bus.** SW-S06 and SW-S13, p1, C-D / 6-8 explicitly show the transformer LV neutral route to neutral bar, MEN link and earth bar, separately from the phase route through the LV incomer. SW-S16/SW-S17 show switchroom/transformer/equipment bonding and MCC earth bars. They do not draw a permanent phase-main-bus-to-earth connection. Do not merge those earth bars with the phase buses.
2. **Transformer screens are separate.** TF456, TF506 and TF505A/B/C diagrams show screen-earth symbols. Those symbols do not confirm phase-bus earth transfer or a universal galvanic relationship between windings. Source-transfer/backfeed and earth relationships remain separate model facts requiring evidence or owner confirmation.
3. **Explicit inching-drive interlock exists, conditions unresolved.** SW-S04, p1, D-F / 3-8 shows a dotted interlock reference associated with each TF505A/B/C feeder assembly, labelled `INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR`. This is **inching**, not incoming. The source does not specify the complete permitted sequence, key identities, prerequisite positions or full affected-asset set. Preserve the explicit interlock evidence, flag the conditions unconfirmed and keep affected controls disabled.
4. **Other in-scope interlocks remain Unconfirmed.** The inspected SW454/SW505 HV and SW456/SW506/MC507/MC508 incomer SLDs do not explicitly establish complete physical interlock conditions or confirm an absence of restrictions. Drawout/contact symbols and protection circuits do not authorise specific transitions. Keep unresolved switching controls disabled; do not infer a D/Y incomer mutual-exclusion rule or ganged action from the symbols alone.
5. **Outgoing shuttle key interlock is outside the LV boundary.** SW-S22, p1, note 1 at A / 11-12 describes a shuttle isolator key A interlock: the electrical key arrangement trips the shuttle emergency-stop circuit and releases key A, which fits the mechanical interlock allowing shuttle isolation. The illustrated outgoing asset is `SH213-ISOL01` on the SH213 drive branch. This is evidence about that outgoing LV circuit; it does not establish an upstream SW505 or SW506 incomer rule.
6. **Starting configuration remains Unconfirmed.** The pages do not record the owner's agreed simulation baseline. Drawn switch positions, AS FOUND descriptions, commissioning notes and AS BUILT stamps do not confirm current/normal device states or upstream source availability. Do not introduce a new local source at SW454 or SW505 to bypass the integrated SW411 source questions.

## Discrepancies and owner-review questions

| Local ID | Source-supported question / discrepancy | Affected elements and required treatment |
| --- | --- | --- |
| SW-R01 | Which revisions describe the installed arrangement? The supplied set mixes AS FOUND, AS BUILT, construction issues, redlines and project cautions. | Preserve all statuses and avoid choosing precedence silently. This applies to the entire area. |
| SW-R02 | SW-S03 tags the bus-earth device `ES SWXXX`; SW-S24 uses `ES SW505`. Confirm canonical tag and aliases. | SW505 bus earth; retain placeholder evidence and mark identity provisional until resolved. |
| SW-R03 | SW-S03 labels TF506 22 kV/690 V/690 V; SW-S18 labels it 22 kV/720 V/720 V while its buses remain 690 V. | TF506 rating metadata. Do not resolve the difference through a calculation or silently select a label. |
| SW-R04 | SW-S01 shows TF454 -> MC454; SW-S24 lists MC454 and MC455. The detailed 8010/8011 arrangement is absent. | MC454/MC455 identities, LV incomers/buses and endpoint coverage remain incomplete. |
| SW-R05 | SW455 detailed sheet 8020 is absent. Confirm the LV bus/incomer arrangement below TF455. | Preserve an unresolved branch rather than inventing two incomers from analogy. |
| SW-R06 | Confirm endpoint scope and representation for TF505A/B/C -> 1.9 kV drives VS50501/502/503, including DC bus earth switches. | These branches cannot be silently excluded as outgoing LV circuits. Converter transfers and earthing need separate explicit definitions. |
| SW-R07 | Confirm conditions and identities for the documented inching-drive local-isolator interlocks, plus the physical interlock review of other represented devices. | SW-S04 and all in-scope switching. An explicit interlock reference without conditions is unresolved, not a confirmed executable rule. |
| SW-R08 | Confirm transformer source/backfeed and independent earth relationships, including three-winding arrangements. | TF454/455/456/506/507/508/505A/B/C. A generic symbol/rating does not establish all winding-to-winding paths. |
| SW-R09 | Confirm starting positions and source availability through the SW411 -> SW454 -> SW505 chain. | Baseline remains unaccepted; link existing upstream questions rather than duplicating source identities. |
| SW-R10 | SW-S20 revision row 3 says 14.10.20 while the AS BUILT stamp says 14/10/2024. SW-S21 title revision is redlined 3A, but added red revision row 4 is dated 09.05.26. Confirm document identity/status. | SW506 continuation evidence; retain both transcriptions. The illustrated differences concern downstream drive upgrades, but the source provenance still needs review. |

These local IDs are preparation records. Integration should link or merge matching questions in the existing review queue, without creating duplicate owner decisions.

### Other identity and source-reference details

- SW-S24 uses SR454 / lump-stockpile substation and SW454 / HV switchboard. It uses SR505 / wet plant and SW505 / HV switchboard; SW-S18 calls the area SS505. **Inference:** preserve switchroom/area aliases separately from switchboard identities; do not create duplicate switchboards from those enclosure labels.
- Some SW-S01 extracted text appends nearby protection number `51` to `ES TF454 FD`. The visually drawn tag is `ES TF454 FD`; an FD51 device must not be created from text order.
- SW-S25's main SW454 feeder and SW-S24's overview use whitespace variants of FD01 / FD 01 and incomer IN / IN01. **Inference:** these are candidate aliases of the matching drawn routes, subject to owner identity review.
- SW-S01 and SW-S03 explicitly identify the same inter-area power cable `SW505-P-01`. The external reference on each end should become one integrated connection, with both source references retained.

## Missing referenced material and exclusions

Filename searches did not find the referenced 04400-EL-DR-8010, 8011 or 8020, or the ABB vendor drawing `3BHS355813E01` named by SW-S11. The detailed source-transfer and interlock content of those absent documents remains **Unconfirmed**. No key-interlocking procedure was identified among the sources inspected for this review. Missing documents do not establish a disconnected circuit or permission to switch.

The relevant overview SW-S24, p1, notes 1-2 at lower left expressly call it a high-level reference overview and direct isolation work to relevant SLDs, HV switching programs and key-interlocking procedures. It cannot resolve a detailed rule merely because it omits that rule.

SW-S23's cooling-water panel is supplied from MC508's 400 V bus; its individual pump, light, socket and air-conditioner circuits are downstream of the agreed LV endpoint and excluded from runtime expansion. The other outgoing 400 V/690 V drive, motor, brake, auxiliary and control circuits were inspected to confirm bar continuations and detect supply interfaces; they are not additional LV bus endpoints.

## Completion boundary

This review supplies source locations, main-power route records, LV endpoint evidence and unresolved questions. It does not complete GitHub #18: runtime data, diagram views, integrated coverage reconciliation, regression checks and owner model acceptance remain separate work. No runtime files, global review queue, GitHub issues or commits were changed by this task.
