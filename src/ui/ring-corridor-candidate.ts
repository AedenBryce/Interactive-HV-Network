import type { Point } from './diagram-geometry';

/** Isolated trial for the Hopper 9 → Hopper 7 cable. Never imported by production. */
export function routeH9H7ThroughEastGutter(
  baseline: readonly Point[],
  gutterX = 2_720,
): Point[] {
  if (baseline.length < 2) throw new Error('H9→H7 baseline route must have both endpoints');
  const start = baseline[0];
  const end = baseline.at(-1)!;
  const upperY = baseline.length >= 4 ? baseline[1][1] : Math.min(start[1], end[1]) - 280;
  // Preserve both model terminals, use only horizontal/vertical segments, and
  // carry the long descent east of RM412's cable lane before returning to H7.
  return [start, [start[0], upperY], [gutterX, upperY], [gutterX, end[1]], end];
}
