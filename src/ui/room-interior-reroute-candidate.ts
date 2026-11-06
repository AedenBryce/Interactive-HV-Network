import type { NetworkModel } from '../session/model';
import { planOrthogonalRoutes, type RouteRequest } from './orthogonal-route-planner';
import type { Point } from './diagram-geometry';
import type { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';

type Candidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;

/** Rebuild same-room routes from their real model terminals inside each room's measured bounds. */
export function rerouteRoomInteriorCandidate(model: NetworkModel, candidate: Candidate, includeRoomIds?: ReadonlySet<string>) {
  const routes = new Map(candidate.routes);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomFrames = candidate.frames.map(frame => ({
    id: frame.id,
    x: frame.x,
    y: frame.y,
    width: frame.width,
    height: frame.height,
    assetIds: frame.memberAssetIds,
  }));
  const roomByAsset = new Map(roomFrames.flatMap(frame => frame.assetIds.map(assetId => [assetId, frame.id] as const)));
  const routeIdsByRoom = new Map<string, string[]>();

  for (const id of candidate.localRouteIds) {
    const connection = connectionById.get(id);
    if (!connection) continue;
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to) ?? '');
    if (!fromRoom || fromRoom !== toRoom || (includeRoomIds && !includeRoomIds.has(fromRoom))) continue;
    const routeIds = routeIdsByRoom.get(fromRoom) ?? [];
    routeIds.push(id);
    routeIdsByRoom.set(fromRoom, routeIds);
  }

  const freshRouteIds: string[] = [];
  const failedRoutes: { routeId: string; reason: string; roomId: string; from?: Point; to?: Point; blockers?: string[] }[] = [];
  for (const [roomId, ids] of routeIdsByRoom) {
    const frame = roomFrames.find(item => item.id === roomId);
    if (!frame) continue;
    const requests: RouteRequest[] = ids.flatMap((id, order) => {
      const connection = connectionById.get(id)!;
      const existing = candidate.routes.get(id);
      const from = existing?.[0];
      const to = existing?.at(-1);
      if (!from || !to) return [];
      const fromOwner = ownerByTerminal.get(connection.from)!;
      const toOwner = ownerByTerminal.get(connection.to)!;
      const padding = 1_280;
      const bounds = {
        id: `route-bounds:${roomId}:${id}`,
        x: Math.max(frame.x, Math.min(from[0], to[0]) - padding),
        y: Math.max(frame.y, Math.min(from[1], to[1]) - padding),
        width: 0,
        height: 0,
      };
      const right = Math.min(frame.x + frame.width, Math.max(from[0], to[0]) + padding);
      const bottom = Math.min(frame.y + frame.height, Math.max(from[1], to[1]) + padding);
      bounds.width = Math.max(0, right - bounds.x);
      bounds.height = Math.max(0, bottom - bounds.y);
      return [{
        id,
        from,
        to,
        fromTerminalId: connection.from,
        toTerminalId: connection.to,
        order,
        preferDown: true,
        preferredPath: existing,
        bounds,
        ignoredObstacleIds: [
          `symbol:${fromOwner}`, `label:${fromOwner}`,
          `symbol:${toOwner}`, `label:${toOwner}`,
          `room:${roomId}`,
        ],
      }];
    });
    const plan = planOrthogonalRoutes(requests, {
      obstacles: candidate.routingObstacles,
      clearance: 20,
      localSearchPadding: 320,
      maxLocalSearchPadding: 1_280,
      maxSearchAttempts: 3,
      maxGridNodes: 60_000,
      bendPenalty: 120,
    });
    for (const [id, points] of plan.routes) {
      routes.set(id, points.map(point => [point[0], point[1]] as Point));
      freshRouteIds.push(id);
    }
    const requestById = new Map(requests.map(request => [request.id, request]));
    for (const failure of plan.unresolved) {
      const request = requestById.get(failure.routeId);
      const ignored = new Set(request?.ignoredObstacleIds ?? []);
      const points = [request?.from, request?.to].filter((point): point is Point => !!point);
      const blockers = new Set(candidate.routingObstacles.flatMap(box => {
        if (ignored.has(box.id)) return [];
        const containsPoint = points.some(point => point[0] > box.x - 20 && point[0] < box.x + box.width + 20
          && point[1] > box.y - 20 && point[1] < box.y + box.height + 20);
        return containsPoint ? [box.id] : [];
      }));
      failedRoutes.push({
        ...failure,
        roomId,
        from: request ? [request.from[0], request.from[1]] : undefined,
        to: request ? [request.to[0], request.to[1]] : undefined,
        blockers: [...blockers],
      });
    }
  }

  return {
    candidate: { ...candidate, routes },
    freshRouteIds,
    failedRoutes,
    untouchedRouteIds: candidate.localRouteIds.filter(id => !freshRouteIds.includes(id)),
    roomsAttempted: [...routeIdsByRoom.keys()],
  };
}
