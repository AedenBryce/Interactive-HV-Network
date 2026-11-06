import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { placeTopDownRooms } from './top-down-room-placement';
import { roomPlacementAdjacencies, roomPlacementPlan } from './room-placement-plan';
import type { TopDownRoomPlan } from './top-down-room-placement';
import { planOrthogonalRoutes, routeAvoidsObstacles, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { AssetLabel, Point } from './diagram-geometry';
import { cutsBox } from './diagram-geometry';
import { roomClusterOwnership } from './room-cluster-ownership';
import { findSparseOrthogonalPath } from './sparse-orthogonal-route-fallback';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];
type Box = { id: string; x: number; y: number; width: number; height: number };
type CandidateOptions = {
  /** Include legacy per-room drawing coordinates as module-local seeds. */
  seedDrawingViews?: boolean;
  roomTranslations?: Readonly<Record<string, Point>>;
  assetTranslations?: Readonly<Record<string, Point>>;
  preferredPaths?: ReadonlyMap<string, readonly Point[]>;
  prioritizeConnectionIds?: readonly string[];
  routeBudget?: 'default' | 'quick';
  baseGeometry?: ReturnType<typeof continuousNetwork>;
};

/**
 * Experimental whole-graph layout. It keeps the production view as an input
 * geometry seed, applies only confirmed room parents, assigns bus attachment
 * slots, and submits every model connection to the orthogonal planner.
 */
export function layoutWholeGraphCandidate(model: NetworkModel, options: CandidateOptions = {}) {
  const base = options.baseGeometry ?? continuousNetwork(model);
  const frames: Frame[] = base.panels.map(frame => ({ ...frame, assetIds: [...frame.assetIds], memberAssetIds: [...frame.memberAssetIds] }));
  const safePlan = confirmedRoomPlan(frames);
  const earthSwitchIds = new Set(model.assets.filter(asset => asset.kind === 'earth-switch').map(asset => asset.id));
  const treeConnections = model.connections.filter(connection => base.treeEdgeIds.has(connection.id));
  const assetByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const earthTreeConnections = treeConnections.filter(connection => earthSwitchIds.has(assetByTerminal.get(connection.from)!) || earthSwitchIds.has(assetByTerminal.get(connection.to)!));
  const earthConnectionIds = new Set(earthTreeConnections.map(connection => connection.id));
  const treeEdges = treeConnections.filter(connection => !earthConnectionIds.has(connection.id)).flatMap(connection => {
    const parentAssetId = assetByTerminal.get(connection.from); const childAssetId = assetByTerminal.get(connection.to);
    return parentAssetId && childAssetId ? [{ id: connection.id, parentAssetId, childAssetId }] : [];
  });
  const earthBranches = earthTreeConnections.flatMap(connection => {
    const from = assetByTerminal.get(connection.from); const to = assetByTerminal.get(connection.to);
    const earthSwitchAssetId = from && earthSwitchIds.has(from) ? from : to && earthSwitchIds.has(to) ? to : undefined;
    const ownerAssetId = earthSwitchAssetId === from ? to : from;
    return earthSwitchAssetId && ownerAssetId ? [{ id: connection.id, ownerAssetId, earthSwitchAssetId, direction: 'owner-to-earth-switch' as const }] : [];
  });
  const ownership = roomClusterOwnership(model, treeEdges, earthBranches);
  const roomOwner = options.assetTranslations ? frameCoreOwnerByAsset(frames) : ownership.ownerByAssetId;
  const rootIds = [...ownership.unassignedAssetIds].map(assetId => `asset-root:${assetId}`);
  const rootIdByAsset = new Map(rootIds.map(id => [id.slice('asset-root:'.length), id]));
  const placementIdByAsset = new Map(model.assets.map(asset => [asset.id, roomOwner.get(asset.id) ?? rootIdByAsset.get(asset.id)!]));
  const seedPositions = Object.fromEntries(Object.entries(base.view.layout.assets).map(([id, point]) => [id, [...point] as Point]));
  const seedTerminals = Object.fromEntries(Object.entries(base.view.layout.terminals).map(([id, point]) => [id, [...point] as Point]));
  const seedLabels = new Map([...base.labels].map(([id, label]) => [id, { ...label, lines: [...label.lines] }]));
  const seedBusSpans = { ...(base.view.layout.busSpans ?? {}) };
  const sourceGeometry = options.assetTranslations || !options.seedDrawingViews
    ? {
        skipped: options.assetTranslations ? 'explicit asset translations' : 'complete-renderer baseline; mixed legacy views disabled',
        rooms: [], seededAssetCount: 0, missingAssetIds: [], missingTerminalIds: [],
      }
    : seedRoomModulesFromDrawingViews(model, frames, roomOwner, seedPositions, seedTerminals, seedLabels, seedBusSpans);
  const seedContentBoxes = assetContentBoxes(model, seedPositions, seedLabels, base.hiddenIds);
  if (!options.assetTranslations) resizeFramesToCoreContent(frames, seedContentBoxes);
  const footprints = roomFootprints(frames, roomOwner, seedContentBoxes);
  const rootFootprints = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  for (const assetId of ownership.unassignedAssetIds) {
    const assetBoxes = seedContentBoxes.filter(box => box.id.endsWith(`:${assetId}`));
    const point = seedPositions[assetId] ?? [0, 0];
    const minX = Math.min(point[0] - 46, ...assetBoxes.map(box => box.x));
    const minY = Math.min(point[1] - 46, ...assetBoxes.map(box => box.y));
    const maxX = Math.max(point[0] + 46, ...assetBoxes.map(box => box.x + box.width));
    const maxY = Math.max(point[1] + 46, ...assetBoxes.map(box => box.y + box.height));
    rootFootprints.set(`asset-root:${assetId}`, { minX, minY, maxX, maxY });
  }
  const placementPlan: TopDownRoomPlan = {
    ...safePlan,
    ...Object.fromEntries(rootIds.map(id => [id, { topology: 'presentation-tree' as const, parents: [] }])),
  };
  const placementDimensions = [
    ...frames.map(frame => ({
    id: frame.id,
    width: footprints.get(frame.id)!.maxX - footprints.get(frame.id)!.minX,
    height: footprints.get(frame.id)!.maxY - footprints.get(frame.id)!.minY,
    })),
    ...rootIds.map(id => ({ id, width: rootFootprints.get(id)!.maxX - rootFootprints.get(id)!.minX, height: rootFootprints.get(id)!.maxY - rootFootprints.get(id)!.minY })),
  ];
  const placement = options.roomTranslations ? { positions: {}, unplaced: [] } : placeTopDownRooms(placementDimensions, {
    plan: placementPlan,
    adjacentPairs: roomPlacementAdjacencies,
    origin: { x: 0, y: 0 },
    horizontalGap: 900,
    verticalGap: 700,
    maxRoomsPerRow: 4,
    maxRowWidth: 22_000,
  });

  const positions = seedPositions;
  const terminals = seedTerminals;
  const labels = seedLabels;
  const deltaByRoom = new Map<string, Point>();
  for (const frame of frames) {
    if (options.roomTranslations) {
      const [dx, dy] = options.roomTranslations[frame.id] ?? [0, 0];
      deltaByRoom.set(frame.id, [dx, dy]);
      frame.x += dx; frame.y += dy;
      continue;
    }
    const target = placement.positions[frame.id];
    if (!target) continue;
    const footprint = footprints.get(frame.id)!;
    deltaByRoom.set(frame.id, [target.x - footprint.minX, target.y - footprint.minY]);
    const [dx, dy] = deltaByRoom.get(frame.id)!;
    frame.x += dx; frame.y += dy;
  }
  const deltaByRoot = new Map<string, Point>();
  for (const [rootId, footprint] of rootFootprints) {
    const target = placement.positions[rootId]; if (!target) continue;
    deltaByRoot.set(rootId, [target.x - footprint.minX, target.y - footprint.minY]);
  }
  const deltaByAsset = new Map<string, Point>();
  for (const asset of model.assets) {
    const placementId = placementIdByAsset.get(asset.id);
    const [dx, dy] = options.assetTranslations?.[asset.id]
      ?? (placementId ? deltaByRoom.get(placementId) ?? deltaByRoot.get(placementId) ?? [0, 0] : [0, 0]);
    deltaByAsset.set(asset.id, [dx, dy]);
    if (positions[asset.id]) positions[asset.id] = [positions[asset.id][0] + dx, positions[asset.id][1] + dy];
    for (const terminal of asset.terminals) if (terminals[terminal]) terminals[terminal] = [terminals[terminal][0] + dx, terminals[terminal][1] + dy];
    const label = labels.get(asset.id); if (label) labels.set(asset.id, { ...label, x: label.x + dx, y: label.y + dy });
  }

  const busSlots = createBusAttachmentSlots(model, positions, seedBusSpans, base.view.layout.rotations ?? {});
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const symbolLabelBoxes = assetContentBoxes(model, positions, labels, base.hiddenIds);
  // Room borders describe the enclosed switchgear, not the average position
  // of every asset on its downstream supply tree. Rebuild each frame from its
  // measured core equipment after the complete asset placement is applied.
  for (const frame of frames) {
    const coreBoxes = symbolLabelBoxes.filter(box => frame.assetIds.includes(box.id.replace(/^(?:symbol|label):/, '')));
    if (!coreBoxes.length) continue;
    const left = Math.min(...coreBoxes.map(box => box.x));
    const top = Math.min(...coreBoxes.map(box => box.y));
    const right = Math.max(...coreBoxes.map(box => box.x + box.width));
    const bottom = Math.max(...coreBoxes.map(box => box.y + box.height));
    frame.x = left - 24;
    frame.y = top - 26;
    frame.width = right - left + 48;
    frame.height = bottom - top + 54;
  }
  const roomObstacles = frames.map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const connections = new Map(model.connections.map(connection => [connection.id, connection]));
  const originalRoomCuts = new Map<string, number>();
  const originalRouteLengths = new Map<string, number>();
  for (const connection of model.connections) {
    const path = base.routes.get(connection.id) ?? [];
    originalRouteLengths.set(connection.id, path.slice(1).reduce((length, point, index) => length
      + Math.abs(point[0] - path[index][0]) + Math.abs(point[1] - path[index][1]), 0));
    originalRoomCuts.set(connection.id, base.panels.filter(frame => path.slice(1).some((point, index) => cutsBox(path[index], point, {
      x: frame.x, y: frame.y, width: frame.width, height: frame.height,
    }))).length);
  }
  const priority = new Map((options.prioritizeConnectionIds ?? []).map((id, index) => [id, index]));
  const orderedConnections = [...model.connections].sort((a, b) => {
    const priorityDifference = (priority.get(a.id) ?? Infinity) - (priority.get(b.id) ?? Infinity);
    if (Number.isFinite(priorityDifference) && priorityDifference !== 0) return priorityDifference;
    if (priority.has(a.id) !== priority.has(b.id)) return priority.has(a.id) ? -1 : 1;
    const aCrossRoom = placementIdByAsset.get(ownerByTerminal.get(a.from)!) !== placementIdByAsset.get(ownerByTerminal.get(a.to)!);
    const bCrossRoom = placementIdByAsset.get(ownerByTerminal.get(b.from)!) !== placementIdByAsset.get(ownerByTerminal.get(b.to)!);
    if (aCrossRoom !== bCrossRoom) return aCrossRoom ? -1 : 1;
    const frameCutDifference = (originalRoomCuts.get(b.id) ?? 0) - (originalRoomCuts.get(a.id) ?? 0);
    if (frameCutDifference) return frameCutDifference;
    const lengthDifference = (originalRouteLengths.get(b.id) ?? 0) - (originalRouteLengths.get(a.id) ?? 0);
    return lengthDifference || a.id.localeCompare(b.id);
  });
  const connectionOrder = new Map(orderedConnections.map((connection, index) => [connection.id, index]));
  const requests: RouteRequest[] = model.connections.map(connection => {
    const fromOwner = ownerByTerminal.get(connection.from)!; const toOwner = ownerByTerminal.get(connection.to)!;
    const from = busSlots.get(`${connection.id}:${connection.from}`) ?? terminals[connection.from];
    const to = busSlots.get(`${connection.id}:${connection.to}`) ?? terminals[connection.to];
    const original = base.routes.get(connection.id) ?? [from, to];
    const fromDelta: Point = [from[0] - original[0][0], from[1] - original[0][1]];
    const last = original.at(-1)!;
    const toDelta: Point = [to[0] - last[0], to[1] - last[1]];
    const average: Point = [(fromDelta[0] + toDelta[0]) / 2, (fromDelta[1] + toDelta[1]) / 2];
    const preferred = stitchOrthogonal(from, original.slice(1, -1).map(([x, y]) => [x + average[0], y + average[1]] as Point), to);
    const ignoredObstacleIds = [`symbol:${fromOwner}`, `label:${fromOwner}`, `symbol:${toOwner}`, `label:${toOwner}`];
    const fromRoom = roomOwner.get(fromOwner); const toRoom = roomOwner.get(toOwner);
    if (fromRoom) ignoredObstacleIds.push(`room:${fromRoom}`);
    if (toRoom && toRoom !== fromRoom) ignoredObstacleIds.push(`room:${toRoom}`);
    return {
      id: connection.id, from, to, fromTerminalId: connection.from, toTerminalId: connection.to,
      order: connectionOrder.get(connection.id),
      preferDown: base.treeEdgeIds.has(connection.id),
      ignoredObstacleIds,
      preferredPath: options.preferredPaths?.get(connection.id) ?? preferred,
    };
  });
  const quickRouting = options.routeBudget === 'quick';
  const routeSelection = planWholeRouteSet(requests, [...symbolLabelBoxes, ...roomObstacles], frames, {
    clearance: 30,
    localSearchPadding: 320,
    maxLocalSearchPadding: quickRouting ? 1_200 : 2_400,
    maxSearchAttempts: quickRouting ? 2 : 4,
    maxGridNodes: quickRouting ? 24_000 : 48_000,
    bendPenalty: 130,
    // A crossing makes the topology ambiguous at the exact points where this
    // overview must be easy to trace. If the placed modules leave no
    // crossing-free path, the candidate should report that route unresolved
    // and force a placement change instead of drawing through another circuit.
    allowCrossings: false,
  }, options.prioritizeConnectionIds ?? []);
  const routes = routeSelection.routes;
  const routeGeometry: GeometryRoute[] = [...routes].map(([id, points]) => {
    const connection = connections.get(id)!;
    return { id, points, terminals: [connection.from, connection.to] };
  });
  const findings = validateDiagramGeometry({
    routes: routeGeometry,
    roomFrames: frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
  });
  const unconfirmedRooms = frames.filter(frame => roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan]?.topology === 'unconfirmed'
    || roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan]?.parents.some(parent => parent.kind === 'room'
      && roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology !== 'owner-confirmed')).map(frame => frame.id);
  const sourceAnchors = [...new Set(frames.flatMap(frame => safePlan[frame.id]?.parents.filter(parent => parent.kind === 'supply-anchor').map(parent => parent.id) ?? []))]
    .map(id => ({ id: `layout-anchor:${id}`, sourceAnchorId: id, modelSource: false }));
  const bounds = boundsOf([
    ...Object.values(positions), ...[...routes.values()].flat(),
    ...frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point]),
  ]);
  return {
    positions, terminals, labels, frames, routes, routeRequests: requests,
    unresolved: routeSelection.unresolved.map(item => `${item.routeId}:${item.reason}`),
    fallbackRouteIds: routeSelection.fallbackRouteIds,
    obstacleInvalidRouteIds: routeSelection.obstacleInvalidRouteIds,
    findings, placement, safePlan, sourceAnchors, busSlots, symbolLabelBoxes,
    routingOrder: routeSelection.selectedStrategy,
    routingAlternatives: routeSelection.alternatives,
    roomOwnerByAsset: roomOwner,
    contentBoxCollisions: contentBoxCollisions(symbolLabelBoxes),
    roomFootprints: footprints,
    sourceGeometry,
    modelConnectionCount: model.connections.length,
    routeCount: routes.size,
    unconfirmedRooms,
    ringConnectionIds: model.connections.filter(connection => connection.id === 'whole:join:crushing-tie').map(connection => connection.id),
    bounds,
  };
}

/**
 * Compare deterministic whole-network route orders before selecting any one
 * route set. The underlying path search reserves accepted segments, so its
 * result depends on order; evaluating the complete request set under several
 * meaningful priorities avoids treating the first ordering as authoritative.
 * Sparse routing is applied only after a complete candidate wins.
 */
function planWholeRouteSet(
  requests: readonly RouteRequest[],
  obstacles: readonly { id: string; x: number; y: number; width: number; height: number }[],
  frames: readonly Frame[],
  routeOptions: Parameters<typeof planOrthogonalRoutes>[1],
  prioritizedIds: readonly string[],
) {
  const requestById = new Map(requests.map(request => [request.id, request] as const));
  const priority = new Map(prioritizedIds.map((id, index) => [id, index] as const));
  const distance = (request: RouteRequest) => Math.abs(request.from[0] - request.to[0]) + Math.abs(request.from[1] - request.to[1]);
  const stable = (a: RouteRequest, b: RouteRequest) => (a.order ?? Infinity) - (b.order ?? Infinity) || a.id.localeCompare(b.id);
  const priorityFirst = (a: RouteRequest, b: RouteRequest) => {
    const aPriority = priority.get(a.id); const bPriority = priority.get(b.id);
    if (aPriority !== undefined || bPriority !== undefined) {
      if (aPriority === undefined) return 1;
      if (bPriority === undefined) return -1;
      if (aPriority !== bPriority) return aPriority - bPriority;
    }
    return 0;
  };
  const strategies: { id: string; compare: (a: RouteRequest, b: RouteRequest) => number }[] = [
    { id: 'current-network-priority', compare: (a, b) => priorityFirst(a, b) || stable(a, b) },
    { id: 'tree-connections-first', compare: (a, b) => priorityFirst(a, b) || Number(!a.preferDown) - Number(!b.preferDown) || stable(a, b) },
    { id: 'short-connections-first', compare: (a, b) => priorityFirst(a, b) || distance(a) - distance(b) || stable(a, b) },
    { id: 'long-connections-first', compare: (a, b) => priorityFirst(a, b) || distance(b) - distance(a) || stable(a, b) },
  ];
  const candidates = strategies.map(strategy => {
    const ordered = [...requests].sort(strategy.compare).map((request, order) => ({ ...request, order }));
    const plan = planOrthogonalRoutes(ordered, { ...routeOptions, obstacles });
    const geometry: GeometryRoute[] = [...plan.routes].map(([id, points]) => {
      const request = requestById.get(id)!;
      return { id, points: points.map(point => [point[0], point[1]] as Point), terminals: [request.fromTerminalId, request.toTerminalId] };
    });
    const findings = validateDiagramGeometry({ routes: geometry, roomFrames: frames });
    const totalLength = [...plan.routes.values()].reduce((sum, points) => sum + points.slice(1).reduce((length, point, index) =>
      length + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]), 0), 0);
    return {
      strategy: strategy.id,
      routes: new Map([...plan.routes].map(([id, points]) => [id, points.map(point => [point[0], point[1]] as Point)])),
      unresolved: plan.unresolved,
      score: [
        -plan.routes.size,
        findings.filter(item => item.type === 'route-crossing').length,
        findings.filter(item => item.type === 'shared-route-length').length,
        findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        findings.filter(item => item.type === 'route-room-frame').length,
        totalLength,
      ],
    };
  });
  candidates.sort((a, b) => compareScores(a.score, b.score) || a.strategy.localeCompare(b.strategy));
  const selected = candidates[0];
  const reserved = [...selected.routes].map(([id, points]) => {
    const request = requestById.get(id)!;
    return { id, points, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId };
  });
  const unresolved = [...selected.unresolved].sort((a, b) => {
    const requestA = requestById.get(a.routeId)!; const requestB = requestById.get(b.routeId)!;
    return distance(requestB) - distance(requestA) || a.routeId.localeCompare(b.routeId);
  });
  const fallbackRouteIds: string[] = [];
  for (const item of unresolved) {
    const request = requestById.get(item.routeId)!;
    const path = findSparseOrthogonalPath(request, obstacles, reserved, { clearance: 30, padding: 8_000, bendPenalty: 130 });
    if (!path || !routeAvoidsObstacles(path, request, obstacles, 30)) continue;
    selected.routes.set(request.id, path.map(point => [point[0], point[1]] as Point));
    fallbackRouteIds.push(request.id);
    reserved.push({ id: request.id, points: path.map(point => [point[0], point[1]] as Point), fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
  }
  const obstacleInvalidRouteIds = [...selected.routes].flatMap(([id, points]) => {
    const request = requestById.get(id)!;
    return routeAvoidsObstacles(points, request, obstacles, 30) ? [] : [id];
  });
  return {
    routes: selected.routes,
    unresolved: selected.unresolved.filter(item => !selected.routes.has(item.routeId)),
    fallbackRouteIds,
    obstacleInvalidRouteIds,
    selectedStrategy: selected.strategy,
    alternatives: candidates.map(candidate => ({ strategy: candidate.strategy, routed: candidate.score[0] * -1, unresolved: candidate.unresolved.length, score: candidate.score })),
  };
}

function compareScores(a: readonly number[], b: readonly number[]) {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function confirmedRoomPlan(frames: readonly Frame[]): Record<string, TopDownRoomPlan[string]> {
  const frameIds = new Set(frames.map(frame => frame.id));
  const safe: Record<string, TopDownRoomPlan[string]> = {};
  for (const frame of frames) {
    const configured = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (!configured || configured.topology === 'unconfirmed') {
      // Spatially place detached rooms as independent roots without promoting
      // their electrical parentage to confirmed.
      safe[frame.id] = { topology: 'presentation-tree', parents: [] };
      continue;
    }
    const parents = configured.parents.filter(parent => {
      if (parent.kind === 'supply-anchor') return true;
      if (!frameIds.has(parent.id)) return false;
      return roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology === 'owner-confirmed';
    });
    const hadUnconfirmedRoomParent = configured.parents.some(parent => parent.kind === 'room'
      && frameIds.has(parent.id)
      && roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology !== 'owner-confirmed');
    safe[frame.id] = hadUnconfirmedRoomParent
      ? { topology: 'presentation-tree', parents: [] }
      : { topology: 'owner-confirmed', parents };
  }
  return safe;
}

function frameCoreOwnerByAsset(frames: readonly Frame[]) {
  const owner = new Map<string, string>(); const ambiguous = new Set<string>();
  for (const frame of frames) for (const assetId of frame.assetIds) {
    if (owner.has(assetId) && owner.get(assetId) !== frame.id) { owner.delete(assetId); ambiguous.add(assetId); }
    else if (!ambiguous.has(assetId)) owner.set(assetId, frame.id);
  }
  return owner;
}

/**
 * Reuse the project's original per-room drawing coordinates as rigid module
 * geometry. A global tree layout is useful for ordering the rooms, but it is a
 * poor source for the internal switchgear: it stretches busgear across every
 * downstream branch. This copies drawing-view coordinates as one unit before
 * the complete room placement and route solve.
 */
function seedRoomModulesFromDrawingViews(
  model: NetworkModel,
  frames: readonly Frame[],
  roomOwner: ReadonlyMap<string, string>,
  positions: Record<string, Point>,
  terminals: Record<string, Point>,
  labels: Map<string, AssetLabel>,
  busSpans: Record<string, number>,
) {
  const report: { roomId: string; sourceViewId?: string; seededAssetIds: string[]; missingAssetIds: string[] }[] = [];
  const missingTerminalIds: string[] = [];
  const scale = 1.6;
  for (const frame of frames) {
    const source = model.presentation?.views.find(view => view.id === frame.id);
    const roomAssets = [...roomOwner].filter(([, owner]) => owner === frame.id).map(([assetId]) => assetId);
    const seededAssetIds: string[] = [];
    const missingAssetIds: string[] = [];
    if (!source) {
      report.push({ roomId: frame.id, seededAssetIds, missingAssetIds: roomAssets });
      continue;
    }
    for (const assetId of roomAssets) {
      if (!source.assetIds.includes(assetId) || !source.layout.assets[assetId]) {
        missingAssetIds.push(assetId);
        continue;
      }
      const old = positions[assetId];
      const sourcePoint: Point = [source.layout.assets[assetId][0] * scale, source.layout.assets[assetId][1] * scale];
      positions[assetId] = sourcePoint;
      if (old) {
        const label = labels.get(assetId);
        if (label) labels.set(assetId, { ...label, x: label.x + sourcePoint[0] - old[0], y: label.y + sourcePoint[1] - old[1] });
      }
      const asset = model.assets.find(candidate => candidate.id === assetId);
      for (const terminal of asset?.terminals ?? []) {
        const point = source.layout.terminals[terminal];
        if (point) terminals[terminal] = [point[0] * scale, point[1] * scale];
        else missingTerminalIds.push(terminal);
      }
      if (source.layout.busSpans?.[assetId] !== undefined) busSpans[assetId] = source.layout.busSpans[assetId] * scale;
      seededAssetIds.push(assetId);
    }
    report.push({ roomId: frame.id, sourceViewId: source.id, seededAssetIds, missingAssetIds: [...new Set(missingAssetIds)] });
  }
  return {
    rooms: report,
    seededAssetCount: report.reduce((sum, room) => sum + room.seededAssetIds.length, 0),
    missingAssetIds: report.flatMap(room => room.missingAssetIds.map(assetId => `${room.roomId}:${assetId}`)),
    missingTerminalIds,
  };
}

function resizeFramesToCoreContent(frames: Frame[], boxes: readonly Box[]) {
  for (const frame of frames) {
    const assetIds = new Set(frame.assetIds);
    const content = boxes.filter(box => assetIds.has(box.id.replace(/^(?:symbol|label):/, '')));
    if (!content.length) continue;
    const left = Math.min(...content.map(box => box.x));
    const top = Math.min(...content.map(box => box.y));
    const right = Math.max(...content.map(box => box.x + box.width));
    const bottom = Math.max(...content.map(box => box.y + box.height));
    frame.x = left - 24;
    frame.y = top - 26;
    frame.width = right - left + 48;
    frame.height = bottom - top + 54;
  }
}

function assetContentBoxes(
  model: NetworkModel,
  positions: Readonly<Record<string, Point>>,
  labels: ReadonlyMap<string, AssetLabel>,
  hiddenIds: ReadonlySet<string>,
): Box[] {
  return model.assets.flatMap(asset => {
    if (hiddenIds.has(asset.id)) return [];
    const position = positions[asset.id]; const label = labels.get(asset.id);
    if (!position) return [];
    const boxes: Box[] = [];
    if (hasDeviceCard(asset) && label) {
      const card = deviceCard(asset, position, label);
      boxes.push({ id: `symbol:${asset.id}`, x: position[0] + card.x, y: position[1] + card.y, width: card.width, height: card.height });
    } else boxes.push({ id: `symbol:${asset.id}`, x: position[0] - 46, y: position[1] - 46, width: 92, height: 92 });
    if (label) boxes.push({ id: `label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
    return boxes;
  });
}

function roomFootprints(frames: readonly Frame[], roomOwner: ReadonlyMap<string, string>, boxes: readonly Box[]) {
  const result = new Map<string, { minX: number; minY: number; maxX: number; maxY: number }>();
  const coreAssetIds = new Set(frames.flatMap(frame => frame.assetIds));
  for (const frame of frames) result.set(frame.id, {
    minX: frame.x, minY: frame.y, maxX: frame.x + frame.width, maxY: frame.y + frame.height,
  });
  for (const box of boxes) {
    const assetId = box.id.replace(/^(?:symbol|label):/, '');
    if (!coreAssetIds.has(assetId)) continue;
    const room = roomOwner.get(assetId); if (!room) continue;
    const footprint = result.get(room)!;
    footprint.minX = Math.min(footprint.minX, box.x);
    footprint.minY = Math.min(footprint.minY, box.y);
    footprint.maxX = Math.max(footprint.maxX, box.x + box.width);
    footprint.maxY = Math.max(footprint.maxY, box.y + box.height);
  }
  return result;
}

function contentBoxCollisions(boxes: readonly Box[]) {
  const collisions: string[] = [];
  for (let index = 0; index < boxes.length; index++) {
    const a = boxes[index]; const assetA = a.id.replace(/^(?:symbol|label):/, '');
    for (const b of boxes.slice(index + 1)) {
      const assetB = b.id.replace(/^(?:symbol|label):/, '');
      if (assetA === assetB) continue;
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
        collisions.push(`${a.id}↔${b.id}`);
      }
    }
  }
  return collisions;
}

function createBusAttachmentSlots(
  model: NetworkModel,
  positions: Readonly<Record<string, Point>>,
  spans: Readonly<Record<string, number>>,
  rotations: Readonly<Record<string, number>>,
) {
  const slots = new Map<string, Point>();
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const asset of model.assets.filter(item => item.kind === 'bus')) {
    const terminalIds = new Set(asset.terminals);
    const endpoints = model.connections.flatMap(connection => {
      const terminal = terminalIds.has(connection.from) ? connection.from : terminalIds.has(connection.to) ? connection.to : undefined;
      const otherTerminal = terminal === connection.from ? connection.to : terminal === connection.to ? connection.from : undefined;
      const otherAssetId = otherTerminal ? ownerByTerminal.get(otherTerminal) : undefined;
      return terminal && otherTerminal && otherAssetId
        ? [{ connection, terminal, target: positions[otherAssetId] ?? positions[asset.id] }]
        : [];
    });
    if (endpoints.length < 2) continue;
    const point = positions[asset.id]; if (!point) continue;
    const span = Math.max(spans[asset.id] ?? 700, endpoints.length * 56);
    const vertical = Math.abs((rotations[asset.id] ?? 0) % 180) === 90;
    // Map each physical feeder to a bus slot in the same order as its placed
    // equipment. Model connection declaration order is not a layout signal:
    // using it can route one feeder through an adjacent fuse or device card.
    endpoints.sort((a, b) => (vertical ? a.target[1] - b.target[1] : a.target[0] - b.target[0])
      || a.connection.id.localeCompare(b.connection.id));
    endpoints.forEach(({ connection, terminal }, index) => {
      const offset = -span / 2 + (span * (index + 1)) / (endpoints.length + 1);
      const slot: Point = vertical ? [point[0], point[1] + offset] : [point[0] + offset, point[1]];
      slots.set(`${connection.id}:${terminal}`, slot);
    });
  }
  return slots;
}

function stitchOrthogonal(from: Point, middle: readonly Point[], to: Point): Point[] {
  const points: Point[] = [];
  const append = (point: Point) => {
    const previous = points.at(-1);
    if (!previous) { points.push(point); return; }
    if (previous[0] !== point[0] && previous[1] !== point[1]) points.push([point[0], previous[1]]);
    if (previous[0] !== point[0] || previous[1] !== point[1]) points.push(point);
  };
  append(from); middle.forEach(append); append(to);
  return points;
}

function boundsOf(points: readonly Point[]) {
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
