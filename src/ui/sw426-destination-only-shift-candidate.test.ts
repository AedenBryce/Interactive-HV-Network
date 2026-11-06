import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { shiftSw426DestinationOnly } from './sw426-destination-only-shift-candidate';

describe('isolated SW426 destination-only room shift', () => {
  it('preserves all assets/routes and measures full-graph geometry deltas', () => {
    const model = currentNetworkModel;
    const result = shiftSw426DestinationOnly(model);
    const makeAudit = (geometry: typeof result.base) => {
      const routes: GeometryRoute[] = model.connections.flatMap(connection => {
        const points = geometry.routes.get(connection.id);
        return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
      });
      const findings = validateDiagramGeometry({
        routes,
        roomFrames: geometry.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
      });
      return {
        findings,
        summary: {
          placedAssets: Object.keys(geometry.view.layout.assets).length,
          routedConnections: geometry.routes.size,
          crossings: findings.filter(item => item.type === 'route-crossing').length,
          sharedRouteLengths: findings.filter(item => item.type === 'shared-route-length').length,
          endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
          routeFrameContacts: findings.filter(item => item.type === 'route-room-frame').length,
          roomFrameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
          bounds: geometry.view.bounds,
          aspect: +(geometry.view.bounds[2] / geometry.view.bounds[3]).toFixed(3),
          nonOrthogonal: routes.reduce((sum, route) => sum + route.points.slice(1).filter((point, index) =>
            point[0] !== route.points[index][0] && point[1] !== route.points[index][1],
          ).length, 0),
        },
      };
    };
    const before = makeAudit(result.base);
    const after = makeAudit(result.candidate);
    const routeIds = new Set(result.candidate.routes.keys());
    const expectedRouteIds = new Set(model.connections.map(connection => connection.id));
    const report = {
      movedRoomIds: result.movedRoomIds,
      movedAssetCount: result.movedAssetIds.length,
      sourceEndpointAssetId: result.sourceEndpointAssetId,
      destinationEndpointAssetId: result.destinationEndpointAssetId,
      shift: result.shift,
      join: result.candidate.routes.get('whole:join:sw426'),
      base: before.summary,
      candidate: after.summary,
      delta: {
        crossings: after.summary.crossings - before.summary.crossings,
        sharedRouteLengths: after.summary.sharedRouteLengths - before.summary.sharedRouteLengths,
        endpointOnInterior: after.summary.endpointOnInterior - before.summary.endpointOnInterior,
        routeFrameContacts: after.summary.routeFrameContacts - before.summary.routeFrameContacts,
        frameOverlaps: after.summary.roomFrameOverlaps - before.summary.roomFrameOverlaps,
        boundsWidth: after.summary.bounds[2] - before.summary.bounds[2],
        boundsHeight: after.summary.bounds[3] - before.summary.bounds[3],
      },
      crossingsOnJoin: after.findings.filter(item => item.type === 'route-crossing' && item.routeIds.includes('whole:join:sw426')),
    };
    console.log(JSON.stringify(report, null, 2));
    expect(routeIds).toEqual(expectedRouteIds);
    expect(after.summary.placedAssets).toBe(model.assets.length);
    expect(result.sourceEndpointAssetId).toBe('sw411:tier-14:interface');
    expect(result.destinationEndpointAssetId).toBe('sw426:interface:sw411');
    expect(result.candidate.view.layout.assets[result.sourceEndpointAssetId]).toEqual(result.base.view.layout.assets[result.sourceEndpointAssetId]);
    expect(after.summary.nonOrthogonal).toBe(0);
  }, 180_000);
});
