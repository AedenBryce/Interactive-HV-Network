import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withMc413Detail } from '../models/site/mc413-detail';

describe('supplemental MC413 first LV detail through the session', () => {
  it('records the depicted incomer and bar without accepting upstream identity or changing electrical relationships', () => {
    const original = new SimulationSession(wholeNetworkModel).saveScenario();
    const snapshot = new SimulationSession(withMc413Detail(wholeNetworkModel, 'mc413-detail-contract-1')).snapshot();
    const { model } = snapshot;
    expect(model.assets.find(asset => asset.id === 'rm413:mc413:cb')).toMatchObject({ knowledge: 'provisional', aliases: expect.arrayContaining(['CB MC413 IN', '3000 A']) });
    expect(model.assets.find(asset => asset.id === 'rm413:mc413:bus')).toMatchObject({ knowledge: 'provisional', aliases: expect.arrayContaining(['400 V', '3000 A', '50 kA for 1 sec']) });
    expect(model.evidence!.find(record => record.id === 'SV-MC413-SUPPLEMENT')).toMatchObject({ status: 'supported', references: [expect.objectContaining({ document: '00151-CB-02006-DR-EL-1001', revision: '11 (14.11.25; IFC)', page: 1 })] });
    expect(model.reviews!.find(review => review.id === 'SV-MC413-INSTALLED')).toMatchObject({ status: 'open', question: expect.stringContaining('RC001') });
    expect(model.reviews!.find(review => review.id === 'SV-Q08')).toMatchObject({ status: 'open', question: expect.stringContaining('received') });
    expect(snapshot.devices['rm413:mc413:cb']).toBeNull();
    expect(snapshot.switching['rm413:mc413:cb'].positions.every(position => !position.allowed)).toBe(true);
    expect(model.assets).toHaveLength(original.model.assets.length);
    expect(model.sources).toEqual(original.model.sources);
    expect(model.earths).toEqual(original.model.earths);
    expect(model.starting).toEqual(original.model.starting);
    expect(model.assets.find(asset => asset.id === 'rm413:tf413')).toEqual(original.model.assets.find(asset => asset.id === 'rm413:tf413'));
    expect(model.connections.map(({ id, from, to }) => ({ id, from, to }))).toEqual(original.model.connections.map(({ id, from, to }) => ({ id, from, to })));
    expect(model.assets.some(asset => asset.id.includes('mc413a'))).toBe(false);
    expect(new SimulationSession(wholeNetworkModel).saveScenario()).toEqual(original);
  }, 20_000);

  it('retains the source detail and navigation in a self-contained historical scenario', () => {
    const session = new SimulationSession(withMc413Detail(wholeNetworkModel, 'mc413-detail-history-1'));
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(wholeNetworkModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const snapshot = reopened.snapshot();
    expect(snapshot.mode).toBe('view-only');
    const view = snapshot.model.presentation!.views.find(view => view.id === 'supplemental/mc413-lv')!;
    expect(view.assetIds).toEqual(['rm413:tf413', 'rm413:mc413:cb', 'rm413:mc413:bus']);
    expect(view.boundaries).toContainEqual(expect.objectContaining({ remoteAssetId: 'rm413:tf413:cb' }));
    expect(snapshot.model.presentation!.views.find(target => target.id === view.boundaries![0].targetViewId)?.assetIds).toContain('rm413:tf413:cb');
    expect(reopened.changeDevice('rm413:mc413:cb', 'closed').ok).toBe(false);
    expect(reopened.saveScenario()).toEqual(file);
  }, 20_000);
});
