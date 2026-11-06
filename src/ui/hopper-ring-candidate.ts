import { orthogonalPoints } from './diagram-geometry';
import type { Point } from './diagram-geometry';

/**
 * Experimental route-only candidate for the H9→H7 / RM721→RM412 cluster.
 *
 * It keeps all source and destination terminals fixed. H9→H7 leaves the
 * measured RM412 frame on its west side and enters the H7 endpoint from below
 * the frame. RM721→RM412 travels above that frame. The RM412 F1 route is kept
 * at its existing coordinates as a protected internal path, below which the
 * H9→H7 final approach terminates.
 *
 * This is a candidate geometry only. The function does not inspect other
 * routes, room frames, symbols, or labels and does not claim to be
 * conflict-free; the full layout audit must decide whether it is usable.
 */
export function applyHopperRingCandidate(routes: Map<string, Point[]>): void {
  const h9ToH7 = routes.get('wh:h9-to-h7:cable');
  const rm721ToRm412 = routes.get('rm721:rm412:cable');
  const rm412F1 = routes.get('rm412:f1:winding-cable');
  if (!h9ToH7 || !rm721ToRm412 || !rm412F1) return;

  const h9From = h9ToH7[0];
  const h9To = h9ToH7.at(-1);
  const rm721From = rm721ToRm412[0];
  const rm721To = rm721ToRm412.at(-1);
  if (!h9From || !h9To || !rm721From || !rm721To) return;

  const h9TfInput = routes.get('wh:h9:tf419a:input');
  const westmostIntersectingRun = h9TfInput?.slice(1)
    .map((point, index) => [h9TfInput[index], point] as const)
    .filter(([start, end]) => start[1] === end[1]
      && start[1] >= Math.min(h9From[1], h9To[1])
      && start[1] <= Math.max(h9From[1], h9To[1])
      && Math.min(start[0], end[0]) < h9From[0]
      && Math.max(start[0], end[0]) > h9From[0])
    .reduce((west, [start, end]) => Math.min(west, start[0], end[0]), Number.POSITIVE_INFINITY);
  if (westmostIntersectingRun === undefined || !Number.isFinite(westmostIntersectingRun)) return;
  // Route the H9 riser west of both the RM412 frame and any H9 transformer
  // input run spanning its descent. If that local corridor is unavailable,
  // leave the existing geometry unchanged rather than make a speculative jog.
  const westLaneX = Math.min(h9From[0], h9To[0], westmostIntersectingRun) - 40;
  routes.set('wh:h9-to-h7:cable', orthogonalPoints([
    h9From,
    [westLaneX, h9From[1]],
    [westLaneX, h9To[1]],
    h9To,
  ]));

  // Keep this long tie above the RM412 frame; the H9 route now passes below
  // it and no longer uses the old vertical leg through both crossing points.
  // Its terminals stay exactly at the input route endpoints.
  // Offset the tie's horizontal run slightly below its source so it does not
  // share the RM721 IN02 earth-branch lead. Keep it above the RM412 frame.
  const tieRunY = Math.min(rm721From[1], rm721To[1]) + 180;
  routes.set('rm721:rm412:cable', orthogonalPoints([
    rm721From,
    [rm721From[0], tieRunY],
    [rm721To[0], tieRunY],
    rm721To,
  ]));

  // Preserve the existing RM412 F1 winding path as the fixed internal guard
  // for the candidate. Copy it into the mutable map without changing either
  // endpoint or its reviewed route geometry.
  routes.set('rm412:f1:winding-cable', rm412F1.map(([x, y]) => [x, y]));
}
