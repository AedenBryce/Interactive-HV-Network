import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

type GroupId = 'P14' | 'P15' | 'P16';
type Pair = { group: GroupId; main: string; earth: string; kind: 'breaker' | 'disconnector'; first: 'a' | 'in'; last: 'b' | 'out'; earthSide: 'a' | 'b' | 'in'; bus: string; busLink: string; intoBus: boolean };
const pairs: Pair[] = [
  ...['01', '02'].map(number => ({ group: 'P14' as const, main: `wh:h7:rm418:sw${number}`, earth: `wh:h7:rm418:sw${number}:es`, kind: 'disconnector' as const, first: 'a' as const, last: 'b' as const, earthSide: 'a' as const, bus: 'wh:h7:rm418:bus:bar', busLink: `wh:h7:sw${number}-bus`, intoBus: true })),
  { group: 'P15', main: 'rm420:sw01', earth: 'rm420:es01', kind: 'disconnector', first: 'in', last: 'out', earthSide: 'in', bus: 'rm420:bus:port', busLink: 'rm420:incoming:bus-link', intoBus: true },
  ...(['in01', 'in02', 'rm412', 'rm713'] as const).map(suffix => ({ group: 'P16' as const, main: `rm721:${suffix}`, earth: `rm721:${suffix}:es`, kind: suffix === 'in02' || suffix === 'rm412' ? 'breaker' as const : 'disconnector' as const, first: 'a' as const, last: 'b' as const, earthSide: suffix === 'in01' ? 'a' as const : 'b' as const, bus: 'rm721:bus:bar', busLink: suffix === 'in01' ? 'rm721:in01-bar' : `rm721:${suffix}:bar`, intoBus: suffix === 'in01' })),
];
const trios = [
  ...['03', '04'].map(number => ({ group: 'P14' as const, cb: `wh:h7:rm418:cb${number}`, ds: `wh:h7:rm418:cb${number}:disconnect`, es: `wh:h7:rm418:cb${number}:earth`, first: 'a', last: 'b', bus: 'wh:h7:rm418:bus:bar', busLink: `wh:h7:rm418:cb${number}:bus-link`, disconnectLink: `wh:h7:rm418:cb${number}:disconnect-link` })),
  ...['tf420a', 'tf420b', 'spare'].map(feeder => ({ group: 'P15' as const, cb: `rm420:${feeder}:cb`, ds: `rm420:${feeder}:sw`, es: `rm420:${feeder}:es`, first: 'in', last: 'out', bus: 'rm420:bus:port', busLink: `rm420:${feeder}:bus-cb`, disconnectLink: `rm420:${feeder}:cb-sw` })),
];
const decisions = {
  P14: { answer: 'Approve this complete profile for all10 controls', number: 59, count: 10, note: 'Hopper7 RM418 line main/earth pairs and fixed CB/descriptive-disconnect/earth assemblies. Descriptive disconnect identities are retained; printed tags remain Unconfirmed. No additional local/key conditions are modeled.' },
  P15: { answer: 'Apply this complete local profile to all11 controls', number: 60, count: 11, note: 'Hopper10 RM420 incoming main/earth pair and three fixed CB/disconnector/earth assemblies. Only the listed Ronis key sequences are deferred under owner49; the separately selected local prerequisites remain mandatory.' },
  P16: { answer: 'Use this complete profile for all4 pairs', number: 61, count: 8, note: 'RM721 IN01, IN02, RM412 and RM713 main/earth pairs. No additional local/key conditions are modeled.' },
};
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const unique = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];
const position = (assetId: string, value: string): InterlockCondition => ({ kind: 'device', assetId, position: value });
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Apply only the exact owner-selected local profiles; preserve electrical claims. */
export function withOwnerRmuSeparatedProfiles(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Separated RMU profiles require a new immutable model version.');
  if (base.evidence?.some(record => Object.keys(decisions).some(group => record.id === `WN-INTERLOCK-${group}`))) throw new Error('Separated RMU profiles already applied; use the prior immutable package.');
  const deferral = base.evidence?.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING');
  if (deferral?.status !== 'owner-confirmed' || deferral.confirmation?.decision !== 'Explicitly defer these listed sequences for V1'
    || !base.reviews?.some(review => review.id === deferral.id && review.status === 'resolved' && review.evidenceIds.includes(deferral.id))
    || !deferral.references.some(reference => reference.document === 'drawing-review/supplemental/interlock-profile-review.json' && reference.clause?.startsWith('P15: exact 11'))) throw new Error('Owner49 bounded P15 Ronis key deferral is required before applying the local profile.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing separated RMU interlock reviews are required.');
  const references = new Map<GroupId, EvidenceReference[]>();
  const sourceReferences = (ids: string[] = []) => ids.flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
  const bus = (terminal: string) => {
    const asset = model.assets.find(asset => asset.terminals.includes(terminal));
    if (asset?.kind !== 'bus' || !same(asset.terminals, [terminal])) throw new Error(`Review required: separated RMU bus ${terminal} changed.`);
  };
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(connection => connection.id === id);
    const refs = sourceReferences(link?.evidenceIds);
    if (link?.from !== from || link.to !== to || !refs.length) throw new Error(`Review required: source-evidenced separated RMU connection ${id} changed.`);
    return refs;
  };
  const binary = (id: string, kind: Asset['kind'], first: string, last: string) => {
    const asset = model.assets.find(asset => asset.id === id);
    const terminals = [`${id}:${first}`, `${id}:${last}`];
    if (asset?.kind !== kind || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector || !same(asset.terminals, terminals)
      || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined
      || asset.positions.length !== 2 || asset.positions.find(option => option.id === 'open')?.pairs.length !== 0
      || !same(asset.positions.find(option => option.id === 'closed')?.pairs, [terminals])
      || asset.positions.some(option => option.sourcePairs?.length || option.earthPairs?.length)) throw new Error(`Review required: exact fixed Open/Close mechanism ${id} changed.`);
  };
  const earth = (id: string, first: string, last: string, from: string) => {
    binary(id, 'earth-switch', first, last);
    if (!model.earths?.some(termination => termination.terminal === `${id}:${last}`)
      || model.connections.filter(link => link.from === `${id}:${first}` || link.to === `${id}:${first}`).length !== 1) throw new Error(`Review required: exact earth branch/termination ${id} changed.`);
    return branch(`${id}:branch`, from, `${id}:${first}`);
  };
  for (const groupId of Object.keys(decisions) as GroupId[]) {
    const decision = decisions[groupId]; const id = `WN-INTERLOCK-${groupId}`;
    const ids = [...pairs.filter(pair => pair.group === groupId).flatMap(pair => [pair.main, pair.earth]), ...trios.filter(trio => trio.group === groupId).flatMap(trio => [trio.cb, trio.ds, trio.es])];
    const group = inventory.groups.find(group => group.id === groupId);
    if (!group || ids.length !== decision.count || new Set(ids).size !== ids.length || group.assetIds.length !== ids.length || group.assetIds.some(assetId => !ids.includes(assetId))) throw new Error(`Review required: frozen ${groupId} identity inventory changed.`);
    const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer${decision.number} exact: ${decision.answer}. Complete selected V1 local profile in drawing-review/supplemental/owner-interlocks-review.md. Open/Close only, no racking. Main/earth pairs: each Close requires its own counterpart known Open; Open allowed. CB/DS/ES trios: CB Open allowed; CB Close requires DS Closed and ES Open; DS Open requires CB Open; DS Close requires CB Open and ES Open; ES Close requires CB Open and DS Open; ES Open allowed. Unknown prerequisites block. ${decision.note} This is a teaching profile, not actual switching permission or acceptance of unrelated hardware/source/earth claims.` };
    const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: `${groupId}: exact ${ids.length} named controls and original drawing/revision/page/region references.` };
    const refs: EvidenceReference[] = [ownerReference, inventoryReference, ...group.references.map(reference => ({ document: reference.document, revision: reference.revision, page: reference.page, clause: reference.region }))];
    if (groupId === 'P15') refs.push(...deferral.references.filter(reference => reference.document === 'Project owner conversation' || reference.clause?.startsWith('P15: exact 11')));
    for (const assetId of ids) {
      const asset = model.assets.find(asset => asset.id === assetId);
      const row = group.assets.find(row => row.assetId === assetId);
      const review = model.interlocks.reviews.find(review => review.assetId === assetId);
      if (!asset || !row || asset.kind !== row.kind || !review || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing ${groupId} asset/rules/review ${assetId} changed; do not override them.`);
      review.status = 'confirmed-rules';
      review.note = `Owner answer${decision.number} selects this exact ${groupId} complete fixed Open/Close-only local profile. ${decision.note} Unknown prerequisites block. The declared rules retain each named main/earth or CB/disconnector/earth dependency; unlisted Open actions have the explicitly selected absence of additional prerequisites. Source/earth relationships, hardware knowledge, baseline and actual switching permission remain separate. Historical construction review context (retained provenance; the selected local profile above supersedes former unresolved local-review wording): ${review.note}`;
      review.evidence = unique([...review.evidence, ...row.references, ...refs]);
      refs.push(...row.references, ...review.evidence);
    }
    references.set(groupId, refs);
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: decision.answer };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: unique(refs), summary: `Owner${decision.number} selects only the exact ${groupId} local teaching profile. ${decision.note} No topology, baseline, source/earth relationships or equipment claim knowledge is promoted. Actual switching permission and whole-model acceptance remain separate.` });
    (model.reviews ??= []).push({ id, status: 'resolved', question: `${groupId} selected local action profile only; physical identities, source/earth paths and whole-model acceptance remain separate.`, evidenceIds: [id], resolution: confirmation });
  }
  const add = (group: GroupId, assetId: string, target: string, require: InterlockCondition, explanation: string, relationReferences: EvidenceReference[]) => {
    const evidence = unique([...references.get(group)!, ...relationReferences]);
    model.interlocks!.rules.push({ id: `WN-INTERLOCK-${group}:${assetId}:${target}`, assetId, position: target, require, explanation, evidence });
    const review = model.interlocks!.reviews.find(review => review.assetId === assetId)!;
    review.evidence = unique([...review.evidence, ...relationReferences]);
  };
  for (const pair of pairs) {
    bus(pair.bus);
    binary(pair.main, pair.kind, pair.first, pair.last);
    const refs = earth(pair.earth, pair.first, pair.last, `${pair.main}:${pair.earthSide}`);
    refs.push(...branch(pair.busLink, pair.intoBus ? `${pair.main}:${pair.last}` : pair.bus, pair.intoBus ? pair.bus : `${pair.main}:${pair.first}`));
    add(pair.group, pair.main, 'closed', position(pair.earth, 'open'), 'Main Close requires its own earth switch known Open.', refs);
    add(pair.group, pair.earth, 'closed', position(pair.main, 'open'), 'Earth Close requires its own main control known Open.', refs);
  }
  for (const trio of trios) {
    bus(trio.bus);
    binary(trio.cb, 'breaker', trio.first, trio.last); binary(trio.ds, 'disconnector', trio.first, trio.last);
    if (model.connections.filter(link => link.from === `${trio.ds}:${trio.first}` || link.to === `${trio.ds}:${trio.first}`).length !== 1) throw new Error(`Review required: separated RMU disconnector input ${trio.ds} changed.`);
    const refs = earth(trio.es, trio.first, trio.last, `${trio.ds}:${trio.last}`);
    refs.push(...branch(trio.busLink, trio.bus, `${trio.cb}:${trio.first}`), ...branch(trio.disconnectLink, `${trio.cb}:${trio.last}`, `${trio.ds}:${trio.first}`));
    add(trio.group, trio.cb, 'closed', all(position(trio.ds, 'closed'), position(trio.es, 'open')), 'CB Close requires its own disconnector Closed and earth switch Open.', refs);
    add(trio.group, trio.ds, 'open', position(trio.cb, 'open'), 'Disconnector Open requires its own breaker Open.', refs);
    add(trio.group, trio.ds, 'closed', all(position(trio.cb, 'open'), position(trio.es, 'open')), 'Disconnector Close requires its own breaker and earth switch Open.', refs);
    add(trio.group, trio.es, 'closed', all(position(trio.cb, 'open'), position(trio.ds, 'open')), 'Earth Close requires its own breaker and disconnector Open.', refs);
  }
  return model;
}
