import type { NetworkModel } from '../session/model';
import { compactSupplyTreeLayout, type TreeFootprint } from './compact-supply-tree-layout';
import { compactEquipmentLabel } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import { labelLines, type Box, type Point } from './diagram-geometry';
import { type RouteRequest } from './orthogonal-route-planner';
import { planStagedRoutes } from './staged-route-planner';
import { applyTopologyRoomTreeCandidate, planTopologyRoomTree } from './topology-room-tree-candidate';
import { switchroomFrames } from './switchroom-frames';
import { roomClusterOwnership } from './room-cluster-ownership';
import { applyWholeNetworkRoomPlacement, planWholeNetworkRooms } from './whole-network-room-layout';

export type FullNetworkPrototype = {
  positions: Record<string, Point>;
  labels: Map<string, Box & { lines: string[] }>;
  symbolBoxes: (Box & { id: string })[];
  roomFrames: (Box & { id: string; title: string; memberAssetIds: string[] })[];
  routes: Map<string, readonly Point[]>;
  unresolved: string[];
  treeConnectionIds: Set<string>;
  routeRequests: RouteRequest[];
  routingStages: ReturnType<typeof planStagedRoutes>['stages'];
  routeObstacles: { id: string; x: number; y: number; width: number; height: number }[];
  bounds: Box;
  assetsWithoutRoom: string[];
  connectionsWithoutRoute: string[];
};

/**
 * Isolated topology-first layout experiment. It does not mutate or enrich the
 * electrical model. All omitted/uncertain claims remain in the input model.
 */
export function layoutTopDownFullNetwork(model: NetworkModel, options: { placement?: 'current' | 'topology-staggered' } = {}): FullNetworkPrototype {
  const assets = model.assets;
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const ownerByTerminal = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const peers = new Map(assets.map(asset => [asset.id, [] as { peer: string; connectionId: string; localTerminal: string }[]]));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  for (const connection of model.connections) {
    const fromOwner = ownerByTerminal.get(connection.from);
    const toOwner = ownerByTerminal.get(connection.to);
    if (!fromOwner || !toOwner || fromOwner === toOwner) continue;
    peers.get(fromOwner)!.push({ peer: toOwner, connectionId: connection.id, localTerminal: connection.from });
    peers.get(toOwner)!.push({ peer: fromOwner, connectionId: connection.id, localTerminal: connection.to });
  }

  const earthOwner = new Map(assets.filter(asset => asset.kind === 'earth-switch' && peers.get(asset.id)!.length === 1)
    .map(asset => [asset.id, peers.get(asset.id)![0].peer] as const));
  const children = new Map(assets.map(asset => [asset.id, [] as string[]]));
  const parentByAsset = new Map<string, string>();
  const parentConnectionByAsset = new Map<string, string>();
  const treeConnectionIds = new Set<string>();
  const roots = [...new Set(model.sources.map(source => source.assetId).filter(id => byId.has(id)))];
  const visited = new Set<string>();
  const traverse = (componentRoots: readonly string[]) => {
    const queue = [...componentRoots];
    for (const root of componentRoots) visited.add(root);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      for (const peer of peers.get(id)!) {
        if (visited.has(peer.peer) || earthOwner.has(peer.peer)) continue;
        visited.add(peer.peer);
        parentByAsset.set(peer.peer, id);
        parentConnectionByAsset.set(peer.peer, peer.connectionId);
        children.get(id)!.push(peer.peer);
        treeConnectionIds.add(peer.connectionId);
        queue.push(peer.peer);
      }
    }
  };
  traverse(roots);
  for (const asset of assets) {
    if (!visited.has(asset.id) && !earthOwner.has(asset.id)) {
      roots.push(asset.id);
      traverse([asset.id]);
    }
  }
  // Draw single-ended earth switches as side branches, not as another level
  // of the source tree. Their model connections remain represented below.
  for (const [earthId, ownerId] of earthOwner) {
    children.get(ownerId)!.push(earthId);
    parentByAsset.set(earthId, ownerId);
    parentConnectionByAsset.set(earthId, peers.get(earthId)![0].connectionId);
    treeConnectionIds.add(peers.get(earthId)![0].connectionId);
    visited.add(earthId);
  }
  for (const asset of assets) children.get(asset.id)!.sort((a, b) => {
    const terminalFor = (child: string) => peers.get(asset.id)!.find(peer => peer.peer === child)!.localTerminal;
    return asset.terminals.indexOf(terminalFor(a)) - asset.terminals.indexOf(terminalFor(b)) || a.localeCompare(b);
  });

  const assetLabels = new Map<string, string[]>();
  const footprints = new Map<string, TreeFootprint>();
  for (const asset of assets) {
    const lines = labelLines(compactEquipmentLabel(asset, currentAssetLabel(model, asset)));
    assetLabels.set(asset.id, lines);
    const width = Math.max(110, ...lines.map(line => line.length * 12 + 18));
    footprints.set(asset.id, { left: -58, right: 58 + 28 + width });
  }
  const placed = compactSupplyTreeLayout(roots, children, footprints, {
    horizontalGap: 180,
    verticalGap: 520,
    maxWidth: 5_200,
    rootGap: 900,
  });
  const positions = Object.fromEntries(Object.entries(placed.positions).map(([id, point]) => [id, [point[0], point[1] + 180] as Point]));

  // Earth contacts are shown beside their controlling asset. Nudge subsequent
  // earths onto separate side lanes when an assembly has more than one.
  for (const [earthId, ownerId] of earthOwner) {
    const siblings = [...earthOwner].filter(([, owner]) => owner === ownerId).map(([id]) => id);
    const index = siblings.indexOf(earthId);
    positions[earthId] = [positions[ownerId][0] + 250 + index * 130, positions[ownerId][1] + 80 + index * 120];
  }

  const labels = new Map<string, Box & { lines: string[] }>();
  for (const asset of assets) {
    const [x, y] = positions[asset.id];
    const lines = assetLabels.get(asset.id)!;
    const width = Math.max(110, ...lines.map(line => line.length * 12 + 18));
    const height = Math.max(34, lines.length * 23);
    labels.set(asset.id, { x: x + 68, y: y - height / 2, width, height, lines });
  }
  const treeEdges = [...parentByAsset].flatMap(([childAssetId, parentAssetId]) => {
    const id = parentConnectionByAsset.get(childAssetId);
    return id ? [{ id, parentAssetId, childAssetId }] : [];
  });
  const earthBranches = [...earthOwner].map(([earthSwitchAssetId, ownerAssetId]) => ({
    id: `earth-branch:${earthSwitchAssetId}`,
    ownerAssetId,
    earthSwitchAssetId,
    direction: 'owner-to-earth-switch' as const,
  }));
  const ownership = roomClusterOwnership(model, treeEdges, earthBranches);
  const roomLayout = {
    assets: positions,
    // The route prototype derives endpoints from asset positions. This compact
    // terminal map lets the existing room placer translate geometry in the
    // same way as production without changing the model or route endpoints.
    terminals: Object.fromEntries(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, [...positions[asset.id]] as Point]))),
  };
  const initialRoomFrames = switchroomFrames(model, roomLayout, labels);
  const roomPlacement = planWholeNetworkRooms(initialRoomFrames, treeEdges, ownership.ownerByAssetId);
  applyWholeNetworkRoomPlacement(
    initialRoomFrames,
    roomPlacement,
    roomLayout,
    labels,
    ownership.ownerByAssetId,
    new Map(assets.map(asset => [asset.id, asset.terminals])),
    new Map(),
    new Map(),
  );
  if (options.placement === 'topology-staggered') {
    const topologyPlacement = planTopologyRoomTree(initialRoomFrames, treeEdges);
    applyTopologyRoomTreeCandidate(initialRoomFrames, topologyPlacement, positions, roomLayout.terminals, new Map(assets.map(asset => [asset.id, asset.terminals])), ownership.ownerByAssetId, labels);
  }
  const roomFrames = initialRoomFrames;
  const symbolBoxes: (Box & { id: string })[] = assets.map(asset => {
    const [x, y] = positions[asset.id];
    return { id: `symbol:${asset.id}`, x: x - 38, y: y - 38, width: 76, height: 76 };
  });

  // Recompose the already top-down asset forest as switchroom/feeder units.
  // This keeps each room's internal wiring intact while moving the complete
  // room-owned branch into a non-overlapping tree position. Cross-room wiring
  // is routed only after these group positions are final.
  const outputChildren = new Map<string, string[]>();
  for (const [parent, ids] of children) outputChildren.set(parent, ids.filter(id => !earthOwner.has(id)));
  const outputIndex = new Map<string, number>();
  for (const ids of outputChildren.values()) ids.forEach((id, index) => outputIndex.set(id, index));
  const terminalPointFor = (terminalId: string, connectionId: string, otherOwner: string): Point => {
    const ownerId = ownerByTerminal.get(terminalId)!;
    const owner = byId.get(ownerId)!;
    const [x, y] = positions[ownerId];
    const childId = connectionById.get(connectionId) && (parentByAsset.get(ownerId) === otherOwner ? ownerId : parentByAsset.get(otherOwner) === ownerId ? otherOwner : undefined);
    if (childId && parentByAsset.get(childId) === ownerId) {
      const siblings = outputChildren.get(ownerId) ?? [];
      const index = Math.max(0, siblings.indexOf(childId));
      if (owner.kind === 'bus') return [positions[childId][0], y];
      if (owner.terminals.length === 1 && peers.get(ownerId)!.length > 1) return [x, y];
      const offset = (index - (siblings.length - 1) / 2) * Math.min(48, 90 / Math.max(1, siblings.length));
      return [x + offset, y + 62];
    }
    if (parentByAsset.get(ownerId) === otherOwner && parentConnectionByAsset.get(ownerId) === connectionId) {
      if (earthOwner.has(ownerId)) return [x - 62, y];
      if (owner.kind === 'bus') return [x, y];
      if (owner.terminals.length === 1 && peers.get(ownerId)!.length > 1) return [x, y];
      return [x, y - 62];
    }
    if (owner.kind === 'bus') return [positions[otherOwner][0], y];
    if (earthOwner.has(ownerId)) return [x - 62, y];
    return [positions[otherOwner][0] < x ? x - 62 : x + 62, y];
  };

  const symbolObstacles = symbolBoxes.map(box => ({ ...box }));
  const labelObstacles = [...labels].map(([id, box]) => ({ id: `label:${id}`, ...box }));
  const obstacles = [...symbolObstacles, ...labelObstacles];
  const treeRequests: RouteRequest[] = [];
  const alternateRequests: RouteRequest[] = [];
  for (const connection of model.connections) {
    const fromOwner = ownerByTerminal.get(connection.from);
    const toOwner = ownerByTerminal.get(connection.to);
    if (!fromOwner || !toOwner) continue;
    const from = terminalPointFor(connection.from, connection.id, toOwner);
    const to = terminalPointFor(connection.to, connection.id, fromOwner);
    const ownerIds = [fromOwner, toOwner];
    const request: RouteRequest = {
      id: connection.id,
      from,
      to,
      fromTerminalId: connection.from,
      toTerminalId: connection.to,
      preferDown: treeConnectionIds.has(connection.id),
      order: treeConnectionIds.has(connection.id) ? 0 : 1,
      ignoredObstacleIds: ownerIds.flatMap(id => [`symbol:${id}`, `label:${id}`]),
    };
    (treeConnectionIds.has(connection.id) ? treeRequests : alternateRequests).push(request);
  }
  const routePlan = planStagedRoutes([...treeRequests, ...alternateRequests], ownership.ownerByAssetId, ownerByTerminal, roomFrames, {
    obstacles,
    clearance: 30,
    localSearchPadding: 500,
    maxLocalSearchPadding: 4_000,
    maxSearchAttempts: 4,
    maxGridNodes: 60_000,
    bendPenalty: 160,
  });

  const members = new Set(roomFrames.flatMap(frame => frame.memberAssetIds));
  const allPoints = [
    ...Object.values(positions),
    ...[...labels.values()].flatMap(box => [[box.x, box.y] as Point, [box.x + box.width, box.y + box.height] as Point]),
    ...[...routePlan.routes.values()].flat(),
  ];
  const minX = Math.min(...allPoints.map(point => point[0]));
  const minY = Math.min(...allPoints.map(point => point[1]));
  const maxX = Math.max(...allPoints.map(point => point[0]));
  const maxY = Math.max(...allPoints.map(point => point[1]));
  return {
    positions,
    labels,
    symbolBoxes,
    roomFrames,
    routes: new Map(routePlan.routes as Map<string, readonly Point[]>),
    unresolved: routePlan.unresolved.map(item => `${item.routeId}:${item.reason}`),
    treeConnectionIds,
    routeRequests: [...treeRequests, ...alternateRequests],
    routingStages: routePlan.stages,
    routeObstacles: obstacles,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    assetsWithoutRoom: assets.map(asset => asset.id).filter(id => !members.has(id)),
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routePlan.routes.has(id)),
  };
}

