# Hopper10 MC420A first LV endpoint

The supplemental drawing supplies the previously missing MC420A incomer and first LV phase bar. It does not establish the installed starting configuration, source availability, complete interlocks or transformer transfer policy. Whole-network acceptance remains pending.

## Source reviewed

| Source | Document | Printed revision | Visually reviewed page and regions |
| --- | --- | --- | --- |
| H10-LV01 | `520CBC0007-2130-DR-EL-0005` | 1, 20.01.22, AS BUILT | Page1 complete; A-B / 9-10 transformer continuationB and ACB01; C-D / 1-12 phase bar; lower reference/title/revision band |

Printed title: **HP010 CRUSHING FACILITY - LV MCC SINGLE LINE DIAGRAM SHEET 1 OF 2**. The upper equipment heading identifies **HOPPER10 SR420 SWITCHROOM (LV SECTION)** and **SR420-MC420A (LOW VOLTAGE MOTOR CONTROL CENTRE)**.

Review basis is the complete PIMS indexed image retained at `drawings/supplemental/source-captures/hopper10-lv-0005-indexed.png`. The full image and an in-memory crop of the incoming/main-switch region were independently inspected. Search extraction was a discovery lead, not the connectivity basis.

- Canonical image-bearing chunk: `FMG:520CBC0007-2130-DR-EL-0005:7dcc1cb1-b663-48a1-8e51-7b86a7a0b97a.pdf:0`.
- Indexed file ID: `7dcc1cb1-b663-48a1-8e51-7b86a7a0b97a.pdf`.
- PIMS search/fetch metadata: `hasImages=true`, `imageCount=1`; document metadata current revision1, stepAB, not superseded.
- Retained PNG SHA-256: `01356D65147A0B4918B8434035A6F6A28545B3BF4E957704612B1B4D6CD40840`.
- The original PDF was not downloaded in this review. Its binary SHA-256 and original-PDF file equivalence remain **Unconfirmed**. The hash above identifies the retained indexed PNG only.

Existing source `520CBC0007-2130-DR-EL-0003.pdf` rev3, page1 E-F / 5-6, supplies the already reviewed TF420B secondary continuationB/cable `SR420-MC420A-P01`; see the existing Hopper10 area review. This task does not claim a fresh full-page review of0003.

## Depicted phase route

| Record | Explicit depiction | Source |
| --- | --- | --- |
| H10-LV-T01 | Main incoming conductor is headed `FROM SS420-TF420B`, continuationB, with reference0003. The adjacent Ba trip and Bb transformer-instrumentation routes are control/instrumentation, not parallel phase supply paths. | H10-LV01 p1 A-B / 9-10 |
| H10-LV-T02 | That phase conductor passes through `ACB01 MAIN SWITCH`; the breaker rating labels read2000A. CT/protection and metering branches are not additional incoming power sources or independent main-path switches. | H10-LV01 p1 A-B / 9-10 |
| H10-LV-T03 | Below ACB01 the conductor joins the single horizontal phase bar labelled `2600A 80kA FOR1Sec415VAC`. This is the first LV bus endpoint. Its right continuation to0006 is a sheet continuation, not a second source or a bus tie. | H10-LV01 p1 C-D / 1-12 |
| H10-LV-T04 | DB420A/C, DB4201, DB420B battery/charger/control references and motor/VSD branches are drawn below or off that first phase bar. They do not replace the MC420A main LV bus and are outside this bus-only endpoint extension. | H10-LV01 p1 D-G / 1-12 |

The existing TF420B, its secondary terminal and MC420A interface are reused. No new transformer, source, earth termination, MEN phase-earth shortcut or outgoing LV circuit is created.

The separate `520CBC0007-2130-DR-EL-0004` is MC420 MV equipment, not this LV sheet. Existing 6.9kV transformer versus6.6kV MC420 MV label questions remain open. This LV source supplies no new transformer winding, reverse-transfer or earth-coupling rule.

## Runtime construction delta

`withHopper10Lv(base, version)` clones the supplied package and uses the caller's new immutable version. It does not import or alter the current owner-decision wrapper.

- New breaker: `rm420:mc420a:in:acb`, displayed as ACB01 main switch2000A. Candidate open/closed states are blocked by an explicit unresolved interlock review; actual starting state is null.
- New first phase bar: `rm420:mc420a:bus`,415VAC/2600A, with80kA1sec retained as a printed alias.
- Connections: `ep:h10:mc420a:incoming` from the existing interface to ACB01 and `ep:h10:mc420a:bar` from ACB01 to the phase bar.
- Existing `rm420:tf420b:lv-continuation` becomes a supported drawn continuation with the new source evidence. Transformer channel arrays and owner-confirmed selected33kV input links are unchanged.
- Evidence: `EP-H10-LV-ENDPOINT`; installed/position/interlock review: `EP-H10-LV-INSTALLED`.
- `H10-MC420A-GAP`, its interface caption and `H10-Q03` now identify the supplied0005 detail. H10-Q03 remains open for installed/revision/position/interlock scope; it no longer claims the incomer/bar drawing is missing.
- Detail view: `supplemental/hopper10-lv`, with upstream TF420B navigation and reverse navigation from existing views containing the interface. The transformer view caption becomes `Hopper 10 - Selected 33 kV inputs / MC420A LV` (the UI uses its normal middle-dot separator).

No position, availability or permission is inferred from AS BUILT, a drawn switch pose, note7's ground-fault CT statement or the absence of a complete interlock description. The source does not confirm switching is permitted. Complete installed/withdrawal states, physical interlocks and revision precedence remain **Unconfirmed**.

## Checks and remaining limits

Tests use the approved `SimulationSession` boundary with a distinct extension test version over `withSupplementalEndpoints(wholeNetworkModel, ...)`. They do not import the current-network wrapper. Separately identified fictional endpoint contracts define software-only states, source and earth branches; they establish no installed connectivity policy or permission.

The capture and document references remain provenance material. The runtime model/scenario contains topology, evidence, reviews and presentation without a PDF or image runtime dependency. Source depiction and passing tests are not model acceptance.
