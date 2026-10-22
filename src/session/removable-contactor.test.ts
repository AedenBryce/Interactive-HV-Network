import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { removableBreakerModel } from '../models/removable-breaker';
import { singleSupply } from '../models/synthetic';
import type { NetworkModel } from './model';

function contactorFixture(): NetworkModel {
  const model = structuredClone(removableBreakerModel);
  model.id = 'synthetic-removable-contactor'; model.version = 'contactor-fictional-1'; model.name = 'Fictional removable contactor';
  const contactor = model.assets.find(asset => asset.id === 'removable')!;
  contactor.kind = 'contactor'; contactor.label = 'Fictional removable contactor';
  contactor.removableContactor = { mainPair: ['removable:in', 'removable:out'] };
  delete contactor.removableBreaker;
  return model;
}

function contactorEarthFixture(): NetworkModel {
  const model = contactorFixture(); model.id = 'synthetic-removable-contactor-earth'; model.version = 'contactor-earth-fictional-1'; model.presentation = undefined;
  model.assets.push({ id: 'es', label: 'Fictional contactor load earth', kind: 'earth-switch', terminals: ['es:line', 'es:earth'], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['es:line', 'es:earth']] }] });
  model.connections.push({ id: 'contactor-load-earth', from: 'removable:out', to: 'es:line' });
  model.earths!.push({ id: 'load-earth', label: 'Fictional switched phase earth', terminal: 'es:earth' });
  model.starting.devices.es = 'open';
  model.interlocks!.reviews[0] = { assetId: 'removable', status: 'confirmed-rules', note: 'Fictional contactor local profile only; no installed rule is established.', evidence: [] };
  model.interlocks!.reviews.push({ assetId: 'es', status: 'confirmed-rules', note: 'Fictional Earth Close requires Contact Open and Rack Out; Earth Open is allowed.', evidence: [] });
  model.interlocks!.rules = [
    { id: 'close-with-earth-open', assetId: 'removable', command: { kind: 'contact', value: 'closed' }, require: { kind: 'device', assetId: 'es', position: 'open' }, explanation: 'Fictional contactor Close requires Earth Open.', evidence: [] },
    { id: 'rack-in-with-earth-open', assetId: 'removable', command: { kind: 'racking', value: 'in' }, require: { kind: 'device', assetId: 'es', position: 'open' }, explanation: 'Fictional contactor Rack In requires Earth Open.', evidence: [] },
    { id: 'earth-with-contactor-out', assetId: 'es', position: 'closed', require: { kind: 'all', conditions: [{ kind: 'device', assetId: 'removable', axis: 'contact', value: 'open' }, { kind: 'device', assetId: 'removable', axis: 'racking', value: 'out' }] }, explanation: 'Fictional Earth Close requires contactor Open and Rack Out.', evidence: [] },
  ];
  return model;
}

describe('independent removable contactor through the session', () => {
  it('preserves contactor identity while separately opening and racking its contact', () => {
    const model = contactorFixture(); const before = structuredClone(model);
    const session = new SimulationSession(model);
    expect(session.snapshot().model.assets.find(asset => asset.id === 'removable')?.kind).toBe('contactor');
    expect(session.snapshot().switching.removable.actions!.map(action => action.label)).toEqual(['Open', 'Close', 'Rack in', 'Rack out']);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    const closed = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(closed);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' })).toEqual({ ok: true });
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('disconnected');
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' })).toEqual({ ok: true });
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'out' });
    const out = session.snapshot();
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(out);
    expect(model).toEqual(before);
  });

  it('requires explicit Open and Rack Out before the associated earth can close while preserving independent frame earth', () => {
    const session = new SimulationSession(contactorEarthFixture());
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('es', 'closed').ok).toBe(false);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('es', 'closed').ok).toBe(true);
    const earthed = session.snapshot();
    expect(earthed.connectivity.load.sourceStatus).toBe('disconnected');
    expect(earthed.connectivity.load.earthIds).toEqual(['load-earth']);
    expect(earthed.connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(earthed.connectivity.supply.earthIds).toEqual([]);
    expect(earthed.conflicts).toEqual([]);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(earthed);
    expect(session.changeDevice('es', 'open').ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'closed' }).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.snapshot().connectivity.load.earthIds).toEqual([]);
  });

  it('roundtrips contactor format2 files without changing legacy format1 or existing breaker format2 packages', () => {
    const model = contactorFixture(); const session = new SimulationSession(model);
    expect(session.saveScenario().formatVersion).toBe(2);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    const file = session.saveScenario(); const matching = new SimulationSession(model);
    expect(matching.loadScenario(JSON.parse(JSON.stringify(file)))).toEqual({ ok: true });
    expect(matching.snapshot().mode).toBe('exploration');
    expect(matching.saveScenario()).toEqual(file);
    expect(matching.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'out' });
    const legacy = new SimulationSession(singleSupply).saveScenario();
    expect(legacy.formatVersion).toBe(1);
    expect(matching.loadScenario(JSON.parse(JSON.stringify(legacy)))).toEqual({ ok: true });
    expect(matching.saveScenario()).toEqual(legacy);
    expect(matching.saveScenario().model).toEqual(singleSupply);
    const breaker = new SimulationSession(removableBreakerModel).saveScenario();
    expect(breaker.formatVersion).toBe(2);
    expect(breaker.model).toEqual(removableBreakerModel);
    expect(breaker.model.assets[1]).not.toHaveProperty('removableContactor');
    expect(matching.loadScenario(JSON.parse(JSON.stringify(breaker)))).toEqual({ ok: true });
    expect(matching.saveScenario()).toEqual(breaker);
  });

  it('rejects ambiguous, wrong-kind, fixed-pair and malformed mechanism declarations atomically', () => {
    const session = new SimulationSession(singleSupply); const before = session.snapshot();
    const corruptions: ((model: NetworkModel) => void)[] = [
      model => { const asset = model.assets[1]; asset.kind = 'breaker'; asset.removableBreaker = structuredClone(asset.removableContactor!); },
      model => { model.assets[1].kind = 'breaker'; },
      model => { model.assets[1].kind = 'disconnector'; },
      model => { model.assets[1].positions = [{ id: 'closed', label: 'Closed', pairs: [] }]; },
      model => { model.assets[1].removableContactor!.mainPair = ['removable:in', 'removable:in']; },
      model => { model.assets[1].removableContactor!.mainPair = ['removable:in', 'missing']; },
      model => { model.assets[1].conductivePairs.push(['removable:in', 'removable:out']); },
      model => { model.assets[1].sourcePairs = [['removable:out', 'removable:in']]; },
      model => { model.assets[1].earthPairs = [['removable:in', 'removable:out']]; },
      model => { model.assets[1].sourceArcs = []; },
      model => { model.starting.devices.removable = null; },
      model => { model.starting.devices.removable = 'closed'; },
      model => { delete model.starting.devices.removable; },
      model => { delete model.assets[1].removableContactor; },
    ];
    for (const corrupt of corruptions) {
      const model = contactorFixture(); corrupt(model);
      expect(session.loadModel(model).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
    const model = contactorFixture();
    for (const declaration of [null, {}, { mainPair: ['removable:in'] }, { mainPair: ['removable:in', 'removable:out'], extra: true }]) {
      expect(session.loadModel({ ...model, assets: model.assets.map(asset => asset.id === 'removable' ? { ...asset, removableContactor: declaration } : asset) }).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
    for (const state of [{ contact: 'open' }, { contact: 'open', racking: 'test' }, { contact: 'open', racking: 'in', extra: true }]) {
      expect(session.loadModel({ ...model, starting: { ...model.starting, devices: { removable: state } } }).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
    const valid = new SimulationSession(contactorFixture()).saveScenario();
    for (const broken of [
      { ...valid, formatVersion: 1 },
      { ...valid, devices: { removable: { contact: 'open' } } },
      { ...valid, devices: { removable: { contact: 'open', racking: 'test' } } },
      { ...valid, devices: { removable: { contact: 'open', racking: 'in', extra: true } } },
      { ...valid, devices: { removable: { contact: 'open', racking: 'in' }, extra: null } },
    ]) {
      expect(session.loadScenario(broken).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });

  it.each([
    ['open', null, 'disconnected', false, true],
    ['closed', null, 'unconfirmed', false, false],
    [null, 'in', 'unconfirmed', true, false],
    [null, 'out', 'disconnected', false, false],
    [null, null, 'unconfirmed', false, false],
  ] as const)('keeps contact %s / rack %s unknown independently and blocks unknown earth prerequisites', (contact, racking, sourceStatus, contactAllowed, rackAllowed) => {
    const model = contactorEarthFixture(); model.starting.devices.removable = { contact, racking };
    const session = new SimulationSession(model); const before = session.snapshot();
    expect(before.connectivity.load.sourceStatus).toBe(sourceStatus);
    expect(before.connectivity.removable.terminalEarths['removable:frame']).toEqual(['frame-earth']);
    expect(before.switching.removable.actions!.filter(action => action.command.kind === 'contact').every(action => action.allowed === contactAllowed)).toBe(true);
    expect(before.switching.removable.actions!.filter(action => action.command.kind === 'racking').every(action => action.allowed === rackAllowed)).toBe(true);
    const earthClose = session.changeDevice('es', 'closed');
    expect(earthClose.ok).toBe(false);
    if (contact !== 'closed' && racking !== 'in') expect(earthClose).toMatchObject({ error: expect.stringMatching(/Unconfirmed/i) });
    expect(session.snapshot()).toEqual(before);
    const file = session.saveScenario(); const matching = new SimulationSession(model);
    expect(matching.loadScenario(file).ok).toBe(true);
    expect(matching.saveScenario()).toEqual(file);
    if (rackAllowed) {
      expect(session.changeDevice('removable', { kind: 'racking', value: 'in' }).ok).toBe(true);
      expect(session.undo().ok).toBe(true);
      expect(session.snapshot().devices.removable).toEqual({ contact, racking });
    }
  });

  it('rejects malformed commands and absent or unresolved reviews without changing any state or history', () => {
    const session = new SimulationSession(contactorFixture()); const before = session.snapshot();
    for (const invalid of [{ kind: 'contact', value: 'in' }, { kind: 'racking', value: 'closed' }, { kind: 'contact', value: 'open', extra: true }, { kind: 'earth', value: 'open' }, null, 1]) {
      expect(session.changeDevice('removable', JSON.parse(JSON.stringify(invalid))).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
    expect(session.changeDevice('removable', 'open').ok).toBe(false);
    expect(session.changeDevice('supply', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.snapshot()).toEqual(before);
    for (const status of ['missing', 'unresolved'] as const) {
      const model = contactorFixture();
      if (status === 'missing') model.interlocks = undefined;
      else model.interlocks!.reviews[0].status = 'unresolved';
      const blocked = new SimulationSession(model); const initial = blocked.snapshot();
      expect(initial.switching.removable.actions!.every(action => !action.allowed)).toBe(true);
      expect(blocked.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(false);
      expect(blocked.snapshot()).toEqual(initial);
    }
  });

  it('keeps deep independent-axis history, no-op actions, reset and legacy breaker history compatible', () => {
    const session = new SimulationSession(contactorFixture());
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.snapshot().history).toHaveLength(1);
    expect(session.changeDevice('removable', { kind: 'racking', value: 'out' }).ok).toBe(true);
    const detached = session.snapshot();
    expect(detached.history).toMatchObject([
      { kind: 'contactor', from: { contact: 'closed', racking: 'in' }, to: { contact: 'open', racking: 'in' } },
      { kind: 'contactor', from: { contact: 'open', racking: 'in' }, to: { contact: 'open', racking: 'out' } },
    ]);
    const action = detached.history[0];
    if (action.kind === 'contactor') { action.from.contact = null; action.to.racking = null; }
    const detachedState = detached.devices.removable;
    if (typeof detachedState === 'object' && detachedState !== null) detachedState.contact = 'closed';
    expect(session.snapshot().history[0]).toMatchObject({ from: { contact: 'closed', racking: 'in' }, to: { contact: 'open', racking: 'in' } });
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'out' });
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'open', racking: 'in' });
    expect(session.reset().ok).toBe(true);
    expect(session.snapshot().devices.removable).toEqual({ contact: 'closed', racking: 'in' });
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    expect(session.snapshot().history).toEqual([]);
    expect(session.changeSource('fictional-source', false).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('disconnected');
    expect(session.snapshot().devices.removable).toEqual({ contact: 'closed', racking: 'in' });
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceStatus).toBe('connected');
    const breaker = new SimulationSession(removableBreakerModel);
    expect(breaker.changeDevice('removable', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(breaker.snapshot().history[0].kind).toBe('breaker');
  });

  it('opens historical contactor scenarios view-only and rejects changed mechanism packages under the same version', () => {
    const model = contactorFixture(); const current = new SimulationSession(model);
    const historical = structuredClone(model); historical.version = 'contactor-historical';
    historical.starting.devices.removable = { contact: 'open', racking: null };
    const file = new SimulationSession(historical).saveScenario();
    expect(current.loadScenario(file)).toEqual({ ok: true });
    expect(current.saveScenario()).toEqual(file);
    expect(current.snapshot().mode).toBe('view-only');
    expect(current.snapshot().switching.removable.actions!.every(action => !action.allowed)).toBe(true);
    const before = current.snapshot();
    for (const attempt of [
      () => current.changeDevice('removable', { kind: 'contact', value: 'open' }),
      () => current.changeDevice('removable', { kind: 'contact', value: 'closed' }),
      () => current.changeDevice('removable', { kind: 'racking', value: 'in' }),
      () => current.changeDevice('removable', { kind: 'racking', value: 'out' }),
      () => current.changeSource('fictional-source', false), () => current.undo(), () => current.reset(),
    ]) {
      expect(attempt()).toMatchObject({ ok: false, error: expect.stringContaining('View-only') });
      expect(current.snapshot()).toEqual(before);
    }
    const changed = structuredClone(model); changed.assets[1].kind = 'breaker';
    changed.assets[1].removableBreaker = changed.assets[1].removableContactor; delete changed.assets[1].removableContactor;
    expect(current.loadModel(changed)).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(current.snapshot()).toEqual(before);
    expect(current.loadScenario(new SimulationSession(changed).saveScenario())).toMatchObject({ ok: false, error: expect.stringContaining('immutable') });
    expect(current.snapshot()).toEqual(before);
  });
});
