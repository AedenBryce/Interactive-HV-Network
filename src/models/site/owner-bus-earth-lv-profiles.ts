import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';
import proposal from '../../../drawing-review/supplemental/bus-earth-proposal.json';

const lvIds = ['hpgr:mc001:cb', 'rm412:q200', 'rm412:q201', 'rm412:q202', 'rm413:mcc414:cb', 'rm712:sw712:cb', 'rm713:sw713:cb', 'wh:h1:mc417a:in', 'wh:h3:mc416a:in', 'wh:h7:mc418a:in', 'wh:h8:mc416a:in'];
const removableIds = ['rm712:sw712:cb', 'rm713:sw713:cb'];
const busEarthIds = ['mine:sw441:bus:es', 'sw411:bus-a:es', 'sw411:bus-b:es', 'sw421:bus:es', 'sw426:bus:es', 'sw431:bus:es', 'sw435:bus:es', 'sw451:bus:es', 'sw454:bus:es', 'sw505:bus:es'];
const ohlIds = ['cv006:abs:49-1', 'cv006:abs:49-40', 'cv006:fused-abs:57', 'cv006:recloser:49-39a', 'line33:hopper-286-fused-abs', 'line33:pole-1-recloser', 'line33:pole-2-abs', 'line33:pole-201-abs', 'line33:tie-in-abs', 'mine:wt1:cb'];
const formerOhlIds = ['cv006:abs:49-38-1', 'cv006:fused-abs:286'];
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];

/** Apply only the owner's named simulation profiles to a new composition. */
export function withOwnerBusEarthLvProfiles(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-INTERLOCK-P05';
  if (base.evidence?.some(record => [id, 'WN-INTERLOCK-P02', 'WN-INTERLOCK-P12'].includes(record.id))) throw new Error('Bus-earth/LV profiles already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required.');
  const group = inventory.groups.find(group => group.id === 'P05');
  if (!group || new Set(group.assetIds).size !== lvIds.length || group.assetIds.length !== lvIds.length || group.assetIds.some(assetId => !lvIds.includes(assetId))) throw new Error('Review required: frozen P05 identity inventory changed.');
  const answer = 'all are correct excluding SW712/SW713 Incomers are removable and can have the racki in/out funciton';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer46 exact: ${answer}. P05's nine other LV breakers use fixed Open/Close with no additional local prerequisites. The SW712/SW713 exception selects removable mechanisms only; intrinsic owner29 guards remain mandatory and no additional local prerequisites are declared. Selected V1 profile, not actual switching permission or installed physical truth-table verification.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P05: exact11 LV breaker identities and per-asset original source references.' };
  const references: EvidenceReference[] = [ownerReference, inventoryReference];
  for (const assetId of lvIds) {
    const asset = model.assets.find(asset => asset.id === assetId);
    const review = model.interlocks.reviews.find(review => review.assetId === assetId);
    const row = group.assets.find(row => row.assetId === assetId);
    if (!asset || asset.kind !== 'breaker' || asset.removableBreaker || !review || review.status !== 'unresolved' || !row || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P05 mechanism/rules/review for ${assetId} changed; do not override them.`);
    const closed = asset.positions.find(position => position.id === 'closed');
    if (asset.positions.length !== 2 || asset.positions.find(position => position.id === 'open')?.pairs.length !== 0 || closed?.pairs.length !== 1) throw new Error(`Review required: P05 Open/Close mapping changed for ${assetId}.`);
    const refs = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference]);
    if (removableIds.includes(assetId)) {
      const expectedPair = [`${assetId}:a`, `${assetId}:b`];
      if (JSON.stringify(asset.terminals) !== JSON.stringify(expectedPair) || JSON.stringify(closed.pairs[0]) !== JSON.stringify(expectedPair) || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined || asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length) || model.starting.devices[assetId] !== 'closed') throw new Error(`Review required: selected Closed main pair changed for ${assetId}.`);
      asset.removableBreaker = { mainPair: [...closed.pairs[0]] };
      asset.positions = [];
      asset.evidenceIds = [...(asset.evidenceIds ?? []), id];
      asset.reviewIds = [...(asset.reviewIds ?? []), id];
      model.starting.devices[assetId] = { contact: 'closed', racking: 'in' };
      refs.push({ document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answers30/36: selected Rack in default for in-service, non-loop-feed removable breakers. Answer46 names these two LV incomers as removable. Existing selected Closed contact is preserved; this is not an installed-state claim.' });
    }
    review.status = 'confirmed-none';
    review.note = `Owner answer46 selects ${removableIds.includes(assetId) ? 'independent contact/racking with intrinsic owner29 known-prerequisite guards; Rack in is the owner30/36 selected non-loop LV default' : 'fixed Open/Close'} for this exact P05 LV breaker. Confirmed-none means no additional declared local rules. The mechanism exception applies only to SW712/SW713 incomers. No physical switching permission, topology or source/earth behavior is established. Historical construction review context (retained provenance; the selected model profile above supersedes its former unresolved runtime-review wording): ${review.note}`;
    review.evidence = uniqueReferences(refs); references.push(...review.evidence);
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner46 selects nine fixed LV Open/Close controls and two removable LV incomers, with no additional local prerequisites. Intrinsic owner29 guards remain mandatory for the two removable incomers. Existing selected Closed contacts are preserved; Rack in follows owner30/36. Equipment claim knowledge, topology, source/earth behavior, all other baselines and unrelated reviews remain unchanged. P12 OHL selection is recorded separately under answers47/48.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P05 selected LV mechanism categories and absence of additional local prerequisites only; physical truth and whole-model acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  applyBusEarthProfiles(model);
  applyOhlProfile(model);
  return model;
}

function applyOhlProfile(model: NetworkModel) {
  const id = 'WN-INTERLOCK-P12';
  const group = inventory.groups.find(group => group.id === 'P12');
  const expectedIds = [...ohlIds, ...formerOhlIds];
  if (!group || group.assetIds.length !== 12 || new Set(group.assetIds).size !== 12 || group.assetIds.some(assetId => !expectedIds.includes(assetId))) throw new Error('Review required: frozen P12 identity inventory changed.');
  const answer47 = 'consider them all closed and no racking function.';
  const answer48 = 'No additional prerequisites in V1';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer47 exact: ${answer47} Answer48 exact: ${answer48}. The selected V1 interaction is Open/Close only for the ten named current P12 controls, initially Closed, with no additional local prerequisites. The former cv006:abs:49-38-1 and cv006:fused-abs:286 hardware exceptions are excluded. No physical removability classification is inferred from generic symbols or this model action selection; installed hardware and switching permission remain unconfirmed.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P12: ten current OHL controls selected; two former-hardware references expressly excluded. Per-asset original source references retained.' };
  const references: EvidenceReference[] = [ownerReference, inventoryReference];
  for (const assetId of ohlIds) {
    const asset = model.assets.find(asset => asset.id === assetId);
    const review = model.interlocks!.reviews.find(review => review.assetId === assetId);
    const row = group.assets.find(row => row.assetId === assetId);
    if (!asset || !['breaker', 'disconnector'].includes(asset.kind) || asset.removableBreaker || asset.positions.length !== 2 || asset.positions.find(position => position.id === 'open')?.pairs.length !== 0 || asset.positions.find(position => position.id === 'closed')?.pairs.length !== 1 || model.starting.devices[assetId] !== 'closed' || !review || review.status !== 'unresolved' || !row || model.interlocks!.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P12 action/baseline/rules/review for ${assetId} changed; do not override them.`);
    review.status = 'confirmed-none';
    review.note = `Owner answers47/48 select Closed as the teaching baseline and Open/Close-only V1 interaction, with no additional local prerequisites for this exact current P12 control. No racking action is selected. Generic source symbols do not confirm physical removability or installed physical-interlock truth; actual switching permission remains unconfirmed. The two former-hardware references are excluded. Historical construction review context (retained provenance; the selected model profile above supersedes its former unresolved runtime-review wording): ${review.note}`;
    review.evidence = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference]);
    references.push(...review.evidence);
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: `Answer47: ${answer47} Answer48: ${answer48}` };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner47/48 select ten current OHL controls for Closed baseline, Open/Close-only interaction and no additional V1 prerequisites. Existing Closed values are preserved. This does not classify physical removability from generic symbols, change source/earth relationships or establish actual switching permission. Both former-hardware exceptions retain their null states and unresolved reviews.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P12 current-ten selected action vocabulary and complete V1 local restrictions only; two former hardware exceptions excluded.', evidenceIds: [id], resolution: confirmation });
}

function applyBusEarthProfiles(model: NetworkModel) {
  const id = 'WN-INTERLOCK-P02';
  const group = inventory.groups.find(group => group.id === 'P02');
  if (!group || group.assetIds.length !== 10 || new Set(group.assetIds).size !== 10 || group.assetIds.some(assetId => !busEarthIds.includes(assetId)) || proposal.records.length !== 10 || new Set(proposal.records.map(row => row.earthAssetId)).size !== 10 || proposal.records.some(row => !busEarthIds.includes(row.earthAssetId))) throw new Error('Review required: frozen P02 identity inventory changed.');
  const answer = 'Approve all10 listed bus-earth profiles';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer45 exact: ${answer}. Earth Open allowed. Earth Close requires ALL exact listed breaker contacts known Open and Rack out; unknown prerequisites block. The owner selects this complete V1 simulation profile. Direct depicted bus/CB associations organize and validate only the named dependency identities; no physical interlock is inferred from wiring. This is not actual switching permission.` };
  const proposalReference = { document: 'drawing-review/supplemental/bus-earth-proposal.json', revision: '2026-10-23', clause: `${proposal.id}: exact ten bus-earth records, source buses, branch identities and all listed direct breaker connection endpoints approved by answer45. The proposal's original pending status is historical; this linked owner decision selects the profile.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P02: exact ten bus-earth identities and per-asset original source references.' };
  const references: EvidenceReference[] = [ownerReference, proposalReference, inventoryReference];
  const sourceReferences = (ids: string[] = []) => ids.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []);
  for (const record of proposal.records) {
    const { earthAssetId, busAssetId, branchConnectionId, dependencies } = record;
    const earth = model.assets.find(asset => asset.id === earthAssetId);
    const bus = model.assets.find(asset => asset.id === busAssetId);
    const branch = model.connections.find(connection => connection.id === branchConnectionId);
    const review = model.interlocks!.reviews.find(review => review.assetId === earthAssetId);
    const row = group.assets.find(row => row.assetId === earthAssetId);
    // Explicit construction terminal names identify the approved branch. They do
    // not assert a site terminal tag, physical mechanism or interlock truth table.
    const sw411 = earthAssetId.startsWith('sw411:');
    const line = `${earthAssetId}:${sw411 ? 'line' : busAssetId === 'sw451:bus' ? 'in' : 'a'}`;
    const ground = `${earthAssetId}:${sw411 ? 'earth' : busAssetId === 'sw451:bus' ? 'out' : 'b'}`;
    const busTerminal = `${busAssetId}:${busAssetId === 'sw451:bus' ? 'port' : 'bar'}`;
    const expectedBusId = earthAssetId.replace(/:es$/, '');
    if (!earth || !bus || bus.id !== expectedBusId || bus.kind !== 'bus' || JSON.stringify(bus.terminals) !== JSON.stringify([busTerminal]) || !review || review.status !== 'unresolved' || !row || model.interlocks!.rules.some(rule => rule.assetId === earthAssetId)) throw new Error(`Review required: source bus/review for ${earthAssetId} changed; do not override it.`);
    if (earth.kind !== 'earth-switch' || earth.removableBreaker || JSON.stringify(earth.terminals) !== JSON.stringify([line, ground]) || earth.positions.length !== 2 || earth.positions.find(position => position.id === 'open')?.pairs.length !== 0 || JSON.stringify(earth.positions.find(position => position.id === 'closed')?.pairs) !== JSON.stringify([[line, ground]]) || earth.conductivePairs.length || earth.sourcePairs?.length || earth.earthPairs?.length || earth.sourceArcs !== undefined || earth.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length) || !model.earths?.some(termination => termination.terminal === ground) || branch?.from !== busTerminal || branch.to !== line || model.connections.filter(connection => connection.from === line || connection.to === line).length !== 1 || sourceReferences(branch.evidenceIds).length === 0 || sourceReferences(bus.evidenceIds).length === 0) throw new Error(`Review required: source-evidenced bus-earth branch terminal association changed for ${earthAssetId}.`);
    const direct = model.connections.filter(connection => {
      const other = connection.from === busTerminal ? connection.to : connection.to === busTerminal ? connection.from : undefined;
      return other !== undefined && model.assets.some(asset => asset.kind === 'breaker' && asset.terminals.includes(other));
    });
    const endpointKey = (connection: { id: string; from: string; to: string }) => JSON.stringify([connection.id, connection.from, connection.to]);
    const expected = dependencies.map(dependency => endpointKey({ id: dependency.connectionId, from: dependency.from, to: dependency.to })).sort();
    if (!dependencies.length || new Set(dependencies.map(dependency => dependency.assetId)).size !== dependencies.length || JSON.stringify(direct.map(endpointKey).sort()) !== JSON.stringify(expected)) throw new Error(`Review required: exact direct breaker dependency set changed for ${earthAssetId}.`);
    const refs = uniqueReferences([...review.evidence, ...row.references, ...sourceReferences(bus.evidenceIds), ...sourceReferences(branch.evidenceIds), ownerReference, proposalReference, inventoryReference]);
    const conditions: InterlockCondition[] = [];
    for (const dependency of dependencies) {
      const breaker = model.assets.find(asset => asset.id === dependency.assetId);
      const connection = model.connections.find(connection => connection.id === dependency.connectionId)!;
      const breakerTerminal = connection.from === busTerminal ? connection.to : connection.from;
      if (!breaker || breaker.kind !== 'breaker' || !breaker.removableBreaker || !breaker.removableBreaker.mainPair.includes(breakerTerminal) || !breaker.terminals.includes(breakerTerminal) || sourceReferences(connection.evidenceIds).length === 0) throw new Error(`Review required: exact removable breaker dependency changed for ${earthAssetId} / ${dependency.assetId}.`);
      refs.push(...sourceReferences(connection.evidenceIds));
      conditions.push({ kind: 'device', assetId: dependency.assetId, axis: 'contact', value: 'open' }, { kind: 'device', assetId: dependency.assetId, axis: 'racking', value: 'out' });
    }
    review.status = 'confirmed-rules';
    review.note = `Owner answer45 selects Earth Open without additional prerequisites and Earth Close only when ALL exact named bus breaker contacts are known Open and Rack out. Unknown prerequisites block. The complete named dependency list is retained in the rule and owner-approved proposal. This is a selected V1 profile, not a physical interlock inferred from wiring or actual switching permission. Historical construction review context (retained provenance; the selected model profile above supersedes its former unresolved runtime-review wording): ${review.note}`;
    review.evidence = uniqueReferences(refs); references.push(...review.evidence);
    model.interlocks!.rules.push({ id: `${id}:${earthAssetId}:close`, assetId: earthAssetId, position: 'closed', require: { kind: 'all', conditions }, evidence: review.evidence, explanation: 'Bus Earth Close requires ALL exact named breaker contacts known Open and Rack out; an unknown prerequisite blocks.' });
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner45 selects the exact ten proposed bus-earth profiles and their complete named breaker prerequisites. Earth Open has no additional prerequisite; Earth Close requires ALL listed CB contacts known Open and Rack out. No source/earth relationship, topology, baseline, equipment knowledge or unrelated review is changed. Drawing associations validate identity only; physical permission and installed hardware truth remain separate.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P02 selected complete local simulation restrictions only for the ten exact bus earths; whole-model and installed physical-interlock acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  const tieReview = model.interlocks!.reviews.find(review => review.assetId === 'sw411:bus-tie:cb');
  if (tieReview?.note.includes('Bus-earth controls retain their own unresolved review.')) {
    tieReview.note = `Owner answer44 selects the bus-tie profile; owner answer45 now selects both bus-earth profiles (WN-INTERLOCK-P02). Both known Open bus-earth prerequisites for tie Close/Rack in and all intrinsic guards remain mandatory. Actual switching permission and installed physical truth remain unconfirmed. Historical construction review context (retained provenance; the original unresolved bus-earth review wording below describes the prior package): ${tieReview.note}`;
  }
}
