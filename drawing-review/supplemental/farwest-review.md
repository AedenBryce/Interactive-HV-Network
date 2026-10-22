# Supplemental Farwest source lead

Reviewed 22 October 2026. This source is additional to the original 141-PDF intake. It has not been incorporated into a runtime model or owner-accepted scope.

**Later owner scope decision, 22 October 2026:** “that 33kV line is only relevant for the Hopper 10 stuff. Can show the branch points but no further details from that”. FW-R01 is resolved for scope: retain takeoff points only for the other branches; Norfolk/Bigge/Farwest downstream detail and its final LV endpoints are excluded. FW-R03 is therefore not an active endpoint request for those excluded branches. FW-R02 remains applicable to any retained main-line/takeoff reconciliation; the answer does not confirm commissioning or drawing precedence. See the [exact decision record](owner-scope-connections-review.md). The review below records the source as inspected before that answer.

## Verified source

| Ref | Local source | Drawing revision | PDF page / inspected region |
| --- | --- | --- | --- |
| FW1 | `drawings/supplemental-pims/CB22OP050B-10018-DR-EL-0032_9_IFC_Distributable_01.pdf` | 9, 12 August 2026, issued for construction | Page 1, complete A1 page; enlarged title/revision table in row H and upper-left interfaces in A-C / 1-6 |

SHA-256: `462dca6a3cc31c458a441ae15a89fbc480094faf5bd4ff1e3de6fa3c41e89354`.

Retrieved through the [PIMS document portal](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=CB22OP050B-10018-DR-EL-0032). The search connector returned an indexed revision 8 file; the live portal listed revision 9, which was downloaded and visually checked. Neither revision number establishes installed status or precedence over supplied sources.

The complete page was rendered with Poppler at 110 dpi, with title and interface crops at 220 dpi. A Symbol-font warning was returned; the cited paths, labels and title fields were legible. No generated search description was used to establish junctions.

## Depicted interfaces

FW1 page 1 B / 2-4 depicts the main line through poles 227, 272 and 284, with continuation arrows to pole 215 on the left and pole 286 on the right. Both arrows cite `CB21OP055B-10016-DR-EL-0089`. The Norfolk branch leaves pole 227 through a switch, continues through 227-1 and 227-2 and a recloser symbol toward 227-4. The pole-272 branch has an air-break switch toward 272-1; its future continuation remains labelled as such. The pole-284 upper branch passes through a 100 A fused switch toward 284B-1 and the pond-transformer branch. The lower branch contains switch/recloser symbols toward 284A-1 and the Bigge pole network. These paths require reconciliation with the supplied revision-0 line drawing before integration.

The complete page depicts additional Norfolk and Bigge transformer/DB branches and further named interfaces. The lower-right title block identifies the Farwest dewatering 33 kV network. **Unconfirmed:** which of these branches belongs to the owner's intended V1 network boundary, the completeness of final LV buses/incomers, physical interlocks, transformer transfer/earth relationships and starting configuration. No source availability is established.

## Open review items

- FW-R01: confirm the V1 extent of the Norfolk/Bigge/Farwest continuations, then review each included branch in detail.
- FW-R02: reconcile the supplied line drawing with this supplemental revision without inferring precedence or commissioning from dates.
- FW-R03: obtain or confirm final LV bus/incomer details for included off-page DB/MCC arrows.

Other exact-reference searches (`DB01-SL-001`, `07110-EL-DR-6160`, `CBSS-ES-SLD-70-80-0001`) returned references or candidate documents, rather than an exact document-ID match. This does not prove that the drawings are absent. DB-01 is mentioned in an indexed station IOM (`500CBC0002-13015-IM-QA-0002`); its original drawing image/revision has not been reviewed here.

The live [station IOM portal](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=500CBC0002-13015-IM-QA-0002) lists manual revision 0 and a PDF file. The PDF download did not complete; opening the native file link then produced Chrome's `ERR_BLOCKED_BY_CLIENT` page. No bypass was attempted. The manual is a source lead only, with no confirmed DB-01 topology or drawing revision.
