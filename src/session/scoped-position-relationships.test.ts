import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';

function fixture() {
  const evidence = [{ id: 'selected-position', status: 'owner-confirmed', summary: 'Fictional position relationship only; actual metadata unconfirmed.', references: [{ document: 'Fictional position contract', revision: '1' }], confirmation: { by: 'Fictional author', date: '2026-10-23', decision: 'Select the exact position relationships.' } }];
  const claim = { supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: ['selected-position'] };
  return {
    id: 'synthetic-scoped-position', version: 'fictional-1', name: 'Fictional scoped selector', synthetic: true,
    assets: [
      { id: 'supply', label: 'Fictional supply', kind: 'source', terminals: ['supply:p'], conductivePairs: [], positions: [] },
      { id: 'selector', label: 'Fictional selector, metadata unconfirmed', kind: 'disconnector', knowledge: 'provisional', terminals: ['selector:in', 'selector:out', 'selector:earth'], conductivePairs: [], positions: [
        { id: 'service', label: 'Service', pairs: [['selector:in', 'selector:out']], ...claim },
        { id: 'isolated', label: 'Isolated', pairs: [], ...claim },
        { id: 'earthed', label: 'Earthed', pairs: [['selector:out', 'selector:earth']], ...claim },
      ] },
      { id: 'load', label: 'Fictional load', kind: 'bus', terminals: ['load:p'], conductivePairs: [], positions: [] },
    ],
    connections: [{ id: 'feed', from: 'supply:p', to: 'selector:in' }, { id: 'load-cable', from: 'selector:out', to: 'load:p' }],
    sources: [{ id: 'supply', assetId: 'supply', terminal: 'supply:p', label: 'Fictional supply' }],
    earths: [{ id: 'earth', terminal: 'selector:earth', label: 'Fictional earth' }], evidence,
    interlocks: { reviews: [{ assetId: 'selector', status: 'confirmed-none', note: 'Fictional fixture permits each position.', evidence: [] }], rules: [] },
    starting: { devices: { selector: 'service' }, sources: { supply: true } },
  };
}

describe('relationship-scoped position claims through the public session', () => {
  it('establishes only the selected position paths while preserving provisional equipment metadata', () => {
    const session = new SimulationSession(fixture());
    expect(session.snapshot().connectivity.load.sourceIds).toEqual(['supply']);
    expect(session.snapshot().model.assets.find(asset => asset.id === 'selector')?.knowledge).toBe('provisional');
    expect(session.changeDevice('selector', 'isolated').ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.changeDevice('selector', 'earthed').ok).toBe(true);
    expect(session.snapshot().connectivity.load.earthIds).toEqual(['earth']);
    expect(session.snapshot().connectivity.supply.earthIds).toEqual([]);
    expect(session.snapshot().conflicts).toEqual([]);
  });

  it('keeps null positions conservative and respects unresolved position claims', () => {
    const model = fixture(); model.assets[1].positions[0].knowledge = 'unresolved';
    const session = new SimulationSession(model);
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.snapshot().connectivity.load.possibleSourceIds).toEqual(['supply']);
    const saved = session.saveScenario(); saved.devices.selector = null;
    expect(session.loadScenario(saved).ok).toBe(true);
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.snapshot().connectivity.load.earthIds).toEqual([]);
    expect(session.snapshot().connectivity.load.possibleEarthIds).toEqual(['earth']);
  });

  it('preserves unscoped historical position behavior and scenario content', () => {
    const model = fixture(); model.version = 'fictional-legacy';
    for (const position of model.assets[1].positions) for (const key of ['supportScope', 'knowledge', 'evidenceIds']) Reflect.deleteProperty(position, key);
    const original = new SimulationSession(model).saveScenario();
    const session = new SimulationSession(fixture());
    expect(session.loadScenario(original).ok).toBe(true);
    expect(session.saveScenario()).toEqual(original);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().connectivity.load.sourceIds).toEqual([]);
    expect(session.changeDevice('selector', 'earthed').ok).toBe(false);
    expect(session.reset().ok).toBe(false);
  });

  it('rejects scoped positions with missing claim/evidence or broken evidence references atomically', () => {
    const session = new SimulationSession(fixture()); const before = session.saveScenario();
    for (const missing of ['knowledge', 'evidenceIds']) {
      const candidate = fixture(); candidate.version = `invalid-${missing}`;
      Reflect.deleteProperty(candidate.assets[1].positions[0], missing);
      expect(session.loadModel(candidate).ok).toBe(false);
      expect(session.saveScenario()).toEqual(before);
    }
    const broken = fixture(); broken.version = 'invalid-reference'; broken.assets[1].positions[0].evidenceIds = ['missing-record'];
    expect(session.loadModel(broken).ok).toBe(false);
    expect(session.saveScenario()).toEqual(before);
  });
});
