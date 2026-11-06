# Owner contact and path decisions90–96

Date:23 October2026. These are scoped V1 selections; installed equipment metadata, actual positions, ratings, external coverage and whole-model acceptance remain separate.

## Answer90 — TF406B route

Exact answer: **“It is as per the first statement you said”**. The question's first statement explicitly named RM406 CB02/SW03 → TF406B → MC406A. Confirm that existing route without adding a parallel SW02 feed. Resolve CV-R04 for feeding identity; preserve CV-R05 rating/vendor uncertainty. Source refs: `CB19OP001B-04057-DR-EL-0002.pdf`,rev4,p1 B–E/6–9; `-0001.pdf`,rev6,p1 B–D/9–11; `-0003.pdf`,rev2,p1 A–B/5–6 and C–D incomer/bar. The inherited primary→secondary policy remains a separate relationship claim.

## Answer91 — MC451B section

Exact answer: **“yes”** to continuously connected MC451/MC451B bus sections with no intervening switch or separate incoming supply between them. Retain the direct phase-bar bridge and identify MC451B as a section of the same LV bus. No extra source, control or outgoing LV circuit is added. TL-R04 remains open for rating and document-reference discrepancies. Source refs: `11098-07110-EL-DR-2658.pdf`,rev12A,p1 C–E/4–10; `-2672.pdf`,rev7,p1 row D; `-2673.pdf`,rev6,p1 B–C/4–5.

## Answer92 — six LV AC endpoints

Exact answer: **“yes”** to ending VS4061,VS4101 and RM413A at their two separate AC input points after the input switches. Exclude these three LV converter/DC/motor expansions; the five separately included MV drive branches retain their scope. No common AC bus is created. Scope alone does not accept electrical contact/wire behavior; answers95/96 separately select those relationships. Source refs: `CB19OP001B-04057-DR-EL-0001.pdf`,rev6,p1 D–F/1–3 and9–11; `CB17OP023A-04057-DR-EL-0004.pdf`,rev5,p1 D–E/4–8.

## Answer93 —16 RMU selector matrices

Exact answer: **“approved”** to the complete V1 matrix for SW01–SW04 at RM406,RM410,RM417 andRM419: Service joins the two main terminals, earth disconnected; Isolated no pair; Earthed external cable/transformer side to earth, bus side disconnected. For incomers the external side is incoming cable; for ring switches it is the onward cable; for outgoing feeders it is the transformer/outgoing side after the CB. Existing transitions, prerequisites and baselines remain unchanged.

This corrects the earlier candidate earth side at six incoming/ring selectors: RM406 SW01, RM410 SW01, RM417 SW01/SW02 and RM419 SW01/SW02. The remaining ten retain their original depicted outside leg. Relationship-scoped position claims preserve provisional equipment metadata. Existing earth-termination knowledge is not promoted by this contact-matrix decision; a selected contact reaching a provisional termination remains an uncertain ground connection. Sources: `CB19OP001B-04057-DR-EL-0002.pdf`,rev4; `-0004.pdf`,rev6; `CB16OP038A-02006-DR-EL-0044.pdf`,rev2; `CB19OP001C-01068-DR-EL-0001.pdf`,rev4, eachp1 RMU region.

## Answer94 — RM413A lower selector

Exact answer: **“aproved”** to Service joining Q1 side to TF413A side, Isolated no pair, Earthed only TF413A side to own earth terminal with Q1 disconnected. Preserve the selected Service baseline and prior local action prerequisites. Parent metadata and earth-termination support remain separate. Sources: `CB17OP023A-04057-DR-EL-0004.pdf`,rev5,p1 B–C/4–6; `CB-10016-DR-EL-0011.pdf`,rev0,p1 C–D/10–12.

## Answers95/96 —24 binary contacts and12 LV AC wires

Both exact answers: **“approved”**. The [frozen proposal](remaining-contact-path-proposal.json) records all exact IDs/pairs/positions and source refs from immutable `.8`; [the readable proposal](remaining-contact-path-proposal.md) defines the scope presented to the owner.

95 selects Open = no pair and Closed = each listed owned pair for modeled source and earth continuity, on exactly24 controls. It preserves their parent knowledge, baselines and local action rules. 96 selects the12 matching transformer-winding→input-switch→AC-endpoint wire relationships for both continuity graphs. No common AC bus, winding-to-winding, converter/DC/motor or transformer phase-earth link is selected. Remaining upstream wire claims are not accepted by95/96; separate proposals97–99 address other represented claims. No overall model acceptance is inferred.
