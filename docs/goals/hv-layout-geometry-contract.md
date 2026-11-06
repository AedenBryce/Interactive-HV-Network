# Authored geometry contract

This is the single layout interface for the replacement schematic. It separates electrical identity from drawing ownership and implements ADR 0012.

## Input

- The frozen model supplies exact asset IDs, terminal owners and connection ID/from/to triples. It supplies all state, evidence and electrical relationships. Geometry cannot alter these.
- A layout manifest assigns each asset to exactly one named group, including source, overhead-line and unframed assemblies. Membership is explicit and validated, never expanded through electrical descendants.
- Each group contains asset anchors, actual symbol/label footprints, terminal positions, bus spans and internal conductor paths in local coordinates. Boundary ports name existing model terminals; ports are not new electrical nodes.
- Each group has one global translation. Global placement stores top-down order, intended adjacency and reserved external cable corridors.
- Each external connection names its original connection ID and endpoints. Its path uses the transformed terminal coordinates and authored corridor waypoints. Shared bus taps must be represented explicitly with their terminal and owning bus.

## Composition and validation

Compose local assets, terminals, labels, busbars, internal routes and room frame through the same group translation. A move invalidates only the group's transform and incident external routes. Never translate another group's members or derive membership from a traversal tree.

Assert exact asset/connection coverage, unique terminal ownership, exact endpoint attachment (including explicit bus taps), orthogonal segments, and no unintended symbol/label/busbar/frame collisions. Separate real common-terminal junctions from accepted visual ring crossings. The collision bounds must come from the same geometry definitions used by the SVG renderer.

## Output and runtime seam

A versioned artifact contains model and topology fingerprints, explicit group membership/transforms, global asset/terminal positions, labels, bus spans, all connection paths, room frames, overall bounds and accepted crossing records. Reject stale or incomplete artifacts explicitly.

The new loader supplies the geometry shape consumed by NetworkDiagramCanvas. It replaces the continuous-network worker's legacy solver call for the whole-network model. The application loads the artifact directly; it must not calculate legacy geometry first to obtain metadata. Switching, search and camera changes consume fixed geometry and current session state separately. Other model views retain existing behavior.

The artifact generator is a development command. It composes authored local groups and external routes; it is not a new global layout search. Do not install a second production strategy or silently fall back to a stale/partial artifact.
