import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

type Association = { cb: string; sw: string; bus: string; link: string; busLink: string };
const outgoing: Association[] = [
  ...['rm406', 'rm410'].flatMap(board => [1, 2, 3].map(number => ({ cb: `${board}:cb0${number}`, sw: `${board}:sw0${number + 1}`, bus: `${board}:bus:bar`, link: `${board}:cb0${number}-sw0${number + 1}`, busLink: `${board}:cb0${number}:bar` }))),
  ...[{ prefix: 'wh:h1', board: 'rm417' }, { prefix: 'wh:h9', board: 'rm419' }].flatMap(({ prefix, board }) => [1, 2].map(number => ({ cb: `${prefix}:${board}:cb0${number}`, sw: `${prefix}:${board}:sw0${number + 2}`, bus: `${prefix}:${board}:bus:bar`, link: `${prefix}:cb0${number}-sw0${number + 2}`, busLink: `${prefix}:cb0${number}-bus` }))),
];
const incoming = [
  { sw: 'rm406:sw01', bus: 'rm406:bus:bar', busLink: 'rm406:incoming-bar' },
  { sw: 'rm410:sw01', bus: 'rm410:bus:bar', busLink: 'rm410:incoming-bar' },
  { sw: 'wh:h1:rm417:sw01', bus: 'wh:h1:rm417:bus:bar', busLink: 'wh:h1:rm417:sw01-bus' },
  { sw: 'wh:h1:rm417:sw02', bus: 'wh:h1:rm417:bus:bar', busLink: 'wh:h1:rm417:sw02-bus' },
  { sw: 'wh:h9:rm419:sw01', bus: 'wh:h9:rm419:bus:bar', busLink: 'wh:h9:sw01-bus' },
  { sw: 'wh:h9:rm419:sw02', bus: 'wh:h9:rm419:bus:bar', busLink: 'wh:h9:sw02-bus' },
];
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];

/** Select only the exact owner55 local interactions; retain all installed-claim uncertainty. */
export function withOwnerRmuThreePositionProfiles(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-INTERLOCK-P13';
  if (base.evidence?.some(record => record.id === id)) throw new Error('P13 RMU profile already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required.');
  const group = inventory.groups.find(group => group.id === 'P13');
  const ids = [...outgoing.flatMap(pair => [pair.cb, pair.sw]), ...incoming.map(pair => pair.sw)];
  if (!group || ids.length !== 26 || new Set(ids).size !== 26 || group.assetIds.length !== 26 || new Set(group.assetIds).size !== 26 || group.assetIds.some(assetId => !ids.includes(assetId))) throw new Error('Review required: frozen P13 exact26 identity inventory changed.');
  const answer = 'Approve this complete profile for all26 controls';
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer55 exact: ${answer}. P13 has16 three-position switches and10 fixed Open/Close CBs. CB Open allowed; CB Close requires its associated SW Service. Every outgoing SW movement requires its own CB Open. Selecting Service/Earthed requires current Isolated; Isolated is allowed, subject to own CB Open for outgoing switches. Incoming/ring switches have no CB prerequisite. Unknown prerequisites block. No Rack or other local/key conditions are modeled for these exact assemblies. Complete V1 teaching profile only, not actual switching permission or installed hardware confirmation. Full recorded question: drawing-review/supplemental/owner-interlocks-review.md, Answer55.` };
  const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P13 exact26 identities and original per-asset document/revision/page/RMU-region references. CV line/cable/earth and western line/common/earth conventions remain distinct.' };
  const references: EvidenceReference[] = [ownerReference, inventoryReference];
  const sourceReferences = (evidenceIds: string[] = []) => evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []);
  const assertNoFixedBypass = (asset: Asset) => asset.conductivePairs.length === 0 && !asset.sourcePairs?.length && !asset.earthPairs?.length && asset.sourceArcs === undefined && !asset.removableBreaker && !asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length);
  const requireSwitch = (assetId: string) => {
    const asset = model.assets.find(asset => asset.id === assetId);
    const terminals = [`${assetId}:line`, `${assetId}:${assetId.startsWith('wh:') ? 'common' : 'cable'}`, `${assetId}:earth`];
    if (asset?.kind !== 'disconnector' || !assertNoFixedBypass(asset) || JSON.stringify(asset.terminals) !== JSON.stringify(terminals) || asset.positions.length !== 3 || JSON.stringify(asset.positions.find(position => position.id === 'service')?.pairs) !== JSON.stringify([[terminals[0], terminals[1]]]) || asset.positions.find(position => position.id === 'isolated')?.pairs.length !== 0 || JSON.stringify(asset.positions.find(position => position.id === 'earthed')?.pairs) !== JSON.stringify([[terminals[1], terminals[2]]]) || !model.earths?.some(termination => termination.terminal === terminals[2])) throw new Error(`Review required: source three-position terminal/earth mapping changed for ${assetId}.`);
    return asset;
  };
  const resolve = (assetId: string, relation: string, extraReferences: EvidenceReference[]) => {
    const review = model.interlocks!.reviews.find(review => review.assetId === assetId);
    const row = group.assets.find(row => row.assetId === assetId);
    if (!review || !row || review.status !== 'unresolved' || model.interlocks!.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P13 rules/review for ${assetId} changed; do not override them.`);
    review.status = 'confirmed-rules';
    review.note = `Owner answer55 selects the complete P13 local V1 profile. ${relation} Unknown prerequisites block; no Rack or other local/key conditions are modeled for this exact assembly. Source/earth relationships, physical hardware knowledge and actual switching permission remain separate. Historical construction review context (retained provenance; the selected local profile above supersedes former unresolved local-review wording): ${review.note}`;
    review.evidence = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference, ...extraReferences]);
    references.push(...review.evidence);
    return review.evidence;
  };
  for (const association of outgoing) {
    const { cb, sw, bus, link, busLink } = association;
    const breaker = model.assets.find(asset => asset.id === cb); const earthSwitch = requireSwitch(sw);
    const connection = model.connections.find(connection => connection.id === link);
    const input = model.connections.find(connection => connection.id === busLink);
    const pair = [`${cb}:a`, `${cb}:b`];
    if (breaker?.kind !== 'breaker' || !assertNoFixedBypass(breaker) || JSON.stringify(breaker.terminals) !== JSON.stringify(pair) || breaker.positions.length !== 2 || breaker.positions.find(position => position.id === 'open')?.pairs.length !== 0 || JSON.stringify(breaker.positions.find(position => position.id === 'closed')?.pairs) !== JSON.stringify([pair]) || connection?.from !== pair[1] || connection.to !== earthSwitch.terminals[0] || input?.from !== bus || input.to !== pair[0] || model.connections.filter(connection => connection.from === earthSwitch.terminals[0] || connection.to === earthSwitch.terminals[0]).length !== 1 || ![connection, input].every(connection => sourceReferences(connection?.evidenceIds).length)) throw new Error(`Review required: exact source-evidenced P13 CB/SW association changed for ${cb} / ${sw}.`);
    const relationReferences = [...sourceReferences(connection.evidenceIds), ...sourceReferences(input.evidenceIds)];
    const cbEvidence = resolve(cb, `Fixed CB Open is allowed. CB Close requires only its explicitly associated ${sw} known Service.`, relationReferences);
    const swEvidence = resolve(sw, `Every movement requires its explicitly associated ${cb} known Open. Selecting Service or Earthed requires its own current position known Isolated; Isolated has only the CB Open prerequisite.`, relationReferences);
    const cbOpen: InterlockCondition = { kind: 'device', assetId: cb, position: 'open' };
    const isolated: InterlockCondition = { kind: 'device', assetId: sw, position: 'isolated' };
    model.interlocks.rules.push({ id: `${id}:${cb}:close`, assetId: cb, position: 'closed', require: { kind: 'device', assetId: sw, position: 'service' }, explanation: 'Fixed CB Close requires its associated switch known Service.', evidence: cbEvidence });
    for (const position of ['service', 'isolated', 'earthed']) model.interlocks.rules.push({ id: `${id}:${sw}:${position}`, assetId: sw, position, require: position === 'isolated' ? cbOpen : { kind: 'all', conditions: [cbOpen, isolated] }, explanation: position === 'isolated' ? 'Outgoing switch movement requires its own CB known Open.' : 'Outgoing switch selection requires its own CB known Open and its own current position known Isolated; pass through Isolated.', evidence: swEvidence });
  }
  for (const { sw, bus, busLink } of incoming) {
    const asset = requireSwitch(sw);
    const connection = model.connections.find(connection => connection.id === busLink);
    if (connection?.from !== asset.terminals[1] || connection.to !== bus || sourceReferences(connection.evidenceIds).length === 0) throw new Error(`Review required: source-evidenced P13 incoming/ring bus association changed for ${sw}.`);
    const evidence = resolve(sw, 'This incoming/ring switch has no separate CB prerequisite. Selecting Service or Earthed requires its own current position known Isolated; selecting Isolated is allowed.', sourceReferences(connection.evidenceIds));
    for (const position of ['service', 'earthed']) model.interlocks.rules.push({ id: `${id}:${sw}:${position}`, assetId: sw, position, require: { kind: 'device', assetId: sw, position: 'isolated' }, explanation: 'Incoming/ring switch selection requires its own current position known Isolated; pass through Isolated. No separate CB prerequisite.', evidence });
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(references), summary: 'Owner55 selects the complete named P13 teaching interactions. Direct builder connections validate each CB/SW identity only; no physical permissive is inferred from wiring. Selected baselines, terminal/earth relationships, hardware knowledge, topology, sources and unrelated reviews remain unchanged. This is not operational permission or whole-model acceptance.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P13 exact local action profile only; source/earth transfer, physical hardware and whole-model acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  return model;
}
