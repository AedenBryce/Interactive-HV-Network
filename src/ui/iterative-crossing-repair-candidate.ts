import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { validateDiagramGeometry, type GeometryFinding, type GeometryRoute } from './geometry-validator';
import type { AssetLabel, Point } from './diagram-geometry';
import type { SwitchroomFrame } from './switchroom-frames';
import { crossingRouteIds, findVisualRouteCrossings } from './route-crossing-gaps';
import { resolveRoutes, type RouteResolveOptions } from './resolve-routes';

export type CrossingRepairMetrics = {
  properCrossings: number;
  sharedRouteLengths: number;
  unconfirmedEndpointContacts: number;
  roomFrameOverlaps: number;
  unrelatedRoomFrameIntersections: number;
};

export type IterativeCrossingRepairResult = {
  before: CrossingRepairMetrics;
  after: CrossingRepairMetrics;
  attemptedConnectionIds: string[];
  acceptedConnectionIds: string[];
};

export type IterativeCrossingRepairInput = {
  model: NetworkModel;
  layout: DiagramLayout;
  labels: Map<string, AssetLabel>;
  routes: Map<string, Point[]>;
  hidden: Set<string>;
  endpoints: (link: NetworkModel['connections'][number]) => { from: Point; to: Point };
  frames: readonly SwitchroomFrame[];
  /** Bound candidate routes to keep this an offline/one-shot layout pass. */
  maxAttempts?: number;
  searchOptions?: RouteResolveOptions;
};

/**
 * Trial a deterministic one-route-at-a-time repair for existing proper
 * crossings. Each proposal uses the production orthogonal router against all
 * other current routes, equipment, labels, busbars and room frames. It is kept
 * only when whole-diagram geometry improves without adding shared runs,
 * ambiguous endpoint contacts, room-frame overlaps, or unrelated frame
 * crossings. This candidate does not change assets, model connections, or
 * terminal coordinates and has no claim of clearing all network crossings.
 *
 * Run it as an offline layout candidate, then persist only a winning, audited
 * route plan. Do not invoke repeatedly during interactive state updates.
 */
export function applyIterativeCrossingRepairCandidate(
  input: IterativeCrossingRepairInput,
): IterativeCrossingRepairResult {
  const { model, layout, labels, routes, hidden, endpoints, frames } = input;
  const maxAttempts = Math.max(0, Math.floor(input.maxAttempts ?? 8));
  const initialMetrics = measure(input);
  let before = initialMetrics;
  const attemptedConnectionIds: string[] = [];
  const acceptedConnectionIds: string[] = [];

  for (let pass = 0; pass < maxAttempts; pass++) {
    const currentCrossings = findVisualRouteCrossings(model.connections, routes);
    if (currentCrossings.length === 0) break;
    const crossingCounts = new Map<string, number>();
    for (const crossing of currentCrossings) crossingCounts.set(crossing.routeId, (crossingCounts.get(crossing.routeId) ?? 0) + 1);
    const routeIds = [...crossingRouteIds(model.connections, routes)]
      .sort((a, b) => (crossingCounts.get(b) ?? 0) - (crossingCounts.get(a) ?? 0) || a.localeCompare(b));
    const routeId = routeIds.find(id => !attemptedConnectionIds.includes(id));
    if (!routeId) break;
    attemptedConnectionIds.push(routeId);

    const previous = routes.get(routeId);
    if (!previous || previous.length < 2) continue;
    const prior = previous.map(point => [point[0], point[1]] as Point);
    const diagnostics = resolveRoutes(
      model,
      layout,
      labels,
      routes,
      hidden,
      new Set([routeId]),
      endpoints,
      frames,
      input.searchOptions ?? {
        clearance: 24,
        maxLocalSearchPadding: 4096,
        maxSearchAttempts: 4,
        maxGridNodes: 50_000,
      },
    );
    const candidate = routes.get(routeId);
    if (!candidate || diagnostics.reroutedConnectionIds.length === 0 || samePath(prior, candidate)) {
      routes.set(routeId, prior);
      continue;
    }

    const after = measure(input);
    if (wholeDiagramImproves(before, after)) {
      before = after;
      acceptedConnectionIds.push(routeId);
    } else {
      routes.set(routeId, prior);
    }
  }

  return {
    before: initialMetrics,
    after: measure(input),
    attemptedConnectionIds,
    acceptedConnectionIds,
  };
}

function measure(input: IterativeCrossingRepairInput): CrossingRepairMetrics {
  const { model, layout, routes, frames } = input;
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map(frames.flatMap(frame => [...(frame.memberAssetIds ?? frame.assetIds)].map(id => [id, frame.id] as const)));
  const geometryRoutes: GeometryRoute[] = model.connections.flatMap(connection => {
    const points = routes.get(connection.id);
    return points && points.length > 1 ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
  });
  const findings = validateDiagramGeometry({
    routes: geometryRoutes,
    roomFrames: frames.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  });
  const unconfirmedEndpointContacts = findings.filter((finding): finding is Extract<GeometryFinding, { type: 'route-endpoint-on-interior' }> =>
    finding.type === 'route-endpoint-on-interior',
  ).filter(finding => !finding.commonTerminalIds.some(terminal => {
    const point = layout.terminals[terminal];
    return point?.[0] === finding.point[0] && point?.[1] === finding.point[1];
  })).length;
  const unrelatedRoomFrameIntersections = findings.filter((finding): finding is Extract<GeometryFinding, { type: 'route-room-frame' }> =>
    finding.type === 'route-room-frame',
  ).filter(finding => {
    const connection = model.connections.find(item => item.id === finding.routeId);
    if (!connection) return true;
    const endpointRooms = new Set([roomByAsset.get(owners.get(connection.from)!), roomByAsset.get(owners.get(connection.to)!)]);
    return !endpointRooms.has(finding.roomFrameId);
  }).length;
  return {
    properCrossings: findings.filter(finding => finding.type === 'route-crossing').length,
    sharedRouteLengths: findings.filter(finding => finding.type === 'shared-route-length').length,
    unconfirmedEndpointContacts,
    roomFrameOverlaps: findings.filter(finding => finding.type === 'room-frame-overlap').length,
    unrelatedRoomFrameIntersections,
  };
}

function wholeDiagramImproves(before: CrossingRepairMetrics, after: CrossingRepairMetrics): boolean {
  return after.properCrossings < before.properCrossings
    && after.sharedRouteLengths <= before.sharedRouteLengths
    && after.unconfirmedEndpointContacts <= before.unconfirmedEndpointContacts
    && after.roomFrameOverlaps <= before.roomFrameOverlaps
    && after.unrelatedRoomFrameIntersections <= before.unrelatedRoomFrameIntersections;
}

function samePath(a: readonly Point[], b: readonly Point[]): boolean {
  return a.length === b.length && a.every((point, index) => point[0] === b[index][0] && point[1] === b[index][1]);
}

