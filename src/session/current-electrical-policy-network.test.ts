import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, completeControlsNetworkModel } from '../models/site/current-network';

describe('immutable .7 selected fuse/converter/outlet package', () => {
  it('integrates the selected electrical policies and preserves the separate unaccepted equipment/coverage claims', () => {
    const session = new SimulationSession(currentNetworkModel); const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.7');
    expect(snapshot.model.assets).toHaveLength(680); expect(snapshot.model.connections).toHaveLength(676);
    expect(Object.keys(snapshot.devices)).toHaveLength(360);
    expect(snapshot.model.interlocks!.reviews).toHaveLength(360);
    expect(snapshot.model.interlocks!.reviews.every(review => review.status !== 'unresolved')).toBe(true);
    expect(snapshot.model.interlocks!.rules).toHaveLength(559);
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? [])).toHaveLength(251);
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? []).filter(arc => arc.knowledge === 'owner-confirmed')).toHaveLength(162);
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? []).filter(arc => arc.knowledge === 'unresolved')).toHaveLength(89);
    expect(snapshot.model.assets.flatMap(asset => asset.positions).filter(position => position.supportScope === 'relationship')).toHaveLength(6);
    for (const id of ['hpgr:motor-meb', 'hpgr:motor-mea', 'sw505:sb214-em01', 'sw505:sb215-em01', 'sw505:sb216-em01']) expect(snapshot.connectivity[id].sourceIds.length).toBeGreaterThan(0);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(snapshot.model.earths).toEqual(completeControlsNetworkModel.earths);
    expect(snapshot.model.boundaries).toEqual(completeControlsNetworkModel.boundaries);
    expect(completeControlsNetworkModel.version).toBe('construction-2026-10-23.6');
    expect(completeControlsNetworkModel.starting.devices).not.toHaveProperty('hpgr:drive-meb:outlet');
  }, 20_000);

  it('roundtrips the current package and keeps the original .6 scenario view-only without filling new outlet states', () => {
    const session = new SimulationSession(currentNetworkModel); const saved = session.saveScenario();
    expect(session.changeDevice('sw505:vs50501:output-switch', 'open').ok).toBe(true);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
    const old = new SimulationSession(completeControlsNetworkModel).saveScenario();
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old);
    expect(session.snapshot().devices).not.toHaveProperty('hpgr:drive-meb:outlet');
    expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.snapshot().mode).toBe('exploration');
  }, 20_000);
});
