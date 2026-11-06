import type { NetworkModel } from '../session/model';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { planOrthogonalRoutes, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';

/**
 * Trial 8: keep electrical rooms as rigid top-down modules, then assign each
 * cross-room edge to an open horizontal channel between room rows. The router
 * reserves each accepted channel route before placing the next edge.
 */
export function layoutTrial8OrthogonalCorridors(model: NetworkModel) {
  const source = layoutRoomOwnedTopDownCandidate(model);
  const externalIds = new Set(source.externalConnectionIds);
  const routes = new Map([...source.routes].filter(([id]) => !externalIds.has(id)));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
  const roomByAsset = new Map(source.frames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const frames = source.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const obstacles = [...source.routingObstacles];
  const reserved: ReservedRoute[] = [...routes].flatMap(([id, points]) => {
    const link = connectionById.get(id);
    return link ? [{ id, points, fromTerminalId: link.from, toTerminalId: link.to }] : [];
  });
  const yChannels = findHorizontalChannels(source.frames);
  const requests = [...source.externalRequests].sort((a, b) =>
    (a.order ?? 0) - (b.order ?? 0)
    || routeDistance(b) - routeDistance(a)
    || a.id.localeCompare(b.id));
  const acceptedChannelById = new Map<string, number>();
  const unresolved: { routeId: string; reason: string }[] = [];
  const routeAttempts: { routeId: string; channelY: number; outcome: string }[] = [];

  for (const request of requests) {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId);
    const toAsset = ownerByTerminal.get(request.toTerminalId);
    // The candidate's room ownership determines which horizontal channels are
    // available; the endpoints themselves are already the translated ports.
    const fromRoom = roomByAsset.get(fromAsset ?? '');
    const toRoom = roomByAsset.get(toAsset ?? '');
    const yChoices = yChannels
      .filter(y => y >= Math.min(request.from[1], request.to[1]) - 300)
      .filter(y => fromRoom !== toRoom || y >= request.from[1])
      .sort((a, b) => channelCost(a, request) - channelCost(b, request) || a - b);
    let accepted = false;
    let lastReason = 'no-open-channel';
    for (const y of yChoices) {
      const path: Point[] = compact([
        [request.from[0], request.from[1]],
        [request.from[0], y],
        [request.to[0], y],
        [request.to[0], request.to[1]],
      ]);
      const minX = Math.min(request.from[0], request.to[0]) - 40;
      const maxX = Math.max(request.from[0], request.to[0]) + 40;
      const minY = Math.min(request.from[1], request.to[1], y) - 40;
      const maxY = Math.max(request.from[1], request.to[1], y) + 40;
      const boundedRequest: RouteRequest = {
        ...request,
        preferDown: true,
        preferredPath: path,
        bounds: { id: `trial8-channel:${request.id}`, x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      };
      const plan = planOrthogonalRoutes([boundedRequest], {
        obstacles,
        reservedRoutes: reserved,
        clearance: 28,
        localSearchPadding: 32,
        maxLocalSearchPadding: 32,
        maxSearchAttempts: 1,
        maxGridNodes: 12_000,
        bendPenalty: 100,
      });
      const route = plan.routes.get(request.id);
      if (!route) {
        lastReason = plan.unresolved[0]?.reason ?? 'no-path';
        routeAttempts.push({ routeId: request.id, channelY: y, outcome: lastReason });
        continue;
      }
      routes.set(request.id, route.map(point => [point[0], point[1]] as Point));
      reserved.push({ id: request.id, points: route, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
      acceptedChannelById.set(request.id, y);
      routeAttempts.push({ routeId: request.id, channelY: y, outcome: 'routed' });
      accepted = true;
      break;
    }
    if (!accepted) unresolved.push({ routeId: request.id, reason: lastReason });
  }

  const geometryRoutes: GeometryRoute[] = [...routes].flatMap(([id, points]) => {
    const link = connectionById.get(id);
    return link ? [{ id, points, terminals: [link.from, link.to] }] : [];
  });
  const findings = validateDiagramGeometry({ routes: geometryRoutes, roomFrames: frames });
  const routeHits = new Set<string>();
  for (const route of geometryRoutes) {
    const link = connectionById.get(route.id)!;
    const endpoints = new Set([ownerByTerminal.get(link.from), ownerByTerminal.get(link.to)]);
    for (const box of source.symbolLabelBoxes) {
      if (endpoints.has(box.id.replace(/^(?:symbol|label):/, ''))) continue;
      for (let index = 1; index < route.points.length; index++) {
        if (cutsRect(route.points[index - 1], route.points[index], box)) routeHits.add(`${route.id}->${box.id}`);
      }
    }
  }
  return {
    ...source,
    routes,
    findings,
    unresolved: [...source.connectionsWithoutRoute.filter(id => !externalIds.has(id)), ...unresolved.map(item => `${item.routeId}:${item.reason}`)],
    routeCount: routes.size,
    yChannels,
    acceptedChannelById,
    routeAttempts,
    channelFailures: unresolved,
    routeContentHits: [...routeHits],
    contentBoxCollisions: countContentCollisions(source.symbolLabelBoxes),
  };
}

function findHorizontalChannels(frames: readonly { y: number; height: number }[]) {
  const edges = [...new Set(frames.flatMap(frame => [frame.y - 160, frame.y + frame.height + 160]))].sort((a, b) => a - b);
  const channels: number[] = [];
  for (let index = 0; index < edges.length - 1; index++) {
    if (edges[index + 1] - edges[index] >= 220) channels.push((edges[index] + edges[index + 1]) / 2);
  }
  if (edges.length) channels.push(edges.at(-1)! + 420);
  return channels;
}
function routeDistance(request: RouteRequest) { return Math.abs(request.from[0] - request.to[0]) + Math.abs(request.from[1] - request.to[1]); }
function channelCost(y: number, request: RouteRequest) {
  const midpoint = (request.from[1] + request.to[1]) / 2;
  return Math.abs(y - midpoint) + (y < Math.max(request.from[1], request.to[1]) ? 10_000 : 0);
}
function compact(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && previous[0] === point[0] && previous[1] === point[1]) continue;
    result.push(point);
    while (result.length >= 3) {
      const a = result[result.length - 3]; const b = result[result.length - 2]; const c = result[result.length - 1];
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) result.splice(result.length - 2, 1);
      else break;
    }
  }
  return result;
}
function cutsRect(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }) {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height;
  if (a[1] === b[1]) return a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
  return true;
}
function countContentCollisions(boxes: readonly { id: string; x: number; y: number; width: number; height: number }[]) {
  let count = 0;
  for (let index = 0; index < boxes.length; index++) {
    const a = boxes[index];
    const ownerA = a.id.replace(/^(?:symbol|label):/, '');
    for (const b of boxes.slice(index + 1)) {
      if (ownerA === b.id.replace(/^(?:symbol|label):/, '')) continue;
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) count++;
    }
  }
  return count;
}
