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

## Answer55 — integrated three-position RMU assemblies

Question55 proposed this complete V1 profile for P13's16 three-position switches and10 feeder CBs at RM406, RM410, RM417 and RM419:

- CBs use Open/Close only, without racking. CB Open allowed; CB Close requires its associated switch in Service.
- Every outgoing three-position switch movement requires its CB Open.
- Service↔Earthed must pass through Isolated. Selecting Service or Earthed requires current Isolated.
- Incoming/ring switches use the same transition sequence without a separate CB prerequisite.
- Unknown prerequisites block; no other local/key conditions are modeled for these exact assemblies.

Sources named in the question: `CB19OP001B-04057-DR-EL-0002.pdf` rev4 and `-0004.pdf` rev6; `CB16OP038A-02006-DR-EL-0044.pdf` rev2; `CB19OP001C-01068-DR-EL-0001.pdf` rev4, each p1 RMU region. The question explicitly selected a teaching profile, not operational permission.

Exact answer: **“Approve this complete profile for all26 controls”**. This selects the exact P13 action profile; it does not accept unrelated source/earth relationships or resolve installed hardware knowledge wholesale.

## Answer56 — RM714 earth-switch presence

Question56 asked whether earth switches are installed on RM714's two incoming paths IN01/IN02 and TF714 feeder. It identified the disagreement between `11098-07110-EL-DR-2255.pdf` rev1 p1 A–C and `CB-10016-DR-EL-0011.pdf` rev0 p1 RM714 lower panel.

Exact answer: **“All3 earth switches are installed”**. This confirms the presence of those three named earth devices only. Their complete local action profile, detailed path/termination claims and other mechanism properties require separate evidence or selection.

## Answer57 — RM714 local actions

Question57 separately proposed the complete V1 profile for RM714 IN01/IN02/TF714 main/earth pairs: Open/Close only, no racking; main Open allowed; main Close requires its own earth Open; Earth Close requires its own main Open; Earth Open allowed; unknown prerequisites block; no additional local/key conditions. It retained the same source references as56.

Exact answer: **“Use this complete profile for all3 pairs”**. This selects those six local control profiles. Presence confirmation56 remains separate from detailed earth-path/termination knowledge and operational permission.

## Answer58 — SW505 drive output/DC-earth actions

Question58 proposed Open/Close-only, no-racking interactions for each VS50501/02/03 output/DC-earth pair: Output Open allowed; Output Close requires own DC earth Open; DC Earth Close requires own output Open; DC Earth Open allowed; unknown prerequisites block. It explicitly retained owner49's bounded inching/key deferral and left converter transfer, stored energy and discharge behavior Unconfirmed. Source: `500CB-04220-DR-EL-0042.pdf` rev4 p1 D–F/2–10. The question requested any additional local condition or different output-contact mechanism.

Exact answer: **“Use this complete local profile for all3 drives”**. This selects those exact six local model interactions only; it does not establish converter coupling, stored-energy/discharge behavior or actual switching permission.

## Answer59 — Hopper7 RM418 separated assemblies

Question59 proposed the complete P14 profile for SW01/ES01 and SW02/ES02 pairs: main Open allowed; main Close requires own ES Open; ES Close requires own main Open; ES Open allowed. For CB03/disconnect/earth and spare CB04/disconnect/earth: CB Open allowed; CB Close requires disconnect Closed and ES Open; disconnect Open requires CB Open; disconnect Close requires CB Open and ES Open; ES Close requires CB Open and disconnect Open; ES Open allowed. All use Open/Close without racking; unknown prerequisites block; no additional local/key conditions are modeled. Descriptive disconnect identities remain because printed tags are Unconfirmed. Source: `CB17OP023C-01006-DR-EL-0001.pdf`, rev6, p1 A–C/6–8.

Exact answer: **“Approve this complete profile for all10 controls”**. This selects the exact P14 model interactions without confirming printed disconnect tags or unrelated source/earth claims.

## Answer60 — Hopper10 RM420 separated assemblies

Question60 proposed the same local pair arrangement for SW01/ES01, mutually preventing Close while the other is Closed. CB01/SW02/ES02, CB02/SW03/ES03 and spare CB03/SW04/ES04 use CB Close only with DS Closed and ES Open; DS movement only with CB Open, with DS Close also requiring ES Open; ES Close requires CB Open and DS Open; CB Open and ES Open allowed. Open/Close only, no racking; unknown prerequisites block. Ronis sequences remain explicitly deferred under49. Source: `520CBC0007-2130-DR-EL-0003.pdf`, rev3, p1 C/3–8, G/8–10 notes1/4.

Exact answer: **“Apply this complete local profile to all11 controls”**. This selects the exact P15 local teaching profile, conditional on the separately recorded bounded key deferral. It does not supply key states or operational permission.

## Answer61 — RM721 main/earth pairs

Question61 proposed the complete V1 profile for IN01, IN02, RM412 feeder and RM713 feeder: Open/Close only, no racking; main Open allowed; main Close requires own earth Open; Earth Close requires own main Open; Earth Open allowed; unknown prerequisites block; no additional local/key conditions. It requested any removable-device exception. Source: `11098-07110-EL-DR-2256.pdf`, rev3, p1 C–F/4–7.

Exact answer: **“Use this complete profile for all4 pairs”**. This selects eight P16 local control profiles without accepting unrelated physical metadata. Answers59–61 are prepared for the next version; they do not alter immutable `.5`.

## Answers62–64 — HPGR and RM412 mechanisms

Question62 asked the mechanisms of HPGR A02 K101, A04 K101 and TF004 K202, and whether each Q8 is separate or combined. Exact answer: **“removable disconnectors”**. This supplies the three main-device model classifications; it did not independently answer the Q8 arrangement or racking baseline/profile. Those are selected separately in65.

Question63 asked whether RM412 S100/E100 and S101/E101 are combined selectors or separate main/earth controls. Exact answer: **“separate”**. This selects separate incoming controls, without supplying a complete local rule matrix.

Question64 asked the identity/mechanism of the unnamed contact below Q100. Exact answer: **“S102 is a switch”**. This supplies the S102 tag and switch description; it does not by itself confirm removability or independence from Q100 withdrawal. Source for63/64: `CBC0012-02004-DR-EL-0007.pdf`, rev9, p1 F–G/1–3 (unnamed contact F/1–3).

## Answer65 — HPGR removable disconnector/Q8 profile

Question65 explicitly proposed separate Q8 earth controls and Closed/Rack in main baselines for the three disconnectors. Main Open requires Rack in; main Close requires Rack in and own Q8 Open; Rack out requires main Open; Rack in requires main Open and own Q8 Open; Q8 Close requires main Open and Rack out; Q8 Open allowed. Unknown prerequisites block. Only the named Fortress/key sequences remain deferred under49; no other local prerequisites modeled. Source: `CB112-02006-DR-EL-0005.pdf`, rev7, p1 A–C/6–9.

Exact answer: **“Approve this complete profile and baseline for all3 pairs”**. Preserve disconnector kind and model contact/racking independently; do not reclassify them as breakers or infer other removability selections.

## Answer66 — RM412 Q100/S102 construction

Question66 explicitly asked whether Q100 and S102 are separate fixed Open/Close devices without racking or whether either is removable. Exact answer: **“Both fixed; separate Open/Close devices”**. This resolves the selected fixed mechanisms and distinct roles. Local interlock conditions remain a separate question.

## Answer67 — SW435 HPGR feeder pair

Question67 proposed the complete HV local matrix: CB Open requires Rack in; CB Close requires Rack in and own ES Open; Rack out requires CB Open; Rack in requires CB Open and own ES Open; ES Close requires CB Open and Rack out; ES Open allowed; unknown prerequisites block. Only the named HPGR key sequences are deferred under49. Sources: `11098-07110-EL-DR-2354.pdf`, rev9, p1 C–G/8–9, and `CB112-02006-DR-EL-0005.pdf`, rev7, p1 A–C/2–3.

Exact answer: **“Apply this complete local matrix”**. This selects this exact two-control V1 local profile; A01 Q8 and the two DC-earth profiles remain separate. None of these records rewrites immutable `.5`.

## Answer68 — RM412 complete local profile

Exact answer: **“Approve this complete local profile”**. The question explicitly selected a teaching profile rather than a drawing-derived truth table. Source: `CBC0012-02004-DR-EL-0007.pdf`, rev9, p1 F–G/1–3.

S100/S101/Q100/S102 are separate fixed Open/Close controls without racking. S100/S101 Open allowed; either Close requires both E100/E101 Open. Q100 Open allowed; Q100 Close requires S102 Closed and E100/E101/E102 Open. S102 Open requires Q100 Open; S102 Close requires Q100 Open and E102 Open. E100/E101 Close requires S100/S101/Q100/S102 all Open. E102 Close requires Q100 and S102 Open. All Earth Open actions allowed. Unknown prerequisites block; no additional local/key conditions are modeled for these exact controls. This does not establish operational permission or accept unrelated electrical claims.

## Answer69 — HPGR incoming A01 Q8

Exact answer: **“Approve this complete local profile”**. Earth Open allowed; Earth Close requires SW435 HPGR feeder CB Open/Rack out and A02 K101, A04 K101 and TF004 K202 each Open/Rack out. Unknown prerequisites block. Named key sequences remain deferred under49; no other local conditions modeled. Source: `CB112-02006-DR-EL-0005.pdf`, rev7, p1 A–C/4. The source does not provide this complete truth table; this is an owner-selected V1 profile.

## Answer70 — HPGR DC earths

Exact answer: **“Use these complete local profiles for both DC earths”**. MEB DC Earth Close requires A02 K101 Open/Rack out; MEA DC Earth Close requires A04 K101 Open/Rack out. Both Earth Open actions allowed; unknown prerequisites block. Named Fortress/key sequences remain deferred under49. Converter coupling, stored energy and discharge remain Unconfirmed and are not modeled by this profile. Source: `CB112-02006-DR-EL-0005.pdf`, rev7, p1 D–E/5–6 and D–E/9.

## Answer71 — retained RM712 IN01

Exact answer: **“Installed; use this Open baseline and profile”**. The question explicitly asked whether SF RM712 IN01 remains installed with no external cable, and selected Open, fixed Open/Close, no racking and no additional local/key prerequisites. Source: `11098-07110-EL-DR-2253.pdf`, rev3, p1 A–C/1–3. Hardware presence and this selected local profile/baseline are scoped decisions; unrelated source/earth claims remain separate.

## Answer72 — nine other RMU controls

Exact answer: **“Use this complete profile for all9 controls”**. The exact controls are RM712 IN02 and TF712 CB; RM713 IN01/IN02 and TF713 CB; RM413 IN01/IN02 and TF413/TF414 CBs. The selected complete V1 profile is fixed Open/Close, no racking, no additional local/key prerequisites, and no extra earth controls added for V1. This scope selection does not assert physical absence of earth devices. Sources: `11098-07110-EL-DR-2253.pdf` rev3, `11098-07110-EL-DR-2254.pdf` rev1, `CB17OP023A-04057-DR-EL-0004.pdf` rev5, each p1 A–C/1–3.

## Answer73 — RM413A mechanisms and lower-switch baseline

Exact answer: **“Confirm all three mechanisms and lower Service baseline”**. Upper ES-Q8 is a separate incoming/bar earth; Q1 is a fixed CB without racking; lower ES-Q8 is a separate combined Service/Isolated/Earthed switch, starting Service. The question explicitly limited this decision to mechanisms/baseline and kept local interlocks separate. These three action reviews remain unresolved until a complete profile is selected. Sources: `CB17OP023A-04057-DR-EL-0004.pdf`, rev5, p1 B–C/4–6; `CB-10016-DR-EL-0011.pdf`, rev0, p1 C–D/10–12.

## Answers74/75/77 — RM413A complete local actions

Answer74 exact: **“confirmed”**. The complete proposed V1 profile for Q1/lower switch was: Q1 Open allowed; Q1 Close requires lower Service and upper ES-Q8 Open; every lower-switch movement requires Q1 Open; Service↔Earthed passes through Isolated; selecting Service additionally requires upper ES-Q8 Open. Unknown prerequisites block; no racking or additional local/key conditions for those two controls. This is an owner-selected teaching profile, not a source-confirmed physical truth table. Sources are the same as73.

Answer75 exact: **“RM413 IN02 at RM413 should be open and so should RM413A TF413A Q1 CB. This will allow the ES-Q8 to open”**. Because the question asked about closing and the reply named opening, neither action direction was inferred.

Question77 explicitly separated Earth Close from Earth Open and asked whether any further local/key condition, including at RM417, applies. Exact answer: **“Earth Close requires both Open; Earth Open unrestricted; no other V1 prerequisites”**. Thus upper ES-Q8 Close requires RM413 IN02 Open and Q1 Open; upper Earth Open has no prerequisite. No RM417-end guard is added to this selected V1 profile. The incoming bar remains electrically connected to the represented double-boot route; the local action selection does not disconnect it, prove absence of a source, or constitute operational permission.

## Answer76 — former 22 kV Hopper10 branch hardware

Question76 asked the V1 treatment of CV006 ABS49-38-1 and fused ABS286 on the removed former 22 kV Hopper10 branch, distinguishing model treatment from hardware presence. Exact answer: **“The hardware no longer exists. assume that line is non-existent now.”** This confirms those former controls are absent. The current model will retain only disconnected historical reference markers for those old drawing identities, with no switching positions, baseline entries or active connections. The separately confirmed TF04 33 kV route and its controls remain separate. Source drawing retained for history: `CB19OP001B-04057-DR-EL-0001.pdf`, rev6, p1 row A. No claim is made that old and new pole or switch identities are equivalent.
