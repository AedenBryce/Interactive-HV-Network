import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { preConfigurationNetworkModel } from '../models/site/current-network';
import { withOwnerRemovableBreakers } from '../models/site/owner-removable-breakers';
import { withOwnerSw411LocalRules } from '../models/site/owner-sw411-local-rules';
import { withOwnerStartingConfiguration } from '../models/site/owner-starting-configuration';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import inventory from '../../drawing-review/supplemental/interlock-profile-review.json';

function priorModel() {
  const version = 'test-owner-profiles-prior';
  return withOwnerStartingConfiguration(withOwnerSw411LocalRules(withOwnerRemovableBreakers(preConfigurationNetworkModel, version), version), version);
}

describe('owner-selected additional local interlocks', () => {
  it('applies only the exact three selected profiles without changing baseline, topology or claim knowledge', () => {
    const base = priorModel(); const original = structuredClone(base);
    const model = withOwnerAdditionalInterlocks(base, 'test-owner-profiles-1');
    const snapshot = new SimulationSession(model).snapshot();
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(169);
    expect(snapshot.model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(191);
    for (const id of inventory.groups.find(group => group.id === 'P01')!.assetIds) expect(snapshot.switching[id].reviewStatus).toBe('confirmed-rules');
    for (const id of inventory.groups.find(group => group.id === 'P04')!.assetIds) {
      expect(snapshot.switching[id].reviewStatus).toBe('confirmed-none');
      expect(snapshot.switching[id].note).toContain('intrinsic');
      expect(snapshot.switching[id].note).toMatch(/^Owner answer43 selects/);
      expect(snapshot.switching[id].note).toContain('Historical construction review context');
    }
    expect(snapshot.switching['sw411:bus-tie:cb'].reviewStatus).toBe('confirmed-rules');
    expect(snapshot.switching['sw411:bus-a:es'].reviewStatus).toBe('unresolved');
    expect(snapshot.switching['hpgr:mc001:cb'].reviewStatus).toBe('unresolved');
    expect(snapshot.model.starting).toEqual(original.starting);
    expect(snapshot.model.assets).toEqual(original.assets);
    expect(snapshot.model.connections).toEqual(original.connections);
    expect(snapshot.model.earths).toEqual(original.earths);
    expect(snapshot.model.interlocks!.rules.slice(0, original.interlocks!.rules.length)).toEqual(original.interlocks!.rules);
    expect(snapshot.model.interlocks!.rules.filter(rule => rule.id.startsWith('WN-INTERLOCK-P01:'))).toHaveLength(240);
    expect(snapshot.model.interlocks!.rules.filter(rule => rule.id.startsWith('WN-INTERLOCK-P03:'))).toHaveLength(4);
    for (const review of original.interlocks!.reviews) {
      const after = snapshot.model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)!;
      expect(after.note).toContain(review.note);
      for (const reference of review.evidence) expect(after.evidence).toContainEqual(reference);
    }
    expect(base).toEqual(original);
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);

  it('enforces the approved local HV sequence and blocks unknown prerequisites on the named pair only', () => {
    const session = new SimulationSession(withOwnerAdditionalInterlocks(priorModel(), 'test-owner-hv-profile'));
    const cb = 'station:sb01:f4:cb'; const es = 'station:sb01:f4:es';
    const before = session.snapshot();
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(es, 'closed').ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeDevice(es, 'open').ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    const unknownEarth = session.saveScenario();
    unknownEarth.devices[cb] = { contact: 'open', racking: 'in' }; unknownEarth.devices[es] = null;
    expect(session.loadScenario(unknownEarth).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' })).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice(cb, { kind: 'racking', value: 'in' })).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice(es, 'open').ok).toBe(true);
    const unknownContact = session.saveScenario(); unknownContact.devices[cb] = { contact: null, racking: 'in' };
    expect(session.loadScenario(unknownContact).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(es, 'closed').ok).toBe(false);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'open' }).ok).toBe(true);
    const separatePair = session.saveScenario();
    separatePair.devices[cb] = { contact: 'open', racking: 'in' }; separatePair.devices[es] = 'closed';
    separatePair.devices['sw421:in:cb'] = { contact: 'open', racking: 'in' }; separatePair.devices['sw421:in:es'] = 'open';
    expect(session.loadScenario(separatePair).ok).toBe(true);
    expect(session.changeDevice(cb, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice('sw421:in:cb', { kind: 'contact', value: 'closed' }).ok).toBe(true);
  }, 30_000);

  it('keeps LV D/Y branches independent while intrinsic guards still block unknown or incompatible axes', () => {
    const session = new SimulationSession(withOwnerAdditionalInterlocks(priorModel(), 'test-owner-lv-profile'));
    const d = 'sw455:in-d:cb'; const y = 'sw455:in-y:cb';
    expect(session.changeDevice(d, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(d, { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice(d, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(y, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.snapshot().devices[y]).toEqual({ contact: 'closed', racking: 'in' });
    expect(session.snapshot().switching[d].conditions).toEqual([]);
    const partial = session.saveScenario(); partial.devices[d] = { contact: 'open', racking: null };
    expect(session.loadScenario(partial).ok).toBe(true);
    expect(session.changeDevice(d, { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeDevice(d, { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice(d, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(d, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.snapshot().devices[y]).toEqual({ contact: 'closed', racking: 'in' });
  }, 20_000);

  it('requires both bus earths known Open for tie Close/Rack in without enabling the earth controls', () => {
    const session = new SimulationSession(withOwnerAdditionalInterlocks(priorModel(), 'test-owner-tie-profile'));
    const tie = 'sw411:bus-tie:cb';
    expect(session.changeDevice(tie, { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeDevice(tie, { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice(tie, { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.changeDevice(tie, { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice(tie, { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice(tie, { kind: 'racking', value: 'out' }).ok).toBe(true);
    for (const value of [null, 'closed'] as const) {
      const blocked = session.saveScenario(); blocked.devices['sw411:bus-a:es'] = value;
      expect(session.loadScenario(blocked).ok).toBe(true);
      expect(session.changeDevice(tie, { kind: 'racking', value: 'in' }).ok).toBe(false);
      expect(session.changeDevice('sw411:bus-a:es', 'open').ok).toBe(false);
      blocked.devices[tie] = { contact: 'open', racking: 'in' };
      expect(session.loadScenario(blocked).ok).toBe(true);
      expect(session.changeDevice(tie, { kind: 'contact', value: 'closed' }).ok).toBe(false);
      expect(session.changeDevice(tie, { kind: 'racking', value: 'out' }).ok).toBe(true);
    }
    const bUnknown = session.saveScenario(); bUnknown.devices['sw411:bus-a:es'] = 'open'; bUnknown.devices['sw411:bus-b:es'] = null;
    expect(session.loadScenario(bUnknown).ok).toBe(true);
    expect(session.changeDevice(tie, { kind: 'racking', value: 'in' }).ok).toBe(false);
  }, 30_000);

  it('preserves the approved profiles and exact decision records in historical scenarios', () => {
    const base = priorModel();
    const model = withOwnerAdditionalInterlocks(base, 'test-owner-profiles-history-1');
    const original = new SimulationSession(model); const saved = original.saveScenario();
    expect(saved.model.evidence!.find(record => record.id === 'WN-INTERLOCK-P01')?.confirmation?.decision).toBe('Apply this matrix to all48 pairs');
    expect(saved.model.evidence!.find(record => record.id === 'WN-INTERLOCK-P04')?.confirmation?.decision).toBe('Use these complete local restrictions');
    expect(saved.model.evidence!.find(record => record.id === 'WN-INTERLOCK-P03')?.confirmation?.decision).toBe('Approve this bus-tie profile');
    const current = withOwnerAdditionalInterlocks(base, 'test-owner-profiles-history-2');
    const session = new SimulationSession(current);
    expect(session.loadScenario(saved).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(saved);
    expect(session.changeDevice('sw455:in-d:cb', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.loadScenario(new SimulationSession(base).saveScenario()).ok).toBe(true);
    expect(session.snapshot().switching['station:sb01:f4:cb'].reviewStatus).toBe('unresolved');
  }, 20_000);

  it('rejects changed branch mappings, duplicate application and preexisting rules before replacing the session', () => {
    const base = priorModel();
    const session = new SimulationSession(base); const before = session.snapshot();
    const mismatched = structuredClone(base);
    mismatched.connections.find(connection => connection.id === 'station:sb01:f4:es:branch')!.from = 'station:sb02:f1:cb:out';
    expect(() => session.loadModel(withOwnerAdditionalInterlocks(mismatched, 'test-invalid-branch'))).toThrow('terminal association changed');
    expect(session.snapshot()).toEqual(before);
    const existing = structuredClone(base);
    existing.interlocks!.rules.push({ id: 'existing-conditional-rule', assetId: 'station:sb01:f4:cb', command: { kind: 'contact', value: 'closed' }, require: { kind: 'source', sourceId: 'boundary:tf11', enabled: true }, explanation: 'Existing declared condition must not be overwritten.', evidence: [{ document: 'Fictional construction guard check', revision: '1', page: 1 }] });
    expect(() => session.loadModel(withOwnerAdditionalInterlocks(existing, 'test-existing-rule'))).toThrow('do not override');
    expect(session.snapshot()).toEqual(before);
    const applied = withOwnerAdditionalInterlocks(base, 'test-already-applied'); const original = structuredClone(applied);
    expect(() => session.loadModel(withOwnerAdditionalInterlocks(applied, 'test-repeated'))).toThrow('already applied');
    expect(applied).toEqual(original);
    expect(session.snapshot()).toEqual(before);
  }, 20_000);
});
