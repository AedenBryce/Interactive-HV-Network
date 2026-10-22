import type { NetworkModel } from '../../session/model';
import type { InterlockCondition } from '../../session/interlocks';

const bayIds = ['in-01', 'in-02', 'in-03', 'in-04', 'tier-01', 'tier-02', 'tier-03', 'tier-04', 'tier-13', 'tier-14', 'tier-15', 'tier-16'];

export function withOwnerSw411LocalRules(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-SW411-LOCAL-ACTION-RULES';
  if (base.evidence?.some(record => record.id === id)) throw new Error('SW411 local rules already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  const answer = 'Confirm this local rule set';
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
  const reference = { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer37: Confirm this local rule set. SW411 incoming/outgoing line-earth pairs only: CB Open requires Rack in; CB Close requires Rack in and own ES Open; Rack out requires CB Open; Rack in requires CB Open and own ES Open; ES Open allowed; ES Close requires CB Open and Rack out. Unknown prerequisites block. Excludes both bus-earth switches. Previously deferred cross-station key sequence stays excluded.' };
  if (!model.interlocks) throw new Error('Existing SW411 interlock reviews are required.');
  for (const bay of bayIds) {
    const cb = `sw411:${bay}:cb`; const es = `sw411:${bay}:es`;
    if (!model.assets.find(asset => asset.id === cb)?.removableBreaker || !model.assets.find(asset => asset.id === es)?.positions.some(position => position.id === 'open')) throw new Error(`Review required: SW411 local pair ${bay} no longer matches the removable CB / discrete ES model.`);
    const contactOpen: InterlockCondition = { kind: 'device', assetId: cb, axis: 'contact', value: 'open' };
    const rackIn: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'in' };
    const rackOut: InterlockCondition = { kind: 'device', assetId: cb, axis: 'racking', value: 'out' };
    const earthOpen: InterlockCondition = { kind: 'device', assetId: es, position: 'open' };
    for (const assetId of [cb, es]) {
      const review = model.interlocks.reviews.find(candidate => candidate.assetId === assetId);
      if (!review || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing rules/review for ${assetId} changed; do not replace them silently.`);
      review.status = 'confirmed-rules';
      review.note = 'Owner-selected V1 local SW411 line-earth action matrix, answer37. Known cross-station key interlocks remain explicitly deferred under answer24. This scoped simulation review excludes the two bus-earth switches and does not authorise actual switching. Other equipment metadata and whole-model acceptance remain separate.';
      review.evidence.push(reference);
    }
    const common = { evidence: [reference] };
    model.interlocks.rules.push(
      { ...common, id: `${id}:${bay}:open`, assetId: cb, command: { kind: 'contact', value: 'open' }, require: rackIn, explanation: 'SW411 breaker Open requires Rack in.' },
      { ...common, id: `${id}:${bay}:close`, assetId: cb, command: { kind: 'contact', value: 'closed' }, require: { kind: 'all', conditions: [rackIn, earthOpen] }, explanation: 'SW411 breaker Close requires Rack in and its earth switch Open.' },
      { ...common, id: `${id}:${bay}:rack-out`, assetId: cb, command: { kind: 'racking', value: 'out' }, require: contactOpen, explanation: 'SW411 Rack out requires the breaker Open.' },
      { ...common, id: `${id}:${bay}:rack-in`, assetId: cb, command: { kind: 'racking', value: 'in' }, require: { kind: 'all', conditions: [contactOpen, earthOpen] }, explanation: 'SW411 Rack in requires the breaker Open and its earth switch Open.' },
      { ...common, id: `${id}:${bay}:earth-close`, assetId: es, position: 'closed', require: { kind: 'all', conditions: [contactOpen, rackOut] }, explanation: 'SW411 earth Close requires the breaker Open and Rack out.' },
    );
  }
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [reference], summary: reference.clause });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'Selected V1 SW411 local line-earth action matrix only; bus-earth rules, other switchgear families and whole-network acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  return model;
}
