import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import { withOwnerScopeConnections } from '../models/site/owner-scope-connections';
import { withOwnerFollowups } from '../models/site/owner-followups';
import { withOwnerIdentityCorrections } from '../models/site/owner-identities';
import { withOwnerRouteConfirmations } from '../models/site/owner-routes';
import { withMc413Detail } from '../models/site/mc413-detail';

const previous = () => {
  const limited = withStationBatteryLimits(wholeNetworkModel, 'routes-base');
  const scoped = withOwnerScopeConnections(limited, 'routes-base');
  const followups = withOwnerFollowups(scoped, 'routes-base');
  return withMc413Detail(withOwnerIdentityCorrections(followups, 'routes-base'), 'routes-base');
};

describe('named owner-confirmed cable routes', () => {
  it('confirms the existing RM413 cable-side fork without a bus-side bypass or broader hardware acceptance', () => {
    const base = previous(); const before = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerRouteConfirmations(base, 'route-fork')).snapshot();
    expect(base).toEqual(before);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-RM413-DOUBLE-BOOT')).toMatchObject({ confirmation: { decision: 'yes it is' }, summary: expect.stringContaining('Is RM413 IN02’s cable side currently a double-boot connection serving both RM417 (Hopper 1) and RM413A?') });
    for (const [id, from, to] of [['rm413:in02-rm417', 'rm413:in02:a', 'rm413:interface:rm417:port'], ['rm413:double-boot-rm413a', 'rm413:in02:a', 'rm413a:bus:bar']]) expect(snapshot.model.connections.find(connection => connection.id === id)).toMatchObject({ from, to, knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-RM413-DOUBLE-BOOT']) });
    expect(snapshot.model.connections.find(connection => connection.id === 'whole:join:hopper1')?.knowledge).toBe('owner-confirmed');
    expect(snapshot.model.connections.find(connection => connection.id === 'wh:h1:rm413-cable')).toEqual(base.connections.find(connection => connection.id === 'wh:h1:rm413-cable'));
    expect(snapshot.model.connections.map(({ id, from, to }) => ({ id, from, to }))).toEqual(base.connections.map(({ id, from, to }) => ({ id, from, to })));
    expect(snapshot.model.reviews!.find(review => review.id === 'SV-Q09')).toMatchObject({ status: 'open' });
    expect(snapshot.devices['rm413:in02']).toBeNull();
    expect(snapshot.switching['rm413:in02'].positions.every(position => !position.allowed)).toBe(true);
  }, 20_000);
  it('confirms the RM406 Hopper8 route through its existing fork without merging the Hopper3 SS416 assets', () => {
    const base = previous(); const { model, devices } = new SimulationSession(withOwnerRouteConfirmations(base, 'route-hopper8')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-HOPPER8-RM406-ROUTE')).toMatchObject({ confirmation: { decision: 'yes' }, summary: expect.stringContaining('RM406 CB03/SW04') });
    for (const id of ['rm406:cb03-sw04', 'rm406:sw04-hopper8', 'whole:join:hopper8', 'wh:h8:rm406-cable', 'wh:h8:tf416:input', 'wh:h8:tf416a:input']) expect(model.connections.find(connection => connection.id === id)).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-HOPPER8-RM406-ROUTE']) });
    expect(model.assets.filter(asset => asset.id.startsWith('wh:h3:'))).toEqual(base.assets.filter(asset => asset.id.startsWith('wh:h3:')));
    for (const id of ['wh:h8:tf416', 'wh:h8:tf416a']) {
      expect(model.assets.find(asset => asset.id === id)?.sourcePairs).toEqual(base.assets.find(asset => asset.id === id)?.sourcePairs);
      expect(model.assets.find(asset => asset.id === id)?.knowledge).toBe('provisional');
    }
    for (const id of ['WH-Q01', 'WH-Q04', 'WH-Q07', 'CV-R08']) expect(model.reviews!.find(review => review.id === id)?.status).toBe('open');
    expect(devices['rm406:cb03']).toBeNull(); expect(devices['rm406:sw04']).toBeNull();
  });
  it('confirms RM410 to RM419 then RM418 through the real controls without restoring the removed conducting proxy', () => {
    const base = previous(); const session = new SimulationSession(withOwnerRouteConfirmations(base, 'route-hopper9-7')); const snapshot = session.snapshot();
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-HOPPER9-HOPPER7-ROUTE')).toMatchObject({ confirmation: { decision: 'yes' }, summary: expect.stringContaining('RM419 SW02 to RM418 SW01') });
    for (const id of ['rm410:cb03-sw04', 'rm410:sw04-rm419', 'whole:join:hopper9', 'wh:h9:rm410-cable', 'wh:h9:sw01-bus', 'wh:h9:sw02-bus', 'wh:h9-to-h7:cable', 'wh:h7:sw01-bus']) expect(snapshot.model.connections.find(connection => connection.id === id)).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-HOPPER9-HOPPER7-ROUTE']) });
    expect(snapshot.model.connections.find(connection => connection.id === 'wh:h9-to-h7:cable')).toMatchObject({ from: 'wh:h9:rm419:sw02:line', to: 'wh:h7:rm418:sw01:a' });
    expect(snapshot.model.assets.find(asset => asset.id === 'rm410:interface:rm419')).toMatchObject({ sourcePairs: [], earthPairs: [] });
    expect(snapshot.model.connections.some(connection => connection.id === 'rm410:rm419-through-rm418')).toBe(false);
    expect(snapshot.model.assets.map(asset => [asset.id, asset.terminals, asset.conductivePairs, asset.sourcePairs, asset.earthPairs, asset.positions])).toEqual(base.assets.map(asset => [asset.id, asset.terminals, asset.conductivePairs, asset.sourcePairs, asset.earthPairs, asset.positions]));
    expect(snapshot.model.earths).toEqual(base.earths);
    expect(snapshot.model.starting).toEqual(base.starting);
    expect(snapshot.model.interlocks).toEqual(base.interlocks);
    expect(snapshot.model.presentation!.views.map(({ label: _label, ...view }) => view)).toEqual(base.presentation!.views.map(({ label: _label, ...view }) => view));
    expect(Object.values(snapshot.switching).every(control => control.positions.every(position => !position.allowed))).toBe(true);
    for (const id of ['WH-Q02', 'WH-Q03', 'WH-Q05', 'WH-Q08', 'CV-R08', 'CV-R09']) expect(snapshot.model.reviews!.find(review => review.id === id)?.status).toBe('open');
    const historical = new SimulationSession(wholeNetworkModel);
    expect(historical.loadScenario(JSON.parse(JSON.stringify(session.saveScenario())))).toEqual({ ok: true });
    expect(historical.saveScenario().model).toEqual(snapshot.model);
  }, 20_000);
  it('confirms the RM417 CB02/SW04 Hopper3 fork while retaining a distinct Hopper8 source', () => {
    const base = previous(); const { model } = new SimulationSession(withOwnerRouteConfirmations(base, 'route-hopper3')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-HOPPER3-RM417-ROUTE')).toMatchObject({ confirmation: { decision: 'yes' } });
    for (const id of ['wh:h1:cb02-sw04', 'wh:h1:hopper3-cable', 'wh:h3:tf416:input', 'wh:h3:tf416a:input']) expect(model.connections.find(connection => connection.id === id)).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-HOPPER3-RM417-ROUTE']) });
    expect(model.assets.filter(asset => asset.id.startsWith('wh:h3:') || asset.id.startsWith('wh:h8:'))).toEqual(base.assets.filter(asset => asset.id.startsWith('wh:h3:') || asset.id.startsWith('wh:h8:')));
    expect(model.connections.some(connection => [connection.from, connection.to].some(terminal => terminal.startsWith('wh:h3:')) && [connection.from, connection.to].some(terminal => terminal.startsWith('wh:h8:')))).toBe(false);
  });
  it('confirms Hopper7 CB03 as the shared transformer feeder and CB04 as spare without inferring no external cable', () => {
    const base = previous(); const snapshot = new SimulationSession(withOwnerRouteConfirmations(base, 'route-hopper7-feeder')).snapshot();
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-HOPPER7-CB03-CB04')).toMatchObject({ confirmation: { decision: 'yes' }, summary: expect.stringContaining('CB04 spare') });
    for (const id of ['wh:h7:rm418:cb03:bus-link', 'wh:h7:rm418:cb03:disconnect-link', 'wh:h7:tf418:input', 'wh:h7:tf418a:input']) expect(snapshot.model.connections.find(connection => connection.id === id)).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-HOPPER7-CB03-CB04']) });
    expect(snapshot.model.connections.find(connection => connection.id === 'wh:h7:rm418:cb04:spare-link')).toEqual(base.connections.find(connection => connection.id === 'wh:h7:rm418:cb04:spare-link'));
    for (const id of ['wh:h7:tf418', 'wh:h7:tf418a']) expect(snapshot.model.assets.find(asset => asset.id === id)).toEqual(base.assets.find(asset => asset.id === id));
    for (const id of ['wh:h7:rm418:cb03', 'wh:h7:rm418:cb04']) {
      expect(snapshot.devices[id]).toBeNull();
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
    }
    expect(snapshot.model.assets.find(asset => asset.id === 'wh:h7:rm418:cb03')?.aliases).toContain('RM418-CB01-A03 (CV006)');
    for (const id of ['WH-Q02', 'WH-Q03', 'WH-Q08']) expect(snapshot.model.reviews!.find(review => review.id === id)?.status).toBe('open');
  }, 20_000);
  it('binds current MC413 to RM413 TF413 without interpreting the historical cause of the RC001 reference', () => {
    const base = previous(); const { model } = new SimulationSession(withOwnerRouteConfirmations(base, 'route-mc413')).saveScenario();
    expect(model.evidence!.find(record => record.id === 'WN-MC413-RM413-SUPPLY')).toMatchObject({ confirmation: { decision: 'yes' }, summary: expect.stringContaining('not the current feeder reference') });
    for (const id of ['rm413:tf413:bar', 'rm413:tf413:incoming-cable', 'rm413:mc413:winding-incomer', 'rm413:mc413:incomer-bar']) expect(model.connections.find(connection => connection.id === id)).toMatchObject({ knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining(['WN-MC413-RM413-SUPPLY']) });
    expect(model.assets.find(asset => asset.id === 'rm413:tf413')).toEqual(base.assets.find(asset => asset.id === 'rm413:tf413'));
    expect(model.assets.some(asset => asset.id.toLowerCase().includes('rc001'))).toBe(false);
    expect(model.reviews!.find(review => review.id === 'SV-MC413-INSTALLED')).toMatchObject({ status: 'open', question: expect.stringContaining('prefix') });
    expect(model.reviews!.find(review => review.id === 'SV-Q08')).toMatchObject({ status: 'open' });
    expect(model.presentation!.views.find(view => view.id === 'supplemental/mc413-lv')?.label).toContain('supply route confirmed');
    expect(model.starting).toEqual(base.starting);
    expect(model.interlocks).toEqual(base.interlocks);
  });
});
