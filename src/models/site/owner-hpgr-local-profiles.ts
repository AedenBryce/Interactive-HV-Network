import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const mains = ['hpgr:sw002:a02:k101', 'hpgr:sw002:a04:k101', 'hpgr:sw002:tf004:k202'];
const earths = ['hpgr:sw002:a02:q8', 'hpgr:sw002:a04:q8', 'hpgr:sw002:tf004:q8'];
const cb = 'sw435:hpgr:cb'; const cbEarth = 'sw435:hpgr:es'; const incomingEarth = 'hpgr:sw002:a01:q8';
const dcEarths = ['hpgr:drive-meb:dc-earth', 'hpgr:drive-mea:dc-earth'];
const profileId = 'WN-INTERLOCK-P10'; const deferralId = 'WN-DEFERRED-KEY-DOOR-INCHING';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const unique = (refs: EvidenceReference[]) => [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
const contact = (assetId: string, value: 'open' | 'closed'): InterlockCondition => ({ kind: 'device', assetId, axis: 'contact', value });
const rack = (assetId: string, value: 'in' | 'out'): InterlockCondition => ({ kind: 'device', assetId, axis: 'racking', value });
const earthOpen = (assetId: string): InterlockCondition => ({ kind: 'device', assetId, position: 'open' });
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Complete owner65/67/69/70 local profiles, separate from converter and key behavior. */
export function withOwnerHpgrLocalProfiles(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('HPGR local profiles require a new immutable model version.');
  if (base.evidence?.some(record => record.id === profileId)) throw new Error('HPGR profiles already applied.');
  const deferral = base.evidence?.find(record => record.id === deferralId);
  if (deferral?.status !== 'owner-confirmed' || deferral.confirmation?.decision !== 'Explicitly defer these listed sequences for V1'
    || !base.reviews?.some(review => review.id === deferralId && review.status === 'resolved' && review.evidenceIds.includes(deferralId))
    || !deferral.references.some(ref => ref.document === 'drawing-review/supplemental/interlock-profile-review.json' && ref.clause?.startsWith('P10: exact 11'))) throw new Error('Review required: exact owner49 P10 key deferral missing.');
  const group = inventory.groups.find(group => group.id === 'P10');
  const ids = [...mains, ...earths, cb, cbEarth, incomingEarth, ...dcEarths];
  if (!group || group.assetIds.length !== ids.length || group.assetIds.some(id => !ids.includes(id))) throw new Error('Review required: exact P10 inventory changed.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Review required: existing HPGR interlock reviews missing.');
  const refs: EvidenceReference[] = [
    { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer62: removable disconnectors. Answer65 exact: Approve this complete profile and baseline for all3 pairs. Answer67 exact: Apply this complete local matrix. Answer69 exact: Approve this complete local profile. Answer70 exact: Use these complete local profiles for both DC earths. Full selected local actions and baselines: drawing-review/supplemental/owner-interlocks-review.md. Unknown prerequisites block. Named Fortress/key sequences only are deferred under49. Converter coupling, stored energy and discharge remain Unconfirmed and are not modeled. No additional local prerequisites for these exact controls. This is a teaching profile, not operational permission.' },
    { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P10 exact eleven controls and original drawing/revision/page/region references.' },
    ...deferral.references.filter(ref => ref.document === 'Project owner conversation' || ref.clause?.startsWith('P10: exact 11')),
    ...group.assets.flatMap(row => row.references),
  ];
  const sourceRefs = (evidenceIds: string[] = []) => evidenceIds.flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(link => link.id === id); const references = sourceRefs(link?.evidenceIds);
    if (link?.from !== from || link.to !== to || !references.length) throw new Error(`Review required: HPGR source-evidenced connection ${id} changed.`);
    refs.push(...references);
  };
  const asset = (id: string, kind: Asset['kind']) => {
    const found = model.assets.find(asset => asset.id === id);
    if (!found || found.kind !== kind || !same(found.terminals, [`${id}:a`, `${id}:b`])) throw new Error(`Review required: HPGR asset/terminals ${id} changed.`);
    return found;
  };
  const fixed = (id: string, kind: Asset['kind']) => {
    const found = asset(id, kind);
    if (found.removableBreaker || found.removableContactor || found.removableDisconnector || found.conductivePairs.length || found.sourcePairs?.length || found.earthPairs?.length || found.sourceArcs !== undefined
      || found.positions.length !== 2 || found.positions.find(option => option.id === 'open')?.pairs.length !== 0
      || !same(found.positions.find(option => option.id === 'closed')?.pairs, [found.terminals]) || found.positions.some(option => option.sourcePairs?.length || option.earthPairs?.length)) throw new Error(`Review required: fixed HPGR mechanism ${id} changed.`);
    return found;
  };
  const earth = (id: string, from: string) => {
    fixed(id, 'earth-switch'); branch(`${id}:branch`, from, `${id}:a`);
    if (!model.earths?.some(termination => termination.terminal === `${id}:b`) || model.connections.filter(link => link.from === `${id}:a` || link.to === `${id}:a`).length !== 1) throw new Error(`Review required: exact HPGR earth branch/termination ${id} changed.`);
  };
  const fuse = (id: string) => {
    const found = asset(id, 'interface');
    if (!same(found.conductivePairs, [found.terminals]) || found.positions.length || found.sourcePairs?.length || found.earthPairs?.length || found.sourceArcs !== undefined || found.removableBreaker || found.removableContactor || found.removableDisconnector) throw new Error(`Review required: HPGR series fuse ${id} changed.`);
  };
  for (const id of ids) {
    const review = model.interlocks.reviews.find(review => review.assetId === id);
    const row = group.assets.find(row => row.assetId === id); const found = model.assets.find(asset => asset.id === id);
    if (!review || review.status !== 'unresolved' || !row || found?.kind !== row.kind || model.interlocks.rules.some(rule => rule.assetId === id)) throw new Error(`Review required: existing HPGR asset/review/rules ${id} changed.`);
    refs.push(...review.evidence, ...sourceRefs(found.evidenceIds));
  }
  const feeder = asset(cb, 'breaker');
  if (!same(feeder.removableBreaker?.mainPair, feeder.terminals) || feeder.removableContactor || feeder.removableDisconnector || feeder.positions.length || feeder.conductivePairs.length || feeder.sourcePairs?.length || feeder.earthPairs?.length || feeder.sourceArcs !== undefined) throw new Error('Review required: exact SW435 HPGR removable feeder changed.');
  branch('sw435:hpgr:bus-link', 'sw435:bus:bar', `${cb}:a`); earth(cbEarth, `${cb}:b`);
  const sw002 = model.assets.find(asset => asset.id === 'hpgr:sw002:bus');
  if (sw002?.kind !== 'bus' || !same(sw002.terminals, ['hpgr:sw002:bus:bar'])) throw new Error('Review required: SW002 bus changed.');
  branch('hpgr:cable-SW002-P-02-group', 'hpgr:tf001:mv', 'hpgr:sw002:bus:bar');
  earth(incomingEarth, 'hpgr:tf001:mv');
  for (const [index, main] of mains.entries()) {
    const found = fixed(main, 'disconnector');
    if (model.starting.devices[main] !== 'closed') throw new Error(`Review required: HPGR selected Closed contact ${main} changed.`);
    if (index < 2) {
      const prefix = main.slice(0, -5); const tf = index === 0 ? 'TF003' : 'TF002';
      fuse(`${prefix}:f1`);
      branch(`${prefix}:bus-fuse`, 'hpgr:sw002:bus:bar', `${prefix}:f1:a`);
      branch(`${prefix}:fuse-contact`, `${prefix}:f1:b`, `${main}:a`);
      branch(`${prefix}:cable-${tf}-P-01`, `${main}:b`, `hpgr:${tf.toLowerCase()}:hv`);
      earth(earths[index], `${main}:b`);
    } else {
      fuse('hpgr:sw002:tf004:f101');
      branch('hpgr:tf004:bus-k202', 'hpgr:sw002:bus:bar', `${main}:a`);
      branch('hpgr:tf004:k202-f101', `${main}:b`, 'hpgr:sw002:tf004:f101:a');
      branch('hpgr:cable-TF004-P-01', 'hpgr:sw002:tf004:f101:b', 'hpgr:tf004:hv');
      earth(earths[index], 'hpgr:sw002:tf004:f101:b');
    }
    found.removableDisconnector = { mainPair: [`${main}:a`, `${main}:b`] }; found.positions = [];
    found.evidenceIds = [...(found.evidenceIds ?? []), profileId]; found.reviewIds = [...(found.reviewIds ?? []), profileId];
    model.starting.devices[main] = { contact: 'closed', racking: 'in' };
  }
  for (const [index, id] of dcEarths.entries()) {
    const prefix = index === 0 ? 'hpgr:drive-meb' : 'hpgr:drive-mea';
    const converter = model.assets.find(asset => asset.id === `${prefix}:converter`);
    if (converter?.kind !== 'interface' || !same(converter.terminals, ['ac-star', 'ac-delta', 'dc', 'output'].map(role => `${prefix}:converter:${role}`))
      || converter.conductivePairs.length || converter.sourcePairs?.length || converter.earthPairs?.length || converter.positions.length || converter.sourceArcs !== undefined) throw new Error(`Review required: uncoupled HPGR converter ${prefix} changed.`);
    earth(id, `${prefix}:converter:dc`);
  }
  const evidence = unique(refs);
  for (const id of ids) {
    const review = model.interlocks.reviews.find(review => review.assetId === id)!;
    review.status = 'confirmed-rules'; review.evidence = unique([...review.evidence, ...evidence]);
    review.note = `Owner65/67/69/70 select the exact P10 local profile and three disconnector Closed/Rack in baselines. Unknown prerequisites block; intrinsic contact/racking guards and all declared dependencies remain mandatory. Only the listed key sequences are deferred under49; converter coupling, stored energy and discharge remain Unconfirmed. No actual switching permission or unrelated source/earth acceptance is supplied. Historical review context: ${review.note}`;
  }
  const addCommand = (assetId: string, kind: 'contact' | 'racking', value: 'open' | 'closed' | 'in' | 'out', require: InterlockCondition, explanation: string) => {
    if (kind === 'contact' && (value === 'open' || value === 'closed')) model.interlocks!.rules.push({ id: `${profileId}:${assetId}:${kind}:${value}`, assetId, command: { kind, value }, require, explanation, evidence });
    else if (kind === 'racking' && (value === 'in' || value === 'out')) model.interlocks!.rules.push({ id: `${profileId}:${assetId}:${kind}:${value}`, assetId, command: { kind, value }, require, explanation, evidence });
    else throw new Error('Invalid HPGR action declaration.');
  };
  const addEarth = (assetId: string, require: InterlockCondition, explanation: string) => model.interlocks!.rules.push({ id: `${profileId}:${assetId}:close`, assetId, position: 'closed', require, explanation, evidence });
  for (const [index, main] of [cb, ...mains].entries()) {
    const es = index === 0 ? cbEarth : earths[index - 1];
    addCommand(main, 'contact', 'open', rack(main, 'in'), 'Open requires own Rack in.');
    addCommand(main, 'contact', 'closed', all(rack(main, 'in'), earthOpen(es)), 'Close requires own Rack in and own earth Open.');
    addCommand(main, 'racking', 'out', contact(main, 'open'), 'Rack out requires own contact Open.');
    addCommand(main, 'racking', 'in', all(contact(main, 'open'), earthOpen(es)), 'Rack in requires own contact and own earth Open.');
    addEarth(es, all(contact(main, 'open'), rack(main, 'out')), 'Earth Close requires own main contact Open and Rack out.');
  }
  addEarth(incomingEarth, all(...[cb, ...mains].flatMap(id => [contact(id, 'open'), rack(id, 'out')])), 'A01 Q8 Close requires SW435 HPGR CB and all three HPGR disconnectors Open and Rack out.');
  dcEarths.forEach((id, index) => addEarth(id, all(contact(mains[index], 'open'), rack(mains[index], 'out')), `DC Earth Close requires ${mains[index]} Open and Rack out. Stored energy/discharge is not modeled.`));
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: '65: Approve this complete profile and baseline for all3 pairs; 67: Apply this complete local matrix; 69: Approve this complete local profile; 70: Use these complete local profiles for both DC earths' };
  (model.evidence ??= []).push({ id: profileId, status: 'owner-confirmed', confirmation, references: evidence, summary: 'Exact eleven P10 selected local profiles and three removable disconnector Closed/Rack in baselines only. Fixed source/earth relationships, series fuse order/knowledge and uncoupled converter groups are preserved. Only the named keys are deferred under49; stored energy/discharge and converter transfer remain Unconfirmed. This is not actual switching permission or whole-model acceptance.' });
  (model.reviews ??= []).push({ id: profileId, status: 'resolved', question: 'Selected P10 local model actions and three removable disconnector baselines only.', evidenceIds: [profileId, deferralId], resolution: confirmation });
  return model;
}
