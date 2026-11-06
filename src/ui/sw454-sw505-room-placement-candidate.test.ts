import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { placeSw505BelowSw454 } from './sw454-sw505-room-placement-candidate';

describe('isolated SW505 room placement candidate', () => {
  it('moves only SW505 below SW454 and audits all resulting routes', () => {
    const model = currentNetworkModel;
    const network = continuousNetwork(model);
    const candidate = placeSw505BelowSw454(model, network);
    const byId = new Map(model.connections.map(connection => [connection.id, connection]));
    const summarize = (routes: ReadonlyMap<string, readonly (readonly [number, number])[]>, panels = network.panels) => {
      const geometryRoutes: GeometryRoute[] = [...routes].flatMap(([id, points]) => {
        const connection = byId.get(id);
        return connection ? [{ id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
      });
      const findings = validateDiagramGeometry({
        routes: geometryRoutes,
        roomFrames: panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
      });
      return {
        routeCount: routes.size,
        crossings: findings.filter(item => item.type === 'route-crossing').length,
        targetCrossings: findings.filter(item => item.type === 'route-crossing' && item.routeIds.includes('sw454:sw505:cable-SW505-P-01')).length,
        sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
        endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
        nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
        routeFrameContacts: findings.filter(item => item.type === 'route-room-frame').length,
      };
    };
    const before = summarize(network.routes);
    const after = candidate.applied ? summarize(candidate.routes, candidate.panels) : undefined;
    console.info('SW454-SW505 room placement candidate', {
      applied: candidate.applied,
      reason: candidate.applied ? undefined : candidate.reason,
      details: candidate,
      before,
      after,
    });
    expect(network.routes.size).toBe(model.connections.length);
  }, 120_000);
});
