import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { preConfigurationNetworkModel } from '../models/site/current-network';
import { withOwnerRemovableBreakers } from '../models/site/owner-removable-breakers';
import { withOwnerStartingConfiguration } from '../models/site/owner-starting-configuration';
import { contactPosition } from './mechanisms';

describe('explicit owner starting selections through the session', () => {
  it('sets only the selected contact/racking/source values and preserves null contact categories', () => {
    const base = withOwnerRemovableBreakers(preConfigurationNetworkModel, 'test-base-mechanisms');
    const before = structuredClone(base);
    const session = new SimulationSession(withOwnerStartingConfiguration(base, 'test-owner-baseline'));
    const snapshot = session.snapshot();
    expect(Object.values(snapshot.devices).filter(state => contactPosition(state) !== null)).toHaveLength(356);
    expect(Object.values(snapshot.devices).filter(state => contactPosition(state) === null)).toHaveLength(4);
    expect(snapshot.sources).toEqual({ 'boundary:tf11': true, 'boundary:tf12': true, 'boundary:tf04': true });
    for (const id of ['sw411:in-03:cb', 'sw411:in-04:cb', 'sw411:tier-01:cb', 'sw411:tier-16:cb']) expect(snapshot.devices[id]).toEqual({ contact: 'closed', racking: 'in' });
    for (const id of ['sw411:bus-tie:cb', 'sw431:sw435:cb', 'sw435:sw431:cb']) expect(snapshot.devices[id]).toEqual({ contact: 'open', racking: 'out' });
    for (const asset of snapshot.model.assets.filter(asset => asset.kind === 'earth-switch' || asset.kind === 'contactor')) expect(snapshot.devices[asset.id]).toBe('open');
    expect(snapshot.devices['station:sb01:f4:cb']).toEqual({ contact: 'closed', racking: 'in' });
    expect(snapshot.devices['rm712:in01']).toBeNull();
    expect(snapshot.devices['line33:tie-in-abs']).toBe('closed');
    for (const prefix of ['rm406:sw', 'rm410:sw', 'wh:h1:rm417:sw', 'wh:h9:rm419:sw']) for (const suffix of ['01', '02', '03', '04']) expect(snapshot.devices[`${prefix}${suffix}`]).toBe('service');
    for (const id of ['cv006:abs:49-38-1', 'cv006:fused-abs:286', 'rm413a:es-q8:lower']) expect(snapshot.devices[id]).toBeNull();
    expect(snapshot.model.interlocks).toEqual(base.interlocks);
    expect(snapshot.model.connections).toEqual(base.connections);
    expect(snapshot.model.assets).toEqual(base.assets);
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario().devices).toEqual(snapshot.devices);
    expect(base).toEqual(before);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);
});
