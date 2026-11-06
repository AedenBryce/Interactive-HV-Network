import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { AssetLabel, Point } from './diagram-geometry';
import { equipmentPorts } from './diagram-geometry';
import { hasDeviceCard } from './equipment-appearance';
import { deviceCard } from './device-card';
import { planOrthogonalRoutes } from './orthogonal-route-planner';
import type { ReservedRoute, RouteBox } from './orthogonal-route-planner';

export type RouteResolveOptions = {
  clearance?: number;
  maxLocalSearchPadding?: number;
  maxSearchAttempts?: number;
  maxGridNodes?: number;
};

export type RouteResolveDiagnostics = {
  selectedConnectionCount: number;
  conflictCount: number;
  reroutedConnectionIds: string[];
  unresolvedConnectionIds: string[];
};

/**
 * Resolve a selected set of connector paths against the whole drawing.
 * Existing routes outside `routeIds` are reserved as fixed geometry; selected
 * routes are planned together in stable, downward-first order. This keeps the
 * public mutating API used by continuousNetwork while replacing its local
 * candidate search with a deterministic global obstacle/reservation planner.
 */
export function resolveRoutes(
  model: NetworkModel,
  layout: DiagramLayout,
  labels: Map<string, AssetLabel>,
  routes: Map<string, Point[]>,
  hidden: Set<string>,
  routeIds?: Set<string>,
  endpoints?: (link: NetworkModel['connections'][number]) => { from: Point; to: Point },
  frames: readonly { id: string; x: number; y: number; width: number; height: number; assetIds: readonly string[] }[] = [],
  searchOptions: RouteResolveOptions = {},
): RouteResolveDiagnostics {
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const frameByAsset = new Map<string, string[]>();
  for (const frame of frames) for (const assetId of ('memberAssetIds' in frame && Array.isArray(frame.memberAssetIds)
    ? frame.memberAssetIds
    : frame.assetIds)) {
    frameByAsset.set(assetId, [...(frameByAsset.get(assetId) ?? []), frame.id]);
  }

  const obstacles: RouteBox[] = [];
  for (const asset of model.assets) {
    if (hidden.has(asset.id)) continue;
    const position = layout.assets[asset.id];
    const label = labels.get(asset.id);
    if (!position || !label) continue;
    if (hasDeviceCard(asset)) {
      const card = deviceCard(asset, position, label);
      obstacles.push({ id: `asset-card:${asset.id}`, x: position[0] + card.x - 10, y: position[1] + card.y - 10, width: card.width + 20, height: card.height + 20 });
    } else {
      obstacles.push({ id: `asset-symbol:${asset.id}`, x: position[0] - 48, y: position[1] - 48, width: 96, height: 96 });
    }
    obstacles.push({ id: `asset-label:${asset.id}`, x: label.x - 10, y: label.y - 10, width: label.width + 20, height: label.height + 20 });
  }
  for (const asset of model.assets) {
    if (asset.kind !== 'bus' || hidden.has(asset.id)) continue;
    const position = layout.assets[asset.id];
    if (!position) continue;
    const span = layout.busSpans?.[asset.id] ?? 60;
    const horizontal = Math.abs((layout.rotations?.[asset.id] ?? 0) % 180) === 90;
    obstacles.push(horizontal
      ? { id: `busbar:${asset.id}`, x: position[0] - span / 2, y: position[1] - 4, width: span, height: 8 }
      : { id: `busbar:${asset.id}`, x: position[0] - 4, y: position[1] - span / 2, width: 8, height: span });
  }
  for (const frame of frames) obstacles.push({ id: `room-frame:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height });

  const connectionsById = new Map(model.connections.map(connection => [connection.id, connection] as const));
  const allRouteGeometries: ReservedRoute[] = [];
  for (const [id, points] of routes) {
    const connection = connectionsById.get(id);
    if (!connection || points.length < 2) continue;
    const endpointsForRoute = endpoints?.(connection) ?? { from: layout.terminals[connection.from], to: layout.terminals[connection.to] };
    const oriented = endpointsForRoute?.from && endpointsForRoute.to
      && samePoint(points[0], endpointsForRoute.to) && samePoint(points.at(-1)!, endpointsForRoute.from)
      ? [...points].reverse() : points;
    allRouteGeometries.push({ id, points: oriented, fromTerminalId: connection.from, toTerminalId: connection.to });
  }

  // Include device leads in both the collision check and final reservation set.
  // This keeps routed connectors out of unrelated symbol bodies while allowing
  // a route to meet its own modeled terminal cleanly.
  const deviceLeads: ReservedRoute[] = [];
  for (const asset of model.assets) {
    if (hidden.has(asset.id)) continue;
    const position = layout.assets[asset.id];
    if (!position) continue;
    const { ports } = equipmentPorts(asset, layout);
    asset.terminals.forEach((terminal, index) => {
      const terminalPoint = layout.terminals[terminal];
      const port = ports[index];
      if (!terminalPoint || !port) return;
      const portPoint: Point = [position[0] + port[0], position[1] + port[1]];
      if (samePoint(terminalPoint, portPoint)) return;
      const points: Point[] = terminalPoint[0] === portPoint[0] || terminalPoint[1] === portPoint[1]
        ? [terminalPoint, portPoint]
        : [terminalPoint, [portPoint[0], terminalPoint[1]], portPoint];
      deviceLeads.push({
        id: `device-lead:${asset.id}:${terminal}`,
        points,
        fromTerminalId: terminal,
        toTerminalId: `symbol-port:${asset.id}:${terminal}`,
      });
    });
  }

  const selected = model.connections.filter(link => (!routeIds || routeIds.has(link.id)) && routes.has(link.id));
  const endpointById = new Map<string, { from: Point; to: Point }>();
  const reverseById = new Map<string, boolean>();
  const eligible = new Set<string>();
  for (const link of selected) {
    const current = routes.get(link.id)!;
    const points = endpoints?.(link) ?? { from: layout.terminals[link.from], to: layout.terminals[link.to] };
    if (current.length < 2 || !points.from || !points.to) continue;
    const startsAsModeled = samePoint(current[0], points.from) && samePoint(current.at(-1)!, points.to);
    const endsAsModeled = samePoint(current[0], points.to) && samePoint(current.at(-1)!, points.from);
    // Some inline tee/tie paths intentionally terminate on an already routed
    // conductor instead of their terminal coordinate. Keep those authored
    // paths fixed; the planner must not erase their topology.
    if (!startsAsModeled && !endsAsModeled) continue;
    endpointById.set(link.id, points);
    reverseById.set(link.id, endsAsModeled);
    eligible.add(link.id);
  }

  const dirty = new Set<string>();
  for (const link of selected) {
    if (!eligible.has(link.id)) continue;
    const points = routes.get(link.id)!;
    const current = reverseById.get(link.id) ? [...points].reverse() : points;
    const own = new Set([owners.get(link.from), owners.get(link.to)]);
    const ignored = new Set<string>([...own].filter((id): id is string => !!id).flatMap(id => [
      `asset-card:${id}`, `asset-symbol:${id}`, `asset-label:${id}`, `busbar:${id}`,
      ...(frameByAsset.get(id) ?? []).map(frameId => `room-frame:${frameId}`),
    ]));
    if (current.slice(1).some((to, index) => obstacles.some(box => !ignored.has(box.id) && segmentCutsBox(current[index], to, expandRouteBox(box, 24))))) {
      dirty.add(link.id);
      continue;
    }
    const routeGeometry = allRouteGeometries.filter(route => route.id !== link.id);
    const routeConflict = current.slice(1).some((to, index) => routeGeometry.some(route =>
      route.points.slice(1).some((otherTo, otherIndex) => routesConflict(
        current[index], to, link.from, link.to,
        [route.points[otherIndex][0], route.points[otherIndex][1]], [otherTo[0], otherTo[1]], route.fromTerminalId, route.toTerminalId,
        index === 0, index === current.length - 2,
        otherIndex === 0, otherIndex === route.points.length - 2,
      ))));
    const leadConflict = current.slice(1).some((to, index) => deviceLeads.some(route =>
      route.points.slice(1).some((otherTo, otherIndex) => routesConflict(
        current[index], to, link.from, link.to,
        [route.points[otherIndex][0], route.points[otherIndex][1]], [otherTo[0], otherTo[1]], route.fromTerminalId, route.toTerminalId,
        index === 0, index === current.length - 2,
        otherIndex === 0, otherIndex === route.points.length - 2,
      ))));
    if (routeConflict || leadConflict) dirty.add(link.id);
  }

  if (dirty.size === 0) return {
    selectedConnectionCount: selected.length,
    conflictCount: 0,
    reroutedConnectionIds: [],
    unresolvedConnectionIds: [],
  };
  const reservedRoutes = [
    ...allRouteGeometries.filter(route => !dirty.has(route.id)),
    ...deviceLeads,
  ];

  const requests = selected.filter(link => dirty.has(link.id)).flatMap(link => {
    const fallback = { from: layout.terminals[link.from], to: layout.terminals[link.to] };
    const points = endpointById.get(link.id) ?? endpoints?.(link) ?? fallback;
    if (!points.from || !points.to || !points.from.every(Number.isFinite) || !points.to.every(Number.isFinite)) return [];
    const endpointOwners = [owners.get(link.from), owners.get(link.to)].filter((id): id is string => !!id);
    const ignoredObstacleIds = endpointOwners.flatMap(id => [
      `asset-card:${id}`, `asset-symbol:${id}`, `asset-label:${id}`, `busbar:${id}`,
      ...(frameByAsset.get(id) ?? []).map(frameId => `room-frame:${frameId}`),
    ]);
    const existing = routes.get(link.id)!;
    const current = reverseById.get(link.id) ? [...existing].reverse() : existing;
    const downward = points.to[1] >= points.from[1];
    return [{
      id: link.id,
      from: points.from,
      to: points.to,
      fromTerminalId: link.from,
      toTerminalId: link.to,
      // Put supply-to-load connectors first; the planner reserves them before
      // alternate/ring connections and biases their path down the page.
      order: downward ? 0 : 1,
      preferDown: downward,
      ignoredObstacleIds,
      preferredPath: current,
    }];
  });

  if (requests.length === 0) return {
    selectedConnectionCount: selected.length,
    conflictCount: dirty.size,
    reroutedConnectionIds: [],
    unresolvedConnectionIds: [...dirty],
  };
  const planned = planOrthogonalRoutes(requests, {
    obstacles,
    reservedRoutes,
    clearance: searchOptions.clearance ?? 24,
    localSearchPadding: 320,
    maxLocalSearchPadding: searchOptions.maxLocalSearchPadding ?? 1280,
    maxSearchAttempts: searchOptions.maxSearchAttempts ?? 2,
    maxGridNodes: searchOptions.maxGridNodes,
  });
  for (const [id, points] of planned.routes) routes.set(id, points.map(point => [point[0], point[1]]));
  return {
    selectedConnectionCount: selected.length,
    conflictCount: dirty.size,
    reroutedConnectionIds: [...planned.routes.keys()],
    unresolvedConnectionIds: planned.unresolved.map(item => item.routeId),
  };
}

function samePoint(a: Point, b: Point) { return a[0] === b[0] && a[1] === b[1]; }

function expandRouteBox(box: RouteBox, amount: number): RouteBox {
  return { ...box, x: box.x - amount, y: box.y - amount, width: box.width + amount * 2, height: box.height + amount * 2 };
}

function segmentCutsBox(a: Point, b: Point, box: RouteBox): boolean {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width
    && Math.max(Math.min(a[1], b[1]), box.y) < Math.min(Math.max(a[1], b[1]), box.y + box.height);
  if (a[1] === b[1]) return a[1] > box.y && a[1] < box.y + box.height
    && Math.max(Math.min(a[0], b[0]), box.x) < Math.min(Math.max(a[0], b[0]), box.x + box.width);
  return true;
}

function routesConflict(a: Point, b: Point, aFromTerminal: string, aToTerminal: string,
  c: Point, d: Point, cFromTerminal: string, cToTerminal: string,
  aIsRouteStart: boolean, aIsRouteEnd: boolean, cIsRouteStart: boolean, cIsRouteEnd: boolean): boolean {
  const intersection = routeIntersection(a, b, c, d);
  if (intersection === undefined) return false;
  if (intersection === 'overlap') return true;
  // Only matching model terminals may touch, and only when both routes end at
  // that same point. All other contacts are visible connector collisions.
  const allowed = (aIsRouteStart && samePoint(intersection, a) && aFromTerminal === cFromTerminal && cIsRouteStart && samePoint(intersection, c))
    || (aIsRouteStart && samePoint(intersection, a) && aFromTerminal === cToTerminal && cIsRouteEnd && samePoint(intersection, d))
    || (aIsRouteEnd && samePoint(intersection, b) && aToTerminal === cFromTerminal && cIsRouteStart && samePoint(intersection, c))
    || (aIsRouteEnd && samePoint(intersection, b) && aToTerminal === cToTerminal && cIsRouteEnd && samePoint(intersection, d));
  return !allowed;
}

function routeIntersection(a: Point, b: Point, c: Point, d: Point): Point | 'overlap' | undefined {
  const aVertical = a[0] === b[0]; const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical && a[0] === c[0]) {
      const low = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      const high = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
      return low > high ? undefined : low < high ? 'overlap' : [a[0], low];
    }
    if (!aVertical && a[1] === c[1]) {
      const low = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const high = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
      return low > high ? undefined : low < high ? 'overlap' : [low, a[1]];
    }
    return undefined;
  }
  const vertical = aVertical ? [a, b] as const : [c, d] as const;
  const horizontal = aVertical ? [c, d] as const : [a, b] as const;
  const point: Point = [vertical[0][0], horizontal[0][1]];
  return between(point[0], horizontal[0][0], horizontal[1][0]) && between(point[1], vertical[0][1], vertical[1][1]) ? point : undefined;
}

function between(value: number, a: number, b: number) { return value >= Math.min(a, b) && value <= Math.max(a, b); }
