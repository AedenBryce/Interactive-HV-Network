import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel } from '../models/site/current-network';
import { wholeNetworkModel } from '../models/site/whole-network';

describe('current whole-network review package', () => {
  it('versions supplemental endpoints and current owner-confirmed view titles without changing the original assembly', () => {
    const original = JSON.stringify(wholeNetworkModel);
    const session = new SimulationSession(currentNetworkModel);
    const snapshot = session.snapshot();
    expect(snapshot.model).toMatchObject({ id: 'site-whole-network', version: 'construction-2026-10-23.1', synthetic: false });
    expect(snapshot.model.presentation!.views.find(view => view.id === 'hopper-10/rmu')?.label).toBe('Hopper 10 · RM420 switchgear · TF04 33 kV feed confirmed');
    expect(snapshot.model.presentation!.views.find(view => view.id === 'hopper-10/transformers')?.label).toBe('Hopper 10 · Selected 33 kV inputs / MC420A LV');
    for (const id of ['sw455:bus-d', 'sw455:bus-y', 'wh:h3:mc416a:bus', 'mc454:bus']) expect(snapshot.model.assets.some(asset => asset.id === id)).toBe(true);
    expect(snapshot.model.presentation!.views).toHaveLength(91);
    expect(snapshot.model.assets).toHaveLength(680);
    expect(snapshot.model.connections).toHaveLength(677);
    expect(snapshot.model.sources).toHaveLength(3);
    expect(snapshot.model.earths).toHaveLength(139);
    expect(snapshot.model.boundaries).toHaveLength(313);
    expect(Object.keys(snapshot.devices)).toHaveLength(360);
    expect(Object.values(snapshot.switching).every(control => control.positions.every(position => !position.allowed))).toBe(true);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/mc454-lv')?.layout.labelOffsets!['sw454:interface:mc454-mc455']).toEqual([170, 10]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/hopper3-lv')?.layout.labelOffsets!['wh:h3:mc416a:interface']).toEqual([170, 10]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/sw455-lv')?.layout.labelOffsets!['sw454:interface:sw455']).toEqual([55, 0]);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'supplemental/hopper3-lv')?.layout.labelOffsets!['wh:h3:tf416a']).toEqual([-140, 65]);
    expect(Object.values(snapshot.devices).every(state => state === null)).toBe(true);
    expect(Object.values(snapshot.sources).every(state => state === null)).toBe(true);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(JSON.stringify(wholeNetworkModel)).toBe(original);
    expect(wholeNetworkModel.version).toBe('construction-2026-10-22.4');
  }, 20_000);
  it('composes the remaining referenced hopper and CV006 details without losing owner decisions or retaining an outgoing LV bypass', () => {
    const { model, devices, sources } = new SimulationSession(currentNetworkModel).saveScenario();
    for (const id of ['wh:h3:mc416:bus', 'wh:h8:mc416:bus', 'wh:h8:mc416a:bus', 'rm420:mc420a:bus', 'rm410:mc410a:bus']) expect(model.assets.some(asset => asset.id === id)).toBe(true);
    for (const id of ['rm410:mc410b:cb', 'rm410:mc410b:bus']) expect(model.assets.some(asset => asset.id === id)).toBe(false);
    expect(model.assets.find(asset => asset.id === 'rm410:interface:mc410a')).toMatchObject({ sourcePairs: [], earthPairs: [] });
    expect(model.connections.some(connection => connection.id === 'rm410:mc410a-to-mc410b')).toBe(false);
    for (const id of ['WN-H10-TF04-SOURCE', 'WN-H10-PRIMARY33-CONFIGURATION', 'WN-CV006-FEED-AND-REMOVED-H10', 'WN-SW411-INCOMING-ASSIGNMENT', 'WN-SW411-TIER16-TAGS', 'WN-SW411-TIER16-CABLE', 'WN-CRUSHING-TIE']) expect(model.reviews!.find(review => review.id === id)?.status).toBe('resolved');
    expect(model.connections.find(connection => connection.id === 'whole:join:crushing-tie')?.knowledge).toBe('owner-confirmed');
    expect(model.assets.find(asset => asset.id === 'rm420:bus')?.label).toContain('33 kV');
    expect(Object.values(devices).every(state => state === null)).toBe(true);
    expect(Object.values(sources).every(state => state === null)).toBe(true);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(wholeNetworkModel.assets.some(asset => asset.id === 'rm410:mc410b:bus')).toBe(true);
    expect(wholeNetworkModel.assets.some(asset => asset.id === 'wh:h8:mc416a:bus')).toBe(false);
    const contactors = model.assets.filter(asset => asset.kind === 'contactor');
    expect(contactors).toHaveLength(24);
    for (const contact of contactors) {
      expect(devices[contact.id]).toBeNull();
      expect(model.interlocks!.reviews.find(review => review.assetId === contact.id)?.status).toBe('unresolved');
      const historical = wholeNetworkModel.assets.find(asset => asset.id === contact.id);
      if (historical) {
        expect(historical.kind).toBe('disconnector');
        expect(contact.terminals).toEqual(historical.terminals);
        expect(contact.positions).toEqual(historical.positions);
      }
    }
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
  it('retains the exact mine-services feeding fact after its station feeder is excluded by the later scope decision', () => {
    const { model, devices, sources } = new SimulationSession(currentNetworkModel).saveScenario();
    const id = 'WN-MINE-TF03-FEED';
    expect(model.evidence!.find(record => record.id === id)).toMatchObject({ status: 'owner-confirmed', confirmation: { by: 'Project owner (conversation)', date: '2026-10-22', decision: 'It does' }, summary: expect.stringContaining('SB01 feeder F1') });
    expect(model.connections.some(connection => connection.id === 'whole:join:mine-tf03')).toBe(false);
    expect(model.boundaries!.some(boundary => boundary.id === 'boundary:excluded-station:whole:join:mine-tf03')).toBe(false);
    expect(model.reviews!.find(review => review.id === 'WN-JOIN-mine-tf03')).toMatchObject({ status: 'resolved', resolution: { decision: 'It does' } });
    for (const reviewId of ['MC-Q06', 'MC-Q09', 'MC-Q11']) expect(model.reviews!.find(review => review.id === reviewId)?.status).toBe('open');
    expect(model.connections.some(connection => [connection.from, connection.to].includes('mine:interface:study-tf03:port') && connection.id.startsWith('whole:join:'))).toBe(false);
    expect(Object.values(devices).every(state => state === null)).toBe(true);
    expect(Object.values(sources).every(state => state === null)).toBe(true);
    expect(wholeNetworkModel.connections.find(connection => connection.id === 'whole:join:mine-tf03')?.knowledge).toBe('provisional');
    expect(wholeNetworkModel.evidence!.some(record => record.id === id)).toBe(false);
  });

  it('applies station/mine/camp/railcar scope exclusions while retaining Services and the confirmed water branch', () => {
    const { model, devices, sources } = new SimulationSession(currentNetworkModel).saveScenario();
    expect(model.assets.some(asset => asset.id === 'station:sb01:bus')).toBe(false);
    expect(model.assets.some(asset => asset.id === 'station:sb02:bus')).toBe(false);
    expect(model.assets.some(asset => asset.id.startsWith('station:gen-'))).toBe(false);
    expect(model.assets.some(asset => asset.id === 'station:sb01:spare-tf04:transformer')).toBe(false);
    for (const prefix of ['station:sb01:f4', 'station:sb02:f1', 'station:sb02:f4']) {
      for (const suffix of ['cb', 'es', 'transformer']) expect(model.assets.find(asset => asset.id === `${prefix}:${suffix}`)).toEqual(wholeNetworkModel.assets.find(asset => asset.id === `${prefix}:${suffix}`));
      expect(devices[`${prefix}:cb`]).toBeNull();
    }
    for (const id of ['boundary:tf11', 'boundary:tf12', 'boundary:tf04']) {
      expect(model.sources.find(source => source.id === id)).toMatchObject({ knowledge: 'provisional' });
      expect(sources[id]).toBeNull();
    }
    expect(model.assets.some(asset => asset.id === 'mine:interface:station-tf03')).toBe(false);
    expect(model.assets.some(asset => asset.id === 'camp:interface:station-village')).toBe(false);
    expect(model.assets.some(asset => asset.id === 'mine:rm718:bus')).toBe(false);
    expect(model.assets.some(asset => asset.id === 'mine:sw441:bus')).toBe(true);
    expect(model.connections.some(connection => ['whole:join:mine-tf03', 'whole:join:village'].includes(connection.id))).toBe(false);
    expect(model.sources.filter(source => source.id.startsWith('camp:dg'))).toHaveLength(0);
    expect(model.sources.some(source => source.id === 'rm712:dg1:supply')).toBe(false);
    expect(model.sources.some(source => source.id === 'rm712:dg7:supply')).toBe(false);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  });

  it('retains the MC413 supplemental source while leaving its installed upstream identity open', () => {
    const { model, devices } = new SimulationSession(currentNetworkModel).saveScenario();
    expect(model.assets.find(asset => asset.id === 'rm413:mc413:cb')).toMatchObject({ knowledge: 'provisional', aliases: expect.arrayContaining(['CB MC413 IN', '3000 A']) });
    expect(model.assets.find(asset => asset.id === 'rm413:mc413:bus')?.aliases).toContain('50 kA for 1 sec');
    expect(model.reviews!.find(review => review.id === 'SV-MC413-INSTALLED')).toMatchObject({ status: 'open', question: expect.stringContaining('RC001') });
    expect(model.presentation!.views.some(view => view.id === 'supplemental/mc413-lv')).toBe(true);
    expect(model.assets.some(asset => asset.id.includes('mc413a'))).toBe(false);
    expect(model.sources).toHaveLength(3);
    expect(devices['rm413:mc413:cb']).toBeNull();
  });

});
