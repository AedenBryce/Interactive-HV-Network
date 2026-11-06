import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import type { ScenarioFile } from './scenario';
import { currentNetworkModel, contactNetworkModel } from '../models/site/current-network';

describe('accepted .12 scoped main/wire/ground package', () => {
  it('retains the accepted baseline, local profiles and open review records', () => {
    const snapshot = new SimulationSession(currentNetworkModel).snapshot();
    expect(snapshot.model.version).toBe('construction-2026-11-06.12');
    expect(snapshot.model.assets).toHaveLength(700); expect(snapshot.model.connections).toHaveLength(693);
    expect(Object.keys(snapshot.devices)).toHaveLength(378);
    expect(snapshot.model.interlocks!.rules).toHaveLength(584);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker?.supportScope === 'relationship')).toHaveLength(7);
    expect(snapshot.model.earths!.every(earth => ['supported', 'owner-confirmed'].includes(earth.knowledge!))).toBe(true);
    for (const [assetId, state] of Object.entries(contactNetworkModel.starting.devices)) {
      expect(snapshot.model.starting.devices[assetId]).toEqual(state);
    }
    expect(snapshot.model.starting.sources).toEqual(contactNetworkModel.starting.sources);
    for (const previousRule of contactNetworkModel.interlocks!.rules) {
      expect(snapshot.model.interlocks!.rules).toContainEqual(previousRule);
    }
    expect(snapshot.model.boundaries).toEqual(expect.arrayContaining(contactNetworkModel.boundaries!));
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  });

  it('opens the earlier .9 snapshot view-only and restores the accepted .12 scenario', () => {
    const session = new SimulationSession(currentNetworkModel);
    const saved: ScenarioFile = JSON.parse(JSON.stringify(session.saveScenario()));
    const old: ScenarioFile = JSON.parse(JSON.stringify(new SimulationSession(contactNetworkModel).saveScenario()));
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old); expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual([]);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds.length).toBeGreaterThan(0);
    expect(new SimulationSession(contactNetworkModel).saveScenario()).toEqual(old);
  }, 30_000);
});
