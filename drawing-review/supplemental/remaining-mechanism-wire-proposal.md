# Remaining mechanism and wire model proposal

Prepared against immutable `.8`; source references and exact stable IDs are in [the frozen inventory](remaining-mechanism-wire-proposal.json). These are proposed teaching-model selections, not field verification or operational permissions.

## Question97 —seven removable main-contact relationships

Select the listed main pair as connected for source and earth continuity only while Contact Closed AND Rack in. Open or Rack out interrupts it; unconfirmed axes remain unconfirmed. Retain all approved local restrictions and baselines, and preserve parent equipment metadata as Unconfirmed. This adds no cable, source or ground termination.

| Control | Model ID | Main pair |
| --- | --- | --- |
| CB SW435 FD 02 | `sw431:sw435:cb` | `sw431:sw435:cb:a` ↔ `sw431:sw435:cb:b` |
| CB TF453 FD | `sw435:tf453:hv-cb` | `sw435:tf453:hv-cb:a` ↔ `sw435:tf453:hv-cb:b` |
| CB SW453 IN D | `sw435:sw453:d:cb` | `sw435:sw453:d:cb:a` ↔ `sw435:sw453:d:cb:b` |
| CB SW453 IN Y | `sw435:sw453:y:cb` | `sw435:sw453:y:cb:a` ↔ `sw435:sw453:y:cb:b` |
| CB SS714 FD | `sw426:ss714:cb` | `sw426:ss714:cb:a` ↔ `sw426:ss714:cb:b` |
| CB SW714 IN | `rm714:sw714:in:cb` | `rm714:sw714:in:cb:a` ↔ `rm714:sw714:in:cb:b` |
| CB MC413 IN 3000 A printed · supply route confirmed | `rm413:mc413:cb` | `rm413:mc413:cb:a` ↔ `rm413:mc413:cb:b` |

## Question98 —30 remaining represented wire/branch relationships

Select the exact listed continuous source/earth wire relationships for V1. Retain their depicted endpoints and all existing switches in series. This accepts model paths only: actual cable tags, installed revision precedence, ratings, equipment metadata, independent earth terminations and transformer/converter earth behavior remain separately Unconfirmed. No historical removed line or excluded downstream equipment is added.

The set includes the stationTF04-to-pole1 attachment; SW411 tier16 to RM721 IN01; SW426 SS714 feeder to RM714 and its transformer/LV route; existing processing tie/TF453/spare-cubicle branch wires; HPGR MC001 and supplemental MC454/SW455/MC410A connections; and the indicated earth-switch branch leads. The seven excluded33kV branch takeoff links remain outside this selection.

| Existing relationship | From | To |
| --- | --- | --- |
| `line33:station-to-recloser` | `station:sb02:f4:transformer:output` | `line33:pole-1-recloser:in` |
| `sw431:sw435:bus-link` | `sw431:bus:bar` | `sw431:sw435:cb:a` |
| `sw431:sw435:es:branch` | `sw431:sw435:cb:b` | `sw431:sw435:es:a` |
| `sw431:cross-link:cable-SW431-P-02` | `sw431:sw435:cb:b` | `sw431:interface:sw435:port` |
| `sw435:cross-link:cable-SW431-P-02` | `sw435:sw431:cb:b` | `sw435:interface:sw431:port` |
| `sw435:tf453:hv-es:branch` | `sw435:tf453:hv-cb:b` | `sw435:tf453:hv-es:a` |
| `sw435:tf436:bus-link` | `sw435:bus:bar` | `sw435:tf436:hv-cb:a` |
| `sw435:tf436:hv-es:branch` | `sw435:tf436:hv-cb:b` | `sw435:tf436:hv-es:a` |
| `hpgr:mc001:cb:winding-cable` | `hpgr:tf004:lv` | `hpgr:mc001:cb:a` |
| `hpgr:mc001:cb:bus-link` | `hpgr:mc001:cb:b` | `hpgr:mc001:bus:bar` |
| `sw426:ss714:bus-link` | `sw426:bus:bar` | `sw426:ss714:cb:a` |
| `sw426:ss714:es:branch` | `sw426:ss714:cb:b` | `sw426:ss714:es:a` |
| `sw426:laboratory:cable` | `sw426:ss714:cb:b` | `rm714:in01:a` |
| `rm714:in01:bus-link` | `rm714:in01:b` | `rm714:bus:bar` |
| `rm714:in02:bus-link` | `rm714:in02:b` | `rm714:bus:bar` |
| `rm714:in01:es:branch` | `rm714:in01:a` | `rm714:in01:es:a` |
| `rm714:in02:es:branch` | `rm714:in02:a` | `rm714:in02:es:a` |
| `rm714:tf714:bus-link` | `rm714:bus:bar` | `rm714:tf714:cb:a` |
| `rm714:tf714:es:branch` | `rm714:tf714:cb:b` | `rm714:tf714:es:a` |
| `rm714:tf714:cable` | `rm714:tf714:cb:b` | `rm714:tf714:hv` |
| `rm714:sw714:cable` | `rm714:tf714:lv` | `rm714:sw714:in:cb:a` |
| `rm714:sw714:bus-link` | `rm714:sw714:in:cb:b` | `rm714:sw714:bus:bar` |
| `sw505:bus:es:branch` | `sw505:bus:bar` | `sw505:bus:es:a` |
| `sw454:interface:mc454-mc455:winding-1` | `sw454:tf454:lv` | `sw454:interface:mc454-mc455:port` |
| `sw454:interface:sw455:winding-1` | `sw454:tf455:lv-d` | `sw454:interface:sw455:d` |
| `sw454:interface:sw455:winding-2` | `sw454:tf455:lv-y` | `sw454:interface:sw455:y` |
| `rm410:tf410b-mc410a` | `rm410:tf410b:lv` | `rm410:interface:mc410a:input` |
| `wh:h7:rm418:sw01:es:branch` | `wh:h7:rm418:sw01:a` | `wh:h7:rm418:sw01:es:a` |
| `rm721:cable-RM721-P-01` | `services:interface:sw411:port` | `rm721:in01:a` |
| `whole:join:rm721` | `sw411:tier-16:interface:port` | `services:interface:sw411:port` |

Each row retains its original documents/revisions/pages/regions in the JSON inventory. No source-date precedence is selected. Earlier route/name corrections and current model cuts remain mandatory; neither approval is whole-network acceptance.
