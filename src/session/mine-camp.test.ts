import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { mineCampModel } from '../models/site/mine-camp';
import type { NetworkModel } from './model';

function fictionalContract(): NetworkModel {
  const fixture = structuredClone(mineCampModel);
  fixture.id = 'fictional-mine-camp'; fixture.version = 'fictional-connectivity-1'; fixture.synthetic = true;
  fixture.name = 'Fictional copied mine/camp arrangement; no installed acceptance';
  fixture.evidence!.push({ id: 'fictional-contract', status: 'supported', summary: 'Fictional contract: all represented phase contacts/fuses closed, earths open, DG701 enabled, other generators unavailable. Copied winding source transfer and no winding earth continuity are explicitly defined here; no site permission, baseline or installed policy follows.', references: [{ document: 'Fictional software contract', revision: '1', page: 1 }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...fixture.sources, ...(fixture.earths ?? [])]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-contract']; }
  fixture.boundaries = [];
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.starting.sources = { 'camp:dg703': false, 'camp:dg702': false, 'camp:dg701': true };
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Fictional contract explicitly defines no physical restriction. No actual permission follows.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Mine and camp drawing construction', () => {
  it('loads the seven camp ring LV endpoints without accepting study states', () => {
    const snapshot = new SimulationSession(mineCampModel).snapshot();
    expect(snapshot.model.synthetic).toBe(false);
    for (const board of ['msb1', 'msb1a', 'msb2', 'msb3', 'msb4', 'msb5', 'msb6']) {
      expect(snapshot.model.assets.find(asset => asset.id === `camp:${board}:bus`)?.kind).toBe('bus');
      expect(snapshot.connectivity[`camp:${board}:bus`].sourceStatus).toBe('unconfirmed');
      expect(snapshot.connectivity[`camp:${board}:bus`].earthStatus).toBe('unconfirmed');
    }
    expect(Object.values(snapshot.devices).every(position => position === null)).toBe(true);
    expect(snapshot.model.assets.find(asset => asset.id === 'camp:rmub:ring-rmu4:sw')?.aliases).toContain('NORMALLY OPEN POINT');
    expect(snapshot.model.assets.some(asset => /db062|db053|db054/.test(asset.id))).toBe(false);
  });
  it('retains camp generation, RM700, village feeds and source discrepancies with unknown availability', () => {
    const snapshot = new SimulationSession(mineCampModel).snapshot();
    expect(snapshot.model.sources.map(source => source.id)).toEqual(['camp:dg703', 'camp:dg702', 'camp:dg701']);
    expect(snapshot.sources).toEqual({ 'camp:dg703': null, 'camp:dg702': null, 'camp:dg701': null });
    expect(snapshot.model.assets.find(asset => asset.id === 'camp:dg701:source')?.aliases).toContain('GN210A');
    expect(snapshot.model.assets.find(asset => asset.id === 'camp:tf700')?.aliases).toEqual(expect.arrayContaining(['415V/11kV 3.15MVA', '433V/11kV 3.15MVA', '433V/11kV 5000kVA']));
    for (const id of ['camp:rm700:bus', 'camp:rm732:bus', 'camp:07sw701:bus', 'camp:db715:bus', 'camp:db716:bus', 'camp:sw719:bus', 'camp:sw731:bus']) expect(snapshot.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
    expect(snapshot.model.assets.find(asset => asset.id === 'camp:interface:station-village')?.aliases).toContain('CLOUDBREAK VILLAGE O/H LINE');
    expect(snapshot.model.assets.some(asset => /^sb0|^sw411:/.test(asset.id))).toBe(false);
  });
  it('preserves the explicit water-tower and actual RM711/RM718 first LV buses without shared-area duplication', () => {
    const snapshot = new SimulationSession(mineCampModel).snapshot();
    for (const id of ['mine:mc441:bus', 'mine:sw711:bus', 'mine:sw718:bus']) expect(snapshot.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
    expect(snapshot.model.assets.find(asset => asset.id === 'mine:interface:station-tf03')?.aliases).toContain('TF03');
    expect(snapshot.model.assets.find(asset => asset.id === 'mine:rm711:interface:in02')?.aliases).toContain('TO SEWAGE TREATMENT TF714');
    expect(snapshot.model.assets.find(asset => asset.id === 'mine:interface:rm718-pole')?.aliases).toContain('FROM600A POLE TOP CIRCUIT BREAKER');
    expect(snapshot.model.assets.some(asset => asset.id === 'mine:rumS001:bus' || asset.id === 'mine:db711:bus')).toBe(false);
    expect(snapshot.model.reviews?.map(review => review.id).sort()).toEqual(Array.from({ length: 11 }, (_value, index) => `MC-Q${String(index + 1).padStart(2, '0')}`).sort());
    expect(snapshot.model.evidence?.find(record => record.id === 'MC-RM711')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2252.pdf', revision: '5 (22.02.12; DB03, DB07 BECOME SPARE)', page: 1 }));
  });
  it('keeps distinct spare contact roles and rejects actual device switching pending full interlock review', () => {
    const session = new SimulationSession(mineCampModel); const before = session.snapshot();
    for (const id of ['camp:rmub:spare01:cb', 'camp:rmub:spare01:sw', 'camp:rmub:spare02:cb', 'camp:rmub:spare02:sw', 'camp:rmu3:spare:fuse']) expect(before.model.assets.some(asset => asset.id === id)).toBe(true);
    for (const id of Object.keys(before.devices)) expect(session.changeDevice(id, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(before);
    for (const asset of before.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(asset.knowledge).toBe('provisional'); expect(asset.conductivePairs).toEqual([]); expect(asset.earthPairs).toEqual([]);
      for (const terminal of asset.terminals) expect(before.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
  });
  it('preserves model-owned detail navigation, citations and uncertainty in a scenario round trip', () => {
    const session = new SimulationSession(mineCampModel); const before = session.snapshot();
    expect(before.model.presentation?.views.find(view => view.id === 'camp-tx1-lv')?.bounds.slice(2)).toEqual([1000, 650]);
    expect(before.model.presentation?.views.find(view => view.id === 'camp-tx1-lv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'camp:tx1:fuse', targetViewId: 'camp-rmu1' }));
    const reopened = new SimulationSession(mineCampModel); const saved = JSON.parse(JSON.stringify(session.saveScenario()));
    expect(reopened.loadScenario(saved)).toEqual({ ok: true }); expect(reopened.snapshot()).toEqual(before);
    saved.model.presentation.views.find((view: { id: string }) => view.id === 'camp-tx1-lv').boundaries[0].targetViewId = 'missing-view';
    expect(reopened.loadScenario(saved).ok).toBe(false); expect(reopened.snapshot()).toEqual(before);
    expect(session.changeSource('camp:dg701', true)).toEqual({ ok: true });
    expect(session.snapshot().connectivity['camp:msb1:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['camp:msb1:bus'].possibleSourceIds).toContain('camp:dg701');
    expect(session.reset()).toEqual({ ok: true }); expect(session.snapshot().sources['camp:dg701']).toBeNull();
  });
  it('demonstrates retained alternate supply and branch impact only in the explicit fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.snapshot().connectivity['camp:msb1:bus'].sourceIds).toEqual(['camp:dg701']);
    expect(session.changeDevice('camp:rmua:ring-rmu1:sw', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['camp:msb1:bus'].sourceIds).toEqual(['camp:dg701']);
    expect(session.trace('camp:msb1:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ assetIds: expect.arrayContaining(['camp:v63:cb', 'camp:rmu6:ring-v63:sw', 'camp:rmub:ring-rmu4:sw']) })] });
    expect(session.changeDevice('camp:rmu1:ring-rmu2:sw', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['camp:msb1:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['camp:msb1a:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['camp:msb2:bus'].sourceIds).toEqual(['camp:dg701']);
    expect(session.snapshot().impact.find(item => item.assetId === 'camp:msb1:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true }); expect(session.snapshot().connectivity['camp:msb1:bus'].sourceIds).toEqual(['camp:dg701']);
    expect(session.reset()).toEqual({ ok: true }); expect(session.snapshot().devices['camp:rmua:ring-rmu1:sw']).toBe('closed');
  });
  it('keeps winding earth continuity separate from source-to-earth conflict in the fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.changeDevice('camp:rm700:es01', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['camp:tf700'].terminalEarths['camp:tf700:hv']).toContain('camp:rm700:es01:termination');
    expect(session.snapshot().connectivity['camp:tf700'].terminalEarths['camp:tf700:lv']).toEqual([]);
    expect(session.snapshot().connectivity['camp:07sw701:bus'].earthIds).toEqual([]);
    expect(session.snapshot().conflicts).toEqual(expect.arrayContaining([expect.objectContaining({ sourceId: 'camp:dg701', earthId: 'camp:rm700:es01:termination' })]));
    const trace = session.trace('camp:msb6:bus');
    expect(trace).toMatchObject({ ok: true, paths: [expect.objectContaining({ assetIds: expect.arrayContaining(['camp:tx6:fd:cb', 'camp:tx6:fd:sw', 'camp:tx6']) })] });
    if (!trace.ok) throw new Error('Fictional path missing');
    const ordered = trace.paths[0].assetIds;
    expect(ordered.indexOf('camp:tx6:fd:cb')).toBeLessThan(ordered.indexOf('camp:tx6:fd:sw'));
    expect(ordered.indexOf('camp:tx6:fd:sw')).toBeLessThan(ordered.indexOf('camp:tx6'));
  });
});
