import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel } from '../models/site/current-network';
import { withOwnerRemovableBreakers } from '../models/site/owner-removable-breakers';

describe('owner-selected site breaker mechanisms through the session', () => {
  it('converts the 119 reviewed mechanisms without assigning states, changing wires or accepting interlocks', () => {
    const before = structuredClone(currentNetworkModel);
    const session = new SimulationSession(withOwnerRemovableBreakers(currentNetworkModel, 'mechanism-review-2026-10-23'));
    const { model, devices } = session.saveScenario();
    const snapshot = session.snapshot();
    expect(currentNetworkModel).toEqual(before);
    expect(session.saveScenario().formatVersion).toBe(2);
    expect(model.assets.filter(asset => asset.removableBreaker)).toHaveLength(119);
    for (const id of ['sw411:bus-tie:cb', 'sw431:sw435:cb', 'sw435:sw431:cb', 'station:sb01:f4:cb', 'station:sb02:f1:cb', 'station:sb02:f4:cb', 'mine:sw441:in:cb', 'mine:tf441:cb', 'wh:h7:mc418:in']) {
      expect(devices[id]).toEqual({ contact: null, racking: null });
      expect(snapshot.switching[id].actions).toHaveLength(4);
      expect(snapshot.switching[id].actions!.every(action => !action.allowed)).toBe(true);
      expect(model.interlocks!.reviews.find(review => review.assetId === id)?.status).toBe('unresolved');
    }
    for (const asset of model.assets.filter(asset => asset.removableBreaker)) {
      const prior = before.assets.find(item => item.id === asset.id)!;
      expect(asset.removableBreaker!.mainPair).toEqual(prior.positions.find(position => position.id === 'closed')!.pairs[0]);
      expect(asset.positions).toEqual([]);
      expect(asset.knowledge).toBe(prior.knowledge);
    }
    expect(model.assets.filter(asset => asset.kind === 'breaker' && !asset.removableBreaker)).toHaveLength(38);
    expect(model.assets.find(asset => asset.id === 'line33:pole-1-recloser')).toEqual(before.assets.find(asset => asset.id === 'line33:pole-1-recloser'));
    expect(model.connections).toEqual(before.connections);
    expect(model.earths).toEqual(before.earths);
    expect(model.boundaries).toEqual(before.boundaries);
    expect(model.starting.sources).toEqual(before.starting.sources);
    expect(model.interlocks).toEqual(before.interlocks);
    expect(model.presentation).toEqual(before.presentation);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);
  it('rejects a stale asset set or changed main pair rather than guessing a mechanism mapping', () => {
    const session = new SimulationSession(currentNetworkModel); const before = session.saveScenario();
    const missing = structuredClone(currentNetworkModel);
    missing.assets = missing.assets.filter(asset => asset.id !== 'line33:pole-1-recloser');
    expect(() => session.loadModel(withOwnerRemovableBreakers(missing, 'invalid-missing'))).toThrow(/exact retained asset set/);
    const changed = structuredClone(currentNetworkModel);
    changed.assets.find(asset => asset.id === 'sw411:bus-tie:cb')!.positions.find(position => position.id === 'closed')!.pairs = [];
    expect(() => session.loadModel(withOwnerRemovableBreakers(changed, 'invalid-pair'))).toThrow(/exact main pair/);
    expect(session.saveScenario()).toEqual(before);
  });
});
