import { orthogonalPoints, type Point } from './diagram-geometry';

/**
 * Route RM410's VS4101 input B below the adjacent SW435 TF435 bus drop.
 * The source and destination remain the model terminals; only the presentation
 * corridor changes. If the local geometry has no room for a lower lane, keep a
 * simple orthogonal connection and let the whole-network router handle it.
 */
export function rm410VsInputBRoute(from: Point, to: Point, busDrop: readonly Point[]): Point[] {
  const lowerBusEdge = busDrop.length ? Math.max(...busDrop.map(point => point[1])) : from[1];
  const laneY = Math.max(from[1] + 32, lowerBusEdge + 48);
  if (laneY >= to[1]) return orthogonalPoints([from, [to[0], from[1]], to]);
  return orthogonalPoints([from, [from[0], laneY], [to[0], laneY], to]);
}
