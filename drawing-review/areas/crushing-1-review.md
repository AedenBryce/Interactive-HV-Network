# Crushing No. 1 / SW431 source review

Reviewed: 22 October 2026. Preparation for GitHub #14. **Drawing review only: no runtime model or installed configuration has been accepted.**

Full pages and detailed crops were visually inspected after rendering the PDFs. Text searches located candidates; text extraction alone was not used to establish connectivity. All supplied files listed below have one PDF page. Grid locations refer to the printed drawing grid; descriptive regions supplement grids where labels sit across a boundary.

## Sources inspected

| Ref | Exact supplied filename | Printed revision and revision date | Page | Relevant region / purpose |
| --- | --- | --- | --- | --- |
| C1-S01 | `11098-07110-EL-DR-2353.pdf` | 5, 28/01/25; entry says AS FOUND 23.10.23 | 1 | Complete SW431 HV SLD; main topology is rows B-G, columns 1-10 |
| C1-S02 | `11098-07110-EL-DR-2354.pdf` | 9, 28/01/25; entry says AS FOUND 23.10.23 | 1 | SW435 HV SLD; SW431 interface is tier 2, rows B-G, columns 2-3 |
| C1-S03 | `11098-07110-EL-DR-2455.pdf` | 5, 17/08/09; issued for as-built | 1 | SW432; transformer and two incomers/buses in rows A-C, columns 1-10 |
| C1-S04 | `11098-07110-EL-DR-2457.pdf` | 7, 08/01/26; issued for construction, CB25OP003A | 1 | SW437 sheet 1; incoming transformer/buses in A-C; notes at A-B, columns 11-12 |
| C1-S05 | `11098-07110-EL-DR-2458.pdf` | 6, 20/08/09; issued for as-built | 1 | SW437 sheet 2; continuation of the same two LV bars, rows B-C |
| C1-S06 | `11098-07110-EL-DR-2459.pdf` | 7, 04/03/16; issued for construction, stacker upgrade | 1 | SW442 sheet 1; transformer/incomers/buses in A-C, columns 1-10; raster source |
| C1-S07 | `11098-07110-EL-DR-2470.pdf` | 6, 04/02/16; issued for construction, stacker upgrade | 1 | SW442 sheet 2; same two LV bars continue across row C; raster source |
| C1-S08 | `11098-07110-EL-DR-2654.pdf` | 7, 14/11/25; issued for review, CB25OP003A | 1 | MC431 sheet 1; TF431 and incomer in A-D, columns 4-6; main bar in row D |
| C1-S09 | `11098-07110-EL-DR-2670.pdf` | 7, 14/11/25; issued for construction, CB25OP003A | 1 | MC431 sheet 2; same 400 V bar continues in row D |
| C1-S10 | `CB-10016-DR-EL-0011.pdf` | 0, 27/10/25 | 1 | OPF overview sheet 2; SW431/SS431 panel in B-D, columns 3-6; main feeder at upper left/middle |
| C1-S11 | `CB-10016-DR-EL-0010.pdf` | 0, 27/10/25 | 1 | OPF overview sheet 1; SW435/SR435 panel at upper right, A-C, columns 7-12 |
| C1-S12 | `11098-07110-EL-DR-5151.pdf` | 7, 28/01/25; entry says AS FOUND 23.10.23 | 1 | Main switchroom; SW431 feeder tier 13, rows D-G, columns 8-9 |
| C1-S13 | `11098-07110-EL-DR-2350.pdf` | 16, 31/05/16; as-built | 1 | Earlier mine distribution overview; SS431/transformers in C-E, columns 5-8; raster source |

The revision status is transcribed from the source. **Unconfirmed:** which revision or sheet governs the installed arrangement. No precedence between overview and detailed drawings has been established.

C1-S10 and C1-S11, page 1, notes 1-2 at lower left, expressly identify those drawings as high-level reference overviews and direct the reader to relevant SLDs, HV switching programs and key interlocking procedures. Those notes do not establish any particular device's interlock conditions.

## Drawing-supported HV connections

The following records describe what is drawn. They do not confirm installed positions, source availability, accepted asset identities or an agreed starting configuration. Arrow notation below follows the drawn route for readability; it does not establish permitted reverse energisation behaviour.

| Record | Drawn route / asset identities | Source and region |
| --- | --- | --- |
| C1-T01 | SW411 SW431 feeder, `CB SW431 FD 01`, has cable `SW431-P-01` to SS431 / HV switchboard SW431. Earth switch `ES SW431 FD 01` branches from the outgoing cable side of this main-switchroom feeder. | C1-S12, p1, tier 13, D-G / 8-9. C1-S10, p1, SW411 tier 13 and dashed route into SS431. |
| C1-T02 | At SW431, `SW431-P-01` enters `CB SW431 IN 01` and then the single drawn 22 kV bar. `ES SW431 IN 01` branches from the incoming cable side, above that breaker. The incoming off-page reference names HV switchboard SW411 / drawing 07110-EL-DR-5151. | C1-S01, p1, A-C / 1-2; C1-S10, p1, top of SS431 panel. |
| C1-T03 | The SW431 bar has a direct bus-earth branch tagged `ES SW431`, distinct from the cable-side incomer and feeder earth switches. | C1-S01, p1, C-E / 5, bus-earth column; C1-S10, p1, SS431 tier 3. |
| C1-T04 | SW431 bar to `CB SW435 FD 02`; its outgoing cable-side node also branches through `ES SW435 FD 02` to earth. Power cable `SW431-P-02` continues to SW435. | C1-S01, p1, C-G / 2-3, SW435 feeder. C1-S10, p1, SS431 tier 2 and off-page SW435 arrow. |
| C1-T05 | The opposite end of `SW431-P-02` is the SW435 tier-2 branch, locally tagged `CB SW431 FD 02` and `ES SW431 FD 02`. It connects to the SW435 22 kV bar, separately from the SW435 incomer from SW411. | C1-S02, p1, B-G / 2-3; C1-S11, p1, SW435 tier 2 and SW431 off-page arrow. |
| C1-T06 | SW431 bar to `CB TF431 FD`, then power cable `TF431-P-01` to transformer TF431. `ES TF431 FD` branches from the transformer cable side of the feeder breaker to earth. | C1-S01, p1, C-G / 3-4; C1-S10, p1, SS431 tier 4 and TF431. |
| C1-T07 | SW431 bar to `CB TF432 FD`, then `TF432-P-01` to TF432. `ES TF432 FD` branches from the transformer cable side. | C1-S01, p1, C-G / 5-6; C1-S10, p1, SS431 tier 5 and TF432. Tier-label discrepancy is retained below. |
| C1-T08 | SW431 bar to `CB TF437 FD`, then `TF437-P-01` to TF437. `ES TF437 FD` branches from the transformer cable side. | C1-S01, p1, C-G / 7-8; C1-S10, p1, SS431 tier 6 and TF437. |
| C1-T09 | SW431 bar to `CB TF442 FD`, then `TF442-P-01` to TF442. `ES TF 442 FD` is the spacing used on C1-S01; the overview uses `ES TF442 FD`. The earth branch is on the transformer cable side. | C1-S01, p1, C-G / 9-10; C1-S10, p1, SS431 tier 7 and TF442. |

**Inference for construction:** C1-T04 and C1-T05 describe opposite ends of one cross-area circuit, supported by the matching `SW431-P-02` cable and reciprocal references. Keep both physical breakers/earth switches; do not merge the two destination-based breaker names into one device. The owner has not yet confirmed this interpretation or an accepted normal state.

Control, CT, protection, communications and DC supply lines on C1-S01 are visibly distinct from the power cable routes. Cables ending `-C-...`, relay contacts, phase-CT references and fibre links are not additional HV supply connections. The drawn 22 kV/110 V VT branch is not a final LV distribution bus within the requested endpoint scope.

## Transformer arrangements and final LV endpoints

| Record | Explicit drawn arrangement / power route | LV endpoint to retain | Evidence |
| --- | --- | --- | --- |
| C1-L01 | TF431 is drawn with a delta HV winding and star LV winding, labelled 22 kV/400 V, 2.0 MVA. Its phase output enters `CB MC431 IN` (3000 A) and then the MC431 400 V main bar. | One MC431 phase-bus endpoint, labelled 400 V, 3000 A. | C1-S08, p1, A-D / 4-6, transformer/incomer; row D main bar. C1-S01, p1, G / 3-4 identifies TF431/MC431 and references 2654/2670. |
| C1-L02 | TF432 has three winding symbols: HV delta and two LV windings delta/star. Label is 22 kV/690 V/690 V, 5 MVA. The drawn delta LV output uses the `SW432-P-01-*` cable group and `CB SW432 IN D`; the star LV output uses `SW432-P-02-*` and `CB SW432 IN Y`. Each breaker is labelled 2500 A. | Two separate SW432 bars: delta-marked and star-marked, each 690 V, 2500 A. | C1-S03, p1, A-C / 1-10, transformer at A-B / 5-6, incoming breakers at columns 2 and 9. C1-S10, p1, TF432 symbol corroborates three windings. |
| C1-L03 | TF437 has the corresponding three-winding delta / delta / star symbol, 22 kV/690 V/690 V, 5 MVA. `SW437-P-01-*` feeds `CB SW437 IN D`; `SW437-P-02-*` feeds `CB SW437 IN Y`; each is 2500 A. Its power off-page reference names SW431 / 07110-EL-DR-2353. | Two SW437 bars: delta-marked and star-marked, each 690 V, 2500 A. | C1-S04, p1, A-C / 1-10. C1-S05, p1, B-C shows both bars continuing from 2457. Control-reference/body-title discrepancies below remain open. |
| C1-L04 | TF442 has the same explicitly drawn three-winding delta / delta / star arrangement, 22 kV/690 V/690 V, 5 MVA. `SW442-P-01-*` feeds `CB SW442 IN D`; `SW442-P-02-*` feeds `CB SW442 IN Y`; both are 2500 A. | Two SW442 stockpiling bars: delta-marked and star-marked, each 690 V, 2500 A. | C1-S06, p1, A-C / 1-10. C1-S07, p1, C, continues both bars from 2459. C1-S01, p1, G / 9-10 identifies TF442 and SW442. |

This yields **seven drawn final LV phase-bus sections across four boards**, not seven separate switchboards. C1-S09 continues the MC431 bar from C1-S08; it does not establish another incoming supply in the inspected page. C1-S05 and C1-S07 continue their respective dual bars and show outgoing LV equipment beyond the selected endpoints.

**Unconfirmed:** permitted source-connectivity/backfeed relationships between transformer windings. The SLD winding symbols and supply cable routes do not explicitly establish a universal LV-to-HV or LV-to-LV operating rule. Record HV, LV-delta and LV-star terminals separately. Any proposed simulation relationship beyond the represented incoming-to-output route requires an explicit provisional interpretation and owner resolution; do not permanently short the two LV bars together.

At TF431, C1-S08, p1, C-D / 5-7 explicitly draws the star-neutral connection to a neutral bar, a MEN link, and an earth bar. That neutral path is separate from the 400 V phase bar. **Inference for construction:** a phase-connectivity model must not silently convert this neutral/MEN connection into a phase-bus earth-switch path. The intended neutral representation remains unconfirmed; no phase earth conflict should be inferred solely from the MEN annotation.

Outgoing LV drives, motors, UPS circuits, MCC outgoing distribution, subordinate LV boards and the SW442 bogie-wheel distribution are beyond the requested final LV bus boundary. They were inspected to check bus continuations; no outgoing circuit needs to be constructed for this area slice.

## Physical interlocks and states

- C1-S01, p1, the breaker/earth-switch columns, shows dashed associations and control/relay wiring around withdrawable breaker symbols and earth switches. Its explicit note 1 concerns 48 V DC supplies. **Unconfirmed:** the complete physical interlock conditions, key identities, racking positions and permitted transitions for the represented HV controls. The source does not confirm this. Do not substitute the synthetic breaker/earth-switch rules for site rules.
- C1-S04, p1, notes 1-2 at A-B / 11-12 explicitly refers to statutory safety relays and states that CV105/SH105 power isolators have a key interlock preventing the isolator being turned off before operating the isolator key switch; it also describes an auxiliary contact that trips the VSD. These are outgoing LV isolators beyond the selected LV bus endpoints. The note does not establish an SW431 HV breaker/earth-switch interlock or a complete key sequence for this model's HV controls.
- C1-S12, p1, note 3 at upper right says mechanical interlock of earthing is to be provided to switchyard and power station. **Unconfirmed:** applicability and installed conditions at SW431. The source does not confirm this.
- Drawn open-style symbols are not an owner-accepted starting configuration. All baseline device states and enabled source availability remain unconfirmed.

## Discrepancies retained for step-by-step owner review

**Later owner answer, 22 October 2026, C1-R01:** “MC431A is an LV switchboard that is fed from MC431. Not required for this tool.” MC431A is therefore excluded downstream of the first MC431 LV bus; it is not an active missing-endpoint request. The original discrepancy below is preserved as historical context. C1-R02–R08 remain separate reviews. See the [owner decision record](../supplemental/owner-scope-connections-review.md).

| Local ID | Evidence difference | Construction consequence / unresolved decision |
| --- | --- | --- |
| C1-R01 | C1-S10, p1, below TF431, labels both `MC431` and `MC431A`. C1-S08, p1, only identifies the MC431 incoming phase bus; C1-S09 is its continuation. A repository text search finds `MC431A` only in C1-S10, which is not proof that raster drawings contain no other reference. | **Unconfirmed:** identity, existence and supply route of MC431A. Do not silently drop or invent a second directly supplied endpoint. Preserve an unresolved coverage record pending further evidence/owner confirmation. |
| C1-R02 | C1-S01 TF432 feeder callout reads TIER 3, while its bus-earth callout also reads TIER 3; C1-S10 labels TF432 feeder TIER 5 and bus earth TIER 3. | **Unconfirmed:** installed/canonical TF432 bay position. Asset tag TF432 can be retained with both tier aliases; do not infer a topology difference from the tier text. |
| C1-R03 | C1-S11, p1, SW431 off-page reference above SW435 tier 2 reads `500CBC0002-13015-DR-EL-2353`. The supplied detailed SW431 source is `11098-07110-EL-DR-2353.pdf`; that exact 500CBC...2353 PDF is not in the supplied inventory. | **Unconfirmed:** intended reference identifier. Retain the source text and missing-reference status rather than rewriting it as confirmed. |
| C1-R04 | C1-S04 body heading says Crushing No.2 variable speed drive switchboard, while its title block says SW437 - Crushing No.1. Its power feed names SW431/2353, but its left/right incomer-control/CT off-page references name SW435/2354. C1-S01 identifies TF437 power feeder and SW437 controls under SW431. | **Unconfirmed:** naming and control reference corrections. The drawn power route can be recorded with its evidence; do not create a second power source from the CT/control references. Preserve both area aliases and control-reference discrepancy. |
| C1-R05 | C1-S13, p1, SS431 transformer labels show TF431 22 kV/415 V and TF432/TF437/TF442 22 kV/720 V/720 V. Detailed C1-S08 shows 400 V; C1-S03/04/06 show 690 V. C1-S10 overview labels 0.4 kV and 0.69 kV. | **Unconfirmed:** agreed display/rating labels and whether this is a revision/nominal-voltage distinction. No precedence or electrical calculation is inferred. |
| C1-R06 | C1-S08 rev7 is issued for review; C1-S09 rev7 is issued for construction. Their revision dates are both 14/11/25. The various HV/LV sheets have different dates and issue statuses. | **Unconfirmed:** accepted source set and installed configuration. Revision recency or issue wording alone is not an owner acceptance decision. |
| C1-R07 | All reviewed drawings describe symbols and connections but do not explicitly resolve the complete physical interlock conditions or owner baseline for the 20 tagged switchable HV/LV-incomer controls identified in this review. | Interlock review must remain unresolved for affected controls; initial states remain unconfirmed until evidence or owner confirmation establishes them. No operational permission is established. |
| C1-R08 | Three-winding symbols identify separate LV delta/star outputs but do not state complete reverse-energisation semantics. | Keep separate winding terminals and endpoint bars; record provisional simulation relationships for explicit owner review. |

## Suggested construction structure

The following are **Inference / proposed model identifiers**, not labels verified on the drawings:

1. Use a single SW431 HV phase-bus asset; preserve `SS431` and SW431 location/display aliases with source references rather than automatically treating them as additional electrical buses.
2. Keep SW411-to-SW431 and SW431-to-SW435 as distinct boundary circuits. The SW435 cross-link needs two physical end breakers and two cable-side earth switches. Use the cable identifiers to reconcile interface records with the neighbouring area model.
3. Keep four transformers, their separate winding terminals, seven LV phase-bus endpoint assets and seven named LV incomer breakers. Do not create outgoing LV circuits.
4. Keep six SW431 feeder/incomer breaker-and-earth pairs: incomer, SW435 feeder and four transformer feeders. Add the separate bus earth (13 HV devices), then seven LV incomer breakers (20 tagged controls total). This count excludes the external SW411 feeder-end devices, CT/control contacts and untagged auxiliaries.
5. Attach exact source/revision/page/region records to every constructed connection. Keep C1-R01 through C1-R08 in area review metadata without resolving them by inference.

Owner acceptance of the whole network, cross-area identity reconciliation, starting configuration, source availability, physical interlocks and discrepancy resolutions remains pending. This review does not close GitHub #14 or establish an accepted area model.
