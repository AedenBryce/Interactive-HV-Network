# ADR 0005: Explicit equipment relationships

Date: 22 October 2026. Status: implemented for GitHub #7.

## Decision

Represent fixed and position-dependent source transfer and earth continuity with separate terminal-pair arrays. Every pair is explicitly bidirectional. A missing pair does not create a connection. Generic `conductivePairs` and position `pairs` describe both channels for the existing fictional fixtures. Real transformer records require explicit source and earth arrays and cannot use generic cross-winding pairs.

Evaluate source reachability on the source graph and terminal earth reachability on the earth graph. Source-to-earth conflicts follow the source graph to a termination; an explicitly represented source-transfer relationship can reach an earthed downstream terminal without creating a galvanic earth-continuity relationship across that transfer.

The synthetic example has Service, Isolated and Earthed positions. Its three-winding transformer explicitly transfers source connectivity between HV and LV-A in both directions, with no transfer represented to LV-B and no earth-continuity pair between windings. These are fictional software rules. They establish no installed transformer behaviour.

Render declared internal pairs and the selected position directly. Run every position request through session validation and the represented interlocks. Unsupported or blocked requests preserve the session.

## Evidence boundary

Actual winding relationships, converter behaviour, neutral/MEN arrangements and backfeed require source evidence or owner confirmation. A neutral-to-earth connection must not be converted into a phase-bus earth connection. Unresolved installed relationships remain unconfirmed during model construction.

## Extension —23 October2026: directed source relationships

Owner answers25/28 select normal primary→secondary behavior and require an externally supplied secondary to remain visible. Extend the pair-only representation with optional claim-bearing `sourceArcs` on fixed assets. Each arc names distinct owned `from`/`to` terminals and preserves direction in its edge identity. Existing `sourcePairs` retain their bidirectional semantics; missing reverse data creates no automatic reverse arc. A separately evidenced unresolved reverse candidate may appear only in the conservative graph. Arc support and asset support are both required for a definite source relationship. Source arcs never enter the earth-continuity graph.

One private source-query interface shares reachability, witness and exact route queries across definite/conservative connectivity, boundary and source-to-earth evaluations. Preserve the undirected block-cut route fast path. For mixed graphs, localize directional simple-path queries to their underlying biconnected blocks and cache ordered entry/exit results. Acyclic directional blocks use a linear route-union query; cyclic asymmetric blocks use exact visited-terminal search. No result is silently truncated. Worst-case search is exponential within such a cyclic block, so representative site behavior must be checked before distributing a directed site conversion. Reachability intersection alone would incorrectly include dangling return cycles in impact explanations.

This generic software extension does not select any installed winding relationships, reverse-transfer facts or site earth policy. A site conversion requires explicit terminal-role mapping and a new immutable package under ADR0007. Historical fixtures and saved packages retain their original pair semantics.
