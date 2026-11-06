import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { contactNetworkModel } from '../models/site/current-network';
import { withOwnerRemainingElectricalClaims } from '../models/site/owner-remaining-electrical-claims';

describe('owner97–99 remaining model electrical claims', () => {
  it('establishes the selected Services/laboratory paths while preserving parent knowledge and original controls', () => {
    const session = new SimulationSession(withOwnerRemainingElectricalClaims(contactNetworkModel, 'test-electrical10'));
    const snapshot = session.snapshot();
    for (const id of ['rm721:bus', 'rm714:bus', 'rm714:sw714:bus', 'rm413:mc413:bus', 'rm413a:ac-input-a:boundary', 'rm413a:ac-input-b:boundary']) expect(snapshot.connectivity[id].sourceIds.length).toBeGreaterThan(0);
    expect(snapshot.model.assets.find(asset => asset.id === 'sw426:ss714:cb')?.knowledge).toBe('provisional');
    expect(snapshot.model.assets.filter(asset => asset.removableBreaker?.supportScope === 'relationship')).toHaveLength(7);
    expect(snapshot.model.earths!.filter(earth => earth.knowledge === 'owner-confirmed')).toHaveLength(18);
    expect(snapshot.model.starting).toEqual(contactNetworkModel.starting); expect(snapshot.model.interlocks).toEqual(contactNetworkModel.interlocks);
    expect(snapshot.model.assets).toHaveLength(contactNetworkModel.assets.length); expect(snapshot.model.connections).toHaveLength(contactNetworkModel.connections.length);
    expect(snapshot.model.connections.filter(link => link.knowledge === 'provisional' || link.knowledge === 'unresolved').map(link => link.id)).toEqual(contactNetworkModel.connections.filter(link => link.id.startsWith('owner-scope:line33:takeoff:')).map(link => link.id));
  }, 30_000);

  it('interrupts the laboratory supply through its selected main pair and preserves independent feeds', () => {
    const session = new SimulationSession(withOwnerRemainingElectricalClaims(contactNetworkModel, 'test-lab10'));
    expect(session.changeDevice('sw426:ss714:cb', { kind: 'racking', value: 'out' }).ok).toBe(false);
    expect(session.changeDevice('sw426:ss714:cb', { kind: 'contact', value: 'open' }).ok).toBe(true);
    expect(session.changeDevice('sw426:ss714:cb', { kind: 'racking', value: 'out' }).ok).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot.connectivity['rm714:sw714:bus'].sourceIds).toEqual([]);
    expect(snapshot.connectivity['rm721:bus'].sourceIds.length).toBeGreaterThan(0);
    expect(session.changeDevice('sw426:ss714:cb', { kind: 'contact', value: 'closed' }).ok).toBe(false);
    expect(session.reset().ok).toBe(true);
    expect(session.snapshot().connectivity['rm714:sw714:bus'].sourceIds.length).toBeGreaterThan(0);
  }, 30_000);

  it('establishes the selected cable-side ground and reports its supplied conflict without earthing the RMU bus', () => {
    const session = new SimulationSession(withOwnerRemainingElectricalClaims(contactNetworkModel, 'test-earth10'));
    expect(session.changeDevice('rm406:sw01', 'isolated').ok).toBe(true);
    expect(session.changeDevice('rm406:sw01', 'earthed').ok).toBe(true);
    const snapshot = session.snapshot();
    expect(snapshot.connectivity['rm406:sw01'].earthIds).toContain('rm406:sw01:earth-termination');
    expect(snapshot.connectivity['rm406:bus'].earthIds).not.toContain('rm406:sw01:earth-termination');
    expect(snapshot.conflicts).toContainEqual(expect.objectContaining({ sourceId: 'boundary:tf11', earthId: 'rm406:sw01:earth-termination' }));
    expect(snapshot.model.assets.find(asset => asset.id === 'rm406:sw01')?.knowledge).toBe('provisional');
  }, 30_000);

  it('rejects stale main, wire and ground mappings without changing the input package', () => {
    for (const mutate of [
      (model: typeof contactNetworkModel) => { model.assets.find(asset => asset.id === 'sw426:ss714:cb')!.removableBreaker!.mainPair.reverse(); },
      (model: typeof contactNetworkModel) => { model.connections.find(link => link.id === 'line33:station-to-recloser')!.to = 'line33:pole-1-recloser:out'; },
      (model: typeof contactNetworkModel) => { model.earths!.find(earth => earth.id === 'rm406:sw01:earth-termination')!.terminal = 'rm406:sw01:cable'; },
    ]) {
      const changed = structuredClone(contactNetworkModel); mutate(changed); const original = structuredClone(changed);
      expect(() => new SimulationSession(withOwnerRemainingElectricalClaims(changed, 'test-stale10'))).toThrow(/Review required/);
      expect(changed).toEqual(original);
    }
    expect(() => withOwnerRemainingElectricalClaims(contactNetworkModel, contactNetworkModel.version)).toThrow();
    expect(() => withOwnerRemainingElectricalClaims(withOwnerRemainingElectricalClaims(contactNetworkModel, 'test-once10'), 'test-twice10')).toThrow();
  });
});
