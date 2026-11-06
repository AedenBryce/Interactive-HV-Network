import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { singleSupply } from '../models/synthetic';

describe('switching a synthetic source-to-LV-bus network', () => {
  it('opens and closes the breaker and updates its downstream source connection', () => {
    const session = new SimulationSession(singleSupply);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);

    expect(session.changeDevice('cb-01', 'open').ok).toBe(true);
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(session.snapshot().connectivity['tf-01'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity['supply-a'].sourceIds).toEqual(['source-a']);

    expect(session.changeDevice('cb-01', 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
  });

  it('rejects invalid models and unsupported actions without replacing a valid session', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    const missingTerminal = structuredClone(singleSupply);
    missingTerminal.connections[0].to = 'missing';
    expect(session.loadModel(missingTerminal)).toMatchObject({ ok: false, error: expect.stringContaining('missing') });
    expect(session.loadModel({ id: 'broken' }).ok).toBe(false);
    expect(session.changeDevice('cb-01', 'racked-out').ok).toBe(false);
    expect(session.changeDevice('missing', 'open').ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });

  it.each([
    ['repeated assets', (model: typeof singleSupply) => { model.assets.push(structuredClone(model.assets[0])); }],
    ['repeated terminals', (model: typeof singleSupply) => { model.assets[3].terminals.push('source-out'); }],
    ['external transformer relationship', (model: typeof singleSupply) => { model.assets[2].conductivePairs.push(['tf-hv', 'lv']); }],
    ['missing source availability', (model: typeof singleSupply) => { delete model.starting.sources['source-a']; }],
    ['unsupported starting position', (model: typeof singleSupply) => { model.starting.devices['cb-01'] = 'missing'; }],
    ['unknown starting device', (model: typeof singleSupply) => { model.starting.devices.missing = 'open'; }],
    ['unknown starting source', (model: typeof singleSupply) => { model.starting.sources.missing = false; }],
    ['wrong source attachment', (model: typeof singleSupply) => { model.sources[0].terminal = 'lv'; }],
  ])('reports %s without changing the current scenario', (_name, corrupt) => {
    const session = new SimulationSession(singleSupply);
    const before = session.snapshot();
    const invalid = structuredClone(singleSupply);
    corrupt(invalid);
    expect(session.loadModel(invalid).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });

  it('does not expose session state through model inputs or returned snapshots', () => {
    const input = structuredClone(singleSupply);
    const session = new SimulationSession(input);
    input.connections.length = 0;
    const snapshot = session.snapshot();
    snapshot.devices['cb-01'] = 'open';
    snapshot.connectivity['lv-bus'].sourceIds.length = 0;
    snapshot.model.connections.length = 0;
    expect(session.snapshot().devices['cb-01']).toBe('closed');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(session.snapshot().model.connections).toHaveLength(3);
  });
});
