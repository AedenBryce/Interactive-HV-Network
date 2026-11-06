import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { shiftSw426AndRm714Candidate } from './sw426-rm714-joint-shift-candidate';

function audit(model: typeof currentNetworkModel, geometry: ReturnType<typeof shiftSw426AndRm714Candidate>['base']) {
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
      endpointOnInteriorContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      routeFrameContacts: findings.filter(item => item.type === 'route-room-frame').length,
      roomFrameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      bounds: geometry.view.bounds,
      widthToHeight: +(geometry.view.bounds[2] / geometry.view.bounds[3]).toFixed(3),
      nonOrthogonalSegments: routes.reduce((sum, route) => sum + route.points.slice(1).filter((point, index) =>
        point[0] !== route.points[index][0] && point[1] !== route.points[index][1],
      ).length, 0),
    },
  };
}

describe('isolated SW426 + RM714 joint room shift', () => {
  it('reports full-graph crossing, contact, frame, and bounds deltas', () => {
    const model = currentNetworkModel;
    const { base, candidate, movedAssetIds, movedRoomIds, shift, join } = shiftSw426AndRm714Candidate(model);
    const baseAudit = audit(model, base);
    const candidateAudit = audit(model, candidate);
    const expectedIds = new Set(model.connections.map(connection => connection.id));
    const actualIds = new Set(candidate.routes.keys());
    const movedEndpointConnections = model.connections.filter(connection => {
      const from = base.owners.get(connection.from) ?? '';
      const to = base.owners.get(connection.to) ?? '';
      return movedAssetIds.includes(from) !== movedAssetIds.includes(to);
    }).map(connection => connection.id);
    const report = {
      movedRoomIds,
      shift,
      movedAssetCount: movedAssetIds.length,
      movedEndpointConnections,
      sw426JoinPoints: join.points,
      base: baseAudit.summary,
      candidate: candidateAudit.summary,
      delta: {
        crossings: candidateAudit.summary.crossings - baseAudit.summary.crossings,
        sharedRouteLengths: candidateAudit.summary.sharedRouteLengths - baseAudit.summary.sharedRouteLengths,
        endpointOnInteriorContacts: candidateAudit.summary.endpointOnInteriorContacts - baseAudit.summary.endpointOnInteriorContacts,
        routeFrameContacts: candidateAudit.summary.routeFrameContacts - baseAudit.summary.routeFrameContacts,
        roomFrameOverlaps: candidateAudit.summary.roomFrameOverlaps - baseAudit.summary.roomFrameOverlaps,
        boundsWidth: candidateAudit.summary.bounds[2] - baseAudit.summary.bounds[2],
        boundsHeight: candidateAudit.summary.bounds[3] - baseAudit.summary.bounds[3],
      },
      newSw426Crossings: candidateAudit.findings.filter(item => item.type === 'route-crossing' && item.routeIds.includes('whole:join:sw426')),
      nonOrthogonal: candidateAudit.summary.nonOrthogonalSegments,
    };
    console.log(JSON.stringify(report, null, 2));
    expect(actualIds).toEqual(expectedIds);
    expect(candidateAudit.summary.placedAssets).toBe(model.assets.length);
    expect(candidateAudit.summary.nonOrthogonalSegments).toBe(0);
  }, 180_000);
});
