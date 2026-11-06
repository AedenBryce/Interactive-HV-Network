import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { layoutTrial8OrthogonalCorridors } from './trial8-orthogonal-corridors';

describe('trial 8 room-layered horizontal corridors', () => {
  it('accounts for all equipment and connections and reports route conflicts', () => {
    const model = currentNetworkModel;
    const candidate = layoutTrial8OrthogonalCorridors(model);
    const links = new Map(model.connections.map(link => [link.id, link] as const));
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const routeCrossings = candidate.findings.filter(item => item.type === 'route-crossing').length;
    const sharedPaths = candidate.findings.filter(item => item.type === 'shared-route-length').length;
    const endpointContacts = candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length;
    const frameOverlaps = candidate.findings.filter(item => item.type === 'room-frame-overlap').length;
    const frameCuts = candidate.findings.filter(item => item.type === 'route-room-frame').length;
    const nonOrthogonal = candidate.findings.filter(item => item.type === 'non-orthogonal').length;
    const unrelatedFrameCuts = candidate.findings.filter(item => item.type === 'route-room-frame').filter(item => {
      if (item.type !== 'route-room-frame') return false;
      const link = links.get(item.routeId)!;
      const endpoints = [owners.get(link.from), owners.get(link.to)];
      const frame = candidate.frames.find(value => value.id === item.roomFrameId)!;
      return !endpoints.some(owner => owner && frame.memberAssetIds.includes(owner));
    }).length;
    const labelHits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const link = links.get(routeId)!;
      const endpointOwners = new Set([owners.get(link.from), owners.get(link.to)]);
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.has(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let index = 1; index < points.length; index++) {
          if (cutsBox(points[index - 1], points[index], box)) labelHits.add(`${routeId}->${box.id}`);
        }
      }
    }
    const metric = {
      assets: model.assets.length,
      positionedAssets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routeCount,
      unresolved: candidate.unresolved.length,
      frameOverlaps,
      routeCrossings,
      sharedPaths,
      endpointContacts,
      nonOrthogonal,
      lineContentHits: labelHits.size,
      frameCuts,
      unrelatedFrameCuts,
      contentCollisions: candidate.contentBoxCollisions,
      aspectRatio: +(candidate.bounds.width / Math.max(1, candidate.bounds.height)).toFixed(3),
      channels: candidate.yChannels.length,
      successfulChannelRoutes: candidate.acceptedChannelById.size,
      failedChannelRoutes: candidate.channelFailures.length,
      failures: candidate.channelFailures.slice(0, 30),
    };
    console.info('TRIAL8_ORTHOGONAL_CORRIDORS', JSON.stringify(metric));
    expect(metric.positionedAssets).toBe(model.assets.length);
    expect(candidate.externalRequests.length + candidate.localRouteIds.length).toBe(model.connections.length);
    expect(candidate.routes.size + candidate.unresolved.length).toBe(model.connections.length);
  }, 300_000);
});
