import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { completeControlsNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerFuseContinuity } from '../models/site/owner-fuse-continuity';
import { withOwnerMvDriveScope } from '../models/site/owner-mv-drive-scope';
import { withOwnerMvConverterTransfers } from '../models/site/owner-mv-converter-transfers';

function prior() { return withOwnerMvDriveScope(withOwnerFuseContinuity(currentNetworkModel, 'test-converter-fuses'), 'test-converter-scope'); }
describe('owner80 simplified MV converter source transfer', () => {
  it('supplies DC and output from either input without making a metallic earth path or accepting metadata', () => {
    const base = prior(); const session = new SimulationSession(withOwnerMvConverterTransfers(base, 'test-converter-transfer7'));
    const snapshot = session.snapshot(); const before = new SimulationSession(base).snapshot(); const id = 'sw505:vs50501:converter';
    const converter = snapshot.model.assets.find(asset => asset.id === id)!;
    expect(converter.knowledge).toBe('unresolved');
    expect(converter.conductivePairs).toEqual([]); expect(converter.earthPairs).toEqual([]);
    expect(converter.sourceArcs).toHaveLength(3);
    expect(snapshot.connectivity[id].terminalSources['sw505:vs50501:dc'].length).toBeGreaterThan(0);
    expect(snapshot.connectivity[id].terminalSources['sw505:vs50501:output']).toEqual(snapshot.connectivity[id].terminalSources['sw505:vs50501:dc']);
    expect(snapshot.connectivity['sw505:sb214-em01'].sourceIds.length).toBeGreaterThan(0);
    expect(session.changeDevice('sw505:vs50501:output-switch', 'open').ok).toBe(true);
    expect(session.snapshot().connectivity['sw505:sb214-em01'].sourceIds).toEqual([]);
    expect(session.snapshot().connectivity[id].terminalSources['sw505:vs50501:output'].length).toBeGreaterThan(0);
    for (const asset of base.assets) expect(snapshot.connectivity[asset.id].terminalEarths).toEqual(before.connectivity[asset.id].terminalEarths);
  }, 30_000);

  it('uses either AC input independently and establishes no supply when both depicted input cables are absent', () => {
    for (const removed of [['d'], ['y'], ['d', 'y']]) {
      const model = withOwnerMvConverterTransfers(prior(), `test-converter-input-${removed.join('')}`);
      model.id = `synthetic-converter-input-${removed.join('')}`; model.synthetic = true; model.presentation = undefined;
      model.name = 'Fictional converter input-cable absence for software verification';
      model.connections = model.connections.filter(link => !removed.some(role => link.id === `sw505:vs50501:ac-${role}-cable`));
      const snapshot = new SimulationSession(model).snapshot();
      const result = snapshot.connectivity['sw505:vs50501:converter'];
      expect(result.terminalSources['sw505:vs50501:dc'].length > 0).toBe(removed.length === 1);
      expect(result.terminalSources['sw505:vs50501:output'].length > 0).toBe(removed.length === 1);
      for (const role of removed) expect(result.terminalSources[`sw505:vs50501:ac-${role}`]).toEqual([]);
    }
  }, 30_000);

  it('reports supplied DC earth conflicts while retaining forward supply and separate earth groups', () => {
    const session = new SimulationSession(withOwnerMvConverterTransfers(prior(), 'test-converter-dc-conflict7'));
    const before = session.snapshot().connectivity['sw505:vs50501:converter'].terminalSources['sw505:vs50501:output'];
    expect(session.changeDevice('sw505:vs50501:output-switch', 'open').ok).toBe(true);
    expect(session.changeDevice('sw505:vs50501:dc-earth', 'closed').ok).toBe(true);
    const snapshot = session.snapshot(); const result = snapshot.connectivity['sw505:vs50501:converter'];
    expect(result.terminalSources['sw505:vs50501:output']).toEqual(before);
    expect(snapshot.conflicts.some(conflict => conflict.earthId === 'sw505:vs50501:dc-earth:termination')).toBe(true);
    expect(result.terminalEarths['sw505:vs50501:dc']).toContain('sw505:vs50501:dc-earth:termination');
    expect(result.terminalEarths['sw505:vs50501:ac-d']).toEqual([]);
    expect(result.terminalEarths['sw505:vs50501:output']).toEqual([]);
    expect(session.changeDevice('sw505:vs50501:output-switch', 'closed').ok).toBe(false);
  }, 25_000);

  it('guards all five exact source bindings and leaves interlocks, metadata, earths and baseline unchanged', () => {
    const base = prior(); const model = withOwnerMvConverterTransfers(base, 'test-converter-inventory7');
    const snapshot = new SimulationSession(model).snapshot();
    expect(snapshot.model.assets.flatMap(asset => asset.sourceArcs ?? []).filter(arc => arc.id.startsWith('WN-MV-CONVERTER-FORWARD-POLICY:'))).toHaveLength(15);
    expect(model.interlocks).toEqual(base.interlocks); expect(model.starting).toEqual(base.starting);
    expect(model.connections).toEqual(base.connections); expect(model.earths).toEqual(base.earths); expect(model.boundaries).toEqual(base.boundaries);
    for (const mutate of [
      (candidate: typeof model) => { candidate.evidence = candidate.evidence!.filter(record => record.id !== 'WN-MV-DRIVE-SCOPE'); },
      (candidate: typeof model) => { candidate.connections.find(link => link.id === 'hpgr:tf003:star-to-converter')!.to = 'hpgr:drive-mea:converter:ac-star'; },
      (candidate: typeof model) => { candidate.assets.find(asset => asset.id === 'sw505:vs50502:converter')!.earthPairs = [['sw505:vs50502:dc', 'sw505:vs50502:output']]; },
    ]) {
      const candidate = structuredClone(base); mutate(candidate);
      expect(() => withOwnerMvConverterTransfers(candidate, 'test-stale-converter7')).toThrow(/Review required/);
    }
    expect(() => withOwnerMvConverterTransfers(base, base.version)).toThrow();
    expect(() => withOwnerMvConverterTransfers(model, 'test-converter-repeated8')).toThrow();
  }, 20_000);
});
