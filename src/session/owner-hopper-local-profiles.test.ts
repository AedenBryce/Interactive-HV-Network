import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerBusEarthLvProfiles } from '../models/site/owner-bus-earth-lv-profiles';
import { withOwnerKeySequenceDeferral } from '../models/site/owner-key-sequence-deferral';
import { withOwnerHopperLocalProfiles } from '../models/site/owner-hopper-local-profiles';
import inventory from '../../drawing-review/supplemental/interlock-profile-review.json';
import { isBreakerState } from './mechanisms';
import type { BreakerState } from './mechanisms';
import type { NetworkModel } from './model';

function priorModel() {
  const version = 'test-hopper-prior-3';
  const local = withOwnerBusEarthLvProfiles(withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version), version);
  return withOwnerKeySequenceDeferral(local, 'test-hopper-prior-key-scope');
}

describe('owner-selected hopper local profiles', () => {
  it('converts only the named contactors and applies the two scoped profiles without changing other baseline or hardware', () => {
    const base = priorModel(); const original = structuredClone(base);
    const model = withOwnerHopperLocalProfiles(base, 'test-hopper-local-1');
    const snapshot = new SimulationSession(model).snapshot();
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(248);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(112);
    expect(snapshot.model.interlocks!.rules).toHaveLength(404);
    expect(snapshot.model.assets.filter(asset => asset.removableContactor)).toHaveLength(24);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker)).toHaveLength(121);
    const states = Object.values(snapshot.devices).filter(isBreakerState);
    expect(states).toHaveLength(145);
    expect(states.filter(state => state.racking === 'in')).toHaveLength(142);
    expect(states.filter(state => state.racking === 'out')).toHaveLength(3);
    const selected = inventory.groups.find(group => group.id === 'P07')!.assets.filter(asset => asset.kind === 'contactor').map(asset => asset.assetId);
    for (const id of selected) {
      const asset = snapshot.model.assets.find(asset => asset.id === id)!;
      expect(asset.kind).toBe('contactor'); expect(asset.positions).toEqual([]);
      expect(snapshot.devices[id]).toEqual({ contact: 'open', racking: 'in' });
      expect(asset.removableContactor!.mainPair).toEqual(original.assets.find(asset => asset.id === id)!.positions.find(position => position.id === 'closed')!.pairs[0]);
      expect(asset.knowledge).toBe(original.assets.find(asset => asset.id === id)!.knowledge);
    }
    for (const [id, state] of Object.entries(original.starting.devices)) if (!selected.includes(id)) expect(snapshot.devices[id]).toEqual(state);
    expect(snapshot.model.connections).toEqual(original.connections); expect(snapshot.model.earths).toEqual(original.earths);
    expect(snapshot.model.sources).toEqual(original.sources); expect(snapshot.model.boundaries).toEqual(original.boundaries);
    expect(snapshot.model.starting.sources).toEqual(original.starting.sources);
    expect(snapshot.model.interlocks!.rules.slice(0, original.interlocks!.rules.length)).toEqual(original.interlocks!.rules);
    for (const asset of original.assets.filter(asset => !selected.includes(asset.id))) expect(snapshot.model.assets.find(candidate => candidate.id === asset.id)).toEqual(asset);
    expect(base).toEqual(original);
  }, 30_000);

  it('enforces mutual exclusion and both contactors Open/Out before closing the maintenance earth', () => {
    const session = new SimulationSession(withOwnerHopperLocalProfiles(priorModel(), 'test-hopper-motor-sequence'));
    const fc = 'wh:h3:mc416:m1:fc'; const rc = 'wh:h3:mc416:m1:rc'; const es = 'wh:h3:mc416:m1:earth';
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.changeDevice(rc, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(rc, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice(rc, { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(es, 'open').ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(rc, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(rc, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(rc, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(true);
  }, 30_000);

  it('blocks unknown contactor, rack and earth prerequisites in both directions without guessing state', () => {
    const session = new SimulationSession(withOwnerHopperLocalProfiles(priorModel(), 'test-hopper-motor-unknowns'));
    const fc = 'rm420:mc420:motor-01:fc'; const rc = 'rm420:mc420:motor-01:rc'; const es = 'rm420:mc420:motor-01:es';
    const baseline = session.saveScenario();
    for (const [selected, opposite] of [[fc, rc], [rc, fc]]) {
      const unknownOpponent = structuredClone(baseline); unknownOpponent.devices[opposite] = { contact: null, racking: 'in' };
      expect(session.loadScenario(unknownOpponent).ok).toBe(true);
      const before = session.snapshot();
      expect(session.changeDevice(selected, { kind: 'contact', value: 'closed' })).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
      expect(session.snapshot()).toEqual(before);
      const opponentRackUnknown = structuredClone(baseline); opponentRackUnknown.devices[opposite] = { contact: 'open', racking: null };
      expect(session.loadScenario(opponentRackUnknown).ok).toBe(true);
      expect(session.changeDevice(selected, { kind: 'contact', value: 'closed' }).ok).toBe(true);
      const unknownEarth = structuredClone(baseline); unknownEarth.devices[es] = null;
      expect(session.loadScenario(unknownEarth).ok).toBe(true);
      expect(session.changeDevice(selected, { kind: 'contact', value: 'closed' }).ok).toBe(false);
      expect(session.changeDevice(selected, { kind: 'racking', value: 'in' }).ok).toBe(false);
      expect(session.changeDevice(selected, { kind: 'racking', value: 'out' }).ok).toBe(true);
      expect(session.changeDevice(es, 'open').ok).toBe(true);
      const unknownRack = structuredClone(baseline); unknownRack.devices[selected] = { contact: 'open', racking: null };
      expect(session.loadScenario(unknownRack).ok).toBe(true);
      expect(session.changeDevice(selected, { kind: 'contact', value: 'open' }).ok).toBe(false);
      expect(session.changeDevice(selected, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    }
    for (const partial of [{ contact: null, racking: 'out' }, { contact: 'open', racking: null }] satisfies BreakerState[]) {
      const unknown = structuredClone(baseline); unknown.devices[fc] = partial; unknown.devices[rc] = { contact: 'open', racking: 'out' };
      expect(session.loadScenario(unknown).ok).toBe(true);
      expect(session.changeDevice(es, 'closed').ok).toBe(false);
    }
  }, 30_000);

  it('applies the full local MV pair sequence while keeping all other breaker baselines unchanged', () => {
    const session = new SimulationSession(withOwnerHopperLocalProfiles(priorModel(), 'test-hopper-mv-sequence'));
    const cb = 'rm420:mc420:in:vcb'; const es = 'rm420:mc420:in:es';
    const baseline = session.saveScenario();
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice(es, 'open').ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    const unknown = structuredClone(baseline); unknown.devices[cb] = { contact: 'open', racking: 'in' }; unknown.devices[es] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
    unknown.devices[cb] = { contact: null, racking: 'in' }; unknown.devices[es] = 'open';
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(es, 'open').ok).toBe(true);
  }, 30_000);

  it('keeps the contactor phase pair and maintenance-earth branch independent in a fictional supply scenario', () => {
    const model: NetworkModel = withOwnerHopperLocalProfiles(priorModel(), 'test-hopper-source-before-fiction');
    model.id = 'synthetic-hopper-profile-source-earth'; model.version = 'fictional-hopper-source-1'; model.synthetic = true; model.presentation = undefined;
    for (const id of Object.keys(model.starting.sources)) model.starting.sources[id] = false;
    model.assets.push({ id: 'fictional:h3-source', label: 'Fictional supply after source-model fuse', kind: 'source', terminals: ['fictional:h3-source:port'], conductivePairs: [], positions: [] });
    model.sources.push({ id: 'fictional:h3-source', label: 'Fictional source, not installed', assetId: 'fictional:h3-source', terminal: 'fictional:h3-source:port' });
    model.connections.push({ id: 'fictional:h3-source-cable', from: 'fictional:h3-source:port', to: 'wh:h3:mc416:m1:fc:a' });
    model.starting.sources['fictional:h3-source'] = true;
    const session = new SimulationSession(model); const fc = 'wh:h3:mc416:m1:fc'; const rc = 'wh:h3:mc416:m1:rc'; const es = 'wh:h3:mc416:m1:earth';
    expect(session.snapshot().connectivity['wh:h3:mc416:m1:common'].sourceIds).toEqual([]);
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.snapshot().connectivity['wh:h3:mc416:m1:common'].sourceIds).toContain('fictional:h3-source');
    expect(session.changeDevice(fc, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(rc, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(true);
    const result = session.snapshot();
    expect(result.connectivity['wh:h3:mc416:m1:common'].sourceIds).toEqual([]);
    expect(result.connectivity['wh:h3:mc416:m1:common'].earthIds).toContain('wh:h3:mc416:m1:earth:termination');
    expect(result.connectivity['fictional:h3-source'].earthIds).toEqual([]);
  }, 30_000);

  it('preserves contact/racking history and format2 scenarios while old scalar packages remain historical', () => {
    const base = priorModel(); const old = new SimulationSession(base).saveScenario();
    const model = withOwnerHopperLocalProfiles(base, 'test-hopper-history-1');
    const session = new SimulationSession(model); const fc = 'wh:h1:mc417:m1:fc'; const baseline = session.saveScenario();
    expect(baseline.formatVersion).toBe(2);
    expect(session.changeDevice(fc, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.snapshot().history.at(-1)).toMatchObject({ assetId: fc, from: { contact: 'open', racking: 'in' }, to: { contact: 'open', racking: 'out' } });
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().devices[fc]).toEqual({ contact: 'open', racking: 'in' });
    expect(session.changeDevice(fc, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(baseline);
    const partial = session.saveScenario(); partial.devices[fc] = { contact: null, racking: 'in' };
    expect(session.loadScenario(partial).ok).toBe(true); expect(session.saveScenario()).toEqual(partial);
    expect(session.loadModel(withOwnerHopperLocalProfiles(base, 'test-hopper-history-2')).ok).toBe(true);
    expect(session.loadScenario(partial).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.changeDevice(fc, { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.loadScenario(old).ok).toBe(true);
    expect(session.saveScenario().devices[fc]).toBe('open');
    expect(session.saveScenario().model.assets.find(asset => asset.id === fc)).not.toHaveProperty('removableContactor');
  }, 30_000);

  it('requires the explicit key scope and rejects stale pair/path or preexisting-rule changes atomically', () => {
    const base = priorModel(); const original = structuredClone(base);
    const session = new SimulationSession(base); const before = session.snapshot();
    const missingScope = structuredClone(base); missingScope.evidence = missingScope.evidence!.filter(record => record.id !== 'WN-DEFERRED-KEY-DOOR-INCHING');
    const wrongEarth = structuredClone(base); wrongEarth.connections.find(connection => connection.id === 'wh:h3:mc416:m1:earth:branch')!.from = 'wh:h3:mc416:m2:common:port';
    const wrongPhase = structuredClone(base); wrongPhase.assets.find(asset => asset.id === 'wh:h3:mc416:m1:fc')!.positions.find(position => position.id === 'closed')!.pairs[0].reverse();
    const wrongIncoming = structuredClone(base); wrongIncoming.connections.find(connection => connection.id === 'wh:h3:mc416:in-earth:branch')!.from = 'wh:h3:mc416:in:b';
    const existingRule = structuredClone(base); existingRule.interlocks!.rules.push({ id: 'fictional-existing-profile-check', assetId: 'wh:h3:mc416:m1:fc', position: 'closed', require: { kind: 'source', sourceId: 'boundary:tf11', enabled: true }, explanation: 'Existing profile cannot be overwritten.', evidence: [{ document: 'Fictional conflict guard reference', revision: '1', page: 1 }] });
    for (const candidate of [missingScope, wrongEarth, wrongPhase, wrongIncoming, existingRule]) {
      expect(() => session.loadModel(withOwnerHopperLocalProfiles(candidate, 'test-hopper-invalid'))).toThrow('Review required');
      expect(session.snapshot()).toEqual(before);
    }
    const applied = withOwnerHopperLocalProfiles(base, 'test-hopper-already-applied');
    expect(() => session.loadModel(withOwnerHopperLocalProfiles(applied, 'test-hopper-repeat'))).toThrow('already applied');
    expect(base).toEqual(original); expect(session.snapshot()).toEqual(before);
  }, 30_000);
});
