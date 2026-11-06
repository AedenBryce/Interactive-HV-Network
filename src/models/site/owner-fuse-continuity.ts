import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import proposal from '../../../drawing-review/supplemental/fuse-continuity-proposal.json';

const policyId = 'WN-FUSE-CONTINUITY';
const answer = 'Use this fixed intact-fuse model for all31';
const ids = [
  'hpgr:sw002:a02:f1', 'hpgr:sw002:a04:f1', 'hpgr:sw002:tf004:f101',
  'sw505:mc507:phase-fuse', 'sw505:mc508:phase-fuse', 'rm412:f1', 'rm412:f2',
  ...['wh:h1:mc417', 'wh:h3:mc416', 'wh:h7:mc418', 'wh:h8:mc416', 'wh:h9:mc419'].flatMap(board => [1, 2].flatMap(motor => ['fc', 'rc'].map(role => `${board}:m${motor}:${role}:fuse`))),
  ...['01', '02'].flatMap(motor => ['fc', 'rc'].map(role => `rm420:mc420:motor-${motor}:${role}:fuse`)),
];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const unique = (refs: EvidenceReference[]) => [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];

/** Select only the31 audited fixed source paths; retain provisional earth/metadata claims. */
export function withOwnerFuseContinuity(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Fuse policy requires a new immutable model version.');
  if (base.evidence?.some(record => record.id === policyId)) throw new Error('Fuse continuity policy already applied.');
  if (ids.length !== 31 || new Set(ids).size !== 31 || proposal.count !== 31 || proposal.assets.length !== 31
    || new Set(proposal.assets.map(row => row.assetId)).size !== 31 || proposal.assets.some(row => !ids.includes(row.assetId))) throw new Error('Review required: exact owner78 fuse inventory changed.');
  const model = { ...structuredClone(base), version };
  const ownerRef = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer78 exact: ${answer}. The question selects exactly31 named series fuses as intact fixed conductors in V1, without blown-fuse/removal actions. This establishes simulation source continuity only, without claiming actual fuse condition or resolving ratings/earth behavior. Original proposal: drawing-review/supplemental/fuse-continuity-proposal.md and its exact JSON inventory.` };
  const inventoryRef = { document: 'drawing-review/supplemental/fuse-continuity-proposal.json', revision: proposal.reviewDate, clause: `${proposal.modelId} / ${proposal.modelVersion}: exact31 original asset IDs, terminal pairs, metadata knowledge and original source references.` };
  const refs: EvidenceReference[] = [ownerRef, inventoryRef];
  for (const row of proposal.assets) {
    const asset = model.assets.find(asset => asset.id === row.assetId);
    const pair = row.conductivePairs[0];
    if (!asset || asset.kind !== 'interface' || asset.label !== row.label || asset.knowledge !== row.knowledge || row.conductivePairs.length !== 1 || pair.length !== 2
      || pair[0] === pair[1] || !same(asset.terminals, pair) || !same(asset.conductivePairs, row.conductivePairs) || asset.positions.length
      || asset.sourceArcs !== undefined || asset.sourcePairs?.length || asset.earthPairs?.length || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector
      || Object.hasOwn(model.starting.devices, asset.id) || !same(asset.evidenceIds, row.evidenceIds)
      || !row.references.length || row.references.some(ref => !row.evidenceIds.some(id => model.evidence?.find(record => record.id === id)?.references.some(actual => same(actual, ref))))) throw new Error(`Review required: exact audited fuse path/claim ${row.assetId} changed.`);
    const references = unique([ownerRef, inventoryRef, ...row.references]); refs.push(...row.references);
    asset.sourceArcs = [
      { id: `${policyId}:${asset.id}:a-b`, from: pair[0], to: pair[1], supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: [policyId, ...row.evidenceIds], reviewIds: [policyId, ...(asset.reviewIds ?? [])] },
      { id: `${policyId}:${asset.id}:b-a`, from: pair[1], to: pair[0], supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: [policyId, ...row.evidenceIds], reviewIds: [policyId, ...(asset.reviewIds ?? [])] },
    ];
    // The old pair applied to both graphs under provisional parent support.
    // Keep precisely that earth candidate while selecting source transfer only.
    asset.earthPairs = [[pair[0], pair[1]]]; asset.conductivePairs = [];
    asset.aliases = [...new Set([...(asset.aliases ?? []), asset.label])];
    asset.label = `${asset.label.replace(/continuity unconfirmed|condition unconfirmed/gi, 'actual condition unconfirmed')}\nIntact in teaching model`;
    asset.evidenceIds = [...row.evidenceIds, policyId]; asset.reviewIds = [...(asset.reviewIds ?? []), policyId];
    const recordId = `${policyId}:path:${asset.id}`;
    (model.evidence ??= []).push({ id: recordId, status: 'owner-confirmed', confirmation: { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer }, references, summary: `Owner78 selects only fixed modeled source continuity between ${pair[0]} and ${pair[1]} in both directions. No switching state/action added. Parent metadata and actual condition remain ${asset.knowledge}; independent earth behavior retains its prior candidate and support status.` });
    for (const arc of asset.sourceArcs) arc.evidenceIds!.push(recordId);
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id: policyId, status: 'owner-confirmed', confirmation, references: unique(refs), summary: 'Owner78 selects exactly31 fixed intact source paths for V1, represented by62 relationship-scoped directed claims. No fuse operations, baseline changes, metadata/rating/actual-condition acceptance or earth-knowledge promotion. Existing possible earth paths remain under their original parent support. Connections, transformer/converter policies and whole-model acceptance are unchanged.' });
  (model.reviews ??= []).push({ id: policyId, status: 'resolved', question: 'Exact31 series fuse source-continuity model policy only; actual condition/ratings/earth behavior remain separate.', evidenceIds: [policyId], resolution: confirmation });
  return model;
}
