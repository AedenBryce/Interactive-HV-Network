import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { servicesModel } from '../models/site/services';
import type { NetworkModel } from './model';

function fictionalSwitchingContract(): NetworkModel {
  const fixture = structuredClone(servicesModel);
  fixture.id = 'fictional-services-connectivity'; fixture.version = 'fictional-check-1'; fixture.synthetic = true;
  fixture.name = 'Fictional Services switching contract';
  fixture.evidence!.push({ id: 'fictional-services-contract', status: 'supported', summary: 'Explicit software example only: copied candidate phase paths, fuse continuity and RM413A lower positions are defined; winding earth transfer is absent. Fictional MCS Off/DG1/DG7 states below define exclusive contacts solely for this check, not a proposed real contact table. Binary contacts start closed, earth switches open; no interlocks apply. Fictional SW411 and RM712-HV sources are enabled; real DG labels are scenario examples only. No installed-network permission or acceptance.', references: [{ document: 'Fictional Services software contract', revision: '1', page: 1, clause: 'Explicitly defined example only' }] });
  const selector = fixture.assets.find(asset => asset.id === 'rm712:mcs')!;
  selector.positions = [
    { id: 'off', label: 'Off · fictional', pairs: [], sourcePairs: [], earthPairs: [] },
    { id: 'dg1', label: 'DG1 · fictional', pairs: [], sourcePairs: [['rm712:mcs:dg1', 'rm712:mcs:output']], earthPairs: [['rm712:mcs:dg1', 'rm712:mcs:output']] },
    { id: 'dg7', label: 'DG7 · fictional', pairs: [], sourcePairs: [['rm712:mcs:dg7', 'rm712:mcs:output']], earthPairs: [['rm712:mcs:dg7', 'rm712:mcs:output']] },
  ];
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? []), ...fixture.sources]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-services-contract']; }
  fixture.boundaries = [];
  fixture.sources.push(
    { id: 'fictional-sw411', label: 'Fictional SW411 source', assetId: 'services:interface:sw411', terminal: 'services:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-services-contract'] },
    { id: 'fictional-rm712-hv', label: 'Fictional isolated RM712 HV source', assetId: 'rm712:bus', terminal: 'rm712:bus:bar', knowledge: 'supported', evidenceIds: ['fictional-services-contract'] },
  );
  fixture.starting.sources = { 'rm712:dg1:supply': false, 'rm712:dg7:supply': false, 'fictional-sw411': true, 'fictional-rm712-hv': true };
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.id === 'rm712:mcs' ? 'off' : asset.kind === 'earth-switch' ? 'open' : asset.positions.some(position => position.id === 'service') ? 'service' : 'closed']));
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional test contract; not actual switching permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Services drawing construction through the session', () => {
  it('retains RM721/R002 aliases and distinct unresolved RM712/Desands references without inventing a SW426 bay', () => {
    const result = new SimulationSession(servicesModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.assets.find(asset => asset.id === 'rm721:bus')?.aliases).toContain('RM751 (historical rename)');
    expect(result.model.assets.find(asset => asset.id === 'services:interface:sw411')?.aliases).toEqual(expect.arrayContaining(['R002', 'SW411 tier 16', 'CB SW454 FD01', 'RM721-P-01', 'SW454-P-01 (disputed tier16 label; not SW454 join)']));
    expect(Object.keys(result.devices).filter(id => id.startsWith('rm721:'))).toHaveLength(8);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    expect(result.model.assets.find(asset => asset.id === 'rm721:interface:rm712')?.aliases).toContain('2252 actually belongs to RM711');
    expect(result.model.connections.some(connection => connection.from === 'rm721:interface:rm712:port' && connection.to.startsWith('rm712:'))).toBe(false);
    expect(result.model.assets.find(asset => asset.id === 'services:interface:rm714-shared')?.aliases).toContain('Shared canonical rm714:bus / rm714:in01 in Desands package');
    expect(result.model.assets.some(asset => asset.id.startsWith('rm714:') || asset.id.startsWith('sw426:'))).toBe(false);
    expect(result.model.connections.find(connection => connection.id === 'rm721:in01:es:branch')?.from).toBe('rm721:in01:a');
    expect(result.connectivity['rm721:bus'].sourceStatus).toBe('unconfirmed');
  });

  it('retains distinct null-availability DG sources, undefined MCS contacts and the explicit removed TF712 cable gap', () => {
    const result = new SimulationSession(servicesModel).snapshot();
    expect(result.sources).toEqual({ 'rm712:dg1:supply': null, 'rm712:dg7:supply': null });
    expect(result.model.assets.find(asset => asset.id === 'rm712:dg1')?.aliases).toContain('6207');
    expect(result.model.assets.find(asset => asset.id === 'rm712:dg7')?.aliases).toContain('6206');
    expect(result.model.assets.find(asset => asset.id === 'rm712:mcs')).toMatchObject({ kind: 'interface', terminals: ['rm712:mcs:dg1', 'rm712:mcs:dg7', 'rm712:mcs:output'], positions: [], conductivePairs: [], sourcePairs: [], earthPairs: [], knowledge: 'unresolved' });
    expect(result.devices['rm712:mcs']).toBeUndefined();
    expect(result.model.assets.find(asset => asset.id === 'rm712:tf712:removed-lv-cable-end')?.aliases).toContain('CABLES DISCONNECTED AND PULLED OUT OF MAIN DISTRIBUTION BOARD');
    expect(result.model.connections.some(connection => connection.from === 'rm712:tf712:removed-lv-cable-end:port' || connection.to === 'rm712:tf712:removed-lv-cable-end:port' && connection.from.startsWith('rm712:sw712:'))).toBe(false);
    expect(result.model.assets.find(asset => asset.id === 'rm712:interface:former-rm713')?.knowledge).toBe('unresolved');
    expect(result.model.connections.find(connection => connection.id === 'rm721:current-rm713-cable')?.to).toBe('rm713:in01:a');
    expect(result.model.connections.some(connection => connection.from === 'rm712:interface:former-rm713:port' && connection.to.startsWith('rm713:'))).toBe(false);
    for (const id of ['rm712:sw712:bus', 'rm713:sw713:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
    }
  });

  it('keeps RM412 common-side earths and three separate LV winding endpoints distinct', () => {
    const result = new SimulationSession(servicesModel).snapshot();
    expect(result.model.connections.find(connection => connection.id === 'rm412:e100:branch')?.from).toBe('rm412:bus:bar');
    expect(result.model.connections.find(connection => connection.id === 'rm412:e101:branch')?.from).toBe('rm412:bus:bar');
    expect(result.model.connections.find(connection => connection.id === 'rm412:e102:branch')?.from).toBe('rm412:feeder-contact:b');
    expect(result.model.assets.find(asset => asset.id === 'rm412:q100')?.aliases).toContain('Q100 200A');
    expect(result.model.assets.find(asset => asset.id === 'rm412:tf412')?.terminals).toEqual(['rm412:tf412:hv', 'rm412:tf412:lv-690-star', 'rm412:tf412:lv-690-delta', 'rm412:tf412:lv-415-star']);
    for (const id of ['rm412:lv-690-star:bus', 'rm412:lv-690-delta:bus', 'rm412:lv-415-star:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(result.model.evidence?.find(record => record.id === 'SV-RM412-LINKAGE')?.summary).toContain('truth table');
    expect(result.model.assets.some(asset => /q300|q301|k200|vvvf/i.test(asset.id))).toBe(false);
  });

  it('keeps RM413A on the RM417-facing double-boot side with distinct earth locations and AC inputs', () => {
    const session = new SimulationSession(servicesModel); const result = session.snapshot();
    expect(result.model.connections.find(connection => connection.id === 'rm413:double-boot-rm413a')?.from).toBe('rm413:in02:a');
    expect(result.model.connections.find(connection => connection.id === 'rm413:in02-rm417')?.from).toBe('rm413:in02:a');
    expect(result.model.connections.some(connection => connection.from === 'rm413:bus:bar' && connection.to === 'rm413a:bus:bar')).toBe(false);
    expect(result.model.assets.find(asset => asset.id === 'rm413a:es-q8:upper')?.aliases).toContain('ES-Q8');
    expect(result.model.assets.find(asset => asset.id === 'rm413a:es-q8:lower')?.aliases).toContain('ES-Q8');
    expect(result.model.assets.find(asset => asset.id === 'rm413a:es-q8:lower')?.positions.map(position => position.id)).toEqual(['service', 'isolated', 'earthed']);
    for (const id of ['rm413:mc413:bus', 'rm413:mcc414:bus', 'rm413a:ac-input-a:boundary', 'rm413a:ac-input-b:boundary']) expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
    expect(result.model.assets.some(asset => asset.id.includes('mc413a'))).toBe(false);
    expect(result.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(6);
    expect(Object.keys(result.devices)).toHaveLength(37);
    for (const transformer of result.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(transformer.knowledge).toBe('provisional'); expect(transformer.conductivePairs).toEqual([]); expect(transformer.earthPairs).toEqual([]);
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    for (const id of Object.keys(result.devices)) {
      expect(result.devices[id]).toBe(null);
      expect(session.changeDevice(id, id === 'rm413a:es-q8:lower' ? 'service' : 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(result);
  });

  it('persists focused views, exact source provenance and all open questions without source PDFs', () => {
    const session = new SimulationSession(servicesModel); const result = session.snapshot();
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'rm721', 'mine-services', 'workshop', 'dump-pocket-hv', 'dump-pocket-lv', 'conveyor-hv', 'conveyor-lv', 'rm413a-hv', 'drive-inputs']);
    expect(result.model.presentation?.views.find(view => view.id === 'conveyor-hv')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'rm413:double-boot-rm413a', remoteAssetId: 'rm413a:bus', targetViewId: 'rm413a-hv' }));
    expect(result.model.presentation?.views.find(view => view.id === 'drive-inputs')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'rm413a:es-q8:lower', targetViewId: 'rm413a-hv' }));
    expect(result.model.evidence?.find(record => record.id === 'SV-TF712-REMOVED-CABLE')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2253.pdf', revision: '3 (22.02.08; RE-ISSUED FOR CONSTRUCTION)', page: 1 }));
    expect(new Set(result.model.evidence?.flatMap(record => record.references.map(reference => reference.document))).size).toBe(15);
    expect(result.model.reviews?.map(review => review.id)).toEqual(['SV-Q01', 'SV-Q02', 'SV-Q03', 'SV-Q04', 'SV-Q05', 'SV-Q06', 'SV-Q07', 'SV-Q08', 'SV-Q09', 'SV-Q10', 'SV-Q11', 'SV-Q12']);
    expect(result.model.reviews?.every(review => review.status === 'open')).toBe(true);
    const file = JSON.parse(JSON.stringify(session.saveScenario())); const reopened = new SimulationSession(servicesModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true }); expect(reopened.snapshot()).toEqual(result);
    file.model.presentation.views[1].boundaries[0].targetViewId = 'unrepresented-view';
    expect(reopened.loadScenario(file).ok).toBe(false); expect(reopened.snapshot()).toEqual(result);
  });

  it('does not invent a conducting MCS matrix when both DG availability hypotheses are enabled', () => {
    const session = new SimulationSession(servicesModel);
    expect(session.changeSource('rm712:dg1:supply', true)).toEqual({ ok: true });
    expect(session.changeSource('rm712:dg7:supply', true)).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['rm712:mcs'].terminalSources['rm712:mcs:dg1']).toEqual(['rm712:dg1:supply']);
    expect(result.connectivity['rm712:mcs'].terminalSources['rm712:mcs:dg7']).toEqual(['rm712:dg7:supply']);
    expect(result.connectivity['rm712:mcs'].terminalSources['rm712:mcs:output']).toEqual([]);
    expect(result.connectivity['rm712:sw712:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['rm712:sw712:bus'].sourceStatus).toBe('unconfirmed');
    expect(new SimulationSession(servicesModel).snapshot().sources).toEqual({ 'rm712:dg1:supply': null, 'rm712:dg7:supply': null });
  });

  it('demonstrates exclusive DG selection, the cable gap and double-boot isolation only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.snapshot().model.version).toBe('fictional-check-1');
    expect(session.snapshot().connectivity['rm712:tf712'].terminalSources['rm712:tf712:lv']).toEqual(['fictional-rm712-hv']);
    expect(session.snapshot().connectivity['rm712:sw712:bus'].sourceIds).toEqual([]);
    expect(session.changeSource('rm712:dg1:supply', true)).toEqual({ ok: true }); expect(session.changeSource('rm712:dg7:supply', true)).toEqual({ ok: true });
    expect(session.changeDevice('rm712:mcs', 'dg1')).toEqual({ ok: true }); expect(session.snapshot().connectivity['rm712:sw712:bus'].sourceIds).toEqual(['rm712:dg1:supply']);
    expect(session.changeDevice('rm712:mcs', 'dg7')).toEqual({ ok: true }); expect(session.snapshot().connectivity['rm712:sw712:bus'].sourceIds).toEqual(['rm712:dg7:supply']);
    expect(session.undo()).toEqual({ ok: true }); expect(session.snapshot().connectivity['rm712:sw712:bus'].sourceIds).toEqual(['rm712:dg1:supply']);
    expect(session.trace('rm413a:ac-input-a:boundary')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-sw411', assetIds: expect.arrayContaining(['rm412:s101', 'rm413:in01', 'rm413:in02', 'rm413a:bus', 'rm413a:q1', 'rm413a:tf413a']) })] });
    expect(session.changeDevice('rm413:in02', 'open')).toEqual({ ok: true });
    const result = session.snapshot(); expect(result.connectivity['rm413a:ac-input-a:boundary'].sourceIds).toEqual([]);
    expect(result.connectivity['rm413:mc413:bus'].sourceIds).toEqual(['fictional-sw411']);
    expect(result.impact.find(item => item.assetId === 'rm413a:ac-input-b:boundary')?.connectivityChanged).toBe(true);
    expect(session.reset()).toEqual({ ok: true }); expect(session.snapshot().connectivity['rm413a:ac-input-a:boundary'].sourceIds).toEqual(['fictional-sw411']);
  });

  it('keeps fictional common-side and transformer-side RM412 earth branches on their respective conductors', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.changeDevice('rm412:s100', 'open')).toEqual({ ok: true }); expect(session.changeDevice('rm412:s101', 'open')).toEqual({ ok: true }); expect(session.changeDevice('rm412:e100', 'closed')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity['rm412:bus'].terminalEarths['rm412:bus:bar']).toEqual(['rm412:e100:termination']);
    expect(result.connectivity['rm412:s100'].terminalEarths['rm412:s100:a']).toEqual([]);
    expect(result.conflicts).toEqual([]);
    expect(session.reset()).toEqual({ ok: true }); expect(session.changeDevice('rm412:q100', 'open')).toEqual({ ok: true }); expect(session.changeDevice('rm412:e102', 'closed')).toEqual({ ok: true });
    result = session.snapshot();
    expect(result.connectivity['rm412:tf412'].terminalEarths['rm412:tf412:hv']).toEqual(['rm412:e102:termination']);
    expect(result.connectivity['rm412:tf412'].terminalEarths['rm412:tf412:lv-690-star']).toEqual([]);
    expect(result.connectivity['rm412:bus'].terminalEarths['rm412:bus:bar']).toEqual([]);
    expect(result.connectivity['rm412:bus'].sourceIds).toEqual(['fictional-sw411']); expect(result.conflicts).toEqual([]);
  });
});
