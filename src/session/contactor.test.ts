import { describe, expect, it } from 'vitest';
import { singleSupply } from '../models/synthetic';
import { SimulationSession } from './session';

// Explicit fictional classification; no real equipment permissions are asserted.
function contactorInput(version = 'contactor-fixture-1'): unknown {
  const model = structuredClone(singleSupply);
  return {
    ...model,
    id: 'fictional-contactor', version,
    assets: model.assets.map(asset => asset.id === 'cb-01'
      ? { ...asset, kind: 'contactor', label: 'Fictional contactor' }
      : asset),
  };
}

describe('first-class contactors through the simulation session', () => {
  it('preserves the contactor classification and uses its explicit conductive positions for switching and undo', () => {
    const session = new SimulationSession(contactorInput());
    expect(session.saveScenario().model.assets.find(asset => asset.id === 'cb-01')).toMatchObject({ kind: 'contactor' });
    expect(session.saveScenario().model.starting).toEqual(singleSupply.starting);
    expect(session.saveScenario().model.interlocks).toEqual(singleSupply.interlocks);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(session.changeDevice('cb-01', 'open')).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(session.snapshot().impact).toContainEqual(expect.objectContaining({ assetId: 'lv-bus', connectivityChanged: true }));
    expect(session.undo()).toEqual({ ok: true });
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(session.snapshot().devices['cb-01']).toBe('closed');
    expect(singleSupply.assets.find(asset => asset.id === 'cb-01')?.kind).toBe('breaker');
  });

  it('retains the contactor and selected position when reopening a matching scenario for exploration', () => {
    const original = new SimulationSession(contactorInput());
    expect(original.changeDevice('cb-01', 'open')).toEqual({ ok: true });
    const saved = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(contactorInput());
    expect(reopened.loadScenario(saved)).toEqual({ ok: true });
    expect(reopened.snapshot().mode).toBe('exploration');
    expect(reopened.saveScenario().model.assets.find(asset => asset.id === 'cb-01')?.kind).toBe('contactor');
    expect(reopened.snapshot().devices['cb-01']).toBe('open');
    expect(reopened.snapshot().connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(reopened.changeDevice('cb-01', 'closed')).toEqual({ ok: true });
    expect(reopened.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
  });

  it('retains a historical contactor scenario for inspection while blocking every state mutation', () => {
    const original = new SimulationSession(contactorInput());
    original.changeDevice('cb-01', 'open');
    const saved = JSON.parse(JSON.stringify(original.saveScenario()));
    const current = new SimulationSession(contactorInput('contactor-fixture-2'));
    expect(current.loadScenario(saved)).toEqual({ ok: true });
    const before = current.snapshot();
    expect(before.mode).toBe('view-only');
    expect(before.model.assets.find(asset => asset.id === 'cb-01')?.kind).toBe('contactor');
    expect(before.switching['cb-01'].positions.every(position => !position.allowed)).toBe(true);
    expect(current.changeDevice('cb-01', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(current.changeSource('source-a', false)).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(current.undo()).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(current.reset()).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
    expect(current.snapshot()).toEqual(before);
    expect(current.trace('lv-bus')).toMatchObject({ ok: true });
    expect(current.saveScenario()).toEqual(saved);
  });

  it('does not grant switching permission or replace an unconfirmed contactor baseline', () => {
    const input = new SimulationSession(contactorInput()).saveScenario().model;
    input.id = 'fictional-unconfirmed-contactor';
    input.version = 'unconfirmed-contactor-fixture-1';
    input.starting.devices['cb-01'] = null;
    input.interlocks = { reviews: [{ assetId: 'cb-01', status: 'unresolved', note: 'Fictional unresolved interlock conditions.', evidence: [] }], rules: [] };
    const session = new SimulationSession(input);
    const before = session.snapshot();
    expect(before.devices['cb-01']).toBe(null);
    expect(before.switching['cb-01'].positions.every(position => !position.allowed)).toBe(true);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });
});
