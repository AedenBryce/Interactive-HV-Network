# ADR 0001: Local application and simulation session

Date: 22 October 2026. Status: selected for the first implementation slice, GitHub #2.

## Context

The approved specification calls for a local browser application, source connectivity without electrical calculations, a model independent of diagram coordinates and one simulation-session testing boundary. No existing application or framework was present.

## Decision

Use React with Vite and TypeScript. Use Zod for runtime validation of unknown model input, and Vitest for behavioural tests through `SimulationSession`. Keep all simulation state and connectivity evaluation behind that interface. React retains only the latest returned snapshot and UI selection; it does not calculate network connectivity.

The model explicitly identifies terminals, external connections, equipment relationships, supported positions, source attachments and a starting configuration. Diagram coordinates live in a separate presentation module. Changing coordinates cannot create an electrical connection.

Validate an entire model before replacing the current session. Reject missing terminal references, repeated identities, unsupported starting positions and incomplete source availability. Return snapshots as detached data, preventing callers from modifying session state through a returned object.

The first fixture is entirely synthetic. Its two-terminal transformer relationship is explicitly defined for this fixture and does not establish how any real transformer, additional winding or backfeed arrangement behaves.

The dependency lockfile is committed. Node 24 and pnpm 11 are the initial development environment. Development and preview servers bind to loopback. No backend, PDF importer or network editor is introduced.

## Consequences

Software behaviour can be developed and tested before real topology is accepted. Later tickets must extend the same boundary for alternate routes, earth connectivity, uncertainty, interlocks, history and scenario versions. They must retain independent source/earth results and drawing evidence; passing synthetic tests is not model acceptance.
