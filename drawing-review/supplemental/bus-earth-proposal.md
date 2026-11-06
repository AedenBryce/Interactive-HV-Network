# Bus-earth profile proposal

**Owner-selected for V1 on23 October2026, answer45: “Approve all10 listed bus-earth profiles”.** Proposal `BUS-EARTH-PROPOSAL-2026-10-23` preserves the exact dependencies reviewed against `construction-2026-10-23.2`. See [the decision record](owner-interlocks-review.md).

**Inference — review organization:** the exact dependencies below are directly connected breakers on the existing model bus. A wire does not establish a physical interlock. This list proposes a V1 rule for owner selection.

Proposed complete profile: Earth Open allowed; Earth Close requires every listed breaker contact Open and Rack out. Unknown prerequisites block. SW411 BT appears in both bus sections. Other local/key conditions require explicit correction before enabling the selected profile.

| Earth switch | Model bus | Breakers required Open / Rack out |
| --- | --- | --- |
| `mine:sw441:bus:es` | `mine:sw441:bus` | `mine:sw441:in:cb`; `mine:tf441:cb` |
| `sw411:bus-a:es` | `sw411:bus-a` | `sw411:bus-tie:cb`; `sw411:in-01:cb`; `sw411:in-03:cb`; `sw411:tier-01:cb`; `sw411:tier-02:cb`; `sw411:tier-03:cb`; `sw411:tier-04:cb` |
| `sw411:bus-b:es` | `sw411:bus-b` | `sw411:bus-tie:cb`; `sw411:in-02:cb`; `sw411:in-04:cb`; `sw411:tier-13:cb`; `sw411:tier-14:cb`; `sw411:tier-15:cb`; `sw411:tier-16:cb` |
| `sw421:bus:es` | `sw421:bus` | `sw421:in:cb`; `sw421:spare:tier2:cb`; `sw421:spare:tier7:cb`; `sw421:tf421:hv-cb`; `sw421:tf422:hv-cb`; `sw421:tf423:hv-cb` |
| `sw426:bus:es` | `sw426:bus` | `sw426:in:cb`; `sw426:ss714:cb`; `sw426:tf426:cb`; `sw426:tf427:cb`; `sw426:tf428:cb`; `sw426:tf429:cb`; `sw426:tf430:cb`; `sw426:tf439:cb`; `sw426:tf440:cb`; `sw426:tf443:cb` |
| `sw431:bus:es` | `sw431:bus` | `sw431:in:cb`; `sw431:sw435:cb`; `sw431:tf431:hv-cb`; `sw431:tf432:hv-cb`; `sw431:tf437:hv-cb`; `sw431:tf442:hv-cb` |
| `sw435:bus:es` | `sw435:bus` | `sw435:hpgr:cb`; `sw435:in:cb`; `sw435:sw431:cb`; `sw435:tf433:hv-cb`; `sw435:tf435:hv-cb`; `sw435:tf436:hv-cb`; `sw435:tf453:hv-cb` |
| `sw451:bus:es` | `sw451:bus` | `sw451:in:cb`; `sw451:spare-2:cb`; `sw451:spare-6:cb`; `sw451:spare-7:cb`; `sw451:tf451:hv-cb`; `sw451:tf452:hv-cb` |
| `sw454:bus:es` | `sw454:bus` | `sw454:in:cb`; `sw454:sw505:cb`; `sw454:tf454:hv-cb`; `sw454:tf455:hv-cb`; `sw454:tf456:hv-cb` |
| `sw505:bus:es` | `sw505:bus` | `sw505:in:cb`; `sw505:tf505a:hv-cb`; `sw505:tf505b:hv-cb`; `sw505:tf505c:hv-cb`; `sw505:tf506:hv-cb`; `sw505:tf507:hv-cb`; `sw505:tf508:hv-cb` |

The [structured proposal](bus-earth-proposal.json) preserves each direct connection ID and both endpoint roles. Exact source document references remain with those assets/connections in the model and the [profile review inventory](interlock-profile-review.json). Selection would define a teaching profile, not actual switching permission or field verification.
