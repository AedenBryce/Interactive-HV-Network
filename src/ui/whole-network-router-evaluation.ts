import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { routeContinuousConnectors } from './continuous-route-adapter';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';
import { hasDeviceCard } from './equipment-appearance';
import { deviceCard } from './device-card';
import { resolveRoutes } from './resolve-routes';

/** Experimental whole-network router comparison. Not used by production UI. */
export function evaluateWholeNetworkRouter() {
  const model = currentNetworkModel;
  const production = continuousNetwork(model);
  const endpoints = (connection: typeof model.connections[number]) => {
    const points = production.routes.get(connection.id);
    if (!points || points.length < 2) return { from: [NaN, NaN] as Point, to: [NaN, NaN] as Point };
    return { from: points[0], to: points.at(-1)! };
  };
  const candidate = routeContinuousConnectors(model, production.view.layout, production.labels, {
    endpoints,
    preferredRoutes: production.routes,
    roomFrames: production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    hiddenAssetIds: production.hiddenIds,
    treeEdgeIds: production.treeEdgeIds,
    clearance: 24,
    localSearchPadding: 320,
    maxLocalSearchPadding: 1280,
    maxSearchAttempts: 2,
  });
  const repairedRoutes = new Map(production.routes);
  for (const [id, points] of candidate.routes) repairedRoutes.set(id, points);
  const unresolvedIds = new Set(candidate.diagnostics.unresolved.map(item => item.routeId));
  const repairDiagnostics = resolveRoutes(
    model,
    production.view.layout,
    production.labels,
    repairedRoutes,
    production.hiddenIds,
    unresolvedIds,
    endpoints,
    production.panels,
  );
  const hybridRoutes = new Map(production.routes);
  for (const [id, points] of candidate.routes) hybridRoutes.set(id, points);
  const routes: GeometryRoute[] = model.connections.flatMap(connection => {
    const points = hybridRoutes.get(connection.id);
    return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const candidateOnlyRoutes: GeometryRoute[] = model.connections.flatMap(connection => {
    const points = candidate.routes.get(connection.id);
    return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const roomFrames = production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }));
  const findings = validateDiagramGeometry({
    routes,
    roomFrames,
  });
  const candidateOnlyFindings = validateDiagramGeometry({ routes: candidateOnlyRoutes, roomFrames });
  const repairedGeometryRoutes: GeometryRoute[] = model.connections.flatMap(connection => {
    const points = repairedRoutes.get(connection.id);
    return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const repairedFindings = validateDiagramGeometry({ routes: repairedGeometryRoutes, roomFrames });
  const byConnectionId = new Map(model.connections.map(connection => [connection.id, connection] as const));
  const classifyFrameFindings = (source: typeof findings) => source.filter(item => item.type === 'route-room-frame').map(item => {
      const connection = byConnectionId.get(item.routeId)!;
      const routeEndpoints = endpoints(connection);
      const endpointRooms = new Set(production.panels.filter(panel =>
        [routeEndpoints.from, routeEndpoints.to].some(point => point[0] >= panel.x && point[0] <= panel.x + panel.width
          && point[1] >= panel.y && point[1] <= panel.y + panel.height),
      ).map(panel => panel.id));
      return { ...item, classification: endpointRooms.has(item.roomFrameId) ? 'endpoint-room-entry' as const : 'unrelated-room-intersection' as const };
    });
  const frameFindings = classifyFrameFindings(findings);
  const candidateOnlyFrameFindings = classifyFrameFindings(candidateOnlyFindings);
  const blockingEndpointDetails = findBlockedEndpointObstacles(model, production, endpoints, candidate.diagnostics.unresolved);
  const unresolvedByReason = new Map<string, string[]>();
  for (const item of candidate.diagnostics.unresolved) unresolvedByReason.set(item.reason, [...(unresolvedByReason.get(item.reason) ?? []), item.routeId]);
  const hybridCrossings = findings.filter(item => item.type === 'route-crossing');
  const hybridOverlaps = findings.filter(item => item.type === 'shared-route-length');
  const hybridEndpointTouches = findings.filter(item => item.type === 'route-endpoint-on-interior');
  return {
    connectionCount: model.connections.length,
    productionRoutedCount: production.routes.size,
    routedCount: candidate.diagnostics.routedConnectionCount,
    unresolvedCount: candidate.diagnostics.unresolved.length,
    unresolved: candidate.diagnostics.unresolved,
    unresolvedByReason: Object.fromEntries(unresolvedByReason),
    blockedEndpointObstacleFindings: blockingEndpointDetails,
    obstacleCount: candidate.diagnostics.obstacleCount,
    reservedLeadCount: candidate.diagnostics.reservedLeadCount,
    geometry: {
      candidateOnly: {
        routeCount: candidateOnlyRoutes.length,
        routeCrossings: candidateOnlyFindings.filter(item => item.type === 'route-crossing').length,
        endpointOnInterior: candidateOnlyFindings.filter(item => item.type === 'route-endpoint-on-interior').length,
        sharedRouteLengthOverlaps: candidateOnlyFindings.filter(item => item.type === 'shared-route-length').length,
        routeFrameIntersections: candidateOnlyFrameFindings.length,
        routeFrameClassification: {
          endpointRoomEntry: candidateOnlyFrameFindings.filter(item => item.classification === 'endpoint-room-entry').length,
          unrelatedRoomIntersection: candidateOnlyFrameFindings.filter(item => item.classification === 'unrelated-room-intersection').length,
          unrelatedExamples: candidateOnlyFrameFindings.filter(item => item.classification === 'unrelated-room-intersection').slice(0, 30),
          repeatedRouteFramePairs: repeatedFramePairs(candidateOnlyFrameFindings),
        },
      },
      hybrid: {
        routeCount: routes.length,
        nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
        routeCrossings: hybridCrossings.length,
        endpointOnInterior: hybridEndpointTouches.length,
        sharedRouteLengthOverlaps: hybridOverlaps.length,
        routeFrameIntersections: frameFindings.length,
        crossings: hybridCrossings,
        endpointTouches: hybridEndpointTouches,
        overlaps: hybridOverlaps,
        routeFrameClassification: {
          endpointRoomEntry: frameFindings.filter(item => item.classification === 'endpoint-room-entry').length,
          unrelatedRoomIntersection: frameFindings.filter(item => item.classification === 'unrelated-room-intersection').length,
          unrelatedExamples: frameFindings.filter(item => item.classification === 'unrelated-room-intersection').slice(0, 30),
          repeatedRouteFramePairs: repeatedFramePairs(frameFindings),
        },
      },
      repairPass: {
        routeCount: repairedGeometryRoutes.length,
        selectedConnectionCount: repairDiagnostics.selectedConnectionCount,
        reroutedConnectionCount: repairDiagnostics.reroutedConnectionIds.length,
        unresolvedConnectionCount: repairDiagnostics.unresolvedConnectionIds.length,
        unresolvedConnectionIds: repairDiagnostics.unresolvedConnectionIds,
        properCrossings: repairedFindings.filter(item => item.type === 'route-crossing').length,
        endpointOnInterior: repairedFindings.filter(item => item.type === 'route-endpoint-on-interior').length,
        sharedRouteLengthOverlaps: repairedFindings.filter(item => item.type === 'shared-route-length').length,
        routeFrameIntersections: repairedFindings.filter(item => item.type === 'route-room-frame').length,
      },
    },
  };
}

function repeatedFramePairs(findings: ReturnType<typeof validateDiagramGeometry> extends (infer T)[] ? T[] : never) {
  const counts = new Map<string, { routeId: string; roomFrameId: string; count: number; points: Point[] }>();
  for (const item of findings) {
    if (!item || item.type !== 'route-room-frame') continue;
    const key = `${item.routeId}\u0000${item.roomFrameId}`;
    const existing = counts.get(key) ?? { routeId: item.routeId, roomFrameId: item.roomFrameId, count: 0, points: [] };
    existing.count++;
    if (item.point) existing.points.push(item.point);
    counts.set(key, existing);
  }
  return [...counts.values()].filter(item => item.count > 1).sort((a, b) => b.count - a.count);
}

function findBlockedEndpointObstacles(
  model: typeof currentNetworkModel,
  production: ReturnType<typeof continuousNetwork>,
  endpoints: (connection: typeof model.connections[number]) => { from: Point; to: Point },
  unresolved: readonly { routeId: string; reason: string }[],
) {
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const obstacles: { id: string; x: number; y: number; width: number; height: number }[] = [];
  for (const asset of model.assets) {
    if (production.hiddenIds.has(asset.id)) continue;
    const position = production.view.layout.assets[asset.id]; const label = production.labels.get(asset.id);
    if (!position || !label) continue;
    if (hasDeviceCard(asset)) {
      const card = deviceCard(asset, position, label);
      obstacles.push({ id: `asset-card:${asset.id}`, x: position[0] + card.x, y: position[1] + card.y, width: card.width, height: card.height });
    } else {
      obstacles.push({ id: `asset-symbol:${asset.id}`, x: position[0] - 48, y: position[1] - 48, width: 96, height: 96 });
    }
    obstacles.push({ id: `asset-label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
  }
  for (const panel of production.panels) obstacles.push({ id: `room-frame:${panel.id}`, x: panel.x, y: panel.y, width: panel.width, height: panel.height });

  return unresolved.filter(item => item.reason === 'blocked-endpoint').map(({ routeId }) => {
    const connection = model.connections.find(item => item.id === routeId)!;
    const points = endpoints(connection);
    const fromOwner = owners.get(connection.from); const toOwner = owners.get(connection.to);
    const endpointFrameIds = [points.from, points.to].flatMap(point => production.panels
      .filter(panel => point[0] >= panel.x && point[0] <= panel.x + panel.width
        && point[1] >= panel.y && point[1] <= panel.y + panel.height)
      .map(panel => `room-frame:${panel.id}`));
    const ignored = new Set([
      ...(fromOwner ? [`asset-card:${fromOwner}`, `asset-symbol:${fromOwner}`] : []),
      ...(toOwner ? [`asset-card:${toOwner}`, `asset-symbol:${toOwner}`] : []),
      ...endpointFrameIds,
    ]);
    const blockedBy = (['from', 'to'] as const).flatMap(which => obstacles.flatMap(box => {
      if (ignored.has(box.id)) return [];
      const point = points[which];
      return point[0] > box.x - 24 && point[0] < box.x + box.width + 24
        && point[1] > box.y - 24 && point[1] < box.y + box.height + 24
        ? [{ endpoint: which, point, obstacleId: box.id }]
        : [];
    }));
    return { routeId, endpointOwners: [fromOwner, toOwner], endpoints: points, blockedBy };
  });
}
