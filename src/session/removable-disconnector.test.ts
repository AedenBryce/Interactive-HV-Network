import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { removableBreakerModel } from '../models/removable-breaker';
import { singleSupply } from '../models/synthetic';
import type { NetworkModel } from './model';

function fixture(): NetworkModel {
  const model = structuredClone(removableBreakerModel);
  model.id = 'synthetic-removable-disconnector'; model.version = 'fictional-disconnector-1';
  model.name = 'Fictional removable disconnector';
  const asset = model.assets.find(asset => asset.id === 'removable')!;
  asset.kind = 'disconnector'; asset.label = 'Fictional removable disconnector';
  Object.assign(asset, { removableDisconnector: structuredClone(asset.removableBreaker) });
  delete asset.removableBreaker;
  return model;
}

function earthFixture(): NetworkModel {
  const model = fixture(); model.id = 'fictional-removable-disconnector-earth'; model.presentation = undefined;
  model.assets.push({ id: 'es', label: 'Fictional earth', kind: 'earth-switch', terminals: ['es:a', 'es:b'], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['es:a', 'es:b']] }] });
  model.connections.push({ id: 'load-earth-link', from: 'removable:out', to: 'es:a' });
  model.earths!.push({ id: 'load-earth', label: 'Fictional load earth', terminal: 'es:b' });
  model.starting.devices.es = 'open';
  model.interlocks!.reviews[0].status = 'confirmed-rules';
  model.interlocks!.reviews.push({ assetId: 'es', status: 'confirmed-rules', note: 'Fictional earth profile.', evidence: [] });
  model.interlocks!.rules = [
    { id: 'ds-close', assetId: 'removable', command: { kind: 'contact', value: 'closed' }, require: { kind: 'device', assetId: 'es', position: 'open' }, explanation: 'Own earth must be Open.', evidence: [] },
    { id: 'ds-rack-in', assetId: 'removable', command: { kind: 'racking', value: 'in' }, require: { kind: 'device', assetId: 'es', position: 'open' }, explanation: 'Own earth must be Open.', evidence: [] },
    { id: 'es-close', assetId: 'es', position: 'closed', require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'removable', axis: 'contact', value: 'open' }, { kind: 'device', assetId: 'removable', axis: 'racking', value: 'out' }] }, explanation: 'Disconnector must be Open and Rack out.', evidence: [] },
  ];
  return model;
}

describe('removable disconnector through the public session', () => {
  it('retains disconnector identity and separate contact/racking actions in format2', () => {
    const session = new SimulationSession(fixture());
    const saved = session.saveScenario();
    expect(saved.formatVersion).toBe(2);
    expect(saved.model.assets.find(asset => asset.id === 'removable')).toMatchObject({ kind: 'disconnector', removableDisconnector: { mainPair: ['removable:in', 'removable:out'] } });
    expect(session.snapshot().devices.removable).toEqual({ contact: 'closed', racking: 'in' });
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'out' });
    expect(session.snapshot().history.map(action => action.kind)).toEqual(['disconnector', 'disconnector']);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(session.reset().ok).toBe(true);
    expect(session.saveScenario()).toEqual(saved);
  });

  it('preserves partial unknown axes without guessing connectivity or permitted actions', () => {
    for (const [state, status] of [
      [{ contact: null, racking: 'in' }, 'unconfirmed'],
      [{ contact: 'closed', racking: null }, 'unconfirmed'],
      [{ contact: 'open', racking: null }, 'disconnected'],
      [{ contact: null, racking: 'out' }, 'disconnected'],
    ] as const) {
      const model = fixture(); model.starting.devices.removable = structuredClone(state);
      const session = new SimulationSession(model); const before = session.snapshot();
      expect(before.connectivity.load.sourceStatus).toBe(status);
      expect(before.devices.removable).toEqual(state);
      expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(state.racking === 'in');
      expect(session.reset().ok).toBe(true);
      expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(state.contact === 'open');
      expect(session.reset().ok).toBe(true);
      expect(session.saveScenario().devices.removable).toEqual(state);
    }
  });

  it('combines declared earth prerequisites with intrinsic guards while keeping frame earth independent', () => {
    const session = new SimulationSession(earthFixture());
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('es', 'closed').ok).toBe(true);
    expect(session.snapshot().connectivity.load.earthIds).toEqual(['load-earth']);
    expect(session.snapshot().connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(session.snapshot().connectivity.supply.earthIds).toEqual([]);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(false);
    const unknown = session.saveScenario(); unknown.devices.es = null;
    expect(session.loadScenario(unknown).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' })).toMatchObject({ ok: false, error: expect.stringContaining('Unconfirmed') });
    expect(session.changeDevice('es', 'open').ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.snapshot().conflicts).toEqual([]);
  });

  it('rejects conflicting mechanisms, wrong kind, bypasses and malformed commands atomically', () => {
    const session = new SimulationSession(fixture()); const before = session.snapshot();
    const original = fixture();
    const wrongKind = structuredClone(original); wrongKind.assets[1].kind = 'breaker';
    const both = structuredClone(original); both.assets[1].removableBreaker = { mainPair: ['removable:in', 'removable:out'] };
    const triple = structuredClone(both); triple.assets[1].removableContactor = { mainPair: ['removable:in', 'removable:out'] };
    const fixed = structuredClone(original); fixed.assets[1].sourcePairs = [['removable:in', 'removable:out']];
    const arcs = structuredClone(original); arcs.assets[1].sourceArcs = [];
    const missing = structuredClone(original); delete missing.assets[1].removableDisconnector;
    for (const invalid of [wrongKind, both, triple, fixed, arcs, missing]) {
      expect(session.loadModel(invalid).ok).toBe(false); expect(session.snapshot()).toEqual(before);
    }
    for (const command of [{ kind: 'racking', value: 'middle' }, { kind: 'contact', value: null }, { kind: 'contact', value: 'open', extra: true }]) {
      const invalid: unknown = command;
      // Runtime clients may supply untyped payloads; the public method validates them.
      expect(Reflect.apply(session.changeDevice, session, ['removable', invalid]).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });

  it('roundtrips new scenarios and keeps legacy format1 and prior breaker format2 packages unchanged', () => {
    const session = new SimulationSession(fixture());
    const saved = session.saveScenario(); saved.devices.removable = { contact: null, racking: 'out' };
    expect(session.loadScenario(JSON.parse(JSON.stringify(saved)))).toEqual({ ok: true });
    expect(session.saveScenario()).toEqual(saved);
    const legacy = new SimulationSession(singleSupply).saveScenario();
    expect(session.loadScenario(legacy).ok).toBe(true); expect(session.saveScenario()).toEqual(legacy);
    expect(legacy.formatVersion).toBe(1);
    const breaker = new SimulationSession(removableBreakerModel).saveScenario();
    expect(breaker.model).toEqual(removableBreakerModel);
    expect(breaker.model.assets[1]).not.toHaveProperty('removableDisconnector');
    expect(session.loadScenario(breaker).ok).toBe(true); expect(session.saveScenario()).toEqual(breaker);
  });

  it('preserves an older disconnector snapshot in view-only mode with every mutation blocked', () => {
    const old = new SimulationSession(fixture()).saveScenario();
    const current = fixture(); current.version = 'fictional-disconnector-2';
    const session = new SimulationSession(current);
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    for (const action of [
      () => session.changeDevice('removable', { kind: 'contact', value: 'open' }),
      () => session.changeDevice('removable', { kind: 'racking', value: 'out' }),
      () => session.changeSource('fictional-source', false), () => session.undo(), () => session.reset(),
    ]) { expect(action().ok).toBe(false); expect(session.saveScenario()).toEqual(old); }
  });
});
