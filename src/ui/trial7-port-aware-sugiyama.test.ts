import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutTrial7PortAwareSugiyama, trial7CountContentCollisions, countTrial7RouteContentHits } from './trial7-port-aware-sugiyama';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

describe('trial7 port-aware Sugiyama room flow', () => {
  it('preserves every asset/connection and reports full geometry metrics', () => {
    const model = currentNetworkModel;
    const candidate = layoutTrial7PortAwareSugiyama(model);
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const byConnection = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routes: GeometryRoute[] = [...candidate.routing.routes].map(([id, points]) => {
      const connection = byConnection.get(id)!;
      return { id, points: points.map(([x, y]) => [x, y] as [number, number]), terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({ routes, roomFrames: candidate.roomFrames });
    const endpointMismatches = routes.filter(route => {
      const connection = byConnection.get(route.id)!;
      const original = candidate.source.originalRoutes.get(route.id);
      if (!original) return true;
      const fromOwner = owners.get(connection.from)!; const toOwner = owners.get(connection.to)!;
      const fromDelta = candidate.moved.deltaByAsset.get(fromOwner) ?? [0, 0];
      const toDelta = candidate.moved.deltaByAsset.get(toOwner) ?? [0, 0];
      const actualFrom = route.points[0]; const actualTo = route.points.at(-1)!; const oldTo = original.at(-1)!;
      return actualFrom[0] !== original[0][0] + fromDelta[0] || actualFrom[1] !== original[0][1] + fromDelta[1]
        || actualTo[0] !== oldTo[0] + toDelta[0] || actualTo[1] !== oldTo[1] + toDelta[1];
    }).map(route => route.id);
    const lineHits = countTrial7RouteContentHits(routes.map(route => ({
      ...route,
      endpoints: [owners.get(byConnection.get(route.id)!.from)!, owners.get(byConnection.get(route.id)!.to)!],
    })), candidate.symbolLabelBoxes).size;
    const resultIds = [...candidate.routing.routes.keys(), ...candidate.routing.remaining];
    const metrics = {
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routing.routes.size,
      unresolved: candidate.routing.remaining.length,
      portAwareRoomLinks: candidate.links.length,
      longEdgeDummyNodes: [...candidate.layers.values()].flat().filter(node => node.kind === 'dummy').length,
      resultIdCoverage: resultIds.length,
      duplicateResultIds: resultIds.length - new Set(resultIds).size,
      endpointMismatches: endpointMismatches.length,
      contentBoxCollisions: trial7CountContentCollisions(candidate.symbolLabelBoxes),
      routeContentHits: lineHits,
      routeCrossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      frameHits: findings.filter(item => item.type === 'route-room-frame').length,
      bounds: candidate.bounds,
      aspect: +(candidate.bounds.width / Math.max(1, candidate.bounds.height)).toFixed(3),
    };
    console.info('TRIAL7_PORT_AWARE_SUGIYAMA', JSON.stringify(metrics));
    expect(metrics.assets).toBe(model.assets.length);
    expect(resultIds).toHaveLength(model.connections.length);
    expect(new Set(resultIds).size).toBe(model.connections.length);
  }, 300_000);
});