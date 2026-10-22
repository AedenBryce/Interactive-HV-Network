import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { removableBreakerModel } from '../models/removable-breaker';
import type { NetworkModel } from './model';
import type { InterlockCondition } from './interlocks';
import { interlockFixture } from '../models/interlock-fixture';

function matrixFixture(): NetworkModel {
  const model = structuredClone(removableBreakerModel);
  model.id = 'synthetic-removable-earth-matrix'; model.version = 'matrix-fictional-1'; model.name = 'Fictional removable breaker / local earth matrix'; model.presentation = undefined;
  model.starting.devices.removable = { contact: 'open', racking: 'in' };
  model.assets.push({ id: 'es', label: 'Fictional load-side earth switch', kind: 'earth-switch', terminals: ['es:line', 'es:earth'], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['es:line', 'es:earth']] }] });
  model.connections.push({ id: 'local-earth-branch', from: 'removable:out', to: 'es:line' });
  model.earths!.push({ id: 'local-earth', label: 'Fictional switched load earth', terminal: 'es:earth' });
  model.starting.devices.es = 'closed';
  model.interlocks!.reviews[0] = { assetId: 'removable', status: 'confirmed-rules', note: 'Explicit fictional local matrix only.', evidence: [] };
  model.interlocks!.reviews.push({ assetId: 'es', status: 'confirmed-rules', note: 'Explicit fictional earth control matrix.', evidence: [] });
  model.interlocks!.rules = [{ id: 'cb-close', assetId: 'removable', command: { kind: 'contact', value: 'closed' }, require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'removable', axis: 'racking', value: 'in' }, { kind: 'device', assetId: 'es', position: 'open' }] }, explanation: 'Fictional Close requires Rack In and ES Open.', evidence: [] }];
  model.interlocks!.rules.push(
    { id: 'cb-open', assetId: 'removable', command: { kind: 'contact', value: 'open' }, require: { kind: 'device', assetId: 'removable', axis: 'racking', value: 'in' }, explanation: 'Fictional Open requires Rack In.', evidence: [] },
    { id: 'rack-in', assetId: 'removable', command: { kind: 'racking', value: 'in' }, require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'removable', axis: 'contact', value: 'open' }, { kind: 'device', assetId: 'es', position: 'open' }] }, explanation: 'Fictional Rack In requires Contact Open and ES Open.', evidence: [] },
    { id: 'rack-out', assetId: 'removable', command: { kind: 'racking', value: 'out' }, require: { kind: 'device', assetId: 'removable', axis: 'contact', value: 'open' }, explanation: 'Fictional Rack Out requires Contact Open.', evidence: [] },
    { id: 'es-close', assetId: 'es', position: 'closed', require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'removable', axis: 'contact', value: 'open' }, { kind: 'device', assetId: 'removable', axis: 'racking', value: 'out' }] }, explanation: 'Fictional ES Close requires Contact Open and Rack Out.', evidence: [] },
  );
  model.evidence!.push({ id: 'fictional-matrix', status: 'supported', summary: 'Explicit synthetic software matrix, not installed equipment: Close requires Rack In and ES Open. The synthetic local earth is separate from fixed frame earth. No site rule or permission is established.', references: [{ document: 'Fictional removable/local-earth matrix', revision: '1', page: 1 }] });
  return model;
}

describe('explicit removable-command interlocks through the session', () => {
  it('evaluates a declared Contact Close target and racking prerequisite in addition to intrinsic guards', () => {
    const model = matrixFixture(); const session = new SimulationSession(model); const before = session.snapshot();
    expect(before.connectivity.load.earthIds).toEqual(['local-earth']);
    expect(before.switching.removable.conditions[0]).toMatchObject({ command: { kind: 'contact', value: 'closed' } });
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' })).toEqual({ ok: false, error: 'Fictional Close requires Rack In and ES Open.' });
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice('es', 'open')).toEqual({ ok: true });
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' })).toEqual({ ok: true });
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.snapshot().connectivity.load.earthIds).toEqual([]);
    expect(session.snapshot().connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(removableBreakerModel.id).toBe('synthetic-removable-breaker');
  });
  it('executes the full declared contact/racking/earth matrix without bypassing independent intrinsic guards', () => {
    const model = matrixFixture(); model.starting.devices.es = 'open';
    const session = new SimulationSession(model);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.changeDevice('es', 'closed').ok).toBe(true);
    const earthed = session.snapshot();
    expect(earthed.connectivity.load.sourceStatus).toBe('disconnected'); expect(earthed.connectivity.load.earthIds).toEqual(['local-earth']);
    expect(earthed.connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' })).toEqual({ ok: false, error: 'Fictional Rack In requires Contact Open and ES Open.' });
    expect(session.snapshot()).toEqual(earthed);
    expect(session.changeDevice('es', 'open').ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.snapshot().connectivity.load.earthIds).toEqual([]);
  });
  it.each([
    ['all', 'open', false, true], ['all', 'closed', false, false], ['any', 'open', true, false], ['any', 'closed', false, true],
  ] as const)('retains %s three-valued logic with known ES=%s and unknown racking', (kind, earth, allowed, unconfirmed) => {
    const model = matrixFixture(); model.starting.devices.removable = { contact: 'open', racking: null }; model.starting.devices.es = earth;
    model.interlocks!.rules.find(rule => rule.id === 'es-close')!.require = { kind, conditions: [{ kind: 'device', assetId: 'removable', axis: 'racking', value: 'out' }, { kind: 'any', conditions: [{ kind: 'device', assetId: 'es', position: 'open' }] }] };
    const session = new SimulationSession(model); const before = session.snapshot();
    const option = before.switching.es.positions.find(position => position.id === 'closed')!;
    expect(option.allowed).toBe(allowed);
    if (!allowed) { expect(option.reason?.includes('Unconfirmed interlock condition')).toBe(unconfirmed); expect(session.changeDevice('es', 'closed').ok).toBe(false); expect(session.snapshot()).toEqual(before); }
    else expect(session.changeDevice('es', 'closed').ok).toBe(true);
  });
  it('blocks unknown contact predicates and keeps legacy position rules distinct from structured axes', () => {
    const model = matrixFixture(); model.starting.devices.removable = { contact: null, racking: 'out' }; model.starting.devices.es = 'open';
    const session = new SimulationSession(model); const before = session.snapshot();
    expect(session.changeDevice('es', 'closed')).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed interlock condition') });
    expect(session.snapshot()).toEqual(before);
    const malformed = structuredClone(model);
    malformed.interlocks!.rules.find(rule => rule.id === 'es-close')!.require = { kind: 'device', assetId: 'removable', position: 'open' };
    expect(session.loadModel(malformed)).toMatchObject({ ok: false, error: expect.stringContaining('unknown device or position') });
    expect(session.snapshot()).toEqual(before);
  });
  it('rejects malformed rule targets, axes and identities atomically, including invalid historical files', () => {
    const model = matrixFixture(); const session = new SimulationSession(model); const before = session.snapshot();
    const rule = model.interlocks!.rules[0]; const valid: InterlockCondition = { kind: 'device', assetId: 'es', position: 'open' };
    const invalidRules: unknown[] = [
      { ...rule, assetId: 'missing' }, { ...rule, assetId: 'es' }, { ...rule, command: { kind: 'racking', value: 'closed' } },
      { ...rule, command: { kind: 'contact', value: 'in' } }, { ...rule, command: { kind: 'earth', value: 'open' } },
      { ...rule, position: 'open' }, { id: rule.id, assetId: 'removable', position: 'open', require: valid, explanation: 'Wrong target form.', evidence: [] },
      { ...rule, require: { kind: 'device', assetId: 'es', axis: 'contact', value: 'open' } },
      { ...rule, require: { kind: 'device', assetId: 'missing', axis: 'racking', value: 'in' } },
      { ...rule, require: { kind: 'device', assetId: 'removable', axis: 'contact', value: 'in' } },
      { ...rule, require: { kind: 'device', assetId: 'removable', axis: 'racking', value: 'open' } },
      { ...rule, require: { kind: 'device', assetId: 'removable', axis: 'racking', value: 'in', position: 'open' } },
      { ...rule, require: { kind: 'all', conditions: [] } }, { ...rule, require: { kind: 'any', conditions: [{ kind: 'source', sourceId: 'missing', enabled: true }] } },
    ];
    for (const invalid of invalidRules) {
      const bad = { ...model, interlocks: { ...model.interlocks, rules: [invalid, ...model.interlocks!.rules.slice(1)] } };
      expect(session.loadModel(bad).ok).toBe(false); expect(session.snapshot()).toEqual(before);
      expect(session.loadScenario({ ...session.saveScenario(), model: bad }).ok).toBe(false); expect(session.snapshot()).toEqual(before);
    }
    for (const corrupt of [
      (bad: NetworkModel) => { bad.interlocks!.rules.push(structuredClone(bad.interlocks!.rules[0])); },
      (bad: NetworkModel) => { bad.interlocks!.reviews[0].status = 'confirmed-none'; },
      (bad: NetworkModel) => { bad.interlocks!.reviews = bad.interlocks!.reviews.filter(review => review.assetId !== 'removable'); },
      (bad: NetworkModel) => { bad.interlocks!.rules = bad.interlocks!.rules.filter(rule => rule.assetId !== 'removable'); },
    ]) {
      const bad = structuredClone(model); corrupt(bad);
      expect(session.loadModel(bad).ok).toBe(false); expect(session.snapshot()).toEqual(before);
    }
  });
  it('preserves unrelated legacy position/source rules alongside structured predicates', () => {
    const model = matrixFixture(); model.id = 'synthetic-matrix-with-unrelated-legacy'; model.version = 'legacy-mix-1';
    model.assets.push({ id: 'aux', label: 'Fictional unrelated isolator', kind: 'disconnector', terminals: ['aux:a', 'aux:b'], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['aux:a', 'aux:b']] }] });
    model.starting.devices.aux = 'open';
    model.interlocks!.reviews.push({ assetId: 'aux', status: 'confirmed-rules', note: 'Explicit unrelated legacy fixture rule.', evidence: [] });
    model.interlocks!.rules.push({ id: 'aux-source-off', assetId: 'aux', position: 'closed', require: { kind: 'source', sourceId: 'fictional-source', enabled: false }, explanation: 'Fictional source must be disabled.', evidence: [] });
    const session = new SimulationSession(model);
    expect(session.changeDevice('aux', 'closed').ok).toBe(false);
    expect(session.changeSource('fictional-source', false).ok).toBe(true);
    expect(session.changeDevice('aux', 'closed').ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(session.snapshot().switching.aux.conditions[0]).toEqual({ id: 'aux-source-off', position: 'closed', explanation: 'Fictional source must be disabled.', evidence: [] });
  });
  it('retains explicit targets/predicates in format2 and keeps all historical action gates closed', () => {
    const model = matrixFixture(); const original = new SimulationSession(model); const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const historical = new SimulationSession(removableBreakerModel);
    expect(historical.loadScenario(file)).toEqual({ ok: true });
    expect(historical.saveScenario()).toEqual(file);
    const before = historical.snapshot();
    expect(before.mode).toBe('view-only');
    expect(before.switching.removable.conditions.find(condition => condition.id === 'rack-in')).toMatchObject({ command: { kind: 'racking', value: 'in' }, targetLabel: 'Rack in' });
    expect(before.switching.removable.actions!.every(action => !action.allowed)).toBe(true);
    expect(before.switching.es.positions.every(position => !position.allowed)).toBe(true);
    expect(historical.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(historical.changeDevice('es', 'open').ok).toBe(false);
    expect(historical.changeSource('fictional-source', false).ok).toBe(false);
    expect(historical.undo().ok).toBe(false); expect(historical.reset().ok).toBe(false); expect(historical.snapshot()).toEqual(before);
    const legacy = new SimulationSession(interlockFixture).saveScenario();
    expect(legacy.formatVersion).toBe(1);
    expect(historical.loadScenario(JSON.parse(JSON.stringify(legacy)))).toEqual({ ok: true });
    expect(historical.saveScenario()).toEqual(legacy);
  });
  it('combines all matching command rules without weakening intrinsic guards or unresolved review gating', () => {
    const model = matrixFixture(); model.starting.devices.es = 'open';
    model.interlocks!.rules.push({ id: 'extra-close-condition', assetId: 'removable', command: { kind: 'contact', value: 'closed' }, require: { kind: 'source', sourceId: 'fictional-source', enabled: false }, explanation: 'Additional fictional Close prerequisite.', evidence: [] });
    const session = new SimulationSession(model); const before = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' })).toEqual({ ok: false, error: 'Additional fictional Close prerequisite.' });
    expect(session.snapshot()).toEqual(before);
    expect(session.changeSource('fictional-source', false).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    const permissive = matrixFixture(); permissive.starting.devices.removable = { contact: 'closed', racking: 'in' };
    permissive.interlocks!.rules.find(rule => rule.id === 'rack-out')!.require = { kind: 'source', sourceId: 'fictional-source', enabled: true };
    const intrinsic = new SimulationSession(permissive);
    expect(intrinsic.changeDevice('removable', { kind: 'racking', value: 'out' })).toMatchObject({ ok: false, error: expect.stringContaining('Racking requires') });
    const unreviewed = matrixFixture(); unreviewed.interlocks!.reviews[0].status = 'unresolved';
    const unresolved = new SimulationSession(unreviewed);
    expect(unresolved.snapshot().switching.removable.actions!.every(action => !action.allowed)).toBe(true);
  });
});
