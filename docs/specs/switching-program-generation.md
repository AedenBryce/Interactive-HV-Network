# Switching Program Capture and Word Generation

## Relationship to the project specification

This is a follow-on feature specification related to GitHub issue #1. It does not change that issue's acceptance criteria, the accepted electrical model `construction-2026-11-06.12`, the accepted layout `authored-2026-11-06.9`, the starting configuration, or the electrical confirmations.

## Problem Statement

The owner currently has to transfer accepted switching actions from the network tool into the High Voltage Switching Program template by hand. This repeats information and makes it difficult to keep the switching sequence aligned with the simulated state from which it was developed.

## Solution

Let the user start an Isolation or Restoration switching program from the current simulated device state. Capture accepted apparatus actions in order, add the agreed verification sequence, allow confirmed undo of the last action, and develop the sequence into the repository's macro-enabled Word template. Asset program metadata supplies the template's location, voltage and relevant drawing reference.

The generated document remains a document for user review and editing. The tool continues to represent simulated states; it does not establish live equipment status, perform electrical calculations, or authorize operational isolation.

## User Stories

1. As a network user, I want to start an Isolation program, so that its rows are placed in the template's Isolation section.
2. As a network user, I want to start a Restoration program, so that its rows are placed in the template's Restoration section.
3. As a network user, I want the program to start from the current simulated device state, so that a Restoration program can follow an Isolation program without resetting the network.
4. As a network user, I want each accepted apparatus action recorded in order, so that opening and later closing the same device both appear in the sequence.
5. As a network user, I want rejected actions and source-availability changes excluded from the program, so that it records only accepted apparatus actions.
6. As a network user, I want to verify an apparatus's current state before each action and its resulting state after each action, so that the sequence records both checks.
7. As a network user, I want an earth-switch close to include Verify Earth Open, Test Meter, Test for Dead, Test Meter, Close Earth, and Verify Earth Closed in that order.
8. As a network user, I want the earth-close test rows to use the earth switch's location and Identify value, so that the checks are tied to the correct asset.
9. As a network user, I want Test Meter rows to use the associated circuit voltage and blank Type, and the Test for Dead row to use the associated circuit voltage and Type Phase Voltage Indicator, so that these checks use the agreed template mapping.
10. As a network user, I want earth-switch rows assigned `0V`, so that their voltage follows the owner's rule.
11. As a network user, I want to undo the last accepted action only after confirming a prompt that names it, so that I can remove the intended action.
12. As a network user, I want undo to remove the action and its generated check rows and restore the preceding simulated device state, so that the sequence and current state stay aligned.
13. As a network user, I want the tool to show each asset's program location, voltage and relevant drawing reference, so that I can review the source metadata used in the generated document.
14. As a network user, I want program metadata kept separate from the accepted electrical model, so that document preparation does not change the network, starting configuration or layout.
15. As a network user, I want asset voltage and location values to use the master template's available choices, so that generated rows match its dropdowns.
16. As a network user, I want the Type, Identify and Action fields mapped from the asset and accepted action, so that template fields remain consistent with the tool's asset labels.
17. As a network user, I want the Instructions field to join the action and type, such as `Open Circuit Breaker`, so that the Word row contains the agreed instruction text.
18. As a network user, I want the generated file to use the macro-enabled `.docm` template, so that the output retains the template format.
19. As a network user, I want the generator to extend the sequence tables in the template's existing style when needed, so that a longer program can still be generated.
20. As a network user, I want unassigned drawing-based metadata surfaced for owner confirmation rather than guessed, so that the program does not silently use unsupported values.
21. As a network user, I want the generated document's header and sign-off fields left blank, so that I can complete them during document review.
22. As a network user, I want the generated document not marked Draft, so that it follows the agreed template presentation.
23. As a network user, I want to add variable program steps manually in Word after generation, so that special steps can be tailored to each program.
24. As a network user, I want model selection, scenario loading, Reset and source-availability changes blocked while program capture is active, so that the current simulation remains stable while I build the sequence.
25. As a network user, I want developing the document to end capture while retaining the resulting simulated state, so that the next program can start from that state.
26. As a network user, I want a cancelled program's recorded sequence discarded while retaining the current simulated state, so that a later Restoration program can start from the state reached so far.
27. As a network maintainer, I want generated programs to preserve the accepted model and diagram layout, so that document generation cannot silently revise the reviewed network representation.
28. As a network user, I want the program-generation feature to remain explicit that the tool does not show live status, perform electrical calculations, or authorize operational isolation, so that the generated document is not presented as a live-system safety determination.
29. As a network user, I want fixed CCR and access-certificate INFORM rows placed at the start and end of Isolation and Restoration programs, so that the generated sequence includes the required communications and certificate transitions.

## Implementation Decisions

- **Workflow seam:** `SimulationSession` remains the authority for accepted device changes and simulated states. A switching-program coordinator owns capture mode, ordered program records, generated checks, confirmed undo and session locks. A template adapter converts the coordinator's completed sequence into the macro-enabled Word file. The owner approved this seam on 6 November 2026.
- **Action source:** only accepted apparatus-device changes are captured. Source-availability changes are blocked during capture and are never program steps. Rejected changes do not enter the sequence.
- **Start and finish:** the user chooses Isolation or Restoration when starting. Capture begins from the current simulated device states. Developing the document ends capture and leaves the simulated state unchanged. Cancelling discards the captured document sequence but leaves the current simulated state unchanged.
- **Action checks:** every recorded action has a current-state verification row before it and a resulting-state verification row after it. Undo confirms the named action, removes its full generated row group, and returns that device to the preceding simulated state.
- **Earth-switch close:** before closing, generate Verify Earth Open, Test Meter, Test for Dead, Test Meter; then Close Earth and Verify Earth Closed. The four pre-close rows use the earth switch's location and Identify value. Verify Earth Open uses `0V`, Type `EARTH SWITCH`, Action `VERIFY`. Both Test Meter rows use the associated circuit voltage, blank Type, and Action `TEST`. Test for Dead uses the associated circuit voltage, Type `PHASE VOLTAGE INDICATOR`, and Action `TEST`. All rows use the agreed check wording in Instructions. The close and post-close verification use `0V`. No post-closure test-for-dead row is added.
- **Other variable steps:** only the consistent checks above are generated automatically. The user adds other program-specific steps in Word after generation.
- **Fixed program INFORM rows:** for Isolation, prepend an `INFORM` row with Instructions `INFORM CCR OF INTENT TO ISOLATE EQUIPMENT`; append `INFORM` / `INFORM CCR ISOLATIONS IS COMPLETE`, followed by `INFORM` / `ISSUE ACCESS CERTIFICATE`. For Restoration, prepend `INFORM` / `CANCEL ACCESS CERTIFICATE`, then `INFORM` / `INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT`; append `INFORM` / `INFORM CCR THAT EQUIPMENT IS DE-ISOLATED`. Leave all other fields blank on these fixed rows. These are program-level rows and do not receive apparatus-state verification rows.
- **Asset program metadata:** location, voltage and the relevant drawing reference are shown with each asset and kept separate from electrical connectivity, state, starting configuration and authored diagram layout. Display only the relevant drawing reference(s), without revision text. Earth switches use `0V`. Other voltage assignments come from drawing evidence or explicit owner confirmation and use the master template's voltage dropdown. The owner approved adding `400V`, `1.9kV`, `720V` and `11kV` to the dropdown; `6.9kV` was also added per owner direction on 6 November 2026.
- **Template field mapping:** Type and Action use existing template choices. Identify excludes the tool's separate asset-type prefix and uses the approved mappings and new identifiers. Approved aliases are: `SW421/SW426/SW431/SW441/SW451/SW454 FD01` to the matching `FDR`; `SW435 FD01/FD02` to `SW435 FDR01/FDR02`; `TFxxx FD` to `TFxxx FDR`; `SW411 BT` to `SW411 BUS TIE`; `SW421/SW426/SW431/SW441/SW451/SW454 IN01` and `SW505 IN01` to the matching `IN`; `BUS A/B SW411` to `SW411 BUS A/B`; `MC406A CB` to `MC406A IN`; `MC417/MC418/MC419 INCOMING VCB` to the matching `IN`; `MC417A/MC418A MCCB` to the matching `IN`; `TF004 FEEDER` and `TF714 FEEDER EARTH` to the matching `FDR`. Prefer an exact dropdown choice and block an ambiguous or unapproved mapping. The Instructions field combines the Action and Type, for example `Open Circuit Breaker`. Do not add new Type or Action choices. Location and voltage use existing dropdown values.
- **Instructions choices:** the master template's Instructions dropdown also includes `INFORM CCR ISOLATIONS IS COMPLETE` and `TEST METER`, as approved by the owner on 7 November 2026. Other fixed Isolation and Restoration messages use the agreed wording already present in the template.
- **Output:** generate a `.docm` from the supplied master template, retaining macro-enabled package content. Leave header/sign-off fields blank and do not add a Draft mark. Extend the Isolation or Restoration table using its existing row style when required.
- **Preserved project state:** do not change the accepted model version, its starting configuration, electrical confirmations, or the accepted authored layout. Do not regenerate or optimize the drawing.
- **Owner-confirmed voltage mappings:** on 6 November 2026, TF413A AC inputs A and B were assigned `690V`; VS50501/02/03 output contacts, `1.9kV`; MC001, MC406A and MC410A, `415V`; and the Sizer/MC420 group, `6.9kV`. On 7 November 2026, the owner confirmed `720V` for the RM406/RM410 VS input switches, `11kV` for the station-board circuits, `6.6kV` for the HPGR MEA/MEB outlet switches, `415V` for the MC420A incoming ACB, and `22kV` for the Drop Tower Pole 18 ABS devices. The owner also confirmed `6.6kV` from the phase bars for MC416, MC417 and MC418, and `0V` for both earth-switch and associated test-circuit voltage for the HPGR MEA/MEB DC earths, SW426 SS714 earth and VS50501/02/03 DC earths. The `720V` and `11kV` values were added to the template dropdown. The 37 assets without a matching existing LOCATION choice remain visibly unassigned; no new LOCATION choices were authorized.
- **Unresolved source values:** no voltage or location is inferred from a label or diagram placement. Unsupported values are not substituted with a nearby dropdown choice.
- **Stable mode:** while capture is active, block model selection, scenario loading, Reset, and source-availability changes. While document development is in progress, disable starting, undoing or cancelling a capture and make the network workspace inert. If generation is blocked or fails, leave the capture active and restore its controls; on success, end capture while retaining the resulting simulated state.

## Testing Decisions

Use the approved switching-program workflow boundary: drive current simulated state changes through `SimulationSession`, capture only successful apparatus changes in the coordinator, and inspect the generated `.docm` through the template adapter. Assert observable sequence rows, ordering, state rollback on confirmed undo, locks during capture, and retained simulation state at finish/cancel. Verify that the Isolation and Restoration INFORM rows appear in the required positions, use Action `INFORM`, carry the exact Instructions text, and leave all other fields blank. Test file output structurally by checking dropdown values, row fields, section choice, row extension and macro preservation; render representative outputs and visually inspect them.

Use synthetic session fixtures for behavioural edge cases and a fixture based on the accepted model only to verify that metadata and program capture do not change its electrical model, starting state or layout. Test that missing drawing-backed metadata is surfaced without substitution. Do not test internal helper structure or implement a second copy of switching/interlock rules in the tests.

## Out of Scope

- Changing or reaccepting the electrical model, starting configuration, electrical confirmations or authored layout.
- Regenerating, optimizing or editing the physical diagram layout.
- Live site status, remote control, electrical calculations, determination of safe-to-work conditions, or authorization of operational isolation.
- Automatic generation of inconsistent, site-specific work steps such as permit, notification, lock/tag or equipment-specific checks; the user can add these after generation.
- Hosting or deployment changes.

## Further Notes

- Source voltage and location assignment is not yet complete. The remaining drawing-backed exceptions will be presented to the owner as a consolidated list before those asset metadata values are finalized.
- The source template's `VOLTAGE` dropdown includes the owner-approved `400V`, `1.9kV`, `6.9kV`, `720V` and `11kV` additions; the approved Identify values and mappings are in the repository's master `.docm`.
- The source template's `INSTRUCTION` dropdown includes the owner-approved `INFORM CCR ISOLATIONS IS COMPLETE` and `TEST METER` values.
- The owner-confirmed voltage assignments listed above are the current decisions for metadata implementation. Asset voltage values are populated for all 378 switchable assets, including `0V` for earth switches. Associated circuit test voltage is populated for all 131 earth switches, including the owner-confirmed `0V` cases; 37 LOCATION fields remain unassigned and surfaced for review rather than inferred.
- The feature is a follow-on to the original exploration specification. It does not convert the accepted model into a source of live status or operational authority.
