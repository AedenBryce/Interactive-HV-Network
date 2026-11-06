export type RoutePoint = readonly [x: number, y: number];
export type RouteBox = { id: string; x: number; y: number; width: number; height: number };
export type RouteRequest = {
  id: string;
  from: RoutePoint;
  to: RoutePoint;
  fromTerminalId: string;
  toTerminalId: string;
  /** Biases equal-quality paths toward increasing y (down the page). */
  preferDown?: boolean;
  /** Stable ordering among requests. Ties use the route ID. */
  order?: number;
  /** Obstacles owned by this route's endpoint symbols, labels or room frames. */
  ignoredObstacleIds?: readonly string[];
  /** Existing caller path to retain when it is already globally clear. */
  preferredPath?: readonly RoutePoint[];
  /** Optional hard viewport for this route, overriding the planner-wide viewport. */
  bounds?: RouteBox;
};
export type ReservedRoute = {
  id: string;
  points: readonly RoutePoint[];
  fromTerminalId: string;
  toTerminalId: string;
};
export type RouteUnresolved = {
  routeId: string;
  reason: 'duplicate-id' | 'blocked-endpoint' | 'grid-too-large' | 'no-path';
};
export type OrthogonalRoutePlan = {
  routes: ReadonlyMap<string, readonly RoutePoint[]>;
  unresolved: readonly RouteUnresolved[];
};
export type OrthogonalRouteOptions = {
  obstacles?: readonly RouteBox[];
  reservedRoutes?: readonly ReservedRoute[];
  /** Optional hard routing viewport; routes cannot leave it to bypass a wall. */
  bounds?: RouteBox;
  /** First local search padding around route endpoints. Defaults to 320. */
  localSearchPadding?: number;
  /** Largest local search padding tried. Defaults to 2560. */
  maxLocalSearchPadding?: number;
  /** Maximum bounded attempts per route. Defaults to 4. */
  maxSearchAttempts?: number;
  clearance?: number;
  bendPenalty?: number;
  maxGridNodes?: number;
  /** Permit perpendicular interior crossings if no crossing-free route exists. Shared lengths and terminal-on-interior contacts stay blocked. */
  allowCrossings?: boolean;
  /** Cost per distinct existing route crossed when allowCrossings is enabled. */
  crossingPenalty?: number;
};

type Segment = { from: RoutePoint; to: RoutePoint; route: ReservedRoute };
type SearchState = { node: number; direction: 0 | 1 | 2; cost: number; score: number };

/**
 * Deterministic orthogonal path planner. Requests are routed in `order`, then
 * ID order; each accepted route reserves its line geometry for later routes.
 * A crossing or shared segment is allowed only at a matching modeled terminal
 * that is an endpoint of both routes. Room/symbol rectangles are hard blocks.
 */
export function planOrthogonalRoutes(
  requests: readonly RouteRequest[],
  options: OrthogonalRouteOptions = {},
): OrthogonalRoutePlan {
  const clearance = Math.max(0, options.clearance ?? 24);
  const bendPenalty = Math.max(0, options.bendPenalty ?? 120);
  const maxGridNodes = options.maxGridNodes ?? 30_000;
  const routes = new Map<string, readonly RoutePoint[]>();
  const unresolved: RouteUnresolved[] = [];
  const seen = new Set<string>();
  const obstacles = options.obstacles ?? [];
  const reserved: ReservedRoute[] = [...(options.reservedRoutes ?? [])].sort((a, b) => a.id.localeCompare(b.id));
  const ordered = [...requests].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.id.localeCompare(b.id));

  for (const request of ordered) {
    const bounds = request.bounds ?? options.bounds;
    if (seen.has(request.id)) {
      unresolved.push({ routeId: request.id, reason: 'duplicate-id' });
      continue;
    }
    seen.add(request.id);
    const from: RoutePoint = [request.from[0], request.from[1]];
    const to: RoutePoint = [request.to[0], request.to[1]];
    if (![...from, ...to].every(Number.isFinite)
      || (bounds && (![from, to].every(point => point[0] >= bounds.x && point[0] <= bounds.x + bounds.width
        && point[1] >= bounds.y && point[1] <= bounds.y + bounds.height)))
      || obstacles.filter(box => !request.ignoredObstacleIds?.includes(box.id))
        .some(box => strictlyContains(expand(box, clearance), from) || strictlyContains(expand(box, clearance), to))) {
      unresolved.push({ routeId: request.id, reason: 'blocked-endpoint' });
      continue;
    }
    const initialPadding = Math.max(clearance * 2, options.localSearchPadding ?? 320);
    const maxPadding = Math.max(initialPadding, options.maxLocalSearchPadding ?? 2560);
    const maxAttempts = Math.max(1, Math.floor(options.maxSearchAttempts ?? 4));
    const direct = directOrthogonalPath(request, from, to, obstacles, reserved, clearance, bounds, initialPadding, options.allowCrossings ?? false);
    if (direct && routeAvoidsObstacles(direct, request, obstacles, clearance)) {
      routes.set(request.id, direct);
      reserved.push({ id: request.id, points: direct, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
      continue;
    }
    let path: RoutePoint[] | undefined;
    let gridTooLarge = false;
    let padding = initialPadding;
    for (let attempt = 0; attempt < maxAttempts && padding <= maxPadding; attempt++) {
      // The last bounded attempt must use the requested outer radius. The
      // former doubling loop could stop short (for example, attempts=2 tried
      // 320 and 640 while maxPadding was 1280), making full-room detours
      // impossible even though the caller had explicitly allowed that search
      // space. Spread intermediate attempts geometrically, retaining the
      // initial local search and always reaching the configured maximum.
      if (attempt === maxAttempts - 1) padding = maxPadding;
      const result = search(request, from, to, obstacles, reserved, clearance, bendPenalty, maxGridNodes, bounds, padding,
        options.allowCrossings ?? false, Math.max(0, options.crossingPenalty ?? 2_000));
      if (result.kind === 'path') { path = result.points; break; }
      if (result.kind === 'grid-too-large') gridTooLarge = true;
      if (padding === maxPadding) break;
      const remainingAttempts = maxAttempts - attempt - 1;
      const growth = remainingAttempts > 1
        ? Math.pow(maxPadding / initialPadding, 1 / (maxAttempts - 1))
        : 1;
      padding = Math.min(maxPadding, Math.max(padding + 1, padding * growth));
    }
    if (!path || !routeAvoidsObstacles(path, request, obstacles, clearance)) {
      unresolved.push({ routeId: request.id, reason: gridTooLarge ? 'grid-too-large' : 'no-path' });
      continue;
    }
    routes.set(request.id, path);
    reserved.push({ id: request.id, points: path, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
  }
  return { routes, unresolved };
}

/** Final safety check for every returned route, independent of the search path used. */
export function routeAvoidsObstacles(
  points: readonly RoutePoint[],
  request: Pick<RouteRequest, 'ignoredObstacleIds'>,
  obstacles: readonly RouteBox[],
  clearance = 0,
): boolean {
  const ignored = new Set(request.ignoredObstacleIds ?? []);
  const blockers = obstacles.filter(box => !ignored.has(box.id)).map(box => expand(box, clearance));
  return points.slice(1).every((point, index) =>
    blockers.every(box => !segmentCutsBox(points[index], point, box)),
  );
}

/** Fast path for the two natural single-bend SLD shapes before grid search. */
function directOrthogonalPath(
  request: RouteRequest,
  from: RoutePoint,
  to: RoutePoint,
  obstacles: readonly RouteBox[],
  reservedRoutes: readonly ReservedRoute[],
  clearance: number,
  bounds: RouteBox | undefined,
  padding: number,
  allowCrossings: boolean,
): RoutePoint[] | undefined {
  const extent = [from, to, ...(request.preferredPath ?? [])];
  const minX = bounds?.x ?? Math.min(...extent.map(point => point[0])) - padding;
  const minY = bounds?.y ?? Math.min(...extent.map(point => point[1])) - padding;
  const localBounds: RouteBox = {
    id: 'route-local', x: minX, y: minY,
    width: bounds?.width ?? Math.max(...extent.map(point => point[0])) - Math.min(...extent.map(point => point[0])) + padding * 2,
    height: bounds?.height ?? Math.max(...extent.map(point => point[1])) - Math.min(...extent.map(point => point[1])) + padding * 2,
  };
  const localObstacles = obstacles.filter(box => !request.ignoredObstacleIds?.includes(box.id)
    && boxesIntersect(expand(box, clearance), localBounds)).map(box => expand(box, clearance));
  const occupied: Segment[] = reservedRoutes.filter(route => routeIntersectsBounds(route, localBounds, clearance)).flatMap(route =>
    route.points.slice(1).map((point, index) => ({ from: route.points[index], to: point, route })),
  );
  const candidates = [
    ...(request.preferredPath ? [[...request.preferredPath].map(point => [point[0], point[1]] as RoutePoint)] : []),
    simplify([from, [from[0], to[1]], to]),
    simplify([from, [to[0], from[1]], to]),
  ];
  for (const candidate of candidates) {
    const validShape = candidate.length >= 2 && samePoint(candidate[0], from) && samePoint(candidate.at(-1)!, to)
      && candidate.slice(1).every((point, i) => candidate[i][0] === point[0] || candidate[i][1] === point[1]);
    if (!validShape) continue;
    const blocked = candidate.slice(1).some((point, index) => localObstacles.some(box => segmentCutsBox(candidate[index], point, box)));
    if (!blocked && pathIsClear(candidate, request, occupied, allowCrossings)) return candidate;
  }
  return undefined;
}

function search(
  request: RouteRequest,
  from: RoutePoint,
  to: RoutePoint,
  obstacles: readonly RouteBox[],
  reservedRoutes: readonly ReservedRoute[],
  clearance: number,
  bendPenalty: number,
  maxGridNodes: number,
  bounds: RouteBox | undefined,
  padding: number,
  allowCrossings: boolean,
  crossingPenalty: number,
): { kind: 'path'; points: RoutePoint[] } | { kind: 'no-path' | 'grid-too-large' } {
  const minX = bounds?.x ?? Math.min(from[0], to[0]) - padding;
  const maxX = bounds ? bounds.x + bounds.width : Math.max(from[0], to[0]) + padding;
  const minY = bounds?.y ?? Math.min(from[1], to[1]) - padding;
  const maxY = bounds ? bounds.y + bounds.height : Math.max(from[1], to[1]) + padding;
  const localBounds: RouteBox = { id: 'route-local', x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  const localObstacles = obstacles
    .filter(box => !request.ignoredObstacleIds?.includes(box.id))
    .map(box => expand(box, clearance))
    .filter(box => boxesIntersect(box, localBounds));
  const localReservedRoutes = reservedRoutes.filter(route => routeIntersectsBounds(route, localBounds, clearance));
  const xs = new Set<number>([from[0], to[0], minX, maxX]);
  const ys = new Set<number>([from[1], to[1], minY, maxY]);
  for (const box of localObstacles) {
    xs.add(box.x); xs.add(box.x + box.width);
    ys.add(box.y); ys.add(box.y + box.height);
  }
  for (const route of localReservedRoutes) {
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1]; const b = route.points[i];
      if (!segmentIntersectsBounds(a, b, localBounds, clearance)) continue;
      if (a[0] === b[0]) {
        xs.add(a[0] - clearance); xs.add(a[0] + clearance);
        ys.add(a[1] - clearance); ys.add(a[1] + clearance);
        ys.add(b[1] - clearance); ys.add(b[1] + clearance);
      } else if (a[1] === b[1]) {
        ys.add(a[1] - clearance); ys.add(a[1] + clearance);
        xs.add(a[0] - clearance); xs.add(a[0] + clearance);
        xs.add(b[0] - clearance); xs.add(b[0] + clearance);
      }
    }
  }
  const xValues = [...xs].filter(x => x >= minX && x <= maxX).sort((a, b) => a - b);
  const yValues = [...ys].filter(y => y >= minY && y <= maxY).sort((a, b) => a - b);
  const nodeCount = xValues.length * yValues.length;
  if (nodeCount > maxGridNodes) return { kind: 'grid-too-large' };
  const yCount = yValues.length;
  const pointFor = (node: number): RoutePoint => [xValues[Math.floor(node / yCount)], yValues[node % yCount]];
  const nodeFor = (point: RoutePoint) => xValues.indexOf(point[0]) * yCount + yValues.indexOf(point[1]);
  const start = nodeFor(from); const finish = nodeFor(to);
  const occupied: Segment[] = localReservedRoutes.flatMap(route => route.points.slice(1)
    .map((point, index) => ({ from: route.points[index], to: point, route }))
    .filter(segment => segmentIntersectsBounds(segment.from, segment.to, localBounds, clearance)));
  const stateKey = (node: number, direction: number) => node * 3 + direction;
  const startKey = stateKey(start, 0);
  const costs = new Map<number, number>([[startKey, 0]]);
  const previous = new Map<number, number>();
  const heap: SearchState[] = [];
  push(heap, { node: start, direction: 0, cost: 0, score: heuristic(from, to) });
  const visited = new Set<number>();
  while (heap.length) {
    const current = pop(heap);
    const key = stateKey(current.node, current.direction);
    if (visited.has(key)) continue;
    visited.add(key);
    if (current.node === finish) {
      const points: RoutePoint[] = [to];
      let cursor = key;
      while (cursor !== startKey) {
        const prior = previous.get(cursor);
        if (prior === undefined) return { kind: 'no-path' };
        cursor = prior;
        points.unshift(pointFor(Math.floor(cursor / 3)));
      }
      const compact = simplify(points);
      return pathIsClear(compact, request, occupied, allowCrossings) ? { kind: 'path', points: compact } : { kind: 'no-path' };
    }
    const ix = Math.floor(current.node / yCount); const iy = current.node % yCount;
    const neighbors = [
      ix > 0 ? current.node - yCount : -1,
      iy < yCount - 1 ? current.node + 1 : -1,
      ix < xValues.length - 1 ? current.node + yCount : -1,
      iy > 0 ? current.node - 1 : -1,
    ];
    for (const next of neighbors) {
      if (next < 0) continue;
      const a = pointFor(current.node); const b = pointFor(next);
      if (localObstacles.some(box => segmentCutsBox(a, b, box))) continue;
      const candidateSegment: Segment = { from: a, to: b, route: {
        id: request.id, points: [from, to], fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId,
      } };
      const crossingRouteIds = new Set<string>();
      let blockedByRoute = false;
      for (const segment of occupied) {
        const collision = classifyConflict(candidateSegment, segment, request);
        if (collision === 'blocked' || (collision === 'crossing' && !allowCrossings)) {
          blockedByRoute = true;
          break;
        }
        if (collision === 'crossing') crossingRouteIds.add(segment.route.id);
      }
      if (blockedByRoute) continue;
      const direction: 1 | 2 = a[0] === b[0] ? 1 : 2;
      const length = Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
      const bend = current.direction !== 0 && current.direction !== direction ? bendPenalty : 0;
      const downBias = request.preferDown && b[1] < a[1] ? length * 3 : 0;
      const cost = current.cost + length + bend + downBias + crossingRouteIds.size * crossingPenalty;
      const nextKey = stateKey(next, direction);
      if (cost >= (costs.get(nextKey) ?? Infinity)) continue;
      costs.set(nextKey, cost); previous.set(nextKey, key);
      push(heap, { node: next, direction, cost, score: cost + heuristic(b, to) });
    }
  }
  return { kind: 'no-path' };
}

function boxesIntersect(a: RouteBox, b: RouteBox): boolean {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}
function segmentIntersectsBounds(a: RoutePoint, b: RoutePoint, bounds: RouteBox, margin = 0): boolean {
  const left = bounds.x - margin; const right = bounds.x + bounds.width + margin;
  const top = bounds.y - margin; const bottom = bounds.y + bounds.height + margin;
  if (a[0] === b[0]) return a[0] >= left && a[0] <= right
    && Math.max(Math.min(a[1], b[1]), top) <= Math.min(Math.max(a[1], b[1]), bottom);
  return a[1] >= top && a[1] <= bottom
    && Math.max(Math.min(a[0], b[0]), left) <= Math.min(Math.max(a[0], b[0]), right);
}
function routeIntersectsBounds(route: ReservedRoute, bounds: RouteBox, margin = 0): boolean {
  return route.points.slice(1).some((point, index) => segmentIntersectsBounds(route.points[index], point, bounds, margin));
}

function pathIsClear(points: readonly RoutePoint[], request: RouteRequest, occupied: readonly Segment[], allowCrossings: boolean): boolean {
  if (!isSimpleOrthogonalPath(points)) return false;
  return points.slice(1).every((point, index) => {
    const candidate: Segment = { from: points[index], to: point, route: {
      id: request.id, points: [request.from, request.to], fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId,
    } };
    return !occupied.some(segment => {
      const collision = classifyConflict(candidate, segment, request);
      return collision === 'blocked' || (collision === 'crossing' && !allowCrossings);
    });
  });
}

/** Reject a route that crosses, touches or doubles back across itself. */
export function isSimpleOrthogonalPath(points: readonly RoutePoint[]): boolean {
  if (points.length < 2) return false;
  if (points.length === 2 && samePoint(points[0], points[1])) return true;
  for (let first = 0; first < points.length - 1; first++) {
    const a = points[first]; const b = points[first + 1];
    if (samePoint(a, b)) return false;
    for (let second = first + 1; second < points.length - 1; second++) {
      const c = points[second]; const d = points[second + 1];
      const hit = segmentIntersection(a, b, c, d);
      if (!hit) continue;
      if (second === first + 1 && hit !== 'overlap' && samePoint(hit, b)) continue;
      return false;
    }
  }
  return true;
}

function classifyConflict(candidate: Segment, occupied: Segment, request: RouteRequest): 'blocked' | 'crossing' | undefined {
  const intersection = segmentIntersection(candidate.from, candidate.to, occupied.from, occupied.to);
  if (intersection === undefined) return undefined;
  if (intersection === 'overlap') return 'blocked';
  const route = occupied.route;
  const sharedStart = samePoint(intersection, request.from) && request.fromTerminalId === route.fromTerminalId && samePoint(intersection, route.points[0]);
  const sharedEnd = samePoint(intersection, request.to) && request.toTerminalId === route.toTerminalId && samePoint(intersection, route.points.at(-1)!);
  const sharedReverseStart = samePoint(intersection, request.from) && request.fromTerminalId === route.toTerminalId && samePoint(intersection, route.points.at(-1)!);
  const sharedReverseEnd = samePoint(intersection, request.to) && request.toTerminalId === route.fromTerminalId && samePoint(intersection, route.points[0]);
  if (sharedStart || sharedEnd || sharedReverseStart || sharedReverseEnd) return undefined;
  const candidateInterior = !samePoint(intersection, request.from) && !samePoint(intersection, request.to);
  const occupiedInterior = !samePoint(intersection, route.points[0]) && !samePoint(intersection, route.points.at(-1)!);
  return candidateInterior && occupiedInterior ? 'crossing' : 'blocked';
}

function segmentIntersection(a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): RoutePoint | 'overlap' | undefined {
  const aVertical = a[0] === b[0]; const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical && a[0] === c[0]) {
      const low = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      const high = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
      if (low > high) return undefined;
      if (low < high) return 'overlap';
      return [a[0], low];
    }
    if (!aVertical && a[1] === c[1]) {
      const low = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const high = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
      if (low > high) return undefined;
      if (low < high) return 'overlap';
      return [low, a[1]];
    }
    return undefined;
  }
  const vertical = aVertical ? [a, b] as const : [c, d] as const;
  const horizontal = aVertical ? [c, d] as const : [a, b] as const;
  const x = vertical[0][0]; const y = horizontal[0][1];
  return between(x, horizontal[0][0], horizontal[1][0]) && between(y, vertical[0][1], vertical[1][1]) ? [x, y] : undefined;
}

function segmentCutsBox(a: RoutePoint, b: RoutePoint, box: RouteBox): boolean {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height;
  return a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
}
function strictlyContains(box: RouteBox, point: RoutePoint) { return point[0] > box.x && point[0] < box.x + box.width && point[1] > box.y && point[1] < box.y + box.height; }
function expand(box: RouteBox, amount: number): RouteBox { return { ...box, x: box.x - amount, y: box.y - amount, width: box.width + amount * 2, height: box.height + amount * 2 }; }
function between(value: number, a: number, b: number) { return value >= Math.min(a, b) && value <= Math.max(a, b); }
function samePoint(a: RoutePoint, b: RoutePoint) { return a[0] === b[0] && a[1] === b[1]; }
function heuristic(a: RoutePoint, b: RoutePoint) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
function simplify(points: readonly RoutePoint[]): RoutePoint[] {
  const result: RoutePoint[] = [];
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
function push(heap: SearchState[], item: SearchState) {
  heap.push(item); let index = heap.length - 1;
  while (index > 0) {
    const parent = Math.floor((index - 1) / 2);
    if (heap[parent].score <= item.score) break;
    heap[index] = heap[parent]; index = parent;
  }
  heap[index] = item;
}
function pop(heap: SearchState[]): SearchState {
  const first = heap[0]; const last = heap.pop()!;
  if (heap.length) {
    let index = 0;
    while (index * 2 + 1 < heap.length) {
      let child = index * 2 + 1;
      if (child + 1 < heap.length && heap[child + 1].score < heap[child].score) child++;
      if (heap[child].score >= last.score) break;
      heap[index] = heap[child]; index = child;
    }
    heap[index] = last;
  }
  return first;
}
