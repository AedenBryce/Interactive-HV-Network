import type { NetworkModel } from '../../session/model';
import { recordDecision } from './owner-scope-connections';

export function withOwnerIdentityCorrections(base: NetworkModel, version: string): NetworkModel {
  const spareId = 'WN-TF436-SPARE-HARDWARE';
  if (base.evidence?.some(record => record.id === spareId)) throw new Error('Later owner identity confirmations already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  recordDecision(model, spareId, 'There is a breaker and earth switcb but it is a spare and does not feed anything, no outgoing cables.', 'For the TF436 spare cubicle at SW435 tier5, owner confirms physical breaker and earth-switch presence and no outgoing cables or downstream feed. This does not confirm actual positions, complete contact/earth mechanisms, source availability or physical interlock permission.');
  for (const [id, label] of [['sw435:tf436:hv-cb', 'CB TF436 FD · tier5 spare\nBreaker present · no outgoing cable'], ['sw435:tf436:hv-es', 'ES TF436 FD · tier5 spare\nEarth switch present · state unconfirmed']]) {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`TF436 hardware confirmation requires existing ${id}.`);
    asset.aliases = [...(asset.aliases ?? []), `Prior construction caption: ${asset.label}`]; asset.label = label; asset.knowledge = 'owner-confirmed';
    asset.evidenceIds = [...(asset.evidenceIds ?? []), spareId]; asset.reviewIds = [...(asset.reviewIds ?? []), spareId];
  }
  (model.boundaries ??= []).push({ id: 'owner:tf436:no-outgoing-cable', terminal: 'sw435:tf436:hv-cb:b', label: 'Owner confirms no outgoing cable or external feed at the spare cubicle. Breaker/earth-switch positions, complete earth mechanism and interlocks remain unconfirmed.', sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed', evidenceIds: [spareId], reviewIds: [spareId] });
  const tierId = 'WN-TF432-TIER5';
  recordDecision(model, tierId, 'Tier 5', 'In response to the TF432 feeder SW431 tier3-versus-tier5 drawing discrepancy, owner confirms Tier 5 as the canonical displayed tier. The detailed HV tier3 alias and original drawing evidence remain retained. No topology, state or interlock decision is recorded.');
  for (const [id, name] of [['sw431:tf432:hv-cb', 'CB TF432 FD'], ['sw431:tf432:hv-es', 'ES TF432 FD'], ['sw431:tf432:transformer', 'TF432 · D/Y LV windings']]) {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`TF432 tier correction requires existing ${id}.`);
    asset.label = `${name} · Tier 5`; asset.aliases = [...new Set([...(asset.aliases ?? []), 'Tier 5 (owner-confirmed)', 'Tier 3 in detailed HV sheet'])];
    asset.evidenceIds = [...(asset.evidenceIds ?? []), tierId]; asset.reviewIds = [...(asset.reviewIds ?? []), tierId];
  }
  const tierReview = model.reviews!.find(review => review.id === 'C1-R02')!;
  tierReview.status = 'resolved'; tierReview.resolution = model.evidence!.find(record => record.id === tierId)!.confirmation!; tierReview.evidenceIds.push(tierId);
  tierReview.question = 'Owner confirms SW431 TF432 feeder Tier 5. Detailed HV tier3 remains a historical drawing alias. Resolution concerns tier naming only; topology, baseline and interlocks are unchanged.';
  const boardId = 'WN-HPGR-MC001-MC438';
  recordDecision(model, boardId, 'Both names used for same board', 'In response to MC001 versus MC438 for the HPGR LV switchboard fed by TF004, owner confirms both names identify the same board. The existing single LV endpoint is retained; no second bus or topology change is created. TF004 440V/board415V labels, A01/A03/TE004 feeder aliases, unknown incoming MCCB tag, reference coverage and complete physical interlocks remain separate questions.');
  for (const id of ['hpgr:mc001:bus', 'hpgr:mc001:cb']) {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`HPGR board identity confirmation requires existing ${id}.`);
    asset.aliases = [...new Set([...(asset.aliases ?? []), 'MC001', 'MC438', 'Owner confirms MC001 / MC438 are the same board'])];
    asset.evidenceIds = [...(asset.evidenceIds ?? []), boardId]; asset.reviewIds = [...(asset.reviewIds ?? []), boardId];
    if (id.endsWith(':bus')) asset.label = 'HPGR MCC · MC001 / MC438 · same board\n415 V label / TF004 440 V unresolved';
  }
  const boardReview = model.reviews!.find(review => review.id === 'C2-R06')!;
  boardReview.question = 'Owner confirms MC001/MC438 are the same TF004-fed LV board. Remaining unresolved: TF004 440/415 V labels, unknown incoming MCCB tag and absent MCC endpoint reference sheets. A01/A03/TE004 feeder identity remains separately open; states and complete physical interlocks remain unconfirmed.'; boardReview.evidenceIds.push(boardId);
  const controlId = 'C2-CONTROL0008-SUPPLEMENT';
  model.evidence!.push({ id: controlId, status: 'supported', summary: 'Three indexed full-page captures of CB112-02006-DR-EL-0008 Sheet1 were visually reviewed: printed revision4,11.12.13 AS BUILT, vendor13007-DE-208. TF00122/6.6kV transformer control junction-box alarm/trip terminal strip and TF002/TF003 control termination devices are depicted, with references to JB002/0020 and PC002/0011. These control circuits create no additional phase paths. The source does not establish a complete installed key/interlock truth table, current physical conditions, transformer transfer/earth policy or switching permission. Original PDF and PDF hash were not obtained; provenance is the retained indexed image captures.', references: [{ document: 'CB112-02006-DR-EL-0008', revision: '4 (11.12.13; AS BUILT)', page: 1, clause: 'A-G/1-7: TF001 control J/BOX and oil-level/oil-temperature/winding-temperature/Buchholz/pressure alarm-trip terminals; TF002/TF003 control termination strips; A/1-3 JB002/0020 and PC002/0011 references; H/title block Sheet1/vendor13007-DE-208.' }] });
  const discrepancies = model.evidence!.find(record => record.id === 'C2-DISCREPANCIES')!;
  discrepancies.summary = 'Historical FUTURE/SPARE, board/feeder names, voltage and control-reference discrepancies remain traceable in the original references; later owner records resolve their specifically named installed-status/identity decisions. CB112-02006-DR-EL-0008 has now been visually reviewed as Sheet1 rev4 control-termination evidence. Other source gaps, 440/415V labels, A01/A03/TE004 feeder identity, current installed physical interlocks and accepted baseline remain open. Reviewing this control sheet creates no switching rule or phase route.';
  return model;
}
