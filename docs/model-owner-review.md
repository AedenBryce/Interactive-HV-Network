# Owner review: whole-network construction

**Status: construction; whole-network owner acceptance pending.** This packet supports the project owner's review of represented topology, endpoints, sources, supported device positions, physical interlocks and the starting configuration. Scoped owner confirmations are recorded below; they do not establish whole-network acceptance or operating permission.

**Station scope implemented; downstream exclusions applied.** The owner states exactly: “The only feeders from SB01 and SB02 that are required are the ones from TF11, TF12 and TF-04. That should be the battery limits.” The confirmed cut is at each retained SB01/SB02 feeder breaker, retaining that feeder and transformer while excluding station buses, generators and other feeders. The current 23 October package retains that station boundary. DB01/DB01B and other excluded station feeders are no longer active requests. See the [exact amendment](specs/interactive-hv-network.md#owner-scope-amendment--22-october-2026) and [scope implementation record](../drawing-review/supplemental/station-battery-limits-review.md).

**Owner scope/route answers, 22 October 2026:** exclude mine-services, village/camp and RM718; retain the TF-04 route to Hopper10 with other branches at takeoffs only; include SW441/TF441/MC441 via **TF12 → OPF1-7 spur → WT1-CB → SW441 IN01**. The earlier TF712 water-source wording is superseded. RM721 IN02 connects to SF RM712 IN02; RM721 also feeds SF RM713 IN01 at both ends. Nothing is connected externally at RM712 IN01. TF712's LV cables connect at the SW712 incomer; the changeover/DG assembly is excluded from this model. MC431A is excluded downstream of MC431. TF436 has a breaker and earth switch with no outgoing cable/downstream feed; TF432 is tier5; MC001/MC438 are the same HPGR board; TF453/SW453 is installed and connected to SW435 tier8. See the [exact decisions and implementation record](../drawing-review/supplemental/owner-scope-connections-review.md). Answers16–21 also confirm the RM413 cable-side fork, distinct Hopper3/Hopper8 supplies, Hopper9→Hopper7 route, RM418 CB03/CB04 roles and current RM413/TF413→MC413 supply. See the [route decisions](../drawing-review/supplemental/owner-hopper-routes-review.md).

**Applied answers22–24, 23 October:** the six SW411 processing cable routes/tags are owner-confirmed, and the known key interlocks between IN03/IN04 and TF11/TF12 feeder assemblies are explicitly deferred from the current simulation. See the [SW411 record](../drawing-review/supplemental/owner-sw411-feeds-review.md). Later [answers25–31](../drawing-review/supplemental/owner-configuration-review.md) select transformer behavior, separate racking actions and a partial baseline; those requirements are recorded for a subsequent increment and are not implemented in this inspection package. Whole-model acceptance remains open.

Current inspection snapshot: **`site-whole-network` / `construction-2026-10-23.1`**, code commit `f5beb4b`, exported as `currentNetworkModel` from `src/models/site/current-network.ts`. It extends immutable historical `.4` with supplemental sources and scoped owner corrections. The [latest route record](../drawing-review/supplemental/owner-hopper-routes-review.md) records answers16–21 applied here; prior identity and scope decisions remain. `WN-OWNER-ACCEPTANCE` remains open; acceptance must name a specific immutable version and final included scope.

The current software inventory is **680 assets, 677 connections, 360 controls with null starting positions, 3 sources with null availability, 139 earth terminations, 313 coverage boundaries and 91 views**, with 13 orientation regions and 24 contactors. The TF12→SW411 IN04 route now includes the owner-confirmed OPF1-7 water spur. Historical area/`.4` packages remain unchanged. Counts do not establish installed coverage or owner acceptance.

Historical `.5`/`.6`/`.7` were endpoint/caption QA packages; historical `.8` added the sixth cable-tag decision. Historical `.11` (commit `90b5663`) contained 1007 assets, 1006 connections, 580 controls, 28 sources, 365 boundaries and 135 views before the station cut. It contained 17 cross-area joins: 9 supported, 2 provisional and 6 owner-confirmed. The eighth TF03 feeding fact remains in current evidence, but its runtime join is outside the station battery limit. `.12` first integrated the cut; historical `.13` (code commit `afd043a`) refined captions and contained 127 views. Historical `.14` added the received MC413 detail and one view. The current 23 October package retains the downstream scope/RM712 decisions and applies the six later hopper/MC413 route confirmations. Historical snapshots remain immutable and none has whole-network acceptance.

Within the confirmed included scope, the task is to resolve each material discrepancy, or explicitly decide its model boundary and treatment, and then accept a specific immutable model and starting configuration. Preparing this packet, accounting for files and passing software checks do not establish acceptance. See [ticket #25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25) and the [specification](specs/interactive-hv-network.md).

## Inspect and record a decision

Run the application using the [local setup instructions](../README.md#run-locally). In **Model**, select the whole-network construction package. Start with its orientation view, then use the view selector or cross-area navigation to reach the relevant detail. Select the asset and inspect its aliases, evidence, open questions, source paths and earth paths. Pan, zoom and **Fit view** change the presentation only. The [construction guide](whole-network-construction.md) describes the joins and intentionally unjoined interfaces.

Current Hopper 10 detail titles are **Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed** and **Hopper 10 · Selected 33 kV inputs / MC420A LV**. They reflect the scoped owner confirmations and received LV detail, not installed acceptance. Supplemental LV views include `supplemental/sw455-lv`, `supplemental/hopper3-lv`, `supplemental/mc454-lv`, `western-supplemental/h8/lv`, `supplemental/hopper10-lv` and `supplemental/cv006-mc410a-lv`; Hopper3/Hopper8 MV overviews lead to separate motor details.

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

The first scoped confirmation is represented by `whole:join:hopper10-tf04`, from `line33:hopper-10:interface:port` to `rm420:interface:pole286:port`. The `.4` base, retained in the current 23 October package, records the second with `whole:primary33:tf420a` and `whole:primary33:tf420b`, from each `rm420:tf420a:primary-connection:port` / `rm420:tf420b:primary-connection:port` to its respective `rm420:tf420a:primary33` / `rm420:tf420b:primary33` terminal. `rm420:bus` is the owner-confirmed 33 kV bus. These are connectivity/identity confirmations, not confirmed present switch positions or a transformer transfer policy.

The third confirmation makes `whole:join:cv006` owner-confirmed and removes the obsolete 22 kV route continuity after ABS49-38-1 toward legacy poles 201/286/287 and Hopper 10. Superseded drawing-reference assets remain traceable in **`cv006/former-hopper10-22`**; their physical removal is not inferred. Removed connection IDs are `cv006:abs-branch-pole201`, `cv006:pole201-pole286`, `cv006:pole286-to-287`, `cv006:pole286-fused-branch`, `cv006:fused-abs286-hopper10` and `cv006:22kv-comparison-port`. Removed obsolete coverage IDs are `cv006:interface:hopper10:coverage`, `cv006:interface:line-comparison:22kv:coverage` and `cv006:interface:line-comparison:33kv:coverage`. ABS49-38-1 remains a drawn stub whose physical hardware status is unconfirmed.

The separate `cv006:interface:hopper10:port` is not joined to the current Hopper 10 input or the 33 kV line. Unselected transformer 22 kV winding coverage remains **Unconfirmed**; the removed overhead branch does not establish that an unused winding is disconnected or dead. **CV-R01, H10-Q01, H10-Q04 and PL-FUTURE-EXTERNAL** retain their remaining questions; the scoped confirmations do not resolve them in full. Detailed evidence: [CV006](../drawing-review/areas/cv006-review.md), [Hopper 10](../drawing-review/areas/hopper-10-review.md), [station/line](../drawing-review/areas/power-station-review.md).

### Include the additional Farwest lead in this decision

The local supplemental file `CB22OP050B-10018-DR-EL-0032_9_IFC_Distributable_01.pdf` is **additional to the original 141 PDFs**. Its printed drawing is `CB22OP050B-10018-DR-EL-0032`, rev 9, 12 August 2026, p1: main line/poles 227–272–284 at B / 2–4, with enlarged interface review at A–C / 1–6. It depicts Norfolk, future pole 272-1, pond and Bigge branches and continuations toward poles 215/286. Its date does not establish precedence over `0089` rev 0.

The owner has resolved **FW-R01** for scope: show other branches at takeoffs only; no Norfolk/Bigge/Farwest downstream detail. **FW-R03** is not an active LV-detail request for these excluded branches. **FW-R02** retains main-line/takeoff reconciliation scope. The current 23 October package uses seven abstract takeoff markers from the already reviewed0089 topology, with unknown external source/earth coverage; it does not incorporate supplemental Farwest topology. See [Farwest evidence and limitations](../drawing-review/supplemental/farwest-review.md) and [the owner decision](../drawing-review/supplemental/owner-scope-connections-review.md). Earlier excluded station DB01/IOM leads are historical only.

## 2. Confirm source identities and cross-area connections

**Confirmed owner decision, 22 October 2026:** “TF11->IN03, TF12-> IN04. IN01 and IN02 are spares and not in use, they are currently not supplied from anywhere”. The source is the project owner's conversation response, **WN-SW411-INCOMING-ASSIGNMENT**. This confirms TF11 → IN03 and TF12 → IN04, and identifies IN01/IN02 as unused spare inputs with no incoming external supply. They are no longer unanswered current-feed/future-commissioning questions. The original drawing references in the first table row remain traceable evidence of the difference. Current breaker/earth-switch positions, physical interlocks and transformer source/earth transfer policies remain **Unconfirmed**; an unused input does not establish an open breaker or an earthed conductor. Only the incoming source coverage of those two spare interfaces is complete; their earth coverage stays unconfirmed.

**Confirmed owner model-label correction, 22 October 2026:** “Good pickup, the Tier 16 should be CB RM721 FD01 and ES RM721 FD 01”. The source is the project owner's conversation response, **WN-SW411-TIER16-TAGS**. Canonical tier 16 model labels are therefore **CB RM721 FD01** (`sw411:tier-16:cb`) and **ES RM721 FD 01** (`sw411:tier-16:es`). This is an explicit model-tag correction, not a record of physical nameplate inspection. Original SW454 drawing labels remain aliases with their source references.

**Confirmed owner cable-tag decision, 22 October 2026:** “your assumption is correct tht it is RM721-P-01”. The source is **Project owner (conversation)**, recorded as **WN-SW411-TIER16-CABLE**, introduced in historical `.8` and retained in the current 23 October package. The accepted tier 16 cable tag is **RM721-P-01**. Original **SW454-P-01** drawing aliases and evidence remain traceable. This decision applies to the cable tag at `sw411:tier-16:interface` and `services:interface:sw411`, linked through `whole:join:rm721`; it is not a physical-nameplate inspection or whole-route acceptance record.

**Remaining R002 / SV-Q01 / WN-JOIN-rm721 scope:** physical identity verification and acceptance of the whole current route remain **Unconfirmed**. `11098-07110-EL-DR-5151.pdf`, rev 7, p1 D–G / 11–12 names the RM721 destination with printed SW454-P-01; `11098-07110-EL-DR-2256.pdf`, rev 3, p1 B–D / 6–7 identifies the reciprocal RM721 incoming with RM721-P-01. The owner has now confirmed the CB/ES model tags and cable tag; these are no longer unanswered tag questions. The route remains provisional and the broad reviews remain partially open. Actual positions, availability, complete interlocks and baseline configuration are unconfirmed.

The original assembled cable joins use connection ID `whole:join:<name>` and review/evidence ID `WN-JOIN-<name>`. `WN-CV006-FEED-AND-REMOVED-H10` confirms the current CV006 feed and supersedes the former Hopper 10 branch. The additional Hopper 10 owner-confirmed join uses `WN-H10-TF04-SOURCE`; its selected primary connections use `WN-H10-PRIMARY33-CONFIGURATION`, as described above. “Supported” describes a depicted relationship, not whole-model acceptance. The [construction guide](whole-network-construction.md#interface-treatment) gives the endpoint pairs.

| Decision group | Affected IDs and question | Drawing references for this decision |
| --- | --- | --- |
| Station to SW411 | `whole:join:tf11-in03` and `whole:join:tf12-in04` are confirmed current feed relationships by WN-SW411-INCOMING-ASSIGNMENT. `station:R001`, `sw411:R001` and SW411-Q02 retain the original discrepancy context and remaining availability scope; TF11 → IN03, TF12 → IN04 and unused/no-supply IN01/IN02 are no longer open mapping questions. FUTURE TFX4 depictions remain drawing-only references, not current incoming supplies. Device states and winding policies remain separate. | `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 B–D (SB01 F4/TF11) and F–G (SB02 F1/TF12); `CB-10016-DR-EL-0010.pdf`, rev 0, p1 upper-left IN03/TF11; `CB-10016-DR-EL-0011.pdf`, rev 0, p1 upper-left IN04/TF12 with SB01 text; `11098-07110-EL-DR-5151.pdf`, rev 7, p1 upper source block and incomer tiers 6/7/10/11. |
| SW411 tier 3 and tier 16 | `WN-JOIN-cv006` current feeding relationship is owner-confirmed by WN-CV006-FEED-AND-REMOVED-H10; CV-R02/SW411-Q01 still retain OHL/SPARE asset-tag questions. Tier16 canonical CB/ES model labels and RM721-P-01 cable tag are confirmed by the fifth/sixth responses above; `WN-JOIN-rm721`, R002 and SV-Q01 retain physical identity and whole-route acceptance scope. Tier 16 is not constructed as another SW454 feed. | `5151` rev 7, p1 D–G / 4–5 and 11–12; `CB-10016-DR-EL-0010.pdf`, rev 0, p1 B–C / 2–7; `11098-07110-EL-DR-2256.pdf`, rev 3, p1 B–D / 6–7. Exact `5151` filename is in the preceding row. |
| Crushing tie | `whole:join:crushing-tie` / `WN-JOIN-crushing-tie` is owner-confirmed by **WN-CRUSHING-TIE** for SW431-P-02 and its named end connections. C1-R03 retains disputed overview document identity; C2-R11 retains other installed configuration, states, fuse/racking and interlock scope. | `11098-07110-EL-DR-2353.pdf`, rev 5, p1 C–G / 2–3; `11098-07110-EL-DR-2354.pdf`, rev 9, p1 B–G / 2–3. |
| Mine feeding route — historical connection | **WN-MINE-TF03-FEED** remains a historical feeding confirmation. The current 23 October package excludes both the station feeder and RM711 mine-services area; their former join and mine port are absent. This scope exclusion does not assert physical disconnection. | `500CBC0002-13015-DR-EL-0001.pdf`, rev3, p1 B–D; `11098-07110-EL-DR-2252.pdf`, rev5, p1 A–C /1–3; [station boundary record](../drawing-review/supplemental/station-battery-limits-review.md). |
| Village — historical candidate | The current 23 October package excludes the village/camp network and its station feeder. Historical drawing/reference questions remain provenance, not active requests to restore excluded equipment. | Station `500CBC0002-13015-DR-EL-0001.pdf`, rev3, p1 B–D; `CB-10016-DR-EL-0002.002.pdf`, rev3, p1 A–G /4–10. |
| Western hopper links | `WN-JOIN-hopper1`, `WN-JOIN-hopper8`, `WN-JOIN-hopper9`; WH-Q01–WH-Q05, WH-Q09, CV-R08. The named RM413 fork, Hopper8 and Hopper9→Hopper7 routes are owner-confirmed by answers16–18; answers19–20 confirm the distinct Hopper3 supply and RM418 CB03/CB04 roles. Keep remaining document/hardware, winding, state and interlock questions open. See the [exact route record](../drawing-review/supplemental/owner-hopper-routes-review.md). | RM413 double boot: `CB17OP023A-04057-DR-EL-0004.pdf`, rev 5, p1 A–B / 2–5, and `CB16OP038A-02006-DR-EL-0044.pdf`, rev 2, p1 A–B / 6–7. Hopper 8: `CB19OP001B-04057-DR-EL-0002.pdf`, rev 4, p1 C–E / 10–11, and `CB17OP023C-01006-DR-EL-0001.pdf`, rev 6, p1 C–G / 8–11. Hopper 9: `CB19OP001B-04057-DR-EL-0004.pdf`, rev 6, p1 C–F / 10–12, and `CB19OP001C-01068-DR-EL-0001.pdf`, rev 4, p1 A–B / 6–8. |

### Seventh scoped decision: Crushing 1 / Crushing 2 tie

On **2026-10-22**, **Project owner (conversation)** answered exactly **“confirmed”** to the full question recorded in **WN-CRUSHING-TIE**:

> Next connection to confirm: is SW431-P-02 the current tie between Crushing 1 SW431 and Crushing 2 SW435, with CB SW435 FD02 at the SW431 end and CB SW431 FD02 at the SW435 end? Sources:11098-07110-EL-DR-2353.pdf rev5 p1 C-G/2-3,2354rev9p1 B-G/2-3. Please correct any detail or say unconfirmed.

This confirms `whole:join:crushing-tie`, between `sw431:interface:sw435:port` and `sw435:interface:sw431:port`, with the cable and named end connections in that question. Both end breaker/earth assemblies remain represented. It does not resolve C1-R03's disputed overview document reference or C2-R11's remaining configuration, fuse continuity, racking, interlocks and null baseline.

### Eighth scoped decision: station TF03 / mine feed

On **2026-10-22**, **Project owner (conversation)** answered exactly **“It does”** to the full question recorded in **WN-MINE-TF03-FEED**:

> Does station SB01 feeder F1, through TF03, currently supply RM711/the mine-services 22 kV line? The construction currently treats this as unconfirmed. Sources: 500CBC0002-13015-DR-EL-0001.pdf rev 3, page 1 B–D (SB01 F1/TF03), and 11098-07110-EL-DR-2252.pdf rev 5, page 1 A–C/1–3 (RM711 incoming). Please confirm the current arrangement, correct it, or say “unconfirmed”.

This confirmed the feeding fact represented in historical `.11` by `whole:join:mine-tf03`. The current 23 October package excludes both the upstream station feeder and downstream RM711 mine-services equipment under the later explicit scope answers. The fact and source differences remain historical evidence; exclusion does not assert physical disconnection. No RM711/study/camp baseline or interlock acceptance is now requested for V1.

The six named SW411 processing cable routes/tags are now owner-confirmed by answers22–23: **WN-JOIN-sw454, -sw451, -sw435, -sw431, -sw426, -sw421**. The [exact decision record](../drawing-review/supplemental/owner-sw411-feeds-review.md) retains both “all confirmed” answers. Other hardware, states, source availability and complete interlocks remain separate. Their SW411 endpoints are tier 01/02/04/13/14/15 respectively, on `11098-07110-EL-DR-5151.pdf`, rev 7, p1 D–G at those tiers. Receiving sources, p1 A–C / 1–2 (SW454: A–D / 1–2), are `11098-04400-EL-DR-8001.pdf` rev 5, `11098-07110-EL-DR-2356.pdf` rev 5, `11098-07110-EL-DR-2354.pdf` rev 9, `11098-07110-EL-DR-2353.pdf` rev 5, `11098-07110-EL-DR-2352.pdf` rev 9 and `11098-07110-EL-DR-2351.pdf` rev 5 respectively. Full filenames/regions are retained in each join's evidence and the linked area registers below.

Confirm the whole diagram preserves these distinctions: RM413A branches from RM413 IN02's **cable-facing** double boot; RM419 SW02 → RM418 SW01 uses `wh:h9-to-h7:cable`, not a bypass through a duplicate RM419; TF453/SW453 belongs to the SW435 power branch, despite train-loading/control labels.

## 3. Resolve endpoint coverage and remaining area discrepancies

For each missing endpoint, record either evidence for the final LV incomer/bus or an explicit owner decision on its unconfirmed model boundary. A named destination is not confirmation of its detailed bus. Existing MV motor/converter interfaces require their own scope treatment; they have not been silently discarded as outgoing LV circuits.

### First supplemental endpoints: historical `.8`, retained in `.14`

The [supplemental endpoint review](../drawing-review/supplemental/endpoint-sources-review.md) records three additional source identities, revisions, visual captures and fingerprints without recounting the original 141-PDF inventory. SW455 and Hopper3 were reviewed from image-bearing full-page sources; their indexed PDF identities are recorded there, but the original PDFs were not downloaded and original-PDF hashes remain unconfirmed. MC454 uses downloaded `11098-04400-EL-DR-8010_6_IFC_02.pdf`. These details were absent from historical `.4`; retaining them in the current 23 October package does not alter `.4` or establish installed precedence.

| Depicted endpoint / exact source locator | Model elements and remaining owner decision |
| --- | --- |
| SW455: `11098-04400-EL-DR-8020`, rev3, p1 A–B / 4–9 (TF455), B–C / 2 and 10 (incomers), C–D / 1–10 (bars); EP-S01 | Adds `sw455:in-d:cb`, `sw455:in-y:cb`, `sw455:bus-d` and `sw455:bus-y`: two 2500 A incomers and separate 690 V / 2500 A final bars. SW-R05 now concerns installed arrangement/precedence and complete device/transformer policy, rather than an unavailable 8020 endpoint. |
| Hopper3: `CB16OP038A-02006-DR-EL-0165`, rev1, p1 A–C / 8–9 (TF416A reference/MCCB), C–D / 1–11 (bar); EP-S02 | Adds `wh:h3:mc416a:in` and `wh:h3:mc416a:bus`: MCCB630 A and first 415 VAC / 630 A bar. WH-Q07 records receipt of Hopper3 LV detail and now also the later MV/Hopper8 pages below. Its handwritten date, installed precedence and the separate Hopper8 identity remain unconfirmed. |
| MC454: `11098-04400-EL-DR-8010`, rev6 IFC, p1 A–B / 3–5 (TF454), C–D / 3–5 (incomer), D / 1–10 (bar), H / 2–6 and 11–12 (revision); EP-S03 | Adds `mc454:in:cb` and `mc454:bus`. Preserve printed **3000 A incomer versus 500 A / 400 V phase bar** without correcting either value: **EP-MC454-RATING** remains open. SW-R04 now concerns installed/rating review. MC455 is drawn as an outgoing branch at D–G / 9–10, beyond the first LV bar; it is not another added endpoint. |

Runtime evidence IDs are **EP-SW455-ENDPOINTS, EP-H3-LV-ENDPOINT and EP-MC454-ENDPOINT**. Shared **EP-INSTALLED-REVIEW** remains open. All four added control states are null and switching remains blocked by unresolved physical-interlock reviews. Their source/backfeed and independent earth policies remain unconfirmed; the extension retains the existing provisional transformer pairs and unknown winding coverage. Neutral/MEN, screen earth and control references do not establish phase-bus earth connections.

### Five further received pages represented in `.14`

These are supplemental source pages, not additions to or recounts of the original 141-PDF inventory. Receipt closes the specific missing-page questions, not installed identity, revision precedence or electrical-policy questions.

| Exact source / locator | Current depiction and remaining review |
| --- | --- |
| `CB16OP038A-02006-DR-EL-0166`, rev1, p1 A / 2–11, B–F / 4–11, G / 1–7 notes5/6; handwritten date unconfirmed | Hopper3 MC416 MV bar, incoming VCB, cable-side earth and separate RC/FC motor routes. |
| `CB17OP023D-01006-DR-EL-0002`, rev2, 28.01.25 AS FOUND 23.10.23, p1 same MV regions | Separate Hopper8 MC416 MV equipment and SZ008 motor identities. No merge with similarly named Hopper3 SS416 equipment. |
| `CB17OP023D-01006-DR-EL-0003`, rev1, 20.09.18 AS BUILT, p1 A–C / 8–10 and C–D / 1–11 | Hopper8 TF416A continuation → MCCB630A → first MC416A 415VAC/630A bar. |
| `520CBC0007-2130-DR-EL-0005`, rev1, 20.01.22 AS BUILT, p1 A–B / 9–10 and C–D / 1–12 | TF420B continuation → ACB01 main switch2000A → first MC420A415VAC/2600A bar. Evidence **EP-H10-LV-ENDPOINT**; **EP-H10-LV-INSTALLED/H10-Q03** remain open for installed/revision/position/interlock scope. |
| `520CBC0003-2140-DR-EL-0002`, rev6, 08.04.22 AS BUILT, p1 A–B / 4–5, C–D / 4–5 and D / 1–12 | TF410B → MC410A CB630A → first415V/630A bar. Evidence **CV-MC410A-ENDPOINT**; **CV-MC410A-INSTALLED/CV-R06/CV-R11** retain installed/reference,433V versus415V, position/interlock and policy scope. |

See [western source review](../drawing-review/supplemental/western-endpoints-review.md), [Hopper10 LV review](../drawing-review/supplemental/hopper10-lv-review.md) and [MC410A review](../drawing-review/supplemental/cv006-lv-review.md). Hopper3 MV has a retained original PDF and independently checked hash. Hopper8 MV/LV and Hopper10 LV were verified from retained indexed full-page captures; original-PDF downloads/hashes remain unconfirmed. MC410A's local PDF content/revision/hash were verified, but its timed-out download attempt and portal/local byte equivalence remain unconfirmed. These distinctions are preserved in the linked source records.

**WH-Q07, WX-INSTALLED, WX-WINDINGS and WX-FUSES** retain installed identities,6.9/6.6kV labels, complete Ronis/key mapping, fuse condition and independent winding/earth policies. The partial note5/6 key conditions do not supply a full truth table. All actual added control states remain null and blocked. No supplemental page confirms switching permission.

**First-LV boundary at MC410A:** the current 23 October package retains `rm410:mc410a:cb` and `rm410:mc410a:bus`. The downstream MC410B breaker/bar and MC410A→MC410B outgoing placeholder are removed from current runtime phase connectivity. Historical `.4`/area sources and MC410B/MEN evidence remain retained; MEN is not phase earth. This is the agreed first-bus boundary, not a claim that MC410B equipment was physically removed.

### MC413 detail received in `.14`

The original PIMS attachment **`00151-CB-02006-DR-EL-1001_11_IFC_02.pdf`** was successfully downloaded and independently visually reviewed: printed drawing **00151-CB-02006-DR-EL-1001**, revision **11**, **14.11.25**, IFC, single PDF page 1. A–B  / 4–5 names upstream **RC001**, reference **11098-07110-EL-DR-2350**, and TF413; C–D  / 4–5 depicts **CB MC413 IN 3000 A**; D  / 1–10 depicts the first **400 V / 3000 A / 50 kA for 1 sec** phase bar. Exact local identity, SHA-256 and inspected regions are in the [MC413 source review](../drawing-review/supplemental/mc413-detail-review.md). This is an additional supplemental page, not a recount of the original 141-PDF intake.

**Inference:** the drawing tag/rating is provisionally attached to existing `rm413:mc413:cb` and `rm413:mc413:bus`. **Confirmed:** the owner identifies RM413’s TF413 feeder→TF413→MC413 as the current supply, with RC001 not the current feeder reference. **Unconfirmed:** whether RC001 is an old name or a drawing error, equivalence of the longer 00151-prefixed identity to the former shortened1001 reference, installed revision precedence, ratings, device positions/mechanisms, complete physical interlocks and independent transformer source/backfeed/earth policies. **SV-MC413-SUPPLEMENT** records depicted evidence; **SV-MC413-INSTALLED** remains open and **SV-Q08** is only partially updated. The first-bus drawing is no longer an unavailable-source request. IFC status and outgoing motor-upgrade notes do not establish installed acceptance or switching permission.

Historical `.14` introduced view **`supplemental/mc413-lv`** and refined captions/evidence without electrical changes. MC413A remains outside the first-LV boundary. Neutral/MEN and earth bars remain separate from the phase bar. The current 23 October package retains that detail and station cut, excludes mine-services/camp/RM718 and limits other TF04 branches to takeoffs. Water is included with its corrected TF12 supply.

### Remaining endpoint and area decisions

| Area / affected asset or interface | Decision and exact source locator | Review IDs / detailed reference |
| --- | --- | --- |
| Prior-scope station DB01/DB01B and other nonretained feeders | The latest owner instruction excludes these station feeder details from required scope. They were retained in historical `.11` and are removed from the current 23 October package. Do not request DB01/DB01B detail or approval of these excluded feeders. | Historical PS-LV-COMPLETENESS / PS-DUPLICATE-TF04 evidence remains in the [station review](../drawing-review/areas/power-station-review.md); current exclusion is recorded in [station battery limits](../drawing-review/supplemental/station-battery-limits-review.md). |
| Crushing 1 MC431/MC431A | MC431A is owner-confirmed downstream of MC431 and excluded; C1-R01 identity/scope is resolved. TF432 is owner-confirmed tier5; C1-R02 is resolved for that label, retaining the original tier3 drawing alias. Source references in the linked area review are retained. | C1-R01, C1-R02; [Crushing 1 review](../drawing-review/areas/crushing-1-review.md). |
| Crushing 2 / HPGR `sw435:interface:mc436` | TF436 is owner-confirmed a spare cubicle with nothing installed downstream; no future LV endpoint is required. Breaker and earth-switch presence is confirmed by answer13; their positions, mechanisms and interlocks remain unconfirmed. TF453/SW453 is owner-confirmed installed and connected to SW435 tier8. MC001/MC438 identity is confirmed; HPGR bay/TF004/TE004 and voltage-label questions remain open; see the exact source comparisons in the area review. | C2-R01–C2-R08; [Crushing 2/HPGR review](../drawing-review/areas/crushing-2-hpgr-review.md). |
| Stockpile/wet: existing TF506 and supplemental MC454/SW455 interfaces | MC454 and SW455 endpoints are now depicted as above; references 8010/8020 are no longer unavailable endpoint-detail questions. Their installed/rating/interlock/policy reviews remain open. TF506 secondary labels 690/720 V also conflict: `500CB-04220-DR-EL-0054.pdf`, rev 3, p1 C–G / 5–10, TF506 feeder; `500CB-04220-DR-EL-0060.pdf`, rev 2, p1 A / 5–7, TF506; B–C, D/Y incomers/bars. | SW-R03–SW-R05, EP-MC454-RATING, EP-INSTALLED-REVIEW; [Stockpile/wet review](../drawing-review/areas/stockpile-wet-plant-review.md) and [supplement](../drawing-review/supplemental/endpoint-sources-review.md). |
| Hopper3/Hopper8 source-scoped SS416 equipment | All three further pages -0166/-0002/-0003 are now represented as above, alongside Hopper3 LV -0165. Confirm installed identity/precedence,6.9/6.6kV labels, fuse condition and complete physical interlocks; no missing-source request remains for those pages. | WH-Q01/WH-Q07, WX-INSTALLED/WX-WINDINGS/WX-FUSES; [western supplement](../drawing-review/supplemental/western-endpoints-review.md). |
| Hopper10 MC420A | The incoming breaker and first LV bar are now depicted from0005 as above; MC420 MV in0004 remains a separate6.6kV assembly. Installed/revision equivalence, positions, interlocks and winding policy remain unconfirmed. | H10-Q03–H10-Q05, EP-H10-LV-INSTALLED; [Hopper10 LV supplement](../drawing-review/supplemental/hopper10-lv-review.md). |
| CV006 MC410A / TF410B | MC410A detail0002 is now represented through its first LV bar; MC410B is excluded downstream, with old source/MEN evidence retained. Resolve TF410B433/415V and upstream RM410-SW03/reference equivalence; TF406B/SW02 versus SW03 remains separate. | CV-R04/CV-R06/CV-R11, CV-MC410A-INSTALLED; [MC410A supplement](../drawing-review/supplemental/cv006-lv-review.md). |
| Services `rm721:interface:rm712`, `rm712:interface:sw426`, `rm712:tf712:removed-lv-cable-end`, `rm712:mcs` | **Confirmed:** RM721 IN02→SF RM712 IN02; RM721→SF RM713 IN01 connected at both ends; no external cable at RM712 IN01; TF712 LV→SW712 incomer. MCS/DG alternative assembly is excluded from this model. **Unconfirmed:** tag/document corrections, retained winding/backfeed/earth policies, names, states and complete physical interlocks. Earlier SW426/pulled-cable descriptions remain historical, not current topology. | SV-Q02–SV-Q05; DES-Q01; [Services review](../drawing-review/areas/services-review.md). |
| Services MC413 and MCC414 | MC413 detail 00151-CB-02006-DR-EL-1001 rev 11 is now represented as above; the RM413/TF413 current supply binding is owner-confirmed. RC001 is not the current feeder reference; its historical cause, prefix equivalence, installed precedence, ratings, mechanisms and complete interlocks remain open. MC413A remains outgoing beyond the first bar. Preserve separate TF414/MCC414, whose sources are `CB095-02004-DR-EL-0014.pdf`, rev4, p1 A–C incomer/bar, and `CB095-02004-DR-EL-0015.pdf`, rev5, p1 continued bar. | SV-Q08 (partial), SV-Q10, SV-MC413-INSTALLED; [MC413 detail](../drawing-review/supplemental/mc413-detail-review.md) and [Services review](../drawing-review/areas/services-review.md). |
| Train loading `sw451:mc451b:section` | Confirm MC451/MC451B section identity and 3000 A versus 500 A labels. `11098-07110-EL-DR-2658.pdf`, rev 12A, p1 C–D incomer/bar; `11098-07110-EL-DR-2672.pdf`, rev 7, p1 D / 2–4; `11098-07110-EL-DR-2673.pdf`, rev 6, p1 B–C / 4–5, bridge to MC451B. The supplied continuity is retained; missing reference 2659 does not establish a separate disconnected bus. | TL-R04; [Train-loading review](../drawing-review/areas/train-loading-review.md). |
| RM718 / water scope and retained shared-area references | RM718 is owner-excluded; SW441/TF441/MC441 is included. Corrected supply: TF12→OPF1-7 pole spur→WT1-CB→SW441 IN01. Remaining water alias/voltage/winding, state and interlock questions are separate. RM711 sewage/study and village/camp questions concern excluded equipment and remain historical. | MC-Q01–MC-Q11; [mine/camp review](../drawing-review/areas/mine-camp-review.md) gives each original filename and detailed region. |

The area register below retains the remaining tag, revision, voltage-description and continuation questions, including Screening SW243/SW423, Desands laboratory earth/identity and TF429 stage 2, wet ES SWXXX/SW505, train-loading ES SW451/SW454 and MC451/MC451B, and Services RM751/RM721 and separate ES-Q8 roles. No revision date or “AS BUILT” stamp has been accepted as a general precedence rule. Record an explicit answer or boundary treatment for every affected open question before whole-network acceptance.

## 4. Confirm electrical relationships and physical device behaviour

### Transformer, converter and earth channels

**Unconfirmed:** installed source-transfer/backfeed relationships and earth continuity across each represented transformer. Construction candidate source pairs are labelled provisional. Empty earth pairs with unconfirmed winding coverage mean unknown coverage; they do not confirm absence of an earth relationship. Confirm source and earth terminal relationships separately, using the named winding terminals in each asset inspector.

Use one global decision record for the review approach, linked to **PS-WINDINGS, C1-R08, C2-R09, SC-R04, DES-Q08, SW-R08, TL-R06, CV-R07, WH-WINDINGS, SV-Q10, H10-Q04, MC-Q04**, then retain transformer-specific confirmations. In particular:

- TF412 has three distinct LV endpoints; TF413A has two separate rectifier AC input boundaries. See `CBC0012-02004-DR-EL-0007.pdf`, rev 9, p1 F–G / 1–3, RM412; D–E / 1–7, TF412/Q200–Q202, and `CB17OP023A-04057-DR-EL-0004.pdf`, rev 5, p1 B–E / 4–8, RM413A/TF413A; **SV-Q09/SV-Q10**.
- HPGR TF001/SW002, 2305 V windings, converter AC/DC and 4000 V motor branches remain distinct. Wet TF505A/B/C 22 → 1.9/1.9 kV drive paths, DC earths and motors remain distinct. Confirm their included scope and relationships; no generic metallic converter shortcut is established. **C2-R10, SW-R06**; use the area registers for the vendor/source gaps.
- Neutral, MEN, NER, equipment-earth and screen-earth symbols are separate evidence. They do not by themselves establish a phase-bus earth or a bridge between separate phase circuits. Preserve **WH-Q11, CV-R06, TL-R06** and the area earth-coverage questions.

### Positions and interlocks

**Explicit owner scope decision, answer24:** cross-station key interlocks between SW411 IN03/IN04 and upstream TF11/TF12 feeder assemblies are known to exist and are deferred from this educational model. Their complete installed conditions remain unconfirmed. This does not defer every network key system or accept any actual device state. Other physical-position/mechanism/interlock reviews remain open; controls stay disabled pending those decisions. See the [exact answer and scope](../drawing-review/supplemental/owner-sw411-feeds-review.md).

Confirm the supported physical position set for each device before its transition rules. An open/closed construction representation is not confirmation that intermediate, isolated, earthed or withdrawn positions are absent. Then confirm physical blocking conditions, exact related asset IDs and key/mechanism identities. The source does not confirm switching permission from an omitted rule.

Review these explicit source distinctions before completing the global interlock decision:

| Evidence to reconcile | Required unresolved decision |
| --- | --- |
| Station `500CBC0002-13015-DR-EL-0001.pdf`, rev 3, p1 C–E tie/fuse and dashed linkages; `station:R003`, R004 | For retained feeder assemblies only: meaning of linkages, separate end breakers/earths and installed conditions; no truth table follows from dashed lines alone. Excluded station buses/generators/other feeders are historical reference, not active review requests. |
| Wet `500CB-04220-DR-EL-0055.pdf`, rev 3, p1 D–F / 3–8; SW-R07 | The note says **INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR**. Confirm the exact physical devices and conditions; do not generalise it into an incoming-device rule. |
| Hopper 10 `520CBC0007-2130-DR-EL-0003.pdf`, rev 3, notes1/4, p1 G / 8–11; `520CBC0007-2130-DR-EL-0004.pdf`, rev 2, notes5/6/8, p1 G / 1–7; H10-Q06 | Distinguish administrative earth wording, Ronis key conditions, upstream-earth mapping, maintenance key captive with earth ON, and door padlock conditions. These are not one complete interchangeable interlock table. |
| Western `CB19OP001C-01068-DR-EL-0001.pdf`, rev 4, note1, p1 F–G / 1–4; respective MV sheets' notes5–8; WH-Q08, WH-POSITIONS | Distinguish administrative restrictions from physical blocks and identify each upstream earth/key. Preserve the individual hopper notes rather than copying a generic rule. |
| Services TF412 and RM413A source regions above; SV-Q06, SV-Q09, SV-Q12 | Confirm Q100/contact/E102 versus separate S100/S101 earth roles and each ES-Q8 mechanism. The TF712 MCS is excluded from this model; no matrix review is requested for that excluded assembly. |

Link the completed review to **sw411:R003, PS-DEVICE-IDS, PL-IDS-INTERLOCKS, C1-R07, C2-R09/C2-R11, SC-R02/SC-R03, DES-Q08, SW-R07, TL-R05, CV-R09, WH-Q08/WH-POSITIONS, SV-Q12, H10-Q06/H10-Q07, MC-Q08/MC-Q11 (retained water equipment only)**. Complete conditions remain unconfirmed; affected controls stay blocked pending their resolution.

## 5. Agree sources and the starting configuration

Only after the identities, topology, positions and interlocks above are resolved, record the starting position of **each** device and availability of **each** source. The current package deliberately records null for actual controls and source availability. Null means **Unconfirmed**, not open, off, unavailable or disconnected.

The current 23 October package has 3 null-availability sources: abstract feeder inputs `boundary:tf11`, `boundary:tf12` and `boundary:tf04`. Station/camp generation and the Services MCS/DG alternative assembly are excluded from this model. This is scope treatment, not a physical-removal statement. Water is included with its corrected TF12/OPF1-7 supply; no source availability is inferred.

**Inference:** each retained feeder has an abstract supply attached to its existing breaker input, not a physical-generator or independent-supply claim. No breaker is bypassed. Each input has separate unconfirmed source and earth coverage; actual external coupling/backfeed and earth continuity remain unconfirmed under **BATTERY-STATION-UNKNOWNS**. Retained physical controls, unresolved interlocks and transformer channels are unchanged. Use the current source IDs and terminal attachments in any later baseline record. IN01/IN02's confirmed lack of incoming supply remains separate from unknown device positions and earth coverage.

Drawing poses, study states, AS FOUND dates and source symbols do not confirm the baseline. Review all retained controls and the three current feeder inputs, including the included water branch. Excluded mine/camp/RM718/MCS/DG configuration questions are historical, not active baseline requests.

## 6. Complete coverage and record immutable acceptance

The [coverage register](../drawing-review/coverage.md) accounts for the original **141 supplied PDF filenames / 140 unique hashes**. One identical-content pair is `11098-07110-EL-DR-2465.pdf` / `11098-07110-EL-DR-2465 (2).pdf`. These are file dispositions, not confirmation that the model covers the installed network. The [supplementary scope review](../drawing-review/areas/supplementary-scope-review.md) records outgoing LV/subordinate source dispositions. Review those dispositions together with each area endpoint decision; the additional Farwest lead has its own record and is not included in that original intake total.

For each original and additional source, retain reviewed in-scope content, an explicit duplicate/reference relationship, or a documented disposition. For every final-LV/external/converter gap, retain the owner's explicit scope and model-treatment decision. A missing exact filename does not prove an equivalent source does not exist, and does not establish a disconnected endpoint.

### Acceptance record — pending

| Required record | Status |
| --- | --- |
| Final whole model ID/version, commit/package identity and included `WN-AREA-<area>` versions | Current inspection snapshot: `site-whole-network` / `construction-2026-10-23.1`, extending immutable `.4`. The latest scoped owner answers and corrected TF12 water spur are applied. Remaining included-network discrepancies, physical interlocks, baseline and explicit whole-model acceptance remain **pending**. |
| Resolutions or explicit owner boundary/treatment decisions for material review questions, including all `WN-JOIN-*` and WN-OWNER-ACCEPTANCE | **Pending overall.** WN-H10-TF04-SOURCE, WN-H10-PRIMARY33-CONFIGURATION, WN-CV006-FEED-AND-REMOVED-H10, WN-SW411-INCOMING-ASSIGNMENT, WN-SW411-TIER16-TAGS, WN-SW411-TIER16-CABLE, WN-CRUSHING-TIE and WN-MINE-TF03-FEED record the eight scoped owner decisions above; remaining questions stay open. |
| Coverage through final LV buses; additional-source and excluded-source dispositions | **Pending owner review.** |
| Reviewed whole diagram, asset identities/connections, winding channels, device positions and physical interlocks | **Pending owner review.** |
| Starting configuration: every device position, source availability and unresolved-boundary treatment, preserved in a scenario snapshot of this same version | **Pending owner confirmation.** |
| Owner name, date and explicit statement accepting that immutable model and starting configuration for this project's educational scope | **Not recorded.** |

The maintainer must version any subsequent change to topology, identities, evidence, interlocks, baseline or presentation, in accordance with [ADR 0007](adr/0007-self-contained-scenarios.md). A previous version's acceptance must not silently transfer to changed content. Software checks and fictional switching examples remain separate evidence from owner confirmation.

## Detailed review register

Use these records when a grouped question needs a closer source comparison. Each contains the original filenames, revisions, pages/regions, depicted relationships and unresolved questions. All ranges below retain every numbered question in that range; global questions are grouped in steps 4–5. Records for excluded station equipment remain historical provenance, not active requests to restore that scope.

| Area | Retained review IDs | Source review |
| --- | --- | --- |
| SW411 | sw411:R001, R002, sw411:R003, sw411:R005; SW411-Q01–Q03; SW411-COVERAGE | [SW411](../drawing-review/areas/sw411-review.md) |
| Station / line | BATTERY-STATION-SCOPE (resolved model boundary only), BATTERY-STATION-UNKNOWNS; station:R001, station:R003, R004, station:R005; PS-DEVICE-IDS, PS-DUPLICATE-TF04, PS-SB02-SR002, PS-WINDINGS, PS-LV-COMPLETENESS, PL-IDS-INTERLOCKS, PL-FUTURE-EXTERNAL | [Station / line](../drawing-review/areas/power-station-review.md) |
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
| Station battery limits | BATTERY-STATION-SCOPE; BATTERY-STATION-REPRESENTATION; BATTERY-STATION-UNKNOWNS | [Station scope record](../drawing-review/supplemental/station-battery-limits-review.md) |
| First supplemental endpoints | EP-INSTALLED-REVIEW; EP-MC454-RATING; partial SW-R04/SW-R05/WH-Q07 | [Supplemental first LV endpoints](../drawing-review/supplemental/endpoint-sources-review.md) |
| Hopper3/Hopper8 further detail | WX-INSTALLED/WX-WINDINGS/WX-FUSES; partial WH-Q07 | [Western supplement](../drawing-review/supplemental/western-endpoints-review.md) |
| Hopper10 LV | EP-H10-LV-INSTALLED; partial H10-Q03 | [Hopper10 LV supplement](../drawing-review/supplemental/hopper10-lv-review.md) |
| MC413 LV detail | SV-MC413-INSTALLED; partial SV-Q08 | [MC413 detail](../drawing-review/supplemental/mc413-detail-review.md) |
| MC410A LV | CV-MC410A-INSTALLED; partial CV-R06/CV-R11 | [MC410A supplement](../drawing-review/supplemental/cv006-lv-review.md) |

`WN-AREA-*` records identify included software packages; they are not drawing confirmation. `station:` and `sw411:` qualify the formerly duplicated R001/R003/R005 questions in the assembled model. [Initial review questions](../drawing-review/review-queue.md) retain their original source context.

**Ownership:** the project owner supplies and confirms electrical decisions and acceptance; the maintainer records the evidence, implements those decisions and updates this packet. Review this packet whenever new evidence, a decision or a model version changes, and again at final handoff. This document records the scoped owner confirmations above; it supplies no additional electrical decision or model acceptance.
