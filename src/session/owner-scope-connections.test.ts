import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import { withOwnerScopeConnections } from '../models/site/owner-scope-connections';

describe('owner scope and Services connection decisions', () => {
  it('excludes mine/camp while retaining Services and source provenance without mutating its input', () => {
    const base = withStationBatteryLimits(wholeNetworkModel, 'scope-input');
    const before = structuredClone(base);
    const { model, devices, sources } = new SimulationSession(withOwnerScopeConnections(base, 'scope-test-1')).saveScenario();
    expect(base).toEqual(before);
    expect(model.assets.some(asset => asset.id.startsWith('camp:') || /^mine:(rm711|sw711|tf717|db717)/.test(asset.id))).toBe(false);
    expect(model.assets.some(asset => asset.id === 'mine:rm718:bus')).toBe(true);
    expect(model.assets.some(asset => asset.id === 'mine:sw441:bus')).toBe(true);
    expect(model.presentation!.views.some(view => view.id.includes('/camp-'))).toBe(false);
    expect(model.presentation!.views.find(view => view.id === 'whole/overview')?.regions?.find(region => region.id === 'mine-camp')?.label).toContain('RM718');
    expect(model.assets.some(asset => asset.id === 'rm712:bus')).toBe(true);
    expect(model.sources.map(source => source.id)).toEqual(['rm712:dg1:supply', 'rm712:dg7:supply', 'boundary:tf11', 'boundary:tf12', 'boundary:tf04']);
    expect(model.evidence).toEqual(expect.arrayContaining(base.evidence!));
    expect(model.evidence!.find(record => record.id === 'WN-EXCLUDE-MINE-CAMP')).toMatchObject({ status: 'owner-confirmed', confirmation: { decision: 'Exclude mine-services and village/camp networks' } });
    expect(Object.values(devices).every(value => value === null)).toBe(true);
    expect(Object.values(sources).every(value => value === null)).toBe(true);
  }, 20_000);
  it('keeps the TF04 to Hopper10 route and only abstract takeoffs for other 33kV branches', () => {
    const snapshot = new SimulationSession(withOwnerScopeConnections(withStationBatteryLimits(wholeNetworkModel, 'line-input'), 'line-test')).snapshot();
    for (const id of ['line33:pole-1-recloser', 'line33:pole-2-abs', 'line33:tie-in-abs', 'line33:pole-201-abs', 'line33:hopper-286-fused-abs']) {
      expect(snapshot.model.assets.find(asset => asset.id === id)).toEqual(wholeNetworkModel.assets.find(asset => asset.id === id));
      expect(snapshot.devices[id]).toBeNull();
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
    }
    for (const id of ['future-4a-fused-abs', 'future-214-abs', 'norfolk-227-abs', 'pole-272-abs', 'end-287-abs']) expect(snapshot.model.assets.some(asset => asset.id === `line33:${id}`)).toBe(false);
    for (const [key, pole] of [['future-4a', '4'], ['future-214', '214'], ['norfolk', '227'], ['pole-272-1', '272'], ['bigge-sp1', '284'], ['bigge-sp1-sp2', '284'], ['end-287', '286']]) {
      expect(snapshot.model.connections.find(connection => connection.id === `owner-scope:line33:takeoff:${key}`)).toMatchObject({ from: `line33:pole-${pole}:port`, to: `line33:${key}:interface:port`, knowledge: 'provisional' });
      expect(snapshot.model.assets.find(asset => asset.id === `line33:${key}:interface`)?.label).toContain('Branch takeoff');
      expect(snapshot.model.boundaries).toContainEqual(expect.objectContaining({ terminal: `line33:${key}:interface:port`, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' }));
    }
    expect(snapshot.model.connections.find(connection => connection.id === 'whole:join:hopper10-tf04')).toEqual(wholeNetworkModel.connections.find(connection => connection.id === 'whole:join:hopper10-tf04'));
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-LINE33-H10-SCOPE')).toMatchObject({ confirmation: { decision: 'that 33kV line is only relevant for the Hopper 10 stuff. Can show the branch points but no further details from that' } });
  }, 20_000);
  it('joins the owner-named cable sides without confirming a cable tag, former route or switching permission', () => {
    const session = new SimulationSession(withOwnerScopeConnections(withStationBatteryLimits(wholeNetworkModel, 'rm712-input'), 'rm712-test'));
    const snapshot = session.snapshot();
    expect(snapshot.model.connections.find(connection => connection.id === 'owner:join:rm721-rm712')).toMatchObject({ from: 'rm721:in02:b', to: 'rm712:in02:a', knowledge: 'owner-confirmed', evidenceIds: ['WN-RM721-RM712-IN02'] });
    expect(snapshot.model.connections.some(connection => ['rm721:in02-remote-rm712', 'rm712:sw426-reference-cable'].includes(connection.id))).toBe(false);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-RM721-RM712-IN02')).toMatchObject({ confirmation: { decision: 'RM721 goes through SF RM712 IN02 at RM712' } });
    expect(snapshot.model.reviews!.find(review => review.id === 'SV-Q02')).toMatchObject({ status: 'resolved' });
    expect(snapshot.model.reviews!.find(review => review.id === 'SV-Q03')).toMatchObject({ status: 'resolved' });
    for (const id of ['SV-Q04', 'SV-Q05', 'DES-Q01']) expect(snapshot.model.reviews!.find(review => review.id === id)?.status).toBe('open');
    expect(snapshot.model.assets.find(asset => asset.id === 'rm712:interface:sw426')).toMatchObject({ knowledge: 'unresolved', label: expect.stringContaining('Historical disputed') });
    expect(snapshot.model.assets.find(asset => asset.id === 'rm712:interface:sw426')?.aliases).toContain('RM712-P-01');
    expect(snapshot.model.assets.find(asset => asset.id === 'rm712:in02')?.aliases).not.toContain('RM712-P-01');
    for (const id of ['rm721:in02', 'rm712:in02']) {
      expect(snapshot.devices[id]).toBeNull();
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
    }
    const historical = new SimulationSession(wholeNetworkModel);
    expect(historical.loadScenario(JSON.parse(JSON.stringify(session.saveScenario())))).toEqual({ ok: true });
    expect(historical.saveScenario().model).toEqual(snapshot.model);
    expect(historical.snapshot().mode).toBe('view-only');
  }, 20_000);
});
