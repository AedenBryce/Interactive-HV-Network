import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { electricalPolicyNetworkModel as policyNetworkModel } from '../models/site/current-network';
import { withOwnerDropTowerBranch } from '../models/site/owner-drop-tower-branch';

describe('owner83/86–89 Drop Tower branch through SimulationSession', () => {
  it('includes the confirmed route, selected HV actions and forward transformer transfer, ending at the transformer', () => {
    const session = new SimulationSession(withOwnerDropTowerBranch(policyNetworkModel, 'test-drop-tower8'));
    const snapshot = session.snapshot();
    for (const id of ['drop-tower:abs:p18-1', 'drop-tower:abs:p18-8']) {
      expect(snapshot.devices[id]).toBe('closed');
      expect(snapshot.switching[id].positions.every(position => position.allowed)).toBe(true);
      expect(snapshot.model.assets.find(asset => asset.id === id)?.removableDisconnector).toBeUndefined();
    }
    expect(snapshot.connectivity['drop-tower:tf:p18-8'].terminalSources['drop-tower:tf:p18-8:lv'].length).toBeGreaterThan(0);
    expect(snapshot.model.assets.some(asset => asset.id.startsWith('drop-tower:') && asset.kind === 'bus')).toBe(false);
    expect(snapshot.model.connections.some(link => link.from === 'drop-tower:tf:p18-8:lv' || link.to === 'drop-tower:tf:p18-8:lv')).toBe(false);
    expect(snapshot.model.assets.some(asset => asset.id === 'drop-tower:lv-fuse')).toBe(false);
    expect(snapshot.model.boundaries).toContainEqual(expect.objectContaining({ terminal: 'drop-tower:tf:p18-8:lv', sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed' }));
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    expect(session.changeDevice('drop-tower:abs:p18-1', 'open').ok).toBe(true);
    expect(session.snapshot().connectivity['drop-tower:tf:p18-8'].sourceIds).toEqual([]);
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().connectivity['drop-tower:tf:p18-8'].sourceIds.length).toBeGreaterThan(0);
    expect(session.changeDevice('drop-tower:abs:p18-8', 'open').ok).toBe(true);
    expect(session.snapshot().connectivity['drop-tower:tf:p18-8'].sourceIds).toEqual([]);
    expect(session.reset().ok).toBe(true); expect(session.snapshot().devices['drop-tower:abs:p18-8']).toBe('closed');
  }, 30_000);

  it('rejects missing entry evidence instead of creating a confirmed route from an unsupported attachment', () => {
    const changed = structuredClone(policyNetworkModel);
    changed.connections.find(link => link.id === 'cv006:pole17-drop-tower')!.evidenceIds = [];
    expect(() => new SimulationSession(withOwnerDropTowerBranch(changed, 'test-stale-drop-tower8'))).toThrow(/Review required/);
  });
});
