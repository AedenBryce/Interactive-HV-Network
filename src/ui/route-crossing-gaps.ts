import type { Point } from './diagram-geometry';

export type RoutedConnection = { id: string; from: string; to: string };
type Gap = { segmentIndex: number; fromX: number; toX: number };
export type VisualRouteCrossing = { routeId: string; segmentIndex: number; x: number };

/**
 * Return a model-space crossing gap that remains visible at the current zoom.
 * Gaps are clamped so an extremely small or large scale cannot create an
 * unusable fragment in the overview or detail view.
 */
export function crossingGapWidthForScale(scale: number, screenPixels = 8): number {
  // Before ResizeObserver measures the SVG, use the verified overview scale
  // so the first frame does not split conductors with a 4096-unit gap.
  const measuredScale = Number.isFinite(scale) && scale > 0 ? scale : 0.0125;
  return Math.max(0.25, Math.min(4096, screenPixels / measuredScale));
}

/**
 * Give proper, non-electrical line crossings a visible break in the horizontal
 * route. Route geometry and connectivity remain unchanged; the uninterrupted
 * vertical route reads as passing over the broken route rather than joining it.
 */
export function separateVisualCrossings(
  connections: readonly RoutedConnection[],
  routes: ReadonlyMap<string, readonly Point[]>,
  gapWidth = 18,
): ReadonlyMap<string, readonly (readonly Point[])[]> {
  return applyVisualCrossingGaps(routes, findVisualRouteCrossings(connections, routes), gapWidth);
}

/** Detect proper crossings once for a stable route graph; zoom only changes the displayed gap width. */
export function findVisualRouteCrossings(
  connections: readonly RoutedConnection[],
  routes: ReadonlyMap<string, readonly Point[]>,
): VisualRouteCrossing[] {
  const crossings: VisualRouteCrossing[] = [];
  const items = connections.flatMap(connection => {
    const points = routes.get(connection.id);
    return points && points.length > 1 ? [{ connection, points }] : [];
  });

  for (let aIndex = 0; aIndex < items.length; aIndex++) {
    const a = items[aIndex];
    for (let bIndex = aIndex + 1; bIndex < items.length; bIndex++) {
      const b = items[bIndex];
      if (a.connection.id === b.connection.id) continue;
      for (let aSegment = 1; aSegment < a.points.length; aSegment++) {
        const aFrom = a.points[aSegment - 1]; const aTo = a.points[aSegment];
        for (let bSegment = 1; bSegment < b.points.length; bSegment++) {
          const bFrom = b.points[bSegment - 1]; const bTo = b.points[bSegment];
          const aHorizontal = aFrom[1] === aTo[1]; const bHorizontal = bFrom[1] === bTo[1];
          if (aHorizontal === bHorizontal) continue;
          const horizontal = aHorizontal ? { item: a, segment: aSegment, from: aFrom, to: aTo } : { item: b, segment: bSegment, from: bFrom, to: bTo };
          const vertical = aHorizontal ? { item: b, from: bFrom, to: bTo } : { item: a, from: aFrom, to: aTo };
          const x = vertical.from[0]; const y = horizontal.from[1];
          if (!strictlyBetween(x, horizontal.from[0], horizontal.to[0]) || !strictlyBetween(y, vertical.from[1], vertical.to[1])) continue;
          const sharedTerminal = (a.connection.from === b.connection.from || a.connection.from === b.connection.to
            || a.connection.to === b.connection.from || a.connection.to === b.connection.to)
            && endpointAt(a.points, x, y) && endpointAt(b.points, x, y);
          if (sharedTerminal) continue;
          crossings.push({ routeId: horizontal.item.connection.id, segmentIndex: horizontal.segment, x });
        }
      }
    }
  }

  return crossings;
}

/** Select the horizontal route in each proper crossing for bounded rerouting. */
export function crossingRouteIds(
  connections: readonly RoutedConnection[],
  routes: ReadonlyMap<string, readonly Point[]>,
): Set<string> {
  return new Set(findVisualRouteCrossings(connections, routes).map(crossing => crossing.routeId));
}

export function applyVisualCrossingGaps(
  routes: ReadonlyMap<string, readonly Point[]>,
  crossings: readonly VisualRouteCrossing[],
  gapWidth = 18,
): ReadonlyMap<string, readonly (readonly Point[])[]> {
  const gapsByRoute = new Map<string, Gap[]>();
  const halfGap = Math.max(1, gapWidth / 2);
  for (const crossing of crossings) {
    const points = routes.get(crossing.routeId);
    const from = points?.[crossing.segmentIndex - 1];
    const to = points?.[crossing.segmentIndex];
    if (!from || !to || from[1] !== to[1]) continue;
    const lowX = Math.min(from[0], to[0]); const highX = Math.max(from[0], to[0]);
    // A screen-sized overview gap can exceed this entire segment. Keep a
    // conductor stub at each end so it cannot erase an endpoint or a bend.
    // Near an elbow the available gap is necessarily smaller than eight pixels.
    const leftStub = Math.min(1, (crossing.x - lowX) / 2);
    const rightStub = Math.min(1, (highX - crossing.x) / 2);
    const fromX = Math.max(lowX + leftStub, crossing.x - halfGap);
    const toX = Math.min(highX - rightStub, crossing.x + halfGap);
    if (toX <= fromX) continue;
    const gaps = gapsByRoute.get(crossing.routeId) ?? [];
    gaps.push({ segmentIndex: crossing.segmentIndex, fromX, toX });
    gapsByRoute.set(crossing.routeId, gaps);
  }

  const result = new Map<string, readonly (readonly Point[])[]>();
  for (const [id, points] of routes) {
    const gaps = (gapsByRoute.get(id) ?? []).sort((a, b) => a.segmentIndex - b.segmentIndex || a.fromX - b.fromX);
    result.set(id, gaps.length ? splitRoute(points, gaps) : [points]);
  }
  return result;
}

function splitRoute(points: readonly Point[], gaps: readonly Gap[]): (readonly Point[])[] {
  const pieces: Point[][] = [];
  let current: Point[] = [[...points[0]] as Point];
  for (let segmentIndex = 1; segmentIndex < points.length; segmentIndex++) {
    const from = points[segmentIndex - 1]; const to = points[segmentIndex];
    const segmentGaps = mergeGaps(gaps.filter(gap => gap.segmentIndex === segmentIndex));
    if (from[1] !== to[1] || !segmentGaps.length) {
      append(current, to);
      continue;
    }
    const direction = to[0] >= from[0] ? 1 : -1;
    const ordered = direction === 1 ? segmentGaps : [...segmentGaps].reverse();
    for (const gap of ordered) {
      const beforeX = direction === 1 ? gap.fromX : gap.toX;
      const afterX = direction === 1 ? gap.toX : gap.fromX;
      append(current, [beforeX, from[1]]);
      if (current.length > 1) pieces.push(current);
      current = [[afterX, from[1]]];
    }
    append(current, to);
  }
  if (current.length > 1) pieces.push(current);
  return pieces;
}

function mergeGaps(gaps: readonly Gap[]): Gap[] {
  const sorted = [...gaps].sort((a, b) => a.fromX - b.fromX || a.toX - b.toX);
  const merged: Gap[] = [];
  for (const gap of sorted) {
    const previous = merged.at(-1);
    if (previous && gap.fromX <= previous.toX) previous.toX = Math.max(previous.toX, gap.toX);
    else merged.push({ ...gap });
  }
  return merged;
}

function append(points: Point[], point: Point) {
  const previous = points.at(-1);
  if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) points.push([point[0], point[1]]);
}

function endpointAt(points: readonly Point[], x: number, y: number) {
  const first = points[0]; const last = points.at(-1)!;
  return (first[0] === x && first[1] === y) || (last[0] === x && last[1] === y);
}

function strictlyBetween(value: number, a: number, b: number) {
  return value > Math.min(a, b) && value < Math.max(a, b);
}
