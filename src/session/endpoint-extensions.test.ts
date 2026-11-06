import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withSupplementalEndpoints } from '../models/site/endpoint-extensions';
import type { NetworkModel } from './model';

function fictionalEndpointContract(): NetworkModel {
  const extended = withSupplementalEndpoints(wholeNetworkModel, 'endpoint-fixture-input');
  const ids = new Set(['sw454:interface:sw455', 'sw455:in-d:cb', 'sw455:bus-d', 'sw455:in-y:cb', 'sw455:bus-y', 'wh:h3:mc416a:interface', 'wh:h3:mc416a:in', 'wh:h3:mc416a:bus']);
  const assets = extended.assets.filter(asset => ids.has(asset.id));
  const terminals = new Set(assets.flatMap(asset => asset.terminals));
  const fixture: NetworkModel = { ...extended, id: 'fictional-supplemental-endpoints', version: 'fictional-endpoint-contract-1', name: 'Fictional endpoint paths only', synthetic: true, assets, connections: extended.connections.filter(connection => terminals.has(connection.from) && terminals.has(connection.to)), boundaries: [], earths: [], presentation: undefined, sources: [
    { id: 'd-source', label: 'Fictional D source', assetId: 'sw454:interface:sw455', terminal: 'sw454:interface:sw455:d' },
    { id: 'y-source', label: 'Fictional Y source', assetId: 'sw454:interface:sw455', terminal: 'sw454:interface:sw455:y' },
    { id: 'h3-source', label: 'Fictional Hopper3 source', assetId: 'wh:h3:mc416a:interface', terminal: 'wh:h3:mc416a:interface:port' },
  ], starting: { devices: { 'sw455:in-d:cb': 'closed', 'sw455:in-y:cb': 'closed', 'wh:h3:mc416a:in': 'closed' }, sources: { 'd-source': true, 'y-source': true, 'h3-source': true } }, interlocks: { reviews: assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional example only: no physical interlocks.', evidence: [] })), rules: [] } };
  fixture.evidence!.push({ id: 'fictional-endpoints', status: 'supported', summary: 'Explicit fictional contract: only the three endpoint branches, no transformer transfers, neutral or MEN phase-earth links, closed incoming devices, independent enabled sources and no interlocks. This is not an installed arrangement or permission.', references: [{ document: 'Fictional endpoint software contract', revision: '1', page: 1 }] });
  for (const claim of [...fixture.assets, ...fixture.connections]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-endpoints']; claim.reviewIds = []; }
  return fixture;
}

describe('supplemental first LV endpoints through the session', () => {
  it('extends the existing SW455 winding ports to separate depicted LV incomers and bars without mutating the base', () => {
    const before = structuredClone(wholeNetworkModel);
    const model = withSupplementalEndpoints(wholeNetworkModel, 'endpoint-construction-test-1');
    const result = new SimulationSession(model).snapshot();
    expect(wholeNetworkModel).toEqual(before);
    expect(result.model.version).toBe('endpoint-construction-test-1');
    expect(result.model.assets.filter(asset => asset.aliases?.includes('TF455'))).toHaveLength(1);
    for (const side of ['d', 'y']) {
      expect(result.model.assets.find(asset => asset.id === `sw455:in-${side}:cb`)).toMatchObject({ kind: 'breaker', aliases: [`CB SW455 IN ${side.toUpperCase()}`, '2500 A'] });
      expect(result.model.assets.find(asset => asset.id === `sw455:bus-${side}`)).toMatchObject({ kind: 'bus', aliases: expect.arrayContaining(['SW455', '690 V', '2500 A']) });
      expect(result.devices[`sw455:in-${side}:cb`]).toBeNull();
      expect(result.switching[`sw455:in-${side}:cb`].positions.every(position => !position.allowed)).toBe(true);
      expect(result.model.connections).toContainEqual(expect.objectContaining({ from: `sw454:interface:sw455:${side}`, to: `sw455:in-${side}:cb:a` }));
    }
    expect(result.model.evidence?.find(record => record.id === 'EP-SW455-ENDPOINTS')).toMatchObject({ status: 'supported', references: [expect.objectContaining({ document: '11098-04400-EL-DR-8020', revision: '3', page: 1 })] });
    expect(result.model.evidence?.find(record => record.id === 'SW-TF455-MISSING-LV')?.summary).not.toContain('Missing 8020 prevents');
    expect(result.model.reviews?.find(review => review.id === 'SW-R05')).toMatchObject({ status: 'open', question: expect.stringContaining('8020 revision 3') });
  });

  it('extends only the source-scoped Hopper3 LV interface and keeps its MV and Hopper8 gaps open', () => {
    const result = new SimulationSession(withSupplementalEndpoints(wholeNetworkModel, 'endpoint-construction-test-2')).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416a:in')).toMatchObject({ kind: 'breaker', aliases: ['MCCB 630 A', 'SS416-MC416A'] });
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416a:bus')).toMatchObject({ kind: 'bus', aliases: expect.arrayContaining(['SS416-MC416A', '415 VAC', '630 A']) });
    expect(result.model.assets.filter(asset => asset.id === 'wh:h3:tf416a')).toHaveLength(1);
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'wh:h3:mc416a:interface:port', to: 'wh:h3:mc416a:in:a' }));
    expect(result.devices['wh:h3:mc416a:in']).toBeNull();
    expect(result.switching['wh:h3:mc416a:in'].positions.every(position => !position.allowed)).toBe(true);
    expect(result.model.evidence?.find(record => record.id === 'EP-H3-LV-ENDPOINT')).toMatchObject({ references: [expect.objectContaining({ document: 'CB16OP038A-02006-DR-EL-0165', revision: '1', page: 1 })] });
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416a:interface')?.label).not.toContain('missing');
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416:interface')?.label).toContain('missing');
    expect(result.model.assets.find(asset => asset.id === 'wh:h8:mc416a:interface')?.label).toContain('unconfirmed');
    expect(result.model.reviews?.find(review => review.id === 'WH-Q07')).toMatchObject({ status: 'open', question: expect.stringContaining('0166') });
  });

  it('extends TF454 to MC454 while preserving the printed incomer/bar rating discrepancy and downstream MC455 boundary', () => {
    const result = new SimulationSession(withSupplementalEndpoints(wholeNetworkModel, 'endpoint-mc454-test')).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'mc454:in:cb')).toMatchObject({ aliases: ['CB MC454 IN', '3000 A'], kind: 'breaker' });
    expect(result.model.assets.find(asset => asset.id === 'mc454:bus')).toMatchObject({ aliases: expect.arrayContaining(['MC454', '400 V', '500 A printed']) });
    expect(result.devices['mc454:in:cb']).toBeNull();
    expect(result.switching['mc454:in:cb'].positions.every(position => !position.allowed)).toBe(true);
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'sw454:interface:mc454-mc455:port', to: 'mc454:in:cb:a' }));
    expect(result.model.assets.some(asset => asset.id === 'mc455:bus')).toBe(false);
    expect(result.model.evidence?.find(record => record.id === 'EP-MC454-ENDPOINT')).toMatchObject({ references: [expect.objectContaining({ document: '11098-04400-EL-DR-8010', revision: '6', page: 1 })] });
    expect(result.model.reviews?.find(review => review.id === 'EP-MC454-RATING')).toMatchObject({ status: 'open', question: expect.stringContaining('500 A') });
    expect(result.model.reviews?.find(review => review.id === 'SW-R04')?.question).not.toContain('details are absent');
  });

  it('keeps D/Y switching and phase-earth continuity independent in an explicit fictional endpoint contract', () => {
    const model = fictionalEndpointContract();
    model.assets.push({ id: 'fictional-earth', label: 'Explicit fictional D circuit earth', kind: 'interface', terminals: ['fictional-earth:port'], conductivePairs: [], positions: [] });
    model.connections.push({ id: 'fictional-earth-branch', from: 'sw454:interface:sw455:d', to: 'fictional-earth:port' });
    model.earths = [{ id: 'fictional-d-earth', label: 'Explicit fictional D circuit earth', terminal: 'fictional-earth:port' }];
    const session = new SimulationSession(model);
    const before = session.snapshot();
    expect(before.connectivity['sw455:bus-d']).toMatchObject({ sourceIds: ['d-source'], earthIds: ['fictional-d-earth'] });
    expect(before.connectivity['sw455:bus-y']).toMatchObject({ sourceIds: ['y-source'], earthIds: [] });
    expect(before.connectivity['wh:h3:mc416a:bus']).toMatchObject({ sourceIds: ['h3-source'], earthIds: [] });
    expect(session.changeDevice('sw455:in-d:cb', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['sw455:bus-d']).toMatchObject({ sourceIds: [], earthIds: [] });
    expect(session.snapshot().connectivity['sw455:bus-y'].sourceIds).toEqual(['y-source']);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity).toEqual(before.connectivity);
  });

  it('retains supplemental evidence and readable cross-view navigation in saved historical scenarios', () => {
    const model = withSupplementalEndpoints(wholeNetworkModel, 'endpoint-scenario-test-1');
    const original = new SimulationSession(model);
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const result = reopened.snapshot();
    expect(result.mode).toBe('view-only');
    expect(result.model).toEqual(model);
    for (const [id, assetId] of [['supplemental/sw455-lv', 'sw455:bus-d'], ['supplemental/hopper3-lv', 'wh:h3:mc416a:bus'], ['supplemental/mc454-lv', 'mc454:bus']]) {
      const view = result.model.presentation!.views.find(view => view.id === id)!;
      expect(view.assetIds).toContain(assetId);
      expect(view.bounds[2]).toBeLessThan(1000);
      expect(view.boundaries!.length).toBeGreaterThan(0);
      expect(result.model.presentation!.views.some(other => other.id !== id && other.boundaries?.some(boundary => boundary.targetViewId === id))).toBe(true);
    }
    expect(result.model.earths).toEqual(wholeNetworkModel.earths);
    for (const id of ['sw454:tf455:transformer', 'wh:h3:tf416a', 'sw454:tf454:transformer']) {
      expect(result.model.assets.find(asset => asset.id === id)?.earthPairs).toEqual([]);
      expect(result.model.assets.find(asset => asset.id === id)?.sourcePairs).toEqual(wholeNetworkModel.assets.find(asset => asset.id === id)?.sourcePairs);
    }
    expect(reopened.saveScenario()).toEqual(file);
  }, 20_000);
});
