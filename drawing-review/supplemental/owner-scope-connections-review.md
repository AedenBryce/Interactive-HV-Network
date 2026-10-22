# Owner decisions: downstream scope and RM712 connection

Recorded 22 October 2026. Source: **Project owner (conversation)**, in response to the three explicit clarification questions. These decisions refine the construction model; they do not accept the whole model, device states, source availability or physical interlocks.

## Confirmed decisions

| Decision | Exact owner answer | Confirmed scope |
| --- | --- | --- |
| Downstream mine/camp scope | “Exclude mine-services and village/camp networks” | Exclude those downstream networks as well as their previously excluded station feeders. Separate Services equipment is not named in this exclusion. |
| TF-04 line branch scope | “that 33kV line is only relevant for the Hopper 10 stuff. Can show the branch points but no further details from that” | Retain the TF-04 route serving Hopper 10. Other branches may appear at their takeoff points; downstream detail is excluded. This supersedes FW-R01's open request about whether Norfolk/Bigge/Farwest details should be included. |
| RM721 remote connection | “RM721 goes through SF RM712 IN02 at RM712” | In answer to “Does RM721 IN02 currently connect to RM712? If yes, which RM712 incoming switch and cable does it connect to?”, confirms the RM721 IN02 route enters SF RM712 IN02. No cable tag was supplied. |

Model scope exclusion does not establish physical disconnection, removal or lack of external influence. Preserve historical packages and source descriptions. Any crossing to retained equipment needs an explicit coverage boundary rather than an invented disconnected or complete-coverage result.

**Unconfirmed scope edge:** this repository's mine/camp source package also contains RM718/TF718/SW718 (railcar/fuel unloading) and SW441/TF441/MC441 (water tower/process water), each with a separately documented source interface. The owner has been asked whether these two branches are also excluded. Do not use their `mine:` software namespace as confirmation of that answer; retain those branches provisionally until it is received.

## Source differences retained

- `CB22OP050B-10018-DR-EL-0032`, revision 9, page 1 B/2–4: Norfolk, future pole-272, pond and Bigge takeoffs. Its downstream topology has not been incorporated; owner scope now excludes that further detail. Reconciliation of the retained main line and takeoff identities with `CB21OP055B-10016-DR-EL-0089.pdf`, revision 0, remains separate from this scope decision. See [Farwest review](farwest-review.md).
- `11098-07110-EL-DR-2256.pdf`, revision 3, page 1 C–D/4–7: RM721 IN02 names SS712/RM712 but prints reference2252. The supplied2252 identifies RM711, not RM712. The owner confirms the remote switch, without correcting the document reference or confirming a cable tag.
- `11098-07110-EL-DR-2253.pdf`, revision 3, page 1 A–C/1–3: SF RM712 IN02 is drawn with SW426/2352 as its source. The new owner answer establishes RM721 at this input. Retain the former printed SW426 description as disputed source evidence; it does not establish a second simultaneous incoming cable.

## Remaining connection questions

1. Present status and end connection of the former RM712 IN01 → RM713 route. `11098-07110-EL-DR-2254.pdf`, revision 1, page 1 A–E/2–9 names RM721 as RM713's source and records “RM713 WAS SUPPLIED FROM RM712”.
2. Current installed status of the explicitly disconnected TF712 LV cable and separate DG1/DG7 changeover supply to SW712. `11098-07110-EL-DR-2253.pdf`, revision 3, page 1 A–E/2–8.
3. RM721-to-RM712 cable tag and wrong-reference correction remain **Unconfirmed**. They do not invalidate the owner's explicit remote-switch answer.

The RM712 changeover contact matrix, device positions, generator availability, transformer source/earth relationships and complete physical interlocks remain **Unconfirmed**. No new baseline or switching permission follows from the three answers.

## Implementation record

The answers were received against inspection snapshot `site-whole-network` / `construction-2026-10-22.14`. Updated immutable version **`construction-2026-10-22.15`** applies them through `withOwnerScopeConnections` in `src/models/site/owner-scope-connections.ts`, composed by `current-network.ts`. Historical area packages and `.4` remain unchanged.

Current software inventory: **695 assets, 691 connections, 368 null controls, 5 null sources, 142 earth terminations, 317 coverage boundaries and 93 views**. There are 13 orientation regions and 24 contactors. These counts do not establish installed-network coverage or owner acceptance.

- Removes camp and definite RM711/SS711B/TF717 mine-services equipment, sources and views. RM718 and SW441/water equipment remain pending their separate scope answer. The historical overlap markers remain as nonconducting references.
- Preserves the TF04→Hopper10 route. Seven non-Hopper10 branches are abstract takeoff markers with unknown external source/backfeed and earth coverage. Their provisional representation does not assert a conductor bypassing excluded switches. No supplemental Farwest downstream topology is added.
- Adds owner-confirmed connection `owner:join:rm721-rm712`: `rm721:in02:b` → `rm712:in02:a`. Removes the former reference-cable placeholders, preserves their disputed captions in aliases and provides navigation in both directions. `WN-RM712-REFERENCE-GAPS` retains tag/document questions. The owner confirmation does not establish a second SW426 supply.
- Every retained actual control state and source availability remains null; unresolved physical-interlock reviews remain blocked. No source/earth transformer rule is newly accepted.

**Software checks:** 10 focused public-session tests passed across `owner-scope-connections.test.ts` and `current-network.test.ts`; typecheck and production build passed. Build advisory: application chunk765.38 kB, gzip223.91 kB. Browser review at1704×1214 confirmed `.15`, RM721→RM712 and reciprocal navigation, SF RM712 IN02 identity and disabled Open/Close. The full suite remains reserved for whole-goal final delivery. Whole-network acceptance and the starting configuration remain pending.
