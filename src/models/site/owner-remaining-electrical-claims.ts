import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import proposal from '../../../drawing-review/supplemental/remaining-mechanism-wire-proposal.json';
import grounds from '../../../drawing-review/supplemental/earth-destination-proposal.json';

const mainId = 'WN-REMOVABLE-MAIN-RELATIONSHIPS';
const wireId = 'WN-REMAINING-WIRE-PATHS';
const earthId = 'WN-MODELED-EARTH-DESTINATIONS';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function withOwnerRemainingElectricalClaims(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Remaining electrical selections require a new immutable model version.');
  if (base.evidence?.some(record => [mainId, wireId, earthId].includes(record.id))) throw new Error('Remaining electrical selections already applied.');
  if (proposal.modelVersion !== 'construction-2026-10-23.8' || grounds.modelVersion !== proposal.modelVersion
    || proposal.mechanisms.length !== 7 || new Set(proposal.mechanisms.map(row => row.assetId)).size !== 7
    || proposal.connections.length !== 30 || new Set(proposal.connections.map(row => row.id)).size !== 30
    || grounds.earths.length !== 18 || new Set(grounds.earths.map(row => row.id)).size !== 18) throw new Error('Review required: approved exact7/30/18 electrical inventory changed.');
  const model = { ...structuredClone(base), version };
  const inventory: EvidenceReference = { document: 'drawing-review/supplemental/remaining-mechanism-wire-proposal.json', revision: proposal.reviewDate, clause: 'Frozen immutable .8 inventory: seven removable main pairs and30 exact represented wire/branch paths, including original source references; owner97/98 select model relationships only.' };
  const mainRefs: EvidenceReference[] = [inventory]; const wireRefs: EvidenceReference[] = [inventory];
  const earthRefs: EvidenceReference[] = [{ document: 'drawing-review/supplemental/earth-destination-proposal.json', revision: grounds.reviewDate, clause: 'Frozen immutable .8 inventory:18 exact existing modeled earth destinations with original source references; owner99 selects model ground terminals only.' }];
  for (const row of proposal.mechanisms) {
    const asset = model.assets.find(asset => asset.id === row.assetId);
    if (row.field !== 'removableBreaker' || asset?.kind !== 'breaker' || asset.knowledge !== row.knowledge || !same(asset.removableBreaker, row.declaration)
      || !model.interlocks?.reviews.some(review => review.assetId === row.assetId && review.status !== 'unresolved')) throw new Error(`Review required: removable main relationship ${row.assetId} changed.`);
    mainRefs.push(...row.references);
    asset.removableBreaker = { mainPair: [...asset.removableBreaker!.mainPair], supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: [mainId], reviewIds: [mainId] };
  }
  for (const row of proposal.connections) {
    const link = model.connections.find(link => link.id === row.id);
    if (!link || link.from !== row.from || link.to !== row.to || link.knowledge !== row.knowledge || !same(link.evidenceIds, row.evidenceIds) || !same(link.reviewIds, row.reviewIds)) throw new Error(`Review required: represented wire ${row.id} changed.`);
    wireRefs.push(...row.references);
    link.knowledge = 'owner-confirmed'; link.evidenceIds = [...row.evidenceIds, wireId]; link.reviewIds = [...row.reviewIds, wireId];
  }
  for (const row of grounds.earths) {
    const earth = model.earths?.find(earth => earth.id === row.id);
    if (!earth || earth.terminal !== row.terminal || earth.label !== row.label || earth.knowledge !== row.knowledge || earth.groupId !== ('groupId' in row ? row.groupId : undefined)
      || !same(earth.evidenceIds, row.evidenceIds) || !same(earth.reviewIds, row.reviewIds)) throw new Error(`Review required: modeled earth destination ${row.id} changed.`);
    earthRefs.push(...row.references);
    earth.knowledge = 'owner-confirmed'; earth.evidenceIds = [...row.evidenceIds, earthId]; earth.reviewIds = [...row.reviewIds, earthId];
  }
  for (const [id, answer, references, summary] of [
    [mainId, 'confirmed', mainRefs, 'Owner97 selects seven exact removable main relationships: Closed AND Rack in conducts modeled source and earth continuity; Open or Rack out interrupts; unknown axes remain Unconfirmed. Existing baseline/action rules and parent equipment metadata remain separate.'],
    [wireId, 'correct', wireRefs, 'Owner98 selects30 exact represented continuous source/earth wire and branch paths. Actual cable tags, installed revision precedence, ratings, independent earth terminations and winding/converter earth behavior remain Unconfirmed where separately unresolved.'],
    [earthId, 'correct', earthRefs, 'Owner99 selects18 existing destinations as modeled ground terminals. Actual field bonding, resistance and installation remain Unconfirmed. No new terminal, phase-earth winding link or connection between different phase buses is added. Transformer/converter/fuse earth behavior and external coverage remain separate.'],
  ] as const) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, summary, references: [...new Map([...references, { document: 'Project owner conversation', revision: '2026-10-23', clause: `${summary} Exact answer: ${answer}. This is a scoped V1 model selection, not whole-model acceptance or operational permission.` }].map(reference => [JSON.stringify(reference), reference])).values()] });
    (model.reviews ??= []).push({ id, status: 'resolved', question: summary, evidenceIds: [id], resolution: confirmation });
  }
  return model;
}
