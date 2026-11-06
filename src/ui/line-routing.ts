import type { Point } from './diagram-geometry';

export type LineRoutes = Record<string, Point[]>;

export function snapCoordinate(value: number, targets: readonly number[], tolerance: number) {
  let best: number | undefined, distance = tolerance;
  for (const target of targets) {
    const next = Math.abs(target - value);
    if (next <= distance) { best = target; distance = next; }
  }
  return { value: best ?? value, snapped: best !== undefined };
}

export function snapLineDelta(points: readonly Point[], index: number, delta: Point, tolerance: number) {
  const horizontal = points[index][1] === points[index + 1][1];
  const axis = horizontal ? 1 : 0;
  // Only this wire's own bends/endpoints are alignment targets: snapping must
  // not pull it onto an unrelated circuit and imply a new junction.
  const targets = points.filter((_, i) => i === 0 || i === points.length - 1 || i !== index && i !== index + 1).map(point => point[axis]);
  const snapped = snapCoordinate(points[index][axis] + delta[axis], targets, tolerance);
  const result: Point = [...delta]; result[axis] = snapped.value - points[index][axis];
  return { delta: result, ...(snapped.snapped ? { guide: { axis: horizontal ? 'y' as const : 'x' as const, value: snapped.value } } : {}) };
}

export function simplifyLineRoute(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  const first = points[0], last = points.at(-1);
  for (let index = 0; index < points.length; index++) {
    const input = points[index];
    const snap = (value: number, axis: 0 | 1) => Math.abs(value - first[axis]) < 1e-6 ? first[axis] : Math.abs(value - last![axis]) < 1e-6 ? last![axis] : value;
    // Floating-point noise must not preserve an invisible hairpin. Retain the
    // actual end coordinates and only canonicalise intermediate bend points.
    const point: Point = index === 0 || index === points.length - 1 ? input : [snap(input[0], 0), snap(input[1], 1)];
    if (result.length && result.at(-1)![0] === point[0] && result.at(-1)![1] === point[1]) continue;
    while (result.length > 1) {
      const a = result.at(-2)!, b = result.at(-1)!;
      if (a[0] === b[0] && b[0] === point[0] || a[1] === b[1] && b[1] === point[1]) result.pop(); else break;
    }
    result.push([...point]);
  }
  const orthogonal:Point[]=[];
  for(const p of result){const a=orthogonal.at(-1);if(a&&a[0]!==p[0]&&a[1]!==p[1])orthogonal.push([a[0],p[1]]);orthogonal.push(p);}
  return orthogonal.length === 1 ? [[...orthogonal[0]], [...orthogonal[0]]] : orthogonal;
}

/** Remove routing bends around one segment, retaining both electrical endpoints. */
export function removeLineSegment(points: readonly Point[], index: number): Point[] {
  if (points.length < 3 || index < 0 || index >= points.length - 1) return points.map(point => [...point]);
  const before = Math.max(0, index - 1), after = Math.min(points.length - 1, index + 2);
  const start = points[before], end = points[after];
  const straight = start[0] === end[0] || start[1] === end[1];
  // Interior sections follow the entering direction. At an end, switch the
  // elbow direction so removing an end segment does not simply recreate it.
  const horizontal = index === 0 ? points[0][1] !== points[1][1]
    : index === points.length - 2 ? start[1] !== points[index][1]
    : start[1] === points[index][1];
  const bridge: Point[] = straight ? [] : [horizontal ? [end[0], start[1]] : [start[0], end[1]]];
  return simplifyLineRoute([...points.slice(0, before + 1), ...bridge, ...points.slice(after)]);
}

export function validateLineRoutes(value: unknown): LineRoutes {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid line routes.');
  const result: LineRoutes = {};
  for (const [id, points] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(id) || !Array.isArray(points) || points.length < 2 || points.length > 2048
      || points.some(point => !Array.isArray(point) || point.length !== 2 || point.some(n => typeof n !== 'number' || !Number.isFinite(n) || Math.abs(n) > 2_000_000))) throw new Error('Invalid line route.');
    const route: Point[] = points.map(point => [point[0], point[1]]);
    if (route.slice(1).some((point, i) => Math.abs(point[0]-route[i][0])>1e-6 && Math.abs(point[1]-route[i][1])>1e-6)) throw new Error('Line routes must be horizontal or vertical.');
    result[id] = simplifyLineRoute(route);
  }
  return result;
}

/** Move a segment perpendicular to itself; endpoint stubs keep the terminals fixed. */
export function moveLineSegment(points: readonly Point[], index: number, delta: Point): Point[] {
  const a = points[index], b = points[index + 1];
  if (!a || !b) return points.map(point => [...point]);
  const horizontal = a[1] === b[1];
  const shift = (p: Point): Point => horizontal ? [p[0], p[1] + delta[1]] : [p[0] + delta[0], p[1]];
  return [
    ...points.slice(0, index).map(point => [...point] as Point),
    ...(index === 0 ? [[...a] as Point] : []), shift(a), shift(b),
    ...(index === points.length - 2 ? [[...b] as Point] : []),
    ...points.slice(index + 2).map(point => [...point] as Point),
  ];
}

/** Retain manual bends while keeping the current equipment endpoints attached. */
export function attachLineRoute(points: readonly Point[], start: Point, end: Point): Point[] {
  const first = points[0], last = points.at(-1)!;
  const dx = start[0] - first[0], dy = start[1] - first[1];
  if (end[0] - last[0] === dx && end[1] - last[1] === dy) return points.map(p => [p[0] + dx, p[1] + dy]);
  const interior = points.slice(1, -1);
  const next = interior[0] ?? end, previous = interior.at(-1) ?? start;
  const firstHorizontal = points[0][1] === points[1][1];
  const lastHorizontal = points.at(-2)![1] === last[1];
  if (!interior.length) return simplifyLineRoute([start, firstHorizontal ? [end[0], start[1]] : [start[0], end[1]], end]);
  return [start, firstHorizontal ? [next[0], start[1]] : [start[0], next[1]], ...interior,
    lastHorizontal ? [previous[0], end[1]] : [end[0], previous[1]], end];
}

export function applyLineRoutes<T extends { routes: ReadonlyMap<string, readonly Point[]> }>(geometry: T, overrides: LineRoutes): T {
  if (!Object.keys(overrides).length) return geometry;
  const routes = new Map(geometry.routes);
  for (const [id, points] of Object.entries(overrides)) {
    const current = routes.get(id);
    if (current) routes.set(id, simplifyLineRoute(attachLineRoute(points, current[0], current.at(-1)!)));
  }
  return { ...geometry, routes };
}


