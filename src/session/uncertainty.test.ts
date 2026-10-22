import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { uncertaintyFixture } from '../models/uncertainty-fixture';
import { singleSupply } from '../models/synthetic';
import { earthFixture } from '../models/earth-fixture';
import type { NetworkModel } from './model';

describe('material uncertainty in a provisional model', () => {
  it('keeps an unconfirmed route distinct from disconnection and retains a known supply path', () => {
    const session = new SimulationSession(uncertaintyFixture);
    const result = session.snapshot();
    expect(result.connectivity['candidate-bus']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    expect(result.connectionResults['candidate-feed'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['lv-bus']).toMatchObject({ sourceStatus: 'connected', sourceIds: ['source-a'] });
    const trace = session.trace('lv-bus');
    expect(trace.ok).toBe(true);
    if (trace.ok) expect(trace.paths[0].assetIds).toEqual(['supply-a', 'cb-01', 'tf-01', 'lv-bus']);
    expect(result.model.evidence?.[0].status).toBe('provisional');
    expect(result.model.reviews?.[0].status).toBe('open');
  });

  it('does not turn unknown source availability into an unavailable source', () => {
    const model: NetworkModel = structuredClone(singleSupply);
    model.starting.sources['source-a'] = null;
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    session.changeSource('source-a', false);
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('disconnected');
    session.changeSource('source-a', true);
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('connected');
  });

  it('keeps an unknown device position material until a scenario position is selected', () => {
    const model: NetworkModel = structuredClone(singleSupply);
    model.starting.devices['cb-01'] = null;
    const session = new SimulationSession(model);
    expect(session.snapshot().devices['cb-01']).toBeNull();
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], possibleSourceIds: ['source-a'] });
    session.changeDevice('cb-01', 'closed');
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('connected');
    session.changeDevice('cb-01', 'open');
    expect(session.snapshot().connectivity['lv-bus'].sourceStatus).toBe('disconnected');
  });

  it('evaluates an uncertain earth connection separately from a known supply', () => {
    const model: NetworkModel = structuredClone(earthFixture);
    model.earths![0].knowledge = 'provisional';
    model.starting.devices['es-01'] = 'closed';
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'connected', sourceIds: ['source-a'], earthStatus: 'unconfirmed', earthIds: [], possibleEarthIds: ['earth-a'] });
    expect(session.snapshot().conflicts).toEqual([]);
    expect(session.snapshot().possibleConflicts).toContainEqual(expect.objectContaining({ sourceId: 'source-a', earthId: 'earth-a' }));
  });

  it('keeps missing off-page coverage unconfirmed even when no supplied source is reachable', () => {
    const model = {
      ...structuredClone(singleSupply),
      boundaries: [{ id: 'off-page', label: 'Unconfirmed external continuation', terminal: 'lv', sourceCoverage: 'unconfirmed', earthCoverage: 'complete', knowledge: 'unresolved' }],
    };
    model.starting.devices['cb-01'] = 'open';
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'unconfirmed', sourceIds: [], sourceBoundaryIds: ['off-page'], earthStatus: 'disconnected' });
    expect(session.snapshot().connectivity['supply-a']).toMatchObject({ sourceStatus: 'connected', sourceBoundaryIds: [] });
  });

  it('does not promote provisional evidence or an open review into a supported or confirmed fact', () => {
    const session = new SimulationSession(uncertaintyFixture);
    const before = session.snapshot();
    const unsupported = structuredClone(uncertaintyFixture);
    unsupported.connections.find(connection => connection.id === 'candidate-feed')!.knowledge = 'supported';
    expect(session.loadModel(unsupported)).toMatchObject({ ok: false, error: expect.stringContaining('supporting evidence') });
    const unconfirmed = structuredClone(uncertaintyFixture);
    unconfirmed.evidence![0].status = 'owner-confirmed';
    expect(session.loadModel(unconfirmed).ok).toBe(false);
    const unresolved = structuredClone(uncertaintyFixture);
    unresolved.reviews![0].status = 'resolved';
    expect(session.loadModel(unresolved).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });

  it('retains a known supply when an additional source has unknown availability', () => {
    const model = structuredClone(uncertaintyFixture);
    model.connections.find(connection => connection.id === 'unknown-source-feed')!.to = 'lv';
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'connected', sourceIds: ['source-a'], possibleSourceIds: ['source-b'], hasSourceUncertainty: true });
    expect(session.trace('lv-bus')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'source-a' })] });
  });

  it('keeps invariant connections known when an unknown position cannot change that relationship', () => {
    const model = structuredClone(singleSupply);
    const breaker = model.assets.find(asset => asset.id === 'cb-01')!;
    breaker.positions[0].pairs = [['cb-in', 'cb-out']];
    model.starting.devices['cb-01'] = null;
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity['lv-bus']).toMatchObject({ sourceStatus: 'connected', sourceIds: ['source-a'], hasSourceUncertainty: false });
  });
});
