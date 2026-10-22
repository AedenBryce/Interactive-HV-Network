# Owner decisions: downstream scope and RM712 connection

Recorded 22 October 2026. Source: **Project owner (conversation)**, in response to the three explicit clarification questions. These decisions refine the construction model; they do not accept the whole model, device states, source availability or physical interlocks.

**Later increment:** current `.17` adds the TF436 hardware, TF432 tier5 and MC001/MC438 identity confirmations. See the [latest identity record](owner-identities-review.md). The `.15`/`.16` sections below are historical implementation records; their pending hardware/tier/board questions are superseded to the stated extent. Answer16's RM413 fork confirmation is recorded for the next increment, not applied to `.17`.

## Confirmed decisions

| Decision | Exact owner answer | Confirmed scope |
| --- | --- | --- |
| Downstream mine/camp scope | “Exclude mine-services and village/camp networks” | Exclude those downstream networks as well as their previously excluded station feeders. Separate Services equipment is not named in this exclusion. |
| TF-04 line branch scope | “that 33kV line is only relevant for the Hopper 10 stuff. Can show the branch points but no further details from that” | Retain the TF-04 route serving Hopper 10. Other branches may appear at their takeoff points; downstream detail is excluded. This supersedes FW-R01's open request about whether Norfolk/Bigge/Farwest details should be included. |
| RM721 remote connection | “RM721 goes through SF RM712 IN02 at RM712” | In answer to “Does RM721 IN02 currently connect to RM712? If yes, which RM712 incoming switch and cable does it connect to?”, confirms the RM721 IN02 route enters SF RM712 IN02. No cable tag was supplied. |

Model scope exclusion does not establish physical disconnection, removal or lack of external influence. Preserve historical packages and source descriptions. Any crossing to retained equipment needs an explicit coverage boundary rather than an invented disconnected or complete-coverage result.

The follow-up scope answer below resolves the separately documented RM718 and water branches. Their `mine:` software namespace was not treated as scope evidence while that answer was pending.

## Follow-up owner answers — 22 October 2026

This table records the first follow-up answers and the questions they left open at that stage. The later endpoint clarification and water-source correction below supersede those pending entry/source/cable questions. Current remaining questions concern tags/document equivalence, retained physical mechanisms/interlocks, winding policies and the starting configuration.

| Topic | Exact owner answer | Confirmed and unresolved |
| --- | --- | --- |
| RM713 connection | “RM721 does still feed RM713 and it is still connected at both ends. It connect at RM713 to SF RM713 IN01” | Confirms the current RM721 → SF RM713 IN01 route and both cable ends connected. The question asked about the former **RM712 IN01** route; this answer names **RM721**, so that former RM712 cable status remains **Unconfirmed** and has been asked separately. |
| TF712 LV cable | “TF712 LV cables are currently connected to SW712.” | Confirms the installed TF712-to-SW712 cable connection. Exact SW712 terminal relative to its incomer/changeover, current DG1/DG7 connections and changeover contact matrix remain **Unconfirmed**. The old disconnected-cable annotation is disputed historical evidence, not a current physical-gap claim. Do not invent a direct incomer bypass while the exact endpoint is pending. |
| MC431A | “MC431A is an LV switchboard that is fed from MC431. Not required for this tool.” | Confirms MC431A is downstream of MC431 and excluded beyond the first LV bus. This resolves C1-R01 identity/scope; other TF432 bay, rating, revision, baseline and interlock questions remain separate. |
| RM718 and water scope | “RM718/TF718/SW718 excluded. SW441/TF441/MC441 should be included” | Exclude RM718 railcar/fuel-unloading detail. Include the water-tower/process-water branch through its first MC441 LV bus. Its current supply identity remains **Unconfirmed** and has been asked explicitly. |

These follow-up decisions were received against `.15` and are implemented in immutable `.16`. The `.15` inventory below is the earlier implementation record, not the final scope after these additional answers.

### Further endpoint clarification — 22 October 2026

- **SF RM712 IN01:** the owner answered exactly “nothing is connected.” to the question about its current cable/far end. No external cable is attached in the model. Its switch position and physical earth/interlock conditions remain unconfirmed; an empty input is not a confirmed open switch.
- **TF712 LV termination:** the owner answered exactly “a the SW712 incomer. Ignore changeover switch for this”. Connect the TF712 LV cable at the existing SW712 incomer input. The changeover/DG alternative-supply assembly is excluded from this model's representation; this does not assert that it has been physically removed. No actual switch state or interlock condition is accepted.
- **Water supply route:** the owner answered exactly “This is fed from a spur off TF712. It branches off that main line, goes through WT1-CB Recloser, then to the SW441 IN01 CB”. This confirms WT1-CB → SW441 IN01. **Unconfirmed:** whether the upstream spur leaves the RM721–RM712 cable, RM712 bus, TF712 feeder or another exact junction. That point has been asked explicitly; no upstream join is inferred from “off TF712”.

The earlier entry-point and former-RM712-IN01 questions above are historical stages of the interview. These later answers supersede them only to the stated extent. Current physical interlocks and starting configuration remain open.

### Corrected water source and Crushing 2 status — 22 October 2026

- **Water-source correction:** “aplogies, i made a mistake, it is fed from TF12, not TF712. It branches offat OPF1-7 Pole”. This supersedes the TF712 attribution in the preceding answer. The confirmed named route is **TF12 → OPF1-7 pole spur → WT1-CB → SW441 IN01**. No connection from TF712 to the water branch is to be created. The earlier wording remains a superseded owner record; it is not a second supply. Device states, complete interlocks and any unrepresented intermediate equipment remain unconfirmed.
- **SW435 tier 5:** “TF436 is a spare cubicle. Nothing installed”, answering whether it has an installed TF436/MC436 branch or is an unused spare with no downstream transformer/cable. Treat it as a spare with no installed downstream TF436/MC436 branch. The answer does not separately identify any physical breaker/earth-switch mechanism or state inside the cubicle; do not enable an assumed control or construct a future LV endpoint.
- **TF453/SW453:** “Yes, installed and connected”, answering whether TF453 and SW453 are installed and connected to SW435 tier 8. This resolves present installed/connected status, superseding the source's FUTURE wording for that scoped branch. It does not accept the baseline or physical interlocks.

Source context: `11098-07110-EL-DR-2354.pdf`, revision9, page1 C–G/6 (tier5) and C–G/10–11 (tier8); `CB-10016-DR-EL-0010.pdf`, revision0, tier5 SPARE FD; `11098-07110-EL-DR-2468.pdf`, revision5, page1 A–C/1–10, TF453/SW453. Water-source context: `11098-07110-EL-DR-2355.pdf`, revision7, page1 A–C/4, incoming cable/reference. The named TF12/OPF1-7 route is confirmed by the owner conversation, not by a silently corrected drawing.

## Source differences retained

- `CB22OP050B-10018-DR-EL-0032`, revision 9, page 1 B/2–4: Norfolk, future pole-272, pond and Bigge takeoffs. Its downstream topology has not been incorporated; owner scope now excludes that further detail. Reconciliation of the retained main line and takeoff identities with `CB21OP055B-10016-DR-EL-0089.pdf`, revision 0, remains separate from this scope decision. See [Farwest review](farwest-review.md).
- `11098-07110-EL-DR-2256.pdf`, revision 3, page 1 C–D/4–7: RM721 IN02 names SS712/RM712 but prints reference2252. The supplied2252 identifies RM711, not RM712. The owner confirms the remote switch, without correcting the document reference or confirming a cable tag.
- `11098-07110-EL-DR-2253.pdf`, revision 3, page 1 A–C/1–3: SF RM712 IN02 is drawn with SW426/2352 as its source. The new owner answer establishes RM721 at this input. Retain the former printed SW426 description as disputed source evidence; it does not establish a second simultaneous incoming cable.

## Historical connection questions and their dispositions

1. Former RM712 IN01 → RM713 route: **resolved** by “nothing is connected.” at RM712 IN01. RM721's separate cable to SF RM713 IN01 is confirmed at both ends. Original source difference: `11098-07110-EL-DR-2254.pdf`, revision 1, page 1 A–E/2–9.
2. TF712 disconnected-cable/DG question: **resolved for connection and scope** by the direct SW712 incomer answer and exclusion of the MCS/DG assembly. Original source difference: `11098-07110-EL-DR-2253.pdf`, revision 3, page 1 A–E/2–8. No current MCS matrix or excluded-DG availability review is requested.
3. RM721-to-RM712 cable tag and wrong-reference correction remain **Unconfirmed**. They do not invalidate the owner's explicit remote-switch answer.

Retained device positions, source availability, transformer source/earth relationships and complete physical interlocks remain **Unconfirmed**. Excluded MCS/DG details are historical only. No baseline or switching permission follows from the connection answers.

## Historical `.15` implementation record

The answers were received against inspection snapshot `site-whole-network` / `construction-2026-10-22.14`. Updated immutable version **`construction-2026-10-22.15`** applies them through `withOwnerScopeConnections` in `src/models/site/owner-scope-connections.ts`, composed by `current-network.ts`. Historical area packages and `.4` remain unchanged.

Current software inventory: **695 assets, 691 connections, 368 null controls, 5 null sources, 142 earth terminations, 317 coverage boundaries and 93 views**. There are 13 orientation regions and 24 contactors. These counts do not establish installed-network coverage or owner acceptance.

- Removes camp and definite RM711/SS711B/TF717 mine-services equipment, sources and views. RM718 and SW441/water equipment remain pending their separate scope answer. The historical overlap markers remain as nonconducting references.
- Preserves the TF04→Hopper10 route. Seven non-Hopper10 branches are abstract takeoff markers with unknown external source/backfeed and earth coverage. Their provisional representation does not assert a conductor bypassing excluded switches. No supplemental Farwest downstream topology is added.
- Adds owner-confirmed connection `owner:join:rm721-rm712`: `rm721:in02:b` → `rm712:in02:a`. Removes the former reference-cable placeholders, preserves their disputed captions in aliases and provides navigation in both directions. `WN-RM712-REFERENCE-GAPS` retains tag/document questions. The owner confirmation does not establish a second SW426 supply.
- Every retained actual control state and source availability remains null; unresolved physical-interlock reviews remain blocked. No source/earth transformer rule is newly accepted.

**Software checks:** 10 focused public-session tests passed across `owner-scope-connections.test.ts` and `current-network.test.ts`; typecheck and production build passed. Build advisory: application chunk765.38 kB, gzip223.91 kB. Browser review at1704×1214 confirmed `.15`, RM721→RM712 and reciprocal navigation, SF RM712 IN02 identity and disabled Open/Close. The full suite remains reserved for whole-goal final delivery. Whole-network acceptance and the starting configuration remain pending.

## Historical `.16` implementation record

`withOwnerFollowups` in `src/models/site/owner-followups.ts`, composed by `current-network.ts`, applies the follow-up decisions to a clone. Current **`site-whole-network` / `construction-2026-10-22.16`** contains **680 assets,677 connections,360 null/blocked controls,3 null sources,139 earth terminations,312 coverage boundaries and91 views**, with13 orientation regions and24 contactors. These are software counts, not installed acceptance.

RM718 and the MCS/DG alternative assembly are excluded. Water remains included. `owner:tf12:opf1-7` is a connectivity junction on the existing TF12→SW411 IN04 line, with the spur continuing through WT1-CB to SW441 IN01. It does not invent a switch. The new `supplemental/water-tf12-source` view supplies upstream/water navigation. The mistaken TF712 source statement remains superseded history; no such spur is present.

The existing RM721→SF RM713 IN01 cable is owner-confirmed at both ends. RM712 IN01's old external reference-cable edge is removed; source-input coverage is complete for no external cable, while internal earth/state/interlock coverage remains unconfirmed. `owner:tf712-sw712-incoming` joins the TF712 cable end to the existing SW712 incoming-breaker input, retaining that breaker in series. Historical source captions and models are preserved. MC431A is resolved as excluded downstream LV; TF436 is a spare with no installed downstream branch, while cubicle hardware remains unconfirmed; TF453/SW453 installed/connected status is resolved independently of its actual control states.

All retained actual states and source availabilities remain null and physical-interlock reviews remain unresolved. Typecheck and production build pass (781.16kB JavaScript /227.97kB gzip; Vite size advisory). Focused session checks and the final review result are recorded in the implementation progress log. The full suite remains reserved for whole-goal final delivery. No whole-model or starting-configuration acceptance is claimed.
