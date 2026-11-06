import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { directedSourceModel } from '../models/directed-source';
import { relationshipsFixture } from '../models/relationships-fixture';

describe('published directed-source demonstration through the session', () => {
  it('preserves a supplied secondary and exposes reverse uncertainty with its own evidence', () => {
    const original = structuredClone(relationshipsFixture);
    const session = new SimulationSession(directedSourceModel);
    expect(session.snapshot().connectivity['lv-bus-a'].sourceIds).toEqual(['source-a']);
    expect(session.changeSource('source-a', false).ok).toBe(true);
    expect(session.changeDevice('cb-01', 'isolated').ok).toBe(true);
    expect(session.changeSource('source-b', true).ok).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot.connectivity['lv-bus-a'].sourceIds).toEqual(['source-b']);
    expect(snapshot.connectivity['tf-01'].terminalSources['tf-hv']).toEqual([]);
    expect(snapshot.connectivity['tf-01'].possiblePaths.some(path => path.sourceId === 'source-b' && path.terminals.at(-1) === 'tf-hv')).toBe(true);
    expect(snapshot.connectivity['tf-01'].reviewIds).toContain('fictional-reverse-review');
    expect(snapshot.connectivity['lv-bus-b'].possibleSourceIds).toEqual([]);
    expect(session.trace('lv-bus-a')).toMatchObject({ ok: true, paths: [{ sourceId: 'source-b', terminals: ['source-b-out', 'lv-a'] }] });
    expect(snapshot.model.presentation!.views).toHaveLength(1);
    const saved = session.saveScenario();
    expect(session.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(saved);
    expect(relationshipsFixture).toEqual(original);
  });
});
