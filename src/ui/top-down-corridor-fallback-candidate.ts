import type { NetworkModel } from '../session/model';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { cutsBox, type Point } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { routeAvoidsObstacles, type RouteRequest, type RouteBox } from './orthogonal-route-planner';

/**
 * Last-resort orthogonal corridor completion for the top-down candidate.
 * Successful planner routes are retained; unresolved links are tried through
 * a deterministic set of outer corridors and ranked against the complete
 * already-routed graph. This is isolated from the production diagram.
 */
export function completeTopDownWithCorridors(model: NetworkModel, placement: 'current' | 'topology-staggered' = 'topology-staggered') {
  const base = layoutTopDownFullNetwork(model, { placement });
  const routes = new Map<string, readonly Point[]>(base.routes);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map(base.roomFrames.flatMap(frame => frame.memberAssetIds.map(id => [id, frame.id] as const)));
  const frames = base.roomFrames.map(({ id, x, y, width, height }) => ({ id: `room-frame:${id}`, x, y, width, height }));
  const allObstacles: RouteBox[] = [...base.routeObstacles, ...frames];
  const failures: { id: string; attempted: number; chosenCrossings?: number; chosenFrameCuts?: number; reason: string }[] = [];
  const requests = base.routeRequests.filter(request => !routes.has(request.id));

  for (const request of requests) {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId) ?? '';
    const toAsset = ownerByTerminal.get(request.toTerminalId) ?? '';
    const fromRoom = roomByAsset.get(fromAsset);
    const toRoom = roomByAsset.get(toAsset);
    const ignored = new Set([
      ...(request.ignoredObstacleIds ?? []),
      ...(fromRoom ? [`room-frame:${fromRoom}`] : []),
      ...(toRoom && toRoom !== fromRoom ? [`room-frame:${toRoom}`] : []),
    ]);
    const candidateRequest: RouteRequest = { ...request, ignoredObstacleIds: [...ignored] };
    const margin = Math.max(700, Math.min(8_000, Math.abs(request.from[0] - request.to[0]) * .12 + Math.abs(request.from[1] - request.to[1]) * .12));
    const minX = Math.min(request.from[0], request.to[0]);
    const maxX = Math.max(request.from[0], request.to[0]);
    const minY = Math.min(request.from[1], request.to[1]);
    const maxY = Math.max(request.from[1], request.to[1]);
    const lanes = [
      minX - margin, minX - margin * 2, maxX + margin, maxX + margin * 2,
    ].flatMap(x => [
      [request.from, [x, request.from[1]], [x, request.to[1]], request.to],
    ]).concat([
      minY - margin, minY - margin * 2, maxY + margin, maxY + margin * 2,
    ].map(y => [request.from, [request.from[0], y], [request.to[0], y], request.to]));
    const candidates: Point[][] = [
      [request.from, [request.from[0], request.to[1]], request.to],
      [request.from, [request.to[0], request.from[1]], request.to],
      ...lanes,
    ].map(simplify);
    const valid = candidates.filter(points => points.length >= 2
      && routeAvoidsObstacles(points, candidateRequest, allObstacles, 18));
    const permissive = valid.length ? valid : candidates.filter(points => points.length >= 2
      && routeAvoidsObstacles(points, candidateRequest, allObstacles, 0));
    const ranked = permissive.map(points => ({ points, score: scoreRoute(points, request.id, routes, model, allObstacles, candidateRequest, base.roomFrames, fromRoom, toRoom) }))
      .sort((a, b) => compareScore(a.score, b.score));
    const selected = ranked[0];
    if (!selected) {
      failures.push({ id: request.id, attempted: candidates.length, reason: 'no-clear-orthogonal-corridor' });
      continue;
    }
    routes.set(request.id, selected.points);
    failures.push({ id: request.id, attempted: candidates.length, chosenCrossings: selected.score[3], chosenFrameCuts: selected.score[4], reason: valid.length ? 'routed-with-reserved-corridor' : 'routed-with-zero-clearance' });
  }

  const geometryRoutes: GeometryRoute[] = [...routes].flatMap(([id, points]) => {
    const connection = connectionById.get(id);
    return connection ? [{ id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const findings = validateDiagramGeometry({ routes: geometryRoutes, roomFrames: base.roomFrames });
  const endpointFailures = geometryRoutes.filter(route => {
    const request = base.routeRequests.find(item => item.id === route.id)!;
    return !samePoint(route.points[0], request.from) || !samePoint(route.points.at(-1)!, request.to);
  }).map(route => route.id);
  const symbolLabelHits = geometryRoutes.flatMap(route => {
    const request = base.routeRequests.find(item => item.id === route.id)!;
    const ignored = new Set(request.ignoredObstacleIds ?? []);
    return route.points.slice(1).flatMap((to, index) => allObstacles
      .filter(box => !ignored.has(box.id) && !box.id.startsWith('room-frame:') && cutsBox(route.points[index], to, box))
      .map(box => ({ routeId: route.id, obstacleId: box.id })));
  });
  const routeIds = new Set(routes.keys());
  return {
    ...base,
    routes,
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routeIds.has(id)),
    findings,
    corridorReport: {
      initialRoutes: base.routes.size,
      attemptedMissing: requests.length,
      routedMissing: routes.size - base.routes.size,
      unresolved: failures.filter(item => item.reason === 'no-clear-orthogonal-corridor'),
      selected: failures.filter(item => item.reason !== 'no-clear-orthogonal-corridor'),
      endpointFailures,
      symbolLabelHits,
    },
  };
}

function scoreRoute(
  points: readonly Point[],
  routeId: string,
  existing: ReadonlyMap<string, readonly Point[]>,
  model: NetworkModel,
  obstacles: readonly RouteBox[],
  request: RouteRequest,
  roomFrames: readonly { id: string; x: number; y: number; width: number; height: number; memberAssetIds: string[] }[],
  fromRoom: string | undefined,
  toRoom: string | undefined,
): number[] {
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const endpointAssets = [ownerByTerminal.get(request.fromTerminalId), ownerByTerminal.get(request.toTerminalId)];
  let hardHits = 0; let shared = 0; let endpointTouches = 0; let crossings = 0;
  for (const [otherId, otherPoints] of existing) {
    const otherConnection = model.connections.find(connection => connection.id === otherId);
    const sharedTerminal = !!otherConnection
      && [request.fromTerminalId, request.toTerminalId].some(id => id === otherConnection.from || id === otherConnection.to);
    for (let i = 1; i < points.length; i++) for (let j = 1; j < otherPoints.length; j++) {
      const relation = segmentRelation(points[i - 1], points[i], otherPoints[j - 1], otherPoints[j]);
      if (relation === 'crossing') crossings++;
      else if (relation === 'shared') shared++;
      else if (relation === 'endpoint-touch' && !sharedTerminal) endpointTouches++;
    }
  }
  const frameCuts = routeFrameCutCount(points, roomFrames, new Set([fromRoom, toRoom].filter((id): id is string => Boolean(id))));
  hardHits = points.slice(1).flatMap((to, index) => obstacles.filter(box =>
    !request.ignoredObstacleIds?.includes(box.id) && !box.id.startsWith('room-frame:') && cutsBox(points[index], to, box),
  )).length;
  // These paths have already passed the obstacle screen; retain a defensive
  // penalty if a custom obstacle shape was not handled by routeAvoidsObstacles.
  if (hardHits) hardHits += endpointAssets.filter(Boolean).length;
  const length = points.slice(1).reduce((sum, point, index) => sum + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]), 0);
  const bends = Math.max(0, points.length - 2);
  return [hardHits, shared, endpointTouches, crossings, frameCuts, bends, length];
}

function routeFrameCutCount(
  points: readonly Point[],
  frames: readonly { id: string; x: number; y: number; width: number; height: number }[],
  ignoredRoomIds: ReadonlySet<string>,
) {
  let count = 0;
  for (const frame of frames) {
    if (ignoredRoomIds.has(frame.id)) continue;
    const box = { x: frame.x, y: frame.y, width: frame.width, height: frame.height };
    for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) { count++; break; }
  }
  return count;
}

function segmentRelation(a: Point, b: Point, c: Point, d: Point): 'crossing' | 'shared' | 'endpoint-touch' | 'none' {
  const aH = a[1] === b[1]; const bH = c[1] === d[1];
  if (aH !== bH) {
    const h1 = aH ? a : c; const h2 = aH ? b : d; const v1 = aH ? c : a; const v2 = aH ? d : b;
    const x = v1[0]; const y = h1[1];
    const onH = x >= Math.min(h1[0], h2[0]) && x <= Math.max(h1[0], h2[0]);
    const onV = y >= Math.min(v1[1], v2[1]) && y <= Math.max(v1[1], v2[1]);
    if (!onH || !onV) return 'none';
    const strict = x > Math.min(h1[0], h2[0]) && x < Math.max(h1[0], h2[0]) && y > Math.min(v1[1], v2[1]) && y < Math.max(v1[1], v2[1]);
    return strict ? 'crossing' : 'endpoint-touch';
  }
  const sameLine = aH ? a[1] === c[1] : a[0] === c[0];
  if (!sameLine) return 'none';
  const a0 = aH ? Math.min(a[0], b[0]) : Math.min(a[1], b[1]);
  const a1 = aH ? Math.max(a[0], b[0]) : Math.max(a[1], b[1]);
  const b0 = aH ? Math.min(c[0], d[0]) : Math.min(c[1], d[1]);
  const b1 = aH ? Math.max(c[0], d[0]) : Math.max(c[1], d[1]);
  const overlap = Math.min(a1, b1) - Math.max(a0, b0);
  return overlap > 0 ? 'shared' : overlap === 0 ? 'endpoint-touch' : 'none';
}

function simplify(points: readonly (readonly number[])[]): Point[] {
  const clean: Point[] = [];
  for (const [x, y] of points) {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
    if (clean.length && samePoint(clean.at(-1)!, [x, y])) continue;
    while (clean.length >= 2) {
      const a = clean.at(-2)!; const b = clean.at(-1)!;
      if ((a[0] === b[0] && b[0] === x) || (a[1] === b[1] && b[1] === y)) clean.pop();
      else break;
    }
    clean.push([x, y]);
  }
  return clean.every((point, index) => index === 0 || point[0] === clean[index - 1][0] || point[1] === clean[index - 1][1]) ? clean : [];
}

function samePoint(a: readonly number[], b: readonly number[]) { return a[0] === b[0] && a[1] === b[1]; }
function compareScore(a: readonly number[], b: readonly number[]) {
  for (let index = 0; index < Math.max(a.length, b.length); index++) if (a[index] !== b[index]) return (a[index] ?? 0) - (b[index] ?? 0);
  return 0;
}
