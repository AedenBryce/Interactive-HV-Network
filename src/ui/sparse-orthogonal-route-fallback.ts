import { isSimpleOrthogonalPath, type RouteBox, type RoutePoint, type RouteRequest, type ReservedRoute } from './orthogonal-route-planner';

/**
 * Find an orthogonal path through the sparse visibility graph around nearby
 * content boxes. This is a deterministic fallback for routes whose Cartesian
 * search grid is too large; it does not relax obstacle or route reservations.
 */
export function findSparseOrthogonalPath(
  request: RouteRequest,
  obstacles: readonly RouteBox[],
  reservedRoutes: readonly ReservedRoute[],
  options: { clearance?: number; padding?: number; bendPenalty?: number } = {},
): RoutePoint[] | undefined {
  if (same(request.from, request.to)) return [request.from, request.to];
  const clearance = Math.max(0, options.clearance ?? 24);
  const padding = Math.max(clearance * 2, options.padding ?? 4_000);
  const margin = clearance + 2;
  const left = Math.min(request.from[0], request.to[0]) - padding;
  const right = Math.max(request.from[0], request.to[0]) + padding;
  const top = Math.min(request.from[1], request.to[1]) - padding;
  const bottom = Math.max(request.from[1], request.to[1]) + padding;
  const ignored = new Set(request.ignoredObstacleIds ?? []);
  const boxes = obstacles.filter(box => !ignored.has(box.id)
    && box.x + box.width >= left && box.x <= right && box.y + box.height >= top && box.y <= bottom)
    .map(box => ({ left: box.x - margin, right: box.x + box.width + margin, top: box.y - margin, bottom: box.y + box.height + margin }));

  const nodes: RoutePoint[] = [];
  const add = (x: number, y: number) => {
    if (x < left || x > right || y < top || y > bottom) return;
    if (nodes.some(point => point[0] === x && point[1] === y)) return;
    nodes.push([x, y]);
  };
  add(...request.from);
  add(...request.to);
  for (const box of boxes) {
    add(box.left, box.top); add(box.left, box.bottom);
    add(box.right, box.top); add(box.right, box.bottom);
  }

  // Project both terminals onto each obstacle-corner lane so the sparse graph
  // remains connected even when ports do not lie on obstacle corners.
  const cornerXs = [...new Set(nodes.slice(2).map(point => point[0]))];
  const cornerYs = [...new Set(nodes.slice(2).map(point => point[1]))];
  for (const x of cornerXs) { add(x, request.from[1]); add(x, request.to[1]); }
  for (const y of cornerYs) { add(request.from[0], y); add(request.to[0], y); }
  if (nodes.length < 2) return undefined;

  const inside = (point: RoutePoint, box: typeof boxes[number]) =>
    point[0] > box.left && point[0] < box.right && point[1] > box.top && point[1] < box.bottom;
  if (boxes.some(box => inside(request.from, box) || inside(request.to, box))) return undefined;

  const boxBlocks = (a: RoutePoint, b: RoutePoint) => boxes.some(box => {
    if (a[0] === b[0]) return a[0] > box.left && a[0] < box.right
      && Math.max(Math.min(a[1], b[1]), box.top) < Math.min(Math.max(a[1], b[1]), box.bottom);
    if (a[1] === b[1]) return a[1] > box.top && a[1] < box.bottom
      && Math.max(Math.min(a[0], b[0]), box.left) < Math.min(Math.max(a[0], b[0]), box.right);
    return true;
  });

  const terminalAt = (point: RoutePoint, route: ReservedRoute) => {
    if (same(point, route.points[0])) return route.fromTerminalId;
    if (same(point, route.points.at(-1)!)) return route.toTerminalId;
    return undefined;
  };
  const segmentBlocksRoute = (a: RoutePoint, b: RoutePoint, route: ReservedRoute) => route.points.slice(1).some((end, index) => {
    const start = route.points[index];
    const hit = intersection(a, b, start, end);
    if (!hit) return false;
    if (hit === 'overlap') return true;
    const candidateTerminal = same(hit, request.from) ? request.fromTerminalId
      : same(hit, request.to) ? request.toTerminalId : undefined;
    const existingTerminal = terminalAt(hit, route);
    return !candidateTerminal || candidateTerminal !== existingTerminal;
  });
  const clear = (a: RoutePoint, b: RoutePoint) => !boxBlocks(a, b)
    && !reservedRoutes.some(route => segmentBlocksRoute(a, b, route));

  const adjacency = nodes.map(() => [] as { to: number; length: number; direction: 1 | 2 }[]);
  const byX = new Map<number, number[]>(); const byY = new Map<number, number[]>();
  nodes.forEach(([x, y], index) => {
    byX.set(x, [...(byX.get(x) ?? []), index]);
    byY.set(y, [...(byY.get(y) ?? []), index]);
  });
  const join = (a: number, b: number, direction: 1 | 2) => {
    if (!clear(nodes[a], nodes[b])) return;
    const length = Math.abs(nodes[a][0] - nodes[b][0]) + Math.abs(nodes[a][1] - nodes[b][1]);
    adjacency[a].push({ to: b, length, direction });
    adjacency[b].push({ to: a, length, direction });
  };
  for (const indices of byX.values()) {
    indices.sort((a, b) => nodes[a][1] - nodes[b][1]);
    for (let index = 1; index < indices.length; index++) join(indices[index - 1], indices[index], 1);
  }
  for (const indices of byY.values()) {
    indices.sort((a, b) => nodes[a][0] - nodes[b][0]);
    for (let index = 1; index < indices.length; index++) join(indices[index - 1], indices[index], 2);
  }

  const start = 0; const goal = 1; const stateCount = nodes.length * 3;
  const distance = new Float64Array(stateCount).fill(Infinity);
  const previous = new Int32Array(stateCount).fill(-1);
  const heap: { state: number; cost: number; score: number }[] = [];
  const push = (item: { state: number; cost: number; score: number }) => {
    heap.push(item); let index = heap.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (heap[parent].score <= item.score) break;
      heap[index] = heap[parent]; index = parent;
    }
    heap[index] = item;
  };
  const pop = () => {
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
  };
  const startState = start * 3;
  distance[startState] = 0;
  push({ state: startState, cost: 0, score: manhattan(request.from, request.to) });
  const bendPenalty = Math.max(0, options.bendPenalty ?? 100);
  let goalState = -1;
  while (heap.length) {
    const current = pop();
    if (current.cost !== distance[current.state]) continue;
    const node = Math.floor(current.state / 3); const direction = current.state % 3;
    if (node === goal) { goalState = current.state; break; }
    for (const edge of adjacency[node]) {
      const nextState = edge.to * 3 + edge.direction;
      const cost = current.cost + edge.length + (direction && direction !== edge.direction ? bendPenalty : 0);
      if (cost >= distance[nextState]) continue;
      distance[nextState] = cost; previous[nextState] = current.state;
      const remaining = manhattan(nodes[edge.to], request.to);
      push({ state: nextState, cost, score: cost + remaining });
    }
  }
  if (goalState < 0) return undefined;
  const path: RoutePoint[] = [];
  for (let state = goalState; state >= 0; state = previous[state]) {
    path.push(nodes[Math.floor(state / 3)]);
    if (state === startState) break;
  }
  path.reverse();
  const simplified = simplify(path);
  return isSimpleOrthogonalPath(simplified) ? simplified : undefined;
}

function simplify(points: readonly RoutePoint[]): RoutePoint[] {
  return points.filter((point, index) => index === 0 || index === points.length - 1
    || !((point[0] === points[index - 1][0] && point[0] === points[index + 1][0])
      || (point[1] === points[index - 1][1] && point[1] === points[index + 1][1])));
}
function same(a: RoutePoint, b: RoutePoint) { return a[0] === b[0] && a[1] === b[1]; }
function manhattan(a: RoutePoint, b: RoutePoint) { return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]); }
function intersection(a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint): RoutePoint | 'overlap' | undefined {
  const aVertical = a[0] === b[0]; const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical && a[0] === c[0]) {
      const low = Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]));
      const high = Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
      return low < high ? 'overlap' : low === high ? [a[0], low] : undefined;
    }
    if (!aVertical && a[1] === c[1]) {
      const low = Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]));
      const high = Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
      return low < high ? 'overlap' : low === high ? [low, a[1]] : undefined;
    }
    return undefined;
  }
  const vertical = aVertical ? [a, b] as const : [c, d] as const;
  const horizontal = aVertical ? [c, d] as const : [a, b] as const;
  const x = vertical[0][0]; const y = horizontal[0][1];
  return x >= Math.min(horizontal[0][0], horizontal[1][0]) && x <= Math.max(horizontal[0][0], horizontal[1][0])
    && y >= Math.min(vertical[0][1], vertical[1][1]) && y <= Math.max(vertical[0][1], vertical[1][1]) ? [x, y] : undefined;
}
