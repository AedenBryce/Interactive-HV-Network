import { planOrthogonalRoutes, type ReservedRoute, type RouteBox, type RoutePoint } from './orthogonal-route-planner';

/** The modeled inter-room cable from SW454 to SW505. */
export const sw505CableRouteId = 'sw454:sw505:cable-SW505-P-01';

/** The five current route geometries this candidate is intended to avoid. */
export const sw505CableCrossingRouteIds = [
  'sw451:mc451:section-bridge',
  'cv006:pole49-38-pole49-39',
  'whole:join:sw435',
  'rm721:rm412:cable',
  'whole:join:crushing-tie',
] as const;

export type Sw505CableCorridorCandidateResult =
  | { status: 'applied'; routeId: string; points: RoutePoint[]; avoidedRouteIds: string[]; bounds: RouteBox }
  | { status: 'unchanged'; routeId: string; reason: 'missing-route' | 'missing-obstacle-route' | 'no-bounded-path' };

/**
 * Try a bounded orthogonal reroute for the SW454→SW505 cable while leaving its
 * modeled endpoint coordinates unchanged. Only the five audited crossing
 * routes are reserved here; this is an isolated layout candidate, not a
 * whole-diagram conflict check. The caller must run the full geometry audit
 * before adopting it.
 */
export function applySw505CableCorridorCandidate(
  routes: Map<string, RoutePoint[]>,
): Sw505CableCorridorCandidateResult {
  const current = routes.get(sw505CableRouteId);
  if (!current || current.length < 2) return { status: 'unchanged', routeId: sw505CableRouteId, reason: 'missing-route' };

  const blockers = sw505CableCrossingRouteIds.flatMap(id => {
    const points = routes.get(id);
    return points && points.length >= 2
      ? [{ id, points, fromTerminalId: `fixed:${id}:from`, toTerminalId: `fixed:${id}:to` } satisfies ReservedRoute]
      : [];
  });
  if (blockers.length !== sw505CableCrossingRouteIds.length) {
    return { status: 'unchanged', routeId: sw505CableRouteId, reason: 'missing-obstacle-route' };
  }

  const from = current[0];
  const to = current[current.length - 1];
  // The east allowance is just large enough to pass outside the RM721 cable
  // corridor implicated in the audit, without searching toward the page edge.
  const bounds: RouteBox = {
    id: 'sw505-cable-corridor',
    x: Math.min(from[0], to[0]) - 1_200,
    y: Math.min(from[1], to[1]) - 500,
    width: Math.max(from[0], to[0]) - Math.min(from[0], to[0]) + 8_400,
    height: Math.max(from[1], to[1]) - Math.min(from[1], to[1]) + 1_000,
  };
  const plan = planOrthogonalRoutes([{
    id: sw505CableRouteId,
    from,
    to,
    fromTerminalId: `${sw505CableRouteId}:from`,
    toTerminalId: `${sw505CableRouteId}:to`,
    preferDown: true,
    order: 0,
    preferredPath: current,
    bounds,
  }], {
    bounds,
    reservedRoutes: blockers,
    clearance: 0,
    localSearchPadding: 320,
    maxLocalSearchPadding: 4_096,
    maxSearchAttempts: 4,
    maxGridNodes: 100_000,
  });
  const candidate = plan.routes.get(sw505CableRouteId);
  if (!candidate || plan.unresolved.length || !samePoint(candidate[0], from) || !samePoint(candidate.at(-1)!, to)
    || !isOrthogonal(candidate) || !candidate.every(point => inside(bounds, point))
    || blockers.some(blocker => pathsIntersect(candidate, blocker.points))) {
    return { status: 'unchanged', routeId: sw505CableRouteId, reason: 'no-bounded-path' };
  }

  const points = candidate.map(([x, y]) => [x, y] as RoutePoint);
  routes.set(sw505CableRouteId, points);
  return {
    status: 'applied',
    routeId: sw505CableRouteId,
    points,
    avoidedRouteIds: [...sw505CableCrossingRouteIds],
    bounds,
  };
}

function samePoint(a: RoutePoint, b: RoutePoint) { return a[0] === b[0] && a[1] === b[1]; }

function isOrthogonal(points: readonly RoutePoint[]) {
  return points.slice(1).every((point, index) => point[0] === points[index][0] || point[1] === points[index][1]);
}

function inside(bounds: RouteBox, point: RoutePoint) {
  return point[0] >= bounds.x && point[0] <= bounds.x + bounds.width
    && point[1] >= bounds.y && point[1] <= bounds.y + bounds.height;
}

function pathsIntersect(a: readonly RoutePoint[], b: readonly RoutePoint[]) {
  for (let i = 1; i < a.length; i++) for (let j = 1; j < b.length; j++) {
    if (segmentsIntersect(a[i - 1], a[i], b[j - 1], b[j])) return true;
  }
  return false;
}

function segmentsIntersect(a: RoutePoint, b: RoutePoint, c: RoutePoint, d: RoutePoint) {
  const aVertical = a[0] === b[0];
  const bVertical = c[0] === d[0];
  if (aVertical && bVertical) {
    return a[0] === c[0] && intervalsOverlap(a[1], b[1], c[1], d[1]);
  }
  if (!aVertical && !bVertical) {
    return a[1] === c[1] && intervalsOverlap(a[0], b[0], c[0], d[0]);
  }
  const verticalStart = aVertical ? a : c;
  const verticalEnd = aVertical ? b : d;
  const horizontalStart = aVertical ? c : a;
  const horizontalEnd = aVertical ? d : b;
  return between(verticalStart[0], horizontalStart[0], horizontalEnd[0])
    && between(horizontalStart[1], verticalStart[1], verticalEnd[1]);
}

function intervalsOverlap(a1: number, a2: number, b1: number, b2: number) {
  return Math.max(Math.min(a1, a2), Math.min(b1, b2)) <= Math.min(Math.max(a1, a2), Math.max(b1, b2));
}

function between(value: number, a: number, b: number) {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}
