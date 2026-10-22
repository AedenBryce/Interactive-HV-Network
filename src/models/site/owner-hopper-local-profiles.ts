import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const motorProfileId = 'WN-INTERLOCK-P07';
const incomingProfileId = 'WN-INTERLOCK-P06';
const deferralId = 'WN-DEFERRED-KEY-DOOR-INCHING';
const answer50 = 'COrrect, but the contactors are also removable and require racking out before closing earths. follows same rules around opening/racking as the other circuit breakers';
const answer51 = 'Confirm this profile and Open/Rack in baseline';
const answer52 = 'Apply this local matrix to all6 pairs';
const motors = [
  ...['rm420:mc420:motor-01', 'rm420:mc420:motor-02'].map(prefix => ({ prefix, first: 'in', last: 'out', earthId: `${prefix}:es`, common: `${prefix}:output:port`, outputLink: 'contact-motor' })),
  ...['wh:h1:mc417', 'wh:h3:mc416', 'wh:h7:mc418', 'wh:h8:mc416', 'wh:h9:mc419'].flatMap(board => [1, 2].map(motor => {
    const prefix = `${board}:m${motor}`;
    return { prefix, first: 'a', last: 'b', earthId: `${prefix}:earth`, common: `${prefix}:common:port`, outputLink: 'common-link' };
  })),
];
const incomers = [
  { cb: 'rm420:mc420:in:vcb', es: 'rm420:mc420:in:es', first: 'in', last: 'out' },
  ...['wh:h1:mc417', 'wh:h3:mc416', 'wh:h7:mc418', 'wh:h8:mc416', 'wh:h9:mc419'].map(prefix => ({ cb: `${prefix}:in`, es: `${prefix}:in-earth`, first: 'a', last: 'b' })),
];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const uniqueReferences = (references: EvidenceReference[]) => [...new Map(references.map(reference => [JSON.stringify(reference), reference])).values()];
const contactOpen = (assetId: string): InterlockCondition => ({ kind: 'device', assetId, axis: 'contact', value: 'open' });
const rackIn = (assetId: string): InterlockCondition => ({ kind: 'device', assetId, axis: 'racking', value: 'in' });
const rackOut = (assetId: string): InterlockCondition => ({ kind: 'device', assetId, axis: 'racking', value: 'out' });
const earthOpen = (assetId: string): InterlockCondition => ({ kind: 'device', assetId, position: 'open' });
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Select only the named P06/P07 simulation profiles after their bounded key deferral. */
export function withOwnerHopperLocalProfiles(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => [motorProfileId, incomingProfileId].includes(record.id))) throw new Error('Hopper local profiles already applied; use the prior immutable package.');
  const deferral = base.evidence?.find(record => record.id === deferralId);
  const scopeReview = base.reviews?.find(record => record.id === deferralId);
  if (deferral?.status !== 'owner-confirmed' || deferral.confirmation?.decision !== 'Explicitly defer these listed sequences for V1'
    || scopeReview?.status !== 'resolved' || !scopeReview.evidenceIds.includes(deferralId)
    || !['P06', 'P07'].every(group => deferral.references.some(reference => reference.document === 'drawing-review/supplemental/interlock-profile-review.json' && reference.clause?.startsWith(`${group}: exact `)))) throw new Error('Review required: owner49 bounded P06/P07 key/door sequence scope must be recorded before enabling local profiles.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Existing hopper interlock reviews are required.');
  const groupIds = {
    P07: motors.flatMap(motor => [`${motor.prefix}:fc`, `${motor.prefix}:rc`, motor.earthId]),
    P06: incomers.flatMap(incoming => [incoming.cb, incoming.es]),
  };
  if (motors.length !== 12 || groupIds.P07.length !== 36 || incomers.length !== 6 || groupIds.P06.length !== 12) throw new Error('Review required: hopper profile identity inventory changed.');
  const sourceReferences = (ids: string[] = []) => ids.flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
  function branch(id: string, from: string, to: string) {
    const link = model.connections.find(connection => connection.id === id);
    const references = sourceReferences(link?.evidenceIds);
    if (link?.from !== from || link.to !== to || references.length === 0) throw new Error(`Review required: source-evidenced hopper branch ${id} changed.`);
    return references;
  }
  function guardEarth(id: string, first: string, last: string, from: string) {
    const asset = model.assets.find(asset => asset.id === id);
    const terminals = [`${id}:${first}`, `${id}:${last}`];
    if (asset?.kind !== 'earth-switch' || !same(asset.terminals, terminals) || asset.positions.length !== 2
      || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined
      || asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length)
      || asset.positions.find(position => position.id === 'open')?.pairs.length !== 0
      || !same(asset.positions.find(position => position.id === 'closed')?.pairs, [terminals])
      || !model.earths?.some(earth => earth.terminal === terminals[1])
      || model.connections.filter(connection => connection.from === terminals[0] || connection.to === terminals[0]).length !== 1) throw new Error(`Review required: hopper earth mapping ${id} changed.`);
    return branch(`${id}:branch`, from, terminals[0]);
  }
  const references = new Map<string, EvidenceReference[]>();
  const deferralReferences = deferral.references.filter(reference => reference.document === 'Project owner conversation' && reference.clause?.includes(deferralId));
  if (!deferralReferences.length) throw new Error('Review required: the exact owner49 scope reference is missing.');
  for (const groupId of ['P07', 'P06'] as const) {
    const group = inventory.groups.find(group => group.id === groupId);
    const ids = groupIds[groupId];
    if (!group || new Set(ids).size !== ids.length || group.assetIds.length !== ids.length || group.assetIds.some(id => !ids.includes(id))) throw new Error(`Review required: frozen ${groupId} identities changed.`);
    const id = groupId === 'P07' ? motorProfileId : incomingProfileId;
    const answer = groupId === 'P07' ? `${answer50}\n${answer51}` : answer52;
    const clause = groupId === 'P07'
      ? 'Answers50/51 select exactly24 FC/RC contactors as removable, each initially Open/Rack in. Own Open requires Rack in; own Rack out requires Open; own Rack in requires Open and maintenance earth Open. FC Close requires own Rack in, RC Open and earth Open; RC Close requires own Rack in, FC Open and earth Open. Maintenance Earth Close requires both contacts Open and both Rack out; Earth Open allowed. Unknown prerequisites block.'
      : 'Answer52 selects exactly six existing MV incoming CB/ES pairs: CB Open requires Rack in; Close requires Rack in and own ES Open; Rack out requires CB Open; Rack in requires CB Open and own ES Open; ES Open allowed; ES Close requires CB Open and Rack out. Unknown prerequisites block. Existing breaker baselines are preserved.';
    const ownerReference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `${clause} Exact answer(s): ${answer}. Only the listed key/door sequences are deferred under49; no physical switching permission, source/earth transfer or unrelated hardware is established.` };
    const inventoryReference = { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: `${groupId}: exact ${ids.length} named controls and their original document/revision/page/region references; terminal associations guarded separately against existing source-evidenced branches.` };
    const profileReferences: EvidenceReference[] = [ownerReference, inventoryReference, ...deferralReferences];
    for (const assetId of ids) {
      const review = model.interlocks.reviews.find(review => review.assetId === assetId);
      const row = group.assets.find(row => row.assetId === assetId);
      const asset = model.assets.find(asset => asset.id === assetId);
      if (!asset || !review || !row || asset.kind !== row.kind || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing local mechanism/rules/review for ${assetId} changed; do not override them.`);
      const refs = uniqueReferences([...review.evidence, ...row.references, ownerReference, inventoryReference, ...deferralReferences]);
      references.set(assetId, refs); profileReferences.push(...refs);
      review.status = 'confirmed-rules';
      review.note = `Owner ${groupId === 'P07' ? 'answers50/51 select the complete V1 removable FC/RC/maintenance-earth profile and Open/Rack in contactor baseline' : 'answer52 selects the complete V1 MV incoming CB/ES local profile, preserving its existing baseline'}. Known prerequisites block when unconfirmed. Only this listed key/door sequence is not modeled under owner49; contact/racking/earth guards remain mandatory. Source/earth behavior, actual hardware/positions and actual switching permission remain separate. Historical construction review context (retained provenance; the selected local profile above supersedes former unresolved runtime-review wording): ${review.note}`;
      review.evidence = refs;
    }
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: uniqueReferences(profileReferences), summary: `${clause} Key/door sequence scope is separately recorded by ${deferralId}. This is the selected local simulation profile and, for the 24 contactors only, a racking-model/baseline selection. Original equipment knowledge, fixed earth relationships, source policy and all other baseline values remain unchanged. It is not physical switching permission or whole-model acceptance.` });
    (model.reviews ??= []).push({ id, status: 'resolved', question: `${clause} Scope is the named V1 local action profile, not field hardware/interlock acceptance.`, evidenceIds: [id, deferralId], resolution: confirmation });
  }
  for (const motor of motors) {
    const fc = `${motor.prefix}:fc`; const rc = `${motor.prefix}:rc`; const es = motor.earthId;
    const associationReferences = guardEarth(es, motor.first, motor.last, motor.common);
    for (const assetId of [fc, rc]) {
      const asset = model.assets.find(asset => asset.id === assetId)!;
      const pair: [string, string] = [`${assetId}:${motor.first}`, `${assetId}:${motor.last}`];
      const closed = asset.positions.find(position => position.id === 'closed');
      if (asset.kind !== 'contactor' || asset.removableBreaker || asset.removableContactor || asset.positions.length !== 2
        || !same(asset.terminals, pair) || !same(closed?.pairs, [pair]) || asset.positions.find(position => position.id === 'open')?.pairs.length !== 0
        || asset.conductivePairs.length || asset.sourcePairs?.length || asset.sourceArcs !== undefined
        || asset.positions.some(position => position.sourcePairs?.length || position.earthPairs?.length)
        || asset.earthPairs?.some(([a, b]) => pair.includes(a) && pair.includes(b) && a !== b)
        || model.starting.devices[assetId] !== 'open') throw new Error(`Review required: exact contactor main path/baseline ${assetId} changed.`);
      associationReferences.push(...branch(`${assetId}:fuse-contact`, `${assetId}:fuse:${motor.last}`, pair[0]), ...branch(`${assetId}:${motor.outputLink}`, pair[1], motor.common));
      asset.removableContactor = { mainPair: [...pair] };
      asset.positions = [];
      asset.evidenceIds = [...(asset.evidenceIds ?? []), motorProfileId];
      asset.reviewIds = [...(asset.reviewIds ?? []), motorProfileId];
      model.starting.devices[assetId] = { contact: 'open', racking: 'in' };
    }
    const evidence = uniqueReferences([...references.get(fc)!, ...references.get(rc)!, ...references.get(es)!, ...associationReferences]);
    model.interlocks.rules.push(
      { id: `${motorProfileId}:${fc}:close`, assetId: fc, command: { kind: 'contact', value: 'closed' }, require: all(rackIn(fc), contactOpen(rc), earthOpen(es)), explanation: 'Forward Close requires own Rack in, Reverse Open and maintenance earth Open.', evidence },
      { id: `${motorProfileId}:${rc}:close`, assetId: rc, command: { kind: 'contact', value: 'closed' }, require: all(rackIn(rc), contactOpen(fc), earthOpen(es)), explanation: 'Reverse Close requires own Rack in, Forward Open and maintenance earth Open.', evidence },
      { id: `${motorProfileId}:${fc}:rack-in`, assetId: fc, command: { kind: 'racking', value: 'in' }, require: all(contactOpen(fc), earthOpen(es)), explanation: 'Forward Rack in requires own contact Open and maintenance earth Open.', evidence },
      { id: `${motorProfileId}:${rc}:rack-in`, assetId: rc, command: { kind: 'racking', value: 'in' }, require: all(contactOpen(rc), earthOpen(es)), explanation: 'Reverse Rack in requires own contact Open and maintenance earth Open.', evidence },
      { id: `${motorProfileId}:${es}:close`, assetId: es, position: 'closed', require: all(contactOpen(fc), contactOpen(rc), rackOut(fc), rackOut(rc)), explanation: 'Maintenance Earth Close requires both contactors Open and both Rack out.', evidence },
    );
  }
  for (const incoming of incomers) {
    const { cb, es, first, last } = incoming;
    const breaker = model.assets.find(asset => asset.id === cb)!;
    const pair = [`${cb}:${first}`, `${cb}:${last}`];
    if (breaker.kind !== 'breaker' || !same(breaker.removableBreaker?.mainPair, pair) || breaker.removableContactor || breaker.positions.length) throw new Error(`Review required: existing MV removable breaker mapping ${cb} changed.`);
    const associationReferences = guardEarth(es, first, last, pair[0]);
    const evidence = uniqueReferences([...references.get(cb)!, ...references.get(es)!, ...associationReferences]);
    model.interlocks.rules.push(
      { id: `${incomingProfileId}:${cb}:open`, assetId: cb, command: { kind: 'contact', value: 'open' }, require: rackIn(cb), explanation: 'MV breaker Open requires Rack in.', evidence },
      { id: `${incomingProfileId}:${cb}:close`, assetId: cb, command: { kind: 'contact', value: 'closed' }, require: all(rackIn(cb), earthOpen(es)), explanation: 'MV breaker Close requires Rack in and its own incoming earth Open.', evidence },
      { id: `${incomingProfileId}:${cb}:rack-out`, assetId: cb, command: { kind: 'racking', value: 'out' }, require: contactOpen(cb), explanation: 'MV Rack out requires the breaker Open.', evidence },
      { id: `${incomingProfileId}:${cb}:rack-in`, assetId: cb, command: { kind: 'racking', value: 'in' }, require: all(contactOpen(cb), earthOpen(es)), explanation: 'MV Rack in requires the breaker and its own incoming earth Open.', evidence },
      { id: `${incomingProfileId}:${es}:close`, assetId: es, position: 'closed', require: all(contactOpen(cb), rackOut(cb)), explanation: 'MV incoming Earth Close requires its breaker Open and Rack out.', evidence },
    );
  }
  return model;
}
