# Interactive HV Network — confirmed project specification

Confirmed by the project owner in chat on 22 October 2026. Project vocabulary is defined in [CONTEXT.md](../CONTEXT.md).

The implementation specification is published as [GitHub issue #1](https://github.com/AedenBryce/Interactive-HV-Network/issues/1), with a [local copy](specs/interactive-hv-network.md). The testing boundary was approved by the owner before publication. This document retains the confirmed product requirements.

## Purpose and scope

Build an interactive tool for understanding the network, isolations, and downstream impacts of simulated switching. Developing an operational isolation tool is outside the current project scope.

V1 covers the whole network through its final LV bus endpoints. Outgoing LV circuits are excluded. The initial application is local; internet is available. A future GPT Site is a later delivery direction, with its implementation still unconfirmed.

## Network construction and review

Build the model together with the project owner from supplied PDF drawings and schematics. The application does not need to import PDFs itself, and the completed model must operate without requiring the PDFs.

Drawing discrepancies may be represented provisionally using best guesses during construction. Label these interpretations as unconfirmed and maintain the unresolved questions for the owner's step-by-step review. Do not present a provisional interpretation as a confirmed network fact.

There is no user-facing network editor in V1. Model corrections are developed together outside the switching interface. GitHub Issues is the project issue tracker: [AedenBryce/Interactive-HV-Network](https://github.com/AedenBryce/Interactive-HV-Network).

## Connectivity simulation

- Model connectivity to every enabled electrical source, including alternate supply paths.
- Show whether an asset is connected to a source, disconnected from all modelled sources, or unconfirmed.
- Track connectivity to earth independently of source connectivity.
- Highlight a modelled path connecting an enabled source to earth as a source-to-earth conflict.
- Perform no voltage, current, load, or fault-level calculations.

## Switching and interlocks

Users select a controllable asset and change its state. The supported devices, states, and connections must be established from the drawings and the owner's review.

Prevent switching actions prohibited by physical interlocks shown on the drawings. Where interlock conditions are unclear, flag them for confirmation and disable the affected switching controls until resolved. No actual interlock conditions have yet been established.

## Interface and impact explanations

- Provide a connected single-line diagram with pan and zoom, a network overview, and navigation to detailed substation views.
- Selecting an asset exposes its identity, state controls, and affected connections.
- After a change, show affected assets and highlight changed paths.
- Allow users to trace an asset's connectivity to available sources and see remaining alternate supply paths.
- Provide source availability controls, session action history, and undo.
- Begin sessions with the agreed starting configuration. Reset network restores that configuration.

## Saved scenarios and model versions

A scenario file contains device states, source availability, the model version, and a complete snapshot of its original network model. Users can save, reopen, and share these files.

Compare a scenario's model version with the current model version when loading it. If they match, it can be used for simulation. If they differ, open the scenario using its original snapshot in view-only mode. Navigation, inspection, and path tracing remain available; switching and source changes are disabled.

## Model acceptance

Before accepting a model version and its starting configuration, the project owner reviews:

- The whole-network diagram and asset connections.
- Starting device states and source availability.
- Interlock rules.
- Resolved drawing discrepancies.

Record the owner's confirmation against the accepted model version.

## Information still unconfirmed

The source folder is `drawings/Asset Drawing Repo/`. Its initial inventory contains 141 single-page PDFs; see [the drawing review](../drawing-review/README.md). Document review is underway. Actual topology, asset identities, device arrangements, source locations, interlock conditions, starting states, and drawing discrepancies remain subject to source review and owner confirmation.

Continue reviewing the supplied drawings and building the network inventory and connections. Network-specific questions will be raised from that evidence.
