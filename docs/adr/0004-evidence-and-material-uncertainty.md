# ADR 0004: Evidence and material uncertainty

Date: 22 October 2026. Status: implemented for GitHub #6.

## Decision

Keep supported facts, provisional interpretations, unresolved questions and owner-confirmed decisions as distinct metadata. Claims link to evidence and review identities. References retain the document, revision, page and clause when supplied. A resolved review requires a recorded decision; owner-confirmed evidence requires an explicit confirmation. Provisional evidence cannot support a claim labelled supported.

An omitted knowledge status in a real model is unconfirmed. Existing explicitly synthetic fixtures define fictional relationships and can omit that status. Physical-interlock review remains a separate requirement; missing review blocks affected controls even in a synthetic model.

Use `null` for an unconfirmed starting device position or source availability. Never turn null into an open device or unavailable source. A scenario action can select a supported position or explicit source availability through the session interface; the underlying evidence and baseline record remain unchanged.

Evaluate a definite graph and a conservative graph containing unconfirmed relationships. With an unknown device position, retain relationships shared by every supported position in the definite graph and include the union in the conservative graph. Preserve established source paths independently of additional candidate routes. Source and earth uncertainty are separate results. Earth remains a sink in both evaluations.

The conservative graph is an upper bound. Candidate paths can combine unresolved relationships or positions; their physical validity remains unconfirmed. They are displayed as review candidates. Definite paths use only supported model relationships and selected or invariant states.

Represent off-page coverage explicitly for source and earth information. Missing coverage can propagate an unconfirmed result through represented possible connections without inventing an enabled external source or declaring the boundary disconnected.

Connection rendering consumes session results. A known source path remains identifiable while amber marks show other unresolved information. Asset and connection inspectors expose linked evidence and review questions. PDFs are not a runtime dependency.

## Acceptance boundary

These software results describe the supplied model. They do not accept the installed arrangement, starting configuration or interlocks. Whole-network owner acceptance remains a separate versioned gate.
