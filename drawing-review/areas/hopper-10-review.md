# Hopper 10 / RM420 source review

Reviewed 22 October 2026 for GitHub #23 / T22. Source preparation only. Current installation, starting configuration, physical-interlock completeness and model acceptance remain **Unconfirmed**.

## Visually reviewed source register

| Ref | Original supplied filename | Verified revision / issue text | Page / inspected regions |
| --- | --- | --- | --- |
| H10-S01 | `520CBC0007-2130-DR-EL-0003.pdf` | 3 / 28.01.25 / MODIFIED AS FOUND 23.10.23; vendor 5554-ESL-001 rev1, RCR ELC-504-001 rev1 | 1; RM420 A-D / 2-11; TF420A/B D-F / 3-6; notes1-4 G / 8-11; title/history H |
| H10-S02 | `520CBC0007-2130-DR-EL-0004.pdf` | 2 / 28.01.25 / AS FOUND 23.10.23; vendor 5554-ESL-002 rev1, RCR ELC-504-002 rev1 | 1; MC420 main phase bar A; incoming tier5 C-D / 4-5; motor pairs C-D / 7-11; outgoing labels E-F; notes5-8 G / 1-7; title/history H |
| H10-S03 | `CB21OP055B-10016-DR-EL-0089.pdf` | 0 / 10.06.22 / ISSUED FOR CONSTRUCTION | 1; complete AMR/IOP arrangement; Hopper10 branch E-G / 9-11; legend A-C / 11-12; title/history H. Re-reviewed station/line source, not another unique project file. |
| H10-S04 | `CB-10016-DR-EL-0011.pdf` | 0 / 27.10.25 / ISSUED FOR USE (SITE VERIFICATION & COMMENTS AMMENDED); AS BUILT stamp 27/10/2025; FOR INFORMATION ONLY | 1; Hopper10 C-D / 1-3; notes1-2 G / 1-3; title/history H. Re-reviewed shared overview. |
| H10-S05 | `CB19OP001B-04057-DR-EL-0001.pdf` | 6 / 28.01.25 / AS FOUND 23.10.23 | 1; entire CV006 distribution; Hopper10 source/line A / 1-12; title/history H. Re-reviewed cross-area source conflict; downstream CV006 remains owned by its area. |

Five original PDF pages were rendered at 90 dpi and visually inspected in full. Ten necessary crops from 180 dpi renders were inspected: RMU contact order, dual-primary transformers, RMU notes/title, MV assemblies, MV notes, motor labels, PL1 branch, PL1 legend, overview Hopper10 and CV006 source interface. SHA-256 values and normalized crop boxes are in `hopper-10-evidence.json`. Text search located candidate/reference names only; connectivity below was established visually. Poppler warned `No display font for 'Symbol'` on PL1; cited geometry/legend labels remained legible. This does not certify every protection glyph.

H10-S03/S04/S05 already occur in other area source tables. This review adds no duplicate unique-file claim for those re-reviews. H10-S01/S02 were awaiting source-table disposition in the coverage snapshot read for this task. No shared coverage file or original PDF was changed.

## Drawn power arrangement

Statements here describe the cited drawing, not accepted installed facts.

1. **PL1 interface:** H10-S03 p1 F-G / 10-11 shows pole286 on the IOP line branching through an **80 A fused air-break switch** and cable termination to `SUPPLY TO RMU420 (HOPPER 10)`, reference `520CBC0007-2130-DR-EL-0003`, with `3C 70 sqmm Cu XLPE` cable annotation. The nearby phase-to-earth rectangular arrow symbol is a **surge arrestor**, as explicitly identified by the H10-S03 legend A / 11-12. It is not an operable earth switch and must not become a permanent phase-earth conductive edge.
2. **RMU incoming:** H10-S01 p1 A-B / 8-9 says `POLE 286`, references PL1 and labels incoming cable `SR420-RM420-P01`. Cable-side `RM420 ES01` is above series `RM420-SW01 630A`, which joins one main bar labelled `33000V 630A 20kA FOR 1 SEC`. No internal bus section/tie is depicted.
3. **Transformer A branch:** H10-S01 p1 B-E / 3-4 draws main bar -> `RM420 CB01` -> `RM420 SW02` -> cable `SS420-TF420A-P01` -> `SS420-TF420A`. `RM420 ES02` branches from the cable side of SW02. The mechanical/key markings are distinct from conductors; SEL751A/control wiring is not an additional power route.
4. **Transformer B branch:** H10-S01 p1 B-E / 5-6 draws main bar -> `RM420 CB02` -> `RM420 SW03` -> `SS420-TF420B-P01` -> `SS420-TF420B`. `RM420 ES03` branches from the outgoing cable side.
5. **Spare branch:** H10-S01 p1 B-E / 7-8 draws `RM420 CB03`, `RM420 SW04`, `RM420 ES04` and an outgoing stub labelled `SPARE`. No external destination or installed cable continuation is established. Spare does not establish its actual state, commissioning or unavailability.
6. **Transformer outputs:** H10-S01 p1 E-F / 3-6 labels TF420A `2500kVA 33/22/6.9kV Z 6% DYN11`, with NER01/neutral CT earth arrangement; its secondary cable `SR420-MC420-P01` terminates at continuation **A**, matched on H10-S02. TF420B is `1500kVA 33/22/0.415kV Z 6% DYN11`; cable `SR420-MC420A-P01` terminates at continuation **B**. H10-S01 note3 explicitly describes **dual primary windings for 33 kV and 22 kV incomer**. Do not interpret both primary ratings as two simultaneously connected external sources, or invent primary-selection switching. Selected winding/terminal configuration, reverse transfer and earth transfer are **Unconfirmed**.
7. **MV continuation:** H10-S02 p1 A-D / 4-5 matches A / `FROM SS420-TF420A`, through a tier5 drawout `VCB 200A` to the continuous main bar labelled `6.6kV 200A 25kA, 3 Sec 3φ&E`. An earth branch is shown on the incoming cable side of that VCB. Preserve transformer `6.9kV` versus bus `6.6kV` labels; do not calculate or silently normalize them.
8. **MV motor equipment:** H10-S02 p1 C-F / 7-11 depicts two separately fed assemblies using tier1/2 and tier3/4 paired fused contactors, mechanical/electrical/key interlock symbols, phase-side earthing branches, and two 450 kW MV motor paths. The motors are labelled `SZ010-EM01` and `SZ010-EM02`; both descriptions read `SIZER MAIN DRIVE NO.1`, an unresolved repeated description. `SZ010-EM01-JB01` / `SZ010-EM02-JB01` and heaters `SZ010-EM01-HE01` / `SZ010-EM02-HE01` have separate labelled lines. Do not join heater/control conductors to the main MV phase route. These are MV interfaces, not final LV buses; no LV conversion after the motors is established here. Actual contactor/withdrawal/earthing position sets and exact unique control tags remain **Unconfirmed**.

## Final LV endpoint and coverage limits

- H10-S04 p1 D / 1-3 labels TF420B's output `MC420A`; H10-S01 continuation B supplies the matching `SR420-MC420A-P01` label. **Inference:** these describe the same intended LV destination. H10-S01/S02 do not show MC420A's LV main incomer and phase bus. Represent an explicit provisional MC420A destination/coverage boundary; do not claim a detailed supported LV bus or invent an incoming breaker tag.
- H10-S02 includes `SR420-DB420B` 24/48 VDC control-supply references `520CBC0007-2130-DR-EL-0055/-0056` and `SR420-DB4201` 240 VAC reference `-0059`. These are auxiliary/control references, not proof of another HV-fed final LV bus or proof that DB420B and MC420A are the same asset.
- A filename search of the supplied original repository found the two 520CBC0007 PDFs in the source table, not the `-0050/-0051/-0053/-0055/-0056/-0059/-0071/-0072/-0073/-0074/-0076` detail references visible on H10-S02. **Unconfirmed:** equivalent endpoint/key/control coverage may exist under another name. Missing exact names alone do not establish absent coverage.
- H10-S02 note6 references `CB19OP001C-01068-DR-EL-002`. A supplied `CB19OP001C-01068-DR-EL-0002.pdf` exists and is already reviewed as MC419 in the western-hoppers review. It was **referenced only, not re-reviewed here**. Exact equivalence, relevance to Hopper10 and any intended upstream-device mapping remain **Unconfirmed**; do not report it simply as an absent drawing.
- PL1's Bigge/Norfolk continuations reference `CB22OP050B-10018-DR-EL-0032`. That exact original is outside the original 141-file set, but the supplemental PIMS copy and its prior review exist under `drawings/supplemental-pims/` / `drawing-review/supplemental/farwest-review.md`. Those files were **referenced only, not re-reviewed or counted here**. No extra Hopper10 supply is inferred.

## Source discrepancy requiring owner reconciliation

H10-S05 p1 A / 1-12 depicts pole286's fused/ABS branch to Hopper10 as part of the **22 kV** line supplied from **SR411 tier03**, with poles201 / 49-38-1 and a recloser route. H10-S03 depicts a **33 kV** station TF04 / AMR / IOP route to pole286, and H10-S01 labels the RM420 bar **33 kV**. Dual-primary transformer note3 supports a choice of rated primary arrangement; it does not resolve which external network is installed or allow joining two differing source depictions. Preserve separate PL1 and CV006/SW411 candidate interfaces and this discrepancy. No revision-precedence or installed-current decision is recorded.

## Interlock evidence and limits

| Ref | Exact source | Explicit statement / limit |
| --- | --- | --- |
| H10-I01 | H10-S01 rev3 p1 note1, G / 8-10 | RM420 earth switch is to have **administrative controls**, and be closed before the downstream earth switch is closed. This does not expressly establish a physical device that prevents a conflicting action; exact upstream earth-device identity is not specified by the general wording. |
| H10-I02 | H10-S01 rev3 p1 note4, G / 8-10; switch/earth mechanical/key symbols C / 3-8 | Ronis key is free at DS open and ES open; the same key is used for disconnector and earth switch, unique per feeder. The source does not confirm full key ownership/exchange states or a complete executable truth table. |
| H10-I03 | H10-S02 rev2 p1 note5, G / 1-6 | Sizer-maintenance Ronis key is captive when earth switch is **ON**. Do not substitute other hoppers' different ON/OFF wording. |
| H10-I04 | H10-S02 rev2 p1 note6, G / 1-6; incoming earth symbol D / 4 | Says the 6.9 kV earth switch can close after upstream earth switch closes, and references the CB19OP001C document above. Exact upstream device, physical implementation and applicability of the referenced different project remain **Unconfirmed**. |
| H10-I05 | H10-S02 rev2 p1 note8, G / 1-6; motor assembly symbols C-D / 7-11 | Door-mounted switch is padlockable only OFF. Mechanical/electrical/key interlock legend and symbols are present. Complete supported contactor/earthing/withdrawal states and permitted transitions are not established by this note alone. |

## Open owner-review questions

| ID | Confirmation needed |
| --- | --- |
| H10-Q01 | Resolve PL1/station 33 kV versus CV006/SW411 tier03 22 kV pole286 source depictions and installed primary selection. Keep candidate networks separate. |
| H10-Q02 | Resolve overview's repeated third-feeder `RM420-SW03` / `RM420-ES03` against detail's `SW04` / `ES04`; preserve branch-role identities and aliases, not a merged pair of devices. |
| H10-Q03 | Confirm MC420A first LV incomer/bus and reconcile auxiliary DB420B/DB4201 identities/coverage. Do not fabricate endpoint controls. |
| H10-Q04 | Confirm transformer dual-primary wiring/selection, source/reverse transfer, independent earth transfer and 6.9/6.6 kV labels. NER/neutral grounding is not a phase-earth shortcut. |
| H10-Q05 | Confirm unique MV contactor, earthing, drawout and motor identities; repeated EM02 description NO.1 is not an identity merge. |
| H10-Q06 | Resolve full physical interlock/key conditions, note6's CB19OP001C reference and exact upstream-earth mapping; keep administrative instructions distinct. |
| H10-Q07 | Confirm installed spare status, actual positions, source availability and agreed baseline. Drawn open symbols and AS FOUND/AS BUILT stamps do not establish those choices. |

No source in this review expressly grants switching permission. Permission and installed acceptance are **not confirmed**. No runtime model, coverage total, GitHub issue or source PDF was modified.
