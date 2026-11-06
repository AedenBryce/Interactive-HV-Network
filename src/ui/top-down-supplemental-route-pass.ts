import type { NetworkModel } from '../session/model';
import { planOrthogonalRoutes, type ReservedRoute } from './orthogonal-route-planner';
import type { FullNetworkPrototype } from './top-down-full-network-prototype';
import type { Point } from './diagram-geometry';
import type { RouteRequest, RouteBox } from './orthogonal-route-planner';

/** One isolated attempt to add unresolved routes while reserving the 613 (or current) accepted paths. */
export function supplementTopDownRoutes(model: NetworkModel, candidate: FullNetworkPrototype) {
  const routes = new Map(candidate.routes);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const reserved: ReservedRoute[] = [...candidate.routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points: points.map(point => [point[0], point[1]] as Point), fromTerminalId: connection.from, toTerminalId: connection.to };
  });
  const requests = candidate.routeRequests.filter(request => !routes.has(request.id));
  const failures: { id: string; reason: string; from: Point; to: Point }[] = [];
  for (const request of requests) {
    const result = planOrthogonalRoutes([request], {
      obstacles: candidate.routeObstacles,
      reservedRoutes: reserved,
      clearance: 30,
      localSearchPadding: 500,
      maxLocalSearchPadding: 8_000,
      maxSearchAttempts: 5,
      maxGridNodes: 100_000,
      bendPenalty: 160,
    });
    const points = result.routes.get(request.id);
    if (!points) {
      failures.push({ id: request.id, reason: result.unresolved[0]?.reason ?? 'no-path', from: request.from as Point, to: request.to as Point });
      continue;
    }
    routes.set(request.id, points.map(point => [point[0], point[1]] as Point));
    const connection = connectionById.get(request.id)!;
    reserved.push({ id: request.id, points, fromTerminalId: connection.from, toTerminalId: connection.to });
  }
  return {
    routes,
    initialRouteCount: candidate.routes.size,
    requestedSupplementCount: requests.length,
    routedSupplementCount: requests.length - failures.length,
    failures,
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routes.has(id)),
  };
}

/** One classified second pass with the first supplemental result retained verbatim. */
export function supplementTopDownRoutesLocalFirst(
  model: NetworkModel,
  candidate: FullNetworkPrototype,
  startingRoutes: ReadonlyMap<string, readonly Point[]>,
) {
  const routes = new Map(startingRoutes);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const reserved: ReservedRoute[] = [...routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points: points.map(point => [point[0], point[1]] as Point), fromTerminalId: connection.from, toTerminalId: connection.to };
  });
  const pending = candidate.routeRequests.filter(request => !routes.has(request.id)).map(request => ({
    request,
    local: isLocalConnection(request),
  })).sort((a, b) => Number(b.local) - Number(a.local) || a.request.id.localeCompare(b.request.id));
  const failures: { id: string; reason: string; from: Point; to: Point; group: 'local' | 'long' }[] = [];
  for (const { request, local } of pending) {
    const length = Math.abs(request.to[0] - request.from[0]) + Math.abs(request.to[1] - request.from[1]);
    const margin = local ? 1200 : Math.min(12_000, Math.max(3_000, length * 0.35));
    const corridor = {
      id: `corridor:${request.id}`,
      x: Math.min(request.from[0], request.to[0]) - margin,
      y: Math.min(request.from[1], request.to[1]) - margin,
      width: Math.abs(request.to[0] - request.from[0]) + margin * 2,
      height: Math.abs(request.to[1] - request.from[1]) + margin * 2,
    };
    const obstacles = candidate.routeObstacles.filter(box => boxIntersects(box, corridor));
    const result = planOrthogonalRoutes([request], {
      obstacles,
      reservedRoutes: reserved,
      bounds: corridor,
      clearance: 30,
      localSearchPadding: local ? 300 : 700,
      maxLocalSearchPadding: local ? 2_400 : Math.min(margin, 12_000),
      maxSearchAttempts: 4,
      maxGridNodes: local ? 30_000 : 100_000,
      bendPenalty: 160,
    });
    const points = result.routes.get(request.id);
    if (!points) {
      failures.push({ id: request.id, reason: result.unresolved[0]?.reason ?? 'no-path', from: request.from as Point, to: request.to as Point, group: local ? 'local' : 'long' });
      continue;
    }
    routes.set(request.id, points.map(point => [point[0], point[1]] as Point));
    const connection = connectionById.get(request.id)!;
    reserved.push({ id: request.id, points, fromTerminalId: connection.from, toTerminalId: connection.to });
  }
  return {
    routes,
    initialRouteCount: startingRoutes.size,
    requestedSupplementCount: pending.length,
    routedSupplementCount: pending.length - failures.length,
    failures,
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routes.has(id)),
  };
}

function isLocalConnection(request: RouteRequest) {
  const id = request.id.toLowerCase();
  const localPattern = /bus-link|earth-branch|:branch|bar-link|lower-contact|disconnect-link|fuse-contact|winding-incomer/;
  const span = Math.max(Math.abs(request.to[0] - request.from[0]), Math.abs(request.to[1] - request.from[1]));
  return localPattern.test(id) && span <= 2_400;
}

function boxIntersects(box: RouteBox, corridor: RouteBox) {
  return box.x <= corridor.x + corridor.width && box.x + box.width >= corridor.x
    && box.y <= corridor.y + corridor.height && box.y + box.height >= corridor.y;
}
