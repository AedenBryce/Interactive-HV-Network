import type { NetworkModel } from '../session/model';
import { planOrthogonalRoutes, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';
import type { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';

type RoomOwnedCandidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;
type GutterRoutingOptions = {
  maxGridNodes?: number;
  maxSearchAttempts?: number;
  maxLocalSearchPadding?: number;
};

/** Keep translated source routes only when clear; route the rest through unique outer gutters. */
export function routeRoomOwnedCandidateGutters(
  model: NetworkModel,
  candidate: RoomOwnedCandidate,
  options: GutterRoutingOptions = {},
) {
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const externalIds = new Set(candidate.externalRequests.map(request => request.id));
  const localRoutes = new Map([...candidate.routes].filter(([id]) => candidate.localRouteIds.includes(id)));
  const translatedExternal = new Map<string, Point[]>();
  for (const request of candidate.externalRequests) {
    const connection = connectionById.get(request.id)!;
    const fromOwner = ownerByTerminal.get(connection.from)!; const toOwner = ownerByTerminal.get(connection.to)!;
    const original = candidate.originalRoutes.get(request.id); if (!original) continue;
    const fromDelta = candidate.deltaByAsset.get(fromOwner) ?? [0, 0];
    const toDelta = candidate.deltaByAsset.get(toOwner) ?? [0, 0];
    const average: Point = [(fromDelta[0] + toDelta[0]) / 2, (fromDelta[1] + toDelta[1]) / 2];
    const core = original.map(([x, y]) => [x + average[0], y + average[1]] as Point);
    const points: Point[] = [];
    const from: Point = [original[0][0] + fromDelta[0], original[0][1] + fromDelta[1]];
    const end0 = original.at(-1)!;
    const to: Point = [end0[0] + toDelta[0], end0[1] + toDelta[1]];
    appendOrthogonal(points, from);
    for (const point of core.slice(1, -1)) appendOrthogonal(points, point);
    appendOrthogonal(points, to);
    translatedExternal.set(request.id, points);
  }

  // Reject all translated routes participating in crossings/shared lengths,
  // hitting symbols/labels, or crossing an unrelated frame. Existing local
  // route findings are left for the main full-candidate audit.
  const provisional = new Map(localRoutes);
  for (const [id, points] of translatedExternal) provisional.set(id, points);
  const provisionalFindings = validateDiagramGeometry({
    routes: asGeometryRoutes(provisional, connectionById),
    roomFrames: candidate.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
  });
  const rejected = new Set<string>();
  for (const finding of provisionalFindings) {
    if (finding.type === 'route-crossing' || finding.type === 'shared-route-length' || finding.type === 'route-endpoint-on-interior') {
      for (const id of finding.routeIds) if (externalIds.has(id)) rejected.add(id);
    } else if (finding.type === 'route-room-frame' && externalIds.has(finding.routeId)) {
      const route = connectionById.get(finding.routeId)!;
      const frame = candidate.frames.find(item => item.id === finding.roomFrameId);
      const endpointOwners = [ownerByTerminal.get(route.from), ownerByTerminal.get(route.to)];
      if (!frame || !endpointOwners.some(id => frame.memberAssetIds.includes(id!))) rejected.add(finding.routeId);
    }
  }
  for (const [id, points] of translatedExternal) {
    if (routeHitsAssetGeometry(id, points, model, candidate, ownerByTerminal)) rejected.add(id);
  }
  const keptOriginal = new Map([...translatedExternal].filter(([id]) => !rejected.has(id)));
  const acceptedRoutes = new Map([...localRoutes, ...keptOriginal]);
  const reserved: ReservedRoute[] = [...acceptedRoutes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points, fromTerminalId: connection.from, toTerminalId: connection.to };
  });
  const pending: RouteRequest[] = candidate.externalRequests.filter(request => !acceptedRoutes.has(request.id));
  const endpointSections = new Map<string, { prefix: Point[]; suffix: Point[]; from: Point; to: Point }>();
  const originalFrameByAsset = new Map(candidate.originalFrames.flatMap(frame =>
    [...new Set([...frame.memberAssetIds, ...frame.assetIds])].map(assetId => [assetId, frame] as const)));
  for (const request of pending) {
    const connection = connectionById.get(request.id)!;
    const fromOwner = ownerByTerminal.get(connection.from)!; const toOwner = ownerByTerminal.get(connection.to)!;
    const original = candidate.originalRoutes.get(request.id);
    if (!original?.length) continue;
    const fromDelta = candidate.deltaByAsset.get(fromOwner) ?? [0, 0];
    const toDelta = candidate.deltaByAsset.get(toOwner) ?? [0, 0];
    const sourceSection = extractRoomExit(original, originalFrameByAsset.get(fromOwner), fromDelta);
    const targetSection = extractRoomEntry(original, originalFrameByAsset.get(toOwner), toDelta);
    endpointSections.set(request.id, {
      prefix: sourceSection.path,
      suffix: targetSection.path,
      from: sourceSection.port,
      to: targetSection.port,
    });
  }
  const routes = new Map(acceptedRoutes);
  const gutterRoutedIds: string[] = [];
  const gutterFailures: { routeId: string; reason: string; from: Point; to: Point }[] = [];
  const laneOffsets = [-96, 96, -256, 256];
  for (const [index, request] of pending.entries()) {
    const section = endpointSections.get(request.id);
    const from = section?.from ?? request.from as Point;
    const to = section?.to ?? request.to as Point;
    const connection = connectionById.get(request.id)!;
    const endpointRoomIds = new Set((request.ignoredObstacleIds ?? [])
      .filter(id => id.startsWith('room:'))
      .map(id => id.slice('room:'.length)));
    const routeObstacles = candidate.routingObstacles.filter(box => {
      if (box.id.startsWith('room:')) return true;
      const containingRoom = candidate.frames.find(frame =>
        box.x >= frame.x - 1 && box.y >= frame.y - 1
        && box.x + box.width <= frame.x + frame.width + 1
        && box.y + box.height <= frame.y + frame.height + 1);
      return !containingRoom || endpointRoomIds.has(containingRoom.id);
    });
    const portReservations: ReservedRoute[] = [];
    if (section && section.prefix.length > 1) portReservations.push({
      id: `${request.id}:room-exit`, points: section.prefix,
      fromTerminalId: connection.from, toTerminalId: `${request.id}:room-port-from`,
    });
    if (section && section.suffix.length > 1) portReservations.push({
      id: `${request.id}:room-entry`, points: section.suffix,
      fromTerminalId: `${request.id}:room-port-to`, toTerminalId: connection.to,
    });
    const reservedWithPorts = [...reserved, ...portReservations];
    let accepted: Point[] | undefined;
    let lastReason = 'no-path';
    for (const offset of laneOffsets) {
      // Keep each search local to its two room ports. Reserve the complete
      // accepted paths below, not just the middle generated by the router.
      const laneX = (from[0] + to[0]) / 2 + offset + (index % 2 === 0 ? -24 : 24);
      const preferredPath: Point[] = [from, [laneX, from[1]], [laneX, to[1]], to];
      const middleRequest: RouteRequest = {
        ...request,
        from,
        to,
        fromTerminalId: `${request.id}:room-port-from`,
        toTerminalId: `${request.id}:room-port-to`,
        order: request.order ?? 1,
        preferredPath,
      };
      const plan = planOrthogonalRoutes([middleRequest], {
        obstacles: routeObstacles,
        reservedRoutes: reservedWithPorts,
        clearance: 32,
        localSearchPadding: 500,
        maxLocalSearchPadding: options.maxLocalSearchPadding ?? 8_000,
        maxSearchAttempts: options.maxSearchAttempts ?? 4,
        maxGridNodes: options.maxGridNodes ?? 100_000,
        bendPenalty: 160,
      });
      const middle = plan.routes.get(request.id);
      if (!middle) { lastReason = plan.unresolved[0]?.reason ?? 'no-path'; continue; }
      const points: Point[] = [];
      for (const point of section?.prefix ?? []) appendOrthogonal(points, point);
      for (const point of middle) appendOrthogonal(points, [point[0], point[1]]);
      for (const point of section?.suffix ?? []) appendOrthogonal(points, point);

      const proposedRoutes = new Map(routes);
      proposedRoutes.set(request.id, points);
      const proposedFindings = validateDiagramGeometry({
        routes: asGeometryRoutes(proposedRoutes, connectionById),
        roomFrames: candidate.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
      });
      const routeCollision = proposedFindings.some(finding => {
        if (finding.type === 'route-crossing' || finding.type === 'shared-route-length' || finding.type === 'route-endpoint-on-interior') {
          return finding.routeIds.includes(request.id) && finding.routeIds.some(id => id !== request.id);
        }
        return false;
      });
      const unrelatedFrameCut = proposedFindings.some(finding => {
        if (finding.type !== 'route-room-frame' || finding.routeId !== request.id) return false;
        const frame = candidate.frames.find(item => item.id === finding.roomFrameId);
        const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        return !frame || !endpoints.some(id => id && frame.memberAssetIds.includes(id));
      });
      if (routeCollision || unrelatedFrameCut || routeHitsAssetGeometry(request.id, points, model, candidate, ownerByTerminal)) {
        lastReason = routeCollision ? 'composed-route-collision' : unrelatedFrameCut ? 'unrelated-room-frame' : 'asset-obstacle';
        continue;
      }
      accepted = points;
      break;
    }
    if (!accepted) { gutterFailures.push({ routeId: request.id, reason: lastReason, from, to }); continue; }
    routes.set(request.id, accepted);
    gutterRoutedIds.push(request.id);
    reserved.push({ id: request.id, points: accepted, fromTerminalId: connection.from, toTerminalId: connection.to });
  }
  const fallbackRoutes = new Map(candidate.externalRequests
    .filter(request => !routes.has(request.id))
    .flatMap(request => {
      const translated = translatedExternal.get(request.id);
      return translated ? [[request.id, translated] as const] : [];
    }));
  return {
    routes,
    fallbackRoutes,
    translatedExternalCount: translatedExternal.size,
    keptOriginalIds: [...keptOriginal.keys()],
    rejectedOriginalIds: [...rejected],
    gutterRoutedIds,
    gutterFailures,
    remaining: model.connections.map(connection => connection.id).filter(id => !routes.has(id)),
  };
}

function extractRoomExit(route: readonly Point[], frame: { x: number; y: number; width: number; height: number } | undefined, delta: Point) {
  if (!frame || route.length < 2) return { path: [translate(route[0], delta)], port: translate(route[0], delta) };
  for (let index = 0; index < route.length - 1; index++) {
    const a = route[index]; const b = route[index + 1];
    if (inside(a, frame) && !inside(b, frame)) {
      const port = boundaryPoint(a, b, frame);
      return { path: [...route.slice(0, index + 1), port].map(point => translate(point, delta)), port: translate(port, delta) };
    }
  }
  const point = route[0];
  return { path: [translate(point, delta)], port: translate(point, delta) };
}

function extractRoomEntry(route: readonly Point[], frame: { x: number; y: number; width: number; height: number } | undefined, delta: Point) {
  if (!frame || route.length < 2) return { path: [translate(route.at(-1)!, delta)], port: translate(route.at(-1)!, delta) };
  for (let index = route.length - 1; index > 0; index--) {
    const a = route[index]; const b = route[index - 1];
    if (inside(a, frame) && !inside(b, frame)) {
      const port = boundaryPoint(a, b, frame);
      return { path: [port, ...route.slice(index)].map(point => translate(point, delta)), port: translate(port, delta) };
    }
  }
  const point = route.at(-1)!;
  return { path: [translate(point, delta)], port: translate(point, delta) };
}

function translate(point: Point, delta: Point): Point { return [point[0] + delta[0], point[1] + delta[1]]; }
function inside(point: Point, frame: { x: number; y: number; width: number; height: number }) {
  return point[0] >= frame.x && point[0] <= frame.x + frame.width && point[1] >= frame.y && point[1] <= frame.y + frame.height;
}
function boundaryPoint(a: Point, b: Point, frame: { x: number; y: number; width: number; height: number }): Point {
  if (a[1] === b[1]) {
    const x = b[0] < frame.x ? frame.x : b[0] > frame.x + frame.width ? frame.x + frame.width : a[0];
    return [x, a[1]];
  }
  if (a[0] === b[0]) {
    const y = b[1] < frame.y ? frame.y : b[1] > frame.y + frame.height ? frame.y + frame.height : a[1];
    return [a[0], y];
  }
  return a;
}

function appendOrthogonal(points: Point[], point: Point) {
  const previous = points.at(-1);
  if (!previous) { points.push(point); return; }
  if (previous[0] !== point[0] && previous[1] !== point[1]) points.push([point[0], previous[1]]);
  if (previous[0] !== point[0] || previous[1] !== point[1]) points.push(point);
}


function asGeometryRoutes(routes: ReadonlyMap<string, readonly Point[]>, connectionById: ReadonlyMap<string, NetworkModel['connections'][number]>): GeometryRoute[] {
  return [...routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points, terminals: [connection.from, connection.to] };
  });
}

function routeHitsAssetGeometry(
  routeId: string,
  points: readonly Point[],
  model: NetworkModel,
  candidate: RoomOwnedCandidate,
  ownerByTerminal: ReadonlyMap<string, string>,
) {
  const connection = model.connections.find(item => item.id === routeId)!;
  const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
  return candidate.symbolLabelBoxes.some(box => {
    const owner = box.id.replace(/^(?:symbol|label):/, '');
    if (endpoints.includes(owner)) return false;
    return points.slice(1).some((to, index) => segmentBox(points[index], to, box));
  });
}
function segmentBox(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }) {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height;
  if (a[1] === b[1]) return a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
  return true;
}
