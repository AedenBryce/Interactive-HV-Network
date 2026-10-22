import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { rmuProfilesNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerFinalControlProfiles } from '../models/site/owner-final-control-profiles';

describe('owner73–77 RM413A and removed former OHL controls', () => {
  it('enforces Q1/lower-switch transitions and the exact selected upper-earth prerequisites', () => {
    const session = new SimulationSession(withOwnerFinalControlProfiles(currentNetworkModel, 'test-final-controls6'));
    const cb = 'rm413a:q1'; const lower = 'rm413a:es-q8:lower'; const upper = 'rm413a:es-q8:upper';
    expect(session.saveScenario().devices[lower]).toBe('service');
    expect(session.changeDevice(lower, 'isolated').ok).toBe(false);
    expect(session.changeDevice(upper, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, 'open').ok).toBe(true);
    expect(session.changeDevice(lower, 'earthed').ok).toBe(false);
    expect(session.changeDevice(lower, 'isolated').ok).toBe(true);
    expect(session.changeDevice(lower, 'earthed').ok).toBe(true);
    expect(session.changeDevice(cb, 'closed').ok).toBe(false);
    expect(session.changeDevice(lower, 'service').ok).toBe(false);
    const state = session.saveScenario(); state.devices['rm413:in02'] = 'open';
    expect(session.loadScenario(state).ok).toBe(true);
    expect(session.changeDevice(upper, 'closed').ok).toBe(true);
    expect(session.changeDevice(lower, 'isolated').ok).toBe(true);
    expect(session.changeDevice(lower, 'service').ok).toBe(false);
    expect(session.changeDevice(upper, 'open').ok).toBe(true);
    expect(session.changeDevice(lower, 'service').ok).toBe(true);
    expect(session.changeDevice(cb, 'closed').ok).toBe(true);
    const unknown = session.saveScenario(); unknown.devices[cb] = null; unknown.devices['rm413:in02'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(upper, 'closed').ok).toBe(false);
    expect(session.changeDevice(upper, 'open').ok).toBe(true);
    expect(session.changeDevice(lower, 'isolated').ok).toBe(false);
  }, 30_000);

  it('retains only disconnected historical markers for the absent22kV hardware and preserves the33kV route', () => {
    const session = new SimulationSession(withOwnerFinalControlProfiles(currentNetworkModel, 'test-removed-ohl6'));
    const { model } = session.snapshot();
    const saved = session.saveScenario();
    for (const id of ['cv006:abs:49-38-1', 'cv006:fused-abs:286']) {
      const marker = model.assets.find(asset => asset.id === id)!;
      expect(marker.kind).toBe('interface'); expect(marker.positions).toEqual([]); expect(marker.conductivePairs).toEqual([]);
      expect(saved.devices).not.toHaveProperty(id);
      expect(model.connections.some(link => marker.terminals.includes(link.from) || marker.terminals.includes(link.to))).toBe(false);
      expect(session.changeDevice(id, 'closed').ok).toBe(false);
    }
    expect(model.assets.filter(asset => asset.id.startsWith('line33:'))).toEqual(currentNetworkModel.assets.filter(asset => asset.id.startsWith('line33:')));
    expect(model.connections.filter(link => link.from.startsWith('line33:') || link.to.startsWith('line33:'))).toEqual(currentNetworkModel.connections.filter(link => link.from.startsWith('line33:') || link.to.startsWith('line33:')));
    expect(model.interlocks!.reviews.filter(row => row.status !== 'unresolved')).toHaveLength(301);
    expect(model.interlocks!.reviews.filter(row => row.status === 'unresolved')).toHaveLength(57);
    expect(model.interlocks!.rules).toHaveLength(488);
    expect(currentNetworkModel.starting.devices['rm413a:es-q8:lower']).toBeNull();
  }, 20_000);

  it('rejects changed mechanisms, earth branches, old branch inventory and existing local reviews', () => {
    expect(() => withOwnerFinalControlProfiles(currentNetworkModel, currentNetworkModel.version)).toThrow();
    for (const mutate of [
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'rm413a:es-q8:lower')!.positions[0].pairs = []; },
      (model: typeof currentNetworkModel) => { model.connections.find(link => link.id === 'rm413a:es-q8:upper:branch')!.from = 'rm413a:q1:b'; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'cv006:abs:49-38-1')!.kind = 'breaker'; },
      (model: typeof currentNetworkModel) => { model.interlocks!.reviews.find(row => row.assetId === 'rm413a:q1')!.status = 'confirmed-none'; },
    ]) {
      const changed = structuredClone(currentNetworkModel); mutate(changed);
      expect(() => withOwnerFinalControlProfiles(changed, 'test-stale-final6')).toThrow(/Review required/);
    }
  });
});
