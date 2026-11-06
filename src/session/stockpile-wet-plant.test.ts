import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { stockpileWetPlantModel } from '../models/site/stockpile-wet-plant';
import type { NetworkModel } from './model';

function fictionalSwitchingContract(): NetworkModel {
  const fixture = structuredClone(stockpileWetPlantModel);
  fixture.id = 'fictional-stockpile-wet-connectivity'; fixture.version = 'fictional-check-1';
  fixture.name = 'Fictional stockpile / wet connectivity contract'; fixture.synthetic = true;
  fixture.evidence!.push({ id: 'fictional-stockpile-wet-contract', status: 'supported', summary: 'Explicit software example only: copied candidate transformer source pairs/fuse continuity are defined, winding earth transfer is absent, breakers/output contacts start closed, earth switches open, source enabled and no physical interlocks apply. Converter transfer and MV motor scope remain unknown. This is not installed-network permission.', references: [{ document: 'Fictional Stockpile / wet software contract', revision: '1', page: 1, clause: 'Explicitly defined example' }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) {
    if (item.id.endsWith(':converter')) continue;
    item.knowledge = 'supported'; item.evidenceIds = ['fictional-stockpile-wet-contract'];
  }
  fixture.boundaries = fixture.boundaries?.filter(boundary => /:vs5050[123]:/.test(boundary.terminal) || /:sb21[456]-em01:/.test(boundary.terminal));
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional enabled source', assetId: 'sw454:interface:sw411', terminal: 'sw454:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-stockpile-wet-contract'] }];
  fixture.starting.sources = { 'fictional-source': true };
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional test definition, not site permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Stockpile / wet plant drawing construction through the session', () => {
  it('retains one SW411 interface and one SW505-P-01 connection between the two distinct boards', () => {
    const result = new SimulationSession(stockpileWetPlantModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(result.sources).toEqual({});
    expect(result.model.assets.find(asset => asset.id === 'sw454:interface:sw411')?.aliases).toContain('SW454-P-01');
    expect(result.model.connections.filter(item => item.id === 'sw454:sw505:cable-SW505-P-01')).toHaveLength(1);
    expect(result.model.connections.find(item => item.id === 'sw454:sw505:cable-SW505-P-01')).toMatchObject({ from: 'sw454:sw505:cb:b', to: 'sw505:in:cb:a' });
    expect(result.model.assets.find(asset => asset.id === 'sw505:bus:es')?.aliases).toEqual(expect.arrayContaining(['ES SWXXX', 'ES SW505']));
    expect(result.model.assets.find(asset => asset.id === 'sw505:bus:es')?.knowledge).toBe('provisional');
    for (const id of ['sw454:bus', 'sw505:bus']) {
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
  });

  it('shows six evidenced final LV buses while missing MC454/MC455 and SW455 details remain interfaces', () => {
    const result = new SimulationSession(stockpileWetPlantModel).snapshot();
    for (const id of ['sw454:sw456:d:bus', 'sw454:sw456:y:bus', 'sw505:sw506:d:bus', 'sw505:sw506:y:bus', 'sw505:mc507:bus', 'sw505:mc508:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(result.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(8);
    expect(result.model.assets.find(asset => asset.id === 'sw454:interface:mc454-mc455')).toMatchObject({ kind: 'interface', positions: [], aliases: expect.arrayContaining(['MC454', 'MC455']) });
    expect(result.model.assets.find(asset => asset.id === 'sw454:interface:sw455')).toMatchObject({ kind: 'interface', positions: [], terminals: ['sw454:interface:sw455:d', 'sw454:interface:sw455:y'] });
    expect(result.model.assets.some(asset => asset.id.includes('mc454:cb') || asset.id.includes('mc455:bus') || asset.id.includes('sw455:d:cb'))).toBe(false);
    const tf506 = result.model.assets.find(asset => asset.id === 'sw505:tf506:transformer');
    expect(tf506?.aliases).toEqual(expect.arrayContaining(['22kV/690V/690V on 0054', '22kV/720V/720V on 0060']));
    for (const transformer of result.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(transformer.knowledge).toBe('provisional');
      expect(transformer.conductivePairs).toEqual([]);
      expect(transformer.earthPairs).toEqual([]);
      expect(transformer.reviewIds).toContain('SW-R08');
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.sourceCoverage === 'unconfirmed' && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    expect(result.model.assets.find(asset => asset.id === 'sw505:mc507:phase-fuse')?.aliases).toContain('3000A fuse arrangement');
    expect(result.model.earths?.every(earth => result.model.assets.some(asset => asset.kind === 'earth-switch' && asset.terminals.includes(earth.terminal)))).toBe(true);
  });

  it('retains three MV drives with distinct AC/DC/output sections and blocks every actual control', () => {
    const session = new SimulationSession(stockpileWetPlantModel);
    const result = session.snapshot();
    expect(result.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(9);
    expect(Object.keys(result.devices)).toHaveLength(38);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    for (const [drive, motor] of [['vs50501', 'sb214-em01'], ['vs50502', 'sb215-em01'], ['vs50503', 'sb216-em01']]) {
      const converter = result.model.assets.find(asset => asset.id === `sw505:${drive}:converter`);
      expect(converter).toMatchObject({ kind: 'interface', terminals: [`sw505:${drive}:ac-d`, `sw505:${drive}:ac-y`, `sw505:${drive}:dc`, `sw505:${drive}:output`], conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [] });
      for (const terminal of converter!.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.sourceCoverage === 'unconfirmed' && boundary.earthCoverage === 'unconfirmed')).toBe(true);
      expect(result.devices[`sw505:${drive}:dc-earth`]).toBe(null);
      expect(result.devices[`sw505:${drive}:output-switch`]).toBe(null);
      expect(result.model.assets.find(asset => asset.id === `sw505:${motor}`)?.kind).toBe('interface');
      expect(result.connectivity[`sw505:${motor}`].sourceStatus).toBe('unconfirmed');
    }
    expect(result.model.evidence?.find(record => record.id === 'SW-INCHING-INTERLOCK')?.summary).toContain('INTERLOCK TO INCHING DRIVE LOCAL ISOLATOR');
    expect(result.model.evidence?.find(record => record.id === 'SW-INCHING-INTERLOCK')?.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0055.pdf', revision: '3 (25.01.25; AS FOUND 23.10.23)', page: 1 }));
    for (const id of Object.keys(result.devices)) expect(session.changeDevice(id, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(result);
  });

  it('reopens all model-owned views, source provenance and ten open reviews without source PDFs', () => {
    const session = new SimulationSession(stockpileWetPlantModel);
    const result = session.snapshot();
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'stockpile-hv', 'wet-hv', 'final-lv', 'mv-drives', 'lv-dual-windings', 'lv-mccs']);
    expect(result.model.presentation?.views.find(view => view.id === 'stockpile-hv')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'sw454:sw505:cable-SW505-P-01', remoteAssetId: 'sw505:in:cb', targetViewId: 'wet-hv' }));
    expect(result.model.presentation?.views.find(view => view.id === 'wet-hv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'sw505:vs50501:converter', targetViewId: 'mv-drives' }));
    expect(result.model.reviews?.map(review => review.id)).toEqual(['SW-R01', 'SW-R02', 'SW-R03', 'SW-R04', 'SW-R05', 'SW-R06', 'SW-R07', 'SW-R08', 'SW-R09', 'SW-R10']);
    expect(result.model.reviews?.every(review => review.status === 'open')).toBe(true);
    expect(result.model.evidence?.find(record => record.id === 'SW-SW506-LV-ENDPOINTS')?.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0063.pdf', revision: 'title 3A / red row 4 (09.05.26; prior row 3 30.08.24; redline CV215 motor upgrade; prior IFC)', page: 1 }));
    expect(result.model.evidence?.find(record => record.id === 'SW-OUTGOING-SCOPE')?.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0064.pdf', clause: expect.stringContaining('note 1') }));
    expect(new Set(result.model.evidence?.flatMap(record => record.references.map(reference => reference.document))).size).toBe(25);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(stockpileWetPlantModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(result);
    file.model.presentation.views[1].boundaries[0].remoteAssetId = 'unrepresented-asset';
    expect(reopened.loadScenario(file).ok).toBe(false);
    expect(reopened.snapshot()).toEqual(result);
  });

  it('demonstrates cross-board feeder impact, trace and undo only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.snapshot().model.version).toBe('fictional-check-1');
    expect(session.snapshot().connectivity['sw505:mc507:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.trace('sw505:sw506:y:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-source', assetIds: expect.arrayContaining(['sw454:sw505:cb', 'sw505:in:cb', 'sw505:tf506:hv-cb', 'sw505:tf506:transformer', 'sw505:sw506:y:cb']) })] });
    expect(session.changeDevice('sw454:sw505:cb', 'open')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw505:mc507:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw505:sw506:y:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw454:sw456:d:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.impact.find(item => item.assetId === 'sw505:mc508:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw505:mc507:bus'].sourceIds).toEqual(['fictional-source']);
    expect(new SimulationSession(stockpileWetPlantModel).snapshot().devices['sw454:sw505:cb']).toBe(null);
  });

  it('does not turn a fictional DC-earth action into AC earth or source transfer through an unresolved converter', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    const before = session.snapshot();
    expect(before.connectivity['sw505:vs50501:converter'].terminalSources['sw505:vs50501:ac-d']).toEqual(['fictional-source']);
    expect(before.connectivity['sw505:vs50501:converter'].terminalSources['sw505:vs50501:dc']).toEqual([]);
    expect(before.connectivity['sw505:sb214-em01'].sourceStatus).toBe('unconfirmed');
    expect(session.changeDevice('sw505:vs50501:dc-earth', 'closed')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw505:vs50501:converter'].terminalEarths['sw505:vs50501:dc']).toEqual(['sw505:vs50501:dc-earth:termination']);
    expect(result.connectivity['sw505:vs50501:converter'].terminalEarths['sw505:vs50501:ac-d']).toEqual([]);
    expect(result.connectivity['sw505:vs50501:converter'].terminalEarths['sw505:vs50501:output']).toEqual([]);
    expect(result.connectivity['sw505:sb214-em01'].sourceIds).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });
});
