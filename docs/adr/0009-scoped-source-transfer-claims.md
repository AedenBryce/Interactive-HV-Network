# ADR0009: Scoped source-transfer claims

Date:23 October2026. Status: implemented in the generic session and scoped site policy in `construction-2026-10-23.4` (code2398a2c). Reverse/alternate-input and independent earth behavior remain Unconfirmed.

Owner answers25/28 select forward transformer source behavior while other equipment metadata, installed winding binding, reverse transfer and earth behavior remain Unconfirmed. The audited construction terminal roles have their own source references. A coarse provisional equipment claim must not be promoted merely to apply the selected source relationship.

## Decision

Extend fixed `sourceArcs` with optional `supportScope: 'relationship'`. An opted-in arc requires an explicit knowledge status and linked evidence. A supported/owner-confirmed scoped arc establishes only its exact `from`→`to` source transfer; the parent equipment claim remains independent. Unresolved/provisional arcs remain conservative-only. Each site arc must bind the exact audited model roles, the owner-selected simulation policy and its remaining physical limits.

Omitted scope preserves ADR0005's asset-and-arc gate, including unqualified synthetic arcs. Legacy pairs, positional/mechanism relationships and earth continuity retain their parent support requirement. No reverse relationship is created automatically. One shared support predicate drives graph evaluation and arrow/inspector presentation.

The inspector may therefore show a known modeled source path alongside provisional equipment metadata. It must distinguish those claims, and retain reverse/earth uncertainty separately. The scoped claim accepts neither installed identity nor unrelated ratings or physical behavior.

## Compatibility and checks

The opt-in is new model content, requiring a new immutable package. Earlier pair-only and arc-bearing snapshots keep their original content and evaluation rules. No scenario migration or new envelope format is required.

Seven tests at the approved `SimulationSession` seam cover scoped forward support through a provisional parent, unchanged metadata/earth uncertainty, explicit unresolved reverse, missing claim/evidence rejection, default parent gating and historical/same-version safeguards. Representative site behavior remains to be checked after role-guarded conversion.
