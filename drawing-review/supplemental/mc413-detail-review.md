# Supplemental MC413 first LV detail

Reviewed 22 October 2026. This is one additional source page, separate from the original 141 supplied filenames. The original supplied 2350 overview was revisited for reference comparison; that revisit adds no new original-source coverage.

## Verified source and provenance

| Source | Exact identity / revision | Inspected material |
| --- | --- | --- |
| MC413 detail | `00151-CB-02006-DR-EL-1001`, revision 11, 14.11.25, ISSUED FOR CONSTRUCTION – CB25OP003A, PDF page 1 | PIMS current original attachment `00151-CB-02006-DR-EL-1001_11_IFC_02.pdf`, downloaded successfully through its native file link. Retained locally as `drawings/supplemental/00151-CB-02006-DR-EL-1001_rev11.pdf`. Complete page rendered at 120 dpi; incoming detail at 220 dpi. Root and a separate reviewer visually inspected both. |
| Referenced upstream overview | `11098-07110-EL-DR-2350.pdf`, printed07110-EL-DR-2350, revision 16, 31.05.16, AS BUILT, PDF page 1 | Original supplied general processing distribution overview, rendered and visually inspected again in full. It does not resolve RC001's equivalence to the detailed RM413 sheet. |

MC413 PDF SHA-256: `6bdcbed6bd3460ffa85e7c3642d45b990b7d043e6a461f5dfc4f70386e986f38`.

[Canonical PIMS MC413 record](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=00151-CB-02006-DR-EL-1001) identifies current revision 11, IFC, revision date 14/11/2025. The downloaded page's printed title/revision were checked independently of document metadata. Its vendor drawing IDs are 3258-EL-SLD-0001 and ELC-455-011; the vendor revision 10 is distinct from the principal drawing revision 11. CB17OP023A is the project number. The 04057-DR-EL-0033 reference is for outgoing MC413A, not this page's drawing number.

An exact shortened-reference search for CB-02006-DR-EL-1001 returned unrelated prefix matches, which were rejected. A focused MC413/TF413 search found the longer 00151-prefixed candidate. Two image-bearing indexed files were returned, but their images were not used as topology evidence: the portal original was downloaded and inspected instead. The indexed chunk suffix `:2` is not a PDF page number; the verified original has one page.

## Explicit depiction on revision 11, page1

- **A–B / 4–5:** incoming arrow FROM 22 kV RING MAIN UNIT RC001, reference 11098-07110-EL-DR-2350, through TF413-P-01. The transformer is TF413, 22 kV / 400 V, 2.0 MVA. Its auxiliary/control cable is separate from phase continuity.
- **C–D / 4–5:** the phase output passes through CB MC413 IN, 3000 A, then reaches the first MC413 phase bar.
- **D / 1–10:** the phase bar is labelled 400 V, 3000 A, 50 kA for 1 sec.
- **C / 5–7:** neutral bar, MEN link and earth bar are drawn separately. They do not establish a permanent phase-to-earth connection or a shared phase bridge.
- **D–G / 6–7:** MC413A is an outgoing 400 V MCC branch referencing 04057-DR-EL-0033, beyond the first MC413 bar. Outgoing motors, DBs, VSDs, UPS and auxiliaries are outside this tool's first-LV boundary.
- **A / 10–12 and revision 11 clouds:** construction notes concern motor-protection and contactor upgrades on outgoing circuits. They establish no complete incoming-device position or physical-interlock truth table. The source does not confirm switching is permitted.

## Initial `.14` construction treatment

Inference: the depicted incoming tag/rating and first-bar rating are attached provisionally to the existing source-scoped `rm413:mc413:cb` and `rm413:mc413:bus`. Their existing terminals, conductive position candidates, source/earth relationships, topology, baseline and unresolved interlock review are preserved. No transformer, source, earth, phase connection or outgoing LV asset is added. The existing TF413 is reused without changing its provisional winding policy.

`SV-MC413-SUPPLEMENT` records supported drawing content. Asset/connection knowledge remains provisional because installed identity and reference equivalence are not confirmed. `SV-MC413-INSTALLED` stays open for RC001 / ref 2350 versus RM413, the longer 1001 prefix, installed revision precedence, current positions, complete interlocks and independent transformer source/backfeed/earth policies. Existing `SV-Q08` and former missing-detail wording are updated as partial reviews, not resolved wholesale.

The helper clones its input and adds only evidence, review/caption refinement and one first-LV detail view. Historical area and whole-network packages retain their original content. A separately identified model version is required before distribution.

## Owner route correction retained in `.18`

On 22 October 2026, the project owner answered exactly “yes” to question21 confirming RM413's TF413 feeder → TF413 → MC413 and the differing RC001 reference as incorrect/old. `WN-MC413-RM413-SUPPLY` records that answer in `.18`. The current named supply binding is confirmed; RC001 is not its current feeder reference. **Unconfirmed:** whether that label's cause is an old name or an error, document-prefix equivalence, installed revision precedence, ratings, actual positions, full physical interlocks and independent winding/backfeed/earth policies. No RC001 physical asset is created or merged. The source depiction above and the historical `.14` treatment remain unchanged. See the [exact question/answer and route record](owner-hopper-routes-review.md).

## Software evidence and limits

Two targeted checks use only the approved SimulationSession boundary: source/caption refinement, unchanged electrical relationships and baseline, blocked incomer, original-package preservation, upstream view navigation and a self-contained historical scenario. Both first failed against a no-op helper, then passed. These results establish software behaviour; they do not accept the installed network.
