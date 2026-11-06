import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { rerouteSw454ToSw505 } from './sw454-sw505-single-route-candidate';

describe('isolated SW454 to SW505 cable detour', () => {
  it('compares the targeted cable against the complete production route graph', () => {
    const model = currentNetworkModel;
    const network = continuousNetwork(model);
    const candidate = rerouteSw454ToSw505(model, network);
    const byId = new Map(model.connections.map(connection => [connection.id, connection]));
    const summarize = (routes: ReadonlyMap<string, readonly (readonly [number, number])[]>) => {
      const geometryRoutes: GeometryRoute[] = [...routes].flatMap(([id, points]) => {
        const connection = byId.get(id);
        return connection ? [{ id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
      });
      const findings = validateDiagramGeometry({
        routes: geometryRoutes,
        roomFrames: network.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
      });
      return {
        crossings: findings.filter(item => item.type === 'route-crossing').length,
        targetCrossings: findings.filter(item => item.type === 'route-crossing' && item.routeIds.includes('sw454:sw505:cable-SW505-P-01')).length,
        sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
        endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
        missingRoutes: model.connections.length - routes.size,
      };
    };
    const before = summarize(network.routes);
    const after = candidate.applied ? summarize(candidate.routes) : undefined;
    console.info('SW454-SW505 route candidate', {
      applied: candidate.applied,
      reason: candidate.applied ? undefined : candidate.reason,
      before,
      after,
      original: candidate.applied ? candidate.original : network.routes.get('sw454:sw505:cable-SW505-P-01'),
      replacement: candidate.applied ? candidate.replacement : undefined,
      bounds: network.view.bounds,
    });
    expect(network.routes.size).toBe(model.connections.length);
  }, 120_000);
});
