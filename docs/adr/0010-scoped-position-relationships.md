# ADR0010: Scoped position relationships

Date:23October2026. Status: implemented locally for the owner82 HPGR outlet selection.

## Decision

Extend a discrete position with optional `supportScope: 'relationship'` and the existing knowledge/evidence/review claim fields. A scoped position requires explicit knowledge and linked evidence. This establishes only its exact selected shared/source/earth terminal pairs. Other parent-equipment metadata remains separately supported or Unconfirmed. Owner82 selects teaching contact paths while installed outlet metadata remains unresolved; accepting the entire parent to enable those paths would overstate that decision.

Positions without claim fields retain the original parent-equipment gate. An explicit unscoped position knowledge claim requires both position and parent support. Null position retains only common known pairs shared by every supported possible position in the definite graph; the conservative graph retains candidate pairs. Fixed relationships and removable mechanisms keep their existing gates. Original relationship edge identities/order and old scenario JSON content remain unchanged.

The existing session validates/evaluates the new optional fields, and the inspector shows the exact active position pairs and scoped evidence separately from equipment metadata. Interlock reviews remain mandatory and independent. This adds no automatic operating permission, scenario migration or envelope format.

## Application and verification

Only the two explicitly selected HPGR motor-side outlets use scoped positions in this increment. Owner82 separately selects their local rules, Service baselines and bounded Fortress-key deferral. Source transfer through converters follows the independent owner80 policy; converter AC/DC/output earth groups remain separate.

Focused tests use the approved SimulationSession seam: selected paths, provisional metadata, null/unknown positions, malformed claims, original snapshot viewing, and the selected site outlet sequence. Whole-model acceptance remains separate.
