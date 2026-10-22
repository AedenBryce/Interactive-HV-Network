import { wholeNetworkModel } from './whole-network';
import { withSupplementalEndpoints } from './endpoint-extensions';

// Each distributed construction is an immutable package. Keep the reviewed .4
// assembly intact while adding separately cited endpoint details, caption
// refinements and subsequent scoped owner decisions.
export const currentNetworkModel = withSupplementalEndpoints(wholeNetworkModel, 'construction-2026-10-22.9');

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

const tieDecisionId = 'WN-CRUSHING-TIE';
const tieQuestion = 'Next connection to confirm: is SW431-P-02 the current tie between Crushing 1 SW431 and Crushing 2 SW435, with CB SW435 FD02 at the SW431 end and CB SW431 FD02 at the SW435 end? Sources:11098-07110-EL-DR-2353.pdf rev5 p1 C-G/2-3,2354rev9p1 B-G/2-3. Please correct any detail or say unconfirmed.';
const tieDecision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'confirmed' };
currentNetworkModel.evidence!.push({
  id: tieDecisionId, status: 'owner-confirmed', confirmation: tieDecision,
  summary: `Owner answered exactly "confirmed" to: ${tieQuestion} This confirms the current SW431-P-02 cable and its named end connections only. The disputed drawing reference, device states, physical interlocks, source availability and whole-model acceptance remain unconfirmed.`,
  references: [
    { document: '11098-07110-EL-DR-2353.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'C-G / 2-3, SW435 feeder at SW431, CB SW435 FD02 and SW431-P-02' },
    { document: '11098-07110-EL-DR-2354.pdf', revision: '9 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-G / 2-3, SW431 feeder at SW435, CB SW431 FD02 and SW431-P-02' },
  ],
});
currentNetworkModel.reviews!.push({ id: tieDecisionId, status: 'resolved', question: tieQuestion, evidenceIds: [tieDecisionId], resolution: tieDecision });
const crushingTie = currentNetworkModel.connections.find(connection => connection.id === 'whole:join:crushing-tie')!;
crushingTie.knowledge = 'owner-confirmed';
crushingTie.evidenceIds!.push(tieDecisionId); crushingTie.reviewIds!.push(tieDecisionId);
const crushingTieReview = currentNetworkModel.reviews!.find(review => review.id === 'WN-JOIN-crushing-tie')!;
crushingTieReview.status = 'resolved'; crushingTieReview.resolution = tieDecision;
crushingTieReview.question = `${tieQuestion} Resolution is scoped to the current cable and named end connections; device states, physical interlocks and disputed document-reference identity remain separate reviews.`;
crushingTieReview.evidenceIds.push(tieDecisionId);
for (const id of ['C1-CROSS-TIE', 'C2-SW431-LINK', 'WN-JOIN-crushing-tie']) {
  currentNetworkModel.evidence!.find(record => record.id === id)!.summary = 'Drawing references for SW431-P-02 between CB SW435 FD02 at SW431 and CB SW431 FD02 at SW435. The current cable and named end connections are owner-confirmed by WN-CRUSHING-TIE. The disputed overview document reference, device states, complete physical interlocks and source availability remain unconfirmed; original drawing references are retained.';
}
const crushing1Review = currentNetworkModel.reviews!.find(review => review.id === 'C1-R03')!;
crushing1Review.question = 'The current SW431-P-02 tie and named end connections are owner-confirmed by WN-CRUSHING-TIE. Remaining unresolved: the overview reference 500CBC0002-13015-DR-EL-2353 and its document identity. Device states and complete physical interlocks remain separate open reviews.';
crushing1Review.evidenceIds.push(tieDecisionId);
const crushing2Review = currentNetworkModel.reviews!.find(review => review.id === 'C2-R11')!;
crushing2Review.question = 'The current SW431-P-02 tie and named end connections are owner-confirmed by WN-CRUSHING-TIE. Remaining unresolved: installed configuration beyond that scoped tie confirmation, normal states, fuse continuity, withdrawal/racking states and physical interlocks. All represented control baselines remain null and blocked.';
crushing2Review.evidenceIds.push(tieDecisionId);
