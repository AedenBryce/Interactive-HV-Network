import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { interlockFixture } from '../models/interlock-fixture';
import type { InterlockCondition } from './interlocks';
import type { NetworkModel } from './model';

function withBreakerRequirement(condition: InterlockCondition) {
  const fixture = structuredClone(interlockFixture);
  return { ...fixture, interlocks: { ...fixture.interlocks, rules: fixture.interlocks.rules.map(rule => rule.id === 'breaker-close-earth-open' ? { ...rule, require: condition, explanation: 'Fixture condition under test.' } : rule) } };
}

describe('physical interlock conditions through the simulation session', () => {
  it('rejects closing the earth switch against the fixture breaker and preserves the scenario', () => {
    const session = new SimulationSession(interlockFixture);
    const before = session.snapshot();
    expect(before.switching['es-01'].positions.find(position => position.id === 'closed')).toEqual({
      id: 'closed', allowed: false, reason: 'Fixture condition: CB-01 must be Open before ES-01 can close.',
    });
    expect(session.changeDevice('es-01', 'closed')).toEqual({ ok: false, error: 'Fixture condition: CB-01 must be Open before ES-01 can close.' });
    expect(session.snapshot()).toEqual(before);
  });

  it('evaluates an explicit source availability prerequisite', () => {
    const session = new SimulationSession(withBreakerRequirement({ kind: 'source', sourceId: 'source-a', enabled: false }));
    session.changeDevice('cb-01', 'open');
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(false);
    session.changeSource('source-a', false);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(true);
    expect(session.snapshot().devices['cb-01']).toBe('closed');
  });

  it('evaluates nested all/any prerequisites from explicit model predicates', () => {
    const session = new SimulationSession(withBreakerRequirement({ kind: 'all', conditions: [
      { kind: 'source', sourceId: 'source-a', enabled: false },
      { kind: 'any', conditions: [
        { kind: 'device', assetId: 'es-01', position: 'closed' },
        { kind: 'device', assetId: 'es-02', position: 'open' },
      ] },
    ] }));
    session.changeDevice('cb-01', 'open');
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(false);
    session.changeSource('source-a', false);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(true);
  });

  it('permits the fixture transitions and rejects attempts through the session without changing accepted results', () => {
    const session = new SimulationSession(interlockFixture);
    expect(session.changeDevice('cb-01', 'open').ok).toBe(true);
    expect(session.changeDevice('es-01', 'closed').ok).toBe(true);
    const before = session.snapshot();
    expect(before.connectivity['lv-bus'].earthIds).toEqual(['earth-a']);
    expect(session.changeDevice('cb-01', 'closed')).toEqual({ ok: false, error: 'Fixture condition: ES-01 must be Open before CB-01 can close.' });
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice('es-01', 'open').ok).toBe(true);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity['lv-bus'].sourceIds).toEqual(['source-a']);
  });

  it('disables every affected control for an unresolved interlock and rejects direct requests', () => {
    const session = new SimulationSession(interlockFixture);
    const before = session.snapshot();
    expect(before.switching['es-02'].reviewStatus).toBe('unresolved');
    expect(before.switching['es-02'].positions.every(position => !position.allowed)).toBe(true);
    expect(session.changeDevice('es-02', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unresolved interlock') });
    expect(session.changeDevice('es-02', 'open').ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });

  it.each([undefined, { reviews: [], rules: [] }])('does not infer permission from absent interlock review: %s', interlocks => {
    const session = new SimulationSession({ ...interlockFixture, interlocks });
    const before = session.snapshot();
    expect(before.switching['cb-01'].reviewStatus).toBe('unconfirmed');
    expect(before.switching['cb-01'].positions.every(position => !position.allowed)).toBe(true);
    expect(session.changeDevice('cb-01', 'open')).toMatchObject({ ok: false, error: expect.stringContaining('unconfirmed') });
    expect(session.snapshot()).toEqual(before);
  });

  it.each([
    ['unknown target', (model: NetworkModel) => { model.interlocks!.rules[0].assetId = 'missing'; }],
    ['unknown condition device', (model: NetworkModel) => { model.interlocks!.rules[0].require = { kind: 'device', assetId: 'missing', position: 'open' }; }],
    ['unknown condition position', (model: NetworkModel) => { model.interlocks!.rules[0].require = { kind: 'device', assetId: 'es-01', position: 'missing' }; }],
    ['unknown source', (model: NetworkModel) => { model.interlocks!.rules[0].require = { kind: 'source', sourceId: 'missing', enabled: false }; }],
    ['duplicate review', (model: NetworkModel) => { model.interlocks!.reviews.push(structuredClone(model.interlocks!.reviews[0])); }],
    ['duplicate rule', (model: NetworkModel) => { model.interlocks!.rules.push(structuredClone(model.interlocks!.rules[0])); }],
    ['contradictory review', (model: NetworkModel) => { model.interlocks!.reviews[0].status = 'confirmed-none'; }],
    ['rules confirmed but absent', (model: NetworkModel) => { model.interlocks!.rules.length = 0; }],
    ['real interlock without evidence', (model: NetworkModel) => { model.synthetic = false; }],
  ])('rejects %s without replacing the valid scenario', (_name, corrupt) => {
    const session = new SimulationSession(interlockFixture);
    const before = session.snapshot();
    const invalid: NetworkModel = structuredClone(interlockFixture);
    corrupt(invalid);
    expect(session.loadModel(invalid).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
  });

  it('blocks a required unconfirmed source prerequisite without changing the scenario', () => {
    const fixture = withBreakerRequirement({ kind: 'source', sourceId: 'source-a', enabled: false });
    const session = new SimulationSession({ ...fixture, starting: { ...fixture.starting, sources: { 'source-a': null } } });
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    expect(session.changeDevice('cb-01', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed interlock condition') });
    expect(session.snapshot()).toEqual(before);
  });

  it('exposes rule evidence separately from review evidence for inspection', () => {
    const fixture: NetworkModel = structuredClone(interlockFixture);
    fixture.interlocks!.rules[0].evidence = [{ document: 'Fictional fixture rule', revision: '1', page: 2, clause: 'CB-close' }];
    fixture.interlocks!.reviews[0].evidence = [{ document: 'Fictional fixture review', revision: '3', page: 1 }];
    const result = new SimulationSession(fixture).snapshot().switching['cb-01'];
    expect(result.conditions[0].evidence).toEqual([{ document: 'Fictional fixture rule', revision: '1', page: 2, clause: 'CB-close' }]);
    expect(result.evidence).toEqual([{ document: 'Fictional fixture review', revision: '3', page: 1 }]);
  });

  it.each([
    ['any', 'open', true, false],
    ['all', 'closed', false, false],
    ['all', 'open', false, true],
    ['any', 'closed', false, true],
  ] as const)('preserves explicit %s logic with known ES-01=%s and an unknown source', (kind, position, allowed, unconfirmed) => {
    const fixture = withBreakerRequirement({ kind, conditions: [
      { kind: 'source', sourceId: 'source-a', enabled: false },
      { kind: 'device', assetId: 'es-01', position },
    ] });
    const session = new SimulationSession({ ...fixture, starting: { ...fixture.starting, sources: { 'source-a': null } } });
    session.changeDevice('cb-01', 'open');
    const option = session.snapshot().switching['cb-01'].positions.find(candidate => candidate.id === 'closed');
    expect(option?.allowed).toBe(allowed);
    expect(option?.reason?.includes('Unconfirmed') ?? false).toBe(unconfirmed);
    expect(session.changeDevice('cb-01', 'closed').ok).toBe(allowed);
  });
});
