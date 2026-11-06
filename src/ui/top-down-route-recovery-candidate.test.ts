import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { recoverTopDownRoutes } from './top-down-route-recovery-candidate';

describe('isolated top-down route recovery candidate', () => {
  it('reports full-model coverage and geometry after retrying unresolved routes', () => {
    const model = currentNetworkModel;
    const candidate = recoverTopDownRoutes(model, 'topology-staggered');
    const findings = candidate.findings;
    const metrics = {
      assets: model.assets.length,
      positioned: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routes.size,
      missing: candidate.connectionsWithoutRoute.length,
      retry: { requested: candidate.retry.requested, routed: candidate.retry.routed, unresolvedByReason: Object.groupBy(candidate.retry.unresolved, item => item.reason) },
      bounds: candidate.bounds,
      aspect: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
      crossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
    };
    console.info('top-down route recovery candidate metrics', metrics);
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
  }, 120_000);
});
