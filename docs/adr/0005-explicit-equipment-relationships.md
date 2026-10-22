# ADR 0005: Explicit equipment relationships

Date: 22 October 2026. Status: implemented for GitHub #7.

## Decision

Represent fixed and position-dependent source transfer and earth continuity with separate terminal-pair arrays. Every pair is explicitly bidirectional. A missing pair does not create a connection. Generic `conductivePairs` and position `pairs` describe both channels for the existing fictional fixtures. Real transformer records require explicit source and earth arrays and cannot use generic cross-winding pairs.

Evaluate source reachability on the source graph and terminal earth reachability on the earth graph. Source-to-earth conflicts follow the source graph to a termination; an explicitly represented source-transfer relationship can reach an earthed downstream terminal without creating a galvanic earth-continuity relationship across that transfer.

The synthetic example has Service, Isolated and Earthed positions. Its three-winding transformer explicitly transfers source connectivity between HV and LV-A in both directions, with no transfer represented to LV-B and no earth-continuity pair between windings. These are fictional software rules. They establish no installed transformer behaviour.

Render declared internal pairs and the selected position directly. Run every position request through session validation and the represented interlocks. Unsupported or blocked requests preserve the session.

## Evidence boundary

Actual winding relationships, converter behaviour, neutral/MEN arrangements and backfeed require source evidence or owner confirmation. A neutral-to-earth connection must not be converted into a phase-bus earth connection. Unresolved installed relationships remain unconfirmed during model construction.
