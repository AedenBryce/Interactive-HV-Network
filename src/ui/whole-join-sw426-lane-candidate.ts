import type { GeometryRoute } from './geometry-validator';

type Point = [number, number];

/**
 * Candidate only: route the long SW411→SW426 supply join around the outside
 * of the CV006 route instead of dropping through it. Does not mutate production.
 */
export function withSw426JoinLane(routes: readonly GeometryRoute[], laneX: number): GeometryRoute[] {
  return routes.map(route => {
    if (route.id !== 'whole:join:sw426' || route.points.length < 2) return route;
    const from = route.points[0] as Point;
    const to = route.points.at(-1)! as Point;
    const points: Point[] = [from, [from[0], from[1] + 90], [laneX, from[1] + 90], [laneX, to[1]], to];
    return { ...route, points };
  });
}
