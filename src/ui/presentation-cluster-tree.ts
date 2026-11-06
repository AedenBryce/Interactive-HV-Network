import { compactSupplyTreeLayout, type TreeFootprint } from './compact-supply-tree-layout';

export type PresentationTreeEdge = { parentId: string; childId: string };
/** Bounding box relative to the asset's supplied position. */
export type AssetBounds = { x: number; y: number; width: number; height: number };
export type AssetPosition = readonly [x: number, y: number];

export type PresentationCluster = {
  id: string;
  kind: 'room' | 'corridor';
  roomId?: string;
  assetIds: string[];
  parentIds: string[];
  bounds: AssetBounds;
};

export type ClusterTreeIssue = {
  code:
    | 'duplicate-asset'
    | 'missing-position'
    | 'missing-bounds'
    | 'invalid-bounds'
    | 'unknown-edge-asset'
    | 'unknown-root'
    | 'duplicate-parent'
    | 'cycle'
    | 'disconnected'
    | 'contracted-cycle'
    | 'multiple-cluster-parents';
  message: string;
  assetIds?: string[];
  clusterIds?: string[];
};

export type PresentationClusterTreeInput = {
  roots: readonly string[];
  edges: readonly PresentationTreeEdge[];
  assetIds: readonly string[];
  roomOwnerByAssetId: ReadonlyMap<string, string>;
  positions: ReadonlyMap<string, AssetPosition>;
  boundsByAssetId: ReadonlyMap<string, AssetBounds>;
  maxWidth?: number;
  horizontalGap?: number;
  verticalGap?: number;
  rootGap?: number;
  /** Keep each unowned inline asset as its own tree node instead of packing an entire corridor component rigidly. */
  groupCorridorComponents?: boolean;
};

export type PresentationClusterTreeResult = {
  /** Translation from each input asset position to its packed presentation position. */
  translations: ReadonlyMap<string, AssetPosition>;
  clusters: readonly PresentationCluster[];
  crossClusterEdges: readonly { edge: PresentationTreeEdge; fromClusterId: string; toClusterId: string }[];
  roots: readonly string[];
  maxBounds: AssetBounds;
  issues: readonly ClusterTreeIssue[];
  valid: boolean;
};

/**
 * Contract a selected asset forest into room clusters and maximal corridor
 * components, then pack those clusters top-down. Geometry is presentation-only.
 * If the requested contraction is not a forest, preserve zero translations and
 * return explicit diagnostics instead of silently inventing a tree.
 */
export function layoutPresentationClusterTree(input: PresentationClusterTreeInput): PresentationClusterTreeResult {
  const issues: ClusterTreeIssue[] = [];
  const assetSet = new Set<string>();
  for (const id of input.assetIds) {
    if (assetSet.has(id)) issues.push({ code: 'duplicate-asset', message: `Duplicate asset ID: ${id}`, assetIds: [id] });
    assetSet.add(id);
  }

  for (const id of assetSet) {
    const position = input.positions.get(id);
    const bounds = input.boundsByAssetId.get(id);
    if (!position || position.length !== 2 || !position.every(Number.isFinite)) {
      issues.push({ code: 'missing-position', message: `Missing or invalid position for ${id}`, assetIds: [id] });
    }
    if (!bounds) issues.push({ code: 'missing-bounds', message: `Missing bounds for ${id}`, assetIds: [id] });
    else if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) {
      issues.push({ code: 'invalid-bounds', message: `Invalid bounds for ${id}`, assetIds: [id] });
    }
  }

  const validEdges: PresentationTreeEdge[] = [];
  const parentOfAsset = new Map<string, string>();
  const children = new Map([...assetSet].map(id => [id, [] as string[]]));
  for (const edge of input.edges) {
    if (!assetSet.has(edge.parentId) || !assetSet.has(edge.childId)) {
      issues.push({ code: 'unknown-edge-asset', message: `Edge references an unknown asset: ${edge.parentId} → ${edge.childId}`, assetIds: [edge.parentId, edge.childId] });
      continue;
    }
    const previous = parentOfAsset.get(edge.childId);
    if (previous && previous !== edge.parentId) {
      issues.push({ code: 'duplicate-parent', message: `${edge.childId} has multiple asset parents`, assetIds: [edge.childId, previous, edge.parentId] });
      continue;
    }
    if (previous === edge.parentId) continue;
    parentOfAsset.set(edge.childId, edge.parentId);
    children.get(edge.parentId)!.push(edge.childId);
    validEdges.push(edge);
  }

  const rootSet = new Set(input.roots);
  for (const id of rootSet) if (!assetSet.has(id)) issues.push({ code: 'unknown-root', message: `Unknown tree root: ${id}`, assetIds: [id] });
  for (const id of rootSet) if (parentOfAsset.has(id)) issues.push({ code: 'cycle', message: `Root ${id} also has parent ${parentOfAsset.get(id)}`, assetIds: [id, parentOfAsset.get(id)!] });
  const reachedAssets = new Set<string>();
  const visitingAssets = new Set<string>();
  function inspectAsset(id: string) {
    if (visitingAssets.has(id)) {
      issues.push({ code: 'cycle', message: `Cycle in selected asset tree at ${id}`, assetIds: [...visitingAssets, id] });
      return;
    }
    if (reachedAssets.has(id)) return;
    visitingAssets.add(id);
    for (const child of children.get(id) ?? []) inspectAsset(child);
    visitingAssets.delete(id);
    reachedAssets.add(id);
  }
  for (const id of rootSet) if (assetSet.has(id)) inspectAsset(id);
  const unreachableAssets = [...assetSet].filter(id => !reachedAssets.has(id));
  if (unreachableAssets.length) issues.push({ code: 'disconnected', message: `Assets are not reachable from selected roots: ${unreachableAssets.join(', ')}`, assetIds: unreachableAssets });

  // Room ownership is authoritative for grouping. Corridor assets can either
  // remain individual tree nodes or be contracted into connected runs.
  const clusterIdByAsset = new Map<string, string>();
  const roomMembers = new Map<string, string[]>();
  for (const id of assetSet) {
    const roomId = input.roomOwnerByAssetId.get(id);
    if (roomId) roomMembers.set(roomId, [...(roomMembers.get(roomId) ?? []), id]);
  }
  for (const [roomId, ids] of roomMembers) for (const id of ids) clusterIdByAsset.set(id, `room:${roomId}`);

  const unowned = [...assetSet].filter(id => !clusterIdByAsset.has(id));
  if (input.groupCorridorComponents === false) {
    for (const id of unowned) clusterIdByAsset.set(id, `asset:${id}`);
  } else {
    const corridorAdjacency = new Map(unowned.map(id => [id, [] as string[]]));
    for (const edge of validEdges) {
      if (corridorAdjacency.has(edge.parentId) && corridorAdjacency.has(edge.childId)) {
        corridorAdjacency.get(edge.parentId)!.push(edge.childId);
        corridorAdjacency.get(edge.childId)!.push(edge.parentId);
      }
    }
    const corridorComponents: string[][] = [];
    const corridorVisited = new Set<string>();
    for (const start of corridorAdjacency.keys()) {
      if (corridorVisited.has(start)) continue;
      const component: string[] = [];
      const queue = [start]; corridorVisited.add(start);
      for (let cursor = 0; cursor < queue.length; cursor++) {
        const id = queue[cursor]; component.push(id);
        for (const peer of corridorAdjacency.get(id)!) if (!corridorVisited.has(peer)) { corridorVisited.add(peer); queue.push(peer); }
      }
      corridorComponents.push(component);
    }
    corridorComponents.forEach((ids, index) => {
      const id = `corridor:${String(index + 1).padStart(3, '0')}:${[...ids].sort()[0]}`;
      for (const assetId of ids) clusterIdByAsset.set(assetId, id);
    });
  }

  const membersByCluster = new Map<string, string[]>();
  for (const id of assetSet) {
    const clusterId = clusterIdByAsset.get(id)!;
    membersByCluster.set(clusterId, [...(membersByCluster.get(clusterId) ?? []), id]);
  }
  const clusterBounds = new Map<string, AssetBounds>();
  for (const [clusterId, ids] of membersByCluster) {
    const boxes = ids.flatMap(id => {
      const box = input.boundsByAssetId.get(id);
      const point = input.positions.get(id);
      return box && point ? [{ x: point[0] + box.x, y: point[1] + box.y, width: box.width, height: box.height }] : [];
    });
    if (!boxes.length) continue;
    const left = Math.min(...boxes.map(box => box.x));
    const top = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.x + box.width));
    const bottom = Math.max(...boxes.map(box => box.y + box.height));
    clusterBounds.set(clusterId, { x: left, y: top, width: right - left, height: bottom - top });
  }

  const clusterChildren = new Map([...membersByCluster.keys()].map(id => [id, [] as string[]]));
  const clusterParents = new Map([...membersByCluster.keys()].map(id => [id, new Set<string>()]));
  const edgePairs = new Set<string>();
  const crossClusterEdges = validEdges.flatMap(edge => {
    const fromClusterId = clusterIdByAsset.get(edge.parentId)!;
    const toClusterId = clusterIdByAsset.get(edge.childId)!;
    if (fromClusterId === toClusterId) return [];
    const pairKey = `${fromClusterId}\u0000${toClusterId}`;
    if (!edgePairs.has(pairKey)) {
      edgePairs.add(pairKey);
      clusterChildren.get(fromClusterId)!.push(toClusterId);
      clusterParents.get(toClusterId)!.add(fromClusterId);
    }
    return [{ edge, fromClusterId, toClusterId }];
  });

  for (const [clusterId, parents] of clusterParents) {
    if (parents.size > 1) issues.push({ code: 'multiple-cluster-parents', message: `${clusterId} has multiple parents after room contraction`, clusterIds: [clusterId, ...parents] });
  }
  const clusterRootIds = [...clusterChildren.keys()].filter(id => clusterParents.get(id)!.size === 0);
  const sourceClusterRoots = [...rootSet].map(id => clusterIdByAsset.get(id)).filter((id): id is string => !!id);
  const roots = [...new Set(sourceClusterRoots.length ? sourceClusterRoots : clusterRootIds)];
  const rootSetClusters = new Set(roots);
  for (const root of roots) if (clusterParents.get(root)?.size) issues.push({ code: 'contracted-cycle', message: `Selected root cluster ${root} has an incoming cluster edge`, clusterIds: [root, ...clusterParents.get(root)!] });

  const reachedClusters = new Set<string>();
  const visiting = new Set<string>();
  function inspect(id: string) {
    if (visiting.has(id)) {
      issues.push({ code: 'contracted-cycle', message: `Cycle in contracted cluster tree at ${id}`, clusterIds: [...visiting, id] });
      return;
    }
    if (reachedClusters.has(id)) return;
    visiting.add(id);
    for (const child of clusterChildren.get(id) ?? []) inspect(child);
    visiting.delete(id);
    reachedClusters.add(id);
  }
  for (const root of roots) inspect(root);
  const disconnected = [...clusterChildren.keys()].filter(id => !reachedClusters.has(id));
  if (disconnected.length) issues.push({ code: 'disconnected', message: `Clusters are not reachable from selected roots: ${disconnected.join(', ')}`, clusterIds: disconnected });

  const clusterRecords: PresentationCluster[] = [...membersByCluster].map(([id, assetIds]) => {
    const roomId = [...roomMembers.keys()].find(candidate => `room:${candidate}` === id);
    return {
      id,
      kind: roomId ? 'room' : 'corridor',
      ...(roomId ? { roomId } : {}),
      assetIds: [...assetIds].sort(),
      parentIds: [...(clusterParents.get(id) ?? [])].sort(),
      bounds: clusterBounds.get(id) ?? { x: 0, y: 0, width: 0, height: 0 },
    };
  });

  const zeroTranslations = new Map([...assetSet].map(id => [id, [0, 0] as const]));
  let translations: ReadonlyMap<string, AssetPosition> = zeroTranslations;
  let maxBounds = boundsOf(clusterRecords.map(cluster => cluster.bounds));
  const geometryReady = !issues.some(issue => ['missing-position', 'missing-bounds', 'invalid-bounds'].includes(issue.code));
  const treeReady = !issues.some(issue => ['duplicate-asset', 'unknown-edge-asset', 'unknown-root', 'duplicate-parent', 'cycle', 'multiple-cluster-parents', 'contracted-cycle', 'disconnected'].includes(issue.code));

  if (geometryReady && treeReady && clusterRecords.length) {
    const footprints = new Map<string, TreeFootprint>();
    const anchors = new Map<string, AssetPosition>();
    for (const cluster of clusterRecords) {
      const centerX = cluster.bounds.x + cluster.bounds.width / 2;
      const centerY = cluster.bounds.y + cluster.bounds.height / 2;
      anchors.set(cluster.id, [centerX, centerY]);
      footprints.set(cluster.id, { left: -cluster.bounds.width / 2, right: cluster.bounds.width / 2 });
    }
    try {
      const maxClusterHeight = Math.max(...clusterRecords.map(cluster => cluster.bounds.height));
      // compactSupplyTreeLayout spaces cluster anchors by one fixed row step.
      // Raise that step to the measured maximum box height plus clearance so
      // deep/multi-asset room clusters cannot overlap adjacent cluster rows.
      const verticalGap = Math.max(input.verticalGap ?? 0, maxClusterHeight + 360);
      // compactSupplyTreeLayout normally packs separate roots side-by-side.
      // A geometry-only virtual parent lets its bounded-width wrapping apply
      // across disconnected source trees too; it is never returned as an
      // asset, cluster, or electrical connection.
      const virtualRoot = '\u0000presentation-forest-root';
      const layoutRoots = roots.length > 1 ? [virtualRoot] : roots;
      const layoutChildren = new Map(clusterChildren);
      if (roots.length > 1) {
        if (footprints.has(virtualRoot)) throw new Error(`Reserved virtual root ID is already in use: ${virtualRoot}`);
        layoutChildren.set(virtualRoot, [...roots]);
        footprints.set(virtualRoot, { left: -0.5, right: 0.5 });
      }
      const placed = compactSupplyTreeLayout(layoutRoots, layoutChildren, footprints, {
        maxWidth: input.maxWidth,
        horizontalGap: input.horizontalGap,
        verticalGap,
        rootGap: input.rootGap,
      });
      const moves = new Map<string, AssetPosition>();
      for (const cluster of clusterRecords) {
        const from = anchors.get(cluster.id)!;
        const to = placed.positions[cluster.id];
        moves.set(cluster.id, [to[0] - from[0], to[1] - from[1]]);
      }
      translations = new Map([...assetSet].map(id => [id, moves.get(clusterIdByAsset.get(id)!) ?? [0, 0]]));
      const movedBoxes = clusterRecords.map(cluster => {
        const [dx, dy] = moves.get(cluster.id)!;
        return { ...cluster.bounds, x: cluster.bounds.x + dx, y: cluster.bounds.y + dy };
      });
      maxBounds = boundsOf(movedBoxes);
    } catch (error) {
      issues.push({ code: 'disconnected', message: `Cluster layout rejected the contracted forest: ${error instanceof Error ? error.message : String(error)}`, clusterIds: clusterRecords.map(cluster => cluster.id) });
    }
  }

  return { translations, clusters: clusterRecords, crossClusterEdges, roots: [...rootSetClusters], maxBounds, issues, valid: issues.length === 0 };
}

function boundsOf(boxes: readonly AssetBounds[]): AssetBounds {
  if (!boxes.length) return { x: 0, y: 0, width: 0, height: 0 };
  const x = Math.min(...boxes.map(box => box.x));
  const y = Math.min(...boxes.map(box => box.y));
  const right = Math.max(...boxes.map(box => box.x + box.width));
  const bottom = Math.max(...boxes.map(box => box.y + box.height));
  return { x, y, width: right - x, height: bottom - y };
}
