# Owner confirmations: RM413 fork and western hopper supplies

Recorded 22 October 2026. Source: **Project owner (conversation)**, answers16–21. These are current-route and named-identity confirmations. They do not establish actual device states, source availability, winding/earth transfer, complete physical interlocks or whole-model acceptance.

## Exact answers and scope

| Question | Exact owner answer | Confirmed relationship |
| --- | --- | --- |
|16|“yes it is”|In response to “Is RM413 IN02’s cable side currently a double-boot connection serving both RM417 (Hopper 1) and RM413A?”: confirms the named cable-side fork to both destinations. It is not a connection bypassing IN02 to the RM413 bar.|
|17|“yes”|In response to whether RM406 CB03/SW04 currently supplies Hopper8 SS416-HV416, feeding that hopper's TF416 and TF416A: confirms this Hopper8 route. Its SS416/TF416/TF416A identities remain distinct from the similarly named Hopper3 equipment.|
|18|“yes”|In response to whether the current route is RM410 CB03/SW04 → RM419 SW01 (Hopper9), then RM419 SW02 → RM418 SW01 (Hopper7): confirms those named source/end devices and route. Preserve every series control; no device is bypassed or merged.|
|19|“yes”|In response to whether RM417 CB02/SW04 currently feeds Hopper3's separate SS416 kiosk and its TF416/TF416A: confirms that route and source-scoped group, distinct from Hopper8. No winding-transfer or actual switch-state rule follows.|
|20|“yes”|In response to whether Hopper7/RM418 CB03 feeds both TF418 (MV supply) and TF418A (LV supply), with CB04 spare: confirms those current names/roles. Older CB01/CB02 and TF418A/TF418B drawing aliases remain traceable. A spare designation does not establish CB04's position, earth state or absence of outgoing cables.|
|21|“yes”|In response to whether the current MC413 route is RM413's TF413 feeder → TF413 → MC413, and whether RC001 is an incorrect/old reference: confirms the current named route. RC001 is not the current feeder reference for this route; whether its cause is an old label or an error is not distinguished. No physical RC001 asset is merged or invented.|

## Source comparisons retained

- Answer16: `CB17OP023A-04057-DR-EL-0004.pdf`, revision5, page1 A–C/1–6, RM413 IN02 double-boot fork and RM413A; `CB16OP038A-02006-DR-EL-0044.pdf`, revision2, page1 A–B/6–7, RM417 arrival.
- Answer17: `CB19OP001B-04057-DR-EL-0002.pdf`, revision4, page1 C–E/10–11, RM406 CB03/SW04/Hopper008 outgoing; `CB17OP023C-01006-DR-EL-0001.pdf`, revision6, page1 C–G/8–11, separate Hopper8 SS416 transformer group. Exact document-reference discrepancies remain traceable; confirming the named route does not silently correct every reference string.
- Answer18: `CB19OP001B-04057-DR-EL-0004.pdf`, revision6, page1 C–F/10–12, RM410 to RM419; `CB19OP001C-01068-DR-EL-0001.pdf`, revision4, page1 A–B/6–8, RM419 SW01/SW02; `CB17OP023C-01006-DR-EL-0001.pdf`, revision6, page1 A–B/6–7, RM418 SW01 from RM419 SW02.
- Answer19: `CB16OP038A-02006-DR-EL-0044.pdf`, revision2, page1 B–G/8–11, RM417 CB02/SW04 and Hopper3 SS416 transformer fork.
- Answer20: `CB17OP023C-01006-DR-EL-0001.pdf`, revision6, page1 A–F/3–9, RM418 CB03/CB04 and TF418/TF418A, compared with `CB19OP001B-04057-DR-EL-0001.pdf`, revision6, older CB01/CB02 and TF418A/TF418B labels in the RM418 region.
- Answer21: `CB17OP023A-04057-DR-EL-0004.pdf`, revision5, page1 B–E/2–4, RM413 TF413 feeder; `00151-CB-02006-DR-EL-1001`, revision11, page1 A–B/4–5, TF413/MC413 with the differing RC001/reference2350 text. Document-prefix equivalence, rating labels, detailed mechanism and installed revision precedence remain separate from this route confirmation.

The owner answers confirm feeding routes rather than accepting all hardware aliases, reference-prefix corrections, transformer labels or position sets in those sheets. Administrative earth wording remains separate from physically enforced interlocks. The source does not confirm switching permission from an omitted rule.

## Package status

These answers were received after immutable `.17` froze. They are applied together in `site-whole-network` / `construction-2026-10-22.18` through `withOwnerRouteConfirmations` in `src/models/site/owner-routes.ts`; `.17` remains unchanged. Questions16–21 are answered to the specific scope above. Remaining position, source-availability, winding/earth and physical-interlock questions are not resolved by those answers.

| Answer | Runtime decision record |
| --- | --- |
|16|`WN-RM413-DOUBLE-BOOT`|
|17|`WN-HOPPER8-RM406-ROUTE`|
|18|`WN-HOPPER9-HOPPER7-ROUTE`|
|19|`WN-HOPPER3-RM417-ROUTE`|
|20|`WN-HOPPER7-CB03-CB04`|
|21|`WN-MC413-RM413-SUPPLY`|

The helper checks every affected connection's existing ID and terminal pair before confirming its knowledge. It adds no connection and remaps none. The receiving RM417 SW01 was not explicitly named in answer16, so `wh:h1:rm413-cable` retains its prior drawing-supported knowledge. Hopper3 and Hopper8 remain distinct. Transformer assets and source/earth transfer pairs, actual positions, source availability and interlock rules are unchanged. MC413's view identifies the confirmed supply route while retaining the separate rating/interlock questions.

Focused software checks and current-package metadata are recorded in the [implementation progress](../../docs/implementation-progress.md). Software checks do not establish owner acceptance.
