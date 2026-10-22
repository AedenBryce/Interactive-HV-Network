# Initial drawing intake and mapping

## Intake result

The supplied folder `drawings/Asset Drawing Repo/` contains 141 PDFs, each with one page, totalling 48,432,828 bytes. There are 140 distinct SHA-256 file hashes and no PDF read failures in the completed inventory pass. Fifty-three PDFs have fewer than 100 extracted text characters; this is a text-extraction result, not a finding that those drawings contain no information.

Files retained:

- [Drawing register](drawing-register.md): every supplied PDF, its page count, and text availability.
- [Machine-readable inventory](inventory.json): file hashes, dimensions, PDF metadata, and extraction locations. PDF metadata is not a verified drawing title or revision.
- `extracted-text/`: plain text for searching; connectivity must be checked visually.
- `layout-text/`: initial layout extraction, which omits some rotated text and failed for two files. Use plain extraction and the PDFs instead of treating this output as complete.
- [Initial review queue](review-queue.md): unresolved matters to reconcile with the owner.

The two `11098-07110-EL-DR-2465` files, including the copy with `(2)` in its name, have identical file contents. Neither original was changed or removed.

## Visual review performed

Seven complete pages were rendered and inspected. Title-block crops were also inspected for the 53 files with little or no extracted text; some rotated crops were insufficient to read the title. A title-block inspection is not a complete diagram review.

| Ref | Document | Verified title / subject | Project drawing revision | Page | Review use |
| --- | --- | --- | --- | --- | --- |
| S1 | [CB-10016-DR-EL-0010](../drawings/Asset%20Drawing%20Repo/CB-10016-DR-EL-0010.pdf) | Cloudbreak OPF HV power distribution overview, sheet 1 of 2 | 0, 27 October 2025 | 1 | Starting index into the OPF branches |
| S2 | [CB-10016-DR-EL-0011](../drawings/Asset%20Drawing%20Repo/CB-10016-DR-EL-0011.pdf) | Cloudbreak OPF HV power distribution overview, sheet 2 of 2 | 0, 27 October 2025 | 1 | Starting index into the remaining OPF branches |
| S3 | [11098-07110-EL-DR-5151](../drawings/Asset%20Drawing%20Repo/11098-07110-EL-DR-5151.pdf) | Main HV switchroom single line diagram | 7, 28 January 2025; revision entry says "AS FOUND 23.10.23" | 1 | SW411 device detail and cross-references |
| S4 | [11098-07110-EL-DR-2350](../drawings/Asset%20Drawing%20Repo/11098-07110-EL-DR-2350.pdf) | Mine power distribution single line diagram | 16, 31 May 2016 | 1 | Earlier distribution arrangement; source referenced by S3 note 4 |
| S5 | [500CBC0002-13015-DR-EL-0001](../drawings/Asset%20Drawing%20Repo/500CBC0002-13015-DR-EL-0001.pdf) | Cloudbreak power station power distribution single line diagram | 3, 18 July 2022 | 1 | SB01/SB02, generator branches, transformers and external connections |
| S6 | [CB21OP055B-10016-DR-EL-0089](../drawings/Asset%20Drawing%20Repo/CB21OP055B-10016-DR-EL-0089.pdf) | Cloudbreak 33 kV powerline general arrangement single line diagram | 0, 10 June 2022 | 1 | 33 kV line, RMU420 branch, and off-page references |
| S7 | [11098-07110-EL-DR-2467](../drawings/Asset%20Drawing%20Repo/11098-07110-EL-DR-2467.pdf) | SW423 screening single line diagram, sheet 3 | 10, 18 November 2025 | 1 | Boundary check: the shown outgoing drive circuits are beyond the agreed LV bus endpoint |

S1 and S2, page 1, notes 1 and 2 explicitly describe those sheets as high-level reference overviews and say not to use those drawings for isolation purposes. Detailed SLDs and confirmed interlock information still need to be reconciled. No precedence rule between overview and detailed sheets has been agreed.

## First network scope index

The following tags are visible in the inspected source pages. This index records where to continue the review; it is not a complete asset register or an accepted connectivity model. Current installed arrangements and starting states remain unconfirmed.

| Area in the inspected drawings | Tags to review | Source |
| --- | --- | --- |
| Power station | SB01, SB02 | S5, page 1, upper and lower switchboard diagrams |
| Main HV switchroom | SW411 | S1/S2, page 1, upper diagrams; S3 |
| Crushing No. 2 | SW435 | S1, page 1, upper right |
| Lump stockpile | SW454 | S1, page 1, middle left |
| Wet scrubbing / screening | SW505 | S1, page 1, lower left |
| Train loading | SW451 | S1, page 1, lower middle |
| CV006 head and tail ends | RM406, RM410 | S1, page 1, middle |
| HP007 and HP009 | RM418, RM419 | S1, page 1, lower right |
| HPGR | SW002 | S1, page 1, middle right |
| Crushing No. 1 | SW431 | S2, page 1, middle left |
| Desands | SW426 | S2, page 1, lower left |
| Screening | SW421 | S2, page 1, lower middle |
| Hopper 10 | RM420 | S2, page 1, middle left; S6 RMU420 outgoing reference |
| Workshop services | RM721 | S2, page 1, upper middle |
| Services building | RM712 | S2, page 1, upper right |
| Mine dump pocket | RM412 | S2, page 1, middle |
| Workshop substation | RM713 | S2, page 1, middle right |
| West overland conveyor | RM413A | S2, page 1, middle right |
| Secondary sizer | RM413 | S2, page 1, lower right |
| Hopper 1 | RM417 | S2, page 1, lower right |
| Laboratory | RM714 | S2, page 1, lower left |

This is 24 switchboard/RMU tags from the starting sheets, not the total network count. The remaining sources, including camp, mine distribution, downstream HV boards and LV endpoint details, still require diagram review.

## Next mapping work

1. Reconcile the SW411 bus sections, incomers and feeder identifiers against their detailed sheets.
2. Continue through each outgoing branch to its HV equipment and final LV buses, retaining source references for every recorded connection.
3. Review the station and overhead-line interfaces, distinguishing a drawn connection from a confirmed enabled source.
4. Review camp and mine distribution sheets, alongside the OPF branches.
5. Extract device states and interlocks only where explicitly established; retain unresolved conditions in the review queue.
6. Complete the drawing review before presenting the accumulated discrepancies for step-by-step owner confirmation.
