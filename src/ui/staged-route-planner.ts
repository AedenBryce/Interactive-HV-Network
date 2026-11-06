import { planOrthogonalRoutes, type OrthogonalRouteOptions, type OrthogonalRoutePlan, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import type { Box } from './diagram-geometry';

export type StagedRoutePlan = OrthogonalRoutePlan & {
  stages: {
    roomLocal: { requested: number; routed: number; unresolved: number };
    crossRoom: { requested: number; routed: number; unresolved: number };
  };
};
type StagedRoomFrame = Box & { id: string; memberAssetIds: readonly string[] };

/**
 * Route room-local wiring first, then reserve those paths while routing all
 * cross-room joins. This is an isolated full-network presentation experiment;
 * ownership only selects route order and never changes model connectivity.
 */
export function planStagedRoutes(
  requests: readonly RouteRequest[],
  ownerByAssetId: ReadonlyMap<string, string>,
  ownerByTerminal: ReadonlyMap<string, string>,
  roomFrames: readonly StagedRoomFrame[],
  options: OrthogonalRouteOptions = {},
): StagedRoutePlan {
  const roomLocal: RouteRequest[] = [];
  const crossRoom: RouteRequest[] = [];
  for (const request of requests) {
    const fromRoom = ownerByAssetId.get(ownerByTerminal.get(request.fromTerminalId) ?? '');
    const toRoom = ownerByAssetId.get(ownerByTerminal.get(request.toTerminalId) ?? '');
    if (fromRoom && fromRoom === toRoom) roomLocal.push(request);
    else crossRoom.push(request);
  }

  const localPlan = planOrthogonalRoutes(roomLocal, options);
  const reserved: ReservedRoute[] = [
    ...(options.reservedRoutes ?? []),
    ...[...localPlan.routes].map(([id, points]) => {
      const request = roomLocal.find(item => item.id === id)!;
      return { id, points, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId };
    }),
  ];
  const roomFrameObstacles = roomFrames.map(({ id, x, y, width, height }) => ({ id: `room-frame:${id}`, x, y, width, height }));
  const roomByAssetId = new Map(roomFrames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const externalRequests = crossRoom.map(request => {
    const fromRoom = roomByAssetId.get(ownerByTerminal.get(request.fromTerminalId) ?? '');
    const toRoom = roomByAssetId.get(ownerByTerminal.get(request.toTerminalId) ?? '');
    return {
      ...request,
      ignoredObstacleIds: [
        ...(request.ignoredObstacleIds ?? []),
        ...(fromRoom ? [`room-frame:${fromRoom}`] : []),
        ...(toRoom && toRoom !== fromRoom ? [`room-frame:${toRoom}`] : []),
      ],
    };
  });
  const externalPlan = planOrthogonalRoutes(externalRequests, {
    ...options,
    obstacles: [...(options.obstacles ?? []), ...roomFrameObstacles],
    reservedRoutes: reserved,
  });
  const routes = new Map([...localPlan.routes, ...externalPlan.routes]);
  const unresolved = [...localPlan.unresolved, ...externalPlan.unresolved];
  return {
    routes,
    unresolved,
    stages: {
      roomLocal: { requested: roomLocal.length, routed: localPlan.routes.size, unresolved: localPlan.unresolved.length },
      crossRoom: { requested: crossRoom.length, routed: externalPlan.routes.size, unresolved: externalPlan.unresolved.length },
    },
  };
}
