# Owner confirmations: SW411 processing feeds

Source: **Project owner (conversation)**, 23 October 2026. These decisions concern named cable routes only; positions, source availability, physical interlocks and whole-model acceptance remain separate.

## Answer22 received

The owner answered exactly **“all confirmed”** to:

> Please confirm or correct these current SW411 feeding routes: tier01 → SW454 via SW454-P-01; tier02 → SW451 via SW451-P-01; tier04 → SW435 via SW435-P-01. This confirms the cable routes only, not switch positions/interlocks.

The question cited `11098-07110-EL-DR-5151.pdf`, revision7, page1 D–G at those tiers; receiving sheets `11098-04400-EL-DR-8001.pdf`, revision5, page1 A–D/1–2; `11098-07110-EL-DR-2356.pdf`, revision5, page1 A–C/1–2; and `11098-07110-EL-DR-2354.pdf`, revision9, page1 A–C/1–2.

The decision applies to `whole:join:sw454`, `whole:join:sw451` and `whole:join:sw435`. It was received after `.18` passed its implementation checks and is **not applied to `.18`**. It requires a subsequent immutable model version. No current device state, full physical identity or winding/earth relationship is confirmed by that answer.

## Answer23 received

The owner answered exactly **“all confirmed”** to:

> Please confirm or correct these current SW411 feeding routes: tier13 → SW431 via SW431-P-01; tier14 → SW426 via SW426-P-01; tier15 → SW421 via SW421-P-01. This confirms the cable routes only.

The question cited `11098-07110-EL-DR-5151.pdf`, revision7, page1 D–G at those tiers; receiving sheets `11098-07110-EL-DR-2353.pdf`, revision5, `11098-07110-EL-DR-2352.pdf`, revision9, and `11098-07110-EL-DR-2351.pdf`, revision5, each page1 A–C/1–2.

The decision applies to `whole:join:sw431`, `whole:join:sw426` and `whole:join:sw421`. Like answer22, it is not applied to immutable `.18`; a subsequent version is required. It confirms the named routes and cable tags only, without actual device states, complete physical identity, winding/earth policies or physical-interlock permission.

## Answer24: defer the cross-station key interlocks

The question asked for actual installed physical interlocks between SW411 IN03/IN04 and upstream TF11/TF12 station feeder assemblies, including exact device tags, required positions and key-release conditions. It cited `11098-07110-EL-DR-5151.pdf`, revision7, page1 note3, which does not confirm the complete installed conditions.

The owner answered exactly **“there are key interlocks. Ignore these for now i will add them to the tool at a later date”**. This confirms that key interlocks exist and explicitly defers these cross-station key conditions from the current educational simulation. The conditions remain **Unconfirmed**; they are not represented as absent in the installed equipment or accepted as unrestricted operation. This decision applies to the relationship asked about, not every key system in the network. Other drawing-supported interlocks and separate unresolved position/mechanism reviews remain.

This model-boundary decision also requires the next immutable version. The affected assemblies are the existing SW411 IN03/IN04 CB/ES and station SB01 F4/TF11 and SB02 F1/TF12 CB/ES; those are model identifiers for the assemblies in the question, not a confirmed complete physical key schedule. The starting states and availability remain null. No key-release sequence is invented, and no blanket device or whole-model acceptance follows.

## Applied package

Answers22–24 are applied together in `site-whole-network` / `construction-2026-10-23.1`, code commit `f5beb4b`, through `withOwnerSw411Feeds` in `src/models/site/owner-sw411-feeds.ts`. Immutable `.18` remains unchanged.

Runtime records are `WN-SW411-FEEDS-01-02-04`, `WN-SW411-FEEDS-13-14-15` and `WN-CROSS-STATION-KEY-DEFERRAL`, each dated23 October2026. The helper checks the six existing join IDs and terminal pairs before confirming them; it adds or remaps none. The eight affected CB/ES interlock reviews retain their unresolved statuses and add the explicit key-scope deferral. Other controls' reviews, actual positions, source availability, transformer relationships and interlock rules are unchanged.

Inventory remains680 assets,677 connections,360 null/blocked controls,3 null sources,139 earths,313 coverage boundaries and91 views. Nine focused session tests and typecheck pass; production build passes. Browser review confirms the new version, IN03's deferral note and disabled Open/Close controls. Full checks and limitations are recorded in the [implementation progress](../../docs/implementation-progress.md). These software checks do not establish installed-network or whole-model acceptance.
