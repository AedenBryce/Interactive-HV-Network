import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import { planOrthogonalRoutes, type ReservedRoute, type RouteBox, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

it('tries a bounded, corridor-filtered orthogonal supplement for room-owned candidate leftovers', () => {
  const model = currentNetworkModel;
  const candidate = layoutRoomOwnedTopDownCandidate(model);
  const first = routeRoomOwnedCandidateGutters(model, candidate);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const requestById = new Map(candidate.externalRequests.map(request => [request.id, request]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map(candidate.frames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const routeBoxes = candidate.routingObstacles as RouteBox[];
  const routes = new Map(first.routes);
  const accepted: string[] = [];
  const failures: { id: string; reason: string }[] = [];
  for (const id of first.remaining) {
    const request = requestById.get(id);
    const connection = connectionById.get(id);
    if (!request || !connection) { failures.push({ id, reason: 'no-external-request' }); continue; }
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from)!);
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to)!);
    const endpointRoomIds = new Set([fromRoom, toRoom].filter((value): value is string => Boolean(value)));
    const original = candidate.originalRoutes.get(id);
    if (!original?.length) { failures.push({ id, reason: 'no-original-route' }); continue; }
    const fromDelta = candidate.deltaByAsset.get(ownerByTerminal.get(connection.from)!) ?? [0, 0];
    const toDelta = candidate.deltaByAsset.get(ownerByTerminal.get(connection.to)!) ?? [0, 0];
    const source = extractExit(original, candidate.originalFrames.find(frame => frame.id === fromRoom), fromDelta);
    const target = extractEntry(original, candidate.originalFrames.find(frame => frame.id === toRoom), toDelta);
    const from = source.port; const to = target.port;
    const padding = 1800;
    const minX = Math.min(from[0], to[0]) - padding;
    const maxX = Math.max(from[0], to[0]) + padding;
    const minY = Math.min(from[1], to[1]) - padding;
    const maxY = Math.max(from[1], to[1]) + padding;
    const obstacles = routeBoxes.filter(box => {
      if (box.x > maxX || box.x + box.width < minX || box.y > maxY || box.y + box.height < minY) return false;
      if (box.id.startsWith('room:')) return true;
      const containingRoom = candidate.frames.find(frame => box.x >= frame.x - 1 && box.y >= frame.y - 1
        && box.x + box.width <= frame.x + frame.width + 1 && box.y + box.height <= frame.y + frame.height + 1);
      return !containingRoom || endpointRoomIds.has(containingRoom.id);
    });
    const reserved: ReservedRoute[] = [...routes].map(([routeId, points]) => {
      const edge = connectionById.get(routeId)!;
      return { id: routeId, points, fromTerminalId: edge.from, toTerminalId: edge.to };
    });
    const portReservations: ReservedRoute[] = [];
    if (source.path.length > 1) portReservations.push({ id: `${id}:room-exit`, points: source.path, fromTerminalId: connection.from, toTerminalId: `${id}:room-port-from` });
    if (target.path.length > 1) portReservations.push({ id: `${id}:room-entry`, points: target.path, fromTerminalId: `${id}:room-port-to`, toTerminalId: connection.to });
    const localRequest: RouteRequest = {
      ...request,
      from,
      to,
      fromTerminalId: `${id}:room-port-from`,
      toTerminalId: `${id}:room-port-to`,
      order: 1,
      preferDown: true,
      bounds: { id: `search:${id}`, x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    };
    const plan = planOrthogonalRoutes([localRequest], {
      obstacles,
      reservedRoutes: [...reserved, ...portReservations],
      clearance: 32,
      localSearchPadding: 800,
      maxLocalSearchPadding: padding,
      maxSearchAttempts: 3,
      maxGridNodes: 180_000,
      bendPenalty: 160,
      allowCrossings: false,
    });
    const route = plan.routes.get(id);
    if (!route) { failures.push({ id, reason: plan.unresolved[0]?.reason ?? 'no-path' }); continue; }
    const full: [number, number][] = [];
    for (const point of source.path) appendOrthogonal(full, point);
    for (const point of route) appendOrthogonal(full, [point[0], point[1]]);
    for (const point of target.path) appendOrthogonal(full, point);
    routes.set(id, full);
    accepted.push(id);
  }
  const geometryRoutes: GeometryRoute[] = [...routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points, terminals: [connection.from, connection.to] };
  });
  const findings = validateDiagramGeometry({
    routes: geometryRoutes,
    roomFrames: candidate.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
  });
  const unrelatedFrameCuts = findings.filter(item => item.type === 'route-room-frame').filter(item => {
    const connection = connectionById.get(item.routeId)!;
    const members = candidate.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
    return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
  });
  console.info('room-owned supplemental fallback', JSON.stringify({
    modelAssets: model.assets.length,
    modelConnections: model.connections.length,
    placedAssets: Object.keys(candidate.positions).length,
    routed: routes.size,
    unresolved: model.connections.length - routes.size,
    added: accepted,
    failures,
    crossings: findings.filter(item => item.type === 'route-crossing').length,
    sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
    endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
    frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
    unrelatedFrameCuts: unrelatedFrameCuts.length,
    roomOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
    nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
    unresolvedIds: model.connections.map(item => item.id).filter(id => !routes.has(id)),
  }, null, 2));
}, 300_000);

function translate(point: readonly [number, number], delta: readonly [number, number]): [number, number] {
  return [point[0] + delta[0], point[1] + delta[1]];
}
function inside(point: readonly [number, number], frame: { x: number; y: number; width: number; height: number }) {
  return point[0] >= frame.x && point[0] <= frame.x + frame.width && point[1] >= frame.y && point[1] <= frame.y + frame.height;
}
function boundary(a: readonly [number, number], b: readonly [number, number], frame: { x: number; y: number; width: number; height: number }): [number, number] {
  if (a[1] === b[1]) return [b[0] < frame.x ? frame.x : b[0] > frame.x + frame.width ? frame.x + frame.width : a[0], a[1]];
  if (a[0] === b[0]) return [a[0], b[1] < frame.y ? frame.y : b[1] > frame.y + frame.height ? frame.y + frame.height : a[1]];
  return [a[0], a[1]];
}
function extractExit(route: readonly (readonly [number, number])[], frame: { x: number; y: number; width: number; height: number } | undefined, delta: readonly [number, number]) {
  if (!frame || route.length < 2) return { path: [translate(route[0], delta)], port: translate(route[0], delta) };
  for (let index = 0; index < route.length - 1; index++) {
    if (inside(route[index], frame) && !inside(route[index + 1], frame)) {
      const port = boundary(route[index], route[index + 1], frame);
      return { path: [...route.slice(0, index + 1), port].map(point => translate(point, delta)), port: translate(port, delta) };
    }
  }
  return { path: [translate(route[0], delta)], port: translate(route[0], delta) };
}
function extractEntry(route: readonly (readonly [number, number])[], frame: { x: number; y: number; width: number; height: number } | undefined, delta: readonly [number, number]) {
  if (!frame || route.length < 2) return { path: [translate(route.at(-1)!, delta)], port: translate(route.at(-1)!, delta) };
  for (let index = route.length - 1; index > 0; index--) {
    if (inside(route[index], frame) && !inside(route[index - 1], frame)) {
      const port = boundary(route[index], route[index - 1], frame);
      return { path: [port, ...route.slice(index)].map(point => translate(point, delta)), port: translate(port, delta) };
    }
  }
  return { path: [translate(route.at(-1)!, delta)], port: translate(route.at(-1)!, delta) };
}
function appendOrthogonal(points: [number, number][], point: readonly [number, number]) {
  const previous = points.at(-1);
  if (!previous) { points.push([point[0], point[1]]); return; }
  if (previous[0] !== point[0] && previous[1] !== point[1]) points.push([point[0], previous[1]]);
  if (previous[0] !== point[0] || previous[1] !== point[1]) points.push([point[0], point[1]]);
}
