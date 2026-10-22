import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { relationshipsFixture } from '../models/relationships-fixture';
import type { NetworkModel } from './model';

function scopedFixture(): NetworkModel {
  const model: NetworkModel = structuredClone(relationshipsFixture);
  model.id = 'synthetic-scoped-source-transfer';
  model.version = 'scoped-fictional-1';
  model.evidence = [
    { id: 'parent-evidence', status: 'provisional', summary: 'Fictional parent metadata and earth behavior remain unconfirmed.', references: [{ document: 'Fictional scoped-transfer contract', revision: '1', page: 1 }] },
    { id: 'forward-evidence', status: 'owner-confirmed', summary: 'Fictional selection of tf-hv to tf-lv-a only; no other asset claim is accepted.', references: [{ document: 'Fictional scoped-transfer contract', revision: '1', page: 1, clause: 'Exact modeled terminals tf-hv → tf-lv-a' }], confirmation: { by: 'Fictional fixture author', date: '2026-10-23', decision: 'Select this forward modeled relationship only.' } },
  ];
  model.reviews = [{ id: 'parent-review', status: 'open', question: 'Confirm the fictional parent metadata and earth behavior.', evidenceIds: ['parent-evidence'] }];
  const transformer = model.assets.find(asset => asset.id === 'tf-01')!;
  transformer.knowledge = 'provisional';
  transformer.evidenceIds = ['parent-evidence'];
  transformer.reviewIds = ['parent-review'];
  transformer.sourcePairs = [];
  transformer.sourceArcs = [{ id: 'forward', from: 'tf-hv', to: 'tf-lv-a', supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: ['forward-evidence'] }];
  return model;
}

describe('relationship-scoped source evidence through the session', () => {
  it.each(['supported', 'owner-confirmed'] as const)('establishes only the %s forward transfer without promoting its provisional parent', knowledge => {
    const model = scopedFixture(); model.assets[2].sourceArcs![0].knowledge = knowledge;
    const before = structuredClone(model);
    const session = new SimulationSession(model); const snapshot = session.snapshot();
    expect(snapshot.connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(snapshot.connectivity['lv-bus-a'].sourceStatus).toBe('connected');
    expect(snapshot.connectivity['lv-bus-b'].sourceIds).toEqual([]);
    expect(snapshot.connectivity['lv-bus-a'].earthIds).toEqual([]);
    expect(snapshot.model.assets.find(asset => asset.id === 'tf-01')?.knowledge).toBe('provisional');
    expect(snapshot.model.reviews!.find(review => review.id === 'parent-review')?.status).toBe('open');
    expect(session.trace('lv-bus-a')).toMatchObject({ ok: true, paths: [expect.objectContaining({ terminals: ['source-a-out', 'ds-in', 'ds-out', 'tf-hv', 'tf-lv-a', 'lv-a'] })] });
    expect(model).toEqual(before);
  });

  it('rejects relationship scope without an explicit claim and nonempty linked evidence before replacing a session', () => {
    const session = new SimulationSession(relationshipsFixture); const before = session.snapshot();
    const candidates = [scopedFixture(), scopedFixture(), scopedFixture()];
    delete candidates[0].assets[2].sourceArcs![0].knowledge;
    delete candidates[1].assets[2].sourceArcs![0].evidenceIds;
    candidates[2].assets[2].sourceArcs![0].evidenceIds = [];
    for (const candidate of candidates) {
      expect(session.loadModel(candidate).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
      expect(session.loadScenario({ formatVersion: 1, modelVersion: candidate.version, model: candidate, devices: candidate.starting.devices, sources: candidate.starting.sources }).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });

  it('preserves parent gating for omitted-scope arcs, including unqualified synthetic arcs', () => {
    const model = scopedFixture();
    delete model.assets[2].sourceArcs![0].supportScope;
    const selectedButParentUnconfirmed = new SimulationSession(model).snapshot();
    expect(selectedButParentUnconfirmed.connectivity['lv-bus-a']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    delete model.assets[2].sourceArcs![0].knowledge;
    delete model.assets[2].sourceArcs![0].evidenceIds;
    const unqualified = new SimulationSession(model).snapshot();
    expect(unqualified.connectivity['lv-bus-a']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    delete model.assets[2].knowledge;
    expect(new SimulationSession(model).snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
  });

  it.each(['provisional', 'unresolved'] as const)('keeps %s reverse transfer conservative and legacy pairs and earth behavior parent-gated', knowledge => {
    const model = scopedFixture();
    model.assets[2].sourcePairs = [['tf-hv', 'tf-lv-b']];
    model.assets[2].earthPairs = [['tf-hv', 'tf-lv-a']];
    model.assets[2].sourceArcs!.push({ id: 'reverse', from: 'tf-lv-a', to: 'tf-hv', supportScope: 'relationship', knowledge, evidenceIds: ['reverse-evidence'], reviewIds: ['reverse-review'] });
    model.evidence!.push({ id: 'reverse-evidence', status: knowledge, summary: 'Fictional reverse transfer remains unconfirmed.', references: [{ document: 'Fictional scoped-transfer contract', revision: '1', page: 2 }] });
    model.reviews!.push({ id: 'reverse-review', status: 'open', question: 'Confirm the fictional reverse transfer.', evidenceIds: ['reverse-evidence'] });
    model.starting.sources = { 'source-a': false, 'source-b': true };
    const session = new SimulationSession(model); const upstream = session.snapshot().connectivity['supply-a'];
    expect(upstream).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-b'] });
    expect(upstream.evidenceIds).toContain('reverse-evidence');
    expect(upstream.reviewIds).toContain('reverse-review');
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-b']);
    expect(session.snapshot().connectivity['lv-bus-b'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['lv-bus-b'].possibleSourceIds).toEqual(['source-b']);
    expect(session.changeSource('source-b', false).ok).toBe(true);
    expect(session.changeDevice('cb-01', 'earthed').ok).toBe(true);
    expect(session.changeSource('source-b', true).ok).toBe(true);
    const earthed = session.snapshot();
    expect(earthed.connectivity['tf-01'].terminalEarths).toEqual({ 'tf-hv': ['device-earth'], 'tf-lv-a': [], 'tf-lv-b': [] });
    expect(earthed.connectivity['lv-bus-a'].earthIds).toEqual([]);
    expect(earthed.connectivity['lv-bus-a'].possibleEarthIds).toEqual(['device-earth']);
    expect(earthed.conflicts).toEqual([]);
    expect(earthed.possibleConflicts).toMatchObject([{ sourceId: 'source-b', earthId: 'device-earth' }]);
    const legacy = structuredClone(model);
    delete legacy.assets[2].sourceArcs![0].supportScope;
    legacy.starting = { devices: earthed.devices, sources: earthed.sources };
    const legacyEarths = new SimulationSession(legacy).snapshot().connectivity;
    for (const asset of model.assets) {
      expect(earthed.connectivity[asset.id].terminalEarths).toEqual(legacyEarths[asset.id].terminalEarths);
      expect(earthed.connectivity[asset.id].possibleEarthIds).toEqual(legacyEarths[asset.id].possibleEarthIds);
    }
  });

  it('preserves opted-in history and rejects same-version rewrites while historical default-scope files keep their old result', () => {
    const original = scopedFixture(); delete original.assets[2].sourceArcs![0].supportScope;
    const session = new SimulationSession(original); const old = session.saveScenario();
    const optIn = scopedFixture();
    expect(session.loadModel(optIn)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.saveScenario()).toEqual(old);
    optIn.version = 'scoped-fictional-2';
    expect(session.loadModel(optIn)).toEqual({ ok: true });
    const baseline = session.saveScenario();
    expect(baseline.formatVersion).toBe(1);
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(session.changeDevice('cb-01', 'isolated')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus-a'].sourceStatus).toBe('disconnected');
    expect(session.snapshot().history).toHaveLength(1);
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(session.changeSource('source-a', false)).toEqual({ ok: true });
    expect(session.reset()).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(baseline);
    const rewritten = structuredClone(baseline); delete rewritten.model.assets[2].sourceArcs![0].supportScope;
    expect(session.loadScenario(rewritten)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.saveScenario()).toEqual(baseline);
    expect(session.loadScenario(JSON.parse(JSON.stringify(old)))).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().connectivity['lv-bus-a']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    expect(session.changeDevice('cb-01', 'isolated').ok).toBe(false);
    expect(session.changeSource('source-a', false).ok).toBe(false);
    expect(session.undo().ok).toBe(false); expect(session.reset().ok).toBe(false);
    expect(session.saveScenario()).toEqual(old);
    expect(old.model.assets[2].sourceArcs![0]).not.toHaveProperty('supportScope');
  });
});
