import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import type { NetworkModel } from './model';
import { singleSupply } from '../models/synthetic';

const historicalModel: NetworkModel = {
  id: 'historical-fixture', version: 'historical-1', name: 'Synthetic original topology', synthetic: true,
  assets: [
    { id: 'old-generation', label: 'Original source', kind: 'source', terminals: ['old-source-out'], conductivePairs: [], positions: [] },
    { id: 'old-breaker', label: 'Original breaker', kind: 'breaker', terminals: ['old-in', 'old-out'], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['old-in', 'old-out']] }] },
    { id: 'old-lv', label: 'Original LV bus', kind: 'bus', terminals: ['old-lv-in'], conductivePairs: [], positions: [] },
  ],
  connections: [{ id: 'old-source-breaker', from: 'old-source-out', to: 'old-in' }, { id: 'old-breaker-bus', from: 'old-out', to: 'old-lv-in' }],
  sources: [{ id: 'old-source', label: 'Original source', assetId: 'old-generation', terminal: 'old-source-out' }],
  starting: { devices: { 'old-breaker': 'closed' }, sources: { 'old-source': true } },
  interlocks: { reviews: [{ assetId: 'old-breaker', status: 'confirmed-none', note: 'Fictional example explicitly defines no interlock.', evidence: [] }], rules: [] },
};

describe('historical scenario viewing', () => {
  it('uses a different original topology for inspection while retaining the current model identity', () => {
    const saved = new SimulationSession(historicalModel).saveScenario();
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    expect(session.loadScenario(saved)).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.mode).toBe('view-only');
    expect(result.model).toEqual(historicalModel);
    expect(result.currentModel).toEqual({ id: singleSupply.id, version: singleSupply.version, name: singleSupply.name });
    expect(result.devices).toEqual({ 'old-breaker': 'closed' });
    expect(result.connectivity['old-lv'].sourceIds).toEqual(['old-source']);
    expect(session.trace('old-lv')).toMatchObject({ ok: true, paths: [{ sourceId: 'old-source', assetIds: ['old-generation', 'old-breaker', 'old-lv'] }] });
    expect(result.history).toEqual([]);
    expect(result.canUndo).toBe(false);
  });

  it('rejects every electrical mutation through the session, including same-state and restoration requests', () => {
    const session = new SimulationSession(singleSupply);
    session.loadScenario(new SimulationSession(historicalModel).saveScenario());
    const before = session.snapshot();
    for (const attempt of [
      () => session.changeDevice('old-breaker', 'open'),
      () => session.changeDevice('old-breaker', 'closed'),
      () => session.changeSource('old-source', false),
      () => session.changeSource('old-source', true),
      () => session.undo(),
      () => session.reset(),
    ]) {
      expect(attempt()).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
      expect(session.snapshot()).toEqual(before);
    }
    expect(before.switching['old-breaker'].positions.every(position => !position.allowed)).toBe(true);
    expect(session.saveScenario().model).toEqual(historicalModel);
    expect(session.trace('old-lv').ok).toBe(true);
  });

  it.each([
    { ...singleSupply, version: 'earlier-version' },
    { ...singleSupply, id: 'different-model-same-version' },
  ])('treats changed model identity or version as historical: $id $version', historical => {
    const session = new SimulationSession(singleSupply);
    const saved = new SimulationSession(historical).saveScenario();
    saved.devices['cb-01'] = 'open';
    expect(session.loadScenario(saved).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(session.snapshot().currentModel.version).toBe(singleSupply.version);
  });

  it('returns to exploration only through a matching current scenario or a valid model load', () => {
    const session = new SimulationSession(singleSupply);
    const currentScenario = session.saveScenario();
    const historical = new SimulationSession(historicalModel).saveScenario();
    session.loadScenario(historical);
    const before = session.snapshot();
    expect(session.loadScenario({ ...historical, devices: {} }).ok).toBe(false);
    expect(session.loadModel({ id: 'broken' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    expect(session.loadScenario(currentScenario).ok).toBe(true);
    expect(session.snapshot().mode).toBe('exploration');
    expect(session.changeDevice('cb-01', 'open').ok).toBe(true);
    session.loadScenario(historical);
    expect(session.loadModel(singleSupply).ok).toBe(true);
    expect(session.snapshot().mode).toBe('exploration');
    expect(session.snapshot().model).toEqual(singleSupply);
    expect(session.snapshot().devices).toEqual(singleSupply.starting.devices);
    expect(session.snapshot().history).toEqual([]);
  });

  it('rejects a changed historical package previously seen under the same identity', () => {
    const session = new SimulationSession(singleSupply);
    const file = new SimulationSession(historicalModel).saveScenario();
    session.loadScenario(file);
    const before = session.snapshot();
    file.model.name = 'Different old package claiming the same version';
    expect(session.loadScenario(file)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.snapshot()).toEqual(before);
  });
});
