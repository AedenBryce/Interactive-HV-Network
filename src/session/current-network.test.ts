import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel } from '../models/site/current-network';
import { wholeNetworkModel } from '../models/site/whole-network';

describe('current whole-network review package', () => {
  it('versions supplemental endpoints and current owner-confirmed view titles without changing the original assembly', () => {
    const original = JSON.stringify(wholeNetworkModel);
    const session = new SimulationSession(currentNetworkModel);
    const snapshot = session.snapshot();
    expect(snapshot.model).toMatchObject({ id: 'site-whole-network', version: 'construction-2026-10-22.9', synthetic: false });
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
  it('saves the scoped crushing-tie confirmation while retaining document and switching questions', () => {
    const { model, devices, sources } = new SimulationSession(currentNetworkModel).saveScenario();
    const id = 'WN-CRUSHING-TIE';
    const question = 'Next connection to confirm: is SW431-P-02 the current tie between Crushing 1 SW431 and Crushing 2 SW435, with CB SW435 FD02 at the SW431 end and CB SW431 FD02 at the SW435 end? Sources:11098-07110-EL-DR-2353.pdf rev5 p1 C-G/2-3,2354rev9p1 B-G/2-3. Please correct any detail or say unconfirmed.';
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'confirmed' };
    expect(model.evidence!.find(record => record.id === id)).toMatchObject({
      status: 'owner-confirmed', confirmation, summary: expect.stringContaining(question),
      references: [
        { document: '11098-07110-EL-DR-2353.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: expect.stringContaining('C-G / 2-3') },
        { document: '11098-07110-EL-DR-2354.pdf', revision: '9 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: expect.stringContaining('B-G / 2-3') },
      ],
    });
    expect(model.reviews!.find(review => review.id === id)).toMatchObject({ status: 'resolved', question, resolution: confirmation });
    expect(model.connections.find(connection => connection.id === 'whole:join:crushing-tie')).toMatchObject({
      from: 'sw431:interface:sw435:port', to: 'sw435:interface:sw431:port', knowledge: 'owner-confirmed',
      evidenceIds: expect.arrayContaining([id]), reviewIds: expect.arrayContaining([id]),
    });
    expect(model.reviews!.find(review => review.id === 'WN-JOIN-crushing-tie')).toMatchObject({ status: 'resolved', question: expect.stringContaining(question), resolution: confirmation });
    expect(model.reviews!.find(review => review.id === 'C1-R03')).toMatchObject({ status: 'open', question: expect.stringContaining('500CBC0002-13015-DR-EL-2353'), evidenceIds: expect.arrayContaining([id]) });
    expect(model.reviews!.find(review => review.id === 'C2-R11')).toMatchObject({ status: 'open', question: expect.stringContaining('physical interlocks'), evidenceIds: expect.arrayContaining([id]) });
    for (const assetId of ['sw431:sw435:cb', 'sw431:sw435:es', 'sw435:sw431:cb', 'sw435:sw431:es']) {
      expect(devices[assetId]).toBeNull();
      expect(model.interlocks!.reviews.find(review => review.assetId === assetId)?.status).toBe('unresolved');
    }
    expect(Object.values(devices).every(state => state === null)).toBe(true);
    expect(Object.values(sources).every(state => state === null)).toBe(true);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    const original = new SimulationSession(wholeNetworkModel).snapshot().model;
    expect(original.version).toBe('construction-2026-10-22.4');
    expect(original.connections.find(connection => connection.id === 'whole:join:crushing-tie')?.knowledge).toBe('provisional');
    expect(original.evidence!.some(record => record.id === id)).toBe(false);
  });
});
