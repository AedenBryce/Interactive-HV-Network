# Review the whole-network construction package

The package is ready for software exploration and owner review. **It is not an accepted installed-network model or an isolation instruction.** GitHub #25's owner acceptance and coverage gates remain open.

## What is included

`wholeNetworkModel` in `src/models/site/whole-network.ts` exports `site-whole-network`, version `construction-2026-10-22.4`. It composes the 13 real area packages without changing those packages: SW411, power station/33 kV, Crushing 1, Crushing 2/HPGR, Screening, Desands/laboratory, stockpile/wet plant, train loading, CV006, western hoppers, services, Hopper 10, and mine/camp.

The construction contains 961 assets, 558 controls, 28 sources and 357 explicit coverage boundaries. Every actual starting control state and source availability remains null. All controls retain unresolved physical-interlock reviews. The source does not confirm that switching is permitted. Five narrowly scoped owner decisions below confirm particular connections, roles or canonical tags; they do not constitute whole-network acceptance.

Software provenance records `WN-AREA-<area>` retain each included model identity and version. They are package metadata, not drawing evidence or owner confirmation. Any change to the imported packages, joins, evidence, presentation, baseline or interlocks requires a new whole-network version before distribution; see ADR 0007.

Station and SW411 both used review IDs R001, R003 and R005. These are now `station:R001` / `sw411:R001`, etc. All affected claim references are relinked; both original questions and evidence sets are retained. Other asset, terminal, connection, source, earth and evidence identities remain unchanged.

## Interface treatment

The package has 17 cross-area joins. Each is `whole:join:<name>`. Nine are supported drawing relationships, four remain provisional and four have scoped owner confirmation. Owner-confirmed primary-input links are separate internal connections. Evidence contains the exact original document, revision, page and drawing region. Supported means depicted by the sources; owner confirmation and remaining open questions are recorded separately.

| Join name | Construction endpoints | Treatment |
| --- | --- | --- |
| sw454 | SW411 tier01 ↔ SW454 incoming | Supported depicted SW454-P-01 |
| sw451 | SW411 tier02 ↔ SW451 incoming | Supported depicted SW451-P-01 |
| sw435 | SW411 tier04 ↔ SW435 incoming | Supported depicted SW435-P-01 |
| sw431 | SW411 tier13 ↔ SW431 incoming | Supported depicted SW431-P-01 |
| sw426 | SW411 tier14 ↔ SW426 incoming | Supported depicted SW426-P-01 |
| sw421 | SW411 tier15 ↔ SW421 incoming | Supported depicted SW421-P-01 |
| crushing-tie | SW431 ↔ SW435, SW431-P-02 | Inference: provisional reconciliation; preserve both end breakers and earth switches, C1-R03/C2-R11 |
| hopper1 | RM413 IN02 double-boot side ↔ RM417 SW01 | Supported depicted SS417-RM417-P01; RM413A remains on the cable-facing side of IN02 |
| hopper8 | RM406 CB03/SW04 ↔ Hopper8 HV416 | Supported depicted route; not Hopper3's identically printed SS416 |
| hopper9 | RM410 CB03/SW04 cable-end marker ↔ RM419 SW01 | Supported depicted route through actual western equipment |
| cv006 | SW411 tier03 ↔ CV006 supply interface | Owner-confirmed 22 kV feed to RM406/RM410; SPARE/OHL aliases and physical hardware review remain open |
| rm721 | SW411 tier16 ↔ RM721 incoming | Inference: route remains provisional; canonical CB/ES model tags corrected by owner, cable and broader R002 scope remain open |
| tf11-in03 | Station SB01 F4 / TF11 / line2 ↔ SW411 IN03 | Owner-confirmed assignment; actual supply availability remains unconfirmed |
| tf12-in04 | Station SB02 F1 / TF12 / line1 ↔ SW411 IN04 | Owner-confirmed assignment; original overview SB01 text retained as drawing evidence |
| mine-tf03 | Station SB01 F1 / TF03 ↔ RM711 source interface | Inference: candidate; exact reference equivalence and study identities/ratings remain open |
| village | Station SB01 F3 ↔ camp/RM732 source interface | Inference: candidate; PS1 ref6160 versus supplied camp ref2349 equivalence is unconfirmed |
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

Original SW454 labels remain drawn aliases/evidence. This correction is not a physical-nameplate inspection record. R002, SV-Q01 and the provisional RM721 route review retain accepted cable identity (`SW454-P-01` versus `RM721-P-01`) and broader current-route/physical identity scope. No accepted cable tag is inferred from this answer.

CV006's `rm410:interface:rm419` is retained as a cable-end/reference asset with empty conductive/source/earth pairs. Its `rm410:rm419-through-rm418` bypass is removed. Western's existing `wh:h9-to-h7:cable` provides the actual represented RM419 SW02 → RM418 SW01 continuation; it is not duplicated.

SW454→SW505 and SW426→RM714 are already internal area connections. TF453/SW453 remains owned by the SW435 power branch; train-loading control/CT references do not create another power feed. Hopper3 and Hopper8 retain distinct scoped SS416/TF416/TF416A identities, and RM418's conflicting CB/transformer aliases remain visible.

## Interfaces deliberately left unjoined

- Former Hopper10 22 kV reference: `cv006:interface:hopper10:port` has no current-line power connection; it remains a superseded drawing reference. Shared old/new pole names do not resolve physical identity. H10-Q01/CV-R01 remain partially open for that scope.
- TF420A/B 22 kV inputs: no input cable or selector connects these terminals. Unknown winding coupling/earth coverage remains explicit; selected 33 kV input wiring is confirmed separately.
- SW411 IN01/IN02: no incoming external source is represented at these confirmed spare interfaces. Earth coverage and device states remain unconfirmed.
- RM721→RM712: ref2252 actually identifies RM711. No precise remote RM712 contact is established.
- SW426→RM712: no named SW426 bay is established. The laboratory SS714 feeder is separate. Shared-reference markers are not conductive cables.
- TF712→SW712: the explicit removed/disconnected cable gap remains. DG1/DG7 inputs and the unresolved changeover matrix are preserved.
- Mine study/overlap markers, RM718 pole-top and water/OPF1 source mappings remain unresolved. No laboratory/sewage TF714 identity merge is made.
- Norfolk/Bigge and other external/future interfaces remain boundaries. The supplemental Farwest source is available for reconciliation; its topology is not silently incorporated into this package.

Final-LV coverage gaps remain explicit at MC454/MC455, SW455 D/Y, future MC436, Hopper3/8 MC416/MC416A, Hopper10 MC420A, station DB01/DB01B and other unresolved continuations. Converter AC boundaries remain separate; neither DC buses nor neutral/MEN references create phase-transfer shortcuts. This list is not coverage acceptance; use the coverage register and all area review records together.

## Navigate and review

The orientation view has 13 separated, labelled area cards. Click a card to open that area's overview. The package retains 121 original area views, adds the orientation and a separate former-line reference view: 123 views total. Card bounds/targets persist in scenarios. Symbols sit below the large headings. Original detail coordinates are retained, with added cross-area stubs and the explicit former-line presentation changes described above.

The orientation also shows declared cross-area cable joins and omits internal switching detail. Cards, coordinates and proximity create no electrical connection.

The orientation is an index, not evidence of a fully connected or supplied network. Remaining winding-policy and endpoint boundaries stay visible; confirmed source/primary wiring does not complete their review.

## Owner gates before acceptance

The open `WN-OWNER-ACCEPTANCE` review requires the owner to:

1. Resolve each material interface/identity discrepancy or explicitly decide its model boundary and treatment. Retain the decision and cited evidence rather than selecting drawing precedence silently.
2. Account for every supplied PDF by reviewed in-scope content, explicit reference/duplicate relationship, or documented disposition. Intake totals and software tests do not establish coverage.
3. Confirm scope through every final LV bus, including each missing endpoint, converter boundary and external/future continuation.
4. Review the complete diagram, supported position sets, actual interlocks, sources and proposed starting configuration. Drawing poses, study states and revision stamps are not baseline confirmation.
5. Explicitly accept the immutable whole-network version and starting configuration. All acceptance remains pending in this package.

## Software checks and their limit

Targeted tests exercise the approved `SimulationSession` interface: package loading, identity/evidence references, exact joined and unjoined ports, area-card navigation, self-contained scenario round-trips, atomic rejection and historical view-only mode. Owner-decision regressions preserve all five exact confirmations, current source/primary joins, removed old-line continuity, spare source-coverage treatment, canonical tags, unresolved winding/cable scope and unchanged null actual states.

Separately identified fictional packages define invented source availability, device positions and permissions solely for cross-area source/earth/path/impact/undo/reset checks. They establish no installed facts or operating permission. Real package baselines and interlocks are never changed to make those scenarios operable.
