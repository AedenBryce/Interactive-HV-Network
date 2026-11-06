# Owner electrical policy decisions

These are scoped V1 teaching-model decisions. They do not establish actual equipment condition, electrical calculations, installed converter behavior or operational permission.

## Answer78 — fixed intact series fuses

Question78 proposed treating exactly the31 series fuses in [the frozen inventory](fuse-continuity-proposal.json) as intact fixed conductors, without blown-fuse/removal actions. The question explicitly excluded actual fuse-condition claims and rating/earth-behavior resolution.

Exact answer on23October2026: **“Use this fixed intact-fuse model for all31”**.

The selected source paths remain fixed and work in both directions. Implementation uses two relationship-scoped source claims per fuse, preserving provisional parent metadata and the previous provisional earth candidate. No fuse control or baseline state is added. Original documents, revisions and page/region references remain in the exact inventory; no source precedence is selected.

## Answer79 — MV converter/motor scope

Question79 asked whether to include converter-to-motor source connectivity or stop at AC inputs for the exact five branches: HPGR MEB/MEA and SW505 VS50501/02/03. It explicitly selected scope only and reserved the simplified transfer rule for a separate question.

Exact answer on23October2026: **“Include converter-to-motor connectivity”**.

Those five converter/motor branches are in scope. This answer does not supply AC-input conditions, directional transfer, earth continuity, stored-energy/discharge behavior or HPGR switched-outlet positions/interlocks. Answers80/82 separately select the model decisions below; no converter source path is enabled from79 alone.

Sources referenced in79: `CB112-02006-DR-EL-0005.pdf`, rev7, p1 D–G/5–9; `500CB-04220-DR-EL-0042.pdf`, rev4, p1 D–F/2–10. These drawings identify the retained groups; the source does not confirm a complete converter transfer rule.

## Answer80 — forward converter source transfer

Exact answer: **“confirmed”** to this complete proposed teaching rule: either energized AC input supplies the DC section, which supplies the output; downstream output contacts still interrupt the motor route. Forward source transfer only; no metallic or earth-continuity link between AC, DC and output. Reverse transfer remains Unconfirmed. No automatic run control, electrical calculations, stored energy or discharge behavior is modeled. A supplied closed DC earth reports a source-to-earth conflict and does not silently remove supply.

This selects15 directed forward source claims across the five named converters. No reverse or earth-transfer claim is accepted. The same drawings/regions as79 identify the groups; this is owner-selected behavior rather than verified converter physics.

## Answers81/82 — HPGR motor-side outlet model

Answer81 exact: **“81. as per your reccomendation”**. Because81 did not contain a complete proposed baseline/rule matrix,82 explicitly presented the complete recommendation for selection. Answer82 exact: **“Select this complete V1 outlet profile”**.

The selected model for MEB/MEA is a fixed Service/Isolated/Earthed selector, initially Service, no racking. Service connects VSD→motor; Isolated no pair; Earthed motor→earth. Every movement requires its associated K101 Open/Rack out (MEB=A02, MEA=A04). Service↔Earthed passes through Isolated; Service also requires own DC earth Open. Unknown prerequisites block; no other local prerequisites.

Answer82 explicitly defers only these two outlets' Fortress-key sequences for V1. This is a separate bounded scope decision, extending neither owner49's original exact82-control inventory nor any unrelated key system. Source: `CB112-02006-DR-EL-0005.pdf`, rev7, p1 E–G/5–6 and E–G/9. The source does not confirm this complete physical truth table. Selected contact relationships and actual parent-equipment metadata remain separate claims.
