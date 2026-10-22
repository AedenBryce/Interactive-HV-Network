# Owner review: whole-network construction

**Status: construction; whole-network owner acceptance pending.** This packet supports the project owner's review of represented topology, endpoints, sources, supported device positions, physical interlocks and the starting configuration. Scoped owner confirmations are recorded below; they do not establish whole-network acceptance or operating permission.

Review target: **`site-whole-network` / `construction-2026-10-22.8`**, exported as `currentNetworkModel` from `src/models/site/current-network.ts`. It extends the immutable historical `.4` base with separately cited supplemental endpoints. The maintainer must record its commit/package identity before any acceptance is recorded. The global review `WN-OWNER-ACCEPTANCE` remains open.

Versions `.5`, `.6` and `.7` were intermediate UI-QA packages containing the endpoint extension and caption refinements. Current `.8` retains those changes and adds the sixth scoped owner decision, confirming the tier 16 cable tag. Neither intermediate QA nor the current construction establishes whole-network owner acceptance.

The written `.8` package contains 969 assets, 562 controls, 28 sources and 361 coverage boundaries. Its 126 views include an orientation with 13 area regions, a separate former-line reference view and three supplemental LV detail views. There are 17 cross-area joins: 9 supported drawing relationships, 4 provisional and 4 owner-confirmed; the 2 owner-confirmed 33 kV primary links are separate internal connections. These are software inventory counts, not installed-network coverage or acceptance.

The task is to resolve each material discrepancy, or explicitly decide its model boundary and treatment, and then accept a specific immutable model and starting configuration. Preparing this packet, accounting for files and passing software checks do not establish acceptance. See [ticket #25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25) and the [specification](specs/interactive-hv-network.md).

## Inspect and record a decision

Run the application using the [local setup instructions](../README.md#run-locally). In **Model**, select the whole-network construction package. Start with its orientation view, then use the view selector or cross-area navigation to reach the relevant detail. Select the asset and inspect its aliases, evidence, open questions, source paths and earth paths. Pan, zoom and **Fit view** change the presentation only. The [construction guide](whole-network-construction.md) describes the joins and intentionally unjoined interfaces.

Current Hopper 10 detail titles are **Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed** and **Hopper 10 · Selected 33 kV inputs / MC420A gap**. They reflect the scoped owner confirmations; the MC420A detail gap remains open. The new endpoint views are `supplemental/sw455-lv`, `supplemental/hopper3-lv` and `supplemental/mc454-lv`.

Actual device positions and source availability are unconfirmed in this package. Unresolved physical-interlock reviews block switching. The synthetic examples can demonstrate the software interactions; their invented configuration provides no installed-network evidence.

For each decision below, retain one record containing:

- Review ID(s), exact model ID/version, affected asset/terminal/connection IDs and the decision text.
- Supporting drawing filename, revision, page and region, plus any additional owner-supplied evidence and its identity.
- What is explicitly confirmed, what remains **Unconfirmed**, and the agreed model treatment of any remaining boundary.
- Owner identity and decision date; the maintainer's resulting package/version and linked implementation record.

This is a record format, not a pre-filled approval. Do not close a question merely because a source is absent or newer. The model's evidence records and linked area reviews retain the detailed references; this packet groups the owner decisions without replacing those records.

## 1. Record the CV006 / Hopper 10 confirmations

**Confirmed owner decisions, 22 October 2026:**

- “the 33kV TF04 line feeds Hopper10” — project owner (conversation), **WN-H10-TF04-SOURCE**.
- “They are connected with 33kV from the Primary to the 33kV Bus, back through RM420-SW01 onto the 33kV line fed from TF04 supply” — project owner (conversation), **WN-H10-PRIMARY33-CONFIGURATION**, confirming both TF420A/B selected 33 kV primary connections, the current RM420 33 kV bus and the supply path through RM420-SW01.
- “Rm406 and Rm410 do get their 22kV from SW411 tier 03. The line coming off pole 49-38-1 to Hopper 10 does not exist anymore. It used to be 22kV to hopper 10 but now that is a 33kV line.” — project owner (conversation), **WN-CV006-FEED-AND-REMOVED-H10**, confirming the current SW411 tier 03 → RM406/RM410 22 kV feed and removal of the former 22 kV branch toward Hopper 10.

These confirmations do not establish current positions, source availability, physical-interlock conditions, earth continuity or transformer backfeed policy. They are not whole-model acceptance.

The current sources and the former 22 kV Hopper 10 branch are therefore no longer unanswered feeding-route questions. **Unconfirmed residuals:** which physical pole/switch hardware remains from the former branch, the exact extent of obsolete hardware, and correspondence between the legacy CV006 pole labels and current 33 kV line assets. No automatic identity merge follows from shared pole numbers. The SW411 incomer mapping, tier 16 model CB/ES labels and cable tag are also confirmed below; physical nameplate verification and whole-route acceptance remain unconfirmed.

| Exact source | Explicit depiction / location |
| --- | --- |
| `CB19OP001B-04057-DR-EL-0001.pdf`, rev 6, p1 A / 1–10 | Labels the CV006 overhead route 22 kV and its source SR411 tier 03; p1 A / 1–5 depicts a continuation via pole 49-38-1 toward poles 201–286, Hopper 10 and CV010. The owner confirms the RM406/RM410 source but identifies the depicted 22 kV Hopper 10 branch as no longer existing. |
| `CB21OP055B-10016-DR-EL-0089.pdf`, rev 0, p1 C–G / 1–11 | Draws the station TF04 11/33 kV line and its AMR/IOP routes; Hopper 10 branch is at pole 286, E–G / 7–11. |
| `CB-10016-DR-EL-0011.pdf`, rev 0, p1 C–D / 1–2 | Hopper 10 / RM420 overview explicitly refers to the 33 kV line drawing. |
| `520CBC0007-2130-DR-EL-0003.pdf`, rev 3, p1 A–F / 2–11; note 3, G / 8–11 | RM420 incoming arrangement and TF420A/B; transformer labels include separate 33/22 kV primary possibilities. The drawing alone does not confirm the selected wiring. The subsequent owner response above confirms the current 33 kV primary connections and bus; it supplies no alternative selector/contact matrix. |

The first scoped confirmation is represented by `whole:join:hopper10-tf04`, from `line33:hopper-10:interface:port` to `rm420:interface:pole286:port`. The `.4` base, retained in current `.8`, records the second with `whole:primary33:tf420a` and `whole:primary33:tf420b`, from each `rm420:tf420a:primary-connection:port` / `rm420:tf420b:primary-connection:port` to its respective `rm420:tf420a:primary33` / `rm420:tf420b:primary33` terminal. `rm420:bus` is the owner-confirmed 33 kV bus. These are connectivity/identity confirmations, not confirmed present switch positions or a transformer transfer policy.

The third confirmation makes `whole:join:cv006` owner-confirmed and removes the obsolete 22 kV route continuity after ABS49-38-1 toward legacy poles 201/286/287 and Hopper 10. Superseded drawing-reference assets remain traceable in **`cv006/former-hopper10-22`**; their physical removal is not inferred. Removed connection IDs are `cv006:abs-branch-pole201`, `cv006:pole201-pole286`, `cv006:pole286-to-287`, `cv006:pole286-fused-branch`, `cv006:fused-abs286-hopper10` and `cv006:22kv-comparison-port`. Removed obsolete coverage IDs are `cv006:interface:hopper10:coverage`, `cv006:interface:line-comparison:22kv:coverage` and `cv006:interface:line-comparison:33kv:coverage`. ABS49-38-1 remains a drawn stub whose physical hardware status is unconfirmed.

The separate `cv006:interface:hopper10:port` is not joined to the current Hopper 10 input or the 33 kV line. Unselected transformer 22 kV winding coverage remains **Unconfirmed**; the removed overhead branch does not establish that an unused winding is disconnected or dead. **CV-R01, H10-Q01, H10-Q04 and PL-FUTURE-EXTERNAL** retain their remaining questions; the scoped confirmations do not resolve them in full. Detailed evidence: [CV006](../drawing-review/areas/cv006-review.md), [Hopper 10](../drawing-review/areas/hopper-10-review.md), [station/line](../drawing-review/areas/power-station-review.md).

### Include the additional Farwest lead in this decision

The local supplemental file `CB22OP050B-10018-DR-EL-0032_9_IFC_Distributable_01.pdf` is **additional to the original 141 PDFs**. Its printed drawing is `CB22OP050B-10018-DR-EL-0032`, rev 9, 12 August 2026, p1: main line/poles 227–272–284 at B / 2–4, with enlarged interface review at A–C / 1–6. It depicts Norfolk, future pole 272-1, pond and Bigge branches and continuations toward poles 215/286. Its date does not establish precedence over `0089` rev 0.

Document-only questions **FW-R01–FW-R03** cover included extent, reconciliation with `0089`, and missing final LV details. They are not runtime review IDs. Decide the included extent and explicit treatment of every retained external boundary; the current whole model has not incorporated this supplemental topology. See [Farwest evidence and limitations](../drawing-review/supplemental/farwest-review.md). Exact-reference searches for station DB01 and other missing details yielded leads, not confirmed replacement drawings; the station IOM lead was not successfully downloaded and visually reviewed.

## 2. Confirm source identities and cross-area connections

**Confirmed owner decision, 22 October 2026:** “TF11->IN03, TF12-> IN04. IN01 and IN02 are spares and not in use, they are currently not supplied from anywhere”. The source is the project owner's conversation response, **WN-SW411-INCOMING-ASSIGNMENT**. This confirms TF11 → IN03 and TF12 → IN04, and identifies IN01/IN02 as unused spare inputs with no incoming external supply. They are no longer unanswered current-feed/future-commissioning questions. The original drawing references in the first table row remain traceable evidence of the difference. Current breaker/earth-switch positions, physical interlocks and transformer source/earth transfer policies remain **Unconfirmed**; an unused input does not establish an open breaker or an earthed conductor. Only the incoming source coverage of those two spare interfaces is complete; their earth coverage stays unconfirmed.

**Confirmed owner model-label correction, 22 October 2026:** “Good pickup, the Tier 16 should be CB RM721 FD01 and ES RM721 FD 01”. The source is the project owner's conversation response, **WN-SW411-TIER16-TAGS**. Canonical tier 16 model labels are therefore **CB RM721 FD01** (`sw411:tier-16:cb`) and **ES RM721 FD 01** (`sw411:tier-16:es`). This is an explicit model-tag correction, not a record of physical nameplate inspection. Original SW454 drawing labels remain aliases with their source references.

**Confirmed owner cable-tag decision, 22 October 2026:** “your assumption is correct tht it is RM721-P-01”. The source is **Project owner (conversation)**, recorded as **WN-SW411-TIER16-CABLE** in current `.8`. The accepted tier 16 cable tag is **RM721-P-01**. Original **SW454-P-01** drawing aliases and evidence remain traceable. This decision applies to the cable tag at `sw411:tier-16:interface` and `services:interface:sw411`, linked through `whole:join:rm721`; it is not a physical-nameplate inspection or whole-route acceptance record.

**Remaining R002 / SV-Q01 / WN-JOIN-rm721 scope:** physical identity verification and acceptance of the whole current route remain **Unconfirmed**. `11098-07110-EL-DR-5151.pdf`, rev 7, p1 D–G / 11–12 names the RM721 destination with printed SW454-P-01; `11098-07110-EL-DR-2256.pdf`, rev 3, p1 B–D / 6–7 identifies the reciprocal RM721 incoming with RM721-P-01. The owner has now confirmed the CB/ES model tags and cable tag; these are no longer unanswered tag questions. The route remains provisional and the broad reviews remain partially open. Actual positions, availability, complete interlocks and baseline configuration are unconfirmed.

The original assembled cable joins use connection ID `whole:join:<name>` and review/evidence ID `WN-JOIN-<name>`. `WN-CV006-FEED-AND-REMOVED-H10` confirms the current CV006 feed and supersedes the former Hopper 10 branch. The additional Hopper 10 owner-confirmed join uses `WN-H10-TF04-SOURCE`; its selected primary connections use `WN-H10-PRIMARY33-CONFIGURATION`, as described above. “Supported” describes a depicted relationship, not whole-model acceptance. The [construction guide](whole-network-construction.md#interface-treatment) gives the endpoint pairs.

| Decision group | Affected IDs and question | Drawing references for this decision |
| --- | --- | --- |
| Station to SW411 | `whole:join:tf11-in03` and `whole:join:tf12-in04` are confirmed current feed relationships by WN-SW411-INCOMING-ASSIGNMENT. `station:R001`, `sw411:R001` and SW411-Q02 retain the original discrepancy context and remaining availability scope; TF11 → IN03, TF12 → IN04 and unused/no-supply IN01/IN02 are no longer open mapping questions. FUTURE TFX4 depictions remain drawing-only references, not current incoming supplies. Device states and winding policies remain separate. | `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 B–D (SB01 F4/TF11) and F–G (SB02 F1/TF12); `CB-10016-DR-EL-0010.pdf`, rev 0, p1 upper-left IN03/TF11; `CB-10016-DR-EL-0011.pdf`, rev 0, p1 upper-left IN04/TF12 with SB01 text; `11098-07110-EL-DR-5151.pdf`, rev 7, p1 upper source block and incomer tiers 6/7/10/11. |
| SW411 tier 3 and tier 16 | `WN-JOIN-cv006` current feeding relationship is owner-confirmed by WN-CV006-FEED-AND-REMOVED-H10; CV-R02/SW411-Q01 still retain OHL/SPARE asset-tag questions. Tier16 canonical CB/ES model labels and RM721-P-01 cable tag are confirmed by the fifth/sixth responses above; `WN-JOIN-rm721`, R002 and SV-Q01 retain physical identity and whole-route acceptance scope. Tier 16 is not constructed as another SW454 feed. | `5151` rev 7, p1 D–G / 4–5 and 11–12; `CB-10016-DR-EL-0010.pdf`, rev 0, p1 B–C / 2–7; `11098-07110-EL-DR-2256.pdf`, rev 3, p1 B–D / 6–7. Exact `5151` filename is in the preceding row. |
| Crushing tie | `WN-JOIN-crushing-tie`, C1-R03, C2-R11. **Inference in construction:** reconcile SW431-P-02 between `sw431:interface:sw435` and `sw435:interface:sw431`; retain both end switching assemblies. Confirm the cable and disputed document reference. | `11098-07110-EL-DR-2353.pdf`, rev 5, p1 C–G / 2–3; `11098-07110-EL-DR-2354.pdf`, rev 9, p1 B–G / 2–3. |
| Mine and village | `WN-JOIN-mine-tf03`, `WN-JOIN-village`; MC-Q01, MC-Q03, MC-Q06, MC-Q07, MC-Q09, MC-Q11. **Inference in construction:** station SB01 F1 → mine TF03 interface and F3 → camp/RM732 interface. Confirm reference equivalence, study overlaps and source identities. | Station `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 B–D (F1/F3); `11098-07110-EL-DR-2252.pdf`, rev 5, p1 A–C / 1–3; `CB-10016-DR-EL-0002.002.pdf`, rev 3, p1 A–G / 4–10. Station ref 6160 versus camp ref 2349 remains unresolved. |
| Western hopper links | `WN-JOIN-hopper1`, `WN-JOIN-hopper8`, `WN-JOIN-hopper9`; WH-Q01–WH-Q05, WH-Q09, CV-R08. Confirm scoped identities despite repeated SS416/TF416 tags and old feeder labels. | RM413 double boot: `CB17OP023A-04057-DR-EL-0004.pdf`, rev 5, p1 A–B / 2–5, and `CB16OP038A-02006-DR-EL-0044.pdf`, rev 2, p1 A–B / 6–7. Hopper 8: `CB19OP001B-04057-DR-EL-0002.pdf`, rev 4, p1 C–E / 10–11, and `CB17OP023C-01006-DR-EL-0001.pdf`, rev 6, p1 C–G / 8–11. Hopper 9: `CB19OP001B-04057-DR-EL-0004.pdf`, rev 6, p1 C–F / 10–12, and `CB19OP001C-01068-DR-EL-0001.pdf`, rev 4, p1 A–B / 6–8. |

The six depicted SW411 processing links also need installed confirmation: **WN-JOIN-sw454, -sw451, -sw435, -sw431, -sw426, -sw421**. Their SW411 endpoints are tier 01/02/04/13/14/15 respectively, on `11098-07110-EL-DR-5151.pdf`, rev 7, p1 D–G at those tiers. Receiving sources, p1 A–C / 1–2 (SW454: A–D / 1–2), are `11098-04400-EL-DR-8001.pdf` rev 5, `11098-07110-EL-DR-2356.pdf` rev 5, `11098-07110-EL-DR-2354.pdf` rev 9, `11098-07110-EL-DR-2353.pdf` rev 5, `11098-07110-EL-DR-2352.pdf` rev 9 and `11098-07110-EL-DR-2351.pdf` rev 5 respectively. Full filenames/regions are retained in each join's evidence and the linked area registers below.

Confirm the whole diagram preserves these distinctions: RM413A branches from RM413 IN02's **cable-facing** double boot; RM419 SW02 → RM418 SW01 uses `wh:h9-to-h7:cable`, not a bypass through a duplicate RM419; TF453/SW453 belongs to the SW435 power branch, despite train-loading/control labels.

## 3. Resolve endpoint coverage and remaining area discrepancies

For each missing endpoint, record either evidence for the final LV incomer/bus or an explicit owner decision on its unconfirmed model boundary. A named destination is not confirmation of its detailed bus. Existing MV motor/converter interfaces require their own scope treatment; they have not been silently discarded as outgoing LV circuits.

### Supplemental endpoints now depicted in `.8`

The [supplemental endpoint review](../drawing-review/supplemental/endpoint-sources-review.md) records three additional source identities, revisions, visual captures and fingerprints without recounting the original 141-PDF inventory. SW455 and Hopper3 were reviewed from image-bearing full-page sources; their indexed PDF identities are recorded there, but the original PDFs were not downloaded and original-PDF hashes remain unconfirmed. MC454 uses downloaded `11098-04400-EL-DR-8010_6_IFC_02.pdf`. These details were absent from historical `.4`; retaining them in current `.8` does not alter `.4` or establish installed precedence.

| Depicted endpoint / exact source locator | Model elements and remaining owner decision |
| --- | --- |
| SW455: `11098-04400-EL-DR-8020`, rev3, p1 A–B / 4–9 (TF455), B–C / 2 and 10 (incomers), C–D / 1–10 (bars); EP-S01 | Adds `sw455:in-d:cb`, `sw455:in-y:cb`, `sw455:bus-d` and `sw455:bus-y`: two 2500 A incomers and separate 690 V / 2500 A final bars. SW-R05 now concerns installed arrangement/precedence and complete device/transformer policy, rather than an unavailable 8020 endpoint. |
| Hopper3: `CB16OP038A-02006-DR-EL-0165`, rev1, p1 A–C / 8–9 (TF416A reference/MCCB), C–D / 1–11 (bar); EP-S02 | Adds `wh:h3:mc416a:in` and `wh:h3:mc416a:bus`: MCCB630 A and first 415 VAC / 630 A bar. WH-Q07 now records receipt of Hopper3 LV detail only. Its handwritten date, installed precedence and the separate Hopper8 identity remain unconfirmed. |
| MC454: `11098-04400-EL-DR-8010`, rev6 IFC, p1 A–B / 3–5 (TF454), C–D / 3–5 (incomer), D / 1–10 (bar), H / 2–6 and 11–12 (revision); EP-S03 | Adds `mc454:in:cb` and `mc454:bus`. Preserve printed **3000 A incomer versus 500 A / 400 V phase bar** without correcting either value: **EP-MC454-RATING** remains open. SW-R04 now concerns installed/rating review. MC455 is drawn as an outgoing branch at D–G / 9–10, beyond the first LV bar; it is not another added endpoint. |

Runtime evidence IDs are **EP-SW455-ENDPOINTS, EP-H3-LV-ENDPOINT and EP-MC454-ENDPOINT**. Shared **EP-INSTALLED-REVIEW** remains open. All four added control states are null and switching remains blocked by unresolved physical-interlock reviews. Their source/backfeed and independent earth policies remain unconfirmed; the extension retains the existing provisional transformer pairs and unknown winding coverage. Neutral/MEN, screen earth and control references do not establish phase-bus earth connections.

### Remaining endpoint and area decisions

| Area / affected asset or interface | Decision and exact source locator | Review IDs / detailed reference |
| --- | --- | --- |
| Station `station:sb01:f5:interface`, `station:sb02:f3:interface` | TF02 → DB01/ref DB01-SL-001 and TF202 → DB01B lack confirmed final LV details. Also resolve the two different printed TF04 identities: SB01 spare 11/0.4 kV versus SB02 F4 western 11/33 kV. `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 SB01 B–D and SB02 F–G. | PS-LV-COMPLETENESS, PS-DUPLICATE-TF04; [station review](../drawing-review/areas/power-station-review.md). |
| Crushing 1 MC431/MC431A | Confirm the overview-only MC431A identity and TF432 tier difference, rather than invent another bus. `CB-10016-DR-EL-0011.pdf`, rev 0, p1 B–D / 3–6; `11098-07110-EL-DR-2353.pdf`, rev 5, p1 TF432 tier 3; `11098-07110-EL-DR-2654.pdf`, rev 7, p1 A–D / 4–6 and D phase bar. | C1-R01, C1-R02; [Crushing 1 review](../drawing-review/areas/crushing-1-review.md). |
| Crushing 2 / HPGR `sw435:interface:mc436` | Confirm future/spare TF436/MC436, built/future SW453 status, and HPGR TF004 / TE004, MC001 / MC438 and 440/415 V identities. `11098-07110-EL-DR-2354.pdf`, rev 9, p1 feeder/destination tiers; `CB112-02006-DR-EL-0005.pdf`, rev 7, p1 C–E / 7–8 (TF004, MCCB and MC001 bar). The area review gives individual grid regions for these differences. | C2-R01–C2-R08; [Crushing 2/HPGR review](../drawing-review/areas/crushing-2-hpgr-review.md). |
| Stockpile/wet: existing TF506 and supplemental MC454/SW455 interfaces | MC454 and SW455 endpoints are now depicted as above; references 8010/8020 are no longer unavailable endpoint-detail questions. Their installed/rating/interlock/policy reviews remain open. TF506 secondary labels 690/720 V also conflict: `500CB-04220-DR-EL-0054.pdf`, rev 3, p1 C–G / 5–10, TF506 feeder; `500CB-04220-DR-EL-0060.pdf`, rev 2, p1 A / 5–7, TF506; B–C, D/Y incomers/bars. | SW-R03–SW-R05, EP-MC454-RATING, EP-INSTALLED-REVIEW; [Stockpile/wet review](../drawing-review/areas/stockpile-wet-plant-review.md) and [supplement](../drawing-review/supplemental/endpoint-sources-review.md). |
| Hopper 3 MV and Hopper 8 HV/LV `wh:h3:mc416:interface`, `wh:h8:mc416:interface`, `wh:h8:mc416a:interface` | Hopper3 LV -0165 is now depicted as above. Keep the two similarly tagged SS416 installations separate pending identity confirmation. Remaining source gaps are Hopper3 `CB16OP038A-02006-DR-EL-0166` and Hopper8 `CB17OP023D-01006-DR-EL-0002/-0003`. Depictions: `CB16OP038A-02006-DR-EL-0044.pdf`, rev 2, p1 D–G / 8–11; `CB17OP023C-01006-DR-EL-0001.pdf`, rev 6, p1 C–G / 8–11. | WH-Q01, WH-Q07; [western review](../drawing-review/areas/western-hoppers-review.md) and [supplement](../drawing-review/supplemental/endpoint-sources-review.md). |
| Hopper 10 `rm420:mc420a:interface` | Confirm TF420B → MC420A final LV incomer/bus. `520CBC0007-2130-DR-EL-0003.pdf`, rev 3, p1 D–F / 3–6. MC420 in `520CBC0007-2130-DR-EL-0004.pdf`, rev 2, p1 A–D / 4–5 is a 6.6 kV **MV** bar, not the missing LV endpoint. | H10-Q03–H10-Q05; [Hopper 10 review](../drawing-review/areas/hopper-10-review.md). |
| CV006 `rm410:interface:mc410a` | TF410B → MC410A → MC410B needs MC410A detail and an explicit first-bus treatment for MC410B. `CB19OP001B-04057-DR-EL-0004.pdf`, rev 6, p1 B–F / 6–9; `CB19OP001B-04057-DR-EL-0005.pdf`, redline rev 2A, p1 A / 5–7 and C–D phase bar. Its MEN-removal note C / 6–8 does not connect the phase bus to earth. TF406B/SW02 versus SW03 remains a separate identity conflict. | CV-R04, CV-R06; [CV006 review](../drawing-review/areas/cv006-review.md). |
| Services `rm721:interface:rm712`, `rm712:interface:sw426`, `rm712:tf712:removed-lv-cable-end`, `rm712:mcs` | Confirm RM721 remote contact/reference, former RM712 → RM713 route versus RM721 arrival, and missing SW426 bay. `11098-07110-EL-DR-2256.pdf`, rev 3, p1 RM721 outgoing; `11098-07110-EL-DR-2254.pdf`, rev 1, p1 RM713 incoming/revision text; `11098-07110-EL-DR-2253.pdf`, rev 3, p1 TF712/SW712 cable-removal annotation and MCS/DG inputs. The removed cable remains a gap. DG1(6207)/DG7(6206) are distinct sources; no simultaneous fixed MCS connection is established. | SV-Q02–SV-Q05; DES-Q01; [Services review](../drawing-review/areas/services-review.md). |
| Services MC413 and MCC414 | Confirm MC413's schematic first-bus evidence and missing referenced detail `CB-02006-DR-EL-1001`; keep outgoing MC413A extension outside that endpoint. `CB17OP023A-04057-DR-EL-0004.pdf`, rev 5, p1 C–E (TF413/MC413) and B–E / 4–8 (TF413A). Do not substitute MCC414: it is TF414-fed, with its own `CB095-02004-DR-EL-0014.pdf`, rev 4, p1 A–C incomer/bar and `CB095-02004-DR-EL-0015.pdf`, rev 5, p1 continued bar. | SV-Q08, SV-Q10; [Services review](../drawing-review/areas/services-review.md). |
| Train loading `sw451:mc451b:section` | Confirm MC451/MC451B section identity and 3000 A versus 500 A labels. `11098-07110-EL-DR-2658.pdf`, rev 12A, p1 C–D incomer/bar; `11098-07110-EL-DR-2672.pdf`, rev 7, p1 D / 2–4; `11098-07110-EL-DR-2673.pdf`, rev 6, p1 B–C / 4–5, bridge to MC451B. The supplied continuity is retained; missing reference 2659 does not establish a separate disconnected bus. | TL-R04; [Train-loading review](../drawing-review/areas/train-loading-review.md). |
| Mine/camp external and study overlaps | Confirm RM718 pole source, water/OPF1 supply, sewage TF714 versus laboratory TF714 identity, study TF03/SS711B/TF717 overlap, workshop aliases and camp ring/transformer endpoints. Do not merge the sewage and laboratory transformers by tag. `CB-10016-DR-EL-0003.001.pdf`, rev 9, p1 station A–C / 1–15, camp H–L / 10–16; `CB-10016-DR-EL-0003.004.pdf`, rev 0, p1 western/drop-tower regions; `11098-07110-EL-DR-2355.pdf`, rev 7, p1 incoming A–C / 4; `11098-07110-EL-DR-2657.pdf`, rev 13, p1 TF441/incomer A–C / 5. | MC-Q01–MC-Q11; [mine/camp review](../drawing-review/areas/mine-camp-review.md) gives each original filename and detailed region. |

The area register below retains the remaining tag, revision, voltage-description and continuation questions, including Screening SW243/SW423, Desands laboratory earth/identity and TF429 stage 2, wet ES SWXXX/SW505, train-loading ES SW451/SW454 and MC451/MC451B, and Services RM751/RM721 and separate ES-Q8 roles. No revision date or “AS BUILT” stamp has been accepted as a general precedence rule. Record an explicit answer or boundary treatment for every affected open question before whole-network acceptance.

## 4. Confirm electrical relationships and physical device behaviour

### Transformer, converter and earth channels

**Unconfirmed:** installed source-transfer/backfeed relationships and earth continuity across each represented transformer. Construction candidate source pairs are labelled provisional. Empty earth pairs with unconfirmed winding coverage mean unknown coverage; they do not confirm absence of an earth relationship. Confirm source and earth terminal relationships separately, using the named winding terminals in each asset inspector.

Use one global decision record for the review approach, linked to **PS-WINDINGS, C1-R08, C2-R09, SC-R04, DES-Q08, SW-R08, TL-R06, CV-R07, WH-WINDINGS, SV-Q10, H10-Q04, MC-Q04**, then retain transformer-specific confirmations. In particular:

- TF412 has three distinct LV endpoints; TF413A has two separate rectifier AC input boundaries. See `CBC0012-02004-DR-EL-0007.pdf`, rev 9, p1 F–G / 1–3, RM412; D–E / 1–7, TF412/Q200–Q202, and `CB17OP023A-04057-DR-EL-0004.pdf`, rev 5, p1 B–E / 4–8, RM413A/TF413A; **SV-Q09/SV-Q10**.
- HPGR TF001/SW002, 2305 V windings, converter AC/DC and 4000 V motor branches remain distinct. Wet TF505A/B/C 22 → 1.9/1.9 kV drive paths, DC earths and motors remain distinct. Confirm their included scope and relationships; no generic metallic converter shortcut is established. **C2-R10, SW-R06**; use the area registers for the vendor/source gaps.
- Neutral, MEN, NER, equipment-earth and screen-earth symbols are separate evidence. They do not by themselves establish a phase-bus earth or a bridge between separate phase circuits. Preserve **WH-Q11, CV-R06, TL-R06** and the area earth-coverage questions.

### Positions and interlocks

Confirm the supported physical position set for each device before its transition rules. An open/closed construction representation is not confirmation that intermediate, isolated, earthed or withdrawn positions are absent. Then confirm physical blocking conditions, exact related asset IDs and key/mechanism identities. The source does not confirm switching permission from an omitted rule.

Review these explicit source distinctions before completing the global interlock decision:

| Evidence to reconcile | Required unresolved decision |
| --- | --- |
| Station `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 C–E tie/fuse and dashed linkages; `station:R003`, R004 | Meaning of linkages, separate end breakers/earths and installed conditions; no truth table follows from the dashed lines alone. |
| Wet `500CB-04220-DR-EL-0055.pdf`, rev 3, p1 D–F / 3–8; SW-R07 | The note says **INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR**. Confirm the exact physical devices and conditions; do not generalise it into an incoming-device rule. |
| Hopper 10 `520CBC0007-2130-DR-EL-0003.pdf`, rev 3, notes1/4, p1 G / 8–11; `520CBC0007-2130-DR-EL-0004.pdf`, rev 2, notes5/6/8, p1 G / 1–7; H10-Q06 | Distinguish administrative earth wording, Ronis key conditions, upstream-earth mapping, maintenance key captive with earth ON, and door padlock conditions. These are not one complete interchangeable interlock table. |
| Western `CB19OP001C-01068-DR-EL-0001.pdf`, rev 4, note1, p1 F–G / 1–4; respective MV sheets' notes5–8; WH-Q08, WH-POSITIONS | Distinguish administrative restrictions from physical blocks and identify each upstream earth/key. Preserve the individual hopper notes rather than copying a generic rule. |
| Services TF412 and RM413A source regions above; SV-Q06, SV-Q09, SV-Q12 | Confirm Q100/contact/E102 versus separate S100/S101 earth roles and each ES-Q8 mechanism. The TF712 MCS has no confirmed position/contact matrix. |

Link the completed review to **sw411:R003, PS-DEVICE-IDS, PL-IDS-INTERLOCKS, C1-R07, C2-R09/C2-R11, SC-R02/SC-R03, DES-Q08, SW-R07, TL-R05, CV-R09, WH-Q08/WH-POSITIONS, SV-Q12, H10-Q06/H10-Q07, MC-Q02/MC-Q11**. Complete conditions remain unconfirmed; affected controls stay blocked pending their resolution.

## 5. Agree sources and the starting configuration

Only after the identities, topology, positions and interlocks above are resolved, record the starting position of **each** device and availability of **each** source. The current package deliberately records null for actual controls and source availability. Null means **Unconfirmed**, not open, off, unavailable or disconnected.

Source review groups are station generator branches 01–23, camp DG701/DG702/DG703, and Services DG1(6207)/DG7(6206). The exact package source IDs and terminal attachments are inspectable in the model; use those IDs in the baseline record. Also resolve the remaining unconfirmed external and future boundaries above instead of enabling an invented source at each area interface. IN01/IN02's confirmed lack of incoming supply is retained independently of their unknown device positions and earth coverage.

Drawing poses, a study's normally-open point, AS FOUND dates and source symbols do not confirm the owner's baseline. For example, `CB-10016-DR-EL-0003.001.pdf`, rev 9, p1 H–L / 10–16 depicts a camp study ring/normal-open point; **MC-Q03/MC-Q11** remain open. Link the baseline record to **station:R005, sw411:R005, C1-R07, C2-R11, SC-R05, DES-Q08, SW-R09, TL-R07, CV-R09, WH-Q12, SV-Q12, H10-Q07, MC-Q11**.

## 6. Complete coverage and record immutable acceptance

The [coverage register](../drawing-review/coverage.md) accounts for the original **141 supplied PDF filenames / 140 unique hashes**. One identical-content pair is `11098-07110-EL-DR-2465.pdf` / `11098-07110-EL-DR-2465 (2).pdf`. These are file dispositions, not confirmation that the model covers the installed network. The [supplementary scope review](../drawing-review/areas/supplementary-scope-review.md) records outgoing LV/subordinate source dispositions. Review those dispositions together with each area endpoint decision; the additional Farwest lead has its own record and is not included in that original intake total.

For each original and additional source, retain reviewed in-scope content, an explicit duplicate/reference relationship, or a documented disposition. For every final-LV/external/converter gap, retain the owner's explicit scope and model-treatment decision. A missing exact filename does not prove an equivalent source does not exist, and does not establish a disconnected endpoint.

### Acceptance record — pending

| Required record | Status |
| --- | --- |
| Final whole model ID/version, commit/package identity and included `WN-AREA-<area>` versions | Current review package is `site-whole-network` / `construction-2026-10-22.8`, extending immutable `.4`; included area versions are retained in `WN-AREA-*` with supplemental endpoint evidence above. Commit/package identity and explicit acceptance remain **pending**. |
| Resolutions or explicit owner boundary/treatment decisions for material review questions, including all `WN-JOIN-*` and WN-OWNER-ACCEPTANCE | **Pending overall.** WN-H10-TF04-SOURCE, WN-H10-PRIMARY33-CONFIGURATION, WN-CV006-FEED-AND-REMOVED-H10, WN-SW411-INCOMING-ASSIGNMENT, WN-SW411-TIER16-TAGS and WN-SW411-TIER16-CABLE record the six scoped owner decisions above; remaining questions stay open. |
| Coverage through final LV buses; additional-source and excluded-source dispositions | **Pending owner review.** |
| Reviewed whole diagram, asset identities/connections, winding channels, device positions and physical interlocks | **Pending owner review.** |
| Starting configuration: every device position, source availability and unresolved-boundary treatment, preserved in a scenario snapshot of this same version | **Pending owner confirmation.** |
| Owner name, date and explicit statement accepting that immutable model and starting configuration for this project's educational scope | **Not recorded.** |

The maintainer must version any subsequent change to topology, identities, evidence, interlocks, baseline or presentation, in accordance with [ADR 0007](adr/0007-self-contained-scenarios.md). A previous version's acceptance must not silently transfer to changed content. Software checks and fictional switching examples remain separate evidence from owner confirmation.

## Detailed review register

Use these records when a grouped question needs a closer source comparison. Each contains the original filenames, revisions, pages/regions, depicted relationships and unresolved questions. All ranges below include every numbered question in that range; global questions are grouped in steps 4–5, not dropped.

| Area | Retained review IDs | Source review |
| --- | --- | --- |
| SW411 | sw411:R001, R002, sw411:R003, sw411:R005; SW411-Q01–Q03; SW411-COVERAGE | [SW411](../drawing-review/areas/sw411-review.md) |
| Station / line | station:R001, station:R003, R004, station:R005; PS-DEVICE-IDS, PS-DUPLICATE-TF04, PS-SB02-SR002, PS-WINDINGS, PS-LV-COMPLETENESS, PL-IDS-INTERLOCKS, PL-FUTURE-EXTERNAL | [Station / line](../drawing-review/areas/power-station-review.md) |
| Crushing1 | C1-R01–R08 | [Crushing1](../drawing-review/areas/crushing-1-review.md) |
| Crushing2 / HPGR | C2-R01–R11 | [Crushing2 / HPGR](../drawing-review/areas/crushing-2-hpgr-review.md) |
| Screening | SC-R01–R06 | [Screening](../drawing-review/areas/screening-review.md) |
| Desands / laboratory | DES-Q01–Q08 | [Desands / laboratory](../drawing-review/areas/desands-laboratory-review.md) |
| Stockpile / wet | SW-R01–R10 | [Stockpile / wet](../drawing-review/areas/stockpile-wet-plant-review.md) |
| Train loading | TL-R01–R08 | [Train loading](../drawing-review/areas/train-loading-review.md) |
| CV006 | CV-R01–R11 | [CV006](../drawing-review/areas/cv006-review.md) |
| Western hoppers | WH-Q01–Q12; WH-POSITIONS; WH-WINDINGS | [Western hoppers](../drawing-review/areas/western-hoppers-review.md) |
| Services | SV-Q01–Q12 | [Services](../drawing-review/areas/services-review.md) |
| Hopper10 | H10-Q01–Q07 | [Hopper10](../drawing-review/areas/hopper-10-review.md) |
| Mine / camp | MC-Q01–Q11 | [Mine / camp](../drawing-review/areas/mine-camp-review.md) |
| Supplemental endpoints | EP-INSTALLED-REVIEW; EP-MC454-RATING; partial SW-R04/SW-R05/WH-Q07 | [Supplemental first LV endpoints](../drawing-review/supplemental/endpoint-sources-review.md) |

`WN-AREA-*` records identify included software packages; they are not drawing confirmation. `station:` and `sw411:` qualify the formerly duplicated R001/R003/R005 questions in the assembled model. [Initial review questions](../drawing-review/review-queue.md) retain their original source context.

**Ownership:** the project owner supplies and confirms electrical decisions and acceptance; the maintainer records the evidence, implements those decisions and updates this packet. Review this packet whenever new evidence, a decision or a model version changes, and again at final handoff. This document records the scoped owner confirmations above; it supplies no additional electrical decision or model acceptance.
