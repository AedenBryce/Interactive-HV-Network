# Review the whole-network construction package

The package is ready for software exploration and owner review. **It is not an accepted installed-network model or an isolation instruction.** GitHub #25's owner acceptance and coverage gates remain open.

## Current inspection snapshot: `construction-2026-10-23.1`

`currentNetworkModel` exports **`site-whole-network` / `construction-2026-10-23.1`**, code commit `f5beb4b`. The [latest SW411 feed/key-scope record](../drawing-review/supplemental/owner-sw411-feeds-review.md) records answers22–24. The preceding [route increment](../drawing-review/supplemental/owner-hopper-routes-review.md) records answers16–21, their exact scope and retained uncertainty. Earlier [scope/connection decisions](../drawing-review/supplemental/owner-scope-connections-review.md) and [identity corrections](../drawing-review/supplemental/owner-identities-review.md) remain. The current software inventory is 680 assets, 677 connections, 360 null controls, 3 null sources, 139 earth terminations, 313 coverage boundaries and 91 views. This section supersedes historical scope/connection descriptions below.

- Mine-services RM711/study continuations, village/camp and RM718 unloading are excluded. SW441/TF441/MC441 water-tower/process-water is included. MC431A is downstream of MC431 and excluded beyond the first LV bus.
- The TF04→Hopper10 route remains. Seven other line branches stop at abstract takeoff markers with unknown external source/backfeed and earth coverage. No supplemental Farwest downstream topology is added.
- `owner:join:rm721-rm712` connects RM721 IN02 cable terminal `rm721:in02:b` to SF RM712 IN02 terminal `rm712:in02:a`. Cable tag/reference corrections remain unconfirmed. Former SW426 labels are disputed historical markers with no second supply joined.
- RM721's cable to SF RM713 IN01 is owner-confirmed at both ends. Nothing is attached externally at RM712 IN01; no switch state follows from that answer. TF712's LV cables connect to the SW712 incomer input, retaining that breaker in series. The MCS/DG alternative assembly is outside this model's scope; this does not assert physical removal.
- The corrected water supply is TF12 → OPF1-7 pole spur → WT1-CB → SW441 IN01. The new junction splits the existing TF12→SW411 IN04 line; both the water branch and SW411 continuation remain represented. Earlier TF712 source wording is superseded history, not a second supply.
- TF436 has an owner-confirmed breaker and earth switch but no outgoing cables/downstream feed; actual positions, earth mechanisms and physical interlocks remain unconfirmed. TF432 is tier5, and MC001/MC438 identify the one TF004-fed HPGR LV board. TF453/SW453 is installed and connected to SW435 tier8. The first-bus/transformer details and actual states remain subject to their separate reviews.
- The RM413 IN02 cable-side fork serves RM417/Hopper1 and RM413A. Hopper3 is supplied from RM417 CB02/SW04, and the separate Hopper8 SS416 group from RM406 CB03/SW04. RM410 CB03/SW04 supplies RM419 SW01, then RM419 SW02 supplies RM418 SW01. Hopper7 CB03 feeds TF418/TF418A and CB04 is spare. These are scoped owner confirmations; transformer relationships and switch states are unchanged.
- MC413's current supply is RM413's TF413 feeder→TF413→MC413. RC001 is not its current feeder reference; whether that label is old or erroneous remains unconfirmed, as do rating, reference-prefix, installed-revision, winding and interlock questions.
- The six SW411 processing cable routes are owner-confirmed: tiers01/02/04 to SW454/SW451/SW435, and tiers13/14/15 to SW431/SW426/SW421, using their destination-P-01 cable tags. The known cross-station key conditions between IN03/IN04 and TF11/TF12 are explicitly deferred; they are not declared absent from installed equipment. Other position/mechanism/interlock reviews remain unresolved.
- The three null sources are abstract TF11/TF12/TF04 feeder inputs. Camp, station generator and Services MCS/DG details are excluded from the current whole model. All retained actual controls remain null and blocked pending physical-interlock review. Older snapshots retain their original models and open view-only against `construction-2026-10-23.1`. Inventory counts in the decision record describe software, not installed coverage or acceptance.

The historical details below describe earlier increments. Current scope excludes mine-services/camp/RM718, non-Hopper10 33 kV branch detail and the MCS/DG assembly even where a historical source package contains those assets. Owner acceptance remains pending.

## Historical `.14` snapshot and retained details

`currentNetworkModel` in `src/models/site/current-network.ts` exports **`site-whole-network` / `construction-2026-10-22.14`**; code commit **`db7a756`**. It retains the supplemental details and eight scoped feeding/tag confirmations, applies `withStationBatteryLimits`, then refines the existing MC413 evidence/captions through `withMc413Detail`. Saved older scenarios retain their original immutable snapshots and open view-only against `.14`.

**Station boundary implemented.** The owner states: “The only feeders from SB01 and SB02 that are required are the ones from TF11, TF12 and TF-04. That should be the battery limits.” The confirmed cut is each retained feeder-breaker input, retaining that feeder and transformer and excluding station buses, generators and other feeders. DB01/DB01B and other excluded station feeders are no longer active requests. See the [exact amendment](specs/interactive-hv-network.md#owner-scope-amendment--22-october-2026) and [implementation/source record](../drawing-review/supplemental/station-battery-limits-review.md).

**Unconfirmed:** downstream mine-services and village/camp disposition. They remain provisionally represented pending the owner's answer; no inclusion/exclusion is inferred. `BATTERY-STATION-SCOPE` is resolved only for the confirmed station boundary. `BATTERY-STATION-UNKNOWNS` and whole-network acceptance remain open.

The current inventory is **900 assets, 895 connections, 510 controls with null starting positions, 8 sources with null availability, 350 coverage boundaries and 128 views**, with 13 orientation regions and 24 contactors. Its 15 cross-area joins comprise **9 supported drawing relationships, 1 provisional and 5 owner-confirmed**; 2 internal owner-confirmed primary33 links remain separate. Counts describe software inventory, not installed coverage or acceptance.

Historical `.5`/`.6`/`.7` were endpoint/caption QA packages. Historical `.8` contained 969 assets, 562 controls, 28 sources, 361 boundaries and 126 views and the sixth cable decision. Historical `.11` (commit `90b5663`) contained 1007 assets, 1006 connections, 580 controls, 28 sources, 365 boundaries and 135 views, with 17 cross-area joins (9 supported/2 provisional/6 owner-confirmed). `.12` integrated the station cut; historical `.13` (code commit `afd043a`) refined captions and contained 127 views. Current `.14` adds the received MC413 source detail and one view without changing electrical inventory. Historical packages remain immutable and none has whole-network owner acceptance.

### Implemented station cut

Only physical station prefixes `station:sb01:f4:*`, `station:sb02:f1:*` and `station:sb02:f4:*` remain: 3 CBs, 3 outgoing-side ESs, 3 transformers and 2 continuation interfaces. All `line33:*` equipment remains. Source references are `500CBC0002-13015-DR-EL-0001.pdf`, rev3, p1 B–D (TF11) and F–G (TF12/western TF04), and `CB21OP055B-10016-DR-EL-0089.pdf`, rev0, p1 C (TF04 line origin). The separate SB01 spare TF04 is excluded; no alias-based merge occurs.

**Inference:** abstract provisional supplies `boundary:tf11`, `boundary:tf12` and `boundary:tf04` connect only to each retained CB's `:in` terminal. Their availabilities are null, and their external source and earth coverage remain separately unconfirmed. They are not physical generator identities or confirmed independent supplies. Existing CB/ES states, interlocks, transformer channels and downstream series are preserved; no CB is bypassed. Together with 3 camp generators and 2 Services sources, they form the 8 current null-availability sources.

The scope cut removes runtime joins `whole:join:mine-tf03` and `whole:join:village`. Surviving ports `mine:interface:station-tf03:port` and `camp:interface:station-village:port` retain separate unknown source/earth cut coverage, linked to historical evidence. Mine/camp assets remain provisionally represented. The owner's TF03 feeding fact is retained; graph exclusion does not assert physical disconnection or revoke that confirmation. A retained interlock dependency on an excluded device/source causes an explicit construction error rather than silent rule removal.

### First supplemental endpoint delta — retained from historical `.8`

The [supplemental source review](../drawing-review/supplemental/endpoint-sources-review.md) records exact source/indexed filenames, document IDs, revisions, inspected regions and fingerprints. These supplemental records do not add to or recount the original 141-PDF intake. SW455 and Hopper3 were reviewed from image-bearing full-page sources; their original PDFs were not downloaded and original-PDF hashes are unconfirmed. MC454 uses downloaded `11098-04400-EL-DR-8010_6_IFC_02.pdf`.

| New detail / source | Added assets and scope |
| --- | --- |
| `supplemental/sw455-lv`: `11098-04400-EL-DR-8020`, rev3, p1 A–B / 4–9, B–C / 2 and 10, C–D / 1–10 | Reuses TF455 and its two existing interface ports; adds `sw455:in-d:cb`, `sw455:in-y:cb`, `sw455:bus-d`, `sw455:bus-y`. Separate 2500 A incomers lead to separate D/Y 690 V / 2500 A final phase bars. No direct tie is depicted between the bars on this page. |
| `supplemental/hopper3-lv`: `CB16OP038A-02006-DR-EL-0165`, rev1, p1 A–C / 8–9 and C–D / 1–11 | Reuses source-scoped Hopper3 TF416A/interface; adds `wh:h3:mc416a:in` and `wh:h3:mc416a:bus`, representing the MCCB630 A and first 415 VAC / 630 A phase bar. Handwritten revision date remains unconfirmed; Hopper8's identically printed SS416 tags remain separate identities. |
| `supplemental/mc454-lv`: `11098-04400-EL-DR-8010`, rev6 IFC, p1 A–B / 3–5, C–D / 3–5, D / 1–10; revision H / 2–6 and 11–12 | Reuses TF454/interface; adds `mc454:in:cb` and `mc454:bus`. Preserve printed **3000 A breaker versus 500 A / 400 V phase bar** without correction. MC455 is drawn as an outgoing branch at D–G / 9–10, beyond the first LV bar; it is not an added endpoint. |

The extension adds four incomers, four final LV bars, eight links and three detail views with cross-view navigation. All four new actual positions are null and controls remain blocked by explicit unresolved physical-interlock reviews. Runtime evidence records are `EP-SW455-ENDPOINTS`, `EP-H3-LV-ENDPOINT` and `EP-MC454-ENDPOINT`. `EP-INSTALLED-REVIEW` and `EP-MC454-RATING` remain open, with SW-R04/SW-R05/WH-Q07 updated as partial installed/coverage reviews rather than claims that these received pages are still unavailable.

**Unconfirmed:** installed precedence, current arrangements, supported physical position sets, complete interlocks and transformer source/backfeed/earth policies. Inference: the extension connects the supplemental endpoints through the matching existing source-scoped transformer-output interfaces, subject to cross-document installed-identity review. Existing provisional source pairs and unknown winding/earth coverage remain explicit. Neutral/MEN, screen-earth and control references do not create phase-bus earth links. Outgoing LV circuits remain outside the represented endpoint boundary.

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

**First-LV boundary at MC410A:** current `.14` retains `rm410:mc410a:cb` and `rm410:mc410a:bus`. The downstream MC410B breaker/bar and MC410A→MC410B outgoing placeholder are removed from current runtime phase connectivity. Historical `.4`/area sources and MC410B/MEN evidence remain retained; MEN is not phase earth. This is the agreed first-bus boundary, not a claim that MC410B equipment was physically removed.

### MC413 detail received in `.14`

The original PIMS attachment **`00151-CB-02006-DR-EL-1001_11_IFC_02.pdf`** was successfully downloaded and independently visually reviewed: printed drawing **00151-CB-02006-DR-EL-1001**, revision **11**, **14.11.25**, IFC, single PDF page 1. A–B  / 4–5 names upstream **RC001**, reference **11098-07110-EL-DR-2350**, and TF413; C–D  / 4–5 depicts **CB MC413 IN 3000 A**; D  / 1–10 depicts the first **400 V / 3000 A / 50 kA for 1 sec** phase bar. Exact local identity, SHA-256 and inspected regions are in the [MC413 source review](../drawing-review/supplemental/mc413-detail-review.md). This is an additional supplemental page, not a recount of the original 141-PDF intake.

**Inference:** the drawing tag/rating is provisionally attached to existing `rm413:mc413:cb` and `rm413:mc413:bus`. **Unconfirmed:** RC001 / ref 2350 versus detailed RM413, equivalence of the longer 00151-prefixed identity to the former shortened 1001 reference, installed revision precedence, device positions/mechanisms, complete physical interlocks and independent transformer source/backfeed/earth policies. **SV-MC413-SUPPLEMENT** records depicted evidence; **SV-MC413-INSTALLED** remains open and **SV-Q08** is only partially updated. The first-bus drawing is no longer an unavailable-source request. IFC status and outgoing motor-upgrade notes do not establish installed acceptance or switching permission.

Current `.14` adds view **`supplemental/mc413-lv`** and refines existing captions/evidence only: no asset, phase link, source, earth termination, baseline, transformer relationship or interlock changes. MC413A remains outside the first-LV boundary. Neutral/MEN and earth bars remain separate from the phase bar. The station cut is unchanged; downstream mine/camp disposition is still pending.

### Current Hopper 10 titles

Current `hopper-10/rmu` is **Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed**; `hopper-10/transformers` is **Hopper 10 · Selected 33 kV inputs / MC420A LV**. The new `supplemental/hopper10-lv` depicts the received first LV endpoint. Winding policies, installed source equivalence, device states and interlocks remain unconfirmed.

## Historical `.4` base and retained construction history

`wholeNetworkModel` in `src/models/site/whole-network.ts` exports `site-whole-network`, version `construction-2026-10-22.4`. It composes the 13 real area packages without changing those packages: SW411, power station/33 kV, Crushing 1, Crushing 2/HPGR, Screening, Desands/laboratory, stockpile/wet plant, train loading, CV006, western hoppers, services, Hopper 10, and mine/camp. The shared join treatment and five owner decisions below originate in this base and are retained in current `.14`. The first supplemental endpoints were introduced in intermediate `.5` and retained in historical `.8`; historical `.4` is unchanged.

The historical `.4` construction contains 961 assets, 558 controls, 28 sources and 357 explicit coverage boundaries. Every actual starting control state and source availability remains null in both historical `.4` and current `.14`. All controls retain unresolved physical-interlock reviews. The source does not confirm that switching is permitted. Five narrowly scoped owner decisions below confirm particular connections, roles or canonical tags; they do not constitute whole-network acceptance.

Software provenance records `WN-AREA-<area>` retain each included model identity and version. They are package metadata, not drawing evidence or owner confirmation. Any change to the imported packages, joins, evidence, presentation, baseline or interlocks requires a new whole-network version before distribution; see ADR 0007.

Station and SW411 both used review IDs R001, R003 and R005. These are now `station:R001` / `sw411:R001`, etc. All affected claim references are relinked; both original questions and evidence sets are retained. Other asset, terminal, connection, source, earth and evidence identities remain unchanged.

## Interface treatment

Historical `.4` had 17 cross-area joins (9 supported/4 provisional/4 owner-confirmed), and historical `.11` retained 17 with two later confirmations (9 supported/2 provisional/6 owner-confirmed). Current `.14` retains 15 after removing the mine-TF03 and village runtime joins at the station cut. The table describes those 15 current joins. Each is `whole:join:<name>`. Internal owner-confirmed primary-input links are separate. Evidence retains exact document, revision, page and region; depicted support is not whole-model acceptance.

| Join name | Construction endpoints | Treatment |
| --- | --- | --- |
| sw454 | SW411 tier01 ↔ SW454 incoming | Supported depicted SW454-P-01 |
| sw451 | SW411 tier02 ↔ SW451 incoming | Supported depicted SW451-P-01 |
| sw435 | SW411 tier04 ↔ SW435 incoming | Supported depicted SW435-P-01 |
| sw431 | SW411 tier13 ↔ SW431 incoming | Supported depicted SW431-P-01 |
| sw426 | SW411 tier14 ↔ SW426 incoming | Supported depicted SW426-P-01 |
| sw421 | SW411 tier15 ↔ SW421 incoming | Supported depicted SW421-P-01 |
| crushing-tie | SW431 ↔ SW435, SW431-P-02 | Owner-confirmed current cable and named end connections; WN-CRUSHING-TIE. Both end assemblies retained; remaining C1-R03/C2-R11 scope open |
| hopper1 | RM413 IN02 double-boot side ↔ RM417 SW01 | Supported depicted SS417-RM417-P01; RM413A remains on the cable-facing side of IN02 |
| hopper8 | RM406 CB03/SW04 ↔ Hopper8 HV416 | Supported depicted route; not Hopper3's identically printed SS416 |
| hopper9 | RM410 CB03/SW04 cable-end marker ↔ RM419 SW01 | Supported depicted route through actual western equipment |
| cv006 | SW411 tier03 ↔ CV006 supply interface | Owner-confirmed 22 kV feed to RM406/RM410; SPARE/OHL aliases and physical hardware review remain open |
| rm721 | SW411 tier16 ↔ RM721 incoming | Inference: route remains provisional; canonical CB/ES model tags and RM721-P-01 cable tag are owner-confirmed, physical identity and whole-route acceptance remain open |
| tf11-in03 | Station SB01 F4 / TF11 / line2 ↔ SW411 IN03 | Owner-confirmed assignment; actual supply availability remains unconfirmed |
| tf12-in04 | Station SB02 F1 / TF12 / line1 ↔ SW411 IN04 | Owner-confirmed assignment; original overview SB01 text retained as drawing evidence |
| hopper10-tf04 | `line33:hopper-10:interface:port` ↔ `rm420:interface:pole286:port` | Owner-confirmed current TF04 33 kV feed; WN-H10-TF04-SOURCE |

### Owner decision: Hopper10 current source

On **2026-10-22**, the **Project owner (conversation)** confirmed exactly: **“the 33kV TF04 line feeds Hopper10”**. `WN-H10-TF04-SOURCE` records this wording as owner-confirmed evidence and a resolved review scoped to that feeding route. The connection preserves the upstream pole286 fused ABS and downstream RM420 SW01/ES01; no control is bypassed.

Drawing references retained with the decision are `CB21OP055B-10016-DR-EL-0089.pdf`, rev0 (10.06.22), p1 F-G/10-11, and `520CBC0007-2130-DR-EL-0003.pdf`, rev3 (28.01.25), p1 A-B/8-9 and note3. Subsequent owner decisions below resolve primary selection and identify the old 22 kV line as removed. H10-Q01/CV-R01 retain remaining physical pole/hardware mapping scope.

This first decision is scoped to the feeding route. Generator availability, starting positions, interlocks and whole-network acceptance remain unconfirmed.

### Owner decision: selected TF420A/B primary inputs

The owner stated exactly: **“They are connected with 33kV from the Primary to the 33kV Bus, back through RM420-SW01 onto the 33kV line fed from TF04 supply”**. Record `WN-H10-PRIMARY33-CONFIGURATION`, dated 2026-10-22 by Project owner (conversation), confirms both selected 33 kV inputs and the RM420 33 kV bus identity.

Connections `whole:primary33:tf420a` and `whole:primary33:tf420b` join each existing `:primary-connection:port` to its `:primary33` terminal, after its existing CB/SW feeder. RM420-SW01, all CB/SW/earth devices and their positions remain intact. No selector or 22 kV input is added. Transformer source-transfer pairs remain provisional, earth pairs remain empty with explicit unknown coverage, and the unconnected 22 kV winding terminals retain unknown coupling/earth coverage. They are not asserted electrically dead. H10-Q04 retains winding transfer/backfeed/earth policy and 6.9/6.6 kV label questions.

### Owner decision: current CV006 feed and removed Hopper10 line

The owner stated exactly: **“Rm406 and Rm410 do get their 22kV from SW411 tier 03. The line coming off pole 49-38-1 to Hopper 10 does not exist anymore. It used to be 22kV to hopper 10 but now that is a 33kV line.”** Record `WN-CV006-FEED-AND-REMOVED-H10`, dated 2026-10-22 by Project owner (conversation), confirms the current tier03 RM406/RM410 feed and removal of the former 22 kV Hopper10 line.

The current RM406/RM410 routes are retained. These obsolete drawing-route connections are removed from the whole model:

- `cv006:abs-branch-pole201`
- `cv006:pole201-pole286`
- `cv006:pole286-to-287`
- `cv006:pole286-fused-branch`
- `cv006:fused-abs286-hopper10`
- `cv006:22kv-comparison-port`

The obsolete coverage markers `cv006:interface:hopper10:coverage` and `cv006:interface:line-comparison:{22kv,33kv}:coverage` are removed. All diagram bends/navigation references to removed connections are removed too.

The separate RM420-side CV006 comparison marker is labelled **Former 22 kV**. Its source coverage records no current incoming line, while physical hardware/earth mapping remains unconfirmed; it is not an additional current supply candidate.

Six original pole/switch/interface reference assets remain separately in `cv006/former-hopper10-22`, labelled **Former 22 kV**, with no former-line power edges. They are removed from the current CV006 overview/overhead views. The drawn ABS49-38-1 stub is retained with explicit unknown hardware status: the owner confirmed line removal, not the extent of switch-hardware removal. Old CV006 pole identifiers are not merged into `line33` physical identities. Original drawing evidence remains available.

### Owner decision: station incomers and spare inputs

The owner stated exactly: **“TF11->IN03, TF12-> IN04. IN01 and IN02 are spares and not in use, they are currently not supplied from anywhere”**. `WN-SW411-INCOMING-ASSIGNMENT`, dated 2026-10-22 by Project owner (conversation), confirms both station joins and current spare roles.

IN01/IN02 retain their physical CB/ES devices and null positions. Only the two spare interface boundaries' **sourceCoverage** becomes complete, reflecting confirmed absence of incoming external supply; **earthCoverage** remains unconfirmed. This does not establish open breakers, electrically dead terminals or absence of internal backfeed. FUTURE TFX4 text is retained as drawing-only alias/evidence, without a current external source/transformer being invented. Broad station/SW411 R001 records retain unanswered actual-source availability scope.

### Owner decision: tier16 canonical model tags

The owner stated exactly: **“Good pickup, the Tier 16 should be CB RM721 FD01 and ES RM721 FD 01”**. `WN-SW411-TIER16-TAGS`, dated 2026-10-22 by Project owner (conversation), records a canonical model-tag correction: labels are exactly `CB RM721 FD01` and `ES RM721 FD 01`.

Original SW454 labels remain drawn aliases/evidence. This fifth correction is not a physical-nameplate inspection record and did not itself confirm a cable tag. The subsequent sixth owner decision below confirms that tag; R002, SV-Q01 and the provisional RM721 route review retain broader current-route/physical identity scope.

### Subsequent `.8` owner decision: tier16 cable tag

On **2026-10-22**, **Project owner (conversation)** stated exactly: **“your assumption is correct tht it is RM721-P-01”**. Current-wrapper record **WN-SW411-TIER16-CABLE** preserves the quote as owner-confirmed evidence and a resolved review scoped to the cable tag. The accepted model cable tag is **RM721-P-01**, attached to `sw411:tier-16:interface` and `services:interface:sw411` and linked through `whole:join:rm721`. This sixth record belongs to `.8`; historical `.4` retains its original five decisions.

Source references remain `11098-07110-EL-DR-5151.pdf`, rev7, p1 D–G / 11–12, with printed SW454-P-01, and `11098-07110-EL-DR-2256.pdf`, rev3, p1 B–D / 6–7, with RM721-P-01. Original SW454-P-01 aliases/evidence remain traceable. The cable tag is no longer an unanswered question. Physical-nameplate inspection, whole-route acceptance, actual states, availability, complete physical interlocks and baseline remain **Unconfirmed**. R002, SV-Q01 and WN-JOIN-rm721 remain partially open, and the join remains provisional.

### Seventh scoped decision: Crushing 1 / Crushing 2 tie

On **2026-10-22**, **Project owner (conversation)** answered exactly **“confirmed”** to the full question recorded in **WN-CRUSHING-TIE**:

> Next connection to confirm: is SW431-P-02 the current tie between Crushing 1 SW431 and Crushing 2 SW435, with CB SW435 FD02 at the SW431 end and CB SW431 FD02 at the SW435 end? Sources:11098-07110-EL-DR-2353.pdf rev5 p1 C-G/2-3,2354rev9p1 B-G/2-3. Please correct any detail or say unconfirmed.

This confirms `whole:join:crushing-tie`, between `sw431:interface:sw435:port` and `sw435:interface:sw431:port`, with the cable and named end connections in that question. Both end breaker/earth assemblies remain represented. It does not resolve C1-R03's disputed overview document reference or C2-R11's remaining configuration, fuse continuity, racking, interlocks and null baseline.

### Eighth scoped decision: station TF03 / mine feed

On **2026-10-22**, **Project owner (conversation)** answered exactly **“It does”** to the full question recorded in **WN-MINE-TF03-FEED**:

> Does station SB01 feeder F1, through TF03, currently supply RM711/the mine-services 22 kV line? The construction currently treats this as unconfirmed. Sources: 500CBC0002-13015-DR-EL-0001.pdf rev 3, page 1 B–D (SB01 F1/TF03), and 11098-07110-EL-DR-2252.pdf rev 5, page 1 A–C/1–3 (RM711 incoming). Please confirm the current arrangement, correct it, or say “unconfirmed”.

This confirmed the historical `.11` feeding fact represented by `whole:join:mine-tf03`, linking `station:sb01:f1:interface` and `mine:interface:station-tf03`. The runtime join is removed in current `.14` by the station cut, with its evidence retained and unknown source/earth coverage at the surviving mine port. The separate study marker remains unjoined. Exact reference equivalence, study SS711B/TF717 overlap and ratings, source availability, states, winding policies and complete interlocks remain **Unconfirmed**. The subsequent battery-limit instruction does not erase this recorded feeding fact; whether its downstream area remains in the next runtime scope awaits clarification.

CV006's `rm410:interface:rm419` is retained as a cable-end/reference asset with empty conductive/source/earth pairs. Its `rm410:rm419-through-rm418` bypass is removed. Western's existing `wh:h9-to-h7:cable` provides the actual represented RM419 SW02 → RM418 SW01 continuation; it is not duplicated.

SW454→SW505 and SW426→RM714 are already internal area connections. TF453/SW453 remains owned by the SW435 power branch; train-loading control/CT references do not create another power feed. Hopper3 and Hopper8 retain distinct scoped SS416/TF416/TF416A identities, and RM418's conflicting CB/transformer aliases remain visible.

## Interfaces deliberately left unjoined

- Former Hopper10 22 kV reference: `cv006:interface:hopper10:port` has no current-line power connection; it remains a superseded drawing reference. Shared old/new pole names do not resolve physical identity. H10-Q01/CV-R01 remain partially open for that scope.
- TF420A/B 22 kV inputs: no input cable or selector connects these terminals. Unknown winding coupling/earth coverage remains explicit; selected 33 kV input wiring is confirmed separately.
- SW411 IN01/IN02: no incoming external source is represented at these confirmed spare interfaces. Earth coverage and device states remain unconfirmed.
- RM721→RM712: current `.15` has the owner-confirmed IN02-to-IN02 cable join. Wrong2252 reference and cable tag remain unconfirmed.
- SW426/RM712: the owner identifies RM721 as the current RM712 IN02 connection. Earlier SW426 labels remain disputed historical references, with no second supply or missing-bay requirement. The laboratory SS714 feeder remains separate.
- TF712→SW712: current `.16` uses the owner-confirmed incomer connection. The older gap/DG/MCS depiction remains historical; the alternative assembly is excluded from this model.
- Mine/camp/RM718 detail is excluded. Current `.16` includes water via the owner-corrected TF12/OPF1-7/WT1 route. Historical study overlaps do not create extra joins or a laboratory/sewage TF714 identity merge.
- Norfolk/Bigge and other external/future interfaces remain boundaries. The supplemental Farwest source is available for reconciliation; its topology is not silently incorporated into this package.

Historical `.4` retained missing-detail interfaces at MC454/MC455, SW455 D/Y, Hopper3 MC416A, Hopper3 MV, Hopper8 MV/LV, Hopper10 MC420A and MC410A. Current `.14` depicts the received endpoints and MV branches documented above; their installed/interlock/policy reviews remain open. MC455 and MC410B are outgoing branches beyond the respective first LV bars and are not additional current runtime endpoints. Future MC436 and other unresolved continuations remain review matters. Station DB01/DB01B and other excluded feeder details are no longer active requests under the confirmed scope amendment, and are removed from current `.14`. Mine/camp disposition remains pending. Converter AC boundaries stay separate; neither DC buses nor neutral/MEN references create phase-transfer shortcuts. Use the coverage register, supplemental records and area reviews together; this is not coverage acceptance.

## Navigate and review

The orientation view has 13 separated, labelled area cards. Click a card to open that area's overview. Historical `.4` retains 121 original area views, adds the orientation and a separate former-line reference view: 123 views total. Historical `.8` added three supplemental endpoint detail views for 126 total. Historical `.11` contained 135 views after the further source extensions. Historical `.13` had 127 views after the station-cut presentation update; current `.14` adds `supplemental/mc413-lv` for 128 total. The supplemental LV and western MV/motor views remain. Card bounds/targets persist in scenarios. Symbols sit below the large headings. Original detail coordinates are retained, with added cross-area stubs, the explicit former-line presentation changes and the supplemental navigation described above.

The orientation also shows declared cross-area cable joins and omits internal switching detail. Cards, coordinates and proximity create no electrical connection.

The orientation is an index, not evidence of a fully connected or supplied network. Remaining winding-policy and endpoint boundaries stay visible; confirmed source/primary wiring does not complete their review.

## Owner gates before acceptance

The open `WN-OWNER-ACCEPTANCE` review requires the owner to:

1. Resolve each material interface/identity discrepancy or explicitly decide its model boundary and treatment. Retain the decision and cited evidence rather than selecting drawing precedence silently.
2. Account for every supplied PDF by reviewed in-scope content, explicit reference/duplicate relationship, or documented disposition. Intake totals and software tests do not establish coverage.
3. Retain the implemented station/downstream exclusions and the confirmed water inclusion/supply. Confirm coverage through each included final LV bus, converter boundary and external continuation. Excluded station/mine-services/camp/RM718, MCS/DG and non-Hopper10 branch details do not require approval for V1.
4. Review the complete diagram, supported position sets, actual interlocks, sources and proposed starting configuration. Drawing poses, study states and revision stamps are not baseline confirmation.
5. Explicitly accept the immutable whole-network version and starting configuration. All acceptance remains pending in this package.

## Software checks and their limit

Targeted tests exercise the approved `SimulationSession` interface: package loading, identity/evidence references, exact joined and unjoined ports, area-card navigation, self-contained scenario round-trips, atomic rejection and historical view-only mode. Original `.4` owner-decision regressions preserve its five exact confirmations, source/primary joins, removed old-line continuity, spare source-coverage treatment, canonical tags, unresolved winding/route scope and unchanged null actual states.

Separately identified fictional packages define invented source availability, device positions and permissions solely for cross-area source/earth/path/impact/undo/reset checks. They establish no installed facts or operating permission. Real package baselines and interlocks are never changed to make those scenarios operable.
