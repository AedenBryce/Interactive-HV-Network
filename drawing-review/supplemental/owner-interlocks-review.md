# Owner-selected additional interlock profiles

Source: project owner conversation,23 October2026. The [review inventory](interlock-profile-review.md) and [structured exact asset/reference register](interlock-profile-review.json) were opened before these questions. Their family grouping is explicitly an Inference for organizing review; the owner answers below supply the selected V1 rules. No physical truth table or actual switching permission follows from the grouping alone.

## Answer42 —48 additional HV line-earth pairs

Question42 asked whether group P01's48 exact breaker/line-earth pairs should use the complete local matrix already selected for SW411. It named retained station feeders, SW441 and processing HV boards, asked for additional local/key restrictions or exceptions, and retained only the previously named cross-station key deferral.

Exact answer: **“Apply this matrix to all48 pairs”**.

The selected profile is:

| Action | Required known state |
| --- | --- |
| CB Open | Rack in |
| CB Close | Rack in and own ES Open |
| Rack out | CB Open |
| Rack in | CB Open and own ES Open |
| ES Open | Allowed |
| ES Close | CB Open and Rack out |

Unknown prerequisites block. No exception or additional local condition was supplied. This selects the complete V1 local simulation profile for the exact96 controls in P01. It does not defer other key systems, apply to bus-earths, accept unrelated hardware metadata or establish operational permission. The composition must verify each named CB/ES pair's existing cable-side branch and earth termination, without deriving physical rules from a wire or pairing arbitrary list neighbours.

## Answer43 —48 removable LV incomers

Question43 asked whether group P04's48 exact removable LV incomers should use the complete local restrictions Open/Close only while Rack in, and Rack in/out only while the breaker is Open. It explicitly proposed independent D/Y incomers with no added mutual-exclusion or coordinated action and requested any additional key/interlock conditions or exceptions.

Exact answer: **“Use these complete local restrictions”**.

The selected V1 profile therefore retains the intrinsic known-prerequisite guards and adds no further declared local rule for these exact48 devices. `confirmed-none` means no **additional** declared rules; it does not bypass the intrinsic guards or establish that installed equipment has no physical interlocks. No exception was supplied. Baseline, D/Y topology and other switchgear families remain unchanged.

## Answer44 —SW411 bus-tie breaker

Question44 proposed the complete V1 profile below for CB SW411 BT, retained its Open/Rack out baseline and kept each bus-earth switch's own action review separate.

Exact answer: **“Approve this bus-tie profile”**.

| Action | Required known state |
| --- | --- |
| Open | Rack in |
| Close | Rack in and both SW411 BUS A/B earth switches Open |
| Rack out | CB Open |
| Rack in | CB Open and both SW411 BUS A/B earth switches Open |

Unknown prerequisites block. Dependencies are `sw411:bus-a:es` and `sw411:bus-b:es`. Device evidence remains `CB-10016-DR-EL-0011.pdf`, rev0, p1 B/3 tier8, plus the original detailed SW411 references. The two bus-earth controls are not enabled by this answer.

## Applied configuration increment

`construction-2026-10-23.3` applies42–44 to preserved `.2`, supplying169 reviewed controls:121 with declared rules and48 with intrinsic guards alone. The remaining191 control reviews remain unresolved. Selected states, topology, equipment knowledge, winding and earth policies are unchanged. It also qualifies inherited null-baseline text as historical and uses neutral simulation-input captions. Historical `.2`/`.1` content remains immutable. Whole-model acceptance is still pending.

## Answers45–48 — bus earths, LV incomers and OHL controls

Question45 proposed Earth Open allowed and Earth Close requiring every exact breaker in [the bus-earth proposal](bus-earth-proposal.md) to be Open and Rack out, including SW411 BT for both sections. Unknown prerequisites block. Exact answer: **“Approve all10 listed bus-earth profiles”**. This selects those exact ten teaching profiles; the source drawings do not establish the physical interlock truth table.

Question46 proposed fixed Open/Close with no additional local prerequisites for all eleven P05 LV breakers and asked for removable exceptions. Exact answer: **“all are correct excluding SW712/SW713 Incomers are removable and can have the racki in/out funciton”**. Nine retain fixed model interactions; `rm712:sw712:cb` and `rm713:sw713:cb` gain independent contact/racking states and the previously approved intrinsic racking restrictions. The existing all-in baseline applies to these two breakers. This does not promote unrelated hardware knowledge.

Question47 asked for the complete action profile of ten retained OHL controls. Exact answer: **“consider them all closed and no racking function.”** This confirmed the baseline and model interaction, leaving other prerequisites unanswered. Question48 explicitly asked whether those same ten controls had any additional physical-interlock prerequisites in V1. Exact answer: **“No additional prerequisites in V1”**. Together these select Closed, Open/Close only and no additional prerequisites for those exact ten controls. The former CV006 Hopper10 controls remain excluded and unresolved.

## Answer49 — bounded key, door and inching deferral

Exact question: “49. For V1, how should the remaining key, door and inching-isolator sequences be handled in profile groups P06–P10 and P15: hopper MV/maintenance keys, SW505 inching/drive keys, HPGR Fortress/DC-earth keys and RM420 Ronis keys? These are additional systems beyond the cross-station keys already deferred. Deferral would explicitly mark these sequences as not modeled; local contact/racking/earth restrictions would still need their own agreed profiles.”

Exact answer: **“Explicitly defer these listed sequences for V1”**.

The deferral is limited to the named sequences on the82 exact controls in those six review groups. It does not enable a control, resolve its local contact/racking/earth profile, defer other systems, or establish operational permission.

## Answers50–51 — removable motor contactors

Question50 proposed mutual exclusion of Forward/Reverse, both contactors Open before maintenance Earth Close, and Earth Open allowed for all twelve P07 assemblies. Exact answer: **“COrrect, but the contactors are also removable and require racking out before closing earths. follows same rules around opening/racking as the other circuit breakers”**.

Question51 then explicitly proposed the complete profile and baseline for all24 FC/RC contactors. Exact answer: **“Confirm this profile and Open/Rack in baseline”**.

| Action | Required known state |
| --- | --- |
| Each contactor Open | Own Rack in |
| Each contactor Rack out | Own contact Open |
| Each contactor Rack in | Own contact Open and maintenance earth Open |
| Forward Close | Own Rack in, Reverse Open and maintenance earth Open |
| Reverse Close | Own Rack in, Forward Open and maintenance earth Open |
| Maintenance Earth Close | Both contactors Open and both Rack out |
| Maintenance Earth Open | Allowed |

All24 start Open/Rack in. Unknown prerequisites block. The contactors retain their contactor classification. Only the listed key/door sequences are deferred under49.

## Answer52 — six hopper MV incomer/earth pairs

Question52 explicitly proposed the same complete HV local matrix for the six P06 pairs at Hoppers1,3,7,8,9,10: Open requires Rack in; Close requires Rack in and own ES Open; Rack out requires CB Open; Rack in requires CB Open and own ES Open; ES Open allowed; ES Close requires CB Open and Rack out. Upstream key-transfer sequences remain deferred under49; additional local conditions were requested as exceptions.

Exact answer: **“Apply this local matrix to all6 pairs”**. Unknown prerequisites block. No exception was supplied. The selection applies to these exact six model pairs, without accepting unrelated source or earth relationships.

These answers are recorded for the next configuration increment. They are not part of immutable `.3`.

## Answer53 — SW505 inching-linked HV pairs

Question53 explicitly proposed the same complete six-action HV local matrix listed under52 for the three TF505A/B/C CB/earth pairs in P08. It retained unknown-prerequisite blocking, asked for local exceptions, and referenced `500CB-04220-DR-EL-0055.pdf`, rev3, p1 D–F/3–8. Their inching-isolator/key sequences were already explicitly deferred under49.

Exact answer: **“Apply this local matrix to all3 pairs”**. This selects those six controls' local profiles only. No additional deferral or hardware/source/earth relationship acceptance follows.

## Answer54 — six converter AC inputs

Question54 proposed Open/Close only, no racking, no additional prerequisites and independent operation for the A/B AC input switches of VS4061, VS4101 and the RM413A converter. It explicitly distinguished a selected teaching profile from a source-confirmed physical interlock table and requested exceptions or coordinated-operation requirements.

Exact answer: **“Use this profile for all6 inputs”**. This selects the six exact P11 model interactions. It does not establish actual switching permission or accept converter internals.
