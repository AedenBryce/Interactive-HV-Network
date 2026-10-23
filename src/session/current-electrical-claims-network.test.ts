import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, contactNetworkModel } from '../models/site/current-network';

describe('immutable .10 scoped main/wire/ground package', () => {
  it('retains the agreed baseline and local profiles without accepting the whole model', () => {
    const snapshot = new SimulationSession(currentNetworkModel).snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.10');
    expect(snapshot.model.assets).toHaveLength(684); expect(snapshot.model.connections).toHaveLength(677);
    expect(Object.keys(snapshot.devices)).toHaveLength(362);
    expect(snapshot.model.interlocks!.rules).toHaveLength(559);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker?.supportScope === 'relationship')).toHaveLength(7);
    expect(snapshot.model.earths!.every(earth => ['supported', 'owner-confirmed'].includes(earth.knowledge!))).toBe(true);
    expect(snapshot.model.starting).toEqual(contactNetworkModel.starting);
    expect(snapshot.model.interlocks).toEqual(contactNetworkModel.interlocks);
    expect(snapshot.model.boundaries).toEqual(contactNetworkModel.boundaries);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  });

  it('opens original .9 view-only and restores .10 without upgrading historical paths or earths', () => {
    const session = new SimulationSession(currentNetworkModel); const saved = session.saveScenario();
    const old = new SimulationSession(contactNetworkModel).saveScenario();
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old); expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual([]);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds.length).toBeGreaterThan(0);
    expect(new SimulationSession(contactNetworkModel).saveScenario()).toEqual(old);
  }, 30_000);
});
