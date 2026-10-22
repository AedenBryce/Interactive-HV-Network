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
