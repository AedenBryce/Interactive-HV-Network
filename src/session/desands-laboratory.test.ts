import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { desandsLaboratoryModel } from '../models/site/desands-laboratory';
import type { NetworkModel } from './model';

function fictionalContract(): NetworkModel {
  const fixture = structuredClone(desandsLaboratoryModel);
  fixture.id = 'fictional-desands-laboratory'; fixture.version = 'fictional-contract-1'; fixture.synthetic = true;
  fixture.name = 'Fictional defined Desands arrangement; no installed acceptance';
  fixture.evidence!.push({ id: 'fictional-contract', status: 'supported', summary: 'Fictional contract defines copied transformer source transfer, no cross-winding earth continuity, closed binary phase contacts and open earth contacts. This establishes no actual site state, permission or winding policy.', references: [{ document: 'Fictional software contract', revision: '1', page: 1 }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-contract']; }
  fixture.boundaries = [];
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.sources = [{ id: 'fictional-sw411', label: 'Fictional enabled incoming source', assetId: 'sw426:interface:sw411', terminal: 'sw426:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-contract'] }];
  fixture.starting.sources = { 'fictional-sw411': true };
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Fictional contract explicitly defines no physical restriction; not a site fact.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Desands and laboratory drawing construction', () => {
  it('loads the SW426 incoming interface and laboratory aliases with unknown actual positions', () => {
    const snapshot = new SimulationSession(desandsLaboratoryModel).snapshot();
    expect(snapshot.model.synthetic).toBe(false);
    expect(snapshot.model.sources).toEqual([]);
    expect(snapshot.model.assets.find(asset => asset.id === 'sw426:bus')?.kind).toBe('bus');
    expect(snapshot.model.assets.find(asset => asset.id === 'sw426:interface:sw411')?.aliases).toContain('SW426-P-01');
    expect(snapshot.model.assets.find(asset => asset.id === 'rm714:bus')?.aliases).toEqual(expect.arrayContaining(['RM714', 'SS714']));
    expect(snapshot.model.assets.find(asset => asset.id === 'rm714:sw714:bus')?.aliases).toEqual(expect.arrayContaining(['SW714', 'MC714']));
    expect(Object.values(snapshot.devices).every(position => position === null)).toBe(true);
    expect(snapshot.connectivity['rm714:sw714:bus'].sourceStatus).toBe('unconfirmed');
  });
  it('retains fourteen final LV buses and distinct D/Y windings without a phase earth shortcut', () => {
    const snapshot = new SimulationSession(desandsLaboratoryModel).snapshot();
    for (const id of ['sw426:mc426:bus', 'sw426:mc428a:bus', 'sw426:mc430:bus', 'rm714:sw714:bus', ...['sw427', 'sw429', 'sw439', 'sw440', 'sw443'].flatMap(board => ['d', 'y'].map(winding => `sw426:${board}:${winding}:bus`))]) {
      expect(snapshot.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(snapshot.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(snapshot.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(snapshot.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(9);
    for (const asset of snapshot.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(asset.knowledge).toBe('provisional'); expect(asset.conductivePairs).toEqual([]); expect(asset.earthPairs).toEqual([]);
      expect(asset.sourcePairs).toHaveLength(asset.terminals.length - 1);
      for (const terminal of asset.terminals) expect(snapshot.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    expect(snapshot.model.assets.some(asset => /mc428[b-c]|mc443:bus|mc440:bus/.test(asset.id))).toBe(false);
  });
  it('blocks all actual controls and preserves laboratory earth and services discrepancies without joining supplies', () => {
    const session = new SimulationSession(desandsLaboratoryModel); const before = session.snapshot();
    expect(Object.keys(before.devices)).toHaveLength(41);
    for (const id of Object.keys(before.devices)) expect(session.changeDevice(id, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(before);
    for (const id of ['sw426:in:es', 'sw426:bus:es', 'sw426:ss714:es', 'rm714:in01:es', 'rm714:in02:es', 'rm714:tf714:es']) expect(before.model.assets.find(asset => asset.id === id)?.kind).toBe('earth-switch');
    expect(before.model.assets.find(asset => asset.id === 'sw426:interface:rm712')?.aliases).toContain('RM712 IN02');
    expect(before.model.assets.find(asset => asset.id === 'sw426:interface:sw712')?.aliases).toEqual(expect.arrayContaining(['SW712', 'DG1 (6207)', 'DG7 (6206)', 'TF712 cables disconnected and pulled out']));
    expect(before.model.connections.some(connection => connection.from.startsWith('sw426:interface:rm712:') || connection.to.startsWith('sw426:interface:rm712:') || connection.from.startsWith('sw426:interface:sw712:') || connection.to.startsWith('sw426:interface:sw712:'))).toBe(false);
    expect(before.model.reviews?.filter(review => review.status === 'open')).toHaveLength(8);
    expect(before.model.assets.some(asset => asset.id.startsWith('rm712:') || asset.id.startsWith('sw712:'))).toBe(false);
  });
  it('round trips evidence and model-owned detail navigation through a saved scenario', () => {
    const session = new SimulationSession(desandsLaboratoryModel); const before = session.snapshot();
    expect(before.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'hv', 'lv', 'laboratory', 'services', 'lv-tf440-tf426', 'lv-tf428-tf427', 'lv-tf429-tf439', 'lv-tf430-tf443']);
    expect(before.model.presentation?.views.find(view => view.id === 'laboratory')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'sw426:ss714:cb', targetViewId: 'hv' }));
    expect(before.model.evidence?.find(record => record.id === 'DES-LAB')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2255.pdf', revision: '1', page: 1 }));
    const reopened = new SimulationSession(desandsLaboratoryModel);
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(session.saveScenario())))).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(before);
  });
  it('demonstrates branch impact, tracing, undo and reset only under separately defined fictional constraints', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.snapshot().connectivity['sw426:sw427:d:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(session.snapshot().connectivity['sw426:sw427:y:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(session.trace('rm714:sw714:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ assetIds: expect.arrayContaining(['sw426:ss714:cb', 'rm714:in01', 'rm714:tf714', 'rm714:sw714:in:cb']) })] });
    expect(session.changeDevice('sw426:tf427:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw426:sw427:d:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['sw426:sw427:y:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['sw426:mc426:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(session.snapshot().impact.find(item => item.assetId === 'sw426:sw427:y:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw426:sw427:d:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(session.changeDevice('sw426:ss714:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['sw426:sw443:y:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(session.reset()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual(['fictional-sw411']);
  });
  it('keeps transformer earth channels independent and permits explicit LV backfeed only in the fictional contract', () => {
    const fixture = fictionalContract();
    fixture.sources.push({ id: 'fictional-lv', label: 'Fictional LV source', assetId: 'sw426:sw427:d:bus', terminal: 'sw426:sw427:d:bus:bar', knowledge: 'supported', evidenceIds: ['fictional-contract'] });
    fixture.starting.sources['fictional-lv'] = true; fixture.starting.sources['fictional-sw411'] = false;
    const session = new SimulationSession(fixture);
    expect(session.snapshot().connectivity['sw426:sw427:y:bus'].sourceIds).toEqual(['fictional-lv']);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual(['fictional-lv']);
    expect(session.changeDevice('sw426:tf427:es', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw426:tf427'].terminalEarths['sw426:tf427:hv']).toContain('sw426:tf427:es:termination');
    expect(session.snapshot().connectivity['sw426:tf427'].terminalEarths['sw426:tf427:d']).toEqual([]);
    expect(session.snapshot().connectivity['sw426:sw427:d:bus'].earthIds).toEqual([]);
    expect(session.snapshot().conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'fictional-lv', earthId: 'sw426:tf427:es:termination' })]));
    expect(session.changeDevice('sw426:tf427:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw426:sw427:d:bus'].sourceIds).toEqual(['fictional-lv']);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds).toEqual([]);
  });
});
