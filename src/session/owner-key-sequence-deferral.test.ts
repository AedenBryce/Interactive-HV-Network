import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerKeySequenceDeferral } from '../models/site/owner-key-sequence-deferral';
import inventory from '../../drawing-review/supplemental/interlock-profile-review.json';

function priorModel() {
  const version = 'test-key-sequence-prior-3';
  return withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
}
const selectedGroups = ['P06', 'P07', 'P08', 'P09', 'P10', 'P15'];

describe('bounded owner key/door/inching sequence deferral', () => {
  it('annotates exactly the 82 selected controls without expanding any action permission or changing state/topology', () => {
    const base = priorModel(); const original = structuredClone(base);
    const before = new SimulationSession(base).snapshot();
    const after = new SimulationSession(withOwnerKeySequenceDeferral(base, 'test-key-sequence-deferral-1')).snapshot();
    const selected = inventory.groups.filter(group => selectedGroups.includes(group.id)).flatMap(group => group.assetIds).sort();
    const changed = after.model.interlocks!.reviews.filter(review => review.note.startsWith('Owner answer49')).map(review => review.assetId).sort();
    expect(selected).toHaveLength(82); expect(changed).toEqual(selected);
    expect(after.model.interlocks!.reviews.map(({ assetId, status }) => ({ assetId, status }))).toEqual(base.interlocks!.reviews.map(({ assetId, status }) => ({ assetId, status })));
    expect(after.model.interlocks!.rules).toEqual(base.interlocks!.rules);
    for (const [id, status] of Object.entries(before.switching)) {
      expect(after.switching[id].reviewStatus).toBe(status.reviewStatus);
      expect(after.switching[id].positions.map(option => ({ id: option.id, allowed: option.allowed }))).toEqual(status.positions.map(option => ({ id: option.id, allowed: option.allowed })));
      expect(after.switching[id].actions?.map(({ command, allowed }) => ({ command, allowed }))).toEqual(status.actions?.map(({ command, allowed }) => ({ command, allowed })));
      expect(after.switching[id].conditions).toEqual(status.conditions);
    }
    for (const id of ['sw411:in-03:cb', 'sw411:bus-a:es', 'sw421:in:cb', 'rm721:in01']) expect(after.model.interlocks!.reviews.find(review => review.assetId === id)).toEqual(base.interlocks!.reviews.find(review => review.assetId === id));
    expect(after.model.assets).toEqual(base.assets); expect(after.model.connections).toEqual(base.connections);
    expect(after.model.sources).toEqual(base.sources); expect(after.model.earths).toEqual(base.earths);
    expect(after.model.starting).toEqual(base.starting); expect(after.model.boundaries).toEqual(base.boundaries);
    expect(after.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(169);
    expect(after.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(191);
    expect(base).toEqual(original);
  }, 20_000);

  it('retains exact scope provenance and original notes while unrelated local profiles remain unchanged', () => {
    const base = priorModel(); const session = new SimulationSession(withOwnerKeySequenceDeferral(base, 'test-key-sequence-provenance'));
    const snapshot = session.snapshot(); const selected = new Set(inventory.groups.filter(group => selectedGroups.includes(group.id)).flatMap(group => group.assetIds));
    const scope = snapshot.model.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')!;
    expect(scope.status).toBe('owner-confirmed');
    expect(scope.confirmation!.decision).toBe('Explicitly defer these listed sequences for V1');
    expect(scope.summary).toContain('not a blanket network key deferral');
    expect(scope.summary).toContain('separate complete local profile');
    for (const group of selectedGroups) expect(scope.references).toContainEqual(expect.objectContaining({ document: 'drawing-review/supplemental/interlock-profile-review.json', clause: expect.stringContaining(`${group}: exact`) }));
    expect(scope.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0055.pdf', revision: '3', page: 1, clause: expect.stringContaining('D-F/3-8') }));
    expect(scope.references).toContainEqual(expect.objectContaining({ document: 'CB112-02006-DR-EL-0005.pdf', revision: '7', page: 1 }));
    expect(scope.references).toContainEqual(expect.objectContaining({ document: '520CBC0007-2130-DR-EL-0003.pdf', revision: '3', page: 1 }));
    for (const original of base.interlocks!.reviews) {
      const current = snapshot.model.interlocks!.reviews.find(review => review.assetId === original.assetId)!;
      if (!selected.has(original.assetId)) expect(current).toEqual(original);
      else {
        expect(current.note).toMatch(/^Owner answer49 defers only/);
        expect(current.note).toContain(`Historical construction review context (retained provenance; the key-sequence scope above is current): ${original.note}`);
        for (const reference of original.evidence) expect(current.evidence).toContainEqual(reference);
      }
    }
    for (const [assetId, position] of [
      ['wh:h1:mc417:m1:fc', 'closed'], ['sw505:tf505a:hv-es', 'open'], ['sw505:vs50501:output-switch', 'open'], ['hpgr:sw002:a02:k101', 'open'], ['rm420:sw01', 'open'],
    ]) expect(session.changeDevice(assetId, position).ok).toBe(false);
    expect(session.changeDevice('wh:h1:mc417:in', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-DEFERRED-KEY-DOOR-INCHING')?.status).toBe('resolved');
    for (const review of base.reviews!) expect(snapshot.model.reviews).toContainEqual(review);
  }, 20_000);

  it('retains the bounded scope and unchanged action guards in immutable historical scenarios', () => {
    const base = priorModel(); const old = new SimulationSession(base).saveScenario();
    const first = withOwnerKeySequenceDeferral(base, 'test-key-sequence-history-1');
    const saved = new SimulationSession(first).saveScenario();
    const session = new SimulationSession(withOwnerKeySequenceDeferral(base, 'test-key-sequence-history-2'));
    expect(session.loadScenario(saved)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(saved);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.changeDevice('wh:h1:mc417:m1:fc', 'open').ok).toBe(false);
    const rewritten = structuredClone(saved);
    rewritten.model.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')!.summary = 'A rewritten scope cannot reuse the same immutable version.';
    expect(session.loadScenario(rewritten)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.saveScenario()).toEqual(saved);
    expect(session.loadScenario(old)).toEqual({ ok: true });
    expect(session.saveScenario().model.evidence!.some(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')).toBe(false);
  }, 20_000);

  it('rejects repeated scope application, stale identities and unchanged versions before session replacement', () => {
    const base = priorModel(); const original = structuredClone(base);
    const session = new SimulationSession(base); const before = session.snapshot();
    const missingReview = structuredClone(base); missingReview.interlocks!.reviews = missingReview.interlocks!.reviews.filter(review => review.assetId !== 'rm420:sw01');
    const changedKind = structuredClone(base); changedKind.assets.find(asset => asset.id === 'hpgr:sw002:a02:k101')!.kind = 'breaker';
    for (const candidate of [missingReview, changedKind]) {
      expect(() => session.loadModel(withOwnerKeySequenceDeferral(candidate, 'test-key-sequence-invalid'))).toThrow('Review required');
      expect(session.snapshot()).toEqual(before);
    }
    expect(() => session.loadModel(withOwnerKeySequenceDeferral(base, base.version))).toThrow('new immutable model version');
    const applied = withOwnerKeySequenceDeferral(base, 'test-key-sequence-applied'); const appliedBefore = structuredClone(applied);
    expect(() => session.loadModel(withOwnerKeySequenceDeferral(applied, 'test-key-sequence-repeat'))).toThrow('already applied');
    expect(applied).toEqual(appliedBefore); expect(base).toEqual(original); expect(session.snapshot()).toEqual(before);
  }, 20_000);
});
