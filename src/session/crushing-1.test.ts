import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { crushing1Model } from '../models/site/crushing-1';
import type { NetworkModel } from './model';

function fictionalSwitchingFixture(): NetworkModel {
  const fixture = structuredClone(crushing1Model);
  fixture.id = 'fictional-crushing-1-behaviour'; fixture.version = 'fictional-check-1';
  fixture.name = 'Fictional connectivity check copied from the candidate arrangement'; fixture.synthetic = true;
  fixture.evidence!.push({ id: 'fictional-defined-behaviour', status: 'supported', summary: 'Fictional software contract only: copied candidate source pairs are explicitly defined for this test, earth transfer is absent, all initial breakers are closed and earth switches open. This establishes no installed-network permission.', references: [{ document: 'Fictional test definition', revision: '1', page: 1, clause: 'Explicit software example' }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) {
    item.knowledge = 'supported'; item.evidenceIds = ['fictional-defined-behaviour'];
  }
  fixture.boundaries = [];
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional enabled source', assetId: 'sw431:interface:sw411', terminal: 'sw431:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-defined-behaviour'] }];
  fixture.starting.sources = { 'fictional-source': true };
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'This fictional test explicitly defines no physical interlock; not site permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Crushing No. 1 drawing construction through the session', () => {
  it('loads the evidenced area with seven distinct final LV buses and an unconfirmed baseline', () => {
    const result = new SimulationSession(crushing1Model).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(result.sources).toEqual({});
    expect(Object.keys(result.devices)).toHaveLength(20);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    for (const id of ['sw431:mc431:bus', 'sw431:sw432:d:bus', 'sw431:sw432:y:bus', 'sw431:sw437:d:bus', 'sw431:sw437:y:bus', 'sw431:sw442:d:bus', 'sw431:sw442:y:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'hv', 'lv']);
  });

  it('blocks all actual-area controls without accepting an action or assuming a normal pose', () => {
    const session = new SimulationSession(crushing1Model);
    const before = session.snapshot();
    expect(Object.values(before.switching).every(status => status.reviewStatus === 'unresolved')).toBe(true);
    for (const assetId of Object.keys(before.devices)) {
      expect(session.changeDevice(assetId, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(before);
    expect(before.history).toEqual([]);
  });

  it('preserves cross-area interface identities, disputed aliases and separate winding policies', () => {
    const result = new SimulationSession(crushing1Model).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'sw431:interface:sw411')?.aliases).toContain('SW431-P-01');
    expect(result.model.assets.find(asset => asset.id === 'sw431:interface:sw435')?.aliases).toContain('SW431-P-02');
    expect(result.model.assets.find(asset => asset.id === 'sw431:sw435:cb')?.aliases).toContain('CB SW435 FD02');
    expect(result.model.assets.find(asset => asset.id === 'sw431:tf432:hv-cb')?.aliases).toContain('Tier 3 in detailed HV sheet');
    expect(result.model.reviews?.map(review => review.id)).toEqual(['C1-R01', 'C1-R02', 'C1-R03', 'C1-R04', 'C1-R05', 'C1-R06', 'C1-R07', 'C1-R08']);
    expect(result.model.reviews?.every(review => review.status === 'open')).toBe(true);
    for (const transformer of result.model.assets.filter(asset => asset.kind === 'transformer')) {
      expect(transformer.knowledge).toBe('provisional');
      expect(transformer.conductivePairs).toEqual([]);
      expect(transformer.earthPairs).toEqual([]);
      expect(transformer.reviewIds).toContain('C1-R08');
      expect(transformer.sourcePairs?.length).toBe(transformer.id.includes('tf431:') ? 1 : 2);
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    expect(result.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(8);
    expect(result.model.assets.some(asset => asset.id === 'sw431:mc431a:bus')).toBe(false);
  });

  it('retains full evidence and presentation in a self-contained scenario without drawings', () => {
    const session = new SimulationSession(crushing1Model);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(crushing1Model);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(session.snapshot());
    expect(reopened.snapshot().model.evidence?.find(record => record.id === 'C1-MC431-LV-ENDPOINTS')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2654.pdf', revision: '7 (14/11/25; issued for review)', page: 1 }));
    const before = reopened.snapshot();
    file.model.connections[0].to = 'unrepresented-terminal';
    expect(reopened.loadScenario(file).ok).toBe(false);
    expect(reopened.snapshot()).toEqual(before);
  });

  it('demonstrates branch switching and impact only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingFixture());
    expect(session.snapshot().connectivity['sw431:sw432:d:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().connectivity['sw431:sw432:y:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('sw431:tf432:hv-cb', 'open')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw431:sw432:d:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw431:sw432:y:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw431:mc431:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.impact.find(item => item.assetId === 'sw431:sw432:d:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.trace('sw431:sw432:y:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-source', assetIds: expect.arrayContaining(['sw431:tf432:transformer', 'sw431:sw432:y:cb', 'sw431:sw432:y:bus']) })] });
  });
});
