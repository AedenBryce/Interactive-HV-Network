import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { completeControlsNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerFuseContinuity } from '../models/site/owner-fuse-continuity';
import proposal from '../../drawing-review/supplemental/fuse-continuity-proposal.json';

describe('owner78 intact fixed-fuse source continuity', () => {
  it('establishes the selected series source path without accepting fuse metadata or adding actions', () => {
    const before = new SimulationSession(currentNetworkModel).snapshot();
    const session = new SimulationSession(withOwnerFuseContinuity(currentNetworkModel, 'test-intact-fuses7'));
    const after = session.snapshot(); const id = 'hpgr:sw002:a02:f1';
    expect(before.connectivity[id].terminalSources[`${id}:a`].length).toBeGreaterThan(0);
    expect(before.connectivity[id].terminalSources[`${id}:b`]).toEqual([]);
    expect(after.connectivity[id].terminalSources[`${id}:b`]).toEqual(before.connectivity[id].terminalSources[`${id}:a`]);
    const fuse = after.model.assets.find(asset => asset.id === id)!;
    expect(fuse.knowledge).toBe('provisional');
    expect(fuse.kind).toBe('interface'); expect(fuse.positions).toEqual([]);
    expect(fuse.label).toContain('Intact in teaching model');
    expect(session.changeDevice(id, 'open').ok).toBe(false);
    expect(after.model.assets.flatMap(asset => asset.sourceArcs ?? []).filter(arc => arc.id.startsWith('WN-FUSE-CONTINUITY:'))).toHaveLength(62);
    expect(currentNetworkModel.assets.find(asset => asset.id === id)!.sourceArcs).toBeUndefined();
  }, 25_000);

  it('preserves all prior earth results, baseline, interlocks and unrelated electrical claims', () => {
    const before = new SimulationSession(currentNetworkModel).snapshot();
    const after = new SimulationSession(withOwnerFuseContinuity(currentNetworkModel, 'test-fuse-earth7')).snapshot();
    for (const asset of before.model.assets) {
      const old = before.connectivity[asset.id]; const selected = after.connectivity[asset.id];
      expect(selected.terminalEarths).toEqual(old.terminalEarths);
      expect(selected.earthIds).toEqual(old.earthIds);
      expect(selected.possibleEarthIds).toEqual(old.possibleEarthIds);
      expect(selected.earthRouteEdgeIds).toEqual(old.earthRouteEdgeIds);
      expect(selected.earthBoundaryIds).toEqual(old.earthBoundaryIds);
    }
    expect(after.model.assets.filter(asset => !proposal.assets.some(row => row.assetId === asset.id))).toEqual(before.model.assets.filter(asset => !proposal.assets.some(row => row.assetId === asset.id)));
    expect(after.devices).toEqual(before.devices); expect(after.sources).toEqual(before.sources);
    expect(after.model.connections).toEqual(before.model.connections);
    expect(after.model.earths).toEqual(before.model.earths);
    expect(after.model.boundaries).toEqual(before.model.boundaries);
    expect(after.model.interlocks).toEqual(before.model.interlocks);
    expect(after.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
    for (const row of proposal.assets) {
      const fuse = after.model.assets.find(asset => asset.id === row.assetId)!;
      expect(fuse.knowledge).toBe('provisional');
      expect(fuse.sourceArcs).toHaveLength(2);
      expect(fuse.earthPairs).toEqual(row.conductivePairs);
    }
  }, 25_000);

  it('supports a fictional supply on the opposite fuse terminal without inventing a fuse switch', () => {
    const model = withOwnerFuseContinuity(currentNetworkModel, 'test-fuse-reverse7');
    model.id = 'synthetic-fuse-reverse-source'; model.version = 'fictional-1'; model.synthetic = true;
    model.name = 'Fictional reverse supply for fuse software verification'; model.presentation = undefined;
    for (const id of Object.keys(model.starting.sources)) model.starting.sources[id] = false;
    model.assets.push({ id: 'fictional:source', label: 'Fictional supply; not installed equipment', kind: 'source', terminals: ['fictional:port'], conductivePairs: [], positions: [] });
    model.sources.push({ id: 'fictional:source', assetId: 'fictional:source', terminal: 'fictional:port', label: 'Fictional fuse-side supply' });
    model.connections.push({ id: 'fictional:fuse-side-feed', from: 'fictional:port', to: 'hpgr:sw002:a02:f1:b' });
    model.starting.sources['fictional:source'] = true;
    const session = new SimulationSession(model); const snapshot = session.snapshot();
    expect(snapshot.connectivity['hpgr:sw002:a02:f1'].terminalSources['hpgr:sw002:a02:f1:a']).toEqual(['fictional:source']);
    expect(snapshot.connectivity['hpgr:sw002:bus'].sourceIds).toEqual(['fictional:source']);
    expect(session.changeSource('fictional:source', false).ok).toBe(true);
    expect(session.snapshot().connectivity['hpgr:sw002:a02:f1'].sourceIds).toEqual([]);
    expect(session.undo().ok).toBe(true);
    expect(session.snapshot().connectivity['hpgr:sw002:bus'].sourceIds).toEqual(['fictional:source']);
  }, 25_000);

  it('roundtrips the selected package and retains .6 as its original view-only snapshot', () => {
    const session = new SimulationSession(withOwnerFuseContinuity(currentNetworkModel, 'test-fuse-scenarios7'));
    const selected = session.saveScenario();
    expect(session.changeSource('boundary:tf11', false).ok).toBe(true);
    expect(session.loadScenario(selected).ok).toBe(true);
    expect(session.saveScenario()).toEqual(selected);
    const original = new SimulationSession(currentNetworkModel).saveScenario();
    expect(session.loadScenario(original).ok).toBe(true);
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(original);
    expect(session.changeDevice('sw435:hpgr:cb', { kind: 'contact', value: 'open' }).ok).toBe(false);
    expect(session.reset().ok).toBe(false);
    expect(session.loadScenario(selected).ok).toBe(true);
    expect(session.snapshot().mode).toBe('exploration');
  }, 25_000);

  it('rejects changed fuse roles/claims, extra mechanisms and repeated or unversioned application', () => {
    expect(() => withOwnerFuseContinuity(currentNetworkModel, currentNetworkModel.version)).toThrow();
    for (const mutate of [
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'hpgr:sw002:a02:f1')!.conductivePairs = []; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'hpgr:sw002:a04:f1')!.earthPairs = [['hpgr:sw002:a04:f1:a', 'hpgr:sw002:a04:f1:b']]; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'rm412:f1')!.knowledge = 'supported'; },
      (model: typeof currentNetworkModel) => { model.assets.find(asset => asset.id === 'rm412:f2')!.removableDisconnector = { mainPair: ['rm412:f2:in', 'rm412:f2:out'] }; },
      (model: typeof currentNetworkModel) => { model.evidence!.find(record => record.id === 'C2-TF004-F101')!.references = []; },
    ]) {
      const changed = structuredClone(currentNetworkModel); mutate(changed);
      expect(() => withOwnerFuseContinuity(changed, 'test-stale-fuses7')).toThrow(/Review required/);
    }
    const selected = withOwnerFuseContinuity(currentNetworkModel, 'test-duplicate-fuses7');
    expect(() => withOwnerFuseContinuity(selected, 'test-duplicate-fuses8')).toThrow();
  });
});
