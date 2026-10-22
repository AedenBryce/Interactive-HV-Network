import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, expandedProfilesNetworkModel } from '../models/site/current-network';

describe('current RMU and drive-output profile package', () => {
  it('composes only the additional selected reviews while retaining baseline and relationship claims', () => {
    const previous = new SimulationSession(expandedProfilesNetworkModel).saveScenario();
    const session = new SimulationSession(currentNetworkModel); const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.5');
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(298);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(62);
    expect(snapshot.model.interlocks!.rules).toHaveLength(483);
    expect(snapshot.devices).toEqual(previous.devices);
    expect(snapshot.sources).toEqual(previous.sources);
    expect(snapshot.model.connections).toEqual(previous.model.connections);
    expect(snapshot.model.earths).toEqual(previous.model.earths);
    expect(snapshot.model.boundaries).toEqual(previous.model.boundaries);
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? [])).toEqual(previous.model.assets.flatMap(asset => asset.sourceArcs ?? []));
    expect(snapshot.model.assets.filter(asset => asset.removableContactor)).toHaveLength(24);
    expect(snapshot.switching['rm406:sw01'].reviewStatus).toBe('confirmed-rules');
    expect(snapshot.switching['rm714:in01:es'].reviewStatus).toBe('confirmed-rules');
    expect(snapshot.switching['sw505:vs50501:dc-earth'].reviewStatus).toBe('confirmed-rules');
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    const saved = session.saveScenario();
    expect(saved.formatVersion).toBe(2);
    expect(session.loadScenario(previous)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(previous);
    expect(session.changeDevice('rm406:sw01', 'isolated').ok).toBe(false);
    expect(session.reset().ok).toBe(false);
    expect(session.loadScenario(saved)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('exploration');
  }, 30_000);
});
