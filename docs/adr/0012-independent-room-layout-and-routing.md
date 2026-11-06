# ADR 0012: Independent room layout and connection routing

## Status

Accepted for the whole-network diagram rewrite.

## Context

The current production layout starts with a topology-derived tree and then applies long sequences of subtree translations and asset-specific coordinate corrections in `continuous-network.ts`. A correction can move descendants, labels, taps, room frames, or cached assembly geometry. Later corrections therefore have to compensate for earlier moves. This makes the result difficult to reason about and causes one local adjustment to disturb unrelated areas.

The whole-network view must preserve the complete model graph, including shared buses, branches, and ring connections. A simple tree layout would lose or obscure those relationships. The current experimental layout candidates are not accepted for production until complete routing and rendered collision checks pass.

## Decision

Replace sequential coordinate nudges with a staged, deterministic layout pipeline whose inputs and outputs are explicit:

1. **Measure modules.** Build each switchroom or electrical subassembly in local coordinates. Measure its rendered symbols, labels, internal conductors, and frame. A module's local geometry does not depend on another module's position.
2. **Place modules.** Place the measured modules in top-down supply order using confirmed room-parent relationships, stable sibling ordering, and explicit adjacent pairs for confirmed rings. Preserve unconfirmed relationships as unconfirmed; do not infer an electrical edge to improve the drawing.
3. **Reserve ports and corridors.** Allocate distinct external connection ports and orthogonal routing lanes while modules are placed. Shared buses and modeled junctions remain single shared objects.
4. **Route the full graph.** Route every model connection between its exact terminals, avoiding unrelated symbols, labels, and frames. Cross-connections use reserved corridors and must remain visually distinguishable from junctions.
5. **Validate before publish.** Reject a candidate with missing assets or connections, wrong endpoints, symbol/label collisions, unrelated frame cuts, shared line segments, or ambiguous contacts. Do not fill failed routes with diagnostic fallback geometry in a candidate presented as complete.

After a room layout is accepted, its module coordinates are stable. Moving or resizing one module updates that module and recomputes only its incident routes; other modules keep their coordinates. A full reflow is a separate explicit layout operation and must be validated across the complete graph before its result replaces the accepted layout.

## Consequences

- No asset-specific `moveBranch` or `translateBranch` correction is part of the target production pipeline.
- Electrical model data and presentation geometry remain separate. Layout changes cannot create, remove, or alter network connections.
- Shared electrical nodes are represented once; independent branches cannot be moved by recursively translating a shared descendant.
- The complete candidate is measured and validated as one graph. Local visual improvement is insufficient if it causes a whole-network regression.
- Existing experimental candidates remain non-production until they pass the complete geometry and rendered review gates.

## Validation evidence required for production adoption

- Exact asset ID and connection ID/terminal preservation against the network model.
- Deterministic module positions for identical model and layout inputs.
- No module-frame or equipment/label overlap.
- No route through unrelated equipment, labels, or frames; all endpoints attach to their modeled terminals.
- Shared route lengths and endpoint-on-interior contacts are either proven modeled junctions or rejected.
- Running-app visual review at overview and detailed zoom, including long feeders and ring connections.
