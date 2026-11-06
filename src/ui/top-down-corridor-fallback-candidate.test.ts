import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { completeTopDownWithCorridors } from './top-down-corridor-fallback-candidate';

describe('isolated top-down outer-corridor fallback', () => {
  it('reports route completion and full rendered-geometry conflicts', () => {
    const model = currentNetworkModel;
    const candidate = completeTopDownWithCorridors(model, 'topology-staggered');
    const metrics = {
      assets: model.assets.length,
      positionedAssets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routedConnections: candidate.routes.size,
      missingConnections: candidate.connectionsWithoutRoute.length,
      aspectRatio: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
      routeCoverage: candidate.corridorReport,
      crossings: candidate.findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: candidate.findings.filter(item => item.type === 'shared-route-length').length,
      endpointOnInterior: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      frameOverlaps: candidate.findings.filter(item => item.type === 'room-frame-overlap').length,
      unrelatedFrameCuts: candidate.findings.filter(item => item.type === 'route-room-frame').length,
      nonOrthogonal: candidate.findings.filter(item => item.type === 'non-orthogonal').length,
    };
    console.info('top-down outer-corridor fallback metrics', metrics);
    expect(metrics.positionedAssets).toBe(metrics.assets);
    expect(candidate.routes.size).toBeLessThanOrEqual(metrics.connections);
  }, 120_000);
});
