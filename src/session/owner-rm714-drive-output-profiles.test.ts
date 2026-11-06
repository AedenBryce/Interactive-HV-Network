import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerBusEarthLvProfiles } from '../models/site/owner-bus-earth-lv-profiles';
import { withOwnerKeySequenceDeferral } from '../models/site/owner-key-sequence-deferral';
import { withOwnerRm714DriveOutputProfiles } from '../models/site/owner-rm714-drive-output-profiles';

function priorModel() {
  const version = 'test-rm714-drive-prior3';
  const third = withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
  return withOwnerKeySequenceDeferral(withOwnerBusEarthLvProfiles(third, 'test-rm714-drive-bus4'), 'test-rm714-drive-key4');
}

describe('owner-selected RM714 and drive output/DC-earth profiles', () => {
  it('keeps presence separate while enforcing only the complete three RM714 fixed main/earth profiles', () => {
    const session = new SimulationSession(withOwnerRm714DriveOutputProfiles(priorModel(), 'test-rm714-profile5'));
    for (const [main, earth] of [['rm714:in01', 'rm714:in01:es'], ['rm714:in02', 'rm714:in02:es'], ['rm714:tf714:cb', 'rm714:tf714:es']]) {
      expect(session.changeDevice(main, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(earth, 'closed').ok).toBe(false);
      expect(session.changeDevice(main, 'open').ok).toBe(true);
      expect(session.changeDevice(earth, 'closed').ok).toBe(true);
      expect(session.changeDevice(main, 'closed').ok).toBe(false);
      expect(session.changeDevice(earth, 'open').ok).toBe(true);
      expect(session.changeDevice(main, 'closed').ok).toBe(true);
    }
    const unknownEarth = session.saveScenario(); unknownEarth.devices['rm714:in01:es'] = null;
    expect(session.loadScenario(unknownEarth).ok).toBe(true);
    expect(session.changeDevice('rm714:in01', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice('rm714:in01', 'open').ok).toBe(true);
    const unknownMain = session.saveScenario(); unknownMain.devices['rm714:in01'] = null;
    expect(session.loadScenario(unknownMain).ok).toBe(true);
    expect(session.changeDevice('rm714:in01:es', 'closed').ok).toBe(false);
    expect(session.changeDevice('rm714:in01:es', 'open').ok).toBe(true);
    expect(session.changeDevice('rm714:in02', 'open').ok).toBe(true);
    expect(session.changeDevice('rm714:in02:es', 'closed').ok).toBe(true);
  }, 30_000);

  it('selects only the three drive output/DC-earth profiles while keeping converter and discharge behavior unconfirmed', () => {
    const session = new SimulationSession(withOwnerRm714DriveOutputProfiles(priorModel(), 'test-drive-output-profile5'));
    for (const number of ['01', '02', '03']) {
      const output = `sw505:vs505${number}:output-switch`; const earth = `sw505:vs505${number}:dc-earth`;
      expect(session.changeDevice(output, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(earth, 'closed').ok).toBe(false);
      expect(session.changeDevice(output, 'open').ok).toBe(true);
      expect(session.changeDevice(earth, 'closed').ok).toBe(true);
      expect(session.changeDevice(output, 'closed').ok).toBe(false);
      expect(session.changeDevice(earth, 'open').ok).toBe(true);
      expect(session.changeDevice(output, 'closed').ok).toBe(true);
    }
    const unknown = session.saveScenario(); unknown.devices['sw505:vs50501:dc-earth'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('sw505:vs50501:output-switch', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice('sw505:vs50501:output-switch', 'open').ok).toBe(true);
    unknown.devices['sw505:vs50501:output-switch'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('sw505:vs50501:dc-earth', 'closed').ok).toBe(false);
    expect(session.changeDevice('sw505:vs50501:dc-earth', 'open').ok).toBe(true);
    expect(session.changeDevice('sw505:vs50502:output-switch', 'open').ok).toBe(true);
    expect(session.changeDevice('sw505:vs50502:dc-earth', 'closed').ok).toBe(true);
  }, 30_000);

  it('adds exactly twelve reviewed controls and twelve rules without promoting RM714 path or converter claims', () => {
    const base = priorModel(); const original = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerRm714DriveOutputProfiles(base, 'test-rm714-output-inventory5')).snapshot();
    const model = snapshot.model;
    expect(model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(212);
    expect(model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(148);
    expect(model.interlocks!.rules).toHaveLength(326);
    expect(model.interlocks!.rules.slice(0, 314)).toEqual(original.interlocks!.rules);
    const selected = ['rm714:in01', 'rm714:in01:es', 'rm714:in02', 'rm714:in02:es', 'rm714:tf714:cb', 'rm714:tf714:es', 'sw505:vs50501:output-switch', 'sw505:vs50501:dc-earth', 'sw505:vs50502:output-switch', 'sw505:vs50502:dc-earth', 'sw505:vs50503:output-switch', 'sw505:vs50503:dc-earth'];
    const presenceIds = ['rm714:in01:es', 'rm714:in02:es', 'rm714:tf714:es'];
    for (const review of original.interlocks!.reviews) {
      const after = model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)!;
      if (selected.includes(review.assetId)) {
        expect(after.status).toBe('confirmed-rules');
        expect(after.note).toMatch(/^Owner answer(?:57|58) selects/);
        expect(after.note).toContain(review.note);
        for (const reference of review.evidence) expect(after.evidence).toContainEqual(reference);
        expect(snapshot.switching[review.assetId].actions).toBeUndefined();
      } else expect(after).toEqual(review);
    }
    for (const asset of original.assets) {
      const after = model.assets.find(candidate => candidate.id === asset.id)!;
      expect(after.knowledge).toBe(asset.knowledge);
      if (presenceIds.includes(asset.id)) {
        const { label: _newLabel, evidenceIds: _newEvidence, reviewIds: _newReviews, ...fields } = after;
        const { label: _oldLabel, evidenceIds: _oldEvidence, reviewIds: _oldReviews, ...oldFields } = asset;
        expect(fields).toEqual(oldFields);
        expect(after.label).toContain('presence owner-confirmed; path review pending');
        expect(after.evidenceIds).toEqual([...(asset.evidenceIds ?? []), 'WN-RM714-EARTH-PRESENCE']);
        expect(after.reviewIds).toEqual([...(asset.reviewIds ?? []), 'WN-RM714-EARTH-PRESENCE']);
      } else expect(after).toEqual(asset);
    }
    for (const field of ['connections', 'earths', 'sources', 'boundaries', 'presentation', 'starting'] as const) expect(model[field]).toEqual(original[field]);
    expect(snapshot.devices).toEqual(original.starting.devices);
    expect(snapshot.sources).toEqual(original.starting.sources);
    expect(model.evidence!.find(record => record.id === 'WN-RM714-EARTH-PRESENCE')?.confirmation?.decision).toBe('All3 earth switches are installed');
    expect(model.evidence!.find(record => record.id === 'WN-RM714-EARTH-PRESENCE')?.summary).toContain('ONLY presence');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P18')?.confirmation?.decision).toBe('Use this complete profile for all3 pairs');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P09')?.confirmation?.decision).toBe('Use this complete local profile for all3 drives');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P09')?.summary).toContain('stored energy and discharge behavior remain Unconfirmed');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P09')?.references).toContainEqual(expect.objectContaining({ document: '500CB-04220-DR-EL-0042.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1 }));
    expect(base).toEqual(original);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);

  it('rejects changed RM714/drive paths, converter coupling, missing P09 deferral and preexisting rules before replacing the session', () => {
    const base = priorModel(); const session = new SimulationSession(base); const before = session.saveScenario();
    const wrongRm714 = structuredClone(base);
    wrongRm714.connections.find(connection => connection.id === 'rm714:in01:es:branch')!.from = 'rm714:in01:b';
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(wrongRm714, 'test-rm714-wrong-branch'))).toThrow('RM714 main/earth terminal association changed');
    const wrongOutput = structuredClone(base);
    wrongOutput.connections.find(connection => connection.id === 'sw505:vs50501:inverter-output-contact')!.from = 'sw505:vs50501:dc';
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(wrongOutput, 'test-output-wrong-path'))).toThrow('P09 output/DC-earth/converter boundary association changed');
    const wrongDcEarth = structuredClone(base);
    wrongDcEarth.connections.find(connection => connection.id === 'sw505:vs50501:dc-earth:branch')!.from = 'sw505:vs50501:output';
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(wrongDcEarth, 'test-earth-wrong-dc'))).toThrow('P09 output/DC-earth/converter boundary association changed');
    const coupled = structuredClone(base);
    coupled.assets.find(asset => asset.id === 'sw505:vs50501:converter')!.sourcePairs = [['sw505:vs50501:dc', 'sw505:vs50501:output']];
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(coupled, 'test-converter-coupled'))).toThrow('P09 output/DC-earth/converter boundary association changed');
    const missingDeferral = structuredClone(base);
    missingDeferral.evidence = missingDeferral.evidence!.filter(record => record.id !== 'WN-DEFERRED-KEY-DOOR-INCHING');
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(missingDeferral, 'test-output-no-deferral'))).toThrow('bounded P09 inching/key deferral is required');
    const wrongScope = structuredClone(base);
    const deferral = wrongScope.evidence!.find(record => record.id === 'WN-DEFERRED-KEY-DOOR-INCHING')!;
    deferral.references = deferral.references.filter(reference => !reference.clause?.startsWith('P09: exact 6'));
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(wrongScope, 'test-output-wrong-scope'))).toThrow('bounded P09 inching/key deferral is required');
    const existing = structuredClone(base);
    existing.interlocks!.rules.push({ id: 'synthetic-existing-output-rule', assetId: 'sw505:vs50501:output-switch', position: 'closed', require: { kind: 'source', sourceId: 'boundary:tf11', enabled: true }, explanation: 'Synthetic preexisting condition must not be overwritten.', evidence: [{ document: 'Synthetic session guard fixture', revision: '1', page: 1 }] });
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(existing, 'test-output-existing-rule'))).toThrow('existing WN-INTERLOCK-P09 rules/review');
    const applied = withOwnerRm714DriveOutputProfiles(base, 'test-rm714-output-applied5');
    expect(() => session.loadModel(withOwnerRm714DriveOutputProfiles(applied, 'test-rm714-output-repeated6'))).toThrow('already applied');
    expect(session.saveScenario()).toEqual(before);
  }, 20_000);

  it('retains reversible history/reset, exact saved profiles and view-only prior packages', () => {
    const prior = priorModel(); const historical = new SimulationSession(prior).saveScenario();
    const model = withOwnerRm714DriveOutputProfiles(prior, 'test-rm714-output-history5'); const session = new SimulationSession(model);
    const initial = session.saveScenario(); const output = 'sw505:vs50501:output-switch'; const earth = 'sw505:vs50501:dc-earth';
    expect(session.changeDevice(output, 'open').ok).toBe(true);
    expect(session.changeDevice(earth, 'closed').ok).toBe(true);
    expect(session.undo().ok).toBe(true);
    expect(session.saveScenario().devices[earth]).toBe('open');
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(initial);
    expect(session.changeDevice('rm714:in01', 'open').ok).toBe(true);
    const saved = session.saveScenario(); const reopened = new SimulationSession(model);
    expect(reopened.loadScenario(saved).ok).toBe(true);
    expect(reopened.saveScenario()).toEqual(saved);
    expect(reopened.changeDevice('rm714:in01:es', 'closed').ok).toBe(true);
    expect(session.loadScenario(historical).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(historical);
    expect(session.changeDevice(output, 'open').ok).toBe(false);
    expect(session.changeDevice('rm714:in01', 'open').ok).toBe(false);
    expect(session.snapshot().switching['rm714:in01'].reviewStatus).toBe('unresolved');
  }, 20_000);
});
