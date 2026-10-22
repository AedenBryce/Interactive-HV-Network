import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

type Pair = { cb: string; es: string; cbTerminals: [string, string]; branchTerminal: string; line: string; earth: string };
function pair(prefix: string, side: 'a' | 'b' = 'b', hv = false): Pair {
  const cb = `${prefix}:${hv ? 'hv-cb' : 'cb'}`; const es = `${prefix}:${hv ? 'hv-es' : 'es'}`;
  return { cb, es, cbTerminals: [`${cb}:a`, `${cb}:b`], branchTerminal: `${cb}:${side}`, line: `${es}:a`, earth: `${es}:b` };
}
function inOutPair(prefix: string, side: 'in' | 'out', hv = false): Pair {
  const cb = `${prefix}:${hv ? 'hv-cb' : 'cb'}`; const es = `${prefix}:${hv ? 'hv-es' : 'es'}`;
  return { cb, es, cbTerminals: [`${cb}:in`, `${cb}:out`], branchTerminal: `${cb}:${side}`, line: `${es}:in`, earth: `${es}:out` };
}

// Named bay assignments and cable-side endpoints are copied from the board
// builders/source records. The inventory's presentation order does not pair them.
const hvPairs: Pair[] = [
  pair('mine:sw441:in', 'a'), pair('mine:tf441'),
  ...['station:sb01:f4', 'station:sb02:f1', 'station:sb02:f4'].map(prefix => inOutPair(prefix, 'out')),
  pair('sw421:in', 'a'), ...['sw421:spare:tier2', 'sw421:spare:tier7'].map(prefix => pair(prefix)),
  ...['sw421:tf421', 'sw421:tf422', 'sw421:tf423'].map(prefix => pair(prefix, 'b', true)),
  pair('sw426:in', 'a'), ...['sw426:ss714', 'sw426:tf426', 'sw426:tf427', 'sw426:tf428', 'sw426:tf429', 'sw426:tf430', 'sw426:tf439', 'sw426:tf440', 'sw426:tf443'].map(prefix => pair(prefix)),
  pair('sw431:in', 'a'), pair('sw431:sw435'),
  ...['sw431:tf431', 'sw431:tf432', 'sw431:tf437', 'sw431:tf442'].map(prefix => pair(prefix, 'b', true)),
  pair('sw435:in', 'a'), pair('sw435:sw431'),
  ...['sw435:tf433', 'sw435:tf435', 'sw435:tf436', 'sw435:tf453'].map(prefix => pair(prefix, 'b', true)),
  inOutPair('sw451:in', 'in'), ...['sw451:spare-2', 'sw451:spare-6', 'sw451:spare-7'].map(prefix => inOutPair(prefix, 'out')),
  ...['sw451:tf451', 'sw451:tf452'].map(prefix => inOutPair(prefix, 'out', true)),
  pair('sw454:in', 'a'), pair('sw454:sw505'),
  ...['sw454:tf454', 'sw454:tf455', 'sw454:tf456'].map(prefix => pair(prefix, 'b', true)),
  pair('sw505:in', 'a'), ...['sw505:tf506', 'sw505:tf507', 'sw505:tf508'].map(prefix => pair(prefix, 'b', true)),
];
const lvIds = [
  'mc454:in:cb', 'mine:mc441:in', 'rm406:mc406a:cb', 'rm410:mc410a:cb', 'rm413:mc413:cb', 'rm420:mc420a:in:acb', 'rm714:sw714:in:cb',
  'sw421:mc421:cb', 'sw421:mc422:cb', 'sw421:sw423:d:cb', 'sw421:sw423:y:cb',
  'sw426:mc426:in:cb', 'sw426:mc428a:in:cb', 'sw426:mc430:in:cb', 'sw426:sw427:d:in:cb', 'sw426:sw427:y:in:cb', 'sw426:sw429:d:in:cb', 'sw426:sw429:y:in:cb',
  'sw426:sw439:d:in:cb', 'sw426:sw439:y:in:cb', 'sw426:sw440:d:in:cb', 'sw426:sw440:y:in:cb', 'sw426:sw443:d:in:cb', 'sw426:sw443:y:in:cb',
  'sw431:mc431:cb', 'sw431:sw432:d:cb', 'sw431:sw432:y:cb', 'sw431:sw437:d:cb', 'sw431:sw437:y:cb', 'sw431:sw442:d:cb', 'sw431:sw442:y:cb',
  'sw435:mc435:cb', 'sw435:sw433:d:cb', 'sw435:sw433:y:cb', 'sw435:sw453:d:cb', 'sw435:sw453:y:cb',
  'sw451:mc451:cb', 'sw451:sw452:d:cb', 'sw451:sw452:y:cb', 'sw454:sw456:d:cb', 'sw454:sw456:y:cb', 'sw455:in-d:cb', 'sw455:in-y:cb',
  'sw505:mc507:cb', 'sw505:mc508:cb', 'sw505:sw506:d:cb', 'sw505:sw506:y:cb', 'wh:h9:mc419a:in',
];
const tieId = 'sw411:bus-tie:cb';
const busEarthIds = ['sw411:bus-a:es', 'sw411:bus-b:es'];
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];

export function withOwnerAdditionalInterlocks(base: NetworkModel, version: string): NetworkModel {
  const decisions = [
    { id: 'WN-INTERLOCK-P01', group: 'P01', answer: 'Apply this matrix to all48 pairs', question: 'For the 48 exact named CB/ES pairs, apply the previously approved SW411 local matrix with known prerequisites; deferred cross-station key sequences excluded.' },
    { id: 'WN-INTERLOCK-P04', group: 'P04', answer: 'Use these complete local restrictions', question: 'For the exact 48 LV removable breakers, use intrinsic contact/racking restrictions only, with independent D/Y branches and no additional declared local rules.' },
    { id: 'WN-INTERLOCK-P03', group: 'P03', answer: 'Approve this bus-tie profile', question: 'SW411 bus-tie Open requires Rack in; Close requires Rack in and both bus earths Open; Rack out requires contact Open; Rack in requires contact Open and both bus earths Open. Unknown prerequisites block.' },
  ];
  if (decisions.some(decision => base.evidence?.some(record => record.id === decision.id))) throw new Error('Additional interlock profiles already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing interlock reviews are required.');
  const selected = { P01: hvPairs.flatMap(pair => [pair.cb, pair.es]), P04: lvIds, P03: [tieId] };
  const references = new Map<string, EvidenceReference[]>();
  for (const decision of decisions) {
    const group = inventory.groups.find(group => group.id === decision.group)!;
    const ids = selected[decision.group as keyof typeof selected];
    if (!group || new Set(ids).size !== ids.length || group.assetIds.length !== ids.length || group.assetIds.some(id => !ids.includes(id))) throw new Error(`Review required: frozen ${decision.group} identity inventory changed.`);
    const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer${decision.group === 'P01' ? '42' : decision.group === 'P04' ? '43' : '44'} exact: ${decision.answer}. ${decision.question} Scoped V1 simulation profile, not actual switching permission or installed truth-table verification.` };
    const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: `${decision.group}: exact ${ids.length} asset identities and per-asset original source references approved by this answer.` };
    const groupReferences: EvidenceReference[] = [ownerReference, inventoryReference];
    for (const assetId of ids) {
      const asset = model.assets.find(asset => asset.id === assetId);
      const review = model.interlocks.reviews.find(review => review.assetId === assetId);
      const row = group.assets.find(row => row.assetId === assetId);
      if (!asset || !review || !row || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing rules/review for ${assetId} changed; do not override them.`);
      if ((decision.group !== 'P01' || asset.kind === 'breaker') && !asset.removableBreaker) throw new Error(`Review required: ${assetId} no longer has the selected removable mechanism.`);
      const refs = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference]);
      references.set(assetId, refs); groupReferences.push(...refs);
      review.status = decision.group === 'P04' ? 'confirmed-none' : 'confirmed-rules';
      const historicalNote = review.note;
      review.note = decision.group === 'P04'
        ? 'Owner answer43 selects intrinsic known-prerequisite contact/racking guards as the complete V1 local restrictions for this exact LV breaker. Confirmed-none means no additional declared local rules; intrinsic guards remain mandatory. Independent D/Y branches acquire no cross-rule. This is not actual switching permission.'
        : decision.group === 'P01'
          ? 'Owner answer42 selects the complete V1 SW411-style local matrix for this explicitly associated CB/ES pair. ES Open has no additional prerequisite; the other five actions enforce the declared known conditions. Deferred cross-station key sequences remain excluded. This does not confirm installed physical truth or actual switching permission.'
          : 'Owner answer44 selects the scoped V1 bus-tie profile, including both bus-earth Open prerequisites for Close/Rack in. Bus-earth controls retain their own unresolved review. Intrinsic guards remain mandatory; no actual switching permission is established.';
      review.note += ` Historical construction review context (retained provenance; the selected model profile above supersedes its former unresolved runtime-review wording): ${historicalNote}`;
      review.evidence = refs;
    }
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: decision.answer };
    (model.evidence ??= []).push({ id: decision.id, status: 'owner-confirmed', confirmation, references: uniqueReferences(groupReferences), summary: `${decision.question} Exact answer: ${decision.answer}. Baseline, topology and equipment claim knowledge are unchanged.` });
    (model.reviews ??= []).push({ id: decision.id, status: 'resolved', question: decision.question, evidenceIds: [decision.id], resolution: confirmation });
  }
  for (const association of hvPairs) {
    const { cb, es, cbTerminals, branchTerminal, line, earth } = association;
    const breaker = model.assets.find(asset => asset.id === cb)!;
    const earthSwitch = model.assets.find(asset => asset.id === es)!;
    const branch = model.connections.find(connection => connection.id === `${es}:branch`);
    const branchReferences = (branch?.evidenceIds ?? []).flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
    if (JSON.stringify(breaker.removableBreaker?.mainPair) !== JSON.stringify(cbTerminals)
      || earthSwitch.kind !== 'earth-switch' || JSON.stringify(earthSwitch.terminals) !== JSON.stringify([line, earth])
      || JSON.stringify(earthSwitch.positions.find(position => position.id === 'closed')?.pairs) !== JSON.stringify([[line, earth]])
      || earthSwitch.positions.find(position => position.id === 'open')?.pairs.length !== 0
      || !model.earths?.some(termination => termination.terminal === earth)
      || branch?.from !== branchTerminal || branch.to !== line || branchReferences.length === 0
      || model.connections.filter(connection => connection.from === line || connection.to === line).length !== 1) throw new Error(`Review required: source-evidenced CB/ES terminal association changed for ${cb} / ${es}.`);
    const evidence = uniqueReferences([...references.get(cb)!, ...references.get(es)!, ...branchReferences]);
    const contactOpen: InterlockCondition = { kind: 'device', assetId: cb, axis: 'contact', value: 'open' };
    const rackIn: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'in' };
    const rackOut: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'out' };
    const earthOpen: InterlockCondition = { kind: 'device', assetId: es, position: 'open' };
    const common = { evidence };
    model.interlocks.rules.push(
      { ...common, id: `WN-INTERLOCK-P01:${cb}:open`, assetId: cb, command: { kind: 'contact', value: 'open' }, require: rackIn, explanation: 'Breaker Open requires known Rack in.' },
      { ...common, id: `WN-INTERLOCK-P01:${cb}:close`, assetId: cb, command: { kind: 'contact', value: 'closed' }, require: { kind: 'all', conditions: [rackIn, earthOpen] }, explanation: 'Breaker Close requires known Rack in and its own earth switch Open.' },
      { ...common, id: `WN-INTERLOCK-P01:${cb}:rack-out`, assetId: cb, command: { kind: 'racking', value: 'out' }, require: contactOpen, explanation: 'Rack out requires the breaker known Open.' },
      { ...common, id: `WN-INTERLOCK-P01:${cb}:rack-in`, assetId: cb, command: { kind: 'racking', value: 'in' }, require: { kind: 'all', conditions: [contactOpen, earthOpen] }, explanation: 'Rack in requires the breaker and its own earth switch known Open.' },
      { ...common, id: `WN-INTERLOCK-P01:${es}:close`, assetId: es, position: 'closed', require: { kind: 'all', conditions: [contactOpen, rackOut] }, explanation: 'Earth switch Close requires its breaker known Open and Rack out.' },
    );
  }
  for (const assetId of busEarthIds) {
    const asset = model.assets.find(asset => asset.id === assetId);
    if (asset?.kind !== 'earth-switch' || !asset.positions.some(position => position.id === 'open')) throw new Error(`Review required: bus-earth prerequisite ${assetId} changed.`);
  }
  const contactOpen: InterlockCondition = { kind: 'device', assetId: tieId, axis: 'contact', value: 'open' };
  const rackIn: InterlockCondition = { kind: 'device', assetId: tieId, axis: 'racking', value: 'in' };
  const earthsOpen: InterlockCondition[] = busEarthIds.map(assetId => ({ kind: 'device', assetId, position: 'open' }));
  const common = { assetId: tieId, evidence: uniqueReferences([...references.get(tieId)!, ...busEarthIds.flatMap(id => model.interlocks!.reviews.find(review => review.assetId === id)?.evidence ?? [])]) };
  model.interlocks.rules.push(
    { ...common, id: 'WN-INTERLOCK-P03:open', command: { kind: 'contact', value: 'open' }, require: rackIn, explanation: 'Bus-tie Open requires known Rack in.' },
    { ...common, id: 'WN-INTERLOCK-P03:close', command: { kind: 'contact', value: 'closed' }, require: { kind: 'all', conditions: [rackIn, ...earthsOpen] }, explanation: 'Bus-tie Close requires known Rack in and both SW411 bus earths Open.' },
    { ...common, id: 'WN-INTERLOCK-P03:rack-out', command: { kind: 'racking', value: 'out' }, require: contactOpen, explanation: 'Bus-tie Rack out requires known contact Open.' },
    { ...common, id: 'WN-INTERLOCK-P03:rack-in', command: { kind: 'racking', value: 'in' }, require: { kind: 'all', conditions: [contactOpen, ...earthsOpen] }, explanation: 'Bus-tie Rack in requires known contact Open and both SW411 bus earths Open.' },
  );
  return model;
}
