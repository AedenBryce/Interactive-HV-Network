import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { screeningModel } from '../models/site/screening';
import type { NetworkModel } from './model';

function fictionalSwitchingContract(): NetworkModel {
  const fixture = structuredClone(screeningModel);
  fixture.id = 'fictional-screening-connectivity'; fixture.version = 'fictional-check-1';
  fixture.name = 'Fictional screening connectivity contract'; fixture.synthetic = true;
  fixture.evidence!.push({ id: 'fictional-screening-contract', status: 'supported', summary: 'Explicit software example only: copied candidate winding source pairs are defined bidirectional, winding earth transfer is absent, all breakers start closed, all earth switches open, source enabled and no physical interlocks apply. This is not installed-network evidence or permission.', references: [{ document: 'Fictional Screening software contract', revision: '1', page: 1, clause: 'Defined example only' }] });
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) {
    item.knowledge = 'supported'; item.evidenceIds = ['fictional-screening-contract'];
  }
  fixture.boundaries = [];
  fixture.sources = [{ id: 'fictional-source', label: 'Fictional source', assetId: 'sw421:interface:sw411', terminal: 'sw421:interface:sw411:port', knowledge: 'supported', evidenceIds: ['fictional-screening-contract'] }];
  fixture.starting.sources = { 'fictional-source': true };
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset => asset.positions.length > 0).map(asset => [asset.id, asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.interlocks = { reviews: fixture.assets.filter(asset => asset.positions.length > 0).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicitly defined fictional contract, not actual switching permission.', evidence: [] })), rules: [] };
  return fixture;
}

describe('Screening drawing construction through the session', () => {
  it('exposes the SW411 interface and SW421 incoming/bus earth branches with no accepted starting states', () => {
    const result = new SimulationSession(screeningModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(result.sources).toEqual({});
    expect(result.model.assets.find(asset => asset.id === 'sw421:interface:sw411')?.aliases).toContain('SW421-P-01');
    expect(result.devices['sw421:in:cb']).toBe(null);
    expect(result.devices['sw421:in:es']).toBe(null);
    expect(result.devices['sw421:bus:es']).toBe(null);
    expect(result.connectivity['sw421:bus'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['sw421:bus'].earthStatus).toBe('unconfirmed');
    expect(result.model.connections.find(item => item.id === 'sw421:in:es:branch')?.from).toBe('sw421:in:cb:a');
    expect(result.model.connections.find(item => item.id === 'sw421:bus:es:branch')?.from).toBe('sw421:bus:bar');
  });

  it('retains four final LV buses, separate TF423 windings and two independently identified spare bays', () => {
    const result = new SimulationSession(screeningModel).snapshot();
    expect(Object.keys(result.devices)).toHaveLength(17);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    for (const id of ['sw421:mc421:bus', 'sw421:mc422:bus', 'sw421:sw423:d:bus', 'sw421:sw423:y:bus']) {
      expect(result.model.assets.find(asset => asset.id === id)?.kind).toBe('bus');
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(result.model.assets.filter(asset => asset.kind === 'bus')).toHaveLength(5);
    expect(result.model.assets.find(asset => asset.id === 'sw421:sw423:d:bus')?.aliases).toContain('SW243 (disputed reference description)');
    expect(result.model.assets.find(asset => asset.id === 'sw421:spare:tier2:cb')?.aliases).toContain('CB SPARE FD');
    expect(result.model.assets.find(asset => asset.id === 'sw421:spare:tier7:cb')?.aliases).toContain('CB SPARE FD');
    for (const tier of [2, 7]) {
      expect(result.model.boundaries?.some(boundary => boundary.terminal === `sw421:spare:tier${tier}:interface:port` && boundary.sourceCoverage === 'unconfirmed' && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    const transformers = result.model.assets.filter(asset => asset.kind === 'transformer');
    expect(transformers).toHaveLength(3);
    for (const transformer of transformers) {
      expect(transformer.knowledge).toBe('provisional');
      expect(transformer.conductivePairs).toEqual([]);
      expect(transformer.earthPairs).toEqual([]);
      expect(transformer.reviewIds).toContain('SC-R04');
      for (const terminal of transformer.terminals) expect(result.model.boundaries?.some(boundary => boundary.terminal === terminal && boundary.earthCoverage === 'unconfirmed')).toBe(true);
    }
    expect(transformers.find(asset => asset.id === 'sw421:tf423:transformer')?.sourcePairs).toEqual([['sw421:tf423:hv', 'sw421:tf423:lv-d'], ['sw421:tf423:hv', 'sw421:tf423:lv-y']]);
    expect(result.model.earths?.every(earth => result.model.assets.some(asset => asset.kind === 'earth-switch' && asset.terminals.includes(earth.terminal)))).toBe(true);
  });

  it('opens self-contained overview/HV/LV views with exact evidence and retains scope exclusions and open discrepancies', () => {
    const session = new SimulationSession(screeningModel);
    const result = session.snapshot();
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'hv', 'lv']);
    expect(result.model.presentation?.views.find(view => view.id === 'hv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'sw421:sw423:d:cb', targetViewId: 'lv' }));
    expect(result.model.presentation?.views.find(view => view.id === 'lv')?.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'sw421:tf423:hv-cb', targetViewId: 'hv' }));
    expect(result.model.evidence?.find(record => record.id === 'SC-OUTGOING-INTERLOCK-SCOPE')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2467.pdf', revision: '10 (18/11/25; ISSUED FOR CONSTRUCTION - CB25OP003A)', page: 1, clause: expect.stringContaining('note 2') }));
    expect(result.model.evidence?.find(record => record.id === 'SC-MC421-LV-ENDPOINTS')?.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2671.pdf', revision: '5B (10/02/26; RE-ISSUED FOR REVIEW - CB25OP003A)', page: 1 }));
    expect(result.model.reviews?.map(review => review.id)).toEqual(['SC-R01', 'SC-R02', 'SC-R03', 'SC-R04', 'SC-R05', 'SC-R06']);
    expect(result.model.reviews?.every(review => review.status === 'open')).toBe(true);
    expect(result.model.assets.some(asset => asset.aliases?.includes('SH101') || asset.aliases?.includes('SH106'))).toBe(false);
    const reopened = new SimulationSession(screeningModel);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(result);
    file.model.presentation.views[1].boundaries[0].targetViewId = 'unrepresented-view';
    expect(reopened.loadScenario(file).ok).toBe(false);
    expect(reopened.snapshot()).toEqual(result);
  });

  it('blocks all actual-area controls atomically while their physical interlocks remain unresolved', () => {
    const session = new SimulationSession(screeningModel);
    const before = session.snapshot();
    expect(Object.values(before.switching).every(status => status.reviewStatus === 'unresolved')).toBe(true);
    for (const id of Object.keys(before.devices)) {
      expect(session.changeDevice(id, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(before);
    expect(before.history).toEqual([]);
  });

  it('demonstrates D/Y incomer independence, feeder impact, tracing and undo only in a separately versioned fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.snapshot().model.version).toBe('fictional-check-1');
    expect(session.changeDevice('sw421:sw423:d:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw421:sw423:d:bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['sw421:sw423:y:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.changeDevice('sw421:tf423:hv-cb', 'open')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw421:sw423:d:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw421:sw423:y:bus'].sourceIds).toEqual([]);
    expect(result.connectivity['sw421:mc421:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.impact.find(item => item.assetId === 'sw421:sw423:y:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.trace('sw421:sw423:y:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-source', assetIds: expect.arrayContaining(['sw421:in:cb', 'sw421:tf423:hv-cb', 'sw421:tf423:transformer', 'sw421:sw423:y:cb']) })] });
    expect(new SimulationSession(screeningModel).snapshot().devices['sw421:sw423:d:cb']).toBe(null);
  });

  it('keeps cable-side earth continuity separate from winding source transfer in the fictional contract', () => {
    const session = new SimulationSession(fictionalSwitchingContract());
    expect(session.changeDevice('sw421:tf421:hv-cb', 'open')).toEqual({ ok: true });
    expect(session.changeDevice('sw421:tf421:hv-es', 'closed')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['sw421:tf421:transformer'].terminalEarths['sw421:tf421:hv']).toEqual(['sw421:tf421:hv-es:termination']);
    expect(result.connectivity['sw421:tf421:transformer'].terminalEarths['sw421:tf421:lv']).toEqual([]);
    expect(result.connectivity['sw421:mc421:bus'].earthStatus).toBe('disconnected');
    expect(result.connectivity['sw421:mc422:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.conflicts).toEqual([]);
  });
});
