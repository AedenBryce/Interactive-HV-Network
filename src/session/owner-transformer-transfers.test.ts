import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { ownerConfiguredNetworkModel } from '../models/site/current-network';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';
import { withOwnerAdditionalInterlocks } from '../models/site/owner-additional-interlocks';
import { withOwnerTransformerTransfers } from '../models/site/owner-transformer-transfers';
import type { NetworkModel } from './model';

function priorModel() {
  const version = 'test-transformer-prior-3';
  return withOwnerAdditionalInterlocks(withCurrentConfigurationNotes(ownerConfiguredNetworkModel, version), version);
}

describe('owner-selected forward transformer source transfer', () => {
  it('applies the exact audited roles and modeled input claims without promoting transformer or earth metadata', () => {
    const base = priorModel(); const before = structuredClone(base);
    const model = withOwnerTransformerTransfers(base, 'test-transformer-policy-1');
    const session = new SimulationSession(model); const snapshot = session.snapshot();
    const transformers = snapshot.model.assets.filter(asset => asset.kind === 'transformer');
    const arcs = transformers.flatMap(asset => asset.sourceArcs ?? []);
    expect(transformers).toHaveLength(60);
    expect(arcs).toHaveLength(174);
    expect(arcs.filter(arc => arc.knowledge === 'owner-confirmed')).toHaveLength(85);
    expect(arcs.filter(arc => arc.knowledge === 'unresolved')).toHaveLength(89);
    expect(transformers.every(asset => asset.sourcePairs?.length === 0)).toBe(true);
    expect(transformers.every(asset => asset.knowledge === 'provisional')).toBe(true);
    expect(snapshot.connectivity['station:sb01:f4:transformer'].terminalSources['station:sb01:f4:transformer:output']).toContain('boundary:tf11');
    for (const id of ['boundary:tf11', 'boundary:tf12', 'boundary:tf04']) {
      expect(snapshot.model.sources.find(source => source.id === id)?.knowledge).toBe('owner-confirmed');
      expect(snapshot.model.connections.find(connection => connection.id === `${id}:feeder-input`)?.knowledge).toBe('owner-confirmed');
      expect(snapshot.model.assets.find(asset => asset.id === id)?.knowledge).toBe('provisional');
    }
    expect(snapshot.model.starting).toEqual(before.starting);
    expect(snapshot.model.earths).toEqual(before.earths);
    expect(snapshot.model.boundaries).toEqual(before.boundaries);
    expect(snapshot.model.interlocks).toEqual(before.interlocks);
    expect(snapshot.model.assets.filter(asset => asset.kind !== 'transformer')).toEqual(before.assets.filter(asset => asset.kind !== 'transformer'));
    const modeledInputIds = ['boundary:tf11:feeder-input', 'boundary:tf12:feeder-input', 'boundary:tf04:feeder-input'];
    expect(snapshot.model.connections.filter(connection => !modeledInputIds.includes(connection.id))).toEqual(before.connections.filter(connection => !modeledInputIds.includes(connection.id)));
    expect(base).toEqual(before);
  }, 30_000);

  it('shows an explicitly fictional secondary supply with the primary feed open without making reverse transfer known', () => {
    const model = withOwnerTransformerTransfers(priorModel(), 'test-transformer-secondary-policy');
    const synthetic: NetworkModel = structuredClone(model);
    synthetic.id = 'synthetic-owner-policy-secondary-source'; synthetic.version = 'fictional-secondary-1'; synthetic.synthetic = true;
    synthetic.name = 'Fictional external secondary supply for software verification'; synthetic.presentation = undefined;
    for (const id of Object.keys(synthetic.starting.sources)) synthetic.starting.sources[id] = false;
    synthetic.starting.devices['sw431:tf432:hv-cb'] = { contact: 'open', racking: 'in' };
    synthetic.assets.push({ id: 'fictional:secondary-source', label: 'Fictional secondary supply · not an installed source', kind: 'source', terminals: ['fictional:secondary-source:port'], conductivePairs: [], positions: [] });
    synthetic.sources.push({ id: 'fictional:secondary-source', assetId: 'fictional:secondary-source', label: 'Fictional secondary supply', terminal: 'fictional:secondary-source:port' });
    synthetic.connections.push({ id: 'fictional:secondary-feed', from: 'fictional:secondary-source:port', to: 'sw431:tf432:lv-d' });
    synthetic.starting.sources['fictional:secondary-source'] = true;
    const session = new SimulationSession(synthetic); const result = session.snapshot();
    expect(result.connectivity['sw431:tf432:transformer'].terminalSources).toEqual({
      'sw431:tf432:hv': [], 'sw431:tf432:lv-d': ['fictional:secondary-source'], 'sw431:tf432:lv-y': [],
    });
    expect(result.connectivity['sw431:sw432:d:bus'].sourceIds).toContain('fictional:secondary-source');
    expect(result.connectivity['sw431:sw432:y:bus'].sourceIds).not.toContain('fictional:secondary-source');
    expect(result.connectivity['sw431:sw432:y:bus'].possibleSourceIds).toContain('fictional:secondary-source');
    expect(result.connectivity['sw431:tf432:transformer'].possibleSourceIds).toEqual([]);
    expect(session.trace('sw431:sw432:d:bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional:secondary-source' })] });
    const transformer = result.model.assets.find(asset => asset.id === 'sw431:tf432:transformer')!;
    expect(transformer.sourceArcs!.find(arc => arc.from === 'sw431:tf432:lv-d' && arc.to === 'sw431:tf432:hv')?.knowledge).toBe('unresolved');
    expect(transformer.sourceArcs!.some(arc => arc.from === 'sw431:tf432:lv-d' && arc.to === 'sw431:tf432:lv-y')).toBe(false);
  }, 30_000);

  it('retains the exact earth results and source-specific open reviews while recording scoped policy evidence', () => {
    const base = priorModel();
    const before = new SimulationSession(base).snapshot();
    const after = new SimulationSession(withOwnerTransformerTransfers(base, 'test-transformer-earth-policy')).snapshot();
    for (const asset of base.assets) {
      expect(after.connectivity[asset.id].terminalEarths).toEqual(before.connectivity[asset.id].terminalEarths);
      expect(after.connectivity[asset.id].earthIds).toEqual(before.connectivity[asset.id].earthIds);
      expect(after.connectivity[asset.id].possibleEarthIds).toEqual(before.connectivity[asset.id].possibleEarthIds);
      expect(after.connectivity[asset.id].earthRouteEdgeIds).toEqual(before.connectivity[asset.id].earthRouteEdgeIds);
      expect(after.connectivity[asset.id].earthBoundaryIds).toEqual(before.connectivity[asset.id].earthBoundaryIds);
    }
    for (const review of base.reviews!) expect(after.model.reviews).toContainEqual(review);
    const policy = after.model.evidence!.find(record => record.id === 'WN-TRANSFORMER-FORWARD-POLICY')!;
    expect(policy.confirmation!.decision).toContain('if the primary winding is energisd, the secondary will also be energised.');
    expect(policy.confirmation!.decision).toContain('if there is a ring supply that energises the secondary');
    expect(policy.summary).toContain('Reverse transfer onto primary is Unconfirmed');
    const inputs = after.model.evidence!.find(record => record.id === 'WN-ABSTRACT-INPUT-MODEL-SELECTION')!;
    expect(inputs.summary).toContain('no physical generator');
    expect(inputs.confirmation!.decision).toContain('all three supplies available');
    expect(inputs.references.some(reference => reference.clause?.includes('Separate 22 October battery-limit answer: At its SB01/SB02 feeder breaker'))).toBe(true);
    const roles = after.model.evidence!.find(record => record.id === 'WN-TRANSFORMER-FORWARD-POLICY:roles:sw431:tf432:transformer')!;
    expect(roles.references).toContainEqual(expect.objectContaining({ document: '11098-07110-EL-DR-2455.pdf', page: 1 }));
    expect(after.model.reviews!.find(review => review.id === 'BATTERY-STATION-UNKNOWNS')?.status).toBe('open');
    for (const tf of ['rm420:tf420a', 'rm420:tf420b']) {
      const asset = after.model.assets.find(asset => asset.id === tf)!;
      expect(asset.sourceArcs!.find(arc => arc.from === `${tf}:primary33` && arc.to === `${tf}:secondary`)?.knowledge).toBe('owner-confirmed');
      expect(asset.sourceArcs!.find(arc => arc.from === `${tf}:primary22` && arc.to === `${tf}:secondary`)?.knowledge).toBe('unresolved');
      expect(asset.sourceArcs!.some(arc => arc.from === `${tf}:primary33` && arc.to === `${tf}:primary22`)).toBe(false);
    }
  }, 30_000);

  it('retains old bidirectional packages and new scoped arcs in immutable historical scenarios', () => {
    const base = priorModel(); const old = new SimulationSession(base).saveScenario();
    const model = withOwnerTransformerTransfers(base, 'test-transformer-history-policy');
    const session = new SimulationSession(model); const saved = session.saveScenario();
    expect(saved.model.assets.find(asset => asset.id === 'sw431:tf432:transformer')?.sourceArcs).toHaveLength(4);
    expect(old.model.assets.find(asset => asset.id === 'sw431:tf432:transformer')?.sourcePairs).toEqual([
      ['sw431:tf432:hv', 'sw431:tf432:lv-d'], ['sw431:tf432:hv', 'sw431:tf432:lv-y'],
    ]);
    expect(session.loadScenario(old)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.changeSource('boundary:tf11', false).ok).toBe(false);
    expect(session.changeDevice('station:sb01:f4:cb', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.saveScenario()).toEqual(old);
    expect(session.loadScenario(saved)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('exploration');
    const rewritten = structuredClone(saved);
    rewritten.model.assets.find(asset => asset.id === 'rm420:tf420a')!.sourceArcs!.find(arc => arc.from === 'rm420:tf420a:primary22')!.knowledge = 'owner-confirmed';
    expect(session.loadScenario(rewritten)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.saveScenario()).toEqual(saved);
  }, 30_000);

  it('rejects stale role/pair, selected-primary and input mappings before replacing an active session', () => {
    const base = priorModel(); const original = structuredClone(base);
    const session = new SimulationSession(base); const before = session.snapshot();
    const changedPair = structuredClone(base);
    changedPair.assets.find(asset => asset.id === 'sw431:tf432:transformer')!.sourcePairs![0].reverse();
    const wrongHopper = structuredClone(base);
    wrongHopper.connections.find(connection => connection.id === 'whole:primary33:tf420a')!.to = 'rm420:tf420a:primary22';
    const wrongInput = structuredClone(base);
    wrongInput.connections.find(connection => connection.id === 'boundary:tf11:feeder-input')!.to = 'station:sb02:f1:cb:in';
    const unavailable = structuredClone(base); unavailable.starting.sources['boundary:tf11'] = false;
    const missingRoleEvidence = structuredClone(base); missingRoleEvidence.assets.find(asset => asset.id === 'sw431:tf432:transformer')!.evidenceIds = [];
    for (const candidate of [changedPair, wrongHopper, wrongInput, unavailable, missingRoleEvidence]) {
      expect(() => session.loadModel(withOwnerTransformerTransfers(candidate, 'test-transformer-stale'))).toThrow('Review required');
      expect(session.snapshot()).toEqual(before);
    }
    const applied = withOwnerTransformerTransfers(base, 'test-transformer-already-applied');
    expect(() => session.loadModel(withOwnerTransformerTransfers(applied, 'test-transformer-repeat'))).toThrow('already applied');
    expect(base).toEqual(original);
    expect(session.snapshot()).toEqual(before);
  }, 30_000);
});
