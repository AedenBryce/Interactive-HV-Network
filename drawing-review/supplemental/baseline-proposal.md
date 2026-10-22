# Remaining contact baseline proposal

Proposal `BASELINE-PROPOSAL-2026-10-23`. **Pending owner selection.** Reviewed against immutable `construction-2026-10-23.1`.

**Selection received23 October2026:** the owner answered40 exactly “Approve the listed proposal”, with no exceptions. The separate tie answer39 is “Closed”. The original proposal wording and rows below remain as presented; the [owner decision record](owner-configuration-review.md) records the selection and its scope.

These are proposed teaching-scenario values. The sources do not establish the current in-service/spare category of these199 controls. Approval would select the listed values for the model; it would not report live positions, confirm installed hardware or accept physical interlocks or whole-model completeness.

Your earlier answers directly cover161 other contact positions and119 racking positions. Those values are separate from this proposal.

## Proposed groups

| Group | Proposed contacts | Count |
| --- | --- | --- |
| Named modeled feed controls listed below | Closed |184|
| Explicit drawing-SPARE candidates listed below | Open |10|
| Former CV006 Hopper10 ABS references, RM712 IN01 and RM413A lower contact | Unconfirmed |4|
| AMR/IOP tie-in ABS | Individual owner answer required |1|

The four retained Unconfirmed cases are `cv006:abs:49-38-1`, `cv006:fused-abs:286`, `rm712:in01` and `rm413a:es-q8:lower`. The first two retain unresolved former-route hardware, RM712 IN01 has no external connection but no selected contact value, and the lower RM413A contact mechanism remains unconfirmed.

The separate tie is `line33:tie-in-abs`, labelled AMR/IOP TIE-IN POLE49-38-1 on `CB21OP055B-10016-DR-EL-0089.pdf`, rev0, p1 D–E/7. No tie contact is selected here.

## Exact proposed values

Every row and its original document/revision/page/region references are also in [the structured proposal](baseline-proposal.json). The values below are proposals, not source-confirmed installed states.

| Asset ID | Model label | Proposed contact |
| --- | --- | --- |
| `station:sb01:f4:cb` | SB-01 F4 CB | closed |
| `station:sb02:f1:cb` | SB-02 F1 CB | closed |
| `station:sb02:f4:cb` | SB-02 F4 CB | closed |
| `line33:pole-1-recloser` | Pole 1 recloser | closed |
| `line33:pole-2-abs` | Pole 2 ABS | closed |
| `line33:tie-in-abs` | 49-38-1 tie ABS | Individual answer |
| `line33:pole-201-abs` | Pole 201 exit ABS | closed |
| `line33:hopper-286-fused-abs` | Hopper10 fused ABS | closed |
| `sw431:in:cb` | CB SW431 IN 01 | closed |
| `sw431:tf431:hv-cb` | CB TF431 FD | closed |
| `sw431:mc431:cb` | CB MC431 IN | closed |
| `sw431:tf432:hv-cb` | CB TF432 FD · Tier 5 | closed |
| `sw431:sw432:d:cb` | CB SW432 IN D | closed |
| `sw431:sw432:y:cb` | CB SW432 IN Y | closed |
| `sw431:tf437:hv-cb` | CB TF437 FD | closed |
| `sw431:sw437:d:cb` | CB SW437 IN D | closed |
| `sw431:sw437:y:cb` | CB SW437 IN Y | closed |
| `sw431:tf442:hv-cb` | CB TF442 FD | closed |
| `sw431:sw442:d:cb` | CB SW442 IN D | closed |
| `sw431:sw442:y:cb` | CB SW442 IN Y | closed |
| `sw435:in:cb` | CB SW435 IN 01 | closed |
| `sw435:tf435:hv-cb` | CB TF435 FD | closed |
| `sw435:mc435:cb` | CB MC435 IN | closed |
| `sw435:tf433:hv-cb` | CB TF433 FD | closed |
| `sw435:sw433:d:cb` | CB SW433 IN D | closed |
| `sw435:sw433:y:cb` | CB SW433 IN Y | closed |
| `sw435:tf453:hv-cb` | CB TF453 FD | closed |
| `sw435:sw453:d:cb` | CB SW453 IN D | closed |
| `sw435:sw453:y:cb` | CB SW453 IN Y | closed |
| `sw435:hpgr:cb` | CB HPGR FD | closed |
| `hpgr:sw002:a02:k101` | A02 · K101 | closed |
| `hpgr:sw002:a04:k101` | A04 · K101 | closed |
| `hpgr:sw002:tf004:k202` | TF004 feeder · K202 | closed |
| `hpgr:mc001:cb` | HPGR MCC incoming MCCB · tag unconfirmed | closed |
| `sw421:in:cb` | CB SW421 IN 01 | closed |
| `sw421:tf421:hv-cb` | CB TF421 FD Tier 4 | closed |
| `sw421:mc421:cb` | CB MC421 IN | closed |
| `sw421:tf422:hv-cb` | CB TF422 FD Tier 5 | closed |
| `sw421:mc422:cb` | CB MC422 IN | closed |
| `sw421:tf423:hv-cb` | CB TF423 FD Tier 6 | closed |
| `sw421:sw423:d:cb` | CB SW423 IN D | closed |
| `sw421:sw423:y:cb` | CB SW423 IN Y | closed |
| `sw421:spare:tier2:cb` | CB SPARE FD Tier 2 | open |
| `sw421:spare:tier7:cb` | CB SPARE FD Tier 7 | open |
| `sw426:in:cb` | CB SW426 IN 01 | closed |
| `sw426:tf440:cb` | CB TF440 FD | closed |
| `sw426:sw440:d:in:cb` | CB SW440 IN D | closed |
| `sw426:sw440:y:in:cb` | CB SW440 IN Y | closed |
| `sw426:tf426:cb` | CB TF426 FD | closed |
| `sw426:mc426:in:cb` | CB MC426 IN | closed |
| `sw426:tf428:cb` | CB TF428 FD | closed |
| `sw426:mc428a:in:cb` | CB MC428A IN | closed |
| `sw426:tf427:cb` | CB TF427 FD | closed |
| `sw426:sw427:d:in:cb` | CB SW427 IN D | closed |
| `sw426:sw427:y:in:cb` | CB SW427 IN Y | closed |
| `sw426:tf429:cb` | CB TF429 FD | closed |
| `sw426:sw429:d:in:cb` | CB SW429 IN D | closed |
| `sw426:sw429:y:in:cb` | CB SW429 IN Y | closed |
| `sw426:tf439:cb` | CB TF439 FD | closed |
| `sw426:sw439:d:in:cb` | CB SW439 IN D | closed |
| `sw426:sw439:y:in:cb` | CB SW439 IN Y | closed |
| `sw426:tf430:cb` | CB TF430 FD | closed |
| `sw426:mc430:in:cb` | CB MC430 IN | closed |
| `sw426:tf443:cb` | CB TF443 FD | closed |
| `sw426:sw443:d:in:cb` | CB SW443 IN D | closed |
| `sw426:sw443:y:in:cb` | CB SW443 IN Y | closed |
| `sw426:ss714:cb` | CB SS714 FD | closed |
| `rm714:in01` | SF RM714 IN01 | closed |
| `rm714:in02` | SF RM714 IN02 | closed |
| `rm714:tf714:cb` | CB TF714 FD | closed |
| `rm714:sw714:in:cb` | CB SW714 IN | closed |
| `sw454:in:cb` | CB SW454 IN 01 | closed |
| `sw454:sw505:cb` | CB SW505 FD SW454 tier 6 | closed |
| `sw505:in:cb` | CB SW505 IN 01 | closed |
| `sw454:tf454:hv-cb` | CB TF454 FD | closed |
| `sw454:tf455:hv-cb` | CB TF455 FD | closed |
| `sw454:tf456:hv-cb` | CB TF456 FD | closed |
| `sw454:sw456:d:cb` | CB SW456 IN D | closed |
| `sw454:sw456:y:cb` | CB SW456 IN Y | closed |
| `sw505:tf506:hv-cb` | CB TF506 FD | closed |
| `sw505:sw506:d:cb` | CB SW506 IN D | closed |
| `sw505:sw506:y:cb` | CB SW506 IN Y | closed |
| `sw505:tf507:hv-cb` | CB TF507 FD | closed |
| `sw505:mc507:cb` | CB MC507 IN | closed |
| `sw505:tf508:hv-cb` | CB TF508 FD | closed |
| `sw505:mc508:cb` | CB MC508 IN | closed |
| `sw505:tf505a:hv-cb` | CB TF505A FD | closed |
| `sw505:vs50501:output-switch` | VS50501 Output contact | closed |
| `sw505:tf505b:hv-cb` | CB TF505B FD | closed |
| `sw505:vs50502:output-switch` | VS50502 Output contact | closed |
| `sw505:tf505c:hv-cb` | CB TF505C FD | closed |
| `sw505:vs50503:output-switch` | VS50503 Output contact | closed |
| `sw451:in:cb` | CB SW451 IN 01 | closed |
| `sw451:spare-2:cb` | T2 · CB SPARE FD | open |
| `sw451:spare-6:cb` | T6 · CB SPARE FD | open |
| `sw451:spare-7:cb` | T7 · CB SPARE FD | open |
| `sw451:tf451:hv-cb` | CB TF451 FD | closed |
| `sw451:mc451:cb` | CB MC451 IN | closed |
| `sw451:tf452:hv-cb` | CB TF452 FD | closed |
| `sw451:sw452:d:cb` | CB SW452 IN D | closed |
| `sw451:sw452:y:cb` | CB SW452 IN Y | closed |
| `cv006:abs:49-1` | ABS Pole 49-1 | closed |
| `cv006:recloser:49-39a` | Recloser Pole 49-39A | closed |
| `cv006:abs:49-40` | ABS Pole 49-40 | closed |
| `cv006:fused-abs:57` | Fused ABS Pole 57 | closed |
| `cv006:abs:49-38-1` | ABS49-38-1 drawing · downstream22kV line removed · hardware unconfirmed | Unconfirmed |
| `cv006:fused-abs:286` | Former 22 kV · fused ABS286 reference · hardware unconfirmed | Unconfirmed |
| `rm406:sw01` | RM406-SW01 Incoming | closed |
| `rm406:cb01` | RM406-CB01 A02 | closed |
| `rm406:sw02` | RM406-SW02 | closed |
| `rm406:cb02` | RM406-CB02 A03 | closed |
| `rm406:sw03` | RM406-SW03 | closed |
| `rm406:cb03` | RM406-CB03 A04 | closed |
| `rm406:sw04` | RM406-SW04 | closed |
| `rm410:sw01` | RM410-SW01 Incoming | closed |
| `rm410:cb01` | RM410-CB01 A02 | closed |
| `rm410:sw02` | RM410-SW02 | closed |
| `rm410:cb02` | RM410-CB02 A03 | closed |
| `rm410:sw03` | RM410-SW03 | closed |
| `rm410:cb03` | RM410-CB03 A04 | closed |
| `rm410:sw04` | RM410-SW04 | closed |
| `rm406:vs4061:input-a:switch` | VS4061 Input A · 2500 A | closed |
| `rm406:vs4061:input-b:switch` | VS4061 Input B · 2500 A | closed |
| `rm406:mc406a:cb` | MC406A CB TBC A · note 1 | closed |
| `rm410:vs4101:input-a:switch` | VS4101 Input A · 2500 A | closed |
| `rm410:vs4101:input-b:switch` | VS4101 Input B · 2500 A | closed |
| `wh:h1:rm417:sw01` | RM417 SW01 | closed |
| `wh:h1:rm417:sw02` | RM417 SW02 | closed |
| `wh:h1:rm417:cb01` | RM417 CB01 | closed |
| `wh:h1:rm417:sw03` | RM417 SW03 | closed |
| `wh:h1:mc417a:in` | MC417A MCCB · 630 A | closed |
| `wh:h1:mc417:in` | MC417 incoming VCB | closed |
| `wh:h1:rm417:cb02` | RM417 CB02 | closed |
| `wh:h1:rm417:sw04` | RM417 SW04 | closed |
| `wh:h7:rm418:sw01` | RM418 SW01 | closed |
| `wh:h7:rm418:sw02` | RM418 SW02 · spare | open |
| `wh:h7:rm418:cb03` | RM418 CB03 | closed |
| `wh:h7:rm418:cb03:disconnect` | CB03 disconnect Tag unconfirmed | closed |
| `wh:h7:rm418:cb04:disconnect` | CB04 disconnect Tag unconfirmed | open |
| `wh:h7:mc418:in` | MC418 incoming VCB | closed |
| `wh:h7:mc418a:in` | MC418A MCCB · 630 A | closed |
| `wh:h9:rm419:sw01` | RM419 SW01 | closed |
| `wh:h9:rm419:sw02` | RM419 SW02 · to Hopper7 | closed |
| `wh:h9:rm419:cb01` | RM419 CB01 | closed |
| `wh:h9:rm419:sw03` | RM419 SW03 | closed |
| `wh:h9:rm419:cb02` | RM419 CB02 | closed |
| `wh:h9:rm419:sw04` | RM419 SW04 | closed |
| `wh:h9:mc419:in` | MC419 incoming VCB | closed |
| `wh:h9:mc419a:in` | MC419A ACB01 · 2000 A | closed |
| `rm721:in01` | ISOL RM721 IN01 | closed |
| `rm721:in02` | CB RM721 IN02 | closed |
| `rm721:rm412` | CB RM412 | closed |
| `rm721:rm713` | ISOL RM713 | closed |
| `rm712:in02` | SF RM712 IN02 | closed |
| `rm712:in01` | SF RM712 IN01 | Unconfirmed |
| `rm712:tf712:cb` | CB TF712 FD | closed |
| `rm712:sw712:cb` | CB SW712 IN 1600 A | closed |
| `rm713:in01` | SF RM713 IN01 | closed |
| `rm713:in02` | SF RM713 IN02 | open |
| `rm713:tf713:cb` | CB TF713 FD | closed |
| `rm713:sw713:cb` | CB SW713 IN 1600 A | closed |
| `rm412:s100` | S100 RM721-facing | closed |
| `rm412:s101` | S101 RM413-facing | closed |
| `rm412:q100` | Q100 200 A | closed |
| `rm412:feeder-contact` | Disconnecting contact Below Q100 · tag unconfirmed | closed |
| `rm412:q200` | Q200 690 V Star · 800 A | closed |
| `rm412:q201` | Q201 690 V Delta · 800 A | closed |
| `rm412:q202` | Q202 415 V Star · 80 A | closed |
| `rm413:in01` | RM413 IN01 RM412-facing | closed |
| `rm413:in02` | RM413 IN02 RM417-facing double boot | closed |
| `rm413:tf413:cb` | TF413 FD ABB REJ603 protection label | closed |
| `rm413:mc413:cb` | CB MC413 IN 3000 A printed · supply route confirmed | closed |
| `rm413:tf414:cb` | TF414 FD ABB REJ603 protection label | closed |
| `rm413:mcc414:cb` | MCC414 incomer 2500 A | closed |
| `rm413a:q1` | TF413A Q1 CB | closed |
| `rm413a:es-q8:lower` | ES-Q8 · lower Contact mechanism unconfirmed | Unconfirmed |
| `rm413a:ac-input-a:switch` | TF413A AC input A 2500 A | closed |
| `rm413a:ac-input-b:switch` | TF413A AC input B 2500 A | closed |
| `rm420:sw01` | RM420 SW01 | closed |
| `rm420:tf420a:cb` | RM420 CB01 | closed |
| `rm420:tf420a:sw` | RM420 SW02 | closed |
| `rm420:tf420b:cb` | RM420 CB02 | closed |
| `rm420:tf420b:sw` | RM420 SW03 | closed |
| `rm420:spare:cb` | RM420 CB03 · spare | open |
| `rm420:spare:sw` | RM420 SW04 · spare | open |
| `rm420:mc420:in:vcb` | MC420 tier5 · VCB200A | closed |
| `mine:wt1:cb` | WT1-CB · study recloser | closed |
| `mine:sw441:in:cb` | CB SW441 IN01 | closed |
| `mine:tf441:cb` | CB TF441 FD | closed |
| `mine:mc441:in` | MC441 · 400 V IN | closed |
| `sw455:in-d:cb` | CB SW455 IN D 2500 A | closed |
| `sw455:in-y:cb` | CB SW455 IN Y 2500 A | closed |
| `wh:h3:mc416a:in` | SS416-MC416A MCCB 630 A | closed |
| `mc454:in:cb` | CB MC454 IN 3000 A printed | closed |
| `wh:h3:mc416:in` | Hopper3 · MC416 Incoming VCB 200 A | closed |
| `wh:h8:mc416:in` | Hopper8 · MC416 Incoming VCB 200 A | closed |
| `wh:h8:mc416a:in` | Hopper8 · MC416A MCCB 630 A | closed |
| `rm420:mc420a:in:acb` | MC420A · ACB01 main switch 2000 A | closed |
| `rm410:mc410a:cb` | MC410A CB 630 A | closed |
