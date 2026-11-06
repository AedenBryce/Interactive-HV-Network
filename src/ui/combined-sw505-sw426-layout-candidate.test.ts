import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { combinedSw505Sw426LayoutCandidate } from './combined-sw505-sw426-layout-candidate';

describe('combined SW505/SW426 layout candidate', () => {
  it('composes disjoint room moves from one base layout and audits the complete route set', () => {
    const candidate = combinedSw505Sw426LayoutCandidate(currentNetworkModel);
    const count = (type: string) => candidate.findings.filter(finding => finding.type === type).length;
    const metrics = {
      assets: Object.keys(candidate.positions).length,
      terminals: Object.keys(candidate.terminals).length,
      labels: candidate.labels.size,
      frames: candidate.panels.length,
      routes: candidate.routes.size,
      crossings: count('route-crossing'),
      endpointContacts: count('route-endpoint-on-interior'),
      sharedLengths: count('shared-route-length'),
      frameContacts: count('route-room-frame'),
      frameOverlaps: count('room-frame-overlap'),
      nonOrthogonal: count('non-orthogonal'),
      movedBySw505: [...new Set(Object.keys(candidate.positions).filter(id => {
        const before = candidate.base.view.layout.assets[id]; const after = candidate.positions[id];
        return before && (before[0] !== after[0] || before[1] !== after[1]);
      }))].length,
      sw426Route: candidate.routes.get('whole:join:sw426'),
      sw505Delta: candidate.sw505.delta,
      sw426MovedAssetCount: candidate.sw426.movedAssetCount,
    };
    console.info('Combined SW505/SW426 candidate metrics', JSON.stringify(metrics, null, 2));
    expect(metrics.assets).toBe(currentNetworkModel.assets.length);
    expect(metrics.routes).toBe(currentNetworkModel.connections.length);
    expect(metrics.nonOrthogonal).toBe(0);
    expect(metrics.frameOverlaps).toBe(0);
  }, 120_000);
});
