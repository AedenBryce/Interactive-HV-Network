import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const rm714Pairs = [
  { main: 'rm714:in01', earth: 'rm714:in01:es', kind: 'disconnector', side: 'a', busLink: 'rm714:in01:bus-link' },
  { main: 'rm714:in02', earth: 'rm714:in02:es', kind: 'disconnector', side: 'a', busLink: 'rm714:in02:bus-link' },
  { main: 'rm714:tf714:cb', earth: 'rm714:tf714:es', kind: 'breaker', side: 'b', busLink: 'rm714:tf714:bus-link' },
];
const drives = [
  { prefix: 'sw505:vs50501', motor: 'sw505:sb214-em01' },
  { prefix: 'sw505:vs50502', motor: 'sw505:sb215-em01' },
  { prefix: 'sw505:vs50503', motor: 'sw505:sb216-em01' },
];
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];
const binaryFixed = (asset: Asset | undefined, kind: string) => asset?.kind === kind && !asset.removableBreaker && JSON.stringify(asset.terminals) === JSON.stringify([`${asset.id}:a`, `${asset.id}:b`]) && !asset.conductivePairs.length && !asset.sourcePairs?.length && !asset.earthPairs?.length && asset.sourceArcs === undefined && asset.positions.length === 2 && asset.positions.find(position => position.id === 'open')?.pairs.length === 0 && JSON.stringify(asset.positions.find(position => position.id === 'closed')?.pairs) === JSON.stringify([asset.terminals]) && !asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length);

/** Presence and selected local actions are separate from path/termination truth. */
export function withOwnerRm714DriveOutputProfiles(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-INTERLOCK-P18'; const presenceId = 'WN-RM714-EARTH-PRESENCE';
  if (base.evidence?.some(record => [id, presenceId, 'WN-INTERLOCK-P09'].includes(record.id))) throw new Error('RM714/drive output profiles already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required.');
  const group = inventory.groups.find(group => group.id === 'P18'); const ids = rm714Pairs.flatMap(pair => [pair.main, pair.earth]);
  if (!group || group.assetIds.length !== 6 || new Set(group.assetIds).size !== 6 || group.assetIds.some(assetId => !ids.includes(assetId))) throw new Error('Review required: frozen P18 exact-six identity inventory changed.');
  const presenceAnswer = 'All3 earth switches are installed';
  const answer = 'Use this complete profile for all3 pairs';
  const presenceReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer56 exact: ${presenceAnswer}. Presence ONLY of the three named RM714 IN01/IN02/TF714 earth switches. This does not confirm the detailed branch/endpoints, phase-earth termination, all asset properties, mechanism, local action permission or installed baseline. The discrepancy is between 11098-07110-EL-DR-2255.pdf rev1 p1 A-C and CB-10016-DR-EL-0011.pdf rev0 p1 RM714 lower panel. Full record: drawing-review/supplemental/owner-interlocks-review.md, Answer56.` };
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer57 exact: ${answer}. Complete selected V1 profile for RM714 IN01/IN02/TF714 main/earth pairs: Open/Close only; no Rack. Main Open allowed; Main Close requires own ES Open; ES Close requires own main Open; ES Open allowed. Unknown prerequisites block. No additional local/key conditions. Presence56 is separate from detailed path/termination claims, installed hardware truth and actual switching permission. Full record: drawing-review/supplemental/owner-interlocks-review.md, Answer57.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P18 exact-six control identities and per-asset original drawing/revision/page/region references.' };
  const references: EvidenceReference[] = [presenceReference, ownerReference, inventoryReference];
  const sourceReferences = (evidenceIds: string[] = []) => evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []);
  for (const pair of rm714Pairs) {
    const main = model.assets.find(asset => asset.id === pair.main); const earth = model.assets.find(asset => asset.id === pair.earth);
    const branch = model.connections.find(connection => connection.id === `${pair.earth}:branch`);
    const busLink = model.connections.find(connection => connection.id === pair.busLink);
    const bus = 'rm714:bus:bar';
    const busFrom = pair.side === 'a' ? `${pair.main}:b` : bus; const busTo = pair.side === 'a' ? bus : `${pair.main}:a`;
    if (!binaryFixed(main, pair.kind) || !binaryFixed(earth, 'earth-switch') || branch?.from !== `${pair.main}:${pair.side}` || branch.to !== `${pair.earth}:a` || busLink?.from !== busFrom || busLink.to !== busTo || !model.earths?.some(termination => termination.terminal === `${pair.earth}:b`) || model.connections.filter(connection => connection.from === `${pair.earth}:a` || connection.to === `${pair.earth}:a`).length !== 1 || ![branch, busLink].every(connection => sourceReferences(connection?.evidenceIds).length > 0)) throw new Error(`Review required: exact source-evidenced RM714 main/earth terminal association changed for ${pair.main}.`);
    const refs = uniqueReferences([presenceReference, ownerReference, inventoryReference, ...sourceReferences(branch.evidenceIds), ...sourceReferences(busLink.evidenceIds), ...group.assets.filter(row => [pair.main, pair.earth].includes(row.assetId)).flatMap(row => row.references)]);
    applyPair(model, pair.main, pair.earth, id, refs, 'Owner answer57 selects the complete RM714 fixed Open/Close-only local profile. Presence56 does not accept the provisional detailed branch/path/earth-termination claims.');
    earth!.label = earth!.label.replace('earth · unconfirmed', 'earth · presence owner-confirmed; path review pending');
    earth!.evidenceIds = [...(earth!.evidenceIds ?? []), presenceId];
    earth!.reviewIds = [...(earth!.reviewIds ?? []), presenceId];
    references.push(...refs);
  }
  const presenceConfirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: presenceAnswer };
  (model.evidence ??= []).push({ id: presenceId, status: 'owner-confirmed', confirmation: presenceConfirmation, references: uniqueReferences([presenceReference, ...group.assets.filter(row => rm714Pairs.some(pair => pair.earth === row.assetId)).flatMap(row => row.references)]), summary: 'Owner56 confirms ONLY presence of RM714 IN01, IN02 and TF714 feeder earth switches. Existing asset/earth knowledge remains unchanged because detailed path, terminal, phase-earth termination and other equipment properties are not confirmed by presence. Selected local actions57 are recorded separately; actual switching permission and installed live state remain unconfirmed.' });
  (model.reviews ??= []).push({ id: presenceId, status: 'resolved', question: 'Presence only of the three exact RM714 earth switches; detailed branch/termination and hardware properties remain separate.', evidenceIds: [presenceId], resolution: presenceConfirmation });
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  model.evidence.push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner57 selects the complete six-control RM714 local profile only. Main/earth Open allowed; each Close requires the other own control known Open. No Rack or additional local/key prerequisites. Presence56 is separate. All baselines, topology, path/termination knowledge, source/earth transfer and unrelated reviews remain unchanged; actual switching permission is not established.' });
  model.reviews.push({ id, status: 'resolved', question: 'P18 complete local selected action profile only; presence56 and detailed source/earth/hardware acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  applyDriveOutputProfile(model);
  return model;
}

function applyDriveOutputProfile(model: NetworkModel) {
  const id = 'WN-INTERLOCK-P09';
  const deferral = model.evidence?.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING');
  if (deferral?.status !== 'owner-confirmed' || deferral.confirmation?.decision !== 'Explicitly defer these listed sequences for V1' || !model.reviews?.some(review => review.id === deferral.id && review.status === 'resolved') || !deferral.references.some(reference => reference.document === 'drawing-review/supplemental/interlock-profile-review.json' && reference.clause?.startsWith('P09: exact 6'))) throw new Error('Owner49 bounded P09 inching/key deferral is required before applying the drive output profile.');
  const group = inventory.groups.find(group => group.id === 'P09'); const ids = drives.flatMap(drive => [`${drive.prefix}:output-switch`, `${drive.prefix}:dc-earth`]);
  if (!group || group.assetIds.length !== 6 || new Set(group.assetIds).size !== 6 || group.assetIds.some(assetId => !ids.includes(assetId))) throw new Error('Review required: frozen P09 exact-six identity inventory changed.');
  const answer = 'Use this complete local profile for all3 drives';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer58 exact: ${answer}. Each exact VS50501/02/03 output/DC-earth pair uses Open/Close only, no Rack. Output Open allowed; Output Close requires own DC earth Open; DC Earth Close requires own output Open; DC Earth Open allowed. Unknown prerequisites block. Owner49's bounded inching/key deferral remains required. Converter transfer, stored energy and discharge behavior remain Unconfirmed; this selection establishes no converter coupling, discharge completion, absence of stored energy or actual switching permission. Source: 500CB-04220-DR-EL-0042.pdf rev4 p1 D-F/2-10. Full recorded question: drawing-review/supplemental/owner-interlocks-review.md, Answer58.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P09 exact-six output/DC-earth control identities and original per-asset drawing/revision/page/region references.' };
  const deferralReferences = deferral.references.filter(reference => reference.document === 'Project owner conversation' || reference.clause?.startsWith('P09: exact 6'));
  const references: EvidenceReference[] = [ownerReference, inventoryReference, ...deferralReferences];
  const sourceReferences = (evidenceIds: string[] = []) => evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []);
  for (const { prefix, motor } of drives) {
    const outputId = `${prefix}:output-switch`; const earthId = `${prefix}:dc-earth`;
    const output = model.assets.find(asset => asset.id === outputId); const earth = model.assets.find(asset => asset.id === earthId);
    const converter = model.assets.find(asset => asset.id === `${prefix}:converter`);
    const branch = model.connections.find(connection => connection.id === `${earthId}:branch`);
    const input = model.connections.find(connection => connection.id === `${prefix}:inverter-output-contact`);
    const cable = model.connections.find(connection => connection.id === `${prefix}:motor-power-cable`);
    if (!binaryFixed(output, 'disconnector') || !binaryFixed(earth, 'earth-switch') || converter?.kind !== 'interface' || JSON.stringify(converter.terminals) !== JSON.stringify([`${prefix}:ac-d`, `${prefix}:ac-y`, `${prefix}:dc`, `${prefix}:output`]) || converter.positions.length || converter.conductivePairs.length || converter.sourcePairs?.length || converter.earthPairs?.length || converter.sourceArcs !== undefined || converter.removableBreaker || branch?.from !== `${prefix}:dc` || branch.to !== `${earthId}:a` || input?.from !== `${prefix}:output` || input.to !== `${outputId}:a` || cable?.from !== `${outputId}:b` || cable.to !== `${motor}:port` || !model.assets.some(asset => asset.id === motor && asset.kind === 'interface' && JSON.stringify(asset.terminals) === JSON.stringify([`${motor}:port`])) || !model.earths?.some(termination => termination.terminal === `${earthId}:b`) || model.connections.filter(connection => connection.from === `${earthId}:a` || connection.to === `${earthId}:a`).length !== 1 || ![branch, input, cable].every(connection => sourceReferences(connection?.evidenceIds).length > 0)) throw new Error(`Review required: exact source-evidenced P09 output/DC-earth/converter boundary association changed for ${prefix}.`);
    const refs = uniqueReferences([ownerReference, inventoryReference, ...deferralReferences, ...sourceReferences(branch.evidenceIds), ...sourceReferences(input.evidenceIds), ...sourceReferences(cable.evidenceIds), ...group.assets.filter(row => [outputId, earthId].includes(row.assetId)).flatMap(row => row.references)]);
    applyPair(model, outputId, earthId, id, refs, 'Owner answer58 selects the complete P09 output/DC-earth Open/Close-only model profile. Only the listed inching/key sequences are deferred under owner49 (WN-DEFERRED-KEY-DOOR-INCHING). Converter transfer, stored energy and discharge behavior remain Unconfirmed; this local profile supplies no discharge/zero-energy predicate or converter coupling.');
    references.push(...refs);
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner58 selects only the three exact fixed Open/Close output/DC-earth local profiles, subject to bounded key deferral49. Both Open actions allowed; each Close requires the other own control known Open; unknown prerequisites block. No Rack. Converter transfer, stored energy and discharge behavior remain Unconfirmed. Existing separate AC/DC/output ports acquire no internal links. Baselines, source/earth relationships, equipment claims, topology and unrelated reviews remain unchanged. This is not actual switching permission.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P09 complete selected local output/DC-earth profile only, requiring bounded key deferral49; converter transfer, stored energy, discharge and actual physical permission remain unconfirmed.', evidenceIds: [id], resolution: confirmation });
}

function applyPair(model: NetworkModel, main: string, earth: string, id: string, references: EvidenceReference[], currentNote: string) {
  for (const assetId of [main, earth]) {
    const review = model.interlocks!.reviews.find(review => review.assetId === assetId);
    if (!review || review.status !== 'unresolved' || model.interlocks!.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing ${id} rules/review for ${assetId} changed; do not override them.`);
    review.status = 'confirmed-rules';
    review.note = `${currentNote} Main/output Open and Earth Open are allowed. Each Close requires the other own control known Open; unknown prerequisites block. No Rack or additional local/key conditions are modeled for this exact pair. No source/earth relationship, baseline, physical hardware truth or actual switching permission is established. Historical construction review context (retained provenance; this selected local profile supersedes former unresolved local-review wording): ${review.note}`;
    review.evidence = uniqueReferences([...review.evidence, ...references]);
  }
  const evidence = uniqueReferences([...(model.interlocks!.reviews.find(review => review.assetId === main)!.evidence), ...(model.interlocks!.reviews.find(review => review.assetId === earth)!.evidence)]);
  model.interlocks!.rules.push(
    { id: `${id}:${main}:close`, assetId: main, position: 'closed', require: { kind: 'device', assetId: earth, position: 'open' }, explanation: 'Main/output Close requires its own earth switch known Open.', evidence },
    { id: `${id}:${earth}:close`, assetId: earth, position: 'closed', require: { kind: 'device', assetId: main, position: 'open' }, explanation: 'Earth Close requires its own main/output control known Open.', evidence },
  );
}
