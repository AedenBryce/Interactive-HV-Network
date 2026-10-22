import { wholeNetworkModel } from './whole-network';
import { withSupplementalEndpoints } from './endpoint-extensions';

// Each distributed construction is an immutable package. Keep the reviewed .4
// assembly intact while adding separately cited endpoint details, caption
// refinements and the subsequent scoped tier16 cable-tag owner decision.
export const currentNetworkModel = withSupplementalEndpoints(wholeNetworkModel, 'construction-2026-10-22.8');

for (const view of currentNetworkModel.presentation!.views) {
  if (view.id === 'hopper-10/rmu') view.label = 'Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed';
  if (view.id === 'hopper-10/transformers') view.label = 'Hopper 10 · Selected 33 kV inputs / MC420A gap';
  if (view.id === 'supplemental/sw455-lv') view.layout.labelOffsets!['sw454:interface:sw455'] = [55, 0];
  if (view.id === 'supplemental/hopper3-lv') {
    view.layout.labelOffsets!['wh:h3:mc416a:interface'] = [170, 10];
    view.layout.labelOffsets!['wh:h3:tf416a'] = [-140, 65];
  }
  if (view.id === 'supplemental/mc454-lv') view.layout.labelOffsets!['sw454:interface:mc454-mc455'] = [170, 10];
}

const cableDecisionId = 'WN-SW411-TIER16-CABLE';
const cableDecision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'your assumption is correct tht it is RM721-P-01' };
currentNetworkModel.evidence!.push({
  id: cableDecisionId, status: 'owner-confirmed', confirmation: cableDecision,
  summary: 'Owner confirms RM721-P-01 as the tier16 cable tag in response to the explicit drawing-discrepancy question. This is a scoped cable-tag decision. It does not record physical-nameplate inspection, whole-route acceptance, actual positions, source availability or interlock permission. Original SW454-P-01 drawing labels remain traceable.',
  references: [
    { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'D-G / 11-12, tier16 RM721 destination with printed SW454-P-01 cable label' },
    { document: '11098-07110-EL-DR-2256.pdf', revision: '3 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-D / 6-7, reciprocal RM721 incoming from SW411 and RM721-P-01 cable tag' },
  ],
});
currentNetworkModel.reviews!.push({ id: cableDecisionId, status: 'resolved', question: 'Which cable tag should the model use at SW411 tier16 / RM721? Scope is the cable tag only.', evidenceIds: [cableDecisionId], resolution: cableDecision });
for (const id of ['sw411:tier-16:interface', 'services:interface:sw411']) {
  const asset = currentNetworkModel.assets.find(candidate => candidate.id === id)!;
  asset.aliases = [...new Set([...(asset.aliases ?? []), 'RM721-P-01'])];
  asset.evidenceIds!.push(cableDecisionId); asset.reviewIds!.push(cableDecisionId);
  asset.label = id.startsWith('services:') ? 'SW411 tier16 / RM721 · RM721-P-01 · tag owner-confirmed' : 'RM721 interface · RM721-P-01 · tag owner-confirmed';
}
const rm721Join = currentNetworkModel.connections.find(connection => connection.id === 'whole:join:rm721')!;
rm721Join.evidenceIds!.push(cableDecisionId); rm721Join.reviewIds!.push(cableDecisionId);
for (const id of ['R002', 'SV-Q01', 'WN-JOIN-rm721']) {
  const review = currentNetworkModel.reviews!.find(candidate => candidate.id === id)!;
  review.question = 'Tier16 CB/ES model tags are owner-corrected, and cable tag RM721-P-01 is owner-confirmed. Remaining unresolved: physical identity verification and whole current-route acceptance beyond reciprocal drawing references. No nameplate inspection, starting positions, source availability or complete interlock permission is recorded by these tag decisions.';
  review.evidenceIds.push(cableDecisionId);
}
currentNetworkModel.evidence!.find(record => record.id === 'WN-JOIN-rm721')!.summary = 'Reciprocal SW411 tier16 / RM721 drawing route remains provisional pending whole-route acceptance. Owner decisions confirm CB RM721 FD01, ES RM721 FD 01 and cable tag RM721-P-01. Original SW454 labels remain drawing evidence; actual positions, availability, complete physical interlocks and nameplate inspection remain unconfirmed.';
