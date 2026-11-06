# Supplemental Hopper3 and Hopper8 endpoint review

Reviewed 22 October 2026. Three distinct complete drawing pages were visually inspected. Hopper3 MV was inspected both as an indexed capture and as a full render of its original PDF, plus one motor-contact detail crop; these are repeated views of the same source page, not additional drawing coverage. This review supplements the earlier western and endpoint reviews without recounting the original supplied-PDF inventory.

## Reviewed source register

| Review ID | Original/indexed filename | Exact document / revision / page | Inspected material and provenance |
| --- | --- | --- | --- |
| WX-S01 | CB16OP038A-02006-DR-EL-0166_rev1.pdf | CB16OP038A-02006-DR-EL-0166; rev1; page1; AS BUILT, handwritten date Unconfirmed | Original retained under `drawings/supplemental/`; full render `tmp/pdfs/hopper3-mv-original.png`, detail `tmp/pdfs/hopper3-motor-detail.png`, and indexed full page `drawings/supplemental/source-captures/hopper3-mv-0166-indexed.png` independently inspected. Indexed file: `89ab76ae-0b2f-400f-b667-f5527e901352.pdf`. |
| WX-S02 | 8f429b8e-4080-402e-9ef9-029aabc6d8df.pdf | CB17OP023D-01006-DR-EL-0002; rev2; 28/01/25; AS FOUND 23.10.23; page1 | Full indexed page `drawings/supplemental/source-captures/hopper8-mv-0002-indexed.png` inspected. Original PDF download was not verified. |
| WX-S03 | 2c3ebfae-8fe6-453e-abce-51cee14f3bba.pdf | CB17OP023D-01006-DR-EL-0003; rev1; 20/09/18; AS BUILT; page1 | Full indexed page `drawings/supplemental/source-captures/hopper8-lv-0003-indexed.png` inspected. Original PDF download was not verified. |

Canonical PIMS records: [Hopper3 MV](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=CB16OP038A-02006-DR-EL-0166), [Hopper8 MV](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=CB17OP023D-01006-DR-EL-0002), [Hopper8 LV](https://pims.fortescue.com/dcs-documents-details?Domain=FMG&DocID=CB17OP023D-01006-DR-EL-0003).

Image-bearing canonical search chunks, each returned with `hasImages=true`, `imageCount=1`:

- `FMG:CB16OP038A-02006-DR-EL-0166:89ab76ae-0b2f-400f-b667-f5527e901352.pdf:0`
- `FMG:CB17OP023D-01006-DR-EL-0002:8f429b8e-4080-402e-9ef9-029aabc6d8df.pdf:0`
- `FMG:CB17OP023D-01006-DR-EL-0003:2c3ebfae-8fe6-453e-abce-51cee14f3bba.pdf:0`

Other indexed Hopper8 files returned by search were not visually reviewed here and are not counted. The exact searches excluded superseded documents. Printed revisions on the selected captures were inspected; document-level metadata alone was not used to assign revisions to individual files.

### Independently checked SHA-256 fingerprints

- Hopper3 original PDF: `ec2393001073a8a415ec3db0842089ec1b6c2acd3379276f83f7e4e049a25441`.
- Hopper3 indexed full-page capture: `af6b1028625db9e5c2f62828579e09064ce88ad30feb3eb7a3c3896660c8158a`.
- Hopper3 original full-page render: `439dfa8daaf89560519b2bb600f71e01a6e43515370d4e27f25083b1f1c79cb0`.
- Hopper3 phase/motor detail crop: `02d5672d7b6b623842365909c394b61c5b86f421b64cbda5ef7c765dd2da366e`.
- Hopper8 MV indexed capture: `664d453b1ddbe9bdda1a2b93f845c7993ffe8ab2f03cc3c7f477952937f2e08c`.
- Hopper8 LV indexed capture: `0b1ea7a8210171ae43c195f79a690955cc8244a0b27808c63334e21dd9650681`.

The last two hashes identify captures, not original PDFs. Hopper8 original-PDF hashes remain Unconfirmed.

## MV phase topology confirmed as depicted

Both WX-S01 and WX-S02, page1, A / 2-11 label the SS416-MC416 phase bar **6.6kV, 200A, 25kA, 3 seconds**. Tier1 at B-D / 4-5 contains a **VCB 200A**; its incoming cable continues below the VCB toward TF416, and the note6 earth branch attaches on that cable side. The earth must not be moved to the phase-bar side of an open incoming VCB.

Motor1 occupies tiers2/3, approximately B-F / 7-8. Motor2 occupies tiers4/5, approximately B-F / 10-11. Each group shows two parallel phase routes: a 100A fuse and RC400A main contact in one route, a 100A fuse and FC400A main contact in the other. Their phase conductors meet at the common motor-side conductor. The note5 maintenance earth branches separately from that common conductor. Dotted FC/RC auxiliary contacts in adjacent control rails, dotted mechanism/interlock connections, CT/VT, metering and trip wiring are not additional phase routes.

WX-S01 E-F / 7-11 labels **SZ003-EM01** and **SZ003-EM02**, each **400kW**. WX-S02 E-F / 7-11 labels **SZ008-EM01** and **SZ008-EM02**, each **400kW**. These identities are retained separately from each other and from Hopper10 SZ010 assets. Heater/JB/control branches are excluded from phase connectivity.

Inference: intact fuse continuity is represented as a provisional candidate for each depicted 100A fuse. Actual fuse condition/removal is Unconfirmed. No accepted fuse condition or installed contactor state is inferred from the drawing.

## Key and physical interlock limits

WX-S01 and WX-S02, page1, G / 1-7, notes5-6 state:

- Note5: sizer maintenance key interlock, Ronis system; key captive when earth switch OFF.
- Note6: 6.9kV HV key interlock; earth switch can be closed after the upstream earth switch is closed; key captive when earth switch ON.

The incoming and motor interlock glyphs appear around C-D / 4-5 and / 7-11. Exact keys, full upstream-device identity, racking/position set, paired-contactor dependencies and complete installed physical truth tables are Unconfirmed. The source does not confirm switching is permitted. All 17 added actual controls have null states and explicit unresolved interlock reviews; no executable installed rule is invented from these partial notes.

## Hopper8 first LV endpoint

WX-S03, page1, A-C / 8-10 depicts the SS416-TF416A phase continuation marked D feeding a **MCCB630A**. Instrumentation continuation Da is separate. C-D / 1-11 depicts the SS416-MC416A phase bar labelled **630A, 25kA, 1 second, 3-phase N&E, 415VAC**. The extension stops at this first LV phase bar. Outgoing DB, motor, fan, VSD, heater and auxiliary/control circuits are excluded. Neutral/earth notation is not converted into a permanent phase-earth link.

## Remaining questions and representation boundary

- **Unconfirmed voltage/policy:** existing TF416 references are labelled 6.9kV; these MV phase bars are labelled 6.6kV. No voltage calculation, governing-revision decision, universal winding transfer or cross-winding earth rule is inferred. The existing provisional source pairs and independent earth-pair arrays remain unchanged, together with their unknown winding coverage.
- **Unconfirmed installed identities:** Hopper3 and Hopper8 reuse SS416/TF416/TF416A names under different project/feed references. Source-scoped `wh:h3:*` and `wh:h8:*` identities remain separate. No transformer or parallel source is duplicated or joined.
- **Partial gap closure:** Hopper3 -0166 and Hopper8 -0002/-0003 source pages are now available and represented. `WH-Q07` and the three former gap-interface labels are updated in the cloned model. The earlier Hopper3 LV -0165 endpoint remains intact. Installed identity, source/reverse/earth policy, governing revisions, all starting states and complete interlocks remain open.
- **Unconfirmed original H8 download:** only the selected retained image-bearing captures were verified. Their original-PDF hashes are not established.

`withWesternDetails(base, version)` clones its input and adds 36 assets, 40 links, 6 explicit earth terminations and 7 views: one MV overview and two separate motor details per hopper, plus one Hopper8 LV detail. The 36 assets comprise 17 null/blocked controls, 8 provisional phase-fuse interfaces, 4 motor common-conductor interfaces, 4 MV motor endpoints, 2 MV bars and 1 final LV bar. It adds no transformer, electrical source, outgoing LV branch or MEN/neutral phase shortcut. Coordinates, navigation boundaries and region tiles are presentation only.

New role-based IDs distinguish source-scoped incoming devices, RC/FC phase contacts, common conductors and maintenance-earth branches. They are construction identities, not a claim that the drawings print those exact equipment tags.

Fictional operability tests define their own identity/version, intact fuses, source relationships, positions and absence of interlocks. Their switching results establish software behaviour only. This construction does not accept the installed network or establish switching permission.
