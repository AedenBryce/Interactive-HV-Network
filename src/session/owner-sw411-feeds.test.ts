import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { wholeNetworkModel } from '../models/site/whole-network';
import { withStationBatteryLimits } from '../models/site/station-battery-limits';
import { withOwnerSw411Feeds } from '../models/site/owner-sw411-feeds';

const previous = () => withStationBatteryLimits(wholeNetworkModel, 'sw411-feeds-previous');

describe('scoped SW411 owner feed decisions', () => {
  it('confirms the six named cable routes without changing hardware, electrical relationships or its input', () => {
    const base = previous(); const before = structuredClone(base);
    const { model } = new SimulationSession(withOwnerSw411Feeds(base, 'construction-2026-10-23.1')).saveScenario();
    expect(base).toEqual(before);
    for (const [destination, tier, record] of [['sw454', '01', 'WN-SW411-FEEDS-01-02-04'], ['sw451', '02', 'WN-SW411-FEEDS-01-02-04'], ['sw435', '04', 'WN-SW411-FEEDS-01-02-04'], ['sw431', '13', 'WN-SW411-FEEDS-13-14-15'], ['sw426', '14', 'WN-SW411-FEEDS-13-14-15'], ['sw421', '15', 'WN-SW411-FEEDS-13-14-15']]) {
      expect(model.connections.find(connection => connection.id === `whole:join:${destination}`)).toMatchObject({ from: `sw411:tier-${tier}:interface:port`, to: `${destination}:interface:sw411:port`, knowledge: 'owner-confirmed', evidenceIds: expect.arrayContaining([record]) });
      expect(model.reviews!.find(review => review.id === `WN-JOIN-${destination}`)).toMatchObject({ status: 'resolved', resolution: { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'all confirmed' } });
      expect(model.evidence!.find(evidence => evidence.id === record)).toMatchObject({ status: 'owner-confirmed', confirmation: { date: '2026-10-23', decision: 'all confirmed' }, references: expect.arrayContaining(base.evidence!.find(evidence => evidence.id === `WN-JOIN-${destination}`)!.references) });
    }
    expect(model.assets).toEqual(base.assets);
    expect(model.connections.map(({ id, from, to }) => ({ id, from, to }))).toEqual(base.connections.map(({ id, from, to }) => ({ id, from, to })));
    expect(model.starting).toEqual(base.starting);
    expect(model.earths).toEqual(base.earths);
    expect(model.sources).toEqual(base.sources);
    expect(model.interlocks!.rules).toEqual(base.interlocks!.rules);
    expect(model.presentation).toEqual(base.presentation);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  });
  it('records only the cross-station key deferral while keeping all eight affected controls unresolved and blocked', () => {
    const base = previous(); const session = new SimulationSession(withOwnerSw411Feeds(base, 'construction-2026-10-23.1')); const snapshot = session.snapshot();
    const answer = 'there are key interlocks. Ignore these for now i will add them to the tool at a later date';
    const affected = ['sw411:in-03:cb', 'sw411:in-03:es', 'sw411:in-04:cb', 'sw411:in-04:es', 'station:sb01:f4:cb', 'station:sb01:f4:es', 'station:sb02:f1:cb', 'station:sb02:f1:es'];
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-CROSS-STATION-KEY-DEFERRAL')).toMatchObject({ status: 'owner-confirmed', confirmation: { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer } });
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-CROSS-STATION-KEY-DEFERRAL')).toMatchObject({ status: 'resolved', resolution: { decision: answer } });
    for (const id of affected) {
      expect(snapshot.switching[id]).toMatchObject({ reviewStatus: 'unresolved', note: expect.stringContaining('cross-station key interlocks') });
      expect(snapshot.switching[id].note).toContain('deferred');
      expect(snapshot.switching[id].positions.every(position => !position.allowed)).toBe(true);
      expect(snapshot.devices[id]).toBeNull();
    }
    expect(snapshot.model.interlocks!.reviews.filter(review => !affected.includes(review.assetId))).toEqual(base.interlocks!.reviews.filter(review => !affected.includes(review.assetId)));
    expect(snapshot.model.interlocks!.rules).toEqual(base.interlocks!.rules);
    expect(session.changeDevice('sw411:in-03:cb', 'closed')).toMatchObject({ ok: false });
    expect(session.saveScenario().devices).toEqual(base.starting.devices);
    expect(session.saveScenario().sources).toEqual(base.starting.sources);
    const saved = JSON.parse(JSON.stringify(session.saveScenario()));
    const historicalReader = new SimulationSession(base);
    expect(historicalReader.loadScenario(saved)).toEqual({ ok: true });
    expect(historicalReader.saveScenario().model).toEqual(snapshot.model);
    expect(historicalReader.snapshot().mode).toBe('view-only');
    const oldScenario = new SimulationSession(base).saveScenario();
    expect(session.loadScenario(JSON.parse(JSON.stringify(oldScenario)))).toEqual({ ok: true });
    expect(session.saveScenario().model).toEqual(base);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario().model.evidence!.some(record => record.id === 'WN-CROSS-STATION-KEY-DEFERRAL')).toBe(false);
  }, 20_000);
});
