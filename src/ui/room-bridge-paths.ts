import type { NetworkModel } from '../session/model';
import { roomPlacementPlan } from './room-placement-plan';
import { switchroomMemberships } from './switchroom-frames';

export const SW411_DIRECT_FEED_ROOMS = [
  'stockpile/stockpile-hv',
  'train-loading/hv',
  'cv006/rm406-hv',
  'cv006/rm410-hv',
  'crushing-2/sw435-hv',
  'crushing-1/hv',
  'desands/hv',
  'screening/hv',
  'services/rm721',
] as const;

export type RoomBridgePath = {
  parentRoomId: string;
  childRoomId: string;
  sourceCoreAssetId: string;
  childCoreAssetId: string;
  sourceTerminalId: string;
  childTerminalId: string;
  orderedAssetIds: string[];
  orderedConnectionIds: string[];
  sharedConnectionIds: string[];
  exclusiveConnectionIds: string[];
  sharedBridgeAssetIds: string[];
  exclusiveBridgeAssetIds: string[];
};

export type RoomRingEdge = {
  id: 'whole:join:crushing-tie';
  fromRoomId: 'crushing-1/hv';
  toRoomId: 'crushing-2/sw435-hv';
  fromAssetId: 'sw431:interface:sw435';
  toAssetId: 'sw435:interface:sw431';
  connectionIds: ['whole:join:crushing-tie'];
};

export type Sw411RoomBridgeExtraction = {
  bridges: RoomBridgePath[];
  bridgeConnectionIds: string[];
  sharedConnectionIds: string[];
  ring: RoomRingEdge;
  inventoryConnectionIds: string[];
  missingConnectionIds: string[];
  duplicateInventoryConnectionIds: string[];
};

type DirectedTree = {
  parentByAsset: Map<string, string>;
  parentConnectionByAsset: Map<string, string>;
  childrenByAsset: Map<string, string[]>;
};

/**
 * Extracts the eight SW411 direct-feeder paths from the selected presentation
 * tree. The electrical model is read only. Room cores are the physical device
 * assets from switchroom membership; intermediate assets stay in the bridge
 * path and are classified shared or exclusive by tree membership.
 *
 * An ambiguous room entry is a hard error. The extractor never selects a
 * feeder based on label similarity or geometric proximity.
 */
export function extractSw411RoomBridgePaths(
  model: NetworkModel,
  selectedTreeConnectionIds: ReadonlySet<string>,
): Sw411RoomBridgeExtraction {
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ringConnectionId = 'whole:join:crushing-tie';
  // A source-rooted BFS may select the closed SW431/SW435 cable as a tree edge
  // simply because of traversal order. This confirmed tie is deliberately
  // retained as a separate ring link; both switchrooms have their own SW411
  // feeder path in the selected tree.
  const directFeedTreeConnectionIds = new Set(selectedTreeConnectionIds);
  directFeedTreeConnectionIds.delete(ringConnectionId);
  const tree = orientSelectedTree(model, directFeedTreeConnectionIds, ownerByTerminal);
  const memberships = switchroomMemberships(model);
  const roomById = new Map(memberships.map(room => [room.id, new Set(room.assetIds)]));
  const parentRoomByChild = new Map<string, string>();
  for (const childRoomId of SW411_DIRECT_FEED_ROOMS) {
    const configured = roomPlacementPlan[childRoomId as keyof typeof roomPlacementPlan];
    const parent = configured?.parents.find(item => item.kind === 'room');
    if (!parent || parent.id !== 'sw411/overview') {
      throw new Error(`Expected an explicit SW411 parent for ${childRoomId}; found ${parent?.id ?? 'none'}`);
    }
    parentRoomByChild.set(childRoomId, parent.id);
  }

  const rawPaths = SW411_DIRECT_FEED_ROOMS.map(childRoomId => {
    const parentRoomId = parentRoomByChild.get(childRoomId)!;
    const parentCore = roomById.get(parentRoomId);
    const childCore = roomById.get(childRoomId);
    if (!parentCore) throw new Error(`Missing parent room core: ${parentRoomId}`);
    if (!childCore) throw new Error(`Missing child room core: ${childRoomId}`);
    const candidates: { sourceCoreAssetId: string; childCoreAssetId: string; orderedAssetIds: string[]; orderedConnectionIds: string[] }[] = [];

    // A child core's incoming asset is identified by its selected-tree parent
    // lying outside the child core. Follow that exact parent chain until it
    // reaches the explicitly configured parent room.
    for (const childCoreAssetId of childCore) {
      let cursor = childCoreAssetId;
      let parent = tree.parentByAsset.get(cursor);
      if (!parent || childCore.has(parent)) continue;
      const reversedAssets = [cursor];
      const reversedConnections: string[] = [];
      const seen = new Set(reversedAssets);
      while (parent && !parentCore.has(parent)) {
        if (seen.has(parent)) throw new Error(`Cycle while tracing ${parentRoomId} → ${childRoomId} at ${parent}`);
        reversedConnections.push(tree.parentConnectionByAsset.get(cursor)!);
        reversedAssets.push(parent);
        seen.add(parent);
        cursor = parent;
        parent = tree.parentByAsset.get(cursor);
      }
      if (!parent) continue;
      reversedConnections.push(tree.parentConnectionByAsset.get(cursor)!);
      reversedAssets.push(parent);
      candidates.push({
        sourceCoreAssetId: parent,
        childCoreAssetId,
        orderedAssetIds: reversedAssets.reverse(),
        orderedConnectionIds: reversedConnections.reverse(),
      });
    }
    if (!candidates.length) throw new Error(`No selected-tree path from ${parentRoomId} to ${childRoomId}`);
    const minLength = Math.min(...candidates.map(candidate => candidate.orderedConnectionIds.length));
    const shortest = candidates.filter(candidate => candidate.orderedConnectionIds.length === minLength);
    if (shortest.length !== 1) {
      throw new Error(`Ambiguous selected-tree entry for ${childRoomId}: ${shortest.map(candidate => candidate.childCoreAssetId).join(', ')}`);
    }
    const chosen = shortest[0];
    const firstConnection = connectionById.get(chosen.orderedConnectionIds[0]);
    const lastConnection = connectionById.get(chosen.orderedConnectionIds.at(-1)!);
    if (!firstConnection || !lastConnection) throw new Error(`Missing selected-tree connection for ${childRoomId}`);
    const sourceTerminalId = terminalOwnedBy(firstConnection, chosen.sourceCoreAssetId, ownerByTerminal);
    const childTerminalId = terminalOwnedBy(lastConnection, chosen.childCoreAssetId, ownerByTerminal);
    return { parentRoomId, childRoomId, ...chosen, sourceTerminalId, childTerminalId };
  });

  const edgeUseCount = new Map<string, number>();
  const assetUseCount = new Map<string, number>();
  for (const path of rawPaths) {
    path.orderedConnectionIds.forEach(id => edgeUseCount.set(id, (edgeUseCount.get(id) ?? 0) + 1));
    path.orderedAssetIds.slice(1, -1).forEach(id => assetUseCount.set(id, (assetUseCount.get(id) ?? 0) + 1));
  }
  const sharedConnectionIds = [...edgeUseCount].filter(([, count]) => count > 1).map(([id]) => id).sort();
  const sharedConnectionSet = new Set(sharedConnectionIds);
  const sharedAssetSet = new Set([...assetUseCount].filter(([, count]) => count > 1).map(([id]) => id));
  const bridges: RoomBridgePath[] = rawPaths.map(path => ({
    ...path,
    sharedConnectionIds: path.orderedConnectionIds.filter(id => sharedConnectionSet.has(id)),
    exclusiveConnectionIds: path.orderedConnectionIds.filter(id => !sharedConnectionSet.has(id)),
    sharedBridgeAssetIds: path.orderedAssetIds.slice(1, -1).filter(id => sharedAssetSet.has(id)),
    exclusiveBridgeAssetIds: path.orderedAssetIds.slice(1, -1).filter(id => !sharedAssetSet.has(id)),
  }));

  // A bridge inventory is unique by model connection ID. Shared trunk edges
  // appear in each path for explanation but are counted once for routing.
  const bridgeConnectionIds = [...new Set(bridges.flatMap(bridge => bridge.orderedConnectionIds))];
  const ringConnection = connectionById.get('whole:join:crushing-tie');
  if (!ringConnection) {
    throw new Error('Confirmed SW431–SW435 ring join is missing');
  }
  const ringEndpointAssets = [ownerByTerminal.get(ringConnection.from)!, ownerByTerminal.get(ringConnection.to)!];
  if (!ringEndpointAssets.includes('sw431:interface:sw435') || !ringEndpointAssets.includes('sw435:interface:sw431')) {
    throw new Error(`Ring endpoints do not match the confirmed facing interfaces: ${ringEndpointAssets.join(' → ')}`);
  }
  const ring: RoomRingEdge = {
    id: 'whole:join:crushing-tie',
    fromRoomId: 'crushing-1/hv',
    toRoomId: 'crushing-2/sw435-hv',
    fromAssetId: 'sw431:interface:sw435',
    toAssetId: 'sw435:interface:sw431',
    connectionIds: ['whole:join:crushing-tie'],
  };

  const inventoryConnectionIds = [...bridgeConnectionIds, ...ring.connectionIds];
  const expectedConnections = new Set([...bridgeConnectionIds, ring.id]);
  const missingConnectionIds = [...expectedConnections].filter(id => !connectionById.has(id));
  const duplicateInventoryConnectionIds = inventoryConnectionIds.filter((id, index) => inventoryConnectionIds.indexOf(id) !== index);
  return { bridges, bridgeConnectionIds, sharedConnectionIds, ring, inventoryConnectionIds, missingConnectionIds, duplicateInventoryConnectionIds };
}

function terminalOwnedBy(
  connection: NetworkModel['connections'][number],
  assetId: string,
  ownerByTerminal: ReadonlyMap<string, string>,
) {
  if (ownerByTerminal.get(connection.from) === assetId) return connection.from;
  if (ownerByTerminal.get(connection.to) === assetId) return connection.to;
  throw new Error(`Connection ${connection.id} has no terminal on ${assetId}`);
}

function orientSelectedTree(
  model: NetworkModel,
  selectedTreeConnectionIds: ReadonlySet<string>,
  ownerByTerminal: ReadonlyMap<string, string>,
): DirectedTree {
  const neighbors = new Map(model.assets.map(asset => [asset.id, [] as { assetId: string; connectionId: string }[]]));
  for (const connectionId of selectedTreeConnectionIds) {
    const connection = model.connections.find(candidate => candidate.id === connectionId);
    if (!connection) throw new Error(`Selected tree refers to missing connection ${connectionId}`);
    const from = ownerByTerminal.get(connection.from); const to = ownerByTerminal.get(connection.to);
    if (!from || !to || from === to) continue;
    neighbors.get(from)!.push({ assetId: to, connectionId });
    neighbors.get(to)!.push({ assetId: from, connectionId });
  }
  const parentByAsset = new Map<string, string>();
  const parentConnectionByAsset = new Map<string, string>();
  const childrenByAsset = new Map(model.assets.map(asset => [asset.id, [] as string[]]));
  const visited = new Set<string>();
  const roots = [...new Set(model.sources.map(source => source.assetId))];
  const walk = (starts: readonly string[]) => {
    const queue = [...starts];
    starts.forEach(id => visited.add(id));
    for (let index = 0; index < queue.length; index++) {
      const current = queue[index];
      for (const edge of neighbors.get(current) ?? []) {
        if (visited.has(edge.assetId)) continue;
        visited.add(edge.assetId);
        parentByAsset.set(edge.assetId, current);
        parentConnectionByAsset.set(edge.assetId, edge.connectionId);
        childrenByAsset.get(current)!.push(edge.assetId);
        queue.push(edge.assetId);
      }
    }
  };
  walk(roots);
  for (const asset of model.assets) if (!visited.has(asset.id) && (neighbors.get(asset.id)?.length ?? 0)) walk([asset.id]);
  return { parentByAsset, parentConnectionByAsset, childrenByAsset };
}
