# ADR 0003: Record interlock review separately from rules

Date: 22 October 2026. Status: implemented for GitHub #5.

## Context

The approved specification requires physical restrictions to be enforced by the session and unresolved interlocks to disable affected controls. An empty rule list does not establish that interlocks have been reviewed.

## Decision

Each switchable asset has a separate review status: confirmed no represented interlocks, confirmed rules, or unresolved. An absent review remains unconfirmed and disables switching. Confirmed reviews and physical rules for a real model require evidence references. Synthetic fixtures explicitly declare their fictional review outcomes.

Rules target a supported device position and contain explicit device-position or source-availability predicates. AND and OR combine those predicates. Unknown prerequisite states remain unconfirmed: a required unknown blocks switching; a known false AND branch or a known true OR branch can determine the result without guessing the unknown value.

The session calculates switching options and rejection reasons. The UI uses those options to disable controls and show the conditions and evidence. Direct session requests pass through the same check before any state or impact result changes. A rejected request is not an accepted action.

The interlock fixture defines two fictional closing restrictions: ES-01 requires CB-01 open, and CB-01 requires ES-01 open. ES-02 deliberately has unresolved conditions. No key identifiers or installed switching sequence is inferred.

## Consequences

Models without interlock review remain inspectable, but affected device controls are disabled. Updating the existing synthetic fixtures to explicitly confirm fictional absence of restrictions changes their model versions. The source-to-earth conflict indication remains a connectivity result and does not create an additional interlock rule.
