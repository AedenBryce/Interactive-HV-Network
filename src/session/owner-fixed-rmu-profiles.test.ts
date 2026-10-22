import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { rmuProfilesNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerFixedRmuProfiles } from '../models/site/owner-fixed-rmu-profiles';

describe('owner68/71/72 fixed RMU profiles', () => {
  it('selects the installed unconnected RM712 IN01 baseline and the exact ten fixed controls', () => {
    const session = new SimulationSession(withOwnerFixedRmuProfiles(currentNetworkModel, 'test-fixed-rmu6'));
    const before = session.saveScenario();
    expect(before.devices['rm712:in01']).toBe('open');
    for (const id of ['rm712:in01', 'rm712:in02', 'rm712:tf712:cb', 'rm713:in01', 'rm713:in02', 'rm713:tf713:cb', 'rm413:in01', 'rm413:in02', 'rm413:tf413:cb', 'rm413:tf414:cb']) {
      expect(session.changeDevice(id, 'open').ok).toBe(true);
      expect(session.changeDevice(id, 'closed').ok).toBe(true);
      expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(false);
    }
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario().devices).toEqual(before.devices);
  }, 30_000);

  it('enforces all RM412 common-bar earth and separate Q100/S102 dependencies', () => {
    const session = new SimulationSession(withOwnerFixedRmuProfiles(currentNetworkModel, 'test-fixed-rm412-6'));
    const change = (suffix: string, position: string) => session.changeDevice(`rm412:${suffix}`, position);
    expect(change('feeder-contact', 'open').ok).toBe(false);
    expect(change('e100', 'closed').ok).toBe(false);
    expect(change('q100', 'open').ok).toBe(true);
    expect(change('feeder-contact', 'open').ok).toBe(true);
    expect(change('e102', 'closed').ok).toBe(true);
    expect(change('feeder-contact', 'closed').ok).toBe(false);
    expect(change('q100', 'closed').ok).toBe(false);
    for (const suffix of ['s100', 's101']) expect(change(suffix, 'open').ok).toBe(true);
    expect(change('e100', 'closed').ok).toBe(true);
    expect(change('e101', 'closed').ok).toBe(true);
    for (const suffix of ['s100', 's101', 'q100']) expect(change(suffix, 'closed').ok).toBe(false);
    for (const suffix of ['e100', 'e101', 'e102']) expect(change(suffix, 'open').ok).toBe(true);
    expect(change('q100', 'closed').ok).toBe(false);
    expect(change('feeder-contact', 'closed').ok).toBe(true);
    expect(change('q100', 'closed').ok).toBe(true);
    expect(change('e102', 'closed').ok).toBe(false);
    const unknown = session.saveScenario(); unknown.devices['rm412:e101'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(change('s100', 'closed').ok).toBe(false);
    expect(change('s101', 'closed').ok).toBe(false);
    expect(change('q100', 'closed').ok).toBe(false);
    expect(change('e101', 'open').ok).toBe(true);
    expect(change('s100', 'closed').ok).toBe(true);
  }, 30_000);

  it('changes only scoped local reviews, S102 identity and IN01 presence/baseline; RM413A stays blocked', () => {
    const base = structuredClone(currentNetworkModel);
    const session = new SimulationSession(withOwnerFixedRmuProfiles(base, 'test-fixed-inventory6'));
    const { model } = session.snapshot();
    expect(model.interlocks!.reviews.filter(row => row.status !== 'unresolved')).toHaveLength(315);
    expect(model.interlocks!.rules).toHaveLength(491);
    expect(model.assets.find(asset => asset.id === 'rm412:feeder-contact')?.label).toContain('S102');
    expect(model.assets.find(asset => asset.id === 'rm712:in01')?.evidenceIds).toContain('WN-RM712-IN01-PRESENCE');
    expect(model.connections).toEqual(base.connections);
    expect(model.earths).toEqual(base.earths);
    expect(model.boundaries).toEqual(base.boundaries);
    expect(base).toEqual(currentNetworkModel);
    expect(session.changeDevice('rm413a:q1', 'open').ok).toBe(false);
    expect(session.changeDevice('rm413a:es-q8:lower', 'service').ok).toBe(false);
    const old = new SimulationSession(base).saveScenario();
    expect(session.loadScenario(old).ok).toBe(true);
    expect(session.reset().ok).toBe(false);
    expect(session.changeDevice('rm712:in01', 'closed').ok).toBe(false);
  }, 30_000);

  it('rejects changed inventories, mechanisms, branch associations and existing selections', () => {
    const sameVersion = () => withOwnerFixedRmuProfiles(currentNetworkModel, currentNetworkModel.version);
    expect(sameVersion).toThrow();
    for (const mutation of [
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'rm412:s100')!.kind = 'breaker'; },
      (model: typeof currentNetworkModel) => { model.connections.find(link => link.id === 'rm412:e100:branch')!.from = 'rm412:s100:a'; },
      (model: typeof currentNetworkModel) => { model.starting.devices['rm712:in01'] = 'closed'; },
      (model: typeof currentNetworkModel) => { model.interlocks!.reviews.find(row => row.assetId === 'rm413:in02')!.status = 'confirmed-none'; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'rm712:in02')!.removableDisconnector = { mainPair: ['rm712:in02:a', 'rm712:in02:b'] }; },
    ]) {
      const changed = structuredClone(currentNetworkModel); mutation(changed);
      expect(() => withOwnerFixedRmuProfiles(changed, 'test-stale-fixed6')).toThrow(/Review required/);
    }
    const selected = withOwnerFixedRmuProfiles(currentNetworkModel, 'test-already-fixed6');
    expect(() => withOwnerFixedRmuProfiles(selected, 'test-already-fixed7')).toThrow();
  });
});
