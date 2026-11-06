# Supplemental first-LV-endpoint source review

Reviewed 22 October 2026. This review supplements the existing stockpile and western-hopper source reviews. It does not add to or recount the original supplied-PDF inventory. Three complete source pages were visually inspected, plus one MC454 incoming-detail crop. Search descriptions were not used as topology evidence.

## Reviewed sources

| Review ID | Source/indexed filename | Exact PIMS document ID / printed number | Revision / page | Visual material inspected |
| --- | --- | --- | --- | --- |
| EP-S01 | aaa1f0c6-8bcb-4135-b87e-831cc68e8bc2.pdf | 11098-04400-EL-DR-8020 / 04400-EL-DR-8020 | 3 / 1; AS BUILT 17/08/2009 | Full page: `tmp/pdfs/endpoint-sw455-view.png`. The original PDF was not downloaded; this is the indexed file identity supplied with the first-party image-bearing source. |
| EP-S02 | ac984061-5e7b-45df-9a26-435384ecac27.pdf | CB16OP038A-02006-DR-EL-0165 / same printed number | 1 / 1; handwritten revision date Unconfirmed | Full page: `tmp/pdfs/endpoint-hopper3-view.png`. The original PDF was not downloaded; this is the indexed file identity supplied with the first-party image-bearing source. |
| EP-S03 | 11098-04400-EL-DR-8010_6_IFC_02.pdf | 11098-04400-EL-DR-8010 / 04400-EL-DR-8010 | 6 / 1; ISSUED FOR CONSTRUCTION 19/11/25 | Original portal PDF downloaded by root to `C:/Users/f676001/Downloads/11098-04400-EL-DR-8010_6_IFC_02.pdf`; full render `tmp/pdfs/endpoint-mc454-rev6.png` and incoming crop `tmp/pdfs/endpoint-mc454-incoming.png` visually inspected independently. |

Canonical portal records: [8020](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=11098-04400-EL-DR-8020), [Hopper3 0165](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=CB16OP038A-02006-DR-EL-0165), [8010](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=11098-04400-EL-DR-8010).

Audit copies of the first two full-page captures are retained locally in `drawings/supplemental/source-captures/` under the filenames above. The original MC454 PDF is retained locally as `drawings/supplemental/11098-04400-EL-DR-8010_rev6_IFC.pdf` with the hash below. These ignored source files are not application dependencies or Git deliverables. Render/crop paths under `tmp/` are temporary review intermediates.

### Fingerprints

These are SHA-256 hashes independently computed from the named local material. PNG hashes identify the reviewed captures; they are not original-PDF hashes.

- EP-S01 full-page capture: `7f9273ae4967a7c7e44912914b3dfb359296e2867061b90a547cb8cb6024cd70`. Original PDF hash: Unconfirmed; no local PDF was available.
- EP-S02 full-page capture: `8a56872250d1c85f3d99735f3c05413d6d7a78e9c4f28466775634788917a065`. Original PDF hash: Unconfirmed; no local PDF was available.
- EP-S03 original PDF: `32b0fdbac0c2ecbe39c3b9a7b81dbf80030e8e2f7b1145b446a22018f00d969c`.
- EP-S03 full-page render: `6cc826debfc22b33f595a414f17ad209f26c9050244e698374db45a15615c951`.
- EP-S03 incoming crop: `ae3032795af2cc999e4b67df3396f2e07a540429853437dcb2b658220811d68c`.

## Depicted endpoint facts

### SW455: two separate 690 V bars

EP-S01, revision 3, page 1, A-B / 4-9 depicts TF455 labelled 22 kV / 690 V / 690 V, 5 MVA, with separate delta and star outputs. B-C / 2 and 10 depicts separate `CB SW455 IN D` and `CB SW455 IN Y`, each labelled 2500 A. C-D / 1-10 depicts distinct D/Y phase bars, each labelled 690 V, 2500 A, 50 kA for 1 second. The two displayed phase bars have no drawn direct tie on this page.

The extension reuses `sw454:tf455:transformer` and the existing two ports of `sw454:interface:sw455`. It adds the two incoming controls and two final phase bars. Outgoing VSD, motor, UPS and marshalling/control circuits below those bars are excluded. Screen earth at TF455 and control/CT cables from SW454 do not establish a phase-earth connection.

Unconfirmed: installed precedence of this 2009 as-built sheet against the later supplied stockpile drawing, actual positions, complete physical interlocks and transformer source/backfeed/earth policy. The source does not confirm switching is permitted. The earlier missing-8020 evidence/review is updated to record receipt of this supplemental page; original source references and the open installed-review gate are retained.

### Hopper3: SS416-MC416A first 415 VAC bar

EP-S02, revision 1, page 1, A-C / 8-9 depicts the `SS416-TF416A` reference and incoming phase conductor through `MCCB 630A`. The adjacent `SS416-PN01` reference is remote switching/control context. C-D / 1-11 depicts the `SS416-MC416A` phase bar labelled 630 A, 25 kA, 1 second, 3-phase N&E, 415 VAC. Neutral/earth designation does not establish a permanent phase-earth connection.

The extension reuses `wh:h3:tf416a` and `wh:h3:mc416a:interface`; it adds one null/blocked incoming MCCB and one final phase bar. Outgoing motor, DB, VSD and auxiliary circuits are excluded. The electrical-interlock example in the legend and outgoing switching symbols do not confirm a complete incoming-device interlock rule.

Unconfirmed: handwritten date, current installed precedence, full incoming positions/interlocks, winding/backfeed/earth policy, and the repeated SS416/TF416/TF416A identifiers under Hopper8. Source-scoped Hopper3 and Hopper8 identities remain separate. Hopper3 MV document `CB16OP038A-02006-DR-EL-0166` and Hopper8 `CB17OP023D-01006-DR-EL-0002` / `-0003` remain unresolved source gaps. `WH-Q07` is updated only for receipt of Hopper3 LV `-0165`; it stays open.

### MC454: preserve the 3000 A / 500 A discrepancy

EP-S03, revision 6, page 1, A-B / 3-5 depicts the SW454 reference and TF454 labelled 22 kV / 400 V, 2.0 MVA. C-D / 3-5 depicts `CB MC454 IN` labelled 3000 A. D / 1-10 explicitly labels the phase bar `400V, 500A, 50kA FOR 1 Sec`. Those two current ratings are preserved exactly; a corrected value is not confirmed by the source. The revision table at H / 2-6 records revision 6, 19/11/25, issued for construction; the title/revision box is H / 11-12.

The extension reuses `sw454:tf454:transformer` and `sw454:interface:mc454-mc455`, adds the incoming breaker and MC454 first LV bar, and stops there. The separate neutral bar, MEN link and earth bar at C-D / 5-6 do not form a phase-earth link. MC455 is explicitly depicted as an outgoing branch at D-G / 9-10, after this first LV bar; no MC455 bus or outgoing circuit is added. The 8011 page continuation does not justify extending beyond the agreed endpoint.

Unconfirmed: printed 3000 A versus 500 A rating reconciliation, current installed arrangement, IFC precedence, positions, full interlock conditions and transformer policy. `EP-MC454-RATING` remains open. The earlier MC454/MC455 missing-detail review becomes a partial installed/rating review, preserving its original source references.

## Model boundary and acceptance

`withSupplementalEndpoints(base, version)` clones the base package and extends existing source-scoped interface ports. It adds four incoming controls, four first LV phase bars, eight endpoint links, three detail views and cross-view navigation. It creates no transformer, enabled source, neutral/MEN connection or outgoing LV circuit. Existing provisional source pairs and empty earth-pair declarations remain unchanged, with their unconfirmed winding coverage retained. All four added actual control states are null and blocked by explicit unresolved interlock reviews.

Inference: the existing transformer-output/interface identities are used to connect the corresponding drawn supplemental endpoint paths. Their cross-document installed identity and revision precedence remain subject to owner review. Model construction and passing session tests do not establish installed-network acceptance or switching permission.
