import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, preConfigurationNetworkModel } from '../models/site/current-network';
import { contactPosition } from './mechanisms';

describe('current owner-configured whole network', () => {
  it('distributes the selected baseline and local controls as a new format2 package while preserving the old package', () => {
    const old = new SimulationSession(preConfigurationNetworkModel).saveScenario();
    const session = new SimulationSession(currentNetworkModel); const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.2');
    expect(session.saveScenario().formatVersion).toBe(2);
    expect(snapshot.model.assets).toHaveLength(680);
    expect(snapshot.model.connections).toHaveLength(677);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker)).toHaveLength(119);
    expect(Object.values(snapshot.devices).filter(state => contactPosition(state) === null)).toHaveLength(4);
    expect(Object.values(snapshot.sources)).toEqual([true, true, true]);
    expect(Object.values(snapshot.switching).filter(status => status.reviewStatus === 'confirmed-rules')).toHaveLength(24);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('sw411:in-03:es', 'closed').ok).toBe(true);
    expect(session.undo().ok).toBe(true);
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario().devices).toEqual(snapshot.devices);
    const configured = session.saveScenario();
    expect(session.loadScenario(JSON.parse(JSON.stringify(configured)))).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(configured);
    expect(session.loadScenario(JSON.parse(JSON.stringify(old)))).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(old);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.undo().ok).toBe(false); expect(session.reset().ok).toBe(false);
    expect(old.modelVersion).toBe('construction-2026-10-23.1');
    expect(old.formatVersion).toBe(1);
    expect(Object.values(old.devices).every(state => state === null)).toBe(true);
    expect(Object.values(old.sources).every(state => state === null)).toBe(true);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 30_000);
});
