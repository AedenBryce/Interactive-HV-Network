import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerBusEarthLvProfiles } from '../models/site/owner-bus-earth-lv-profiles';
import { withOwnerRmuThreePositionProfiles } from '../models/site/owner-rmu-three-position-profiles';

function priorModel() {
  const version = 'test-rmu-prior3';
  return withOwnerBusEarthLvProfiles(withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version), 'test-rmu-bus4');
}

describe('owner-selected integrated RMU three-position profiles', () => {
  it('requires own fixed CB Open for outgoing movement and Isolated between Service/Earthed at both source terminal conventions', () => {
    const session = new SimulationSession(withOwnerRmuThreePositionProfiles(priorModel(), 'test-rmu5'));
    for (const [cb, sw] of [['rm406:cb01', 'rm406:sw02'], ['wh:h1:rm417:cb01', 'wh:h1:rm417:sw03']]) {
      expect(session.saveScenario().devices[sw]).toBe('service');
      expect(session.changeDevice(sw, 'isolated').ok).toBe(false);
      expect(session.changeDevice(cb, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(cb, 'open').ok).toBe(true);
      expect(session.changeDevice(sw, 'earthed').ok).toBe(false);
      expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
      expect(session.changeDevice(cb, 'closed').ok).toBe(false);
      expect(session.changeDevice(sw, 'earthed').ok).toBe(true);
      expect(session.changeDevice(sw, 'service').ok).toBe(false);
      expect(session.changeDevice(cb, 'closed').ok).toBe(false);
      expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
      expect(session.changeDevice(sw, 'service').ok).toBe(true);
      expect(session.changeDevice(cb, 'closed').ok).toBe(true);
    }
    const unknown = session.saveScenario(); unknown.devices['rm406:cb01'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('rm406:sw02', 'isolated')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice('rm406:cb01', 'open').ok).toBe(true);
    unknown.devices['rm406:cb01'] = 'open'; unknown.devices['rm406:sw02'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('rm406:cb01', 'closed').ok).toBe(false);
    expect(session.changeDevice('rm406:sw02', 'service').ok).toBe(false);
    expect(session.changeDevice('rm406:sw02', 'earthed').ok).toBe(false);
    expect(session.changeDevice('rm406:sw02', 'isolated').ok).toBe(true);
    expect(session.changeDevice('rm406:sw02', 'service').ok).toBe(true);
    expect(session.changeDevice('rm410:cb01', 'open').ok).toBe(true);
    expect(session.changeDevice('rm410:sw02', 'isolated').ok).toBe(true);
    expect(session.changeDevice('rm410:sw02', 'earthed').ok).toBe(true);
  }, 30_000);

  it('uses the same Isolated transition for all six incoming/ring switches with no CB prerequisite', () => {
    const session = new SimulationSession(withOwnerRmuThreePositionProfiles(priorModel(), 'test-rmu-incoming5'));
    const partial = session.saveScenario(); partial.devices['rm406:cb01'] = null; partial.devices['wh:h1:rm417:cb01'] = null;
    expect(session.loadScenario(partial).ok).toBe(true);
    for (const sw of ['rm406:sw01', 'rm410:sw01', 'wh:h1:rm417:sw01', 'wh:h1:rm417:sw02', 'wh:h9:rm419:sw01', 'wh:h9:rm419:sw02']) {
      expect(session.changeDevice(sw, { kind: 'racking', value: 'out' }).ok).toBe(false);
      expect(session.changeDevice(sw, 'earthed').ok).toBe(false);
      expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
      expect(session.changeDevice(sw, 'earthed').ok).toBe(true);
      expect(session.changeDevice(sw, 'service').ok).toBe(false);
      expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
      expect(session.changeDevice(sw, 'service').ok).toBe(true);
    }
    const unknown = session.saveScenario(); unknown.devices['wh:h9:rm419:sw02'] = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('wh:h9:rm419:sw02', 'service').ok).toBe(false);
    expect(session.changeDevice('wh:h9:rm419:sw02', 'earthed').ok).toBe(false);
    expect(session.changeDevice('wh:h9:rm419:sw02', 'isolated').ok).toBe(true);
    expect(session.changeDevice('wh:h9:rm419:sw02', 'service').ok).toBe(true);
    expect(session.saveScenario().devices['rm406:cb01']).toBeNull();
  }, 30_000);

  it('resolves only the exact26 reviews and52 rules without promoting terminal, earth, hardware or source claims', () => {
    const base = priorModel(); const original = structuredClone(base);
    const snapshot = new SimulationSession(withOwnerRmuThreePositionProfiles(base, 'test-rmu-inventory5')).snapshot();
    const model = snapshot.model;
    expect(model.interlocks!.reviews.filter(review => review.status !== 'unresolved')).toHaveLength(226);
    expect(model.interlocks!.reviews.filter(review => review.status === 'unresolved')).toHaveLength(134);
    expect(model.interlocks!.rules).toHaveLength(366);
    expect(model.interlocks!.rules.slice(0, 314)).toEqual(original.interlocks!.rules);
    const selected = [
      'rm406:cb01', 'rm406:cb02', 'rm406:cb03', 'rm406:sw01', 'rm406:sw02', 'rm406:sw03', 'rm406:sw04',
      'rm410:cb01', 'rm410:cb02', 'rm410:cb03', 'rm410:sw01', 'rm410:sw02', 'rm410:sw03', 'rm410:sw04',
      'wh:h1:rm417:cb01', 'wh:h1:rm417:cb02', 'wh:h1:rm417:sw01', 'wh:h1:rm417:sw02', 'wh:h1:rm417:sw03', 'wh:h1:rm417:sw04',
      'wh:h9:rm419:cb01', 'wh:h9:rm419:cb02', 'wh:h9:rm419:sw01', 'wh:h9:rm419:sw02', 'wh:h9:rm419:sw03', 'wh:h9:rm419:sw04',
    ];
    expect(model.interlocks!.reviews.filter(review => review.note.startsWith('Owner answer55')).map(review => review.assetId).sort()).toEqual([...selected].sort());
    for (const review of original.interlocks!.reviews) {
      const after = model.interlocks!.reviews.find(candidate => candidate.assetId === review.assetId)!;
      if (selected.includes(review.assetId)) {
        expect(after.status).toBe('confirmed-rules');
        expect(after.note).toContain(review.note);
        for (const reference of review.evidence) expect(after.evidence).toContainEqual(reference);
        expect(snapshot.switching[review.assetId].actions).toBeUndefined();
      } else expect(after).toEqual(review);
    }
    for (const field of ['assets', 'connections', 'earths', 'sources', 'boundaries', 'presentation', 'starting'] as const) expect(model[field]).toEqual(original[field]);
    expect(snapshot.devices).toEqual(original.starting.devices);
    expect(snapshot.sources).toEqual(original.starting.sources);
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P13')?.confirmation?.decision).toBe('Approve this complete profile for all26 controls');
    expect(model.evidence!.find(record => record.id === 'WN-INTERLOCK-P13')?.references).toContainEqual(expect.objectContaining({ document: 'CB16OP038A-02006-DR-EL-0044.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1 }));
    expect(base).toEqual(original);
    expect(model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);

  it('rejects stale outgoing associations, changed position/earth conventions, incoming bus mappings and existing rules before replacing a session', () => {
    const base = priorModel(); const session = new SimulationSession(base); const before = session.saveScenario();
    const staleCv = structuredClone(base);
    staleCv.connections.find(connection => connection.id === 'rm406:cb01-sw02')!.from = 'rm406:cb02:b';
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(staleCv, 'test-rmu-wrong-cv'))).toThrow('exact source-evidenced P13 CB/SW association changed');
    const staleWestern = structuredClone(base);
    staleWestern.connections.find(connection => connection.id === 'wh:h9:cb01-sw03')!.to = 'wh:h9:rm419:sw04:line';
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(staleWestern, 'test-rmu-wrong-western'))).toThrow('exact source-evidenced P13 CB/SW association changed');
    const wrongPosition = structuredClone(base);
    wrongPosition.assets.find(asset => asset.id === 'wh:h1:rm417:sw03')!.positions.find(position => position.id === 'earthed')!.pairs = [['wh:h1:rm417:sw03:line', 'wh:h1:rm417:sw03:earth']];
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(wrongPosition, 'test-rmu-wrong-position'))).toThrow('source three-position terminal/earth mapping changed');
    const missingEarth = structuredClone(base);
    missingEarth.earths = missingEarth.earths!.filter(earth => earth.terminal !== 'rm410:sw02:earth');
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(missingEarth, 'test-rmu-missing-earth'))).toThrow('source three-position terminal/earth mapping changed');
    const wrongIncoming = structuredClone(base);
    wrongIncoming.connections.find(connection => connection.id === 'wh:h9:sw02-bus')!.to = 'wh:h1:rm417:bus:bar';
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(wrongIncoming, 'test-rmu-wrong-incoming'))).toThrow('incoming/ring bus association changed');
    const existing = structuredClone(base);
    existing.interlocks!.rules.push({ id: 'synthetic-existing-rmu-rule', assetId: 'rm406:cb01', position: 'closed', require: { kind: 'source', sourceId: 'boundary:tf11', enabled: true }, explanation: 'Synthetic preexisting restriction must not be overwritten.', evidence: [{ document: 'Synthetic session guard fixture', revision: '1', page: 1 }] });
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(existing, 'test-rmu-existing-rule'))).toThrow('existing P13 rules/review');
    const applied = withOwnerRmuThreePositionProfiles(base, 'test-rmu-applied5');
    expect(() => session.loadModel(withOwnerRmuThreePositionProfiles(applied, 'test-rmu-repeated6'))).toThrow('already applied');
    expect(session.saveScenario()).toEqual(before);
  }, 20_000);

  it('keeps transitions reversible through history/reset and retains immutable prior snapshots as view-only', () => {
    const prior = priorModel(); const historical = new SimulationSession(prior).saveScenario();
    const model = withOwnerRmuThreePositionProfiles(prior, 'test-rmu-history5'); const session = new SimulationSession(model);
    const initial = session.saveScenario(); const cb = 'wh:h9:rm419:cb01'; const sw = 'wh:h9:rm419:sw03';
    expect(session.changeDevice(cb, 'open').ok).toBe(true);
    expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
    expect(session.changeDevice(sw, 'earthed').ok).toBe(true);
    expect(session.undo().ok).toBe(true);
    expect(session.saveScenario().devices[sw]).toBe('isolated');
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(initial);
    expect(session.changeDevice(cb, 'open').ok).toBe(true);
    expect(session.changeDevice(sw, 'isolated').ok).toBe(true);
    const saved = session.saveScenario(); const reopened = new SimulationSession(model);
    expect(reopened.loadScenario(saved).ok).toBe(true);
    expect(reopened.saveScenario()).toEqual(saved);
    expect(reopened.changeDevice(sw, 'earthed').ok).toBe(true);
    expect(session.loadScenario(historical).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(historical);
    expect(session.changeDevice(cb, 'open').ok).toBe(false);
    expect(session.changeDevice(sw, 'isolated').ok).toBe(false);
    expect(session.snapshot().switching[sw].reviewStatus).toBe('unresolved');
  }, 20_000);
});
