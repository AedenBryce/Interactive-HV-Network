# HV Network Understanding

This context describes the network represented by the interactive tool for understanding isolations and downstream impacts.

## Language

**Network model**:
The representation of the whole network built together from the supplied drawings and corrected through the user's review. The drawings and PDFs are not required after the model has been established as correct.

**LV bus endpoint**:
A final low-voltage bus at the boundary of the network model. Outgoing LV circuits are outside that boundary.

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
