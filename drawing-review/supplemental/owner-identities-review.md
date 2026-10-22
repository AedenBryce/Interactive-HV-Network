# Owner identity and spare-hardware confirmations

Recorded 22 October 2026. Source: **Project owner (conversation)**, answers13–15. These answers confirm only the specific hardware/identity facts below. Actual positions, source availability, complete physical interlocks and whole-model acceptance remain unconfirmed.

| Question / runtime decision | Exact owner answer | Confirmed model treatment |
| --- | --- | --- |
|13 / WN-TF436-SPARE-HARDWARE|“There is a breaker and earth switcb but it is a spare and does not feed anything, no outgoing cables.”|Retain the existing breaker and earth switch at the SW435 tier5 spare cubicle. Confirm their presence and the lack of an outgoing cable/downstream feed. Do not set either position or invent a physical-interlock rule.|
|14 / WN-TF432-TIER5|“Tier 5”|Use tier5 for the SW431 TF432 feeder. Preserve tier3 as the differing detailed-drawing alias and retain its original evidence. This is a tier-label correction, not a topology change.|
|15 / WN-HPGR-MC001-MC438|“Both names used for same board”|MC001 and MC438 identify the one existing TF004-fed HPGR LV board. Retain both aliases and one bus. The440/415V labels, incoming MCCB tag, feeder-bay identity and reference-sheet questions remain separate.|

## Drawing context

- TF436: `11098-07110-EL-DR-2354.pdf`, revision9, page1 C–G/6, versus `CB-10016-DR-EL-0010.pdf`, revision0, SW435 tier5 SPARE FD. The earlier answer “TF436 is a spare cubicle. Nothing installed” concerned the downstream branch; answer13 explicitly confirms the cubicle hardware.
- TF432: `11098-07110-EL-DR-2353.pdf`, revision5, page1 C–G/5–6, detailed TF432 tier3 callout, versus `CB-10016-DR-EL-0011.pdf`, revision0, page1 B–D/3–6, overview tier5. C1-R02 is resolved for the displayed feeder tier only.
- HPGR board: `CB112-02006-DR-EL-0005.pdf`, revision7, page1 C–E/7–8, TF004/MCCB/MC001, versus `CB-10016-DR-EL-0010.pdf`, revision0, HPGR TF004/MC438 region. C2-R06 remains open for its other questions.

## Current package

`site-whole-network` / **`construction-2026-10-22.17`**, composed through `withOwnerIdentityCorrections` in `src/models/site/owner-identities.ts`. The extension clones its input. Historical `.16`/`.15` helpers and area packages remain unchanged.

Verified software inventory: **680 assets,677 connections,360 null/blocked controls,3 null sources,139 earth terminations,313 coverage boundaries and91 views**, with13 orientation regions and24 contactors. One added coverage record explicitly confirms no external outgoing supply at the TF436 spare, with earth mechanism/state/interlock coverage still unconfirmed. Graph connections, electrical state values, transformer relationships and interlock rules are unchanged.

The package also records the reviewed0008control sheet as supported evidence. See [source provenance and limits](hpgr-control-review.md). This does not create a switching rule or phase connection. Eleven focused session checks and typecheck pass; production build passes (786.67kB JavaScript /229.52kB gzip; Vite size advisory). Full-suite testing remains reserved for final whole-goal delivery.

## Received after this package was frozen

**Answer16:** the owner answered exactly “yes it is” to “Is RM413 IN02’s cable side currently a double-boot connection serving both RM417 (Hopper 1) and RM413A?” Context: `CB17OP023A-04057-DR-EL-0004.pdf`, revision5, page1 A–C/1–6. This confirms that named cable-side fork only. It does not bypass IN02 to the RM413 bus or set any state/interlock/transformer policy.

This answer is recorded for the next immutable model increment; it is **not included in `.17`**. Questions17–18, about the Hopper8 and Hopper9/Hopper7 routes, remain pending. No answer is inferred.
