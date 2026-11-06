import { orthogonalPoints, type Point } from './diagram-geometry';

const H9_TO_H7 = 'wh:h9-to-h7:cable';
const RM721_TO_RM412 = 'rm721:rm412:cable';
const H9_TF_INPUT = 'wh:h9:tf419a:input';
const RM721_IN02_EARTH_BRANCH = 'rm721:in02:es:branch';
const RM412_F1_INPUT = 'rm412:f1:winding-cable';

export type Rm721H9RingCandidateResult =
  | { applied: true; h9LaneX: number; h9ApproachY: number; rm721RunY: number }
  | {
      applied: false;
      reason: 'missing-route' | 'missing-h9-horizontal-run' | 'invalid-top-down-endpoints'
        | 'rm721-offset-outside-endpoints' | 'candidate-intersection' | 'shared-route-length';
    };

/**
 * Trial route-only treatment for the coupled H9→H7 / RM721→RM412 ring cluster.
 * All terminal endpoints remain fixed. The function is intentionally local:
 * it checks both candidates against each other and the named H9 input, RM721
 * IN02 earth lead, and RM412 F1 run, but does not claim full-diagram clearance.
 */
export function applyRm721H9RingClusterCandidate(
  routes: Map<string, Point[]>,
): Rm721H9RingCandidateResult {
  const h9Route = routes.get(H9_TO_H7);
  const rm721Route = routes.get(RM721_TO_RM412);
  const h9Input = routes.get(H9_TF_INPUT);
  const rm721EarthBranch = routes.get(RM721_IN02_EARTH_BRANCH);
  const rm412F1 = routes.get(RM412_F1_INPUT);
  if (!h9Route || !rm721Route || !h9Input || !rm721EarthBranch || !rm412F1
    || h9Route.length < 2 || rm721Route.length < 2 || h9Input.length < 2
    || rm721EarthBranch.length < 2 || rm412F1.length < 2) {
    return { applied: false, reason: 'missing-route' };
  }

  const h9From = h9Route[0];
  const h9To = h9Route[h9Route.length - 1];
  const rm721From = rm721Route[0];
  const rm721To = rm721Route[rm721Route.length - 1];
  if (h9To[1] <= h9From[1] || rm721To[1] <= rm721From[1]) {
    return { applied: false, reason: 'invalid-top-down-endpoints' };
  }

  // Find the horizontal transformer input run that spans the H9 cable's
  // vertical descent, then put the descent just west of that run's endpoint.
  const h9InputRuns = h9Input.slice(1)
    .map((point, index) => [h9Input[index], point] as const)
    .filter(([a, b]) => a[1] === b[1]
      && a[1] > h9From[1]
      && a[1] < h9To[1]
      && Math.min(a[0], b[0]) < h9From[0]
      && Math.max(a[0], b[0]) > h9From[0]);
  if (h9InputRuns.length === 0) return { applied: false, reason: 'missing-h9-horizontal-run' };
  const westLaneX = Math.min(...h9InputRuns.flatMap(([a, b]) => [a[0], b[0]])) - 40;
  const h9ApproachY = h9To[1] + 100;
  const h9Candidate = orthogonalPoints([
    h9From,
    [westLaneX, h9From[1]],
    [westLaneX, h9ApproachY],
    [h9To[0], h9ApproachY],
    h9To,
  ]);

  // Keep the RM721 tie's horizontal run below the existing earth lead and
  // just above RM412's frame top for the measured current endpoints. If that
  // offset cannot fit between the endpoint heights, do not reshape it.
  const rm721RunY = rm721From[1] + 180;
  if (rm721RunY >= rm721To[1]) {
    return { applied: false, reason: 'rm721-offset-outside-endpoints' };
  }
  const rm721Candidate = orthogonalPoints([
    rm721From,
    [rm721From[0], rm721RunY],
    [rm721To[0], rm721RunY],
    rm721To,
  ]);

  if (routesIntersect(h9Candidate, rm721Candidate)
    || routesIntersect(h9Candidate, h9Input)
    || routesIntersect(h9Candidate, rm412F1)
    || routesIntersect(rm721Candidate, rm721EarthBranch)
    || routesIntersect(rm721Candidate, rm412F1)
    || hasSharedLength(h9Candidate, rm721Candidate)
    || hasSharedLength(h9Candidate, rm721EarthBranch)
    || hasSharedLength(rm721Candidate, rm721EarthBranch)) {
    return { applied: false, reason: 'candidate-intersection' };
  }
  if (hasSharedLength(h9Candidate, rm412F1) || hasSharedLength(rm721Candidate, rm412F1)) {
    return { applied: false, reason: 'shared-route-length' };
  }

  routes.set(H9_TO_H7, h9Candidate);
  routes.set(RM721_TO_RM412, rm721Candidate);
  return { applied: true, h9LaneX: westLaneX, h9ApproachY, rm721RunY };
}

function routesIntersect(left: readonly Point[], right: readonly Point[]): boolean {
  for (let i = 1; i < left.length; i++) {
    for (let j = 1; j < right.length; j++) {
      if (segmentsIntersect(left[i - 1], left[i], right[j - 1], right[j])) return true;
    }
  }
  return false;
}

function hasSharedLength(left: readonly Point[], right: readonly Point[]): boolean {
  for (let i = 1; i < left.length; i++) {
    for (let j = 1; j < right.length; j++) {
      if (sharedSegmentLength(left[i - 1], left[i], right[j - 1], right[j]) > 0) return true;
    }
  }
  return false;
}

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const aVertical = a[0] === b[0];
  const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical) return a[0] === c[0] && intervalsOverlap(a[1], b[1], c[1], d[1]);
    return a[1] === c[1] && intervalsOverlap(a[0], b[0], c[0], d[0]);
  }
  const verticalStart = aVertical ? a : c;
  const verticalEnd = aVertical ? b : d;
  const horizontalStart = aVertical ? c : a;
  const horizontalEnd = aVertical ? d : b;
  return between(verticalStart[0], horizontalStart[0], horizontalEnd[0])
    && between(horizontalStart[1], verticalStart[1], verticalEnd[1]);
}

function sharedSegmentLength(a: Point, b: Point, c: Point, d: Point): number {
  if (a[0] === b[0] && c[0] === d[0] && a[0] === c[0]) {
    return Math.max(0, Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]))
      - Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1])));
  }
  if (a[1] === b[1] && c[1] === d[1] && a[1] === c[1]) {
    return Math.max(0, Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]))
      - Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0])));
  }
  return 0;
}

function intervalsOverlap(a1: number, a2: number, b1: number, b2: number): boolean {
  return Math.max(Math.min(a1, a2), Math.min(b1, b2)) <= Math.min(Math.max(a1, a2), Math.max(b1, b2));
}

function between(value: number, a: number, b: number): boolean {
  return value >= Math.min(a, b) && value <= Math.max(a, b);
}
