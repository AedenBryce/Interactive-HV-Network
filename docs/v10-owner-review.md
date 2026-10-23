# Review model .10

**Decision needed:** review the represented network and accept this specific V1 teaching model and starting configuration, or identify corrections. This is the outstanding owner decision in [GitHub25](https://github.com/AedenBryce/Interactive-HV-Network/issues/25). Software checks do not establish installed coverage or owner acceptance.

## Open the review

The isolated production preview is running at [localhost:4174](http://127.0.0.1:4174). The current **Whole network · construction / owner review pending** opens automatically. Historical area models and fictional demonstrations are separate selector groups. Current and starting states are shown separately in Asset details. A model summary records362/362 selected starting states and362/362 reviewed local profiles; older construction wording remains available under history disclosures. Genuine source/earth and installation uncertainties remain open. The dark downward supply tree represents684 model assets and677 connections using674 equipment glyphs and10 unlabelled conductor joins. Supplies start at the top; feeders descend, with earth controls beside their connected terminals. Alternate feeds stay on the same canvas. All233 owner-confirmed evidence records are retained. Amber outlines identify the seven unconfirmed connection records, while question-mark badges identify external source/earth coverage uncertainty. These indicators do not override selected V1 states or local profiles. Use **Find asset** to locate a tag, name or alias, or **Zoom to area** to move the camera to a board/area on the same canvas. Click an asset, its label, a search result or an asset-list entry for a compact action popup. Open/Close/Rack in/Rack out use the recorded local restrictions; blocked/current actions are disabled. Use Asset details and evidence for full inspection. Named borders group switchroom/board equipment; Zoom to group includes these groups. Mouse wheel zooms; drag/arrow controls pan; **Fit view** shows the full network. **Reset network** restores the selected teaching baseline. For later startup use the [README commands](../README.md).

A portable review copy with the latest visual changes is available at `output/hv-network-v10-equipment-review.zip`: extract it and follow its README to serve the `www` folder locally. Presentation code isfa44130; the electrical model and exact baseline scenario are unchanged. The original `hv-network-v10-review.zip` is preserved as the earlier renderer. These review copies contain a file-checksum manifest without PDFs or repository sources. The model remains unaccepted; [visual verification](visual-review-2026-10-23.md) records the latest archive identity and checks. The [review record](v10-walkthrough.md) retains Section1's confirmation and the owner's preference to inspect the whole tool visually. Section-by-section questions are stopped; collect corrections together after that visual review.

Review identity: **`site-whole-network` / `construction-2026-10-23.10`**, implementation commit **`57a2ee9`**. The actual baseline scenario is `tmp/whole-network-v23-10-browser.scenario.json` in this workspace, with an original copy in Downloads named `site-whole-network-construction-2026-10-23.10.scenario.json`. Open it with **Open scenario**. It includes its model and diagrams; no separate model or PDF is needed.

Scenario size:8,382,404bytes. SHA256: `D9F5EE5DF69AC5A3FE8846AF215F4D1FEA651B9B2881F7655707490A3DE4436D`.

## Review the scope and connections

Start with **Fit view**, then use **Zoom to area** and **Find asset** to inspect these included areas in the continuous canvas:

| Area | Scope to check |
| --- | --- |
| Station boundary | SB01 F4/TF11, SB02 F1/TF12, SB02 F4/TF04 only, beginning at each feeder-breaker input; no station buses/generators/other feeders. |
| SW411 | TF11→IN03, TF12→IN04; unused IN01/IN02; selected outgoing routes and separate bus sections. |
| Crushing1 / SW431 | Transformer/first-bus branches and the SW431–SW435 tie; MC431A beyond MC431 excluded. |
| Crushing2 / SW435 / HPGR | Installed TF453/SW453; spare TF436 cubicle without outgoing cable; HPGR LV endpoint and the two selected MV drives. |
| Screening / SW421 | Retained transformer/first-LV-bus branches. |
| Desands / SW426 / laboratory | Retained first-bus branches, SW426→RM714→TF714→SW714/MC714. |
| Stockpile / wet plant | SW454 and connected transformer/first-bus branches. |
| Train loading | SW451 branches; continuous MC451/MC451B section. |
| CV006 | SW411 tier03→RM406/RM410; TF406B via CB02/SW03 to MC406A; separate LV converter AC endpoints. |
| Western hoppers1/3/7/8/9 | Confirmed hopper routes; similarly printed SS416/TF416 identities remain distinct between Hoppers3/8. |
| Services | RM721→RM712 IN02 and RM713 IN01; RM712 IN01 no external cable; TF712→SW712 incomer; RM413 double-boot fork to RM417/RM413A. |
| Hopper10 | TF04 33kV line→RM420; selected33kV TF420A/B inputs and retained MV/LV branches. Former22kV Hopper10 line/hardware absent. |
| Water tower/process water | TF12 OPF1-7 spur→WT1-CB→SW441→TF441→MC441. |

Check these explicit cuts: mine-services, village/camp and RM718 are excluded; other TF04 branches end at takeoff markers. Drop Tower ends at its transformer by answer87. VS4061,VS4101 and RM413A stop at six separate AC input endpoints by92. Five MV converters include selected forward converter-to-motor connectivity. RM713 IN02,RM714 IN02 and RM417 SW02 have no external cables. The Services changeover/DG assembly is excluded. Outgoing LV circuits are excluded.

These scope statements come from the recorded owner decisions; the [full owner review record](model-owner-review.md), [construction guide](whole-network-construction.md) and linked source inventories retain exact evidence. Counts alone do not prove complete installed coverage: confirm that this is the whole agreed V1 scope or identify what is missing.

## Review the starting configuration and actions

All three teaching inputs are available. SW411 IN03/IN04 are Closed/Rack in. The bus tie and both SW431–SW435 tie ends are Open/Rack out. Other removable mechanisms are Rack in; motor Forward/Reverse contactors start Open. Selected earth controls start Open. Other exact device states remain those already selected in the owner baseline records and embedded scenario.

Inventory cross-check:362 controls comprise214 discrete controls (127Open,68Closed,19Service) and148 removable mechanisms (113Closed/In,32Open/In,3Open/Out). There are559 declared local rules and362 selected local profiles; intrinsic contact/racking guards also apply. Inspect the exact per-device prerequisites in the application rather than applying one general rule to every assembly.

Try a connected bus, trace its source path, open its incomer and inspect the downstream impact. Check blocked racking while Closed, then Open→Rack out and blocked closing while Out. Use Undo/Reset. Inspect earth paths and source-to-earth conflicts separately from source connectivity. Older `.9` scenarios open view-only against `.10`.

## Retained Unconfirmed information

Acceptance would select this educational model while retaining the following limits explicitly:

- Equipment metadata and historical aliases/references are not blanket verified. Of684 asset records,173 retain provisional and38 unresolved parent knowledge; selected contact/wire claims do not promote those records.
-90 directed source-transfer claims remain unresolved, including reverse/alternate transformer input behavior. Primary→secondary and the five MV converters' simplified forward rules are the selected behaviors. Independent transformer/converter earth transfer remains Unconfirmed.
-32 fixed-fuse candidate earth relationships remain parent-gated and Unconfirmed. Selected intact source continuity does not prove metallic earth continuity or actual fuse condition.
-318 external coverage boundaries remain explicit:10 have complete source coverage only;308 have unconfirmed source coverage. All318 retain unconfirmed earth coverage. A scope endpoint does not assert that an omitted external source/earth path is physically absent.
-Seven excluded33kV takeoff-marker links remain provisional. They do not add downstream branch detail or prove absent backfeed.
-Only the specifically recorded cross-station/key/door/inching/Fortress/Ronis sequences are deferred for V1; deferral does not mean physical interlocks are absent. Selected local restrictions remain active.
-Actual field bonding, resistance, installation, electrical calculations, stored energy/discharge, live equipment status and operational isolation permission are not established by this model.

The embedded evidence and192 still-open review records preserve these separate residual claims and historical context. Acceptance does not silently close them or turn uncertain results into proof of safe isolation. Identify any retained uncertainty that you want resolved or represented differently before acceptance.

## Checks completed and next delivery gate

65 focused public-session checks, typecheck and production build pass. Independent Standards and Spec reviews each report0 actionable findings. Production browser checks demonstrate laboratory supply interruption, racking guards, Undo/Reset and matching/historical scenario handling. An isolated folder containing only HTML,CSS andJavaScript starts and explores the model without PDFs; browser warning/error entries are empty. Narrow/mobile remains unverified.

The whole-goal full test suite and final accepted-delivery record remain pending. GitHub25/26 stay open. If you accept `.10`, record that acceptance externally against this immutable identity and scenario fingerprint; the distributed model snapshot itself must not be rewritten under the same version. Acceptance should state your reviewer identity and confirm the represented scope, connections, sources, supported states, local profiles, starting configuration and retained limits above. Alternatively, list corrections or request a guided area-by-area review.
