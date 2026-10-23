import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, electricalPolicyNetworkModel } from '../models/site/current-network';

describe('immutable .8 continuation package', () => {
  it('distributes the two Drop Tower controls and scoped unused-terminal decisions without whole-model acceptance', () => {
    const snapshot = new SimulationSession(currentNetworkModel).snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.8');
    expect(snapshot.model.assets).toHaveLength(684); expect(snapshot.model.connections).toHaveLength(677);
    expect(Object.keys(snapshot.devices)).toHaveLength(362);
    expect(snapshot.model.interlocks!.reviews).toHaveLength(362);
    expect(snapshot.model.interlocks!.reviews.every(review => review.status !== 'unresolved')).toBe(true);
    expect(snapshot.model.interlocks!.rules).toHaveLength(559);
    expect(snapshot.model.boundaries).toHaveLength(318);
    expect(snapshot.model.presentation!.views).toHaveLength(92);
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? [])).toHaveLength(255);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(snapshot.connectivity['drop-tower:tf:p18-8'].sourceIds.length).toBeGreaterThan(0);
  });

  it('roundtrips .8 and opens preserved .7 view-only with its old cables and without new Drop Tower controls', () => {
    const session = new SimulationSession(currentNetworkModel); const current = session.saveScenario();
    const old = new SimulationSession(electricalPolicyNetworkModel).saveScenario();
    expect(session.changeDevice('drop-tower:abs:p18-1', 'open').ok).toBe(true);
    expect(session.loadScenario(current).ok).toBe(true); expect(session.saveScenario()).toEqual(current);
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old); expect(session.snapshot().devices).not.toHaveProperty('drop-tower:abs:p18-1');
    expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.loadScenario(current).ok).toBe(true); expect(session.snapshot().mode).toBe('exploration');
  }, 30_000);
});
