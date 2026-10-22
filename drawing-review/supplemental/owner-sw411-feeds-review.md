# Owner confirmations: SW411 processing feeds

Source: **Project owner (conversation)**, 23 October 2026. These decisions concern named cable routes only; positions, source availability, physical interlocks and whole-model acceptance remain separate.

## Answer22 received

The owner answered exactly **“all confirmed”** to:

> Please confirm or correct these current SW411 feeding routes: tier01 → SW454 via SW454-P-01; tier02 → SW451 via SW451-P-01; tier04 → SW435 via SW435-P-01. This confirms the cable routes only, not switch positions/interlocks.

The question cited `11098-07110-EL-DR-5151.pdf`, revision7, page1 D–G at those tiers; receiving sheets `11098-04400-EL-DR-8001.pdf`, revision5, page1 A–D/1–2; `11098-07110-EL-DR-2356.pdf`, revision5, page1 A–C/1–2; and `11098-07110-EL-DR-2354.pdf`, revision9, page1 A–C/1–2.

The decision applies to `whole:join:sw454`, `whole:join:sw451` and `whole:join:sw435`. It was received after `.18` passed its implementation checks and is **not applied to `.18`**. It requires a subsequent immutable model version. No current device state, full physical identity or winding/earth relationship is confirmed by that answer.

## Pending questions

- Question23: current tier13→SW431/SW431-P-01, tier14→SW426/SW426-P-01 and tier15→SW421/SW421-P-01 cable routes. No answer recorded yet.
- Question24: actual installed physical interlocks between SW411 IN03/IN04 and upstream TF11/TF12 station feeder assemblies, including exact device tags, required positions and key-release conditions. `11098-07110-EL-DR-5151.pdf`, revision7, page1 note3 does not confirm the complete installed conditions. Affected controls remain disabled.
