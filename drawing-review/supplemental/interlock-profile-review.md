# Owner interlock-profile review inventory

**Current disposition:** answers42–44 select P01, P04 and P03, now applied in `construction-2026-10-23.3`. See the [exact owner decisions](owner-interlocks-review.md). The original grouping/questions below remain review provenance. The other191 controls remain unresolved; no answer is inferred for them.

Read-only inventory derived from unchanged360 source-model control identities, committed removability audit and source-review records. No fresh complete PDF audit or installed truth-table claim.

All family groupings and proposed question scope are Inference for owner-review organisation. No shared physical rule is inferred.

360 controls =24 selected SW411 line-earth reviews +336 remaining controls. The20 groups below partition all336 IDs exactly once. No rule, permission or confirmed-none status is selected here.

| Group | Controls | Exact review scope |
|---|---:|---|
| P01 | 96 | Other removable HV CB / line-earth pairs |
| P02 | 10 | Bus-earth switches |
| P03 | 1 | SW411 bus-tie removable breaker |
| P04 | 48 | Removable LV incomers |
| P05 | 11 | LV breakers with unconfirmed removable mechanism |
| P06 | 12 | Hopper MV incoming VCB / earth pairs |
| P07 | 36 | Hopper FC / RC / maintenance-earth assemblies |
| P08 | 6 | SW505 inching-linked HV feeder pairs |
| P09 | 6 | SW505 drive DC-earth / output contacts |
| P10 | 11 | HPGR SW002 / VSD key-related controls |
| P11 | 6 | Converter AC input switches |
| P12 | 12 | OHL air-break/fused-air-break/recloser controls |
| P13 | 26 | Integrated Service / Isolated / Earthed RMU assemblies |
| P14 | 10 | Hopper7 RM418 separated switch / CB / earth assemblies |
| P15 | 11 | Hopper10 RM420 Ronis-linked RMU assemblies |
| P16 | 8 | RM721 separate line switches / CBs / earths |
| P17 | 10 | RM712 / RM713 / RM413 main controls |
| P18 | 6 | RM714 provisional main / earth assemblies |
| P19 | 7 | RM412 main / feeder / earth assemblies |
| P20 | 3 | RM413A ambiguous Q8 / Q1 switching assembly |

## P01: Other removable HV CB / line-earth pairs (96)

For the 48 exact CB/ES pairs in this group, select a complete V1 local action profile. May the previously approved SW411 line-earth matrix be applied to every listed pair? Identify any pair-specific additional local key conditions or exceptions. This asks about the selected simulation profile only; already deferred cross-station key sequences are excluded.

**Source evidence/limit:** Source diagrams associate these CB/ES devices; complete local conditions remain Unconfirmed. Removability and baseline acceptance do not resolve interlock review.


**Exact asset IDs:**

`mine:sw441:in:cb`, `mine:sw441:in:es`, `mine:tf441:cb`, `mine:tf441:es`, `station:sb01:f4:cb`, `station:sb01:f4:es`, `station:sb02:f1:cb`, `station:sb02:f1:es`, `station:sb02:f4:cb`, `station:sb02:f4:es`, `sw421:in:cb`, `sw421:in:es`, `sw421:spare:tier2:cb`, `sw421:spare:tier2:es`, `sw421:spare:tier7:cb`, `sw421:spare:tier7:es`, `sw421:tf421:hv-cb`, `sw421:tf421:hv-es`, `sw421:tf422:hv-cb`, `sw421:tf422:hv-es`, `sw421:tf423:hv-cb`, `sw421:tf423:hv-es`, `sw426:in:cb`, `sw426:in:es`, `sw426:ss714:cb`, `sw426:ss714:es`, `sw426:tf426:cb`, `sw426:tf426:es`, `sw426:tf427:cb`, `sw426:tf427:es`, `sw426:tf428:cb`, `sw426:tf428:es`, `sw426:tf429:cb`, `sw426:tf429:es`, `sw426:tf430:cb`, `sw426:tf430:es`, `sw426:tf439:cb`, `sw426:tf439:es`, `sw426:tf440:cb`, `sw426:tf440:es`, `sw426:tf443:cb`, `sw426:tf443:es`, `sw431:in:cb`, `sw431:in:es`, `sw431:sw435:cb`, `sw431:sw435:es`, `sw431:tf431:hv-cb`, `sw431:tf431:hv-es`, `sw431:tf432:hv-cb`, `sw431:tf432:hv-es`, `sw431:tf437:hv-cb`, `sw431:tf437:hv-es`, `sw431:tf442:hv-cb`, `sw431:tf442:hv-es`, `sw435:in:cb`, `sw435:in:es`, `sw435:sw431:cb`, `sw435:sw431:es`, `sw435:tf433:hv-cb`, `sw435:tf433:hv-es`, `sw435:tf435:hv-cb`, `sw435:tf435:hv-es`, `sw435:tf436:hv-cb`, `sw435:tf436:hv-es`, `sw435:tf453:hv-cb`, `sw435:tf453:hv-es`, `sw451:in:cb`, `sw451:in:es`, `sw451:spare-2:cb`, `sw451:spare-2:es`, `sw451:spare-6:cb`, `sw451:spare-6:es`, `sw451:spare-7:cb`, `sw451:spare-7:es`, `sw451:tf451:hv-cb`, `sw451:tf451:hv-es`, `sw451:tf452:hv-cb`, `sw451:tf452:hv-es`, `sw454:in:cb`, `sw454:in:es`, `sw454:sw505:cb`, `sw454:sw505:es`, `sw454:tf454:hv-cb`, `sw454:tf454:hv-es`, `sw454:tf455:hv-cb`, `sw454:tf455:hv-es`, `sw454:tf456:hv-cb`, `sw454:tf456:hv-es`, `sw505:in:cb`, `sw505:in:es`, `sw505:tf506:hv-cb`, `sw505:tf506:hv-es`, `sw505:tf507:hv-cb`, `sw505:tf507:hv-es`, `sw505:tf508:hv-cb`, `sw505:tf508:hv-es`

## P02: Bus-earth switches (10)

For each of the 10 named bus-earth switches, what selected V1 prerequisites must gate Earth Close and Earth Open? Identify the exact incomer/feeder/tie devices and required contact/racking positions. Confirm whether one complete profile applies across named boards; do not apply a line-earth matrix to these devices automatically.

**Source evidence/limit:** The reviewed source record does not supply a complete physical-action truth table. The source does not confirm this.


**Exact asset IDs:**

`mine:sw441:bus:es`, `sw411:bus-a:es`, `sw411:bus-b:es`, `sw421:bus:es`, `sw426:bus:es`, `sw431:bus:es`, `sw435:bus:es`, `sw451:bus:es`, `sw454:bus:es`, `sw505:bus:es`

## P03: SW411 bus-tie removable breaker (1)

What is the complete selected V1 Open/Close/Rack in/Rack out profile for CB SW411 BT? State any dependencies on BUS A/B earths or other named devices. Its selected Open/Rack out baseline does not answer this.

**Source evidence/limit:** Answer37 expressly excludes the two bus-earth switches and covers line-earth pairs, not this tie. Individual answer32 selects Rack out only.

- CB-10016-DR-EL-0011.pdf, rev0, p1, B/3, tier8; owner answers32/37

**Exact asset IDs:**

`sw411:bus-tie:cb`

## P04: Removable LV incomers (48)

For these 48 named LV incomers, select a complete V1 profile: are the intrinsic requirements (known Open before racking; known Rack in before Open/Close) the complete selected local restrictions? If not, give the additional named prerequisites/exceptions. Do D/Y incomers have any selected mutual-exclusion or coordinated-action requirement?

**Source evidence/limit:** No reviewed incoming-source note confirms a general D/Y mutual-exclusion or ganged action. Outgoing statutory-relay/key notes do not establish incoming-device conditions.


**Exact asset IDs:**

`mc454:in:cb`, `mine:mc441:in`, `rm406:mc406a:cb`, `rm410:mc410a:cb`, `rm413:mc413:cb`, `rm420:mc420a:in:acb`, `rm714:sw714:in:cb`, `sw421:mc421:cb`, `sw421:mc422:cb`, `sw421:sw423:d:cb`, `sw421:sw423:y:cb`, `sw426:mc426:in:cb`, `sw426:mc428a:in:cb`, `sw426:mc430:in:cb`, `sw426:sw427:d:in:cb`, `sw426:sw427:y:in:cb`, `sw426:sw429:d:in:cb`, `sw426:sw429:y:in:cb`, `sw426:sw439:d:in:cb`, `sw426:sw439:y:in:cb`, `sw426:sw440:d:in:cb`, `sw426:sw440:y:in:cb`, `sw426:sw443:d:in:cb`, `sw426:sw443:y:in:cb`, `sw431:mc431:cb`, `sw431:sw432:d:cb`, `sw431:sw432:y:cb`, `sw431:sw437:d:cb`, `sw431:sw437:y:cb`, `sw431:sw442:d:cb`, `sw431:sw442:y:cb`, `sw435:mc435:cb`, `sw435:sw433:d:cb`, `sw435:sw433:y:cb`, `sw435:sw453:d:cb`, `sw435:sw453:y:cb`, `sw451:mc451:cb`, `sw451:sw452:d:cb`, `sw451:sw452:y:cb`, `sw454:sw456:d:cb`, `sw454:sw456:y:cb`, `sw455:in-d:cb`, `sw455:in-y:cb`, `sw505:mc507:cb`, `sw505:mc508:cb`, `sw505:sw506:d:cb`, `sw505:sw506:y:cb`, `wh:h9:mc419a:in`

## P05: LV breakers with unconfirmed removable mechanism (11)

For these 11 named controls, confirm the mechanism and selected Open/Close prerequisites. If any is removable, identify it explicitly before proposing racking actions. Confirm the complete V1 local profile per listed device/family.

**Source evidence/limit:** A generic CB/MCCB/upper contact marking did not establish fixed versus removable construction. These controls cannot inherit a removable-breaker profile by default.


**Exact asset IDs:**

`hpgr:mc001:cb`, `rm412:q200`, `rm412:q201`, `rm412:q202`, `rm413:mcc414:cb`, `rm712:sw712:cb`, `rm713:sw713:cb`, `wh:h1:mc417a:in`, `wh:h3:mc416a:in`, `wh:h7:mc418a:in`, `wh:h8:mc416a:in`

## P06: Hopper MV incoming VCB / earth pairs (12)

For each of the six MV incoming-earth pairs, identify the exact upstream earth device referred to by note6. Which prerequisites are physical prevention versus administrative-only instructions? Select the complete V1 contact/racking/earth rules and explicit key-exchange scope. May any boards share one profile? Confirm exceptions separately.

**Source evidence/limit:** H1/H7 note6 says downstream earth may close after upstream earth is closed, key captive ON. H3/H8 supplemental notes have corresponding wording. H9 note6 does not contain the additional captive-ON sentence; its RM419 note1 is expressly administrative. H10 note6 cites another project/sheet and exact upstream mapping remains Unconfirmed.

- CB16OP038A-02006-DR-EL-0046.pdf, rev3, p1, F-G/1-7 notes5-6; C-D/4-5
- CB17OP023C-01006-DR-EL-0002.pdf, rev2, p1, F-G/1-7 notes5-6; C-D/4-5
- CB19OP001C-01068-DR-EL-0002.pdf, rev2, p1, F-G/1-6 notes5-6; C-D/4-5
- CB16OP038A-02006-DR-EL-0166, rev1, p1, G/1-7 notes5-6
- CB17OP023D-01006-DR-EL-0002, rev2, p1, G/1-7 notes5-6
- 520CBC0007-2130-DR-EL-0004.pdf, rev2, p1, G/1-6 note6; D/4 incoming earth

**Exact asset IDs:**

`rm420:mc420:in:es`, `rm420:mc420:in:vcb`, `wh:h1:mc417:in`, `wh:h1:mc417:in-earth`, `wh:h3:mc416:in`, `wh:h3:mc416:in-earth`, `wh:h7:mc418:in`, `wh:h7:mc418:in-earth`, `wh:h8:mc416:in`, `wh:h8:mc416:in-earth`, `wh:h9:mc419:in`, `wh:h9:mc419:in-earth`

## P07: Hopper FC / RC / maintenance-earth assemblies (36)

For each listed motor assembly, select the full Forward/Reverse contactor and maintenance-earth action matrix. Are FC/RC mutually exclusive? What gates contactor Close and earth Close/Open? Identify any door/key dependencies or unrepresented key states needed. Resolve H10 captive-ON wording separately from the other boards captive-OFF wording.

**Source evidence/limit:** H1/H3/H7/H8/H9 note5 expressly identifies a Ronis maintenance key captive with earth OFF. H10 note5 says captive with earth ON. Legends depict mechanical/electrical/key interlocks; note8 describes door-mounted padlockable switch lockable OFF. Complete linkage/actuator/key truth tables remain Unconfirmed.

- CB16OP038A-02006-DR-EL-0046.pdf, rev3, p1, F-G/1-7 notes5-6; C-D/4-5
- CB17OP023C-01006-DR-EL-0002.pdf, rev2, p1, F-G/1-7 notes5-6; C-D/4-5
- CB19OP001C-01068-DR-EL-0002.pdf, rev2, p1, F-G/1-6 notes5-6; C-D/4-5
- CB16OP038A-02006-DR-EL-0166, rev1, p1, G/1-7 notes5-6
- CB17OP023D-01006-DR-EL-0002, rev2, p1, G/1-7 notes5-6
- 520CBC0007-2130-DR-EL-0004.pdf, rev2, p1, G/1-6 note6; D/4 incoming earth

**Exact asset IDs:**

`rm420:mc420:motor-01:es`, `rm420:mc420:motor-01:fc`, `rm420:mc420:motor-01:rc`, `rm420:mc420:motor-02:es`, `rm420:mc420:motor-02:fc`, `rm420:mc420:motor-02:rc`, `wh:h1:mc417:m1:earth`, `wh:h1:mc417:m1:fc`, `wh:h1:mc417:m1:rc`, `wh:h1:mc417:m2:earth`, `wh:h1:mc417:m2:fc`, `wh:h1:mc417:m2:rc`, `wh:h3:mc416:m1:earth`, `wh:h3:mc416:m1:fc`, `wh:h3:mc416:m1:rc`, `wh:h3:mc416:m2:earth`, `wh:h3:mc416:m2:fc`, `wh:h3:mc416:m2:rc`, `wh:h7:mc418:m1:earth`, `wh:h7:mc418:m1:fc`, `wh:h7:mc418:m1:rc`, `wh:h7:mc418:m2:earth`, `wh:h7:mc418:m2:fc`, `wh:h7:mc418:m2:rc`, `wh:h8:mc416:m1:earth`, `wh:h8:mc416:m1:fc`, `wh:h8:mc416:m1:rc`, `wh:h8:mc416:m2:earth`, `wh:h8:mc416:m2:fc`, `wh:h8:mc416:m2:rc`, `wh:h9:mc419:m1:earth`, `wh:h9:mc419:m1:fc`, `wh:h9:mc419:m1:rc`, `wh:h9:mc419:m2:earth`, `wh:h9:mc419:m2:fc`, `wh:h9:mc419:m2:rc`

## P08: SW505 inching-linked HV feeder pairs (6)

For TF505A/B/C, identify each inching-drive local isolator and the exact permitted CB/ES/racking prerequisites and key sequence. Confirm whether the dependency is physically preventing action and how an external isolator/key should be represented. If deferred for V1, explicitly select that bounded deferral; the source note cannot be silently removed.

**Source evidence/limit:** Each feeder has an explicit INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR reference; exact states, keys and complete affected set are not supplied.

- 500CB-04220-DR-EL-0055.pdf, rev3, p1, D-F/3-8, feeder assemblies and F interlock arrows

**Exact asset IDs:**

`sw505:tf505a:hv-cb`, `sw505:tf505a:hv-es`, `sw505:tf505b:hv-cb`, `sw505:tf505b:hv-es`, `sw505:tf505c:hv-cb`, `sw505:tf505c:hv-es`

## P09: SW505 drive DC-earth / output contacts (6)

For VS50501/502/503, confirm the supported DC-earth and output-contact positions and complete V1 local action prerequisites, including any relationship to the inching-isolator keys. Confirm the exact mechanism of the modeled output contact before enabling it.

**Source evidence/limit:** DC BUS EARTHING SWITCH is explicitly drawn; converter internals do not define a full conductive-state or interlock table. Stored-energy behavior is not established.

- 500CB-04220-DR-EL-0042.pdf, rev4, p1, D-F/2-10, VS50501/502/503 DC/output sections

**Exact asset IDs:**

`sw505:vs50501:dc-earth`, `sw505:vs50501:output-switch`, `sw505:vs50502:dc-earth`, `sw505:vs50502:output-switch`, `sw505:vs50503:dc-earth`, `sw505:vs50503:output-switch`

## P10: HPGR SW002 / VSD key-related controls (11)

For the SW435 HPGR feeder CB/ES, SW002 A01 Q8, A02/A04 K101+Q8, TF004 K202+Q8 and both VSD DC-earth controls, identify the complete selected local action rules and key exchanges. Map the incoming Q8 linkage toward SW435 and Fortress keys to exact devices. State whether an external outlet/key state is required or explicitly deferred.

**Source evidence/limit:** The drawing depicts feeder/earth linkages, an incoming Q8 association toward SW435 and VSD internal Fortress keys. Exact remote key mapping to the named SW435 feeder CB/ES remains Unconfirmed; those controls are included for review, not asserted as the complete key schedule. A PLC controlled shutdown/intertrip signal is not a complete physical switching interlock.

- CB112-02006-DR-EL-0005.pdf, rev7, p1, A-B/4-9 linkages; D-E/5-6,9 Fortress/DC earth; lower-right note1
- CB112-02006-DR-EL-0008, rev4, p1, control/alarm/trip terminations; indexed captures only, original PDF unavailable

**Exact asset IDs:**

`hpgr:drive-mea:dc-earth`, `hpgr:drive-meb:dc-earth`, `hpgr:sw002:a01:q8`, `hpgr:sw002:a02:k101`, `hpgr:sw002:a02:q8`, `hpgr:sw002:a04:k101`, `hpgr:sw002:a04:q8`, `hpgr:sw002:tf004:k202`, `hpgr:sw002:tf004:q8`, `sw435:hpgr:cb`, `sw435:hpgr:es`

## P11: Converter AC input switches (6)

For the two AC-input switches of VS4061, VS4101 and TF413A converter, select their supported action prerequisites and any coordinated-pair/drive dependency. Confirm whether one local profile applies to all named inputs.

**Source evidence/limit:** Control/protection and rectifier/inverter depictions do not establish a physical no-restriction declaration or a complete incoming-switch truth table.


**Exact asset IDs:**

`rm406:vs4061:input-a:switch`, `rm406:vs4061:input-b:switch`, `rm410:vs4101:input-a:switch`, `rm410:vs4101:input-b:switch`, `rm413a:ac-input-a:switch`, `rm413a:ac-input-b:switch`

## P12: OHL air-break/fused-air-break/recloser controls (12)

For these 12 exact line controls, select the complete V1 action restrictions by mechanism. Confirm unresolved hardware cases before enabling them; identify any physically linked/keyed prerequisites. No racking is inferred for the three reclosers.

**Source evidence/limit:** PL1 general notes describe conductors/cables/roads, not a physical switching sequence. The two removed former22kV Hopper10 references remain hardware-Unconfirmed, distinct from the selected line33 tie ABS.

- CB21OP055B-10016-DR-EL-0089.pdf, rev0, p1, C-G line routes; general notes1-5 right
- CB19OP001B-04057-DR-EL-0001.pdf, rev6, p1, A/1-12 OHL devices
- CB-10016-DR-EL-0003.001.pdf, rev9, p1, E-F/8-10 WT1-CB

**Exact asset IDs:**

`cv006:abs:49-1`, `cv006:abs:49-38-1`, `cv006:abs:49-40`, `cv006:fused-abs:286`, `cv006:fused-abs:57`, `cv006:recloser:49-39a`, `line33:hopper-286-fused-abs`, `line33:pole-1-recloser`, `line33:pole-2-abs`, `line33:pole-201-abs`, `line33:tie-in-abs`, `mine:wt1:cb`

## P13: Integrated Service / Isolated / Earthed RMU assemblies (26)

For RM406, RM410, RM417 and RM419, select allowed transitions of each three-position main/earth assembly and its associated separate feeder CB. State when CB Open/Close is blocked by assembly position and when Earthed may be selected. Identify additional keys; do not copy a rack-out prerequisite onto mechanisms not selected removable.

**Source evidence/limit:** These model devices have service/isolated/earthed states; the source does not supply a complete permitted transition table. RM419 administrative upstream-earth wording must not silently become a physical block.

- CB19OP001B-04057-DR-EL-0002.pdf, rev4, p1, B-C/4-11 RM406
- CB19OP001B-04057-DR-EL-0004.pdf, rev6, p1, B-C/4-11 RM410
- CB16OP038A-02006-DR-EL-0044.pdf, rev2, p1, A-C/3-9 RM417
- CB19OP001C-01068-DR-EL-0001.pdf, rev4, p1, A-D/3-8; F-G/1-4 note1

**Exact asset IDs:**

`rm406:cb01`, `rm406:cb02`, `rm406:cb03`, `rm406:sw01`, `rm406:sw02`, `rm406:sw03`, `rm406:sw04`, `rm410:cb01`, `rm410:cb02`, `rm410:cb03`, `rm410:sw01`, `rm410:sw02`, `rm410:sw03`, `rm410:sw04`, `wh:h1:rm417:cb01`, `wh:h1:rm417:cb02`, `wh:h1:rm417:sw01`, `wh:h1:rm417:sw02`, `wh:h1:rm417:sw03`, `wh:h1:rm417:sw04`, `wh:h9:rm419:cb01`, `wh:h9:rm419:cb02`, `wh:h9:rm419:sw01`, `wh:h9:rm419:sw02`, `wh:h9:rm419:sw03`, `wh:h9:rm419:sw04`

## P14: Hopper7 RM418 separated switch / CB / earth assemblies (10)

Select the complete local profile for RM418 SW01/ES01, SW02/ES02, CB03/disconnect/earth and CB04/disconnect/earth. Confirm the unprinted disconnect identities and whether the CB01 control-sheet alias maps to current CB03 before using control indications as predicates.

**Source evidence/limit:** Primary sheet labels CB03/CB04; older control drawing labels CB01/SW03, with truck-in/out text referring to MC418 incoming VCB rather than RM418 feeder CB03. PLC/status signals do not prove physical prevention.

- CB17OP023C-01006-DR-EL-0001.pdf, rev6, p1, A-C/6-8, RM418 contacts
- CB17OP023C-01006-DR-EL-0041.pdf, rev4, p1, A-E/1-5; A/7-9 truck signals

**Exact asset IDs:**

`wh:h7:rm418:cb03`, `wh:h7:rm418:cb03:disconnect`, `wh:h7:rm418:cb03:earth`, `wh:h7:rm418:cb04`, `wh:h7:rm418:cb04:disconnect`, `wh:h7:rm418:cb04:earth`, `wh:h7:rm418:sw01`, `wh:h7:rm418:sw01:es`, `wh:h7:rm418:sw02`, `wh:h7:rm418:sw02:es`

## P15: Hopper10 RM420 Ronis-linked RMU assemblies (11)

For RM420 incoming SW01/ES01 and each CB01/SW02/ES02, CB02/SW03/ES03, CB03/SW04/ES04 feeder, confirm the complete V1 transition/key profile. Which key is held/released at which exact device states? Resolve physical versus administrative upstream-earth restriction.

**Source evidence/limit:** Note4 says Ronis key free at DS Open and ES Open, same unique key per feeder for DS/ES. Note1 explicitly calls upstream-earth control administrative; neither sentence supplies the whole key-state machine.

- 520CBC0007-2130-DR-EL-0003.pdf, rev3, p1, C/3-8 symbols; G/8-10 notes1,4

**Exact asset IDs:**

`rm420:es01`, `rm420:spare:cb`, `rm420:spare:es`, `rm420:spare:sw`, `rm420:sw01`, `rm420:tf420a:cb`, `rm420:tf420a:es`, `rm420:tf420a:sw`, `rm420:tf420b:cb`, `rm420:tf420b:es`, `rm420:tf420b:sw`

## P16: RM721 separate line switches / CBs / earths (8)

Select complete local profiles for the four RM721 main/earth assemblies (IN01, IN02, RM412 feeder, RM713 feeder). Confirm the actual CB versus isolator mechanisms and any local key dependencies. Previously deferred SW411/station keys are outside this question.

**Source evidence/limit:** The diagram associates four main and cable-earth paths, but does not establish a complete local sequence.

- 11098-07110-EL-DR-2256.pdf, rev3, p1, C-F/4-7

**Exact asset IDs:**

`rm721:in01`, `rm721:in01:es`, `rm721:in02`, `rm721:in02:es`, `rm721:rm412`, `rm721:rm412:es`, `rm721:rm713`, `rm721:rm713:es`

## P17: RM712 / RM713 / RM413 main controls (10)

For RM712 IN01/IN02/TF712 CB, RM713 IN01/IN02/TF713 CB and RM413 IN01/IN02/TF413 CB/TF414 CB, select the complete local action profile and identify any physically associated earth/key device missing from the current representation. Do not infer unrestricted operation from missing earth detail.

**Source evidence/limit:** RM713 includes a spare incoming path; RM712 IN01 disconnected-cable hardware remains Unconfirmed. RM413 double boot is a branch connection, not a demonstrated interlock.

- 11098-07110-EL-DR-2253.pdf, rev3, p1, A-C/1-3 RM712
- 11098-07110-EL-DR-2254.pdf, rev1, p1, A-C/1-3 RM713
- CB17OP023A-04057-DR-EL-0004.pdf, rev5, p1, A-C/1-3 RM413

**Exact asset IDs:**

`rm413:in01`, `rm413:in02`, `rm413:tf413:cb`, `rm413:tf414:cb`, `rm712:in01`, `rm712:in02`, `rm712:tf712:cb`, `rm713:in01`, `rm713:in02`, `rm713:tf713:cb`

## P18: RM714 provisional main / earth assemblies (6)

Confirm the actual earth-switch presence/identities for RM714 IN01/IN02 and TF714 feeder, then select the complete local action profile. The provisional earth controls cannot be treated as installed hardware without this decision.

**Source evidence/limit:** Detailed2255 and higher-level overview differ in earth-device detail; presence/identity and complete interlock conditions remain Unconfirmed.

- 11098-07110-EL-DR-2255.pdf, rev1, p1, A-C incoming/transformer branch
- CB-10016-DR-EL-0011.pdf, rev0, p1, RM714 lower panel

**Exact asset IDs:**

`rm714:in01`, `rm714:in01:es`, `rm714:in02`, `rm714:in02:es`, `rm714:tf714:cb`, `rm714:tf714:es`

## P19: RM412 main / feeder / earth assemblies (7)

For S100/E100, S101/E101 and Q100/disconnecting contact/E102, confirm the meaning of the dashed triangle linkage and the exact local prevention conditions. Select the complete V1 transition profile and identify the unnamed disconnecting contact before enabling it.

**Source evidence/limit:** The review labels dashed linkage/triangle between feeder disconnect and E102 as Inference: candidate mechanical interlock. The source does not supply a complete truth table/key identity.

- CBC0012-02004-DR-EL-0007.pdf, rev9, p1, F-G/1-3 Q100 / disconnect / E102

**Exact asset IDs:**

`rm412:e100`, `rm412:e101`, `rm412:e102`, `rm412:feeder-contact`, `rm412:q100`, `rm412:s100`, `rm412:s101`

## P20: RM413A ambiguous Q8 / Q1 switching assembly (3)

Confirm distinct mechanisms and roles for upper ES-Q8, Q1 CB and lower ES-Q8 (overview SW TF413A SW-01). Resolve whether the lower control really has a supported earth position, then select the complete V1 local profile.

**Source evidence/limit:** Two differently located ES-Q8 labels and differing overview aliases do not establish mechanisms or a key sequence; lower contact remains Unconfirmed.

- CB17OP023A-04057-DR-EL-0004.pdf, rev5, p1, B-C/4-6 RM413A; upper/lower ES-Q8
- CB-10016-DR-EL-0011.pdf, rev0, p1, C-D/10-12 RM413A aliases

**Exact asset IDs:**

`rm413a:es-q8:lower`, `rm413a:es-q8:upper`, `rm413a:q1`

## Control / protection / administrative material excluded from physical-rule inference

- PLC inputs, remote commands, CB/ES status lamps, CT/VT/protection/relay outputs, transformer alarms and controlled VSD shutdown/intertrip signals do not by themselves confirm a physically preventing action.
- RM419 and RM420 source wording expressly describes administrative upstream-earth controls; physical enforcement and exact upstream mapping remain Unconfirmed.
- Outgoing SH131, SH101/SH106, CV105/SH105 and SH213 isolator/statutory-relay/key notes are beyond the final LV bus endpoint and do not establish incoming HV/LV rules.
- No key token, ownership, release sequence or confirmed absence of local restrictions is invented.
- Questions can select bounded V1 teaching profiles if expressly approved for the listed assets. That remains separate from installed physical truth and whole-model acceptance.
