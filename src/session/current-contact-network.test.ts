import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { contactNetworkModel as currentNetworkModel, continuationNetworkModel } from '../models/site/current-network';

describe('immutable .9 route/scope/selector package', () => {
  it('integrates confirmed90–96 while preserving separate claims and .8', () => {
    const snapshot = new SimulationSession(currentNetworkModel).snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.9');
    expect(snapshot.model.assets).toHaveLength(684); expect(snapshot.model.connections).toHaveLength(677);
    expect(snapshot.model.assets.flatMap(asset => asset.positions).filter(position => position.supportScope === 'relationship')).toHaveLength(105);
    expect(snapshot.connectivity['rm406:mc406a:bus'].sourceIds).toContain('boundary:tf11');
    expect(snapshot.model.starting).toEqual(continuationNetworkModel.starting);
    expect(snapshot.model.interlocks).toEqual(continuationNetworkModel.interlocks);
    expect(snapshot.model.earths).toEqual(continuationNetworkModel.earths);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(snapshot.model.evidence!.some(record => record.id === 'WN-BINARY-CONTACT-MATRICES')).toBe(true);
  });

  it('opens original .8 view-only and restores .9 without changing historical contact matrices', () => {
    const session = new SimulationSession(currentNetworkModel); const current = session.saveScenario();
    const old = new SimulationSession(continuationNetworkModel).saveScenario();
    expect(session.changeDevice('rm406:cb02', 'open').ok).toBe(true);
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old); expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(old.model.assets.find(asset => asset.id === 'rm406:sw01')?.positions.find(position => position.id === 'earthed')?.pairs).toEqual([['rm406:sw01:cable', 'rm406:sw01:earth']]);
    expect(session.loadScenario(current).ok).toBe(true); expect(session.saveScenario()).toEqual(current);
  }, 30_000);
});
