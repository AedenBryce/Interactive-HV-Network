import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { continuationNetworkModel } from '../models/site/current-network';
import { withOwnerTf406bRoute } from '../models/site/owner-tf406b-route';
import { withOwnerSelectorContacts } from '../models/site/owner-selector-contacts';

describe('owner93/94 selected internal selector contacts', () => {
  it('establishes Service paths and earths only the incoming cable side, leaving the RM406 bus disconnected', () => {
    const base = withOwnerTf406bRoute(continuationNetworkModel, 'test-selector-input9');
    const session = new SimulationSession(withOwnerSelectorContacts(base, 'test-selector9'));
    expect(session.snapshot().connectivity['rm406:mc406a:bus'].sourceIds).toContain('boundary:tf11');
    expect(session.changeDevice('rm406:sw01', 'isolated').ok).toBe(true);
    expect(session.changeDevice('rm406:sw01', 'earthed').ok).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot.connectivity['rm406:bus'].earthIds).not.toContain('rm406:sw01:earth-termination');
    expect(snapshot.model.assets.find(asset => asset.id === 'rm406:sw01')?.positions.find(position => position.id === 'earthed')?.pairs).toEqual([['rm406:sw01:line', 'rm406:sw01:earth']]);
    expect(snapshot.connectivity['rm406:sw01'].possibleEarthIds).toContain('rm406:sw01:earth-termination');
    expect(snapshot.connectivity['rm406:bus'].possibleEarthIds).not.toContain('rm406:sw01:earth-termination');
    expect(snapshot.possibleConflicts).toContainEqual(expect.objectContaining({ sourceId: 'boundary:tf11', earthId: 'rm406:sw01:earth-termination' }));
    expect(snapshot.model.starting).toEqual(base.starting); expect(snapshot.model.interlocks).toEqual(base.interlocks);
    expect(snapshot.model.assets.find(asset => asset.id === 'rm406:sw01')?.knowledge).toBe('provisional');
    expect(snapshot.model.earths).toEqual(base.earths);
  }, 30_000);

  it('selects all17 matrices without rewriting equipment/termination knowledge or the old package', () => {
    const old = new SimulationSession(continuationNetworkModel).saveScenario();
    const session = new SimulationSession(withOwnerSelectorContacts(continuationNetworkModel, 'test-selector-inventory9'));
    const { model } = session.saveScenario();
    expect(model.assets.flatMap(asset => asset.positions).filter(position => position.supportScope === 'relationship')).toHaveLength(57);
    for (const id of ['rm406:sw01', 'rm410:sw01', 'wh:h1:rm417:sw01', 'wh:h1:rm417:sw02', 'wh:h9:rm419:sw01', 'wh:h9:rm419:sw02']) {
      expect(model.assets.find(asset => asset.id === id)?.positions.find(position => position.id === 'earthed')?.pairs).toEqual([[`${id}:line`, `${id}:earth`]]);
    }
    expect(model.assets.find(asset => asset.id === 'rm413a:es-q8:lower')?.positions.find(position => position.id === 'earthed')?.pairs).toEqual([['rm413a:es-q8:lower:cable', 'rm413a:es-q8:lower:earth']]);
    expect(model.earths).toEqual(old.model.earths);
    expect(model.starting).toEqual(old.model.starting); expect(model.interlocks).toEqual(old.model.interlocks);
    expect(session.loadScenario(old).ok).toBe(true); expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(old); expect(session.reset().ok).toBe(false);
    expect(new SimulationSession(continuationNetworkModel).saveScenario()).toEqual(old);
  });

  it('rejects changed cable roles and preexisting contact claims before applying owner decisions', () => {
    for (const mutate of [
      (model: typeof continuationNetworkModel) => { model.connections.find(link => link.id === 'rm406:incoming-bar')!.from = 'rm406:sw01:line'; },
      (model: typeof continuationNetworkModel) => { model.assets.find(asset => asset.id === 'wh:h9:rm419:sw02')!.positions.find(position => position.id === 'service')!.pairs = []; },
      (model: typeof continuationNetworkModel) => { model.earths = model.earths!.filter(earth => earth.terminal !== 'rm413a:es-q8:lower:earth'); },
    ]) {
      const changed = structuredClone(continuationNetworkModel); mutate(changed);
      expect(() => new SimulationSession(withOwnerSelectorContacts(changed, 'test-stale-selector9'))).toThrow(/Review required/);
    }
    expect(() => withOwnerSelectorContacts(continuationNetworkModel, continuationNetworkModel.version)).toThrow();
    expect(() => withOwnerSelectorContacts(withOwnerSelectorContacts(continuationNetworkModel, 'test-selector-once9'), 'test-selector-twice9')).toThrow();
  });
});
