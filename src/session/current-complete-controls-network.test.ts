import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { isIndependentState } from './mechanisms';
import { currentNetworkModel, rmuProfilesNetworkModel } from '../models/site/current-network';

describe('immutable .6 owner-selected complete local controls package', () => {
  it('distributes every selected local profile and baseline while leaving whole-network acceptance open', () => {
    const session = new SimulationSession(currentNetworkModel); const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.6');
    expect(snapshot.model.assets).toHaveLength(680);
    expect(snapshot.model.connections).toHaveLength(676);
    expect(Object.keys(snapshot.devices)).toHaveLength(358);
    expect(snapshot.model.interlocks!.reviews).toHaveLength(358);
    expect(snapshot.model.interlocks!.reviews.every(row => row.status !== 'unresolved')).toBe(true);
    expect(snapshot.model.interlocks!.rules).toHaveLength(553);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker)).toHaveLength(121);
    expect(snapshot.model.assets.filter(asset => asset.removableContactor)).toHaveLength(24);
    expect(snapshot.model.assets.filter(asset => asset.removableDisconnector)).toHaveLength(3);
    const states = Object.values(snapshot.devices);
    expect(states.every(state => isIndependentState(state) ? state.contact !== null && state.racking !== null : state !== null)).toBe(true);
    expect(states.filter(state => isIndependentState(state) && state.racking === 'in')).toHaveLength(145);
    expect(states.filter(state => isIndependentState(state) && state.racking === 'out')).toHaveLength(3);
    expect(snapshot.model.reviews!.find(row => row.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? [])).toEqual(rmuProfilesNetworkModel.assets.flatMap(asset => asset.sourceArcs ?? []));
    expect(snapshot.model.earths).toEqual(rmuProfilesNetworkModel.earths);
    expect(snapshot.model.boundaries).toEqual(rmuProfilesNetworkModel.boundaries);
    expect(rmuProfilesNetworkModel.version).toBe('construction-2026-10-23.5');
    expect(rmuProfilesNetworkModel.starting.devices['rm712:in01']).toBeNull();
    expect(rmuProfilesNetworkModel.starting.devices['cv006:abs:49-38-1']).toBeNull();
  }, 20_000);

  it('reopens matching .6 and original .5 self-contained snapshots with their original control inventories', () => {
    const session = new SimulationSession(currentNetworkModel); const saved = session.saveScenario();
    expect(saved.formatVersion).toBe(2);
    expect(session.changeDevice('rm712:in01', 'closed').ok).toBe(true);
    expect(session.loadScenario(saved).ok).toBe(true);
    expect(session.saveScenario()).toEqual(saved);
    const old = new SimulationSession(rmuProfilesNetworkModel).saveScenario();
    expect(session.loadScenario(old).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old);
    expect(session.undo().ok).toBe(false); expect(session.reset().ok).toBe(false);
    expect(session.loadScenario(saved).ok).toBe(true);
    expect(session.snapshot().mode).toBe('exploration');
  }, 20_000);
});
