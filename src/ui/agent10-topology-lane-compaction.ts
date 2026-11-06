import type { NetworkModel } from '../session/model';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { planOrthogonalRoutes, type RouteRequest, type ReservedRoute } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { cutsBox, type Point } from './diagram-geometry';

/** Graph-wide parent/child lanes with separate outer corridors for non-tree links. */
export function layoutAgent10TopologyLanes(model: NetworkModel) {
  const seed = layoutTopDownFullNetwork(model, { placement: 'topology-staggered' });
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const corridors = allocateTopologyLanes(model, seed.routeRequests, ownerByTerminal, seed.treeConnectionIds, seed.positions);
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
  const treeLinks = new Set(seed.treeConnectionIds);
  const local: RouteRequest[] = []; const crossTree: RouteRequest[] = []; const alternate: RouteRequest[] = [];
  for (const request of requests) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(request.fromTerminalId) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(request.toTerminalId) ?? '');
    if (treeLinks.has(request.id)) crossTree.push(request);
    else if (fromRoom && fromRoom === toRoom) local.push(request);
    else alternate.push(request);
  }
  const reservedRoutes: ReservedRoute[] = [];
  const routed = new Map<string, readonly Point[]>();
  const unresolved: { routeId: string; reason: string }[] = [];
  const stages: { id: string; requested: number; routed: number; unresolved: number }[] = [];
  for (const [id, stage] of [['room-local', local], ['source-tree-lanes', crossTree], ['outer-ring-lanes', alternate]] as const) {
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
    ...Object.values(seed.positions), ...[...plan.routes.values()].flat(),
    ...seed.roomFrames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point]),
  ];
  const xs = allPoints.map(point => point[0]); const ys = allPoints.map(point => point[1]);
  const bounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return {
    seed,
    routes: plan.routes,
    unresolved: plan.unresolved,
    requests,
    busbars: [],
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

export function allocateTopologyLanes(
  model: NetworkModel,
  requests: readonly RouteRequest[],
  ownerByTerminal: ReadonlyMap<string, string>,
  treeConnectionIds: ReadonlySet<string>,
  positions: Readonly<Record<string, Point>>,
) {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset] as const));
  const coords = Object.values(positions);
  const minX = Math.min(...coords.map(point => point[0]));
  const maxX = Math.max(...coords.map(point => point[0]));
  const minY = Math.min(...coords.map(point => point[1]));
  const edges = requests.map(request => {
    const fromAsset = ownerByTerminal.get(request.fromTerminalId)!;
    const toAsset = ownerByTerminal.get(request.toTerminalId)!;
    const fromIsParent = request.from[1] < request.to[1]
      || (request.from[1] === request.to[1] && fromAsset.localeCompare(toAsset) < 0);
    return {
      request,
      parent: fromIsParent ? fromAsset : toAsset,
      child: fromIsParent ? toAsset : fromAsset,
      start: fromIsParent ? request.from : request.to,
      end: fromIsParent ? request.to : request.from,
      tree: treeConnectionIds.has(request.id),
    };
  });
  const siblings = new Map<string, typeof edges>();
  for (const edge of edges.filter(item => item.tree)) siblings.set(edge.parent, [...(siblings.get(edge.parent) ?? []), edge]);
  for (const [parent, list] of siblings) {
    const terminals = assetById.get(parent)?.terminals ?? [];
    list.sort((a, b) => {
      const ai = Math.min(terminals.indexOf(a.request.fromTerminalId), terminals.indexOf(a.request.toTerminalId));
      const bi = Math.min(terminals.indexOf(b.request.fromTerminalId), terminals.indexOf(b.request.toTerminalId));
      return ai - bi || a.end[0] - b.end[0] || a.child.localeCompare(b.child);
    });
  }
  const paths = new Map<string, readonly Point[]>();
  const orderByConnection = new Map<string, number>();
  const tree = edges.filter(edge => edge.tree).sort((a, b) => a.start[1] - b.start[1] || a.parent.localeCompare(b.parent) || a.end[1] - b.end[1] || a.request.id.localeCompare(b.request.id));
  tree.forEach((edge, index) => {
    const peers = siblings.get(edge.parent) ?? [edge];
    const slot = peers.findIndex(peer => peer.request.id === edge.request.id);
    const laneX = edge.start[0] + (slot - (peers.length - 1) / 2) * 220;
    const direction = Math.sign(edge.end[1] - edge.start[1]) || 1;
    const firstY = edge.start[1] + direction * 100;
    const targetY = edge.end[1] - direction * 90;
    paths.set(edge.request.id, simplify([[...edge.start], [edge.start[0], firstY], [laneX, firstY], [laneX, targetY], [edge.end[0], targetY], [...edge.end]]));
    orderByConnection.set(edge.request.id, index);
  });
  const alternates = edges.filter(edge => !edge.tree).sort((a, b) => a.request.id.localeCompare(b.request.id));
  alternates.forEach((edge, index) => {
    const side = (edge.start[0] + edge.end[0]) / 2 <= (minX + maxX) / 2 ? -1 : 1;
    const laneX = side < 0 ? minX - 700 - index * 180 : maxX + 700 + index * 180;
    const laneY = minY - 700 - index * 150;
    paths.set(edge.request.id, simplify([[...edge.start], [laneX, edge.start[1]], [laneX, laneY], [edge.end[0], laneY], [...edge.end]]));
    orderByConnection.set(edge.request.id, tree.length + index);
  });
  return { paths, orderByConnection };
}
function simplify(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) result.push(point);
  }
  return result;
}
