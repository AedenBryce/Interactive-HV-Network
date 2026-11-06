# HV Network Understanding

This context describes the network represented by the interactive tool for understanding isolations and downstream impacts.

## Language

**Network model**:
The representation of the whole network built together from the supplied drawings and corrected through the user's review. The drawings and PDFs are not required after the model has been established as correct.

**LV bus endpoint**:
A final low-voltage bus at the boundary of the network model. Outgoing LV circuits are outside that boundary.

Owner87 selects an explicit V1 exception for Drop Tower: its final point is the Drop Tower transformer. The downstream LV fuse, cable and changeover board are outside that branch's modeled boundary. This does not assert that excluded equipment or alternate supplies are absent.

**Drawing discrepancy**:
A difference between drawings that needs the user's confirmation during model construction. A best guess may be used provisionally, with the unresolved issue highlighted for step-by-step review.

**Source connectivity**:
Whether an asset is connected through the model to at least one enabled electrical source in the selected device states, including alternate supply paths. This is a connectivity result without electrical calculations.

**Physical interlock**:
A restriction shown on the drawings that physically prevents a switching action. The tool must prevent actions prohibited by the represented interlock.

**Unresolved interlock**:
An interlock whose conditions require the user's confirmation. It is flagged for review, and affected switching controls remain disabled until it is resolved.

**Starting configuration**:
The agreed device states and source availability from which a session starts and to which Reset network returns it.

**Contact position**:
A removable breaker's, contactor's or disconnector's Open or Closed contact state, recorded separately from its racking position. An unconfirmed contact position establishes neither state.

**Racking position**:
A removable breaker's, contactor's or disconnector's Rack in or Rack out state, recorded separately from its contact position. Source evidence or an explicit owner model selection must establish removability; an unconfirmed racking position is not Rack in. Owner answers50–51 select24 removable motor contactors; answers62/65 select three removable HPGR disconnectors. Each retains its device kind.

**Scenario**:
A saved set of device states and source availability together with a snapshot of its original network model and model version. It can be reopened or shared as a scenario file without requiring a separate historical model file.

**View-only scenario**:
A saved scenario opened using its original model snapshot when its network model version does not match the current model version. Navigation, inspection, and path tracing remain available; switching and source changes are disabled.

**Model acceptance**:
The user's confirmation of a model version after reviewing the whole-network diagram, asset connections, starting device states, source availability, interlock rules, and resolved discrepancies.

**Earth connectivity**:
Whether an asset is connected through the model to earth in the selected device states. It is tracked independently of source connectivity.

**Source-transfer claim**:
An explicit directed relationship between named model terminals, with its own evidence and knowledge status. A relationship-scoped claim establishes only that modeled source transfer; equipment metadata, reverse transfer and earth continuity remain separate claims. Earlier unscoped arcs retain their parent-equipment support requirement.

**Source-to-earth conflict**:
A modelled path connecting an enabled electrical source to earth. The tool highlights this condition as a conflict.

**Impact**:
A change in modelled connectivity caused by a switching action or a change in source availability. It is explained through affected assets and highlighted paths, including remaining alternate supply paths.

**Switching program**:
An ordered record of accepted apparatus actions and their required checks, prepared for either Isolation or Restoration and developed into the approved Word template. It starts from the current simulated device state. Developing the document ends recording and retains the resulting simulated state so a later Restoration program can start from there.

**Accepted apparatus action**:
A physical switching operation accepted by the network model and recorded in the active switching program. Source-availability changes are not apparatus actions and are not recorded in the program.

**Program undo**:
Removal of the most recently accepted apparatus action, its generated verification and test steps, and reversal of that action in the simulated device state, after the user confirms which action to remove.

**Switching verification sequence**:
For each accepted apparatus action, a check of its current state precedes the action and a check of its resulting state follows it. Before an earth switch is closed, the sequence checks that it is open, tests the meter, tests for dead, and tests the meter again; it then closes the earth switch and checks that it is closed.

For the four pre-close rows, all use the earth switch's location and Identify value. Verify Earth Open uses the earth switch's assigned `0V`, Type `EARTH SWITCH` and Action `VERIFY`. The two Test Meter rows use the associated circuit voltage, leave Type blank and use Action `TEST`. Test for Dead uses the associated circuit voltage, Type `PHASE VOLTAGE INDICATOR` and Action `TEST`. Instructions carry the check wording. The Earth Switch close and Verify Earth Closed rows use `0V`.

**Asset voltage assignment**:
The voltage value used for an asset in a switching program. It is assigned from the relevant source drawings and must match an available `VOLTAGE` choice in the master template. Earth switches are assigned `0V`. A drawing value that cannot be represented by an available choice requires the owner's direction.

Owner-confirmed assignments on 6 November 2026: TF413A AC inputs A and B use `690V`; VS50501/02/03 output contacts use `1.9kV`; MC001 uses `415V`; MC406A and MC410A use `415V`; the Sizer/MC420 group uses `6.9kV`. The owner directed adding `1.9kV` and `6.9kV` to the template dropdown; both are present in the updated master template.

**Asset program metadata**:
The assigned program location, voltage and relevant drawing references shown with an asset and used to fill program rows. This metadata does not change the accepted electrical model, its starting configuration or its layout. Location and voltage use the master's existing choices; drawing references omit revision text.

**Asset drawing reference**:
The source drawing or drawings relevant to an asset, shown with that asset. The displayed reference identifies the drawing without its revision and excludes unrelated references.

**Switching-program mode**:
While a switching program is active, model selection, scenario loading, reset and abstract source-availability changes are blocked. Source changes are not program steps. Only accepted apparatus actions are captured.
