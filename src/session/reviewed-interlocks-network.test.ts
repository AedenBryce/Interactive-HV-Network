import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, ownerConfiguredNetworkModel } from '../models/site/current-network';

describe('current additional-interlock review package', () => {
  it('adds only selected profiles and current notes while preserving the distributed baseline package', () => {
    const old = new SimulationSession(ownerConfiguredNetworkModel).saveScenario();
    const session = new SimulationSession(currentNetworkModel); const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.3');
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(169);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(191);
    expect(snapshot.model.interlocks!.rules).toHaveLength(304);
    expect(snapshot.devices).toEqual(old.devices);
    expect(snapshot.sources).toEqual(old.sources);
    expect(snapshot.model.connections).toEqual(old.model.connections);
    expect(snapshot.model.earths).toEqual(old.model.earths);
    expect(snapshot.model.assets.filter(asset => asset.sourceArcs?.length)).toEqual([]);
    expect(snapshot.model.reviews!.find(review => review.id === 'C2-R11')?.question).toContain('Historical construction note');
    expect(snapshot.model.assets.find(asset => asset.id === 'boundary:tf11')?.label).toContain('Simulation supply input');
    expect(snapshot.switching['sw411:bus-a:es'].reviewStatus).toBe('unresolved');
    expect(session.changeDevice('sw411:bus-tie:cb', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice('sw411:bus-tie:cb', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario().devices).toEqual(old.devices);
    expect(session.loadScenario(JSON.parse(JSON.stringify(old)))).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old);
    expect(old.modelVersion).toBe('construction-2026-10-23.2');
    expect(old.model.reviews!.find(review => review.id === 'C2-R11')?.question).toContain('All represented control baselines remain null and blocked.');
  }, 30_000);
});
