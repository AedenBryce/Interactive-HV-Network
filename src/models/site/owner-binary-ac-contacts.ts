import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import proposal from '../../../drawing-review/supplemental/remaining-contact-path-proposal.json';

const contactId = 'WN-BINARY-CONTACT-MATRICES'; const wireId = 'WN-LV-AC-WIRE-PATHS';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function withOwnerBinaryAcContacts(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Binary/AC selections require a new immutable model version.');
  if (base.evidence?.some(record => [contactId, wireId].includes(record.id))) throw new Error('Binary/AC selections already applied.');
  if (proposal.modelVersion !== 'construction-2026-10-23.8' || proposal.controls.length !== 24 || proposal.lvAcConnections.length !== 12
    || new Set(proposal.controls.map(row => row.assetId)).size !== 24 || new Set(proposal.lvAcConnections.map(row => row.id)).size !== 12) throw new Error('Review required: approved exact24/12 proposal inventory changed.');
  const model = { ...structuredClone(base), version };
  const inventoryRef = { document: 'drawing-review/supplemental/remaining-contact-path-proposal.json', revision: proposal.reviewDate, clause: 'Frozen immutable .8 inventory approved by owner95/96:24 exact owned contact pairs and12 exact LV AC wire IDs/endpoints, with original references. Scope limited to these named claims.' };
  const contactRefs: EvidenceReference[] = [inventoryRef, { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer95 exact: approved. Open joins no terminals; Closed joins each of the24 listed pairs for modeled source and earth continuity. Preserve approved starting positions/action rules; parent metadata, external connections and independent earthing claims stay separate.' }];
  const wireRefs: EvidenceReference[] = [inventoryRef, { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer96 exact: approved. Select12 exact matching TF406A/TF410A/TF413A winding→own input switch→own AC endpoint source/earth cable routes only. No link between windings, common AC bus, converter/DC/motor transfer or transformer phase-earth path. Owner92 selects endpoint scope separately.' }];
  for (const row of proposal.controls) {
    const asset = model.assets.find(asset => asset.id === row.assetId);
    if (!asset || !same(asset.terminals, row.terminals) || asset.knowledge !== row.knowledge || !same(asset.positions, row.positions)
      || !same(asset.evidenceIds, row.evidenceIds) || !same(asset.reviewIds, row.reviewIds) || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined
      || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector || !model.interlocks?.reviews.some(review => review.assetId === row.assetId && review.status !== 'unresolved')) throw new Error(`Review required: approved binary contact ${row.assetId} changed.`);
    contactRefs.push(...row.references);
    for (const position of asset.positions) {
      position.supportScope = 'relationship'; position.knowledge = 'owner-confirmed';
      position.evidenceIds = [...row.evidenceIds, contactId]; position.reviewIds = [...row.reviewIds, contactId];
    }
    asset.evidenceIds = [...row.evidenceIds, contactId]; asset.reviewIds = [...row.reviewIds, contactId];
  }
  for (const row of proposal.lvAcConnections) {
    const link = model.connections.find(link => link.id === row.id);
    if (!link || link.from !== row.from || link.to !== row.to || link.knowledge !== row.knowledge || !same(link.evidenceIds, row.evidenceIds) || !same(link.reviewIds, row.reviewIds)) throw new Error(`Review required: approved LV AC cable ${row.id} changed.`);
    wireRefs.push(...row.references);
    link.knowledge = 'owner-confirmed'; link.evidenceIds = [...row.evidenceIds, wireId]; link.reviewIds = [...row.reviewIds, wireId];
  }
  for (const [id, references, summary] of [
    [contactId, contactRefs, 'Owner95 selects48 scoped Open/Closed contact claims for the exact24 controls. Closed joins the original listed two owned terminals for both continuity graphs; Open no pair. Parent equipment knowledge, earth terminations, starting states, local profiles and external connections remain unchanged.'],
    [wireId, wireRefs, 'Owner96 selects12 exact LV AC source/earth wire paths. Existing switches stay in series, and separate winding/input/endpoints stay separate. No converter/DC/motor, cross-winding relationship or transformer phase-earth link is created. Metadata, ratings and external coverage remain Unconfirmed where separately unresolved.'],
  ] as const) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'approved' };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()], summary });
    (model.reviews ??= []).push({ id, status: 'resolved', question: summary, evidenceIds: [id], resolution: confirmation });
  }
  return model;
}
