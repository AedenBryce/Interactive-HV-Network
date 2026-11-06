# SW411 construction evidence

Status: drawing review for implementation ticket #12; no runtime model or owner acceptance is established by this record. Reviewed 22 October 2026.

## Sources and review method

All four complete PDF pages were rendered with Poppler at 110 dpi and inspected. The SW411 diagrams, source region, notes, feeder labels and title/revision blocks were inspected again in enlarged crops. Text extraction was used as a search aid; the raster-only legacy sheet was reviewed visually. Current file hashes matched the intake register.

| Ref | Local source | Drawing revision/date | Page and relevant region |
| --- | --- | --- | --- |
| W1 | [11098-07110-EL-DR-5151.pdf](../../drawings/Asset%20Drawing%20Repo/11098-07110-EL-DR-5151.pdf) | Project rev 7, 28 January 2025, revision description `AS FOUND 23.10.23` | Page 1; upper source diagram, central SW411 diagram, lower feeder destinations, upper-right notes |
| W2 | [CB-10016-DR-EL-0010.pdf](../../drawings/Asset%20Drawing%20Repo/CB-10016-DR-EL-0010.pdf) | Rev 0, 27 October 2025 | Page 1; upper-left SW411 Bus A, lower-left notes; overview sheet 1 of 2 |
| W3 | [CB-10016-DR-EL-0011.pdf](../../drawings/Asset%20Drawing%20Repo/CB-10016-DR-EL-0011.pdf) | Rev 0, 27 October 2025 | Page 1; upper-left SW411 Bus B, lower-left notes; overview sheet 2 of 2 |
| W4 | [11098-07110-EL-DR-2350.pdf](../../drawings/Asset%20Drawing%20Repo/11098-07110-EL-DR-2350.pdf) | Project rev 16, 31 May 2016; vendor drawing field separately says rev 14 | Page 1; top SW411 diagram, bottom-right title/revision blocks |

W2 and W3, page 1, notes 1 and 2 expressly identify a high-level reference overview and prohibit using that drawing for isolation purposes. This review uses their drawn connectivity as evidence for the educational model. It does not establish operational permission. No source-precedence rule has been accepted.

## What the sheets explicitly draw

### Bus structure

W2 upper-left draws `BUS A`; W3 upper-left draws `BUS B`. The page continuation references join these presentations through `CB SW411 BT`, tier 8. W1 central diagram also draws a bus-tie breaker between its left and right bus sections, labelled `CB SW 411 BT`. W4 top diagram shows the same bus-tie identity between its two bus sections. These are depicted connections; the present breaker position and the present availability of either section remain **Unconfirmed**.

W1 note 4, page 1, explicitly says the actual position on the bus of the incomers differs from what is shown and refers to drawing 11098-07110-EL-DR-2350 for actual position. W4 places IN01 and IN03 on the left of the bus tie and IN04 and IN02 on its right, matching the section membership depicted by W2/W3. This does not establish the current installation or device lineup.

### Incomers and their line-side earth branches

| Depicted bus section | Tier | Printed breaker | Printed earth switch | Source evidence |
| --- | --- | --- | --- | --- |
| Bus A | 6 | `CB SW411 IN01` | `ES SW411 IN01` (W1 spaces `IN 01`) | W1 central-left; W2 upper-left |
| Bus A | 7 | `CB SW411 IN03` | `ES SW411 IN03` (W1 spaces `IN 03`) | W1 central-left; W2 upper-left |
| Bus B | 10 | `CB SW411 IN04` | `ES SW411 IN04` (W1 spaces `IN 04`) | W1 central-right; W3 upper-left |
| Bus B | 11 | `CB SW411 IN02` | `ES SW411 IN02` (W1 spaces `IN 02`) | W1 central-right; W3 upper-left |

Each incomer is depicted as an incoming conductor through its breaker to the bus section. Its earth switch branches from the **incoming-line side** of that breaker to an earth symbol (W1 central incomer bays; W2/W3 upper-left). Earth symbols do not depict an alternative supply connection.

Source assignments require reconciliation:

- W1 page 1 upper diagram explicitly labels the overhead 220 kV arrangement `FUTURE`. Two depicted transformers above IN01 and IN02 each print `TFX4`, `220kV/22kV`, `50MVA`, `OLTC`, `(FUTURE)`.
- W1 draws IN03 and IN04 arrivals from its `POWER STATION / GENERATORS & HV SWITCHBOARD` block, referenced to `500CBC0002-13015-DR-EL-0001`.
- W2 page 1 upper-left groups both arrivals under `SB01 CLOUDBREAK POWER STATION`; `TF-11` is printed above IN03. The other arrival above IN01 has no individual transformer label there. Its power-station references include `500CBC0002-13015-DR-EL-0001` and `11098-07110-EL-DR-2349`.
- W3 page 1 upper-left groups its arrivals under `SB01 CB POWER STN.`; `TF12` is printed above IN04. The arrival above IN02 has no individual transformer label there. It references `500CBC0002-13015-DR-EL-0001`.
- W4 page 1 top labels IN01 and IN02 overhead arrivals `FUTURE`; its IN03/IN04 pair refers to `07110-EL-DR-2349`.

**Unconfirmed:** which source path is installed for each incomer, whether either future arrangement was commissioned, source availability, whether the repeated TFX4 text denotes two distinct physical transformers, and transformer winding/transfer/backfeed behaviour. The sheets do not provide a complete explicit terminal transfer model for those source transformers. Do not turn their symbols into an all-windings-connected rule.

### Outgoing feeders

Every row below depicts a breaker from the stated bus to the outgoing conductor, with an earth-switch branch on the **outgoing-cable side** of that breaker. W1 shows the conductor continuing to the destination box below; W2/W3 continue the feeder to the downstream area diagram. Terminal names such as `bus-side` and `cable-side` are descriptive roles, not printed terminal tags.

| Bus | Tier | Breaker / earth-switch text | Drawn destination and evidence |
| --- | --- | --- | --- |
| A | 1 | `CB SW454 FD01` / `ES SW454 FD01` | SW454, SS454 lump stockpile. W1 page 1 lower-left cable `SW454-P-01`, reference `04400-EL-DR-8001`; W2 upper-left and middle-left |
| A | 2 | `CB SW451 FD01` / `ES SW451 FD01` | SW451, SS451 train loading. W1 lower-left cable `SW451-P-01`, reference `07110-EL-DR-2356`; W2 upper-left and lower-middle |
| A | 3 | W2 `CBW OHL FD` / `ES OHL FD`; W1 `CB SPARE` / `ES SPARE` inside the bay headed `OHL WEST` | W1 lower-left destination `CV006 POWER DISTRIBUTION`, reference `CB19OP001B-04057-DR-EL-0001`; W2 upper-left O/H LINE WEST via pole 1 and reference `CB21OP055B-10016-DR-EL-0089`. Canonical device labels and continuation coverage **Unconfirmed** |
| A | 4 | `CB SW435 FD01` / `ES SW435 FD01` | SW435, SS435 crushing No. 2. W1 lower-left cable `SW435-P-01`, reference `07110-EL-DR-2354`; W2 upper-left and upper-right |
| B | 13 | `CB SW431 FD01` / `ES SW431 FD01` | SW431, SS431 crushing No. 1. W1 lower-right cable `SW431-P-01`, reference `07110-EL-DR-2353`; W3 upper-left and middle-left |
| B | 14 | `CB SW426 FD01` / `ES SW426 FD01` | SW426, SS426 desand. W1 lower-right cable `SW426-P-01`, reference `07110-EL-DR-2352`; W3 upper-left and middle-left |
| B | 15 | `CB SW421 FD01` / `ES SW421 FD01` | SW421, SS421 screening. W1 lower-right cable `SW421-P-01`, reference `07110-EL-DR-2351`; W3 upper-left and lower-middle |
| B | 16 | W3 `CB RM721 FD01` / `ES RM721 FD01`; W1 prints `CB SW454 FD 01` / `ES SW454 FD 01` in this bay | RM721 outdoor RMU, services/workshop. W1 lower-right prints cable `SW454-P-01`, reference `07110-EL-DR-2256`; W3 upper-left continuation to RM721 at upper-middle. Canonical labels **Unconfirmed**, existing R002 |

W1 uses `FD 01` spacing in several labels; W2/W3 use `FD01`. Whitespace normalisation can be a software alias; it must not erase the OHL/SPARE or RM721/SW454 differences.

### Bus earth branches and equipment outside this slice

W2 upper-left depicts `ES BUS A SW411` at tier 5 from Bus A to earth. W3 upper-left depicts `ES BUS B SW411` at tier 12 from Bus B to earth. W1 depicts corresponding `BUS A EARTH` and `BUS B EARTH` bays; its Bus A cloud says tier 5, while a Bus B tier number is not legible in this review. Use W3's tier 12 as its cited overview evidence, not as a transcription from W1.

The adjacent voltage-transformer/fuse symbols and W1's `22kV`/`110V` annotations are drawn auxiliary measurement branches. No outgoing power-distribution LV bus is identified for them on these sheets. **Inference:** excluding the relay, CT, communications and 48 V DC wiring from the supply graph is consistent with the agreed HV-to-final-LV-bus scope. This does not remove any downstream HV feeder. W1's DB411A/DB411B/MC411 communications references are not evidence of a 22 kV supply path to those boards.

The overviews explicitly depict the following downstream HV interfaces important to later area reconciliation: SW431-to-SW435 via `CB SW435 FD02` / `ES SW435 FD02` at SW431 and `CB SW431 FD02` / `ES SW431 FD02` at SW435 (W3 middle-left, W2 upper-right); SW435-to-HPGR SW002; SW454-to-SW505; SW426-to-RM714; RM721-to-RM412/RM713; RM412-to-RM413-to-RM413A. These are cross-area index entries, not a completed review of those area terminal relationships. Their detailed sheets and exact terminal connections remain to be reviewed in the respective tickets.

## Interlocks and starting configuration

W1 page 1 note 3 explicitly states: `MECHANICAL INTERLOCK OF EARTHING TO BE PROVIDED TO SWITCHYARD AND POWER STATION`.

The source does not confirm the installed interlock conditions, key identities, complete affected-device set or an allowed switching sequence. W1 also draws `INTERTRIP` dashed references at the four incomers and dashed device linkages; this review has not established a truth table from those lines. Do not equate intertrip annotation or a drawn linkage with a confirmed physical switching permission. Existing R003 remains open; applicable unresolved controls must stay blocked according to the project requirement.

All actual initial breaker positions, earth-switch positions and source availability remain **Unconfirmed** (R005). The drawn switch poses have not been accepted as a normal starting configuration. An educational provisional configuration must be labelled accordingly and cannot be presented as accepted installation facts.

## Construction guidance and unresolved items

**Inference - proposed software representation:** use two explicit bus assets, one bus-tie breaker, four incoming breakers, four incoming earth switches, eight outgoing breakers, eight outgoing earth switches and two bus-earth switches. This count is for the reviewed SW411 power topology; it is not a total count of installed physical devices. Retain source-side and cable-side terminal roles. Do not connect earth terminations as a through route. Coordinates, tiers and PDF-page boundaries must not create or sever electrical connections.

| Local review item | Existing queue / affected identities | Required next evidence or decision |
| --- | --- | --- |
| Source mapping and commissioning | R001; IN01/IN02/IN03/IN04, source transformer interfaces | Reconcile station and 33 kV line sheets; owner confirms installed source routes and availability |
| RM721 labels | R002; SW411 tier 16 CB/ES/cable | Preserve W1 and W3 labels separately; owner confirms physical identities |
| Earthing interlock | R003; station/switchyard-related controls, exact affected set unresolved | Detailed key/interlock drawing or owner-confirmed conditions; do not generate permissive rules from absence |
| Starting configuration | R005; all SW411 devices and sources | Owner reviews complete baseline after model construction |
| OHL/SPARE labels and continuation | New local item SW411-Q01; tier 3 CB/ES | Compare supplied CV006 and 33 kV line sheets; retain W1 SPARE aliases alongside W2 OHL labels |
| Duplicated TFX4 source labels | New local item SW411-Q02; future IN01/IN02 source symbols | Establish distinct identity and terminal/winding arrangement only if this source arrangement is in scope/current |
| Physical incomer placement | W1 note 4; incomer positions vs electrical bus membership | W4 supplies depicted placement, but current installation acceptance still requires owner confirmation |
| Overview/detail bus-tie rating | New local item SW411-Q03; CB SW411 BT | W1 prints 1600 A; W4 prints 2000 A. Record difference; no electrical calculation or rating-based switching rule is justified by this review |

No entries have been added to the shared review queue by this preparation task. No current-network claim, operational permission or owner decision has been recorded.
