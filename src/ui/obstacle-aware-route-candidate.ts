import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { planOrthogonalRoutes, type RouteBox, type RoutePoint } from './orthogonal-route-planner';
import type { Point } from './diagram-geometry';

/**
 * Presentation-only experiment: route the existing network through the same
 * asset coordinates while treating unrelated room frames as hard obstacles.
 * This intentionally does not mutate the electrical model or any positions.
 */
export function routeWholeNetworkAroundFrames(model: NetworkModel) {
  const diagram = continuousNetwork(model);
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map(diagram.panels.flatMap(panel => (panel.memberAssetIds ?? panel.assetIds).map(id => [id, panel.id] as const)));
  // Frame-first candidate: internal cable placement is already board-specific
  // in continuousNetwork. Keeping only room frames as global obstacles avoids
  // exploding the router's search grid with hundreds of local labels.
  const obstacles: RouteBox[] = diagram.panels.map(panel => ({
    id: `frame:${panel.id}`, x: panel.x, y: panel.y, width: panel.width, height: panel.height,
  }));
  const obstacleIdsByAsset = new Map<string, string[]>();
  for (const asset of model.assets) {
    obstacleIdsByAsset.set(asset.id, [
      `symbol:${asset.id}`,
      `label:${asset.id}`,
      ...(roomByAsset.has(asset.id) ? [`frame:${roomByAsset.get(asset.id)!}`] : []),
    ]);
  }
  const obstacleIdsByRoom = new Map<string, string[]>();
  for (const [assetId, roomId] of roomByAsset) {
    obstacleIdsByRoom.set(roomId, [
      ...(obstacleIdsByRoom.get(roomId) ?? []),
      `symbol:${assetId}`,
      `label:${assetId}`,
    ]);
  }
  const requests = model.connections.map(connection => {
    const fromAssetId = ownerByTerminal.get(connection.from)!;
    const toAssetId = ownerByTerminal.get(connection.to)!;
    const from = diagram.view.layout.terminals[connection.from];
    const to = diagram.view.layout.terminals[connection.to];
    const endpointRoomIds = new Set([roomByAsset.get(fromAssetId), roomByAsset.get(toAssetId)].filter((id): id is string => !!id));
    const framesContainingEndpoint = diagram.panels.filter(panel => [from, to].some(point =>
      point[0] >= panel.x && point[0] <= panel.x + panel.width && point[1] >= panel.y && point[1] <= panel.y + panel.height));
    return {
      id: connection.id,
      from: from as RoutePoint,
      to: to as RoutePoint,
      fromTerminalId: connection.from,
      toTerminalId: connection.to,
      preferDown: diagram.treeEdgeIds.has(connection.id),
      order: diagram.treeEdgeIds.has(connection.id) ? 0 : 1,
      preferredPath: diagram.routes.get(connection.id),
      ignoredObstacleIds: [
        ...(obstacleIdsByAsset.get(fromAssetId) ?? []),
        ...(obstacleIdsByAsset.get(toAssetId) ?? []),
        ...[...endpointRoomIds].flatMap(id => obstacleIdsByRoom.get(id) ?? []),
        ...framesContainingEndpoint.map(panel => `frame:${panel.id}`),
        ...[...endpointRoomIds].map(id => `frame:${id}`),
      ],
    };
  });
  const routed = planOrthogonalRoutes(requests, {
    obstacles,
    clearance: 24,
    localSearchPadding: 800,
    maxLocalSearchPadding: 6_400,
    maxSearchAttempts: 4,
    maxGridNodes: 60_000,
    bendPenalty: 180,
  });
  const unresolvedDiagnostics = routed.unresolved.map(item => {
    const request = requests.find(candidate => candidate.id === item.routeId)!;
    const ignored = new Set(request.ignoredObstacleIds);
    const blockedBy = obstacles.filter(box => !ignored.has(box.id)
      && [request.from, request.to].some(point => point[0] > box.x - 24 && point[0] < box.x + box.width + 24
        && point[1] > box.y - 24 && point[1] < box.y + box.height + 24)).map(box => box.id);
    return { ...item, fromAssetId: ownerByTerminal.get(request.fromTerminalId), toAssetId: ownerByTerminal.get(request.toTerminalId), blockedBy };
  });

  const routes: GeometryRoute[] = model.connections.flatMap(connection => {
    const points = routed.routes.get(connection.id);
    return points ? [{ id: connection.id, points: points.map(([x, y]) => [x, y] as Point), terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const findings = validateDiagramGeometry({ routes, roomFrames: diagram.panels });
  const hybridRoutes = new Map(routed.routes);
  for (const connection of model.connections) if (!hybridRoutes.has(connection.id)) {
    const existing = diagram.routes.get(connection.id);
    if (existing) hybridRoutes.set(connection.id, existing);
  }
  const hybridFindings = validateDiagramGeometry({
    routes: model.connections.flatMap(connection => {
      const points = hybridRoutes.get(connection.id);
      return points ? [{ id: connection.id, points: points.map(([x, y]) => [x, y] as Point), terminals: [connection.from, connection.to] as [string, string] }] : [];
    }),
    roomFrames: diagram.panels,
  });
  const segmentHits = (points: readonly RoutePoint[], box: { x: number; y: number; width: number; height: number }) => points.slice(1).some((to, index) => {
    const from = points[index];
    if (from[0] === to[0]) return from[0] > box.x && from[0] < box.x + box.width
      && Math.max(Math.min(from[1], to[1]), box.y) < Math.min(Math.max(from[1], to[1]), box.y + box.height);
    if (from[1] === to[1]) return from[1] > box.y && from[1] < box.y + box.height
      && Math.max(Math.min(from[0], to[0]), box.x) < Math.min(Math.max(from[0], to[0]), box.x + box.width);
    return true;
  });
  const routeFramePairs = new Set<string>();
  const labelHits: { routeId: string; assetId: string }[] = [];
  const symbolHits: { routeId: string; assetId: string }[] = [];
  for (const connection of model.connections) {
    const points = routed.routes.get(connection.id);
    if (!points) continue;
    const fromAssetId = ownerByTerminal.get(connection.from)!;
    const toAssetId = ownerByTerminal.get(connection.to)!;
    for (const panel of diagram.panels) {
      if ([points[0], points.at(-1)!].some(point => point[0] >= panel.x && point[0] <= panel.x + panel.width
        && point[1] >= panel.y && point[1] <= panel.y + panel.height)) continue;
      if (panel.id === roomByAsset.get(fromAssetId) || panel.id === roomByAsset.get(toAssetId)) continue;
      if (segmentHits(points, panel)) routeFramePairs.add(`${connection.id}/${panel.id}`);
    }
    for (const [assetId, label] of diagram.labels) {
      if (assetId === fromAssetId || assetId === toAssetId) continue;
      if (segmentHits(points, label)) labelHits.push({ routeId: connection.id, assetId });
    }
    for (const asset of model.assets) {
      if (asset.id === fromAssetId || asset.id === toAssetId) continue;
      const [x, y] = diagram.view.layout.assets[asset.id];
      if (segmentHits(points, { x: x - 38, y: y - 38, width: 76, height: 76 })) symbolHits.push({ routeId: connection.id, assetId: asset.id });
    }
  }
  const allPoints = [...routed.routes.values()].flatMap(points => [...points]);
  const bounds = allPoints.length ? {
    x: Math.min(...allPoints.map(point => point[0])),
    y: Math.min(...allPoints.map(point => point[1])),
    width: Math.max(...allPoints.map(point => point[0])) - Math.min(...allPoints.map(point => point[0])),
    height: Math.max(...allPoints.map(point => point[1])) - Math.min(...allPoints.map(point => point[1])),
  } : { x: 0, y: 0, width: 0, height: 0 };
  return {
    diagram,
    routes: routed.routes,
    unresolved: unresolvedDiagnostics,
    metrics: {
      assets: model.assets.length,
      placedAssets: Object.keys(diagram.view.layout.assets).length,
      connections: model.connections.length,
      routedConnections: routed.routes.size,
      unresolvedConnections: routed.unresolved.length,
      orthogonalSegments: routes.reduce((count, route) => count + route.points.slice(1).filter((point, index) => point[0] === route.points[index][0] || point[1] === route.points[index][1]).length, 0),
      diagonalSegments: findings.filter(item => item.type === 'non-orthogonal').length,
      routeCrossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengthOverlaps: findings.filter(item => item.type === 'shared-route-length').length,
      roomFrameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      routeFramePairs: routeFramePairs.size,
      routeLabelHits: labelHits.length,
      routeSymbolHits: symbolHits.length,
      bounds,
      aspectRatio: bounds.height ? +(bounds.width / bounds.height).toFixed(3) : 0,
    },
    hybridMetrics: {
      routedConnections: hybridRoutes.size,
      unresolvedConnections: model.connections.length - hybridRoutes.size,
      routeCrossings: hybridFindings.filter(item => item.type === 'route-crossing').length,
      sharedLengthOverlaps: hybridFindings.filter(item => item.type === 'shared-route-length').length,
      routeFrameIntersections: hybridFindings.filter(item => item.type === 'route-room-frame').length,
      routeLabelHits: model.connections.reduce((count, connection) => {
        const points = hybridRoutes.get(connection.id);
        if (!points) return count;
        const from = ownerByTerminal.get(connection.from)!; const to = ownerByTerminal.get(connection.to)!;
        return count + [...diagram.labels].filter(([id, label]) => id !== from && id !== to && segmentHits(points, label)).length;
      }, 0),
    },
    details: { routeFrameExamples: [...routeFramePairs].slice(0, 20), labelHitExamples: labelHits.slice(0, 20), symbolHitExamples: symbolHits.slice(0, 20) },
  };
}
