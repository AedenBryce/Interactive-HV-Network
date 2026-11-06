import type { NetworkModel } from '../session/model';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { planOrthogonalRoutes, type RouteRequest, type ReservedRoute } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { cutsBox, type Point } from './diagram-geometry';

/**
 * Isolated channel-first experiment. Busbars are reserved as shared, explicit
 * conductors before feeder routes are planned; selected SW411 feeder links get
 * distinct vertical source lanes, then all remaining model connections route
 * around the measured symbol, label and room geometry.
 */
export function layoutAgent4BusbarCorridors(model: NetworkModel) {
  const seed = layoutTopDownFullNetwork(model, { placement: 'topology-staggered' });
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const kindByAsset = new Map(model.assets.map(asset => [asset.id, asset.kind] as const));
  const busbars = createBusbarReservations(model, seed.routeRequests, ownerByTerminal, kindByAsset);
  const corridors = allocateMajorFeedChannels(seed.routeRequests, ownerByTerminal);
  const roomByAsset = new Map(seed.roomFrames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const frameObstacles = seed.roomFrames.map(frame => ({ id: `room-frame:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const requests = seed.routeRequests.map(request => {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId)!;
    const toAsset = ownerByTerminal.get(request.toTerminalId)!;
    const ownFrames = [roomByAsset.get(fromAsset), roomByAsset.get(toAsset)].filter((id): id is string => !!id);
    return {
      ...request,
      order: corridors.orderByConnection.get(request.id) ?? (request.preferDown ? 1_000 : 2_000),
      preferredPath: corridors.paths.get(request.id) ?? request.preferredPath,
      ignoredObstacleIds: [...new Set([...(request.ignoredObstacleIds ?? []), ...ownFrames.map(id => `room-frame:${id}`)])],
    };
  });
  const routeOptions = {
    obstacles: [...seed.routeObstacles, ...frameObstacles],
    clearance: 22,
    localSearchPadding: 480,
    maxLocalSearchPadding: 4_800,
    maxSearchAttempts: 4,
    maxGridNodes: 48_000,
    bendPenalty: 100,
    allowCrossings: false,
  } as const;
  const feeders = new Set(corridors.paths.keys());
  const local: RouteRequest[] = []; const crossTree: RouteRequest[] = []; const alternate: RouteRequest[] = [];
  for (const request of requests) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(request.fromTerminalId) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(request.toTerminalId) ?? '');
    if (fromRoom && fromRoom === toRoom && !feeders.has(request.id)) local.push(request);
    else if (request.preferDown || feeders.has(request.id)) crossTree.push(request);
    else alternate.push(request);
  }
  const reservedRoutes: ReservedRoute[] = [...busbars];
  const routed = new Map<string, readonly Point[]>();
  const unresolved: { routeId: string; reason: string }[] = [];
  const stages: { id: string; requested: number; routed: number; unresolved: number }[] = [];
  for (const [id, stage] of [['room-local', local], ['source-feeder-channels', crossTree], ['alternate-links', alternate]] as const) {
    const planned = planOrthogonalRoutes(stage, { ...routeOptions, reservedRoutes });
    for (const [routeId, points] of planned.routes) {
      routed.set(routeId, points.map(([x, y]) => [x, y] as Point));
      const request = stage.find(item => item.id === routeId)!;
      reservedRoutes.push({ id: routeId, points: points.map(([x, y]) => [x, y] as Point), fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
    }
    unresolved.push(...planned.unresolved.map(item => ({ routeId: item.routeId, reason: item.reason })));
    stages.push({ id, requested: stage.length, routed: planned.routes.size, unresolved: planned.unresolved.length });
  }
  const plan = { routes: routed, unresolved, stages };
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
  const routes: GeometryRoute[] = [
    ...[...plan.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points: points.map(([x, y]) => [x, y] as Point), terminals: [connection.from, connection.to] as [string, string] };
    }),
    ...busbars.map(bar => ({ id: bar.id, points: bar.points.map(([x, y]) => [x, y] as Point), terminals: [bar.fromTerminalId, bar.toTerminalId] as [string, string] })),
  ];
  const findings = validateDiagramGeometry({ routes, roomFrames: seed.roomFrames });
  const contentBoxes = [...seed.symbolBoxes, ...[...seed.labels].map(([id, label]) => ({ id: `label:${id}`, ...label }))];
  const symbolLabelHits = new Set<string>();
  for (const [id, points] of plan.routes) {
    const connection = connectionById.get(id)!;
    const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
    for (const box of contentBoxes) {
      const assetId = box.id.replace(/^(?:symbol|label):/, '');
      if (endpointOwners.includes(assetId)) continue;
      for (let index = 1; index < points.length; index++) if (cutsBox([points[index - 1][0], points[index - 1][1]], [points[index][0], points[index][1]], box)) symbolLabelHits.add(`${id}->${box.id}`);
    }
  }
  const roomFrameOverlaps = findings.filter(finding => finding.type === 'room-frame-overlap').length;
  const frameCuts = findings.filter(finding => finding.type === 'route-room-frame');
  const unrelatedFrameCuts = frameCuts.filter(finding => {
    const connection = connectionById.get(finding.routeId);
    const frame = seed.roomFrames.find(item => item.id === finding.roomFrameId);
    if (!connection || !frame) return true;
    const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
    return !endpoints.some(id => id && frame.memberAssetIds.includes(id));
  });
  const resultIds = [...plan.routes.keys(), ...plan.unresolved.map(item => item.routeId)];
  const endpointMismatches = [...plan.routes.keys()].filter(id => {
    const connection = connectionById.get(id);
    const request = requests.find(item => item.id === id);
    return !connection || !request || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
  });
  const allPoints = [
    ...Object.values(seed.positions), ...[...plan.routes.values()].flat(), ...busbars.flatMap(bar => bar.points),
    ...seed.roomFrames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point]),
  ];
  const xs = allPoints.map(point => point[0]); const ys = allPoints.map(point => point[1]);
  const bounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return {
    seed,
    routes: plan.routes,
    unresolved: plan.unresolved,
    requests,
    busbars,
    findings,
    symbolLabelHits: [...symbolLabelHits],
    frameCuts: frameCuts.length,
    unrelatedFrameCuts: unrelatedFrameCuts.length,
    roomFrameOverlaps,
    stages: plan.stages,
    resultIds,
    endpointMismatches,
    bounds,
    corridorPaths: corridors.paths,
    corridorOrder: corridors.orderByConnection,
    modelInventory: { assets: model.assets.length, connections: model.connections.length },
    routedCount: plan.routes.size,
  };
}

export function allocateMajorFeedChannels(requests: readonly RouteRequest[], ownerByTerminal: ReadonlyMap<string, string>) {
  const feedRequests = requests.flatMap(request => {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId) ?? '';
    const toAsset = ownerByTerminal.get(request.toTerminalId) ?? '';
    const fromIsTier = /^sw411:tier-(?:01|02|03|04|13|14|15|16):interface$/.test(fromAsset);
    const toIsTier = /^sw411:tier-(?:01|02|03|04|13|14|15|16):interface$/.test(toAsset);
    if (fromIsTier === toIsTier) return [];
    const upstream = fromIsTier ? request.from : request.to;
    const downstream = fromIsTier ? request.to : request.from;
    const [ux, uy] = upstream; const [dx, dy] = downstream;
    // Each feeder leaves its own existing tier tap. The tier tap itself is the
    // channel identity; no new electrical node or connection is invented.
    const laneX = ux;
    const approachY = dy > uy ? dy - 80 : dy + 80;
    const forward: Point[] = [[ux, uy], [laneX, approachY], [dx, approachY], [dx, dy]];
    const path = fromIsTier ? forward : [...forward].reverse();
    const order = feederTierOrder(fromIsTier ? fromAsset : toAsset);
    return [{ request, path: simplify(path), order }];
  }).sort((a, b) => a.order - b.order || a.request.id.localeCompare(b.request.id));
  return {
    paths: new Map(feedRequests.map(item => [item.request.id, item.path] as const)),
    orderByConnection: new Map(feedRequests.map((item, index) => [item.request.id, index] as const)),
  };
}

function feederTierOrder(assetId: string) {
  const tier = assetId.match(/tier-(\d+)/)?.[1];
  const order = ['01', '02', '03', '04', '13', '14', '15', '16'].indexOf(tier ?? '');
  return Math.max(0, order);
}

function createBusbarReservations(
  model: NetworkModel,
  requests: readonly RouteRequest[],
  ownerByTerminal: ReadonlyMap<string, string>,
  kindByAsset: ReadonlyMap<string, string>,
): ReservedRoute[] {
  const tapsByTerminal = new Map<string, Point[]>();
  for (const request of requests) for (const endpoint of [
    { terminal: request.fromTerminalId, point: request.from },
    { terminal: request.toTerminalId, point: request.to },
  ]) {
    const owner = ownerByTerminal.get(endpoint.terminal);
    if (owner && kindByAsset.get(owner) === 'bus') tapsByTerminal.set(endpoint.terminal, [...(tapsByTerminal.get(endpoint.terminal) ?? []), [endpoint.point[0], endpoint.point[1]]]);
  }
  const bars: ReservedRoute[] = [];
  for (const bus of model.assets.filter(asset => asset.kind === 'bus')) for (const terminal of bus.terminals) {
    const taps = tapsByTerminal.get(terminal) ?? [];
    if (taps.length < 2) continue;
    const ys = [...new Set(taps.map(point => point[1]))];
    if (ys.length !== 1) continue;
    const xs = [...new Set(taps.map(point => point[0]))].sort((a, b) => a - b);
    if (xs.length < 2) continue;
    // Reserve one segment per adjacent pair of tap points. Every branch then
    // meets a busbar segment at an endpoint carrying the same bus terminal;
    // one continuous reservation would make interior tap contacts illegal to
    // the strict segment router.
    for (let index = 1; index < xs.length; index++) bars.push({
      id: `agent4-busbar:${bus.id}:${index}`,
      points: [[xs[index - 1], ys[0]], [xs[index], ys[0]]],
      fromTerminalId: terminal,
      toTerminalId: terminal,
    });
  }
  return bars.sort((a, b) => a.id.localeCompare(b.id));
}

function simplify(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) result.push(point);
  }
  return result;
}
