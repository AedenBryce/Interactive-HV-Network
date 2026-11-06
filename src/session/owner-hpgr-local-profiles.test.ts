import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { rmuProfilesNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerHpgrLocalProfiles } from '../models/site/owner-hpgr-local-profiles';

const mains = ['hpgr:sw002:a02:k101', 'hpgr:sw002:a04:k101', 'hpgr:sw002:tf004:k202'];
const earths = ['hpgr:sw002:a02:q8', 'hpgr:sw002:a04:q8', 'hpgr:sw002:tf004:q8'];
describe('owner65/67/69/70 complete HPGR local profiles', () => {
  it('preserves disconnector kinds and enforces all three independent contact/racking/earth profiles', () => {
    const session = new SimulationSession(withOwnerHpgrLocalProfiles(currentNetworkModel, 'test-hpgr6'));
    for (const [index, main] of mains.entries()) {
      const earth = earths[index];
      expect(session.saveScenario().devices[main]).toEqual({ contact: 'closed', racking: 'in' });
      expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(earth, 'closed').ok).toBe(false);
      expect(session.changeDevice(main, { kind: 'contact', value: 'open' }).ok).toBe(true);
      expect(session.changeDevice(earth, 'closed').ok).toBe(false);
      expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(true);
      expect(session.changeDevice(earth, 'closed').ok).toBe(true);
      expect(session.changeDevice(main, { kind: 'racking', value: 'in' }).ok).toBe(false);
      expect(session.changeDevice(main, { kind: 'contact', value: 'closed' }).ok).toBe(false);
      expect(session.changeDevice(earth, 'open').ok).toBe(true);
      expect(session.changeDevice(main, { kind: 'racking', value: 'in' }).ok).toBe(true);
      expect(session.changeDevice(main, { kind: 'contact', value: 'closed' }).ok).toBe(true);
      expect(session.snapshot().model.assets.find(asset => asset.id === main)?.kind).toBe('disconnector');
    }
  }, 45_000);

  it('requires all four named mechanisms Open/Rack out before A01 earth Close', () => {
    const session = new SimulationSession(withOwnerHpgrLocalProfiles(currentNetworkModel, 'test-hpgr-incoming6'));
    const earth = 'hpgr:sw002:a01:q8'; const cb = 'sw435:hpgr:cb';
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    for (const main of [cb, ...mains]) {
      expect(session.changeDevice(main, { kind: 'contact', value: 'open' }).ok).toBe(true);
      expect(session.changeDevice(earth, 'closed').ok).toBe(false);
      expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(true);
    }
    expect(session.changeDevice(earth, 'closed').ok).toBe(true);
    const unknown = session.saveScenario(); unknown.devices[mains[1]] = { contact: 'open', racking: null };
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(earth, 'open').ok).toBe(true);
    expect(session.changeDevice('sw435:hpgr:es', 'closed').ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
  }, 45_000);

  it('keeps DC earth prerequisites separate by drive without adding converter continuity', () => {
    const session = new SimulationSession(withOwnerHpgrLocalProfiles(currentNetworkModel, 'test-hpgr-dc6'));
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'closed').ok).toBe(false);
    expect(session.changeDevice(mains[0], { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(mains[0], { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'closed').ok).toBe(true);
    expect(session.changeDevice('hpgr:drive-mea:dc-earth', 'closed').ok).toBe(false);
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'open').ok).toBe(true);
    const model = session.snapshot().model;
    for (const name of ['mea', 'meb']) expect(model.assets.find(asset => asset.id === `hpgr:drive-${name}:converter`)).toEqual(currentNetworkModel.assets.find(asset => asset.id === `hpgr:drive-${name}:converter`));
  }, 30_000);

  it('changes only eleven reviews, twenty-three rules and three mechanism baselines; preserves old scenarios view-only', () => {
    const before = structuredClone(currentNetworkModel);
    const session = new SimulationSession(withOwnerHpgrLocalProfiles(before, 'test-hpgr-inventory6'));
    const { model } = session.snapshot();
    expect(model.interlocks!.reviews.filter(row => row.status !== 'unresolved')).toHaveLength(309);
    expect(model.interlocks!.rules).toHaveLength(506);
    expect(model.assets.filter(asset => asset.removableDisconnector).map(asset => asset.id)).toEqual(mains);
    expect(model.connections).toEqual(before.connections);
    expect(model.earths).toEqual(before.earths);
    expect(model.boundaries).toEqual(before.boundaries);
    expect(before).toEqual(currentNetworkModel);
    expect(session.loadScenario(new SimulationSession(before).saveScenario()).ok).toBe(true);
    expect(session.changeDevice(mains[0], { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.reset().ok).toBe(false);
  }, 30_000);

  it('rejects changed key scope, fuse order, DC association and mechanism/review inventory', () => {
    expect(() => withOwnerHpgrLocalProfiles(currentNetworkModel, currentNetworkModel.version)).toThrow();
    for (const mutate of [
      (model: typeof currentNetworkModel) => { model.evidence = model.evidence!.filter(row => row.id !== 'WN-DEFERRED-KEY-DOOR-INCHING'); },
      (model: typeof currentNetworkModel) => { model.connections.find(link => link.id === 'hpgr:sw002:tf004:q8:branch')!.from = 'hpgr:sw002:tf004:k202:b'; },
      (model: typeof currentNetworkModel) => { model.connections.find(link => link.id === 'hpgr:drive-meb:dc-earth:branch')!.from = 'hpgr:drive-mea:converter:dc'; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === mains[0])!.kind = 'breaker'; },
      (model: typeof currentNetworkModel) => { model.interlocks!.reviews.find(row => row.assetId === earths[0])!.status = 'confirmed-none'; },
    ]) {
      const changed = structuredClone(currentNetworkModel); mutate(changed);
      expect(() => withOwnerHpgrLocalProfiles(changed, 'test-stale-hpgr6')).toThrow(/Review required/);
    }
  });
});
