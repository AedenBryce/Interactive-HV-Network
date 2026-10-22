import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { sw411Model } from '../models/site/sw411';
import type { NetworkModel } from './model';

// This fixture retains the cited drawn topology but explicitly invents permissions,
// starting states and a source for software checks. It is never the site model.
function fictionalEnergisationFixture(sourceBay = 'in-01'): NetworkModel {
  const model = structuredClone(sw411Model);
  model.id = `fictional-sw411-check-${sourceBay}`;
  model.version = 'fictional-connectivity-test-1';
  model.name = 'Fictional SW411 software connectivity fixture';
  model.synthetic = true;
  model.starting.devices = Object.fromEntries(Object.keys(model.starting.devices).map(id => [id, 'open']));
  model.interlocks = { reviews: model.assets.filter(asset => asset.positions.length).map(asset => ({ assetId: asset.id, status: 'confirmed-none', note: 'This test alone explicitly defines no physical interlocks. It establishes no site permission.', evidence: [] })), rules: [] };
  model.sources = [{ id: 'fictional-test-source', label: 'Fictional test source', assetId: `sw411:${sourceBay}:interface`, terminal: `sw411:${sourceBay}:interface:port` }];
  model.starting.sources = { 'fictional-test-source': true };
  return model;
}

describe('SW411 provisional drawing construction through the session', () => {
  it('loads a source-referenced real construction model with unknown baseline and no invented source', () => {
    const result = new SimulationSession(sw411Model).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.assets).toHaveLength(41);
    expect(Object.values(result.devices)).toHaveLength(27);
    expect(Object.values(result.devices).every(position => position === null)).toBe(true);
    expect(result.sources).toEqual({});
    expect(result.model.sources).toEqual([]);
    expect(result.connectivity['sw411:bus-a'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['sw411:bus-b'].sourceStatus).toBe('unconfirmed');
  });

  it('keeps real interlock controls disabled and rejects switching without changing accepted results', () => {
    const session = new SimulationSession(sw411Model);
    const before = session.snapshot();
    expect(Object.values(before.switching)).toHaveLength(27);
    for (const [assetId, status] of Object.entries(before.switching)) {
      expect(status.reviewStatus).toBe('unresolved');
      expect(status.positions.every(position => !position.allowed)).toBe(true);
      expect(status.evidence).toContainEqual({ document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/2025; AS FOUND 23.10.23)', page: 1, clause: 'Note 3, upper-right notes' });
      expect(session.changeDevice(assetId, 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    }
    expect(session.snapshot()).toEqual(before);
    expect(before.history).toEqual([]);
  });

  it.each([
    ['in-01', 'a', 'b'], ['in-03', 'a', 'b'], ['in-04', 'b', 'a'], ['in-02', 'b', 'a'],
  ])('retains depicted %s membership in Bus %s while the tie is open', (sourceBay, ownBus, otherBus) => {
    const session = new SimulationSession(fictionalEnergisationFixture(sourceBay));
    expect(session.changeDevice(`sw411:${sourceBay}:cb`, 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity[`sw411:bus-${ownBus}`].sourceIds).toEqual(['fictional-test-source']);
    expect(session.snapshot().connectivity[`sw411:bus-${otherBus}`].sourceIds).toEqual([]);
    expect(session.changeDevice('sw411:bus-tie:cb', 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity[`sw411:bus-${otherBus}`].sourceIds).toEqual(['fictional-test-source']);
  });

  it.each([
    ['tier-01', 'in-01'], ['tier-02', 'in-01'], ['tier-03', 'in-01'], ['tier-04', 'in-01'],
    ['tier-13', 'in-04'], ['tier-14', 'in-04'], ['tier-15', 'in-04'], ['tier-16', 'in-04'],
  ])('retains the depicted %s feeder route through its own breaker', (bay, sourceBay) => {
    const session = new SimulationSession(fictionalEnergisationFixture(sourceBay));
    session.changeDevice(`sw411:${sourceBay}:cb`, 'closed');
    expect(session.snapshot().connectivity[`sw411:${bay}:interface`].sourceIds).toEqual([]);
    expect(session.changeDevice(`sw411:${bay}:cb`, 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity[`sw411:${bay}:interface`].sourceIds).toEqual(['fictional-test-source']);
    session.changeDevice(`sw411:${bay}:cb`, 'open');
    expect(session.snapshot().connectivity[`sw411:${bay}:interface`].sourceIds).toEqual([]);
  });

  it.each([
    ['in-01', 'a'], ['in-03', 'a'], ['in-04', 'b'], ['in-02', 'b'],
    ['tier-01', 'a'], ['tier-02', 'a'], ['tier-03', 'a'], ['tier-04', 'a'],
    ['tier-13', 'b'], ['tier-14', 'b'], ['tier-15', 'b'], ['tier-16', 'b'],
  ])('retains the line/cable-side earth branch for %s outside its open breaker', (bay, bus) => {
    const session = new SimulationSession(fictionalEnergisationFixture());
    expect(session.changeDevice(`sw411:${bay}:es`, 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity[`sw411:${bay}:interface`].earthIds).toEqual([`sw411:${bay}:earth-termination`]);
    expect(session.snapshot().connectivity['sw411:bus-a'].earthIds).toEqual([]);
    expect(session.snapshot().connectivity['sw411:bus-b'].earthIds).toEqual([]);
    session.changeDevice(`sw411:${bay}:cb`, 'closed');
    expect(session.snapshot().connectivity[`sw411:bus-${bus}`].earthIds).toEqual([`sw411:${bay}:earth-termination`]);
  });

  it.each(['a', 'b'])('keeps the Bus %s earth directly on its bus and outside open outgoing breakers', bus => {
    const session = new SimulationSession(fictionalEnergisationFixture());
    session.changeDevice(`sw411:bus-${bus}:es`, 'closed');
    const result = session.snapshot();
    const earthId = `sw411:bus-${bus}:earth-termination`;
    const feeder = bus === 'a' ? 'tier-01' : 'tier-13';
    expect(result.connectivity[`sw411:bus-${bus}`].earthIds).toEqual([earthId]);
    expect(result.connectivity[`sw411:${feeder}:cb`].terminalEarths).toEqual({ [`sw411:${feeder}:cb:bus`]: [earthId], [`sw411:${feeder}:cb:line`]: [] });
    expect(result.connectivity[`sw411:${feeder}:interface`].earthIds).toEqual([]);
    expect(result.connectivity[`sw411:bus-${bus === 'a' ? 'b' : 'a'}`].earthIds).toEqual([]);
  });

  it('preserves conflicting device aliases with exact source locations and open review records', () => {
    const result = new SimulationSession(sw411Model).snapshot();
    const tier16 = result.model.assets.find(asset => asset.id === 'sw411:tier-16:cb');
    expect(tier16?.aliases).toEqual(['CB RM721 FD01', 'CB SW454 FD 01']);
    expect(tier16?.reviewIds).toContain('R002');
    expect(result.model.assets.find(asset => asset.id === 'sw411:tier-03:cb')?.aliases).toEqual(['CBW OHL FD', 'CB SPARE']);
    expect(result.model.assets.find(asset => asset.id === 'sw411:tier-01:cb')?.id).not.toBe(tier16?.id);
    const record = result.model.evidence?.find(record => record.id === 'SW411-TIER-16');
    expect(record?.summary).toContain('Device/cable identities remain unconfirmed');
    expect(record?.references).toEqual([
      { document: '11098-07110-EL-DR-5151.pdf', revision: '7 (28/01/2025; AS FOUND 23.10.23)', page: 1, clause: 'Drawing region: central feeder bay tier 16 and its lower destination' },
      { document: 'CB-10016-DR-EL-0011.pdf', revision: '0 (27/10/2025)', page: 1, clause: 'Drawing region: upper-left SW411 diagram' },
    ]);
    expect(result.model.reviews?.filter(review => ['R001', 'R002', 'R003', 'R005'].includes(review.id)).map(review => [review.id, review.status])).toEqual([['R001', 'open'], ['R002', 'open'], ['R003', 'open'], ['R005', 'open']]);
    expect(result.model.assets.every(asset => asset.evidenceIds?.length)).toBe(true);
    expect(result.model.connections.every(connection => connection.evidenceIds?.length)).toBe(true);
  });

  it('round-trips the real construction evidence, unknown states, interfaces and model-owned views without PDFs', () => {
    const original = new SimulationSession(sw411Model);
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(sw411Model);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const result = reopened.snapshot();
    expect(result.model).toEqual(original.snapshot().model);
    expect(result.devices).toEqual(original.snapshot().devices);
    expect(result.sources).toEqual({});
    expect(result.connectivity).toEqual(original.snapshot().connectivity);
    expect(result.model.presentation?.views.map(view => view.id)).toEqual(['overview', 'bus-a', 'bus-b']);
    expect(result.model.boundaries).toHaveLength(12);
    expect(result.mode).toBe('exploration');
    expect(Object.values(result.switching).every(status => status.positions.every(position => !position.allowed))).toBe(true);
  });
});
