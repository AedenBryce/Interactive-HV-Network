import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import type { NetworkModel } from './model';

function fictionalContract(): NetworkModel {
  const model = withStationBatteryLimits(wholeNetworkModel, 'battery-fictional-input');
  model.id = 'fictional-three-battery-feeders'; model.version = 'fictional-battery-contract-1'; model.name = 'Fictional battery breaker connectivity'; model.synthetic = true;
  model.assets = model.assets.filter(asset => asset.id.startsWith('station:') || asset.id.startsWith('boundary:') || asset.id.startsWith('sw411:'));
  const terminals = new Set(model.assets.flatMap(asset => asset.terminals));
  const assetIds = new Set(model.assets.map(asset => asset.id));
  model.connections = model.connections.filter(connection => terminals.has(connection.from) && terminals.has(connection.to));
  model.sources = model.sources.filter(source => assetIds.has(source.assetId));
  model.earths = model.earths!.filter(earth => terminals.has(earth.terminal));
  model.boundaries = []; model.presentation = undefined;
  model.evidence!.push({ id: 'fictional-battery-contract', status: 'supported', summary: 'Explicit fictional software example: all three external supplies enabled, copied transformer source pairs defined bidirectional, winding earth pairs empty, all CBs closed and ESs open, no interlocks. No external station tie is defined. Establishes no installed availability, state, permission or winding policy.', references: [{ document: 'Fictional battery-limit software contract', revision: '1', page: 1 }] });
  for (const claim of [...model.assets, ...model.connections, ...model.sources, ...model.earths]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-battery-contract']; claim.reviewIds = []; }
  model.starting = { devices: Object.fromEntries(model.assets.filter(asset => asset.positions.length).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed'])), sources: Object.fromEntries(model.sources.map(source => [source.id, true])) };
  model.interlocks = { reviews: model.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional software contract only: no physical interlocks.', evidence: [] })), rules: [] };
  return model;
}

describe('owner-defined station battery limits through the session', () => {
  it('retains only the three station feeders while preserving line33 and mine/camp and cloning its input', () => {
    const before = structuredClone(wholeNetworkModel);
    const result = new SimulationSession(withStationBatteryLimits(wholeNetworkModel, 'battery-limits-test-1')).snapshot();
    expect(wholeNetworkModel).toEqual(before);
    expect(result.model.assets.some(asset => asset.id === 'station:sb01:bus')).toBe(false);
    expect(result.model.assets.some(asset => asset.id.startsWith('station:gen-'))).toBe(false);
    expect(result.model.assets.filter(asset => asset.id.startsWith('station:')).every(asset => ['station:sb01:f4:', 'station:sb02:f1:', 'station:sb02:f4:'].some(prefix => asset.id.startsWith(prefix)))).toBe(true);
    expect(result.model.assets.filter(asset => asset.id.startsWith('line33:'))).toEqual(wholeNetworkModel.assets.filter(asset => asset.id.startsWith('line33:')));
    expect(result.model.connections.filter(connection => connection.id.startsWith('line33:'))).toEqual(wholeNetworkModel.connections.filter(connection => connection.id.startsWith('line33:')));
    expect(result.model.assets.filter(asset => /^(mine|camp):/.test(asset.id))).toEqual(wholeNetworkModel.assets.filter(asset => /^(mine|camp):/.test(asset.id)));
    for (const [name, prefix] of [['tf11', 'station:sb01:f4'], ['tf12', 'station:sb02:f1'], ['tf04', 'station:sb02:f4']]) {
      expect(result.model.sources.find(source => source.id === `boundary:${name}`)).toMatchObject({ assetId: `boundary:${name}`, knowledge: 'provisional' });
      expect(result.sources[`boundary:${name}`]).toBeNull();
      expect(result.model.connections).toContainEqual(expect.objectContaining({ from: `boundary:${name}:port`, to: `${prefix}:cb:in` }));
      expect(result.model.boundaries).toContainEqual(expect.objectContaining({ id: `boundary:${name}:coverage`, terminal: `${prefix}:cb:in`, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' }));
      for (const suffix of ['cb', 'es', 'transformer']) expect(result.model.assets.find(asset => asset.id === `${prefix}:${suffix}`)).toEqual(wholeNetworkModel.assets.find(asset => asset.id === `${prefix}:${suffix}`));
      expect(result.devices[`${prefix}:cb`]).toBeNull();
      expect(result.switching[`${prefix}:cb`].positions.every(position => !position.allowed)).toBe(true);
    }
  }, 20000);

  it('routes abstract supply through the retained breakers and preserves the existing SW411 alternate route only in a fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.snapshot().connectivity['sw411:bus-a'].sourceIds).toEqual(['boundary:tf11', 'boundary:tf12']);
    expect(session.changeDevice('station:sb01:f4:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw411:bus-a'].sourceIds).toEqual(['boundary:tf12']);
    expect(session.trace('sw411:bus-a')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'boundary:tf12' })] });
    expect(session.changeSource('boundary:tf12', false)).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw411:bus-a'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['station:sb02:f4:transformer'].sourceIds).toEqual(['boundary:tf04']);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw411:bus-a'].sourceIds).toEqual(['boundary:tf12']);
  });

  it('retains historical evidence and explicit unknown mine/village coverage while removing their out-of-scope station joins', () => {
    const result = new SimulationSession(withStationBatteryLimits(wholeNetworkModel, 'battery-evidence-test')).snapshot();
    expect(result.model.evidence).toEqual(expect.arrayContaining(wholeNetworkModel.evidence!));
    expect(result.model.evidence?.find(record => record.id === 'BATTERY-STATION-SCOPE')).toMatchObject({ status: 'owner-confirmed', confirmation: { by: 'Project owner (conversation)', date: '2026-10-22', decision: expect.stringContaining('At its SB01/SB02 feeder breaker, retaining that feeder and transformer but excluding station buses, generators and other feeders') } });
    for (const [join, asset] of [['mine-tf03', 'mine:interface:station-tf03'], ['village', 'camp:interface:station-village']]) {
      expect(result.model.connections.some(connection => connection.id === `whole:join:${join}`)).toBe(false);
      expect(result.model.boundaries!.find(boundary => boundary.id === `${asset}:coverage`)).toEqual(wholeNetworkModel.boundaries!.find(boundary => boundary.id === `${asset}:coverage`));
      expect(result.model.boundaries).toContainEqual(expect.objectContaining({ id: `boundary:excluded-station:whole:join:${join}`, terminal: `${asset}:port`, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' }));
      expect(result.connectivity[asset]).toMatchObject({ sourceStatus: 'unconfirmed', earthStatus: 'unconfirmed' });
    }
    expect(result.sources['camp:dg701']).toBeNull();
    expect(result.sources['rm712:dg1:supply']).toBeNull();
    expect(result.sources['rm712:dg7:supply']).toBeNull();
  }, 20000);

  it('keeps presentation references valid and saves the complete revised boundary as a historical scenario', () => {
    const model = withStationBatteryLimits(wholeNetworkModel, 'battery-history-test');
    const original = new SimulationSession(model);
    const before = original.snapshot();
    const ids = new Set(before.model.assets.map(asset => asset.id));
    const terminals = new Set(before.model.assets.flatMap(asset => asset.terminals));
    const connections = new Set(before.model.connections.map(connection => connection.id));
    const station = before.model.presentation!.views.find(view => view.id === 'station/overview')!;
    expect(station.assetIds).toHaveLength(14);
    expect(station.boundaries).toHaveLength(3);
    for (const view of before.model.presentation!.views) {
      expect(Object.keys(view.layout.assets).every(id => ids.has(id))).toBe(true);
      expect(Object.keys(view.layout.terminals).every(id => terminals.has(id))).toBe(true);
      expect(Object.keys(view.layout.bends ?? {}).every(id => connections.has(id))).toBe(true);
      for (const boundary of view.boundaries ?? []) expect(before.model.presentation!.views.find(target => target.id === boundary.targetViewId)?.assetIds).toContain(boundary.remoteAssetId);
    }
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot().mode).toBe('view-only');
    expect(reopened.saveScenario()).toEqual(file);
  }, 20000);

  it('refuses repeat application and retained interlocks that depend on excluded station assets or sources without changing the active session', () => {
    const session = new SimulationSession(wholeNetworkModel);
    const before = session.snapshot();
    const input = structuredClone(wholeNetworkModel);
    input.interlocks!.rules.push({ id: 'fictional-cut-dependency', assetId: 'station:sb01:f4:cb', position: 'closed', require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'station:sb01:f4:es', position: 'open' }, { kind: 'any', conditions: [{ kind: 'device', assetId: 'station:sb01:f1:cb', position: 'open' }, { kind: 'source', sourceId: 'station:gen-01:source', enabled: false }] }] }, explanation: 'Fictional guard test only; not an installed rule.', evidence: [{ document: 'Fictional cut-dependency test', revision: '1', page: 1 }] });
    expect(() => session.loadModel(withStationBatteryLimits(input, 'battery-dependency-test'))).toThrow(/review required.*fictional-cut-dependency.*station:sb01:f1:cb.*station:gen-01:source/);
    expect(session.snapshot()).toEqual(before);
    const cut = withStationBatteryLimits(wholeNetworkModel, 'battery-repeat-test');
    expect(() => session.loadModel(withStationBatteryLimits(cut, 'battery-repeat-again'))).toThrow(/already applied/);
    expect(session.snapshot()).toEqual(before);
  }, 20000);
});
