import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { earthFixture } from '../models/earth-fixture';

describe('independent source and earth connectivity', () => {
  it('earths a source-disconnected section without making earth a supply', () => {
    const session = new SimulationSession(earthFixture);
    expect(session.changeDevice('cb-01', 'open').ok).toBe(true);
    expect(session.changeDevice('es-01', 'closed').ok).toBe(true);
    const result = session.snapshot();
    expect(result.connectivity['lv-bus'].sourceIds).toEqual([]);
    expect(result.connectivity['lv-bus'].earthIds).toEqual(['earth-a']);
    expect(result.connectivity['supply-a'].earthIds).toEqual([]);
    expect(result.conflicts).toEqual([]);
  });

  it('reports the enabled-source-to-earth path while allowing actions without an interlock', () => {
    const session = new SimulationSession(earthFixture);
    expect(session.changeDevice('es-01', 'closed')).toEqual({ ok: true });
    const result = session.snapshot();
    expect(result.connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(result.connectivity['lv-bus'].earthIds).toEqual(['earth-a']);
    expect(result.connectivity['lv-bus'].conflictSourceIds).toEqual(['source-a']);
    expect(result.conflicts).toEqual([{
      sourceId: 'source-a', earthId: 'earth-a',
      terminalPath: ['source-out', 'cb-in', 'cb-out', 'tf-hv', 'es-01-in', 'earth-01'],
      connectionIds: ['supply-breaker', 'breaker-transformer', 'section-earth'],
    }]);
    expect(session.changeDevice('es-01', 'open').ok).toBe(true);
    expect(session.snapshot().conflicts).toEqual([]);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(session.snapshot().connectivity['lv-bus'].earthIds).toEqual([]);
  });

  it.each(['shared group', 'shared termination'])('does not join separate circuits through a %s', representation => {
    const fixture = structuredClone(earthFixture);
    if (representation === 'shared termination') {
      fixture.earths.splice(1, 1);
      fixture.connections.push({ id: 'common-earth-link', from: 'earth-02', to: 'earth-01' });
    }
    const session = new SimulationSession(fixture);
    session.changeDevice('es-01', 'closed');
    session.changeDevice('es-02', 'closed');
    const result = session.snapshot();
    expect(result.connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
    expect(result.connectivity['isolated-bus'].earthIds).toEqual([representation === 'shared group' ? 'earth-b' : 'earth-a']);
    expect(result.connectivity['isolated-bus'].sourceIds).toEqual([]);
    expect(result.connectivity['isolated-bus'].conflictSourceIds).toEqual([]);
    expect(session.trace('isolated-bus')).toEqual({ ok: true, paths: [] });
  });

  it('keeps earth-side and circuit-side terminal results distinct when an earth switch is open', () => {
    const session = new SimulationSession(earthFixture);
    expect(session.snapshot().connectivity['es-01'].terminalEarths).toEqual({ 'es-01-in': [], 'earth-01': ['earth-a'] });
    expect(session.snapshot().connectivity['lv-bus'].earthIds).toEqual([]);
    session.changeDevice('es-01', 'closed');
    expect(session.snapshot().connectivity['es-01'].terminalEarths).toEqual({ 'es-01-in': ['earth-a'], 'earth-01': ['earth-a'] });
    session.changeSource('source-a', false);
    expect(session.snapshot().connectivity['lv-bus'].earthIds).toEqual(['earth-a']);
    expect(session.snapshot().conflicts).toEqual([]);
  });

  it('reports missing earth terminal references and preserves the active scenario', () => {
    const session = new SimulationSession(earthFixture);
    session.changeDevice('es-01', 'closed');
    const before = session.snapshot();
    const invalid = structuredClone(earthFixture);
    invalid.earths[0].terminal = 'missing-earth-terminal';
    expect(session.loadModel(invalid)).toMatchObject({ ok: false, error: expect.stringContaining('missing-earth-terminal') });
    expect(session.snapshot()).toEqual(before);
  });

  it('rejects ambiguous duplicate earth identities and duplicate terminations', () => {
    const session = new SimulationSession(earthFixture);
    const before = session.snapshot();
    const duplicateId = structuredClone(earthFixture);
    duplicateId.earths[1].id = 'earth-a';
    expect(session.loadModel(duplicateId)).toMatchObject({ ok: false, error: expect.stringContaining('Duplicate earth identity') });
    const duplicateTerminal = structuredClone(earthFixture);
    duplicateTerminal.earths[1].terminal = 'earth-01';
    expect(session.loadModel(duplicateTerminal)).toMatchObject({ ok: false, error: expect.stringContaining('Duplicate earth termination') });
    expect(session.snapshot()).toEqual(before);
  });
});
