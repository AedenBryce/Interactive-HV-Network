import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { crushing2HpgrModel } from '../models/site/crushing-2-hpgr';
import type { NetworkModel } from './model';

function fictionalContract(): NetworkModel {
  const fixture = structuredClone(crushing2HpgrModel);
  fixture.id = 'fictional-crushing-2-hpgr'; fixture.version = 'fictional-connectivity-1'; fixture.synthetic = true;
  fixture.name = 'Fictional copied arrangement with converter conductivity intentionally undefined';
  fixture.evidence!.push({ id: 'fictional-contract', status: 'supported', summary: 'Fictional contract: copied transformer source pairs and intact fuses are defined, no transformer earth transfer, binary contacts closed and earth switches open. Converter/outlet transfer remains undefined. No site permission follows.', references: [{ document: 'Fictional software contract', revision: '1', page: 1 }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-contract']; }
  fixture.boundaries = fixture.boundaries!.filter(boundary => boundary.id.includes(':converter:') || boundary.id.includes(':outlet:') || boundary.id.includes(':motor-'));
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional source', assetId: 'sw435:interface:sw411', terminal: 'sw435:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-contract'] }];
  fixture.starting.sources = { 'fictional-source': true };
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Fictional contract explicitly defines no physical interlock; not a site statement.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Crushing No. 2 and HPGR drawing construction', () => {
  it('loads real drawing evidence with unknown baseline, no invented source and six final LV buses', () => {
    const snapshot = new SimulationSession(crushing2HpgrModel).snapshot();
    expect(snapshot.model.synthetic).toBe(false);
    expect(snapshot.model.sources).toEqual([]);
    expect(Object.values(snapshot.devices).every(position => position === null)).toBe(true);
    for (const id of ['sw435:mc435:bus', 'sw435:sw433:d:bus', 'sw435:sw433:y:bus', 'sw435:sw453:d:bus', 'sw435:sw453:y:bus', 'hpgr:mc001:bus']) {
      expect(snapshot.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(snapshot.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(snapshot.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(snapshot.model.assets.find(asset => asset.id === 'hpgr:sw002:bus')?.aliases).toContain('6.6kV ring main unit');
  });

  it('blocks every represented actual control and retains future, identity and scope reviews', () => {
    const session = new SimulationSession(crushing2HpgrModel); const before = session.snapshot();
    expect(Object.keys(before.devices)).toHaveLength(30);
    for (const id of Object.keys(before.devices)) expect(session.changeDevice(id, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(before);
    expect(before.model.assets.find(asset => asset.id === 'sw435:interface:mc436')?.aliases).toEqual(expect.arrayContaining(['TF436', 'MC436', 'FUTURE', 'SPARE FD']));
    expect(before.model.assets.some(asset => asset.id === 'sw435:mc436:bus')).toBe(false);
    expect(before.model.assets.find(asset => asset.id === 'sw435:interface:sw431')?.aliases).toContain('SW431-P-02');
    expect(before.model.assets.find(asset => asset.id === 'hpgr:sw002:tf004:k202')?.aliases).toEqual(expect.arrayContaining(['A01 TE004 FEEDER', 'A03', 'K202']));
    expect(before.model.assets.find(asset => asset.id === 'hpgr:mc001:bus')?.aliases).toEqual(expect.arrayContaining(['MC001', 'MC438']));
    expect(before.model.reviews?.filter(review => review.status === 'open')).toHaveLength(11);
  });

  it('retains intermediate HV equipment, separate MV outputs and converter terminal groups', () => {
    const result = new SimulationSession(crushing2HpgrModel).snapshot();
    expect(result.model.assets.some(asset => asset.id === 'hpgr:sw002:in:cb')).toBe(false);
    expect(result.model.assets.find(asset => asset.id === 'hpgr:jb001')?.conductivePairs).toEqual([['hpgr:jb001:in', 'hpgr:jb001:out']]);
    expect(result.model.assets.filter(asset => asset.kind === 'transformer')).toHaveLength(7);
    for (const transformer of result.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(transformer.knowledge).toBe('provisional'); expect(transformer.earthPairs).toEqual([]); expect(transformer.conductivePairs).toEqual([]);
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    for (const suffix of ['mea', 'meb']) {
      const converter = result.model.assets.find(asset => asset.id === `hpgr:drive-${suffix}:converter`)!;
      expect(converter.terminals).toHaveLength(4); expect(converter.conductivePairs).toEqual([]); expect(converter.sourcePairs).toEqual([]);
      const outlet = result.model.assets.find(asset => asset.id === `hpgr:drive-${suffix}:outlet`)!;
      expect(outlet.terminals).toHaveLength(3); expect(outlet.positions).toEqual([]); expect(outlet.conductivePairs).toEqual([]);
      expect(result.model.assets.find(asset => asset.id === `hpgr:motor-${suffix}`)?.kind).toBe('interface');
      expect(result.connectivity[`hpgr:motor-${suffix}`].sourceStatus).toBe('unconfirmed');
    }
    expect(result.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(8);
  });

  it('preserves the model, references, views and unknown relationships in a scenario round trip', () => {
    const session = new SimulationSession(crushing2HpgrModel); const saved = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(crushing2HpgrModel); expect(reopened.loadScenario(saved)).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(session.snapshot());
    expect(reopened.snapshot().model.evidence?.find(record => record.id === 'C2-TF004-FEEDER')?.references).toContainEqual(expect.objectContaining({ document: 'CB112-02006-DR-EL-0005.pdf', revision: '7 (28.01.25; AS FOUND 23.10.23)', page: 1 }));
    const before = reopened.snapshot(); saved.model.presentation.views[1].boundaries[0].targetViewId = 'missing-view';
    expect(reopened.loadScenario(saved).ok).toBe(false); expect(reopened.snapshot()).toEqual(before);
  });

  it('demonstrates the HPGR feeder impact only under separately versioned fictional constraints', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.snapshot().connectivity['hpgr:mc001:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().connectivity['hpgr:drive-meb:converter'].terminalSources['hpgr:drive-meb:converter:ac-star']).toEqual(['fictional-source']);
    expect(session.changeDevice('sw435:hpgr:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['hpgr:mc001:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['sw435:mc435:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().impact.find(item => item.assetId === 'hpgr:mc001:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.trace('hpgr:mc001:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ assetIds: expect.arrayContaining(['hpgr:jb001', 'hpgr:tf001', 'hpgr:sw002:bus', 'hpgr:tf004']) })] });
  });

  it('does not treat converter AC/DC/output or outlet earth as an ordinary phase through-route in the fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    const before = session.snapshot();
    const converter = before.connectivity['hpgr:drive-meb:converter'];
    expect(converter.terminalSources['hpgr:drive-meb:converter:ac-star']).toEqual(['fictional-source']);
    expect(converter.terminalSources['hpgr:drive-meb:converter:ac-delta']).toEqual(['fictional-source']);
    expect(converter.terminalSources['hpgr:drive-meb:converter:dc']).toEqual([]);
    expect(converter.terminalSources['hpgr:drive-meb:converter:output']).toEqual([]);
    expect(before.connectivity['hpgr:motor-meb'].sourceIds).toEqual([]);
    expect(before.connectivity['hpgr:motor-meb'].sourceStatus).toBe('unconfirmed');
    expect(session.changeDevice('hpgr:drive-meb:dc-earth', 'closed')).toEqual({ ok: true });
    const after = session.snapshot();
    expect(after.connectivity['hpgr:drive-meb:converter'].terminalEarths['hpgr:drive-meb:converter:dc']).toEqual(['hpgr:drive-meb:dc-earth:termination']);
    expect(after.connectivity['hpgr:drive-meb:converter'].terminalEarths['hpgr:drive-meb:converter:ac-star']).toEqual([]);
    expect(after.conflicts).toEqual([]);
  });
});
