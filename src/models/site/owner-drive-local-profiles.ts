import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const hvPrefixes = ['sw505:tf505a', 'sw505:tf505b', 'sw505:tf505c'];
const acIds = ['rm406:vs4061:input-a:switch', 'rm406:vs4061:input-b:switch', 'rm410:vs4101:input-a:switch', 'rm410:vs4101:input-b:switch', 'rm413a:ac-input-a:switch', 'rm413a:ac-input-b:switch'];
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];

/** Apply named owner local profiles without expanding converter/source scope. */
export function withOwnerDriveLocalProfiles(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-INTERLOCK-P08';
  if (base.evidence?.some(record => [id, 'WN-INTERLOCK-P11'].includes(record.id))) throw new Error('Drive local profiles already applied; use the prior immutable package.');
  const deferral = base.evidence?.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING');
  if (deferral?.status !== 'owner-confirmed' || deferral.confirmation?.decision !== 'Explicitly defer these listed sequences for V1' || !base.reviews?.some(review => review.id === deferral.id && review.status === 'resolved') || !deferral.references.some(reference => reference.document === 'drawing-review/supplemental/interlock-profile-review.json' && reference.clause?.startsWith('P08: exact 6'))) throw new Error('Owner49 bounded P08 inching/key deferral is required before applying the local profile.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required.');
  const group = inventory.groups.find(group => group.id === 'P08');
  const ids = hvPrefixes.flatMap(prefix => [`${prefix}:hv-cb`, `${prefix}:hv-es`]);
  if (!group || group.assetIds.length !== 6 || new Set(group.assetIds).size !== 6 || group.assetIds.some(assetId => !ids.includes(assetId))) throw new Error('Review required: frozen P08 identity inventory changed.');
  const answer = 'Apply this local matrix to all3 pairs';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer53 exact: ${answer}. For the three named P08 CB/ES pairs: CB Open requires Rack in; Close requires Rack in and own ES Open; Rack out requires contact Open; Rack in requires contact Open and own ES Open; ES Open allowed; ES Close requires own CB contact Open and Rack out. Unknown prerequisites block. Only the listed inching/key sequences are deferred under owner49. This selects a V1 local profile, not physical switching permission.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P08: exact six named control identities and per-asset original drawing/revision/page/region references; no converter/DC/output or transformer policy accepted.' };
  const references: EvidenceReference[] = [ownerReference, inventoryReference, ...deferral.references];
  const sourceReferences = (evidenceIds: string[] = []) => evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []);
  for (const prefix of hvPrefixes) {
    const cb = `${prefix}:hv-cb`; const es = `${prefix}:hv-es`;
    const breaker = model.assets.find(asset => asset.id === cb);
    const earth = model.assets.find(asset => asset.id === es);
    const mainPair = [`${cb}:a`, `${cb}:b`]; const line = `${es}:a`; const ground = `${es}:b`;
    const branch = model.connections.find(connection => connection.id === `${es}:branch`);
    const input = model.connections.find(connection => connection.id === `${prefix}:bus-link`);
    const output = model.connections.find(connection => connection.id === `${prefix}:cable-${prefix.split(':')[1].toUpperCase()}-P-01`);
    if (breaker?.kind !== 'breaker' || JSON.stringify(breaker.removableBreaker?.mainPair) !== JSON.stringify(mainPair) || earth?.kind !== 'earth-switch' || earth.removableBreaker || JSON.stringify(earth.terminals) !== JSON.stringify([line, ground]) || earth.positions.length !== 2 || earth.positions.find(position => position.id === 'open')?.pairs.length !== 0 || JSON.stringify(earth.positions.find(position => position.id === 'closed')?.pairs) !== JSON.stringify([[line, ground]]) || earth.conductivePairs.length || earth.sourcePairs?.length || earth.earthPairs?.length || earth.sourceArcs !== undefined || earth.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length) || !model.earths?.some(termination => termination.terminal === ground) || branch?.from !== mainPair[1] || branch.to !== line || model.connections.filter(connection => connection.from === line || connection.to === line).length !== 1 || input?.from !== 'sw505:bus:bar' || input.to !== mainPair[0] || output?.from !== mainPair[1] || output.to !== `${prefix}:hv` || ![branch, input, output].every(connection => sourceReferences(connection?.evidenceIds).length > 0)) throw new Error(`Review required: source-evidenced P08 CB/ES feeder terminal association changed for ${prefix}.`);
    const refs: EvidenceReference[] = [ownerReference, inventoryReference, ...deferral.references, ...sourceReferences(branch.evidenceIds), ...sourceReferences(input.evidenceIds), ...sourceReferences(output.evidenceIds)];
    for (const assetId of [cb, es]) {
      const review = model.interlocks.reviews.find(review => review.assetId === assetId);
      const row = group.assets.find(row => row.assetId === assetId);
      if (!review || !row || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P08 rules/review for ${assetId} changed; do not override them.`);
      review.status = 'confirmed-rules';
      review.note = `Owner answer53 selects the complete local HV matrix for this exact P08 CB/ES pair. ES Open has no additional prerequisite; all other actions enforce the declared known contact/racking/own-earth conditions. Only the listed inching/key sequences are deferred under owner49 (WN-DEFERRED-KEY-DOOR-INCHING); no converter/DC/output, source transfer or actual physical permission is accepted. Historical construction review context (retained provenance; the selected local profile above supersedes former unresolved local-review wording, while the bounded key-sequence deferral remains current): ${review.note}`;
      review.evidence = uniqueReferences([...review.evidence, ...row.references, ...refs]);
      refs.push(...review.evidence);
    }
    const evidence = uniqueReferences(refs); references.push(...evidence);
    const contactOpen: InterlockCondition = { kind: 'device', assetId: cb, axis: 'contact', value: 'open' };
    const rackIn: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'in' };
    const rackOut: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'out' };
    const earthOpen: InterlockCondition = { kind: 'device', assetId: es, position: 'open' };
    model.interlocks.rules.push(
      { id: `${id}:${cb}:open`, assetId: cb, command: { kind: 'contact', value: 'open' }, require: rackIn, explanation: 'Breaker Open requires known Rack in.', evidence },
      { id: `${id}:${cb}:close`, assetId: cb, command: { kind: 'contact', value: 'closed' }, require: { kind: 'all', conditions: [rackIn, earthOpen] }, explanation: 'Breaker Close requires known Rack in and its own earth switch Open.', evidence },
      { id: `${id}:${cb}:rack-out`, assetId: cb, command: { kind: 'racking', value: 'out' }, require: contactOpen, explanation: 'Rack out requires its breaker contact known Open.', evidence },
      { id: `${id}:${cb}:rack-in`, assetId: cb, command: { kind: 'racking', value: 'in' }, require: { kind: 'all', conditions: [contactOpen, earthOpen] }, explanation: 'Rack in requires its breaker contact and own earth switch known Open.', evidence },
      { id: `${id}:${es}:close`, assetId: es, position: 'closed', require: { kind: 'all', conditions: [contactOpen, rackOut] }, explanation: 'Earth Close requires its breaker contact known Open and Rack out.', evidence },
    );
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner53 selects only the three exact P08 CB/ES local matrices. Known prerequisites are mandatory; ES Open allowed. Listed inching/key sequences are explicitly deferred under owner49; this is not absence of an interlock inferred from silence. Converter/DC/output, source/earth transfer, topology, baselines, hardware claims and unrelated reviews are unchanged. Actual switching permission remains unconfirmed.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P08 complete local action profile only for the three named pairs; bounded key deferral49 is required and converter/transformer/physical acceptance remains separate.', evidenceIds: [id], resolution: confirmation });
  applyAcInputProfile(model);
  return model;
}

function applyAcInputProfile(model: NetworkModel) {
  const id = 'WN-INTERLOCK-P11';
  const group = inventory.groups.find(group => group.id === 'P11');
  if (!group || group.assetIds.length !== 6 || new Set(group.assetIds).size !== 6 || group.assetIds.some(assetId => !acIds.includes(assetId))) throw new Error('Review required: frozen P11 identity inventory changed.');
  const answer = 'Use this profile for all6 inputs';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer54 exact: ${answer}. For the six named P11 AC input switches, select Open/Close only, no Rack action, no additional prerequisites and independent actions. This is the complete selected V1 local profile. Existing separate AC source paths, converter/DC boundaries, equipment knowledge and baseline remain unchanged. This does not confirm physical hardware truth or actual switching permission.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P11: exact six AC input switch identities and original per-asset drawing/revision/page/region references.' };
  const references: EvidenceReference[] = [ownerReference, inventoryReference];
  for (const assetId of acIds) {
    const asset = model.assets.find(asset => asset.id === assetId);
    const review = model.interlocks!.reviews.find(review => review.assetId === assetId);
    const row = group.assets.find(row => row.assetId === assetId);
    const pair = [`${assetId}:a`, `${assetId}:b`];
    if (asset?.kind !== 'disconnector' || asset.removableBreaker || JSON.stringify(asset.terminals) !== JSON.stringify(pair) || asset.positions.length !== 2 || asset.positions.find(position => position.id === 'open')?.pairs.length !== 0 || JSON.stringify(asset.positions.find(position => position.id === 'closed')?.pairs) !== JSON.stringify([pair]) || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined || asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length) || !review || review.status !== 'unresolved' || !row || model.interlocks!.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P11 switch schema/rules/review for ${assetId} changed; do not override them.`);
    review.status = 'confirmed-none';
    review.note = `Owner answer54 selects the complete V1 local profile: Open/Close only, no Rack action, no additional prerequisites, and independent actions for this exact P11 AC input switch. Separate AC winding/input paths and converter/DC boundaries are preserved; no shared AC bus, transformer/source/earth policy or physical switching permission is established. Historical construction review context (retained provenance; the selected local profile above supersedes its former unresolved local-review wording): ${review.note}`;
    review.evidence = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference]);
    references.push(...review.evidence);
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner54 selects six independent AC input switches for Open/Close-only interaction and no additional V1 prerequisites. Their fixed discrete schemas, independent source paths, converter/DC boundaries, all baselines, source/earth transfer and equipment knowledge remain unchanged. No P09/P10 rule or physical switching permission is inferred.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P11 complete selected local action profile only for the six exact AC input switches; converter/transformer/source/earth and whole-model acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
}
