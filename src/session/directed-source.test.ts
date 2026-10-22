import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { relationshipsFixture } from '../models/relationships-fixture';
import type { NetworkModel } from './model';
import { removableBreakerModel } from '../models/removable-breaker';

function directedFixture(): NetworkModel {
  const model: NetworkModel = structuredClone(relationshipsFixture);
  model.id = 'synthetic-directed-transfer';
  model.version = 'directed-fictional-1';
  const transformer = model.assets.find(asset => asset.id === 'tf-01')!;
  transformer.sourcePairs = [];
  transformer.sourceArcs = [{ id: 'primary-to-a', from: 'tf-hv', to: 'tf-lv-a' }];
  return model;
}

function routesFixture(): NetworkModel {
  return {
    id: 'synthetic-directed-routes', version: 'directed-routes-fictional-1', name: 'Fictional directed route alternatives', synthetic: true,
    assets: [
      { id: 'supply', label: 'Fictional source', kind: 'source', terminals: ['s'], conductivePairs: [], positions: [] },
      { id: 'network', label: 'Fictional explicit transfers', kind: 'interface', terminals: ['a', 'b', 'c', 'x'], conductivePairs: [], sourceArcs: [
        { id: 'ab', from: 'a', to: 'b' }, { id: 'ac', from: 'a', to: 'c' },
        { id: 'bx', from: 'b', to: 'x' }, { id: 'xa', from: 'x', to: 'a', knowledge: 'unresolved', evidenceIds: ['cycle-evidence'], reviewIds: ['cycle-review'] },
      ], positions: [] },
      { id: 'alternate', label: 'Fictional alternate route switch', kind: 'breaker', terminals: ['alt-in', 'alt-out'], conductivePairs: [], positions: [
        { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['alt-in', 'alt-out']] },
      ] },
      { id: 'load', label: 'Fictional downstream endpoint', kind: 'bus', terminals: ['d'], conductivePairs: [], positions: [] },
    ],
    connections: [
      { id: 'source-a', from: 's', to: 'a' }, { id: 'b-load', from: 'b', to: 'd' },
      { id: 'c-alternate', from: 'c', to: 'alt-in' }, { id: 'alternate-load', from: 'alt-out', to: 'd' },
    ],
    sources: [{ id: 'source', assetId: 'supply', terminal: 's', label: 'Fictional enabled source' }],
    evidence: [{ id: 'cycle-evidence', status: 'unresolved', summary: 'Fictional dangling return arc.', references: [] }],
    reviews: [{ id: 'cycle-review', status: 'open', question: 'Review fictional return arc.', evidenceIds: ['cycle-evidence'] }],
    interlocks: { reviews: [{ assetId: 'alternate', status: 'confirmed-none', note: 'Fictional switch without additional restrictions.', evidence: [] }], rules: [] },
    starting: { devices: { alternate: 'closed' }, sources: { source: true } },
  };
}

describe('declared directed source transfer', () => {
  it('transfers primary supply forward without manufacturing reverse or third-winding paths', () => {
    const session = new SimulationSession(directedFixture());
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(session.snapshot().connectivity['lv-bus-b'].sourceIds).toEqual([]);
    expect(session.changeSource('source-a', false)).toEqual({ ok: true });
    expect(session.changeSource('source-b', true)).toEqual({ ok: true });
    expect(session.snapshot().connectivity['tf-01'].terminalSources).toEqual({ 'tf-hv': [], 'tf-lv-a': ['source-b'], 'tf-lv-b': [] });
    expect(session.snapshot().connectivity['supply-a'].sourceIds).toEqual([]);
    expect(session.changeDevice('cb-01', 'isolated')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-b']);
    expect(session.trace('lv-bus-a')).toMatchObject({ ok: true, paths: [{ sourceId: 'source-b', terminals: ['source-b-out', 'lv-a'] }] });
  });

  it('keeps an explicitly unresolved reverse transfer possible with its own review evidence', () => {
    const model = directedFixture();
    model.evidence = [{ id: 'reverse-evidence', status: 'unresolved', summary: 'Fictional reverse relationship awaiting review.', references: [] }];
    model.reviews = [{ id: 'reverse-review', status: 'open', question: 'Is reverse transfer represented?', evidenceIds: ['reverse-evidence'] }];
    model.assets[2].sourceArcs!.push({ id: 'a-to-primary', from: 'tf-lv-a', to: 'tf-hv', knowledge: 'unresolved', evidenceIds: ['reverse-evidence'], reviewIds: ['reverse-review'] });
    model.starting.sources = { 'source-a': false, 'source-b': true };
    const session = new SimulationSession(model);
    const upstream = session.snapshot().connectivity['supply-a'];
    expect(upstream.sourceIds).toEqual([]);
    expect(upstream.possibleSourceIds).toEqual(['source-b']);
    expect(upstream.sourceStatus).toBe('unconfirmed');
    expect(upstream.evidenceIds).toContain('reverse-evidence');
    expect(upstream.reviewIds).toContain('reverse-review');
    expect(session.snapshot().connectivity['lv-bus-b'].possibleSourceIds).toEqual([]);
    session.changeSource('source-b', false);
    session.changeDevice('cb-01', 'earthed');
    session.changeSource('source-b', true);
    const earthed = session.snapshot();
    expect(earthed.connectivity['tf-01'].terminalEarths).toEqual({ 'tf-hv': ['device-earth'], 'tf-lv-a': [], 'tf-lv-b': [] });
    expect(earthed.conflicts).toEqual([]);
    expect(earthed.possibleConflicts).toMatchObject([{ sourceId: 'source-b', earthId: 'device-earth' }]);
    expect(earthed.connectivity['lv-bus-a'].earthIds).toEqual([]);
  });

  it('does not connect two secondary windings through two forward-only primary arcs', () => {
    const model = directedFixture();
    model.assets[2].sourceArcs!.push({ id: 'primary-to-b', from: 'tf-hv', to: 'tf-lv-b' });
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus-b'].sourceIds).toEqual(['source-a']);
    session.changeSource('source-a', false); session.changeSource('source-b', true);
    expect(session.snapshot().connectivity['tf-01'].terminalSources).toEqual({ 'tf-hv': [], 'tf-lv-a': ['source-b'], 'tf-lv-b': [] });
    expect(session.snapshot().connectivity['lv-bus-b'].sourceStatus).toBe('disconnected');
  });

  it('finds a forward source-to-earth conflict without transferring earth through the arc or through a sink', () => {
    const model = directedFixture();
    model.earths = [{ id: 'secondary-earth', label: 'Fictional secondary phase earth termination', terminal: 'lv-a' }];
    const snapshot = new SimulationSession(model).snapshot();
    expect(snapshot.conflicts).toEqual([{
      sourceId: 'source-a', earthId: 'secondary-earth',
      terminalPath: ['source-a-out', 'ds-in', 'ds-out', 'tf-hv', 'tf-lv-a', 'lv-a'],
      connectionIds: ['source-device', 'device-hv', 'winding-a-bus'],
    }]);
    expect(snapshot.connectivity['tf-01'].terminalEarths).toEqual({ 'tf-hv': [], 'tf-lv-a': ['secondary-earth'], 'tf-lv-b': [] });
    expect(snapshot.connectivity['supply-a'].earthIds).toEqual([]);
    expect(snapshot.connectivity['supply-b'].sourceIds).toEqual([]);
  });

  it('retains exact directed alternate routes without counting a dangling return cycle', () => {
    const session = new SimulationSession(routesFixture());
    const before = session.snapshot().connectivity.load;
    expect(before.sourceIds).toEqual(['source']);
    expect(before.routeEdgeIds).toContain('connection:c-alternate');
    expect(before.routeEdgeIds).toContain('source-arc:["network","ab","a","b"]');
    expect(before.routeEdgeIds).not.toContain('source-arc:["network","bx","b","x"]');
    expect(before.hasSourceUncertainty).toBe(false);
    expect(before.evidenceIds).not.toContain('cycle-evidence');
    expect(before.reviewIds).not.toContain('cycle-review');
    expect(session.changeDevice('alternate', 'open')).toEqual({ ok: true });
    const after = session.snapshot();
    expect(after.connectivity.load.sourceIds).toEqual(['source']);
    expect(after.connectivity.load.routeEdgeIds).toEqual(['connection:b-load', 'connection:source-a', 'source-arc:["network","ab","a","b"]']);
    expect(after.impact).toContainEqual(expect.objectContaining({ assetId: 'load', connectivityChanged: false, routesChanged: true }));
    expect(after.connectivity.load.hasSourceUncertainty).toBe(false);
  });

  it('propagates unconfirmed source coverage in the declared direction without crossing earth channels', () => {
    const model = directedFixture();
    model.starting.sources = { 'source-a': false, 'source-b': false };
    model.boundaries = [{ id: 'secondary-boundary', label: 'Fictional secondary coverage', terminal: 'tf-lv-a', sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' }];
    const secondary = new SimulationSession(model).snapshot();
    expect(secondary.connectivity['supply-a']).toMatchObject({ sourceStatus: 'disconnected', sourceBoundaryIds: [], earthBoundaryIds: [] });
    expect(secondary.connectivity['lv-bus-a']).toMatchObject({ sourceStatus: 'unconfirmed', sourceBoundaryIds: ['secondary-boundary'], earthBoundaryIds: ['secondary-boundary'] });
    model.version = 'directed-primary-boundary-1';
    model.boundaries[0].terminal = 'tf-hv';
    const primary = new SimulationSession(model).snapshot();
    expect(primary.connectivity['lv-bus-a']).toMatchObject({ sourceStatus: 'unconfirmed', sourceBoundaryIds: ['secondary-boundary'], earthStatus: 'disconnected', earthBoundaryIds: [] });
  });

  it('rejects invalid arc identities, terminals, claims and switch-dependent placement atomically', () => {
    const session = new SimulationSession(relationshipsFixture);
    const before = session.snapshot();
    const invalid: NetworkModel[] = [];
    const duplicate = directedFixture();
    duplicate.assets[2].sourceArcs!.push({ id: 'primary-to-a', from: 'tf-lv-a', to: 'tf-hv' }); invalid.push(duplicate);
    const crossAssetDuplicate = directedFixture();
    crossAssetDuplicate.assets[1].positions = [];
    delete crossAssetDuplicate.starting.devices['cb-01'];
    crossAssetDuplicate.assets[1].sourceArcs = [{ id: 'primary-to-a', from: 'ds-in', to: 'ds-out' }]; invalid.push(crossAssetDuplicate);
    const external = directedFixture();
    external.assets[2].sourceArcs![0].to = 'lv-a'; invalid.push(external);
    const self = directedFixture();
    self.assets[2].sourceArcs![0].to = 'tf-hv'; invalid.push(self);
    const switched = directedFixture();
    switched.assets[1].sourceArcs = [{ id: 'bypass', from: 'ds-in', to: 'ds-out' }]; invalid.push(switched);
    const missingEvidence = directedFixture();
    missingEvidence.assets[2].sourceArcs![0].evidenceIds = ['absent']; invalid.push(missingEvidence);
    const missingReview = directedFixture();
    missingReview.assets[2].sourceArcs![0].reviewIds = ['absent']; invalid.push(missingReview);
    const unsupported = directedFixture();
    unsupported.assets[2].sourceArcs![0].knowledge = 'supported'; invalid.push(unsupported);
    const ownerWithoutRecord = directedFixture();
    ownerWithoutRecord.assets[2].sourceArcs![0].knowledge = 'owner-confirmed'; invalid.push(ownerWithoutRecord);
    const removable: NetworkModel = structuredClone(removableBreakerModel);
    const breaker = removable.assets.find(asset => asset.removableBreaker)!;
    breaker.sourceArcs = [{ id: 'mechanism-bypass', from: breaker.terminals[0], to: breaker.terminals[1] }]; invalid.push(removable);
    for (const candidate of invalid) {
      expect(session.loadModel(candidate).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });

  it('retains every route in a layered directed acyclic network', () => {
    const layers = Array.from({ length: 16 }, (_, index) => [`a${index}`, `b${index}`]);
    const arcs = [
      { id: 'entry-a', from: 'entry', to: 'a0' }, { id: 'entry-b', from: 'entry', to: 'b0' },
      ...layers.slice(0, -1).flatMap((layer, index) => layer.flatMap(from => layers[index + 1].map(to => ({ id: `${from}-${to}`, from, to })))),
      { id: 'a-exit', from: 'a15', to: 'exit' }, { id: 'b-exit', from: 'b15', to: 'exit' },
    ];
    const model: NetworkModel = {
      id: 'synthetic-directed-dag', version: 'fictional-dag-1', name: 'Fictional sixteen-layer alternatives', synthetic: true,
      assets: [
        { id: 'supply', label: 'Fictional supply', kind: 'source', terminals: ['s'], conductivePairs: [], positions: [] },
        { id: 'dag', label: 'Fictional layered paths', kind: 'interface', terminals: ['entry', ...layers.flat(), 'exit'], conductivePairs: [], sourceArcs: arcs, positions: [] },
        { id: 'load', label: 'Fictional endpoint', kind: 'bus', terminals: ['t'], conductivePairs: [], positions: [] },
      ],
      connections: [{ id: 'input', from: 's', to: 'entry' }, { id: 'output', from: 'exit', to: 't' }],
      sources: [{ id: 'source', assetId: 'supply', terminal: 's', label: 'Fictional source' }],
      starting: { devices: {}, sources: { source: true } },
    };
    const result = new SimulationSession(model).snapshot().connectivity.load;
    // Two entry arcs, sixty layer arcs, two exit arcs and two cables.
    expect(result.routeEdgeIds).toHaveLength(66);
    expect(result.sourceIds).toEqual(['source']);
    expect(result.hasSourceUncertainty).toBe(false);
  });

  it('keeps arc edge identities directional when a different package explicitly reverses the relationship', () => {
    const forward = new SimulationSession(directedFixture()).snapshot();
    expect(forward.connectivity['lv-bus-a'].routeEdgeIds).toContain('source-arc:["tf-01","primary-to-a","tf-hv","tf-lv-a"]');
    const reverse = directedFixture();
    reverse.version = 'fictional-explicit-reverse-1';
    reverse.assets[2].sourceArcs = [{ id: 'primary-to-a', from: 'tf-lv-a', to: 'tf-hv' }];
    reverse.starting.sources = { 'source-a': false, 'source-b': true };
    const snapshot = new SimulationSession(reverse).snapshot();
    expect(snapshot.connectivity['supply-a'].routeEdgeIds).toContain('source-arc:["tf-01","primary-to-a","tf-lv-a","tf-hv"]');
    expect(snapshot.connectivity['supply-a'].routeEdgeIds).not.toContain('source-arc:["tf-01","primary-to-a","tf-hv","tf-lv-a"]');
  });

  it('preserves directed packages in self-contained historical scenarios and keeps legacy pairs bidirectional', () => {
    const model = directedFixture();
    const original = structuredClone(model);
    const session = new SimulationSession(model);
    session.changeSource('source-a', false); session.changeSource('source-b', true);
    const saved = session.saveScenario();
    expect(saved.formatVersion).toBe(1);
    expect(saved.model).toEqual(original);
    expect(model).toEqual(original);
    const next = directedFixture(); next.version = 'directed-fictional-2';
    expect(session.loadModel(next)).toEqual({ ok: true });
    expect(session.loadScenario(saved)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().connectivity['tf-01'].terminalSources['tf-hv']).toEqual([]);
    expect(session.changeSource('source-a', true).ok).toBe(false);
    expect(session.changeDevice('cb-01', 'service').ok).toBe(false);
    expect(session.saveScenario()).toEqual(saved);
    const rewritten = structuredClone(saved);
    rewritten.model.assets[2].sourceArcs![0] = { id: 'primary-to-a', from: 'tf-lv-a', to: 'tf-hv' };
    expect(session.loadScenario(rewritten)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.saveScenario()).toEqual(saved);
    const legacy = new SimulationSession(relationshipsFixture);
    legacy.changeSource('source-a', false); legacy.changeSource('source-b', true);
    expect(legacy.snapshot().connectivity['tf-01'].terminalSources['tf-hv']).toEqual(['source-b']);
    expect(legacy.saveScenario().model).toEqual(relationshipsFixture);
  });
});
