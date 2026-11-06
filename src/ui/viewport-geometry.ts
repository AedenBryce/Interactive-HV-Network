import type { Point } from './diagram-geometry';

export type ViewportBox = { x: number; y: number; width: number; height: number };
export function boxesIntersect(a: ViewportBox, b: ViewportBox) {
  return a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
}
export function routeInViewport(points: readonly Point[], box: ViewportBox) {
  return points.some((point, i) => {
    const previous = points[Math.max(0, i - 1)];
    return boxesIntersect({ x: Math.min(point[0], previous[0]), y: Math.min(point[1], previous[1]), width: Math.abs(point[0] - previous[0]), height: Math.abs(point[1] - previous[1]) }, box);
  });
}
