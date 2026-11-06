# ADR 0002: Earth connections terminate traces

Date: 22 October 2026. Status: implemented for the synthetic earth fixture, GitHub #4.

## Decision

Represent each earth termination with an identity, label and an existing model terminal. A group identity can record that two terminations describe a common earth representation. The group identity never adds a conductive edge.

The same active graph and walk operation evaluate source and earth connectivity. Walks stop at earth terminals: an earth termination can be reached, but traversal cannot continue through it to another circuit. Independent source and earth results can coexist. A source reaching an earth termination produces a source-to-earth conflict and an explanatory path.

A conflict is an observable model condition. It does not create a switching restriction. Later physical-interlock rules determine which state changes the session rejects.

## Evidence boundary

The fixture connections, source and earth switch positions are fictional software examples. This decision implements the approved specification's earth semantics; it establishes no installed-network fact, operating permission or physical interlock.
