import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withSupplementalEndpoints } from '../models/site/endpoint-extensions';
import { withHopper10Lv } from '../models/site/hopper10-lv-extension';
import type { NetworkModel } from './model';

function fictionalLvEndpoint(): NetworkModel {
  const extended = withHopper10Lv(withSupplementalEndpoints(wholeNetworkModel, 'hopper10-lv-fiction-input'), 'hopper10-lv-fiction-input-extended');
  const ids = new Set(['rm420:mc420a:interface', 'rm420:mc420a:in:acb', 'rm420:mc420a:bus']);
  const assets = extended.assets.filter(asset => ids.has(asset.id)); const terminals = new Set(assets.flatMap(asset => asset.terminals));
  const fixture: NetworkModel = {
    ...extended, id: 'fictional-hopper10-lv-endpoint', version: 'fictional-hopper10-lv-1', name: 'Fictional MC420A endpoint contract only', synthetic: true,
    assets, connections: extended.connections.filter(connection => terminals.has(connection.from) && terminals.has(connection.to)),
    sources: [{ id: 'fictional-lv-source', label: 'Explicit fictional endpoint source', assetId: 'rm420:mc420a:interface', terminal: 'rm420:mc420a:interface:port' }],
    starting: { devices: { 'rm420:mc420a:in:acb': 'closed' }, sources: { 'fictional-lv-source': true } },
    interlocks: { reviews: [{ assetId: 'rm420:mc420a:in:acb', status: 'confirmed-none', note: 'Explicit fictional software example only; no site permission.', evidence: [] }], rules: [] },
    boundaries: [], presentation: undefined, reviews: [], earths: [],
    evidence: [{ id: 'fictional-lv-contract', status: 'supported', summary: 'Explicit fictional software contract: one endpoint source and a fixed earth branch on the interface side of a closed/open incoming breaker. No transformer, neutral/MEN or actual installed arrangement or permission is represented.', references: [{ document: 'Fictional MC420A endpoint software contract', revision: '1', page: 1 }] }],
  };
  for (const claim of [...fixture.assets, ...fixture.connections]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-lv-contract']; claim.reviewIds = []; }
  fixture.assets.push({ id: 'fictional-lv-earth', label: 'Explicit fictional earth termination', kind: 'interface', terminals: ['fictional-lv-earth:port'], conductivePairs: [], positions: [] });
  fixture.connections.push({ id: 'fictional-lv-earth:branch', from: 'rm420:mc420a:interface:port', to: 'fictional-lv-earth:port' });
  fixture.earths = [{ id: 'fictional-lv-earth', label: 'Explicit fictional endpoint earth', terminal: 'fictional-lv-earth:port' }];
  return fixture;
}

describe('Hopper10 first LV endpoint through the session', { timeout: 60000 }, () => {
  it('extends the existing TF420B output interface through the depicted ACB01 to its first LV bar without changing the base', () => {
    const base = withSupplementalEndpoints(wholeNetworkModel, 'hopper10-lv-base-test-1'); const before = structuredClone(base);
    const saved = new SimulationSession(withHopper10Lv(base, 'hopper10-lv-construction-test-1')).saveScenario();
    expect(base).toEqual(before);
    expect(saved.model.version).toBe('hopper10-lv-construction-test-1');
    expect(saved.model.assets.find(asset => asset.id === 'rm420:mc420a:in:acb')).toMatchObject({ kind: 'breaker', aliases: expect.arrayContaining(['ACB01', '2000 A']) });
    expect(saved.model.assets.find(asset => asset.id === 'rm420:mc420a:bus')).toMatchObject({ kind: 'bus', aliases: expect.arrayContaining(['SR420-MC420A', '415 VAC', '2600 A', '80 kA for 1 sec']) });
    expect(saved.model.connections.find(connection => connection.id === 'ep:h10:mc420a:incoming')).toMatchObject({ from: 'rm420:mc420a:interface:port', to: 'rm420:mc420a:in:acb:in' });
    expect(saved.model.connections.find(connection => connection.id === 'ep:h10:mc420a:bar')).toMatchObject({ from: 'rm420:mc420a:in:acb:out', to: 'rm420:mc420a:bus:bar' });
    expect(saved.model.assets.filter(asset => asset.kind === 'transformer')).toEqual(base.assets.filter(asset => asset.kind === 'transformer'));
    expect(saved.model.sources).toEqual(base.sources); expect(saved.model.earths).toEqual(base.earths);
    expect(saved.devices).toEqual({ ...base.starting.devices, 'rm420:mc420a:in:acb': null });
    expect(saved.sources).toEqual(base.starting.sources);
    expect(saved.model.evidence?.find(record => record.id === 'EP-H10-LV-ENDPOINT')).toMatchObject({ status: 'supported', references: expect.arrayContaining([expect.objectContaining({ document: '520CBC0007-2130-DR-EL-0005', revision: '1 (20.01.22; AS BUILT)', page: 1 })]) });
  });

  it('replaces the missing-detail caption with sourced two-way navigation while keeping the new actual control blocked', () => {
    const base = withSupplementalEndpoints(wholeNetworkModel, 'hopper10-lv-base-test-2');
    const session = new SimulationSession(withHopper10Lv(base, 'hopper10-lv-navigation-test-1')); const before = session.snapshot();
    expect(before.switching['rm420:mc420a:in:acb']).toMatchObject({ reviewStatus: 'unresolved' });
    expect(before.switching['rm420:mc420a:in:acb'].positions.every(position => !position.allowed)).toBe(true);
    expect(session.changeDevice('rm420:mc420a:in:acb', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.snapshot()).toEqual(before);
    expect(before.model.evidence?.find(record => record.id === 'H10-MC420A-GAP')).toMatchObject({ status: 'supported', summary: expect.stringContaining('0005 revision1') });
    expect(before.model.reviews?.find(review => review.id === 'H10-Q03')).toMatchObject({ status: 'open', question: expect.stringContaining('0005 revision1') });
    expect(before.model.assets.find(asset => asset.id === 'rm420:mc420a:interface')?.label).not.toContain('unconfirmed');
    expect(before.model.connections.find(connection => connection.id === 'rm420:tf420b:lv-continuation')).toMatchObject({ knowledge: 'supported', evidenceIds: expect.arrayContaining(['EP-H10-LV-ENDPOINT']) });
    const detail = before.model.presentation!.views.find(view => view.id === 'supplemental/hopper10-lv')!;
    expect(detail.bounds[2]).toBeLessThan(1000);
    const upstream = detail.boundaries?.find(boundary => boundary.connectionId === 'rm420:tf420b:lv-continuation');
    expect(upstream).toMatchObject({ remoteAssetId: 'rm420:tf420b' });
    expect(before.model.presentation!.views.find(view => view.id === upstream?.targetViewId)?.assetIds).toContain('rm420:tf420b');
    expect(before.model.presentation!.views.some(view => view.id !== detail.id && view.boundaries?.some(boundary => boundary.connectionId === 'ep:h10:mc420a:incoming' && boundary.targetViewId === detail.id))).toBe(true);
    expect(before.model.presentation!.views.find(view => view.id === 'hopper-10/transformers')?.label).toBe('Hopper 10 · Selected 33 kV inputs / MC420A LV');
    expect(before.model.assets.find(asset => asset.id === 'rm420:mc420:bus')).toEqual(base.assets.find(asset => asset.id === 'rm420:mc420:bus'));
    expect(before.model.connections.filter(connection => connection.id.startsWith('whole:primary33:'))).toEqual(base.connections.filter(connection => connection.id.startsWith('whole:primary33:')));
    expect(before.model.reviews?.find(review => review.id === 'H10-Q04')?.status).toBe('open');
  });

  it('demonstrates endpoint source/earth isolation, impact, undo and reset only in a separately defined fictional contract', () => {
    const session = new SimulationSession(fictionalLvEndpoint()); const before = session.snapshot();
    expect(before.model).toMatchObject({ id: 'fictional-hopper10-lv-endpoint', version: 'fictional-hopper10-lv-1', synthetic: true });
    expect(before.connectivity['rm420:mc420a:bus']).toMatchObject({ sourceIds: ['fictional-lv-source'], earthIds: ['fictional-lv-earth'] });
    expect(session.trace('rm420:mc420a:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ connectionIds: ['ep:h10:mc420a:incoming', 'ep:h10:mc420a:bar'] })] });
    expect(session.changeDevice('rm420:mc420a:in:acb', 'open')).toEqual({ ok: true });
    let result = session.snapshot();
    expect(result.connectivity['rm420:mc420a:bus']).toMatchObject({ sourceIds: [], earthIds: [] });
    expect(result.impact.find(item => item.assetId === 'rm420:mc420a:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['rm420:mc420a:bus']).toEqual(before.connectivity['rm420:mc420a:bus']);
    expect(session.changeSource('fictional-lv-source', false)).toEqual({ ok: true });
    expect(session.reset()).toEqual({ ok: true }); result = session.snapshot();
    expect(result.connectivity['rm420:mc420a:bus']).toMatchObject({ sourceIds: ['fictional-lv-source'], earthIds: ['fictional-lv-earth'] });
    expect(result.history).toEqual([]);
  });

  it('preserves the new source evidence, blocked null incomer and upstream navigation in historical scenarios', () => {
    const base = withSupplementalEndpoints(wholeNetworkModel, 'hopper10-lv-scenario-base');
    const model = withHopper10Lv(base, 'hopper10-lv-scenario-extension'); const original = new SimulationSession(model);
    const saved = JSON.parse(JSON.stringify(original.saveScenario())); const reopened = new SimulationSession(base);
    expect(reopened.loadScenario(saved)).toEqual({ ok: true }); const result = reopened.snapshot();
    expect(result.mode).toBe('view-only'); expect(result.model).toEqual(model);
    expect(result.devices['rm420:mc420a:in:acb']).toBeNull();
    expect(reopened.changeDevice('rm420:mc420a:in:acb', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(result.model.presentation!.views.find(view => view.id === 'supplemental/hopper10-lv')?.boundaries).toContainEqual(expect.objectContaining({ connectionId: 'rm420:tf420b:lv-continuation', remoteAssetId: 'rm420:tf420b' }));
    expect(result.model.assets.filter(asset => !base.assets.some(previous => previous.id === asset.id)).map(asset => asset.id)).toEqual(['rm420:mc420a:in:acb', 'rm420:mc420a:bus']);
    expect(result.model.connections.filter(connection => connection.from === 'rm420:mc420a:bus:bar' || connection.to === 'rm420:mc420a:bus:bar')).toHaveLength(1);
    expect(reopened.saveScenario()).toEqual(saved);
    const invalid = structuredClone(saved); invalid.model.presentation.views.find((view: { id: string }) => view.id === 'supplemental/hopper10-lv').boundaries[0].targetViewId = 'missing-hopper10-view';
    expect(reopened.loadScenario(invalid).ok).toBe(false); expect(reopened.saveScenario()).toEqual(saved);
  });
});
