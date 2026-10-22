import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel } from '../models/site/current-network';
import { wholeNetworkModel } from '../models/site/whole-network';

describe('current whole-network review package', () => {
  it('versions supplemental endpoints and current owner-confirmed view titles without changing the original assembly', () => {
    const original = JSON.stringify(wholeNetworkModel);
    const session = new SimulationSession(currentNetworkModel);
    const snapshot = session.snapshot();
    expect(snapshot.model).toMatchObject({ id: 'site-whole-network', version: 'construction-2026-10-22.8', synthetic: false });
    expect(snapshot.model.presentation!.views.find(view => view.id === 'hopper-10/rmu')?.label).toBe('Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed');
    expect(snapshot.model.presentation!.views.find(view => view.id === 'hopper-10/transformers')?.label).toBe('Hopper 10 · Selected 33 kV inputs / MC420A gap');
    for (const id of ['sw455:bus-d', 'sw455:bus-y', 'wh:h3:mc416a:bus', 'mc454:bus']) expect(snapshot.model.assets.some(asset => asset.id === id)).toBe(true);
    expect(snapshot.model.presentation!.views).toHaveLength(126);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/mc454-lv')?.layout.labelOffsets!['sw454:interface:mc454-mc455']).toEqual([170, 10]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/hopper3-lv')?.layout.labelOffsets!['wh:h3:mc416a:interface']).toEqual([170, 10]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/sw455-lv')?.layout.labelOffsets!['sw454:interface:sw455']).toEqual([55, 0]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/hopper3-lv')?.layout.labelOffsets!['wh:h3:tf416a']).toEqual([-140, 65]);
    expect(Object.values(snapshot.devices).every(state => state === null)).toBe(true);
    expect(Object.values(snapshot.sources).every(state => state === null)).toBe(true);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(JSON.stringify(wholeNetworkModel)).toBe(original);
    expect(wholeNetworkModel.version).toBe('construction-2026-10-22.4');
  });
  it('records the exact tier16 cable-tag confirmation without asserting broader route acceptance', () => {
    const { model, devices, sources } = new SimulationSession(currentNetworkModel).saveScenario();
    const id = 'WN-SW411-TIER16-CABLE';
    const decision = 'your assumption is correct tht it is RM721-P-01';
    expect(model.evidence!.find(record => record.id === id)).toMatchObject({ status: 'owner-confirmed', confirmation: { by: 'Project owner (conversation)', date: '2026-10-22', decision } });
    expect(model.reviews!.find(review => review.id === id)).toMatchObject({ status: 'resolved', resolution: { decision } });
    expect(model.assets.find(asset => asset.id === 'services:interface:sw411')?.label).toContain('RM721-P-01');
    expect(model.assets.find(asset => asset.id === 'services:interface:sw411')?.aliases).toContain('SW454-P-01 (disputed tier16 label; not SW454 join)');
    expect(model.connections.find(connection => connection.id === 'whole:join:rm721')).toMatchObject({ knowledge: 'provisional', evidenceIds: expect.arrayContaining([id]) });
    for (const reviewId of ['R002', 'SV-Q01', 'WN-JOIN-rm721']) expect(model.reviews!.find(review => review.id === reviewId)).toMatchObject({ status: 'open', question: expect.stringContaining('cable tag RM721-P-01 is owner-confirmed') });
    expect(Object.values(devices).every(state => state === null)).toBe(true);
    expect(Object.values(sources).every(state => state === null)).toBe(true);
    expect(wholeNetworkModel.evidence!.some(record => record.id === id)).toBe(false);
  });
});
