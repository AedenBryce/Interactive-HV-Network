import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withSupplementalEndpoints } from '../models/site/endpoint-extensions';
import { withWesternDetails } from '../models/site/western-extensions';
import type { NetworkModel } from './model';

const base = withSupplementalEndpoints(wholeNetworkModel, 'western-test-base-1');

function fictionalContract(): NetworkModel {
  const model = withWesternDetails(base, 'western-fictional-input');
  model.id = 'fictional-western-supplement'; model.version = 'fictional-western-contract-1'; model.name = 'Explicit fictional western paths'; model.synthetic = true;
  model.assets = model.assets.filter(asset => /^wh:h[38]:/.test(asset.id));
  const terminals = new Set(model.assets.flatMap(asset => asset.terminals));
  model.connections = model.connections.filter(connection => terminals.has(connection.from) && terminals.has(connection.to));
  model.earths = model.earths!.filter(earth => terminals.has(earth.terminal));
  model.boundaries = []; model.presentation = undefined;
  model.evidence!.push({ id: 'fictional-western-supplement', status: 'supported', summary: 'Explicit fictional contract: copied candidate winding source pairs and intact fuses are defined; winding earth pairs stay empty; main incoming and forward phase contacts closed, reverse contacts and earth switches open; two independent sources enabled; no physical interlocks. Establishes no installed condition or permission.', references: [{ document: 'Fictional western supplemental connectivity contract', revision: '1', page: 1 }] });
  for (const claim of [...model.assets, ...model.connections, ...model.earths]) { claim.knowledge = 'supported'; claim.evidenceIds = ['fictional-western-supplement']; claim.reviewIds = []; }
  model.sources = (['h3', 'h8'] as const).map(hopper => ({ id: `fictional-${hopper}`, label: `Fictional ${hopper} source`, assetId: `wh:${hopper}:hv416`, terminal: `wh:${hopper}:hv416:port` }));
  model.starting = { devices: Object.fromEntries(model.assets.filter(asset => asset.positions.length).map(asset => [asset.id, asset.kind === 'earth-switch' || asset.id.endsWith(':rc') ? 'open' : 'closed'])), sources: { 'fictional-h3': true, 'fictional-h8': true } };
  model.interlocks = { reviews: model.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'Explicit fictional test contract only: no physical interlocks.', evidence: [] })), rules: [] };
  return model;
}

describe('supplemental western details through the session', () => {
  it('extends the existing Hopper3 MV interface with its cable-side incoming earth and two paired motor routes', () => {
    const before = structuredClone(base);
    const result = new SimulationSession(withWesternDetails(base, 'western-h3-test-1')).snapshot();
    expect(base).toEqual(before);
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416:bus')).toMatchObject({ kind: 'bus', aliases: expect.arrayContaining(['6.6 kV', '200 A', '25 kA / 3 sec']) });
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'wh:h3:mc416:interface:port', to: 'wh:h3:mc416:in:a' }));
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'wh:h3:mc416:in:a', to: 'wh:h3:mc416:in-earth:a' }));
    for (const motor of [1, 2]) {
      for (const role of ['rc', 'fc']) {
        expect(result.model.assets.find(asset => asset.id === `wh:h3:mc416:m${motor}:${role}:fuse`)).toMatchObject({ knowledge: 'provisional', aliases: ['100 A phase fuse'] });
        expect(result.model.assets.find(asset => asset.id === `wh:h3:mc416:m${motor}:${role}`)?.kind).toBe('contactor');
        expect(result.devices[`wh:h3:mc416:m${motor}:${role}`]).toBeNull();
        expect(result.switching[`wh:h3:mc416:m${motor}:${role}`].positions.every(position => !position.allowed)).toBe(true);
      }
      expect(result.model.assets.find(asset => asset.id === `wh:h3:mc416:m${motor}:motor`)?.aliases).toContain(`SZ003-EM0${motor}`);
    }
    expect(result.model.assets.filter(asset => asset.id === 'wh:h3:tf416')).toHaveLength(1);
    expect(result.model.sources).toEqual(base.sources);
    expect(result.model.evidence?.find(record => record.id === 'WX-H3-MV')).toMatchObject({ references: [expect.objectContaining({ document: 'CB16OP038A-02006-DR-EL-0166', revision: '1', page: 1 })] });
  }, 20000);

  it('retains source-scoped Hopper8 motors and its first LV bar without duplicating transformers or Hopper3 LV', () => {
    const result = new SimulationSession(withWesternDetails(base, 'western-h8-test-1')).snapshot();
    for (const motor of [1, 2]) expect(result.model.assets.find(asset => asset.id === `wh:h8:mc416:m${motor}:motor`)?.aliases).toContain(`SZ008-EM0${motor}`);
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'wh:h8:mc416:in:a', to: 'wh:h8:mc416:in-earth:a' }));
    expect(result.model.assets.find(asset => asset.id === 'wh:h8:mc416a:bus')).toMatchObject({ aliases: expect.arrayContaining(['SS416-MC416A', '415 VAC', '630 A', '25 kA / 1 sec']) });
    expect(result.model.connections).toContainEqual(expect.objectContaining({ from: 'wh:h8:mc416a:interface:port', to: 'wh:h8:mc416a:in:a' }));
    expect(result.devices['wh:h8:mc416a:in']).toBeNull();
    expect(result.switching['wh:h8:mc416a:in'].positions.every(position => !position.allowed)).toBe(true);
    expect(result.model.assets.find(asset => asset.id === 'wh:h3:mc416a:bus')).toEqual(base.assets.find(asset => asset.id === 'wh:h3:mc416a:bus'));
    for (const id of ['wh:h3:tf416', 'wh:h3:tf416a', 'wh:h8:tf416', 'wh:h8:tf416a']) {
      expect(result.model.assets.filter(asset => asset.id === id)).toHaveLength(1);
      expect(result.model.assets.find(asset => asset.id === id)?.sourcePairs).toEqual(base.assets.find(asset => asset.id === id)?.sourcePairs);
      expect(result.model.assets.find(asset => asset.id === id)?.earthPairs).toEqual([]);
    }
    expect(result.model.evidence?.find(record => record.id === 'WX-H8-LV')).toMatchObject({ references: [expect.objectContaining({ document: 'CB17OP023D-01006-DR-EL-0003', revision: '1 (20/09/18; AS BUILT)', page: 1 })] });
    expect(result.model.reviews?.find(review => review.id === 'WH-Q07')).toMatchObject({ status: 'open', question: expect.stringContaining('received') });
  }, 20000);

  it('uses either fused RC/FC phase path, with independent motor maintenance earths, only in the fictional contract', () => {
    const session = new SimulationSession(fictionalContract());
    expect(session.snapshot().connectivity['wh:h3:mc416:m1:motor'].sourceIds).toEqual(['fictional-h3']);
    expect(session.changeDevice('wh:h3:mc416:m1:fc', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h3:mc416:m1:motor'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['wh:h3:mc416:m2:motor'].sourceIds).toEqual(['fictional-h3']);
    expect(session.changeDevice('wh:h3:mc416:m1:earth', 'closed')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['wh:h3:mc416:m1:motor'].earthIds).toEqual(['wh:h3:mc416:m1:earth:termination']);
    expect(session.snapshot().connectivity['wh:h3:mc416:bus'].earthIds).toEqual([]);
    expect(session.snapshot().connectivity['wh:h8:mc416:m1:motor'].earthIds).toEqual([]);
    expect(session.changeDevice('wh:h3:mc416:m1:earth', 'open')).toEqual({ ok: true });
    expect(session.changeDevice('wh:h3:mc416:m1:rc', 'closed')).toEqual({ ok: true });
    expect(session.trace('wh:h3:mc416:m1:motor')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-h3', assetIds: expect.arrayContaining(['wh:h3:mc416:m1:rc:fuse', 'wh:h3:mc416:m1:rc']) })] });
    expect(session.snapshot().connectivity['wh:h8:mc416a:bus'].sourceIds).toEqual(['fictional-h8']);
  });

  it('keeps the incoming earth cable-side without an invented cross-winding or Hopper3-to-Hopper8 earth path', () => {
    const session = new SimulationSession(fictionalContract());
    session.changeDevice('wh:h8:mc416:in', 'open');
    session.changeDevice('wh:h8:mc416:in-earth', 'closed');
    const result = session.snapshot();
    expect(result.connectivity['wh:h8:mc416:interface'].earthIds).toEqual(['wh:h8:mc416:in-earth:termination']);
    expect(result.connectivity['wh:h8:mc416:bus']).toMatchObject({ sourceIds: [], earthIds: [] });
    expect(result.connectivity['wh:h8:hv416'].earthIds).toEqual([]);
    expect(result.connectivity['wh:h8:mc416a:bus'].earthIds).toEqual([]);
    expect(result.connectivity['wh:h3:mc416:bus'].earthIds).toEqual([]);
    expect(result.conflicts).toContainEqual(expect.objectContaining({ sourceId: 'fictional-h8', earthId: 'wh:h8:mc416:in-earth:termination' }));
  });

  it('retains the complete extension, readable views and unresolved reviews in historical scenarios', () => {
    const model = withWesternDetails(base, 'western-history-test-1');
    const session = new SimulationSession(model);
    const result = session.snapshot();
    const oldAssets = new Set(base.assets.map(asset => asset.id));
    const added = result.model.assets.filter(asset => !oldAssets.has(asset.id));
    const addedControls = added.filter(asset => asset.positions.length);
    expect(added).toHaveLength(36); expect(addedControls).toHaveLength(17);
    expect(result.model.connections.length - base.connections.length).toBe(40);
    expect(result.model.earths!.length - base.earths!.length).toBe(6);
    expect(result.model.presentation!.views.length - base.presentation!.views.length).toBe(7);
    for (const asset of addedControls) {
      expect(result.devices[asset.id]).toBeNull();
      expect(result.switching[asset.id].positions.every(position => !position.allowed)).toBe(true);
    }
    const addedViews = result.model.presentation!.views.filter(view => view.id.startsWith('western-supplemental/'));
    for (const view of addedViews) {
      expect(view.bounds[2]).toBeLessThanOrEqual(1180);
      expect(view.boundaries!.length).toBeGreaterThan(0);
      expect(result.model.presentation!.views.some(other => other.id !== view.id && (other.boundaries?.some(boundary => boundary.targetViewId === view.id) || other.regions?.some(region => region.targetViewId === view.id)))).toBe(true);
    }
    expect(result.model.reviews!.filter(review => review.id.startsWith('WX-')).every(review => review.status === 'open')).toBe(true);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(base);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const historical = reopened.snapshot();
    expect(historical.mode).toBe('view-only');
    expect(historical.model).toEqual(model);
    expect(reopened.saveScenario()).toEqual(file);
  }, 20000);
});
