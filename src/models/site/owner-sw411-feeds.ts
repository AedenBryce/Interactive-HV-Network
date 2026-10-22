import type { NetworkModel } from '../../session/model';

const groups = [
  { id: 'WN-SW411-FEEDS-01-02-04', question: 'Please confirm or correct these current SW411 feeding routes: tier01 → SW454 via SW454-P-01; tier02 → SW451 via SW451-P-01; tier04 → SW435 via SW435-P-01. This confirms the cable routes only, not switch positions/interlocks.', routes: [['sw454', '01'], ['sw451', '02'], ['sw435', '04']] },
  { id: 'WN-SW411-FEEDS-13-14-15', question: 'Please confirm or correct these current SW411 feeding routes: tier13 → SW431 via SW431-P-01; tier14 → SW426 via SW426-P-01; tier15 → SW421 via SW421-P-01. This confirms the cable routes only.', routes: [['sw431', '13'], ['sw426', '14'], ['sw421', '15']] },
] as const;

export function withOwnerSw411Feeds(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === groups[0].id)) throw new Error('SW411 feed confirmations already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  for (const group of groups) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'all confirmed' };
    const references: NonNullable<NetworkModel['evidence']>[number]['references'] = [{ document: 'Project owner conversation', revision: '2026-10-23', clause: `Exact question: ${group.question} Exact answer: all confirmed` }];
    for (const [destination, tier] of group.routes) {
      const edge = model.connections.find(connection => connection.id === `whole:join:${destination}`);
      const original = model.evidence?.find(record => record.id === `WN-JOIN-${destination}`);
      const review = model.reviews?.find(record => record.id === `WN-JOIN-${destination}`);
      if (!edge || edge.from !== `sw411:tier-${tier}:interface:port` || edge.to !== `${destination}:interface:sw411:port` || !original?.references.length || !review) throw new Error(`SW411 feed review required: ${destination} no longer has the verified endpoints and original drawing provenance. No connection was added or remapped.`);
      references.push(...structuredClone(original.references));
      edge.knowledge = 'owner-confirmed'; edge.evidenceIds = [...(edge.evidenceIds ?? []), group.id]; edge.reviewIds = [...(edge.reviewIds ?? []), group.id];
      review.status = 'resolved'; review.resolution = confirmation; review.evidenceIds.push(group.id);
      review.question = `Owner confirms the current SW411 tier${tier} to ${destination.toUpperCase()} cable route and tag ${destination.toUpperCase()}-P-01. Resolution is confined to these named endpoints and cable tag; complete physical hardware identity, actual states, source availability, winding/earth policies, interlocks and whole-model acceptance remain separate.`;
    }
    (model.evidence ??= []).push({ id: group.id, status: 'owner-confirmed', confirmation, references, summary: `Owner answered exactly "all confirmed" to: ${group.question} Confirmation is scoped to the six individually named routes across the two questions, with this record covering only the routes in its own question. Endpoint hardware, transformer source/backfeed/earth relationships, actual positions, availability and physical-interlock permission are not accepted.` });
    (model.reviews ??= []).push({ id: group.id, status: 'resolved', evidenceIds: [group.id], question: group.question, resolution: confirmation });
  }
  const deferralId = 'WN-CROSS-STATION-KEY-DEFERRAL';
  const answer = 'there are key interlocks. Ignore these for now i will add them to the tool at a later date';
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Question24 concerned actual installed physical interlocks between SW411 IN03/IN04 and upstream TF11/TF12 station feeder assemblies, exact device tags, required positions and key-release conditions. Exact answer: ${answer}` };
  (model.evidence ??= []).push({ id: deferralId, status: 'owner-confirmed', confirmation, references: [ownerReference, { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'Note3: source does not establish the complete installed cross-station key conditions.' }], summary: 'Owner confirms key interlocks exist between SW411 IN03/IN04 and upstream TF11/TF12 station feeder assemblies and explicitly defers modelling THESE cross-station key conditions to a later increment. This scoped model-boundary decision does not assert that installed interlocks are absent, defer other network key systems, accept unrestricted operation or authorise actual switching. Exact conditions, positions and key-release rules remain unconfirmed; no key rule or release sequence is invented. The eight annotated model CB/ES identities identify the assemblies in the question, not a confirmed complete physical key schedule. Other unresolved mechanisms/positions/interlocks and all starting states/availability remain unchanged.' });
  (model.reviews ??= []).push({ id: deferralId, status: 'resolved', question: 'Scope decision only: known cross-station key interlocks between SW411 IN03/IN04 and TF11/TF12 station feeder assemblies are deferred from the current educational model. Their installed conditions remain unconfirmed; other keys, unresolved mechanisms/positions/interlocks and actual switching permission are not accepted by this resolution.', evidenceIds: [deferralId], resolution: confirmation });
  for (const assetId of ['sw411:in-03:cb', 'sw411:in-03:es', 'sw411:in-04:cb', 'sw411:in-04:es', 'station:sb01:f4:cb', 'station:sb01:f4:es', 'station:sb02:f1:cb', 'station:sb02:f1:es']) {
    const review = model.interlocks?.reviews.find(review => review.assetId === assetId);
    if (!review) throw new Error(`Cross-station key deferral requires the existing separate interlock review for ${assetId}. No review status was invented.`);
    review.note = `Owner confirms cross-station key interlocks exist for the SW411 IN03/IN04 and upstream TF11/TF12 feeder assemblies. Modelling THESE cross-station key conditions only is explicitly deferred; this does not confirm absent installed interlocks or switching permission. Other unresolved physical-position/mechanism/interlock review remains: ${review.note}`;
    review.evidence.push(ownerReference);
  }
  return model;
}
