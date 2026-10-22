import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel } from '../models/site/current-network';
import { withOwnerRemovableBreakers } from '../models/site/owner-removable-breakers';
import { withOwnerSw411LocalRules } from '../models/site/owner-sw411-local-rules';

describe('owner-selected SW411 local rules through the session', () => {
  it('permits only the selected local line-earth sequence and preserves other interlock reviews', () => {
    const base = withOwnerRemovableBreakers(currentNetworkModel, 'test-removable-base');
    const model = withOwnerSw411LocalRules(base, 'test-sw411-rules');
    model.starting.devices['sw411:in-03:cb'] = { contact: 'closed', racking: 'in' };
    model.starting.devices['sw411:in-03:es'] = 'open';
    const session = new SimulationSession(model);
    expect(session.changeDevice('sw411:in-03:es', 'closed').ok).toBe(false);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:es', 'closed').ok).toBe(false);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:es', 'closed').ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice('sw411:in-03:es', 'open').ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'confirmed-rules')).toHaveLength(24);
    for (const id of ['sw411:bus-a:es', 'sw411:bus-b:es', 'sw411:bus-tie:cb', 'station:sb01:f4:cb', 'mine:sw441:in:cb']) expect(snapshot.switching[id].reviewStatus).toBe('unresolved');
    expect(snapshot.model.starting).toEqual(model.starting);
    expect(base.interlocks!.reviews.every(review => review.status === 'unresolved')).toBe(true);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);
});
