# Station battery limits: scoped owner decision

Date: 22 October 2026. This records a model-scope decision and its implementation boundary. It is not installed-network acceptance, an isolation instruction or a new drawing-coverage claim. Mine/camp disposition is pending and this helper does not remove mine/camp assets.

## Exact owner answers

Scope:

> Not relevant for the scope of this tool. The only feeders from SB01 and SB02 that are required are the ones from TF11, TF12 and TF-04. That should be the battery limits.

Cut location:

> At its SB01/SB02 feeder breaker, retaining that feeder and transformer but excluding station buses, generators and other feeders

The model records these answers verbatim under `BATTERY-STATION-SCOPE`, with confirmation by `Project owner (conversation)`, date `2026-10-22`. Its resolved review is restricted to model scope. Neither answer confirms source availability, actual switch states, physical interlock conditions, external source coupling/backfeed or independent earth continuity. The source does not confirm switching is permitted.

## Retained feeder identities and source provenance

| Feed | Retained station prefix | Abstract supply feeds | Preserved downstream route |
| --- | --- | --- | --- |
| TF11 / SB01 F4 | `station:sb01:f4:*` | `boundary:tf11:port` to `station:sb01:f4:cb:in` | Existing transformer, continuation/interface and `whole:join:tf11-in03` to SW411 IN03 |
| TF12 / SB02 F1 | `station:sb02:f1:*` | `boundary:tf12:port` to `station:sb02:f1:cb:in` | Existing transformer, continuation/interface and `whole:join:tf12-in04` to SW411 IN04 |
| TF04 / SB02 F4 | `station:sb02:f4:*` | `boundary:tf04:port` to `station:sb02:f4:cb:in` | Existing transformer output and `line33:station-to-recloser` to the retained 33kV line |

The existing physical feeder records cite `500CBC0002-13015-DR-EL-0001.pdf`, revision3, page1: B-D for SB01 F4/TF11, F-G for SB02 F1/TF12 and SB02 F4/TF04. The TF04 line continuation retains `CB21OP055B-10016-DR-EL-0089.pdf`, revision0, page1 C, station origin SR-002 PANEL F4/TF04. Those source references and their unresolved alias/winding questions are retained; they are not replaced by the scope decision.

The retained station assets are the three CBs, three outgoing-side ESs, three transformers and TF11/TF12 continuation interfaces: 11 existing assets. `station:sb01:spare-tf04:transformer` is a different former record and is excluded with the other station feeders. No alias-based TF04 merge is performed.

## Abstract supply representation

Inference: each retained breaker upstream input has an abstract model supply, using source/asset identities `boundary:tf11`, `boundary:tf12`, `boundary:tf04`. All three availabilities start null. These are provisional representations, not three physical generator claims; the interpretation is recorded separately as `BATTERY-STATION-REPRESENTATION`.

Each source has one link, `boundary:<name>:feeder-input`, to that feeder's existing `cb:in` terminal. No source is connected to the breaker output, transformer output or remote incomer. The existing breaker state therefore remains part of every represented supply path. Retained CB/ES positions, relationships, null baselines, interlock reviews/rules and transformer source/earth pairs are unchanged.

Each input has `boundary:<name>:coverage`, with source coverage and earth coverage both unconfirmed. No external station bus, tie, source-coupling relationship or shared metallic earth is introduced. Absence of an outside-model tie is not confirmation that the three physical supplies are independent. Actual transformer source/backfeed and independent earth policy remain unconfirmed. `BATTERY-STATION-UNKNOWNS` remains open.

## Excluded station internals and retained outside interfaces

All other `station:*` assets are removed from the active graph, including station buses, 23 generator branches, other feeders, tie hardware, earthing-transformer records and the separate spare TF04. Their connections, source records, state entries, earth terminations, coverage records and interlock records are removed only where their target identities are excluded.

Two former whole-model joins cross from an excluded station feeder to a retained non-station interface:

- `whole:join:mine-tf03`: excluded `station:sb01:f1:interface:port` to retained `mine:interface:station-tf03:port`.
- `whole:join:village`: excluded `station:sb01:f3:interface:port` to retained `camp:interface:station-village:port`.

Those graph edges are removed. Existing mine/camp coverage records remain intact. Additional scope-cut records, `boundary:excluded-station:whole:join:mine-tf03` and `boundary:excluded-station:whole:join:village`, retain unconfirmed source/earth coverage at the surviving ports and link the former connection's evidence/reviews. They do not assert installed disconnection or unavailable supplies.

All historical evidence and review records are retained, including any input owner-confirmation record for the TF03 feeding route. Excluding an active graph route does not revoke that historical fact. Mine/camp equipment, its three null-availability generators, SW441/TF441/MC441, RM711/RM718 and the independent services DG1/DG7 records remain in this helper's output. Their separate scope questions are not resolved here.

## Interlock dependency guard

Before pruning, every rule whose target asset survives is inspected recursively, including nested all/any conditions. If it depends on any removed device or source, the helper throws an explicit station battery-limit review error naming the rule and dependencies. The helper does not silently delete, weaken or remap such a rule. Retained rules without excluded dependencies remain unchanged. Reapplying the helper to an already-cut package also throws explicitly, rather than duplicating identities.

## Presentation and package integrity

The new `station/overview` shows only the 11 retained station assets and three abstract supplies. It has three downstream navigation stubs: TF11/IN03, TF12/IN04 and TF04/line33. Old station bus/generator/other-feeder views are removed. The 33kV AMR/IOP views and all line33 electrical assets/connections remain, with obsolete layout keys removed and navigation retargeted to surviving views containing the actual remote asset. In particular, the Hopper10 portal targets the retained line33 interface view, not the new three-feeder overview.

Whole-network orientation replaces removed station representatives with the three abstract input identities. Other-package views, regions, layouts and portals are cleaned of references to excluded assets, terminals, connections or views. Coordinates and navigation add no electrical relationship.

`withStationBatteryLimits(base, version)` clones its input. A new package version is supplied by the caller; historical whole-network packages and scenarios retain their original contents.

## Checked inventory and software boundary

One public-session inventory of the immutable whole-network .4 test base measured:

| Collection | Before | After | Delta |
| --- | ---: | ---: | ---: |
| Assets | 961 | 854 | -107: remove 110 station assets, add 3 abstract supplies |
| Connections | 956 | 845 | -111: remove 114, add 3 input links |
| Sources | 28 | 8 | -20: remove 23 station sources, add 3 abstract inputs |
| Earth terminations | 225 | 188 | -37; none added |
| Coverage records | 357 | 342 | -15: remove 20 excluded records, add 3 input and 2 cut-port records |
| Views | 123 | 115 | -8: remove 9 old station views, add 1 three-feeder overview |

Later endpoint/detail extensions change total package counts, but the station-cut delta is independent of those additions. The final current-package integration is owned separately by root.

The approved `SimulationSession` checks cover scope preservation, input immutability, retained blocked/null controls, explicit unknown cut ports, historical evidence/scenarios, presentation references, repeat application and dependency rejection. A distinct fictional identity/version defines enabled inputs, transformer source pairs, positions and absence of interlocks to demonstrate breaker gating and the existing SW411 alternate route. Those fictional results do not establish installed availability, source independence, winding policy or switching permission.
