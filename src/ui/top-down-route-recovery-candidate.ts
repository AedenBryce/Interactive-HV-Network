import type { NetworkModel } from '../session/model';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { planOrthogonalRoutes, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

/**
 * Isolated completion pass for the topology-first prototype. It retains the
 * prototype's successful routes and retries only unresolved model connections
 * with larger search bounds and smaller clearance. This does not touch the
 * production diagram or model topology.
 */
export function recoverTopDownRoutes(model: NetworkModel, placement: 'current' | 'topology-staggered' = 'current') {
  const base = layoutTopDownFullNetwork(model, { placement });
  const alreadyRouted = new Set(base.routes.keys());
  const missingRequests = base.routeRequests.filter(request => !alreadyRouted.has(request.id));
  const memberRoom = new Map(base.roomFrames.flatMap(frame => frame.memberAssetIds.map(id => [id, frame.id] as const)));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomObstacles = base.roomFrames.map(({ id, x, y, width, height }) => ({ id: `room-frame:${id}`, x, y, width, height }));
  const requests: RouteRequest[] = missingRequests.map(request => {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId) ?? '';
    const toAsset = ownerByTerminal.get(request.toTerminalId) ?? '';
    const fromRoom = memberRoom.get(fromAsset);
    const toRoom = memberRoom.get(toAsset);
    return {
      ...request,
      ignoredObstacleIds: [
        ...(request.ignoredObstacleIds ?? []),
        ...(fromRoom ? [`room-frame:${fromRoom}`] : []),
        ...(toRoom && toRoom !== fromRoom ? [`room-frame:${toRoom}`] : []),
      ],
    };
  });
  const reservedRoutes: ReservedRoute[] = [...base.routes].map(([id, points]) => {
    const request = base.routeRequests.find(candidate => candidate.id === id)!;
    return { id, points, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId };
  });
  const retried = planOrthogonalRoutes(requests, {
    obstacles: [...base.routeObstacles, ...roomObstacles],
    reservedRoutes,
    clearance: 0,
    localSearchPadding: 1200,
    maxLocalSearchPadding: 24_000,
    maxSearchAttempts: 6,
    maxGridNodes: 250_000,
    bendPenalty: 180,
    allowCrossings: true,
    crossingPenalty: 18_000,
  });
  const routes = new Map([...base.routes, ...retried.routes]);
  const routeById = new Map(model.connections.map(connection => [connection.id, connection]));
  const geometryRoutes: GeometryRoute[] = [...routes].flatMap(([id, points]) => {
    const connection = routeById.get(id);
    return connection ? [{ id, points: points.map(([x, y]) => [x, y] as const), terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const findings = validateDiagramGeometry({ routes: geometryRoutes, roomFrames: base.roomFrames });
  return {
    ...base,
    routes,
    unresolved: retried.unresolved.map(item => `${item.routeId}:${item.reason}`),
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routes.has(id)),
    retry: { requested: requests.length, routed: retried.routes.size, unresolved: retried.unresolved },
    findings,
  };
}
