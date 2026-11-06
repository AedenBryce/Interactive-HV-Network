import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { completeControlsNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerFuseContinuity } from '../models/site/owner-fuse-continuity';
import { withOwnerMvDriveScope } from '../models/site/owner-mv-drive-scope';
import { withOwnerMvConverterTransfers } from '../models/site/owner-mv-converter-transfers';
import { withOwnerHpgrOutletProfiles } from '../models/site/owner-hpgr-outlet-profiles';

function prior() { return withOwnerMvConverterTransfers(withOwnerMvDriveScope(withOwnerFuseContinuity(currentNetworkModel, 'test-outlet-fuse'), 'test-outlet-scope'), 'test-outlet-converter'); }
describe('owner82 HPGR motor-side outlet profiles', () => {
  it('starts Service, requires upstream Open/Rack out, and passes through Isolated before earthing the motor', () => {
    const session = new SimulationSession(withOwnerHpgrOutletProfiles(prior(), 'test-outlets7'));
    const outlet = 'hpgr:drive-meb:outlet'; const main = 'hpgr:sw002:a02:k101';
    expect(session.snapshot().devices[outlet]).toBe('service');
    expect(session.snapshot().connectivity['hpgr:motor-meb'].sourceIds.length).toBeGreaterThan(0);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(false);
    expect(session.changeDevice(main, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(false);
    expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(outlet, 'earthed').ok).toBe(false);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(true);
    expect(session.changeDevice(outlet, 'earthed').ok).toBe(true);
    expect(session.snapshot().connectivity['hpgr:motor-meb'].earthIds).toContain(`${outlet}:earth-termination`);
    expect(session.snapshot().connectivity['hpgr:motor-meb'].sourceIds).toEqual([]);
    expect(session.changeDevice(outlet, 'service').ok).toBe(false);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(true);
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'closed').ok).toBe(true);
    expect(session.changeDevice(outlet, 'service').ok).toBe(false);
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'open').ok).toBe(true);
    expect(session.changeDevice(outlet, 'service').ok).toBe(true);
    expect(session.changeDevice(outlet, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.snapshot().model.assets.find(asset => asset.id === outlet)?.knowledge).toBe('unresolved');
  }, 30_000);

  it('keeps the two outlets independent and blocks movements on unknown prerequisites', () => {
    const session = new SimulationSession(withOwnerHpgrOutletProfiles(prior(), 'test-outlet-unknown7'));
    const outlet = 'hpgr:drive-mea:outlet'; const main = 'hpgr:sw002:a04:k101';
    expect(session.changeDevice(main, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(true);
    expect(session.changeDevice(outlet, 'earthed').ok).toBe(true);
    expect(session.snapshot().connectivity['hpgr:motor-mea'].earthIds).toContain(`${outlet}:earth-termination`);
    expect(session.snapshot().connectivity['hpgr:motor-meb'].sourceIds.length).toBeGreaterThan(0);
    const unknown = session.saveScenario(); unknown.devices[main] = { contact: 'open', racking: null };
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(outlet, 'isolated').ok).toBe(false);
    unknown.devices[main] = { contact: 'open', racking: 'out' }; unknown.devices[outlet] = 'isolated'; unknown.devices['hpgr:drive-mea:dc-earth'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(outlet, 'service').ok).toBe(false);
    expect(session.changeDevice(outlet, 'earthed').ok).toBe(true);
  }, 30_000);

  it('adds exactly two selected controls and six local rules with bounded key evidence and original snapshot compatibility', () => {
    const base = prior(); const model = withOwnerHpgrOutletProfiles(base, 'test-outlet-inventory7');
    const session = new SimulationSession(model); const snapshot = session.snapshot();
    expect(Object.keys(snapshot.devices)).toHaveLength(360);
    expect(snapshot.model.interlocks!.reviews).toHaveLength(360);
    expect(snapshot.model.interlocks!.rules).toHaveLength(559);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-HPGR-OUTLET-KEY-DEFERRAL')?.summary).toContain('these two outlets only');
    expect(model.connections).toEqual(base.connections); expect(model.earths).toEqual(base.earths);
    expect(base.starting.devices).not.toHaveProperty('hpgr:drive-meb:outlet');
    const saved = session.saveScenario(); const old = new SimulationSession(base).saveScenario();
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.reset().ok).toBe(false); expect(session.undo().ok).toBe(false);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
  }, 25_000);

  it('rejects changed outlet terminals, earth termination, upstream association or existing mechanisms', () => {
    const base = prior();
    for (const mutate of [
      (model: typeof base) => { model.assets.find(asset => asset.id === 'hpgr:drive-meb:outlet')!.terminals.reverse(); },
      (model: typeof base) => { model.earths = model.earths!.filter(earth => earth.id !== 'hpgr:drive-mea:outlet:earth-termination'); },
      (model: typeof base) => { model.connections.find(link => link.id === 'hpgr:sw002:a02:cable-TF003-P-01')!.from = 'hpgr:sw002:a04:k101:b'; },
      (model: typeof base) => { model.assets.find(asset => asset.id === 'hpgr:drive-mea:outlet')!.sourcePairs = [['hpgr:drive-mea:outlet:vsd', 'hpgr:drive-mea:outlet:motor']]; },
    ]) {
      const changed = structuredClone(base); mutate(changed);
      expect(() => withOwnerHpgrOutletProfiles(changed, 'test-stale-outlet7')).toThrow(/Review required/);
    }
    expect(() => withOwnerHpgrOutletProfiles(base, base.version)).toThrow();
    expect(() => withOwnerHpgrOutletProfiles(withOwnerHpgrOutletProfiles(base, 'test-outlet-repeat7'), 'test-outlet-repeat8')).toThrow();
  });
});
