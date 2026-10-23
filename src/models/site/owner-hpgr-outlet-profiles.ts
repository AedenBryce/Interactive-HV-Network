import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';

const profileId = 'WN-HPGR-OUTLET-PROFILE'; const keyId = 'WN-HPGR-OUTLET-KEY-DEFERRAL';
const outlets = [
  { prefix: 'hpgr:drive-meb', main: 'hpgr:sw002:a02:k101', transformer: 'hpgr:tf003', motor: 'hpgr:motor-meb', cable: 'hpgr:cable-CR005MEB-P-01' },
  { prefix: 'hpgr:drive-mea', main: 'hpgr:sw002:a04:k101', transformer: 'hpgr:tf002', motor: 'hpgr:motor-mea', cable: 'hpgr:cable-CR005MEA-P-01' },
];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Two exact owner82 selectors; preserve unresolved installed metadata and converter earth separation. */
export function withOwnerHpgrOutletProfiles(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('HPGR outlet profiles require a new immutable model version.');
  if (base.evidence?.some(record => record.id === profileId || record.id === keyId)) throw new Error('HPGR outlet profiles already applied.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks || !model.evidence?.some(record => record.id === 'WN-MV-DRIVE-SCOPE' && record.status === 'owner-confirmed')) throw new Error('Review required: existing HPGR local profiles and owner79 scope are required.');
  const ownerRef = { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer82 exact: Select this complete V1 outlet profile. Exactly HPGR MEB/MEA motor-side outlets: fixed Service/Isolated/Earthed, initially Service, no Rack. Service VSD→motor; Isolated no pair; Earthed motor→earth. Every movement needs associated K101 Open/Rack out (MEB A02, MEA A04). Service↔Earthed passes through Isolated; selecting Service also needs own DC earth Open. Unknown prerequisites block. Explicitly defer only these two outlets Fortress-key sequences for V1; no other local prerequisites. This selects a teaching profile, not verified physical construction or operational permission.' };
  const refs: EvidenceReference[] = [ownerRef];
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(link => link.id === id);
    const references = (link?.evidenceIds ?? []).flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
    if (link?.from !== from || link.to !== to || !references.length) throw new Error(`Review required: exact HPGR outlet source binding ${id} changed.`);
    refs.push(...references);
  };
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'Select this complete V1 outlet profile' };
  for (const outlet of outlets) {
    const id = `${outlet.prefix}:outlet`; const asset = model.assets.find(asset => asset.id === id); const main = model.assets.find(asset => asset.id === outlet.main);
    const terminals = [`${id}:vsd`, `${id}:motor`, `${id}:earth`];
    const termination = model.earths?.find(earth => earth.id === `${id}:earth-termination`);
    if (!asset || asset.kind !== 'interface' || !same(asset.terminals, terminals) || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined
      || asset.positions.length || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector || Object.hasOwn(model.starting.devices, id)
      || main?.kind !== 'disconnector' || !same(main.removableDisconnector?.mainPair, [`${outlet.main}:a`, `${outlet.main}:b`])
      || !model.interlocks.reviews.some(review => review.assetId === outlet.main && review.status === 'confirmed-rules')
      || model.interlocks.reviews.some(review => review.assetId === id) || model.interlocks.rules.some(rule => rule.assetId === id)
      || termination?.terminal !== terminals[2]) throw new Error(`Review required: exact HPGR outlet/main/earth inventory ${id} changed.`);
    const bay = outlet.main.slice(0, -5); const transformerTag = outlet.transformer.slice(5).toUpperCase();
    branch(`${bay}:cable-${transformerTag}-P-01`, `${outlet.main}:b`, `${outlet.transformer}:hv`);
    branch(`${outlet.transformer}:star-to-converter`, `${outlet.transformer}:ac-star`, `${outlet.prefix}:converter:ac-star`);
    branch(`${outlet.transformer}:delta-to-converter`, `${outlet.transformer}:ac-delta`, `${outlet.prefix}:converter:ac-delta`);
    branch(`${outlet.prefix}:inverter-to-outlet`, `${outlet.prefix}:converter:output`, terminals[0]);
    branch(outlet.cable, terminals[1], `${outlet.motor}:port`);
    branch(`${outlet.prefix}:dc-earth:branch`, `${outlet.prefix}:converter:dc`, `${outlet.prefix}:dc-earth:a`);
    const positionClaim = { supportScope: 'relationship' as const, knowledge: 'owner-confirmed' as const, evidenceIds: [profileId], reviewIds: [profileId] };
    asset.kind = 'disconnector'; asset.positions = [
      { id: 'service', label: 'Service', pairs: [[terminals[0], terminals[1]]], ...positionClaim },
      { id: 'isolated', label: 'Isolated', pairs: [], ...positionClaim },
      { id: 'earthed', label: 'Earthed', pairs: [[terminals[1], terminals[2]]], ...positionClaim },
    ];
    asset.aliases = [...new Set([...(asset.aliases ?? []), asset.label])];
    asset.label = `${outlet.prefix.endsWith('meb') ? 'MEB' : 'MEA'} motor-side outlet\nSelected Service / Isolated / Earthed model`;
    asset.evidenceIds = [...(asset.evidenceIds ?? []), profileId, keyId]; asset.reviewIds = [...(asset.reviewIds ?? []), profileId, keyId];
    model.starting.devices[id] = 'service';
    const mainOpenOut: InterlockCondition[] = [{ kind: 'device', assetId: outlet.main, axis: 'contact', value: 'open' }, { kind: 'device', assetId: outlet.main, axis: 'racking', value: 'out' }];
    const evidence = [...refs];
    model.interlocks.reviews.push({ assetId: id, status: 'confirmed-rules', note: 'Owner82 selects the complete fixed outlet teaching profile and Service baseline. Every movement needs associated K101 Open/Rack out; Service/Earthed require current Isolated, and Service also needs own DC earth Open. Unknown prerequisites block. Only this outlet Fortress-key sequence is explicitly deferred by the separate bounded owner82 key-scope record. No other local prerequisites. Installed construction/metadata and operational permission remain Unconfirmed.', evidence });
    for (const position of ['service', 'isolated', 'earthed']) {
      const conditions = [...mainOpenOut];
      if (position !== 'isolated') conditions.push({ kind: 'device', assetId: id, position: 'isolated' });
      if (position === 'service') conditions.push({ kind: 'device', assetId: `${outlet.prefix}:dc-earth`, position: 'open' });
      model.interlocks.rules.push({ id: `${profileId}:${id}:${position}`, assetId: id, position, require: all(...conditions), explanation: `Outlet ${position} requires own K101 Open/Rack out${position !== 'isolated' ? ', current Isolated' : ''}${position === 'service' ? ' and own DC earth Open' : ''}.`, evidence });
    }
  }
  const evidence = [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
  (model.evidence ??= []).push(
    { id: keyId, status: 'owner-confirmed', confirmation, references: evidence, summary: 'Owner82 explicitly defers only the Fortress-key sequences of hpgr:drive-meb:outlet and hpgr:drive-mea:outlet in V1. This extends the named scope by these two outlets only; owner49 exact82-control scope remains unchanged. Local action rules remain mandatory; no other mechanism, key sequence or electrical behavior is deferred.' },
    { id: profileId, status: 'owner-confirmed', confirmation, references: evidence, summary: 'Owner82 selects exactly two fixed three-position outlet mechanisms, six scoped position relationships, six local movement rules and two Service baseline values. Scoped contact claims establish selected VSD/motor and motor/earth paths without accepting unresolved parent installed metadata. AC/DC/output converter earth groups remain separate. This is not actual switching permission or whole-model acceptance.' },
  );
  (model.reviews ??= []).push(
    { id: keyId, status: 'resolved', question: 'Bounded V1 key-sequence deferral for these exact two HPGR motor-side outlets only.', evidenceIds: [keyId], resolution: confirmation },
    { id: profileId, status: 'resolved', question: 'Selected V1 HPGR outlet mechanisms, local interactions and Service baselines only.', evidenceIds: [profileId, keyId], resolution: confirmation },
  );
  return model;
}
