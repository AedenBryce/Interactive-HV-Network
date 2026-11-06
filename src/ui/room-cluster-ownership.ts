import type { NetworkModel } from '../session/model';
import { switchroomMemberships } from './switchroom-frames';

/** One explicitly directed edge from the selected supply spanning tree. */
export type RoomClusterTreeEdge = {
  id: string;
  parentAssetId: string;
  childAssetId: string;
};

/**
 * A separately supplied earth branch. The named owner is the connected main
 * asset and the named earth switch is the child; direction is never inferred
 * from endpoint order or asset names.
 */
export type RoomClusterEarthBranch = {
  id: string;
  ownerAssetId: string;
  earthSwitchAssetId: string;
  direction: 'owner-to-earth-switch';
};

export type RoomClusterOwnership = {
  /** Includes framed assets and unframed assets uniquely nearest to one frame. */
  ownerByAssetId: ReadonlyMap<string, string>;
  /** Unframed assets with equal minimum distance to two or more room clusters. */
  ambiguousAssetIds: ReadonlySet<string>;
  /** Assets without a unique room owner, including ambiguous and disconnected assets. */
  unassignedAssetIds: ReadonlySet<string>;
};

/**
 * Assign unframed assets to the nearest room using only the selected directed
 * spanning tree and explicitly directed earth branches. Ownership distance is
 * undirected on these selected edges because this is diagram-cluster ownership,
 * not electrical direction. No non-tree or ring edge is traversed.
 *
 * Traversal stops at another room's framed assets. If an unframed segment is
 * reached at equal minimum distance from multiple rooms, it is left unassigned
 * rather than allocated by traversal order. Assets reachable only through
 * cross-links are left unassigned because those links are not accepted as
 * spanning-tree edges.
 */
export function roomClusterOwnership(
  model: NetworkModel,
  treeEdges: readonly RoomClusterTreeEdge[],
  earthBranches: readonly RoomClusterEarthBranch[] = [],
): RoomClusterOwnership {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const memberships = switchroomMemberships(model);
  const frameByAssetId = new Map<string, string>();
  const framedAssetIds = new Set(memberships.flatMap(frame => frame.assetIds));
  const ambiguousAssetIds = new Set<string>();

  for (const frame of memberships) for (const assetId of frame.assetIds) {
    const existing = frameByAssetId.get(assetId);
    if (existing && existing !== frame.id) {
      frameByAssetId.delete(assetId);
      ambiguousAssetIds.add(assetId);
    } else if (!ambiguousAssetIds.has(assetId)) frameByAssetId.set(assetId, frame.id);
  }

  const neighbors = new Map(model.assets.map(asset => [asset.id, [] as string[]]));
  const edgeIds = new Set<string>();
  const addEdge = (id: string, parentAssetId: string, childAssetId: string) => {
    if (edgeIds.has(id)) throw new Error(`Duplicate room-cluster edge ID: ${id}`);
    if (!assetById.has(parentAssetId) || !assetById.has(childAssetId)) {
      throw new Error(`Room-cluster edge ${id} refers to an unknown asset`);
    }
    edgeIds.add(id);
    neighbors.get(parentAssetId)!.push(childAssetId);
    neighbors.get(childAssetId)!.push(parentAssetId);
  };

  for (const edge of treeEdges) addEdge(edge.id, edge.parentAssetId, edge.childAssetId);
  for (const branch of earthBranches) {
    if (branch.direction !== 'owner-to-earth-switch') throw new Error(`Earth branch ${branch.id} has no explicit direction`);
    if (assetById.get(branch.earthSwitchAssetId)?.kind !== 'earth-switch') {
      throw new Error(`Earth branch ${branch.id} does not identify an earth-switch child`);
    }
    addEdge(branch.id, branch.ownerAssetId, branch.earthSwitchAssetId);
  }

  const candidateDistances = new Map<string, Map<string, number>>();
  for (const frame of memberships) {
    const distanceByAsset = new Map<string, number>();
    const queue: { assetId: string; distance: number }[] = [];
    for (const assetId of frame.assetIds) {
      if (frameByAssetId.get(assetId) !== frame.id) continue;
      distanceByAsset.set(assetId, 0);
      queue.push({ assetId, distance: 0 });
    }
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      for (const neighborId of neighbors.get(current.assetId) ?? []) {
        const framedOwner = frameByAssetId.get(neighborId);
        if (framedAssetIds.has(neighborId) && framedOwner !== frame.id) continue;
        const nextDistance = current.distance + 1;
        const knownDistance = distanceByAsset.get(neighborId);
        if (knownDistance === undefined || nextDistance < knownDistance) {
          distanceByAsset.set(neighborId, nextDistance);
          queue.push({ assetId: neighborId, distance: nextDistance });
        }
        if (!framedAssetIds.has(neighborId)) {
          const distances = candidateDistances.get(neighborId) ?? new Map<string, number>();
          const candidateDistance = distances.get(frame.id);
          if (candidateDistance === undefined || nextDistance < candidateDistance) distances.set(frame.id, nextDistance);
          candidateDistances.set(neighborId, distances);
        }
      }
    }
  }

  const ownerByAssetId = new Map<string, string>();
  for (const [assetId, frameId] of frameByAssetId) ownerByAssetId.set(assetId, frameId);
  for (const [assetId, distances] of candidateDistances) {
    const nearestDistance = Math.min(...distances.values());
    const nearestOwners = [...distances].filter(([, distance]) => distance === nearestDistance).map(([frameId]) => frameId);
    if (nearestOwners.length === 1 && !ambiguousAssetIds.has(assetId)) ownerByAssetId.set(assetId, nearestOwners[0]);
    else if (nearestOwners.length > 1) ambiguousAssetIds.add(assetId);
  }

  const unassignedAssetIds = new Set(model.assets
    .map(asset => asset.id)
    .filter(assetId => !ownerByAssetId.has(assetId)));
  return { ownerByAssetId, ambiguousAssetIds, unassignedAssetIds };
}
