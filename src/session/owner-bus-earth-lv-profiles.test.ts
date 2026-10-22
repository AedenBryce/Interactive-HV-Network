import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerBusEarthLvProfiles } from '../models/site/owner-bus-earth-lv-profiles';
import { isBreakerState } from './mechanisms';

function priorModel() {
  const version = 'test-bus-lv-prior3';
  return withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
}

describe('owner-selected bus-earth and LV profiles', () => {
  it('preserves Closed contacts while giving only SW712/SW713 independent racking and the selected nine fixed LV controls Open/Close', () => {
    const base = priorModel(); const original = structuredClone(base);
    const session = new SimulationSession(withOwnerBusEarthLvProfiles(base, 'test-bus-lv4'));
    for (const id of ['rm712:sw712:cb', 'rm713:sw713:cb']) {
      expect(session.snapshot().devices[id]).toEqual({ contact: 'closed', racking: 'in' });
      expect(session.snapshot().switching[id].reviewStatus).toBe('confirmed-none');
      expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(id, { kind: 'contact', value: 'open' }).ok).toBe(true);
      expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(true);
      expect(session.changeDevice(id, { kind: 'contact', value: 'closed' }).ok).toBe(false);
      expect(session.changeDevice(id, { kind: 'racking', value: 'in' }).ok).toBe(true);
      expect(session.changeDevice(id, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    }
    const fixed = ['hpgr:mc001:cb', 'rm412:q200', 'rm412:q201', 'rm412:q202', 'rm413:mcc414:cb', 'wh:h1:mc417a:in', 'wh:h3:mc416a:in', 'wh:h7:mc418a:in', 'wh:h8:mc416a:in'];
    for (const id of fixed) {
      expect(session.snapshot().switching[id].reviewStatus).toBe('confirmed-none');
      expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(id, 'open').ok).toBe(true);
      expect(session.changeDevice(id, 'closed').ok).toBe(true);
    }
    const partial = session.saveScenario(); partial.devices['rm712:sw712:cb'] = { contact: null, racking: null };
    expect(session.loadScenario(partial).ok).toBe(true);
    expect(session.changeDevice('rm712:sw712:cb', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeDevice('rm712:sw712:cb', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(base).toEqual(original);
  }, 30_000);

  it('uses answers47/48 for only ten current OHL Open/Close controls and retains both former hardware exceptions blocked', () => {
    const session = new SimulationSession(withOwnerBusEarthLvProfiles(priorModel(), 'test-ohl-profile4'));
    const ids = ['cv006:abs:49-1', 'cv006:abs:49-40', 'cv006:fused-abs:57', 'cv006:recloser:49-39a', 'line33:hopper-286-fused-abs', 'line33:pole-1-recloser', 'line33:pole-2-abs', 'line33:pole-201-abs', 'line33:tie-in-abs', 'mine:wt1:cb'];
    for (const id of ids) {
      const status = session.snapshot().switching[id];
      expect(session.snapshot().devices[id]).toBe('closed');
      expect(status.reviewStatus).toBe('confirmed-none');
      expect(status.conditions).toEqual([]);
      expect(status.actions).toBeUndefined();
      expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(id, 'open').ok).toBe(true);
      expect(session.changeDevice(id, 'closed').ok).toBe(true);
    }
    for (const id of ['cv006:abs:49-38-1', 'cv006:fused-abs:286']) {
      expect(session.snapshot().devices[id]).toBeNull();
      expect(session.snapshot().switching[id].reviewStatus).toBe('unresolved');
      expect(session.changeDevice(id, 'open').ok).toBe(false);
      expect(session.changeDevice(id, 'closed').ok).toBe(false);
    }
  }, 30_000);

  it('requires every named bus breaker known Open and Rack out for Earth Close, while Earth Open remains allowed', () => {
    const session = new SimulationSession(withOwnerBusEarthLvProfiles(priorModel(), 'test-bus-earth4'));
    const earth = 'mine:sw441:bus:es'; const incomer = 'mine:sw441:in:cb'; const feeder = 'mine:tf441:cb';
    const before = session.snapshot();
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice(incomer, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(incomer, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(feeder, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(feeder, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(true);
    for (const state of [{ contact: null, racking: 'out' }, { contact: 'open', racking: null }] as const) {
      const unknown = session.saveScenario(); unknown.devices[incomer] = { ...state };
      expect(session.loadScenario(unknown).ok).toBe(true);
      expect(session.changeDevice(earth, 'open').ok).toBe(true);
      const open = session.snapshot();
      expect(session.changeDevice(earth, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
      expect(session.snapshot()).toEqual(open);
    }
    const unrelated = session.saveScenario();
    unrelated.devices[incomer] = { contact: 'open', racking: 'out' };
    unrelated.devices['sw421:in:cb'] = { contact: 'closed', racking: 'in' };
    expect(session.loadScenario(unrelated).ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(true);
    expect(session.snapshot().switching[earth].reviewStatus).toBe('confirmed-rules');
  }, 30_000);

  it('preserves the frozen prior package and unrelated claims while exposing only the selected profile inventory', () => {
    const base = priorModel(); const original = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerBusEarthLvProfiles(base, 'test-profile-inventory4')).snapshot();
    const model = snapshot.model;
    expect(model.assets.filter(asset => asset.removableBreaker)).toHaveLength(121);
    expect(Object.values(snapshot.devices).filter(state => isBreakerState(state) && state.racking === 'in')).toHaveLength(118);
    expect(Object.values(snapshot.devices).filter(state => isBreakerState(state) && state.racking === 'out')).toHaveLength(3);
    expect(Object.values(snapshot.devices).filter(state => state === null)).toHaveLength(4);
    expect(model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(200);
    expect(model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(160);
    expect(model.interlocks!.rules).toHaveLength(314);
    expect(model.interlocks!.rules.slice(0, 304)).toEqual(original.interlocks!.rules);
    const counts: Record<string, number> = { 'mine:sw441:bus:es': 4, 'sw411:bus-a:es': 14, 'sw411:bus-b:es': 14, 'sw421:bus:es': 12, 'sw426:bus:es': 20, 'sw431:bus:es': 12, 'sw435:bus:es': 14, 'sw451:bus:es': 12, 'sw454:bus:es': 10, 'sw505:bus:es': 14 };
    for (const [assetId, count] of Object.entries(counts)) {
      const rules = model.interlocks!.rules.filter(rule => rule.assetId === assetId);
      expect(rules).toHaveLength(1);
      expect(rules[0]).toMatchObject({ position: 'closed', require: { kind: 'all' } });
      expect(rules[0].require.kind === 'all' && rules[0].require.conditions).toHaveLength(count);
      expect(snapshot.switching[assetId].note).toMatch(/^Owner answer45 selects/);
    }
    for (const asset of original.assets) {
      const after = model.assets.find(candidate => candidate.id === asset.id)!;
      expect(after.knowledge).toBe(asset.knowledge);
      if (['rm712:sw712:cb', 'rm713:sw713:cb'].includes(asset.id)) {
        const { removableBreaker: _mechanism, positions: _positions, evidenceIds: _evidence, reviewIds: _reviews, ...fields } = after;
        const { positions: _oldPositions, evidenceIds: _oldEvidence, reviewIds: _oldReviews, ...oldFields } = asset;
        expect(fields).toEqual(oldFields);
        expect(after.removableBreaker?.mainPair).toEqual(asset.positions.find(position => position.id === 'closed')!.pairs[0]);
        expect(snapshot.devices[asset.id]).toEqual({ contact: 'closed', racking: 'in' });
      } else {
        expect(after).toEqual(asset);
        if (Object.hasOwn(original.starting.devices, asset.id)) expect(snapshot.devices[asset.id]).toEqual(original.starting.devices[asset.id]);
      }
    }
    for (const field of ['connections', 'earths', 'sources', 'boundaries', 'presentation'] as const) expect(model[field]).toEqual(original[field]);
    expect(snapshot.sources).toEqual(original.starting.sources);
    for (const review of original.interlocks!.reviews) {
      const after = model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)!;
      expect(after.note).toContain(review.note);
      for (const reference of review.evidence) expect(after.evidence).toContainEqual(reference);
    }
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P02')?.confirmation?.decision).toBe('Approve all10 listed bus-earth profiles');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P05')?.confirmation?.decision).toBe('all are correct excluding SW712/SW713 Incomers are removable and can have the racki in/out funciton');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P12')?.confirmation?.decision).toBe('Answer47: consider them all closed and no racking function. Answer48: No additional prerequisites in V1');
    expect(snapshot.switching['sw411:bus-tie:cb'].note).toMatch(/^Owner answer44 selects the bus-tie profile; owner answer45 now selects both bus-earth profiles/);
    expect(snapshot.switching['sw411:bus-tie:cb'].note).toContain('Historical construction review context');
    expect(base).toEqual(original);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);

  it('rejects changed bus branches, omitted/changed/extra direct breaker dependencies and changed LV main pairs before replacing a session', () => {
    const base = priorModel(); const session = new SimulationSession(base); const before = session.saveScenario();
    const wrongBranch = structuredClone(base);
    wrongBranch.connections.find(connection => connection.id === 'mine:sw441:bus:es:branch')!.from = 'mine:sw441:in:cb:a';
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(wrongBranch, 'test-wrong-branch'))).toThrow('branch terminal association changed');
    const omitted = structuredClone(base);
    omitted.connections = omitted.connections.filter(connection => connection.id !== 'mine:tf441:bar');
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(omitted, 'test-omitted-cb'))).toThrow('exact direct breaker dependency set changed');
    const changed = structuredClone(base);
    changed.connections.find(connection => connection.id === 'mine:tf441:bar')!.to = 'mine:tf441:cb:b';
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(changed, 'test-changed-cb'))).toThrow('exact direct breaker dependency set changed');
    const extra = structuredClone(base);
    extra.connections.push({ id: 'synthetic-extra-direct-breaker', from: 'mine:sw441:bus:bar', to: 'sw421:in:cb:a' });
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(extra, 'test-extra-cb'))).toThrow('exact direct breaker dependency set changed');
    const changedMainPair = structuredClone(base);
    changedMainPair.assets.find(asset => asset.id === 'rm712:sw712:cb')!.positions.find(position => position.id === 'closed')!.pairs[0].reverse();
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(changedMainPair, 'test-changed-lv'))).toThrow('selected Closed main pair changed');
    const alreadyApplied = withOwnerBusEarthLvProfiles(base, 'test-repeat4');
    expect(() => session.loadModel(withOwnerBusEarthLvProfiles(alreadyApplied, 'test-repeat5'))).toThrow('already applied');
    expect(session.saveScenario()).toEqual(before);
  }, 20_000);

  it('retains independent history/reset and exact scenario snapshots across the new and immutable prior versions', () => {
    const prior = priorModel(); const priorSession = new SimulationSession(prior); const historical = priorSession.saveScenario();
    const current = withOwnerBusEarthLvProfiles(prior, 'test-history4'); const session = new SimulationSession(current);
    const initial = session.saveScenario(); const incomer = 'rm712:sw712:cb';
    expect(session.changeDevice(incomer, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(incomer, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.undo().ok).toBe(true);
    expect(session.saveScenario().devices[incomer]).toEqual({ contact: 'open', racking: 'in' });
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(initial);
    expect(session.changeDevice(incomer, { kind: 'contact', value: 'open' }).ok).toBe(true);
    const saved = session.saveScenario(); const reopened = new SimulationSession(current);
    expect(reopened.loadScenario(saved).ok).toBe(true);
    expect(reopened.saveScenario()).toEqual(saved);
    expect(reopened.changeDevice(incomer, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.loadScenario(historical).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(historical);
    expect(session.changeDevice(incomer, 'open').ok).toBe(false);
    expect(session.changeDevice('mine:sw441:bus:es', 'open').ok).toBe(false);
    expect(session.snapshot().switching['mine:sw441:bus:es'].reviewStatus).toBe('unresolved');
    expect(priorSession.saveScenario()).toEqual(historical);
  }, 20_000);
});
