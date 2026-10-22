import type { NetworkModel } from '../../session/model';
import audit from '../../../drawing-review/supplemental/removable-breakers-audit.json';

const answers: Record<number, string> = {
  26: 'For all breakers that show they are removable, There should be an action for Open/Close and also Rack in/Rack out.',
  35: 'Yes, both LV and MV examples',
  38: 'All five removable',
};

/** Convert only the reviewed mechanisms; contact/racking baselines and interlock acceptance are separate. */
export function withOwnerRemovableBreakers(base: NetworkModel, version: string): NetworkModel {
  const reviewedIds = new Set(audit.records.map(record => record.assetId));
  const breakers = base.assets.filter(asset => asset.kind === 'breaker');
  if (reviewedIds.size !== 157 || breakers.length !== reviewedIds.size || breakers.some(asset => !reviewedIds.has(asset.id))) throw new Error('Breaker removability audit no longer covers the exact retained asset set; source review is required.');
  if (base.assets.some(asset => asset.removableBreaker)) throw new Error('Mechanism conversion requires the prior discrete package; do not rewrite a distributed mechanism model.');
  const model = { ...structuredClone(base), version };
  for (const record of audit.records.filter(record => record.modelEligibility === true)) {
    const asset = model.assets.find(candidate => candidate.id === record.assetId)!;
    const closed = asset.positions.find(position => position.id === 'closed');
    const open = asset.positions.find(position => position.id === 'open');
    if (asset.terminals.length !== 2 || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.positions.length !== 2 || closed?.pairs.length !== 1 || open?.pairs.length !== 0 || asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length) || model.starting.devices[asset.id] !== null) throw new Error(`Mechanism mapping changed for ${asset.id}; review its exact main pair and prior state before conversion.`);
    const question = record.ownerQuestion!;
    const answer = answers[question];
    if (!answer) throw new Error(`Missing exact owner classification for ${asset.id}.`);
    const id = `WN-REMOVABLE-${asset.id}`;
    if (model.evidence?.some(evidence => evidence.id === id)) throw new Error(`Mechanism selection already recorded for ${asset.id}.`);
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
    (model.evidence ??= []).push({
      id, status: 'owner-confirmed', confirmation,
      summary: `${record.eligibilityBasis} Source review: ${record.sourceFact} Selection is limited to this model's removable mechanism. Existing terminal roles and closed main pair are preserved. Baseline, complete hardware metadata, transformer behavior, physical interlocks and whole-network acceptance remain separate.`,
      references: [
        { document: record.reference.document, revision: record.reference.revision, page: record.reference.page, clause: record.reference.region },
        { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer${question}: ${answer}. Full question and scope: drawing-review/supplemental/owner-configuration-review.md.` },
      ],
    });
    (model.reviews ??= []).push({ id, status: 'resolved', question: `Removable mechanism selection only for ${asset.id}; other electrical and interlock review remains separate.`, evidenceIds: [id], resolution: confirmation });
    asset.removableBreaker = { mainPair: [...closed.pairs[0]] };
    asset.positions = [];
    asset.evidenceIds = [...(asset.evidenceIds ?? []), id];
    asset.reviewIds = [...(asset.reviewIds ?? []), id];
    model.starting.devices[asset.id] = { contact: null, racking: null };
  }
  return model;
}
