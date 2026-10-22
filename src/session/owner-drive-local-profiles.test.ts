import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerBusEarthLvProfiles } from '../models/site/owner-bus-earth-lv-profiles';
import { withOwnerKeySequenceDeferral } from '../models/site/owner-key-sequence-deferral';
import { withOwnerDriveLocalProfiles } from '../models/site/owner-drive-local-profiles';

function priorModel() {
  const version = 'test-drive-prior3';
  const third = withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
  return withOwnerKeySequenceDeferral(withOwnerBusEarthLvProfiles(third, 'test-drive-bus4'), 'test-drive-key4');
}

describe('owner-selected drive local profiles', () => {
  it('enforces the exact three P08 HV matrices independently without reinstating deferred inching keys', () => {
    const session = new SimulationSession(withOwnerDriveLocalProfiles(priorModel(), 'test-drive-local4'));
    for (const suffix of ['a', 'b', 'c']) {
      const cb = `sw505:tf505${suffix}:hv-cb`; const es = `sw505:tf505${suffix}:hv-es`;
      expect(session.changeDevice(es, 'closed').ok).toBe(false);
      expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(true);
      expect(session.changeDevice(es, 'closed').ok).toBe(false);
      expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(true);
      expect(session.changeDevice(es, 'closed').ok).toBe(true);
      expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
      expect(session.changeDevice(es, 'open').ok).toBe(true);
      expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(true);
      expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    }
    const unknown = session.saveScenario();
    unknown.devices['sw505:tf505a:hv-cb'] = { contact: null, racking: 'out' };
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('sw505:tf505a:hv-es', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    unknown.devices['sw505:tf505a:hv-cb'] = { contact: 'open', racking: 'in' };
    unknown.devices['sw505:tf505a:hv-es'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('sw505:tf505a:hv-cb', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice('sw505:tf505a:hv-cb', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice('sw505:tf505a:hv-es', 'open').ok).toBe(true);
    expect(session.changeDevice('sw505:tf505b:hv-cb', { kind: 'contact', value: 'open' }).ok).toBe(true);
  }, 30_000);

  it('lets the six P11 AC input switches Open/Close independently with no racking or additional conditions', () => {
    const session = new SimulationSession(withOwnerDriveLocalProfiles(priorModel(), 'test-drive-ac4'));
    const initial = session.snapshot();
    const pairs = [
      ['rm406:vs4061:input-a:switch', 'rm406:vs4061:input-b:switch'],
      ['rm410:vs4101:input-a:switch', 'rm410:vs4101:input-b:switch'],
      ['rm413a:ac-input-a:switch', 'rm413a:ac-input-b:switch'],
    ];
    for (const [a, b] of pairs) {
      for (const id of [a, b]) {
        expect(initial.switching[id].reviewStatus).toBe('confirmed-none');
        expect(initial.switching[id].conditions).toEqual([]);
        expect(initial.switching[id].actions).toBeUndefined();
        expect(session.changeDevice(id, { kind: 'racking', value: 'out' }).ok).toBe(false);
      }
      expect(session.changeDevice(a, 'open').ok).toBe(true);
      expect(session.saveScenario().devices[b]).toBe('closed');
      expect(session.changeDevice(b, 'open').ok).toBe(true);
      expect(session.changeDevice(a, 'closed').ok).toBe(true);
      expect(session.saveScenario().devices[b]).toBe('open');
      expect(session.changeDevice(b, 'closed').ok).toBe(true);
    }
  }, 20_000);

  it('changes exactly twelve local reviews and fifteen rules while preserving baseline, topology, source/earth knowledge and unresolved P09/P10 controls', () => {
    const base = priorModel(); const original = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerDriveLocalProfiles(base, 'test-drive-inventory4')).snapshot();
    const model = snapshot.model;
    expect(model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(212);
    expect(model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(148);
    expect(model.interlocks!.rules).toHaveLength(329);
    expect(model.interlocks!.rules.slice(0, 314)).toEqual(original.interlocks!.rules);
    const selected = [
      'sw505:tf505a:hv-cb', 'sw505:tf505a:hv-es', 'sw505:tf505b:hv-cb', 'sw505:tf505b:hv-es', 'sw505:tf505c:hv-cb', 'sw505:tf505c:hv-es',
      'rm406:vs4061:input-a:switch', 'rm406:vs4061:input-b:switch', 'rm410:vs4101:input-a:switch', 'rm410:vs4101:input-b:switch', 'rm413a:ac-input-a:switch', 'rm413a:ac-input-b:switch',
    ];
    for (const review of original.interlocks!.reviews) {
      const after = model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)!;
      if (selected.includes(review.assetId)) {
        expect(after.note).toMatch(/^Owner answer(?:53|54) selects/);
        expect(after.note).toContain(review.note);
        for (const reference of review.evidence) expect(after.evidence).toContainEqual(reference);
      } else expect(after).toEqual(review);
    }
    for (const field of ['assets', 'connections', 'earths', 'sources', 'boundaries', 'presentation', 'starting'] as const) expect(model[field]).toEqual(original[field]);
    expect(snapshot.devices).toEqual(original.starting.devices);
    expect(snapshot.sources).toEqual(original.starting.sources);
    expect(snapshot.switching['sw505:vs50501:dc-earth'].reviewStatus).toBe('unresolved');
    expect(snapshot.switching['hpgr:drive-mea:dc-earth'].reviewStatus).toBe('unresolved');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P08')?.confirmation?.decision).toBe('Apply this local matrix to all3 pairs');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P11')?.confirmation?.decision).toBe('Use this profile for all6 inputs');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P08')?.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0055.pdf', revision: '3 (25.01.25; AS FOUND 23.10.23)', page: 1, clause: expect.stringContaining('TF505A') }));
    expect(base).toEqual(original);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);

  it('rejects missing scoped deferral, changed exact feeder paths, preexisting conditions and duplicate application before replacing the session', () => {
    const base = priorModel(); const session = new SimulationSession(base); const before = session.saveScenario();
    const missingDeferral = structuredClone(base);
    missingDeferral.evidence = missingDeferral.evidence!.filter(record => record.id !== 'WN-DEFERRED-KEY-DOOR-INCHING');
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(missingDeferral, 'test-missing-drive-deferral'))).toThrow('bounded P08 inching/key deferral is required');
    const wrongScope = structuredClone(base);
    const scope = wrongScope.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')!;
    scope.references = scope.references.filter(reference => !reference.clause?.startsWith('P08: exact 6'));
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(wrongScope, 'test-missing-drive-scope'))).toThrow('bounded P08 inching/key deferral is required');
    const wrongBranch = structuredClone(base);
    wrongBranch.connections.find(connection => connection.id === 'sw505:tf505a:hv-es:branch')!.from = 'sw505:tf505b:hv-cb:b';
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(wrongBranch, 'test-drive-wrong-branch'))).toThrow('source-evidenced P08 CB/ES feeder terminal association changed');
    const wrongFeed = structuredClone(base);
    wrongFeed.connections.find(connection => connection.id === 'sw505:tf505a:cable-TF505A-P-01')!.to = 'sw505:tf505b:hv';
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(wrongFeed, 'test-drive-wrong-feed'))).toThrow('source-evidenced P08 CB/ES feeder terminal association changed');
    const existing = structuredClone(base);
    existing.interlocks!.rules.push({ id: 'synthetic-existing-ac-rule', assetId: 'rm413a:ac-input-a:switch', position: 'closed', require: { kind: 'source', sourceId: 'boundary:tf11', enabled: true }, explanation: 'Synthetic preexisting condition must not be overwritten.', evidence: [{ document: 'Synthetic session guard fixture', revision: '1', page: 1 }] });
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(existing, 'test-drive-existing-rule'))).toThrow('existing P11 switch schema/rules/review');
    const applied = withOwnerDriveLocalProfiles(base, 'test-drive-applied4');
    expect(() => session.loadModel(withOwnerDriveLocalProfiles(applied, 'test-drive-repeated5'))).toThrow('already applied');
    expect(session.saveScenario()).toEqual(before);
  }, 20_000);

  it('preserves undo/reset and saved profile snapshots while the prior package opens view-only', () => {
    const prior = priorModel(); const historical = new SimulationSession(prior).saveScenario();
    const model = withOwnerDriveLocalProfiles(prior, 'test-drive-history4'); const session = new SimulationSession(model);
    const initial = session.saveScenario(); const cb = 'sw505:tf505a:hv-cb';
    expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.undo().ok).toBe(true);
    expect(session.saveScenario().devices[cb]).toEqual({ contact: 'open', racking: 'in' });
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(initial);
    expect(session.changeDevice('rm413a:ac-input-a:switch', 'open').ok).toBe(true);
    const saved = session.saveScenario(); const reopened = new SimulationSession(model);
    expect(reopened.loadScenario(saved).ok).toBe(true);
    expect(reopened.saveScenario()).toEqual(saved);
    expect(reopened.changeDevice('rm413a:ac-input-b:switch', 'open').ok).toBe(true);
    expect(session.loadScenario(historical).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(historical);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeDevice('rm413a:ac-input-a:switch', 'open').ok).toBe(false);
    expect(session.snapshot().switching[cb].reviewStatus).toBe('unresolved');
  }, 20_000);
});
