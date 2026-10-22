import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { currentNetworkModel, ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';

describe('current owner-selected source and local-profile package', () => {
  it('distributes the selected profiles, source claims and independent contactor baseline together', () => {
    const session = new SimulationSession(currentNetworkModel);
    const snapshot = session.snapshot();
    expect(snapshot.model.version).toBe('construction-2026-10-23.4');
    expect(snapshot.model.assets).toHaveLength(680);
    expect(snapshot.model.connections).toHaveLength(677);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(260);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(100);
    expect(snapshot.model.interlocks!.rules).toHaveLength(419);
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker)).toHaveLength(121);
    const contactors = snapshot.model.assets.filter(asset => asset.kind === 'contactor');
    expect(contactors).toHaveLength(24);
    for (const contactor of contactors) {
      expect(contactor.removableContactor).toBeDefined();
      expect(snapshot.devices[contactor.id]).toEqual({ contact: 'open', racking: 'in' });
      expect(snapshot.switching[contactor.id].reviewStatus).toBe('confirmed-rules');
    }
    const arcs = snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? []);
    expect(arcs).toHaveLength(174);
    expect(arcs.filter(arc => arc.knowledge === 'owner-confirmed')).toHaveLength(85);
    expect(arcs.filter(arc => arc.knowledge === 'unresolved')).toHaveLength(89);
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')?.status).toBe('owner-confirmed');
    expect(snapshot.model.reviews!.find(record => record.id === 'C2-R11')?.question).toMatch(/^Current expanded teaching configuration:.*145 independent racking positions/);
    expect(snapshot.model.reviews!.find(record => record.id === 'C2-R11')?.question).toContain('Historical .3 configuration description');
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(Object.values(snapshot.devices).filter(state => state === null)).toHaveLength(4);
    expect(Object.values(snapshot.sources)).toEqual([true, true, true]);
    expect(session.saveScenario().formatVersion).toBe(2);
  }, 30_000);

  it('keeps the previous distributed profile package view-only and self-contained', () => {
    const version = 'construction-2026-10-23.3';
    const previous = withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
    const original = new SimulationSession(previous).saveScenario();
    const session = new SimulationSession(currentNetworkModel);
    expect(session.loadScenario(original)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(original);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.changeDevice('sw411:in-03:cb', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.undo().ok).toBe(false);
    expect(session.reset().ok).toBe(false);
    expect(original.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(169);
    expect(original.model.assets.some(asset => asset.removableContactor)).toBe(false);
  }, 30_000);
});
