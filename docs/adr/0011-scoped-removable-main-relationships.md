# ADR0011: Scoped removable main-contact relationships

Date:23October2026. Status: implemented locally for owner97's seven selected main pairs.

## Decision

Extend each optional removable mechanism declaration with `supportScope: 'relationship'` and the existing knowledge/evidence/review fields. Explicit scoped support establishes only the declared main pair, under the existing independent contact/racking state. It requires explicit knowledge and linked evidence. Parent metadata and other fixed/source/earth relationships retain their separate gates. Owner97 selects main-contact model behavior while equipment installation/rating metadata remains Unconfirmed; accepting the whole asset would overstate that selection.

Declarations without claim fields retain the original parent gate. Explicit unscoped claims require both their own and parent support. Unknown axes and unresolved claims retain conservative possibilities; Open or Rack out disconnects the main pair. Existing intrinsic and declared action prerequisites remain mandatory. Edge identity/order, old snapshots and format2 are unchanged; there is no scenario migration.

The schema validates nested evidence/review references atomically. One shared support predicate drives graph and diagram/inspector presentation. The inspector exposes the scoped main-pair evidence separately from equipment metadata. This parallels ADR0010's position claims, without changing historical removable declarations.

## Verification boundary

Focused SimulationSession checks cover all three removable kinds, parent/sibling separation, source and earth graphs, unknown axes, unresolved/unscoped claims, malformed references and historical scenario preservation. The site application is limited to the seven exact owner97 pairs. Owner98's wire paths and99's modeled ground destinations are separate claims. Whole-model acceptance and field bonding/resistance remain separate.
