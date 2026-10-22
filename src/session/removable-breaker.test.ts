import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { removableBreakerModel } from '../models/removable-breaker';
import { singleSupply } from '../models/synthetic';

describe('independent removable breaker through the session', () => {
  it('opens one contact without changing racking and removes its downstream source path', () => {
    const session = new SimulationSession(removableBreakerModel);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.trace('load')).toMatchObject({ ok: true, paths: [expect.objectContaining({ sourceId: 'fictional-source', assetIds: ['supply', 'removable', 'load'] })] });
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' })).toEqual({ ok: true });
    const snapshot = session.snapshot();
    expect(snapshot.devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(snapshot.connectivity.load.sourceStatus).toBe('disconnected');
    expect(snapshot.impact.some(item => item.assetId === 'load' && item.connectivityChanged)).toBe(true);
    expect(snapshot.history).toHaveLength(1);
    expect(session.trace('load')).toEqual({ ok: true, paths: [] });
  });
  it('roundtrips independent null axes in format2 and preserves historical view-only mutation gates', () => {
    const partial = structuredClone(removableBreakerModel); partial.version = 'fictional-partial';
    partial.starting.devices.removable = { contact: 'open', racking: null };
    const original = new SimulationSession(partial); const file = JSON.parse(JSON.stringify(original.saveScenario()));
    expect(file.formatVersion).toBe(2);
    const session = new SimulationSession(removableBreakerModel);
    expect(session.loadScenario(file)).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(file);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: null });
    expect(session.snapshot().switching.removable.actions!.every(action => !action.allowed)).toBe(true);
    const before = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.changeSource('fictional-source', false).ok).toBe(false);
    expect(session.undo().ok).toBe(false); expect(session.reset().ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    const legacy = new SimulationSession(singleSupply); const oldFile = legacy.saveScenario();
    expect(oldFile.formatVersion).toBe(1);
    expect(session.loadScenario(JSON.parse(JSON.stringify(oldFile)))).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(oldFile);
    expect(session.saveScenario().model).toEqual(singleSupply);
  });
  it.each([
    ['open', null, 'disconnected'], ['closed', null, 'unconfirmed'], [null, 'in', 'unconfirmed'], [null, 'out', 'disconnected'], [null, null, 'unconfirmed'], ['closed', 'in', 'connected'], ['open', 'out', 'disconnected'],
  ] as const)('retains partial contact %s / racking %s without changing the independent frame earth', (contact, racking, expected) => {
    const model = structuredClone(removableBreakerModel); model.starting.devices.removable = { contact, racking };
    const snapshot = new SimulationSession(model).snapshot();
    expect(snapshot.connectivity.load.sourceStatus).toBe(expected);
    expect(snapshot.connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(snapshot.conflicts).toEqual([]);
  });
  it('guards each axis, rejects invalid commands atomically, and preserves nulls through undo/reset', () => {
    const session = new SimulationSession(removableBreakerModel);
    const before = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(false);
    for (const invalid of [{ kind: 'contact', value: 'in' }, { kind: 'racking', value: 'closed' }, { kind: 'earth', value: 'open' }, { kind: 'contact', value: 'open', racking: 'in' }, null, 1]) expect(session.changeDevice('removable', JSON.parse(JSON.stringify(invalid))).ok).toBe(false);
    expect(session.changeDevice('removable', 'open').ok).toBe(false);
    expect(session.changeDevice('supply', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'out' });
    const out = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(out);
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(session.reset().ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'closed', racking: 'in' });
    const partial = structuredClone(removableBreakerModel); partial.starting.devices.removable = { contact: 'open', racking: null };
    const unknownRack = new SimulationSession(partial);
    expect(unknownRack.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(unknownRack.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(unknownRack.undo().ok).toBe(true);
    expect(unknownRack.snapshot().devices.removable).toEqual({ contact: 'open', racking: null });
    const copy = unknownRack.snapshot();
    if (typeof copy.devices.removable === 'object' && copy.devices.removable !== null) copy.devices.removable.contact = 'closed';
    expect(unknownRack.saveScenario().devices.removable).toEqual({ contact: 'open', racking: null });
  });
  it('rejects malformed mechanism models and scenario state identities without changing the active session', () => {
    const session = new SimulationSession(removableBreakerModel); const before = session.snapshot();
    const corruptions = [
      (model: typeof removableBreakerModel) => { model.starting.devices.removable = null; },
      (model: typeof removableBreakerModel) => { model.starting.devices.removable = 'closed'; },
      (model: typeof removableBreakerModel) => { model.starting.devices.missing = { contact: 'open', racking: 'in' }; },
      (model: typeof removableBreakerModel) => { model.assets[1].positions = [{ id: 'closed', label: 'Closed', pairs: [] }]; },
      (model: typeof removableBreakerModel) => { model.assets[1].removableBreaker = { mainPair: ['removable:in', 'missing'] }; },
      (model: typeof removableBreakerModel) => { model.assets[1].conductivePairs.push(['removable:in', 'removable:out']); },
      (model: typeof removableBreakerModel) => { model.assets.push(structuredClone(model.assets[1])); },
      (model: typeof removableBreakerModel) => { model.assets[1].kind = 'disconnector'; },
    ];
    for (const corrupt of corruptions) {
      const model = structuredClone(removableBreakerModel); corrupt(model);
      expect(session.loadModel(model).ok).toBe(false); expect(session.snapshot()).toEqual(before);
    }
    const file = session.saveScenario();
    for (const broken of [{ ...file, formatVersion: 1 }, { ...file, formatVersion: 3 }, { ...file, devices: { removable: { contact: null } } }, { ...file, devices: { removable: { contact: 'open', racking: 'test' } } }, { ...file, devices: { removable: { contact: 'open', racking: null }, extra: null } }]) {
      expect(session.loadScenario(broken).ok).toBe(false); expect(session.snapshot()).toEqual(before);
    }
    const changed = structuredClone(removableBreakerModel); changed.assets[1].label = 'Different package, same identity/version';
    expect(session.loadModel(changed)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(session.snapshot()).toEqual(before);
  });
  it('keeps an unresolved or missing interlock review blocked even when both action prerequisites are known', () => {
    const unresolved = structuredClone(removableBreakerModel); unresolved.interlocks!.reviews[0].status = 'unresolved';
    const session = new SimulationSession(unresolved);
    expect(session.snapshot().switching.removable.actions!.every(action => !action.allowed)).toBe(true);
    const before = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    const missing = structuredClone(removableBreakerModel); missing.interlocks = undefined;
    const withoutReview = new SimulationSession(missing);
    expect(withoutReview.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
  });
  it('does not infer either unknown prerequisite and recomputes source actions without changing mechanism state', () => {
    const partial = structuredClone(removableBreakerModel); partial.starting.devices.removable = { contact: null, racking: null };
    const unknown = new SimulationSession(partial); const before = unknown.snapshot();
    expect(before.switching.removable.actions!.map(action => action.label)).toEqual(['Open', 'Close', 'Rack in', 'Rack out']);
    expect(before.switching.removable.actions!.every(action => !action.allowed)).toBe(true);
    expect(unknown.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(unknown.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(unknown.snapshot()).toEqual(before);
    const session = new SimulationSession(removableBreakerModel);
    expect(session.changeSource('fictional-source', false).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('disconnected');
    expect(session.snapshot().devices.removable).toEqual({ contact: 'closed', racking: 'in' });
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.snapshot().history).toHaveLength(1);
    expect(removableBreakerModel.starting.devices.removable).toEqual({ contact: 'closed', racking: 'in' });
  });
});
