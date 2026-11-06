import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { singleSupply } from '../models/synthetic';
import { uncertaintyFixture } from '../models/uncertainty-fixture';
import { relationshipsFixture } from '../models/relationships-fixture';
import { fallbackPresentation } from './presentation';
import type { ScenarioFile } from './scenario';

describe('self-contained scenario files', () => {
  it('round-trips the original model and selected device/source states through JSON', () => {
    const original = new SimulationSession(singleSupply);
    original.changeDevice('cb-01', 'open');
    original.changeSource('source-a', false);
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    expect(file).toMatchObject({ formatVersion: 1, modelVersion: singleSupply.version, model: singleSupply, devices: { 'cb-01': 'open' }, sources: { 'source-a': false } });
    const reopened = new SimulationSession(singleSupply);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    const result = reopened.snapshot();
    expect(result.mode).toBe('exploration');
    expect(result.devices).toEqual(original.snapshot().devices);
    expect(result.sources).toEqual(original.snapshot().sources);
    expect(result.connectivity).toEqual(original.snapshot().connectivity);
    expect(result.history).toEqual([]);
    expect(result.impact).toEqual([]);
    expect(reopened.changeDevice('cb-01', 'closed').ok).toBe(true);
  });

  it('rejects changed model content under a known immutable identity and version atomically', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    const changed = session.saveScenario();
    changed.model.name = 'Changed package using the original version';
    expect(session.loadScenario(changed)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.snapshot()).toEqual(before);
    expect(session.loadModel(changed.model)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.snapshot()).toEqual(before);
    const changedBaseline = session.saveScenario();
    changedBaseline.model.starting.devices['cb-01'] = 'open';
    expect(session.loadScenario(changedBaseline).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    const reordered = session.saveScenario();
    expect(session.loadScenario({ ...reordered, model: Object.fromEntries(Object.entries(reordered.model).reverse()) })).toEqual({ ok: true });
    expect(session.snapshot().devices['cb-01']).toBe('open');
  });

  it.each([uncertaintyFixture, relationshipsFixture])('preserves evidence, uncertainty and explicit equipment positions for $name', fixture => {
    const model = { ...structuredClone(fixture), presentation: fallbackPresentation(fixture) };
    const original = new SimulationSession(model);
    original.changeSource('source-a', false);
    const file = original.saveScenario();
    const reopened = new SimulationSession(model);
    expect(reopened.loadScenario(JSON.parse(JSON.stringify(file)))).toEqual({ ok: true });
    const actual = reopened.snapshot();
    const expected = original.snapshot();
    expect(actual.model).toEqual(expected.model);
    expect(actual.devices).toEqual(expected.devices);
    expect(actual.sources).toEqual(expected.sources);
    expect(actual.connectivity).toEqual(expected.connectivity);
    expect(actual.conflicts).toEqual(expected.conflicts);
    expect(actual.possibleConflicts).toEqual(expected.possibleConflicts);
    expect(actual.switching).toEqual(expected.switching);
    expect(actual.connectionResults).toEqual(expected.connectionResults);
    expect(actual.model.presentation).toEqual(model.presentation);
    if (!file.model.presentation) throw new Error('This fixture includes its presentation.');
    for (const view of file.model.presentation.views) {
      view.layout.assets = Object.fromEntries(Object.entries(view.layout.assets).reverse());
      view.layout.terminals = Object.fromEntries(Object.entries(view.layout.terminals).reverse());
    }
    file.model.starting.sources = Object.fromEntries(Object.entries(file.model.starting.sources).reverse());
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
  });

  const invalidFiles: [string, (file: ScenarioFile) => unknown][] = [
    ['unsupported file format', file => ({ ...file, formatVersion: 2 })],
    ['inconsistent model version', file => ({ ...file, modelVersion: 'wrong-version' })],
    ['missing device position', file => ({ ...file, devices: {} })],
    ['missing source availability', file => ({ ...file, sources: {} })],
    ['unknown device', file => ({ ...file, devices: { ...file.devices, unknown: 'open' } })],
    ['unknown source', file => ({ ...file, sources: { ...file.sources, unknown: true } })],
    ['unsupported position', file => ({ ...file, devices: { ...file.devices, 'cb-01': 'unsupported' } })],
    ['invalid source value', file => ({ ...file, sources: { 'source-a': 'enabled' } })],
    ['invalid original model', file => ({ ...file, model: { ...file.model, connections: [{ id: 'bad', from: 'missing', to: 'lv' }] } })],
    ['malformed presentation boundary', file => {
      const presentation = fallbackPresentation(file.model);
      presentation.views[0].boundaries = [{ connectionId: 'missing-connection', remoteAssetId: 'lv-bus', targetViewId: 'overview', position: [0, 0] }];
      return { ...file, model: { ...file.model, presentation } };
    }],
    ['unknown envelope field', file => ({ ...file, unsafeExtra: true })],
  ];
  it.each(invalidFiles)('rejects %s without replacing states, history, mode or impact', (_name, corrupt) => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    const result = session.loadScenario(corrupt(session.saveScenario()));
    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
    expect(session.snapshot()).toEqual(before);
  });

  it('detaches saved and loaded scenario objects from active state and its package identity', () => {
    const session = new SimulationSession(singleSupply);
    const saved = session.saveScenario();
    saved.model.name = 'Caller edit';
    saved.devices['cb-01'] = 'open';
    expect(session.snapshot().model.name).toBe(singleSupply.name);
    expect(session.snapshot().devices['cb-01']).toBe('closed');
    const loadable = session.saveScenario();
    loadable.devices['cb-01'] = 'open';
    expect(session.loadScenario(loadable).ok).toBe(true);
    loadable.model.assets.length = 0;
    loadable.devices['cb-01'] = 'closed';
    expect(session.snapshot().model.assets).toHaveLength(4);
    expect(session.snapshot().devices['cb-01']).toBe('open');
  });
});
