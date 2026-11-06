import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';

function fixture(kind: 'breaker' | 'contactor' | 'disconnector' = 'breaker') {
  const field = kind === 'breaker' ? 'removableBreaker' : kind === 'contactor' ? 'removableContactor' : 'removableDisconnector';
  const evidence = [{ id: 'main-model', status: 'owner-confirmed', references: [{ document: 'Fictional main-contact contract', revision: '1' }], summary: 'Select only the fictional main-contact relationship.', confirmation: { by: 'Fictional author', date: '2026-10-23', decision: 'Selected fictional main pair' } }];
  return { model: {
    id: `synthetic-scoped-${kind}`, version: 'fictional-1', name: 'Fictional scoped removable contact', synthetic: true,
    assets: [
      { id: 'supply', label: 'Fictional supply', kind: 'source', terminals: ['supply:p'], conductivePairs: [], positions: [] },
      { id: 'switch', label: 'Fictional removable contact', kind, terminals: ['switch:in', 'switch:out', 'switch:aux'], conductivePairs: [['switch:out', 'switch:aux']], positions: [], knowledge: 'provisional', [field]: { mainPair: ['switch:in', 'switch:out'], supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: ['main-model'] } },
      { id: 'load', label: 'Fictional load', kind: 'bus', terminals: ['load:p'], conductivePairs: [], positions: [] },
    ],
    connections: [{ id: 'feed', from: 'supply:p', to: 'switch:in' }, { id: 'load', from: 'switch:out', to: 'load:p' }],
    sources: [{ id: 'supply', assetId: 'supply', terminal: 'supply:p', label: 'Fictional supply' }],
    earths: [{ id: 'ground', terminal: 'load:p', label: 'Fictional earth destination' }], evidence,
    interlocks: { reviews: [{ assetId: 'switch', status: 'confirmed-none', note: 'Fictional intrinsic mechanism guards only.', evidence: [] }], rules: [] },
    starting: { devices: { switch: { contact: 'closed', racking: 'in' } }, sources: { supply: true } },
  }, field };
}

describe('relationship-scoped removable contacts through SimulationSession', () => {
  it.each(['breaker', 'contactor', 'disconnector'] as const)('supports only the selected %s main pair while metadata and sibling pairs stay provisional', kind => {
    const { model } = fixture(kind); const session = new SimulationSession(model); const snapshot = session.snapshot();
    expect(snapshot.connectivity.load.sourceIds).toEqual(['supply']);
    expect(snapshot.connectivity.supply.earthIds).toEqual(['ground']);
    expect(snapshot.connectivity.switch.terminalSources['switch:aux']).toEqual([]);
    expect(snapshot.connectivity.switch.terminalEarths['switch:aux']).toEqual([]);
    expect(snapshot.model.assets.find(asset => asset.id === 'switch')?.knowledge).toBe('provisional');
    expect(session.changeDevice('switch', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice('switch', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.changeDevice('switch', { kind: 'racking', value: 'out' }).ok).toBe(true);
    expect(session.changeDevice('switch', { kind: 'contact', value: 'closed' }).ok).toBe(false);
  });

  it('retains unknown-axis and unresolved-claim possibilities without inventing definite paths', () => {
    const { model, field } = fixture();
    const session = new SimulationSession(model); const scenario = session.saveScenario();
    scenario.devices.switch = { contact: null, racking: 'in' };
    expect(session.loadScenario(scenario).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.snapshot().connectivity.load.possibleSourceIds).toEqual(['supply']);
    const candidate = fixture(); candidate.model.version = 'fictional-unresolved';
    Reflect.set(Reflect.get(candidate.model.assets[1], field), 'knowledge', 'unresolved');
    const unresolved = new SimulationSession(candidate.model);
    expect(unresolved.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(unresolved.snapshot().connectivity.load.possibleSourceIds).toEqual(['supply']);
  });

  it('preserves original unscoped scenarios and requires parent support for unscoped explicit claims', () => {
    const original = fixture(); original.model.version = 'fictional-legacy';
    for (const key of ['supportScope', 'knowledge', 'evidenceIds']) Reflect.deleteProperty(Reflect.get(original.model.assets[1], original.field), key);
    const saved = new SimulationSession(original.model).saveScenario();
    const session = new SimulationSession(fixture().model);
    expect(session.loadScenario(saved).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.saveScenario()).toEqual(saved); expect(session.reset().ok).toBe(false);
    const explicit = fixture(); Reflect.deleteProperty(Reflect.get(explicit.model.assets[1], explicit.field), 'supportScope');
    expect(new SimulationSession(explicit.model).snapshot().connectivity.load.sourceIds).toEqual([]);
  });

  it('rejects missing or broken scoped evidence/reviews atomically', () => {
    const session = new SimulationSession(fixture().model); const before = session.saveScenario();
    for (const missing of ['knowledge', 'evidenceIds']) {
      const candidate = fixture(); candidate.model.version = `fictional-invalid-${missing}`;
      Reflect.deleteProperty(Reflect.get(candidate.model.assets[1], candidate.field), missing);
      expect(session.loadModel(candidate.model).ok).toBe(false); expect(session.saveScenario()).toEqual(before);
    }
    for (const field of ['evidenceIds', 'reviewIds']) {
      const candidate = fixture(); candidate.model.version = `fictional-invalid-${field}`;
      Reflect.set(Reflect.get(candidate.model.assets[1], candidate.field), field, ['missing-record']);
      expect(session.loadModel(candidate.model).ok).toBe(false); expect(session.saveScenario()).toEqual(before);
    }
  });
});
