import { wholeNetworkModel } from './whole-network';
import { withSupplementalEndpoints } from './endpoint-extensions';
import { withWesternDetails } from './western-extensions';
import { withHopper10Lv } from './hopper10-lv-extension';
import { withCv006Lv } from './cv006-lv-extension';
import { withStationBatteryLimits } from './station-battery-limits';
import { withMc413Detail } from './mc413-detail';
import { withOwnerScopeConnections } from './owner-scope-connections';
import { withOwnerFollowups } from './owner-followups';

// Each distributed construction is immutable. Extensions operate on clones;
// historical area packages and the reviewed .4 assembly retain their content.
export const currentNetworkModel = buildCurrentNetworkModel();

function buildCurrentNetworkModel() {
  const version = 'construction-2026-10-22.16';
  const model = withSupplementalEndpoints(wholeNetworkModel, version);

  for (const view of model.presentation!.views) {
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
  model.evidence!.push({
    id: cableDecisionId, status: 'owner-confirmed', confirmation: cableDecision,
    summary: 'Owner confirms RM721-P-01 as the tier16 cable tag in response to the explicit drawing-discrepancy question. This is a scoped cable-tag decision. It does not record physical-nameplate inspection, whole-route acceptance, actual positions, source availability or interlock permission. Original SW454-P-01 drawing labels remain traceable.',
    references: [
      { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'D-G / 11-12, tier16 RM721 destination with printed SW454-P-01 cable label' },
      { document: '11098-07110-EL-DR-2256.pdf', revision: '3 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-D / 6-7, reciprocal RM721 incoming from SW411 and RM721-P-01 cable tag' },
    ],
  });
  model.reviews!.push({ id: cableDecisionId, status: 'resolved', question: 'Which cable tag should the model use at SW411 tier16 / RM721? Scope is the cable tag only.', evidenceIds: [cableDecisionId], resolution: cableDecision });
  for (const id of ['sw411:tier-16:interface', 'services:interface:sw411']) {
    const asset = model.assets.find(candidate => candidate.id === id)!;
    asset.aliases = [...new Set([...(asset.aliases ?? []), 'RM721-P-01'])];
    asset.evidenceIds!.push(cableDecisionId); asset.reviewIds!.push(cableDecisionId);
    asset.label = id.startsWith('services:') ? 'SW411 tier16 / RM721 · RM721-P-01 · tag owner-confirmed' : 'RM721 interface · RM721-P-01 · tag owner-confirmed';
  }
  const rm721Join = model.connections.find(connection => connection.id === 'whole:join:rm721')!;
  rm721Join.evidenceIds!.push(cableDecisionId); rm721Join.reviewIds!.push(cableDecisionId);
  for (const id of ['R002', 'SV-Q01', 'WN-JOIN-rm721']) {
    const review = model.reviews!.find(candidate => candidate.id === id)!;
    review.question = 'Tier16 CB/ES model tags are owner-corrected, and cable tag RM721-P-01 is owner-confirmed. Remaining unresolved: physical identity verification and whole current-route acceptance beyond reciprocal drawing references. No nameplate inspection, starting positions, source availability or complete interlock permission is recorded by these tag decisions.';
    review.evidenceIds.push(cableDecisionId);
  }
  model.evidence!.find(record => record.id === 'WN-JOIN-rm721')!.summary = 'Reciprocal SW411 tier16 / RM721 drawing route remains provisional pending whole-route acceptance. Owner decisions confirm CB RM721 FD01, ES RM721 FD 01 and cable tag RM721-P-01. Original SW454 labels remain drawing evidence; actual positions, availability, complete physical interlocks and nameplate inspection remain unconfirmed.';

  const tieDecisionId = 'WN-CRUSHING-TIE';
  const tieQuestion = 'Next connection to confirm: is SW431-P-02 the current tie between Crushing 1 SW431 and Crushing 2 SW435, with CB SW435 FD02 at the SW431 end and CB SW431 FD02 at the SW435 end? Sources:11098-07110-EL-DR-2353.pdf rev5 p1 C-G/2-3,2354rev9p1 B-G/2-3. Please correct any detail or say unconfirmed.';
  const tieDecision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'confirmed' };
  model.evidence!.push({
    id: tieDecisionId, status: 'owner-confirmed', confirmation: tieDecision,
    summary: `Owner answered exactly "confirmed" to: ${tieQuestion} This confirms the current SW431-P-02 cable and its named end connections only. The disputed drawing reference, device states, physical interlocks, source availability and whole-model acceptance remain unconfirmed.`,
    references: [
      { document: '11098-07110-EL-DR-2353.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'C-G / 2-3, SW435 feeder at SW431, CB SW435 FD02 and SW431-P-02' },
      { document: '11098-07110-EL-DR-2354.pdf', revision: '9 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-G / 2-3, SW431 feeder at SW435, CB SW431 FD02 and SW431-P-02' },
    ],
  });
  model.reviews!.push({ id: tieDecisionId, status: 'resolved', question: tieQuestion, evidenceIds: [tieDecisionId], resolution: tieDecision });
  const crushingTie = model.connections.find(connection => connection.id === 'whole:join:crushing-tie')!;
  crushingTie.knowledge = 'owner-confirmed';
  crushingTie.evidenceIds!.push(tieDecisionId); crushingTie.reviewIds!.push(tieDecisionId);
  const crushingTieReview = model.reviews!.find(review => review.id === 'WN-JOIN-crushing-tie')!;
  crushingTieReview.status = 'resolved'; crushingTieReview.resolution = tieDecision;
  crushingTieReview.question = `${tieQuestion} Resolution is scoped to the current cable and named end connections; device states, physical interlocks and disputed document-reference identity remain separate reviews.`;
  crushingTieReview.evidenceIds.push(tieDecisionId);
  for (const id of ['C1-CROSS-TIE', 'C2-SW431-LINK', 'WN-JOIN-crushing-tie']) {
    model.evidence!.find(record => record.id === id)!.summary = 'Drawing references for SW431-P-02 between CB SW435 FD02 at SW431 and CB SW431 FD02 at SW435. The current cable and named end connections are owner-confirmed by WN-CRUSHING-TIE. The disputed overview document reference, device states, complete physical interlocks and source availability remain unconfirmed; original drawing references are retained.';
  }
  const crushing1Review = model.reviews!.find(review => review.id === 'C1-R03')!;
  crushing1Review.question = 'The current SW431-P-02 tie and named end connections are owner-confirmed by WN-CRUSHING-TIE. Remaining unresolved: the overview reference 500CBC0002-13015-DR-EL-2353 and its document identity. Device states and complete physical interlocks remain separate open reviews.';
  crushing1Review.evidenceIds.push(tieDecisionId);
  const crushing2Review = model.reviews!.find(review => review.id === 'C2-R11')!;
  crushing2Review.question = 'The current SW431-P-02 tie and named end connections are owner-confirmed by WN-CRUSHING-TIE. Remaining unresolved: installed configuration beyond that scoped tie confirmation, normal states, fuse continuity, withdrawal/racking states and physical interlocks. All represented control baselines remain null and blocked.';
  crushing2Review.evidenceIds.push(tieDecisionId);

  const mineDecisionId = 'WN-MINE-TF03-FEED';
  const mineQuestion = 'Does station SB01 feeder F1, through TF03, currently supply RM711/the mine-services 22 kV line? The construction currently treats this as unconfirmed. Sources: 500CBC0002-13015-DR-EL-0001.pdf rev 3, page 1 B–D (SB01 F1/TF03), and 11098-07110-EL-DR-2252.pdf rev 5, page 1 A–C/1–3 (RM711 incoming). Please confirm the current arrangement, correct it, or say “unconfirmed”.';
  const mineDecision = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'It does' };
  const mineJoinEvidence = model.evidence!.find(record => record.id === 'WN-JOIN-mine-tf03')!;
  model.evidence!.push({ id: mineDecisionId, status: 'owner-confirmed', confirmation: mineDecision, references: structuredClone(mineJoinEvidence.references), summary: `Owner answered exactly "It does" to: ${mineQuestion} This confirms the current feeding route only. Study SS711B/TF717 overlap, exact drawing-reference equivalence, source availability, starting states, winding policies and complete interlocks remain unconfirmed.` });
  model.reviews!.push({ id: mineDecisionId, status: 'resolved', question: mineQuestion, evidenceIds: [mineDecisionId], resolution: mineDecision });
  const mineJoin = model.connections.find(connection => connection.id === 'whole:join:mine-tf03')!;
  mineJoin.knowledge = 'owner-confirmed'; mineJoin.evidenceIds!.push(mineDecisionId); mineJoin.reviewIds!.push(mineDecisionId);
  const mineReview = model.reviews!.find(review => review.id === 'WN-JOIN-mine-tf03')!;
  mineReview.status = 'resolved'; mineReview.resolution = mineDecision; mineReview.evidenceIds.push(mineDecisionId);
  mineReview.question = `${mineQuestion} Resolution is scoped to the current F1/TF03 feeding route. Study overlap and exact reference equivalence remain under MC-Q06/MC-Q09/MC-Q11.`;
  mineJoinEvidence.summary = 'Current station SB01 feeder F1 through TF03 to RM711/the mine-services 22 kV line is owner-confirmed by WN-MINE-TF03-FEED. Original drawing references remain traceable. Exact reference equivalence, study SS711B/TF717 identities/ratings, availability, starting states, winding policies and complete physical interlocks remain unconfirmed. The study-tf03 comparison remains unjoined.';
  for (const id of ['station:sb01:f1:interface', 'mine:interface:station-tf03']) {
    const asset = model.assets.find(candidate => candidate.id === id)!;
    asset.evidenceIds!.push(mineDecisionId); asset.reviewIds!.push(mineDecisionId);
    asset.aliases = [...(asset.aliases ?? []), 'Current SB01 F1 / TF03 to RM711 feeding route owner-confirmed'];
  }

  const detailed = withCv006Lv(withHopper10Lv(withWesternDetails(model, version), version), version);
  // Explicit source-scoped RC/FC assets only. Their existing phase-route evidence
  // identifies contactors; classification changes no relationship or permission.
  const contactorIds = [
    ...(['h1:mc417', 'h3:mc416', 'h7:mc418', 'h8:mc416', 'h9:mc419'] as const)
      .flatMap(board => [1, 2].flatMap(motor => ['rc', 'fc'].map(role => `wh:${board}:m${motor}:${role}`))),
    ...['01', '02'].flatMap(motor => ['rc', 'fc'].map(role => `rm420:mc420:motor-${motor}:${role}`)),
  ];
  for (const id of contactorIds) {
    const asset = detailed.assets.find(candidate => candidate.id === id);
    if (!asset || !asset.evidenceIds?.length) throw new Error(`Contactor classification requires the evidenced phase asset ${id}.`);
    asset.kind = 'contactor';
  }
  return withOwnerFollowups(withOwnerScopeConnections(withMc413Detail(withStationBatteryLimits(detailed, version), version), version), version);
}
