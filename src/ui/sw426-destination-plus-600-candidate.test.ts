import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { sw426DestinationPlus600Candidate } from './sw426-destination-plus-600-candidate';

function metrics(findings: ReturnType<typeof validateDiagramGeometry>) {
  return {
    crossings: findings.filter(item => item.type === 'route-crossing').length,
    endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
    sharedLength: findings.filter(item => item.type === 'shared-route-length').reduce((sum, item) => sum + item.length, 0),
    frameContacts: findings.filter(item => item.type === 'route-room-frame').length,
    roomOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
    nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
  };
}

describe('SW426 destination plus 600 isolated candidate', () => {
  it('audits the single +16,296 x move against production geometry', () => {
    const result = sw426DestinationPlus600Candidate(currentNetworkModel);
    const baseFrames = result.base.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }));
    const baseFindings = validateDiagramGeometry({
      routes: [...result.base.routes].map(([id, points]): GeometryRoute => {
        const connection = currentNetworkModel.connections.find(item => item.id === id)!;
        return { id, points, terminals: [connection.from, connection.to] };
      }), roomFrames: baseFrames,
    });
    console.log(JSON.stringify({
      movedAssetCount: result.movedAssetCount,
      movedAssetIds: result.movedAssetIds,
      base: metrics(baseFindings),
      candidate: metrics(result.findings),
      frameContactDelta: result.findings.filter(item => item.type === 'route-room-frame')
        .filter(item => !baseFindings.some(base => base.type === 'route-room-frame' && base.routeId === item.routeId && base.roomFrameId === item.roomFrameId && base.segmentIndex === item.segmentIndex && base.relation === item.relation)),
      routeCount: result.routes.size,
      expectedRouteCount: currentNetworkModel.connections.length,
      destination: result.to,
      crossingsNearReported: result.findings.filter(item => item.type === 'route-crossing' && item.point[1] > 29_000 && item.point[1] < 31_000).slice(0, 6),
    }, null, 2));
  }, 60_000);
});
