import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { expandedProfilesNetworkModel } from '../models/site/current-network';
import { withOwnerRmuThreePositionProfiles } from '../models/site/owner-rmu-three-position-profiles';
import { withOwnerRm714DriveOutputProfiles } from '../models/site/owner-rm714-drive-output-profiles';
import { withOwnerRmuSeparatedProfiles } from '../models/site/owner-rmu-separated-profiles';
import inventory from '../../drawing-review/supplemental/interlock-profile-review.json';

function priorModel() {
  const version = 'test-separated-prior5';
  return withOwnerRm714DriveOutputProfiles(withOwnerRmuThreePositionProfiles(expandedProfilesNetworkModel, version), version);
}

describe('owner-selected separated RMU main/disconnect/earth profiles', () => {
  it('enforces the RM418 separate main/earth and CB/descriptive-disconnect/earth interactions without adding Rack actions', () => {
    const session = new SimulationSession(withOwnerRmuSeparatedProfiles(priorModel(), 'test-separated-rm418-6'));
    const main = 'wh:h7:rm418:sw01'; const pairEarth = `${main}:es`;
    expect(session.changeDevice(pairEarth, 'closed').ok).toBe(false);
    expect(session.changeDevice(main, 'open').ok).toBe(true);
    expect(session.changeDevice(pairEarth, 'closed').ok).toBe(true);
    expect(session.changeDevice(main, 'closed').ok).toBe(false);
    expect(session.changeDevice(pairEarth, 'open').ok).toBe(true);
    expect(session.changeDevice(main, 'closed').ok).toBe(true);
    const cb = 'wh:h7:rm418:cb03'; const ds = `${cb}:disconnect`; const earth = `${cb}:earth`;
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(ds, 'open').ok).toBe(false);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, 'open').ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(ds, 'open').ok).toBe(true);
    expect(session.changeDevice(cb, 'closed').ok).toBe(false);
    expect(session.changeDevice(earth, 'closed').ok).toBe(true);
    expect(session.changeDevice(ds, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, 'closed').ok).toBe(false);
    expect(session.changeDevice(earth, 'open').ok).toBe(true);
    expect(session.changeDevice(ds, 'closed').ok).toBe(true);
    expect(session.changeDevice(cb, 'closed').ok).toBe(true);
    const unknown = session.saveScenario(); unknown.devices[cb] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(ds, 'open')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, 'open').ok).toBe(true);
    unknown.devices[cb] = 'open'; unknown.devices[ds] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice(cb, 'closed').ok).toBe(false);
    expect(session.changeDevice(earth, 'closed').ok).toBe(false);
    expect(session.changeDevice(ds, 'open').ok).toBe(true);
    expect(session.changeDevice(earth, 'open').ok).toBe(true);
  }, 30_000);

  it('enforces the RM420 incoming pair and all three fixed feeder trios with the separately recorded key deferral', () => {
    const session = new SimulationSession(withOwnerRmuSeparatedProfiles(priorModel(), 'test-separated-rm420-6'));
    expect(session.changeDevice('rm420:es01', 'closed').ok).toBe(false);
    expect(session.changeDevice('rm420:sw01', 'open').ok).toBe(true);
    expect(session.changeDevice('rm420:es01', 'closed').ok).toBe(true);
    expect(session.changeDevice('rm420:sw01', 'closed').ok).toBe(false);
    for (const prefix of ['rm420:tf420a', 'rm420:tf420b', 'rm420:spare']) {
      const cb = `${prefix}:cb`; const ds = `${prefix}:sw`; const es = `${prefix}:es`;
      expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
      expect(session.changeDevice(cb, 'open').ok).toBe(true);
      expect(session.changeDevice(ds, 'open').ok).toBe(true);
      expect(session.changeDevice(es, 'closed').ok).toBe(true);
      expect(session.changeDevice(cb, 'closed').ok).toBe(false);
      expect(session.changeDevice(ds, 'closed').ok).toBe(false);
      expect(session.changeDevice(es, 'open').ok).toBe(true);
      expect(session.changeDevice(ds, 'closed').ok).toBe(true);
      expect(session.changeDevice(cb, 'closed').ok).toBe(true);
    }
    const unknown = session.saveScenario(); unknown.devices['rm420:tf420a:es'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('rm420:tf420a:cb', 'closed').ok).toBe(false);
    expect(session.changeDevice('rm420:tf420b:cb', 'open').ok).toBe(true);
  }, 45_000);

  it('keeps all four RM721 pairs independent and blocks a Close with an unknown counterpart', () => {
    const session = new SimulationSession(withOwnerRmuSeparatedProfiles(priorModel(), 'test-separated-rm721-6'));
    for (const suffix of ['in01', 'in02', 'rm412', 'rm713']) {
      const main = `rm721:${suffix}`; const es = `${main}:es`;
      expect(session.changeDevice(es, 'closed').ok).toBe(false);
      expect(session.changeDevice(main, 'open').ok).toBe(true);
      expect(session.changeDevice(es, 'closed').ok).toBe(true);
      expect(session.changeDevice(main, 'closed').ok).toBe(false);
      expect(session.changeDevice(es, 'open').ok).toBe(true);
      expect(session.changeDevice(main, 'closed').ok).toBe(true);
    }
    const unknown = session.saveScenario(); unknown.devices['rm721:in01:es'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('rm721:in01', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice('rm721:in01', 'open').ok).toBe(true);
    expect(session.changeDevice('rm721:in02', 'open').ok).toBe(true);
    expect(session.changeDevice('rm721:in02:es', 'closed').ok).toBe(true);
  }, 45_000);

  it('changes only the exact29 reviews and34 rules while preserving the existing model and baseline', () => {
    const base = priorModel(); const before = structuredClone(base);
    const session = new SimulationSession(withOwnerRmuSeparatedProfiles(base, 'test-separated-inventory-6'));
    const { model } = session.snapshot();
    expect(model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(327);
    expect(model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(33);
    expect(model.interlocks!.rules).toHaveLength(517);
    for (const [group, count] of [['P14', 12], ['P15', 14], ['P16', 8]] as const) {
      const ids = inventory.groups.find(item => item.id === group)!.assetIds;
      expect(model.interlocks!.rules.filter(rule => rule.id.startsWith(`WN-INTERLOCK-${group}:`))).toHaveLength(count);
      for (const id of ids) {
        expect(session.snapshot().switching[id].reviewStatus).toBe('confirmed-rules');
        expect(model.assets.find(asset => asset.id === id)?.removableBreaker).toBeUndefined();
      }
    }
    expect(model.assets).toEqual(before.assets); expect(model.connections).toEqual(before.connections);
    expect(model.sources).toEqual(before.sources); expect(model.earths).toEqual(before.earths);
    expect(model.boundaries).toEqual(before.boundaries); expect(model.presentation).toEqual(before.presentation);
    expect(model.starting).toEqual(before.starting);
    expect(model.interlocks!.rules.slice(0, before.interlocks!.rules.length)).toEqual(before.interlocks!.rules);
    const selected = inventory.groups.filter(group => ['P14', 'P15', 'P16'].includes(group.id)).flatMap(group => group.assetIds);
    for (const review of before.interlocks!.reviews.filter(review => !selected.includes(review.assetId))) expect(model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)).toEqual(review);
    expect(base).toEqual(before);
    expect(model.assets.find(asset => asset.id === 'wh:h7:rm418:cb03:disconnect')?.label).toContain('Tag unconfirmed');
  }, 30_000);

  it('preserves undo/reset and self-contained matching or historical scenarios', () => {
    const base = priorModel(); const old = new SimulationSession(base).saveScenario();
    const session = new SimulationSession(withOwnerRmuSeparatedProfiles(base, 'test-separated-history-6'));
    const initial = session.saveScenario();
    expect(session.changeDevice('rm721:in01', 'open').ok).toBe(true);
    expect(session.undo().ok).toBe(true); expect(session.saveScenario()).toEqual(initial);
    expect(session.changeDevice('rm721:in01', 'open').ok).toBe(true);
    const saved = session.saveScenario(); saved.devices['rm721:in01:es'] = null;
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.saveScenario()).toEqual(saved);
    expect(session.changeDevice('rm721:in01', 'closed').ok).toBe(false);
    expect(session.reset().ok).toBe(true); expect(session.saveScenario()).toEqual(initial);
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.changeDevice('rm721:in01', 'open').ok).toBe(false);
    expect(session.saveScenario()).toEqual(old);
  }, 30_000);

  it('rejects changed source mappings, lost scoped deferral and existing rules before active-session replacement', () => {
    const base = priorModel(); const session = new SimulationSession(base); const before = session.snapshot();
    const wrongBranch = structuredClone(base); wrongBranch.connections.find(link => link.id === 'rm420:tf420a:es:branch')!.from = 'rm420:tf420b:sw:out';
    const wrongContact = structuredClone(base); wrongContact.assets.find(asset => asset.id === 'rm721:in01')!.positions.find(option => option.id === 'closed')!.pairs[0].reverse();
    const noTermination = structuredClone(base); noTermination.earths = noTermination.earths!.filter(earth => earth.terminal !== 'wh:h7:rm418:cb03:earth:b');
    const missingDeferral = structuredClone(base); missingDeferral.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')!.status = 'unresolved';
    const priorRule = structuredClone(base); priorRule.interlocks!.rules.push({ id: 'fictional-existing-rule', assetId: 'rm721:in01', position: 'closed', require: { kind: 'device', assetId: 'rm721:in01:es', position: 'open' }, explanation: 'Existing conditions must not be overwritten.', evidence: [] });
    for (const invalid of [wrongBranch, wrongContact, noTermination, missingDeferral, priorRule]) {
      expect(() => session.loadModel(withOwnerRmuSeparatedProfiles(invalid, 'test-separated-invalid'))).toThrow();
      expect(session.snapshot()).toEqual(before);
    }
    expect(() => withOwnerRmuSeparatedProfiles(base, base.version)).toThrow('new immutable');
    const applied = withOwnerRmuSeparatedProfiles(base, 'test-separated-applied');
    expect(() => withOwnerRmuSeparatedProfiles(applied, 'test-separated-repeat')).toThrow('already applied');
  }, 30_000);
});
