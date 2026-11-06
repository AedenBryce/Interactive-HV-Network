import type { Point } from './diagram-geometry';

const SW411_FEED_ROUTE_IDS = [
  'whole:join:sw454',
  'whole:join:sw451',
  'whole:join:sw435',
  'whole:join:sw426',
] as const;

export type Sw411FeedFanCandidateResult =
  | { applied: true }
  | {
      applied: false;
      reason: 'missing-route' | 'not-top-down' | 'inverted-endpoint-order' | 'no-local-corridor' | 'candidate-crossings';
    };

type Feed = { id: string; from: Point; to: Point };

function segmentsIntersect(a: Point, b: Point, c: Point, d: Point): boolean {
  const aVertical = a[0] === b[0];
  const cVertical = c[0] === d[0];
  if (aVertical === cVertical) {
    if (aVertical) {
      if (a[0] !== c[0]) return false;
      return Math.max(Math.min(a[1], b[1]), Math.min(c[1], d[1]))
        <= Math.min(Math.max(a[1], b[1]), Math.max(c[1], d[1]));
    }
    if (a[1] !== c[1]) return false;
    return Math.max(Math.min(a[0], b[0]), Math.min(c[0], d[0]))
      <= Math.min(Math.max(a[0], b[0]), Math.max(c[0], d[0]));
  }

  const verticalStart = aVertical ? a : c;
  const verticalEnd = aVertical ? b : d;
  const horizontalStart = aVertical ? c : a;
  const horizontalEnd = aVertical ? d : b;
  const x = verticalStart[0];
  const y = horizontalStart[1];
  return x >= Math.min(horizontalStart[0], horizontalEnd[0])
    && x <= Math.max(horizontalStart[0], horizontalEnd[0])
    && y >= Math.min(verticalStart[1], verticalEnd[1])
    && y <= Math.max(verticalStart[1], verticalEnd[1]);
}

function routesIntersect(left: Point[], right: Point[]): boolean {
  for (let i = 1; i < left.length; i++) {
    for (let j = 1; j < right.length; j++) {
      if (segmentsIntersect(left[i - 1], left[i], right[j - 1], right[j])) return true;
    }
  }
  return false;
}

/**
 * Try a tight, top-down orthogonal fan for the four SW411 feeder links. It
 * preserves current endpoints and only applies when source/target x-order is
 * compatible and the four candidate routes do not intersect one another.
 * This local check does not establish clearance from other diagram geometry.
 */
export function applySw411FeedFanCandidate(routes: Map<string, Point[]>): Sw411FeedFanCandidateResult {
  const feeds = SW411_FEED_ROUTE_IDS.flatMap((id): Feed[] => {
    const route = routes.get(id);
    if (!route || route.length < 2) return [];
    return [{ id, from: route[0], to: route[route.length - 1] }];
  });
  if (feeds.length !== SW411_FEED_ROUTE_IDS.length) return { applied: false, reason: 'missing-route' };
  if (feeds.some(({ from, to }) => to[1] <= from[1])) return { applied: false, reason: 'not-top-down' };

  const sourceOrder = [...feeds].sort((a, b) => a.from[0] - b.from[0]);
  const destinationOrder = [...feeds].sort((a, b) => a.to[0] - b.to[0]);
  if (sourceOrder.some((feed, index) => feed.id !== destinationOrder[index].id)) {
    return { applied: false, reason: 'inverted-endpoint-order' };
  }

  const sourceBottom = Math.max(...feeds.map(({ from }) => from[1]));
  const destinationTop = Math.min(...feeds.map(({ to }) => to[1]));
  const usableGap = destinationTop - sourceBottom;
  const corridorSpacing = Math.min(32, (usableGap - 16) / (feeds.length - 1));
  if (corridorSpacing < 12) return { applied: false, reason: 'no-local-corridor' };
  const corridorBaseY = sourceBottom + 8;
  const corridorOrder = new Map(sourceOrder.map((feed, index) => [feed.id, index]));

  const candidateRoutes = new Map<string, Point[]>();
  for (const { id, from, to } of feeds) {
    const index = corridorOrder.get(id)!;
    const corridorY = corridorBaseY + index * corridorSpacing;
    candidateRoutes.set(id, [
      from,
      [from[0], corridorY],
      [to[0], corridorY],
      to,
    ]);
  }

  const paths = [...candidateRoutes.values()];
  for (let i = 0; i < paths.length; i++) {
    for (let j = i + 1; j < paths.length; j++) {
      if (routesIntersect(paths[i], paths[j])) return { applied: false, reason: 'candidate-crossings' };
    }
  }

  for (const [id, path] of candidateRoutes) routes.set(id, path);
  return { applied: true };
}
