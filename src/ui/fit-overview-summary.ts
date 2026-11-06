import type { NetworkModel } from '../session/model';
import { switchroomMemberships } from './switchroom-frames';
import { compactSupplyTreeLayout } from './compact-supply-tree-layout';

/**
 * Data-only fit-view abstraction. A summary node is a visual container, not a
 * bus or switching device. Every real asset and connection keeps an explicit
 * owner/category mapping so a renderer can replace the abstraction with the
 * original detailed SLD as the user zooms in.
 */
export type OverviewSummaryNode = {
  id: string;
  label: string;
  kind: 'room' | 'supply-spine' | 'unframed-area';
  assetIds: string[];
  /** Top-down tree coordinates, independent of live simulation state. */
  x: number;
  y: number;
  width: number;
  height: number;
  depth: number;
};

export type OverviewSummaryConnection = {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  connectionIds: string[];
  kind: 'tree-transition' | 'alternate-link';
  /** Exact endpoint assets and the modeled connection path represented here. */
  endpointAssetIds: [string, string];
};

export type FitOverviewSummary = {
  nodes: OverviewSummaryNode[];
  connections: OverviewSummaryConnection[];
  /** Every original asset belongs to exactly one summary container. */
  assetNodeById: ReadonlyMap<string, string>;
  /** Every original connection is retained in exactly one category. */
  connectionDisposition: ReadonlyMap<string, 'inside-container' | 'tree-transition' | 'alternate-link'>;
  bounds: { x: number; y: number; width: number; height: number };
  audit: {
    assetCount: number;
    connectionCount: number;
    roomCount: number;
    supplySpineCount: number;
    internalConnectionCount: number;
    treeTransitionCount: number;
    alternateLinkCount: number;
    unassignedAssetIds: string[];
    nodeOverlapPairs: string[];
    treeGraphConflicts: string[];
  };
};

type AssetEdge = { id: string; a: string; b: string };

/**
 * Build a compact, top-down map of the original rendering forest.
 *
 * Frame membership is presentation metadata from the supplied area views.
 * Assets outside a frame inherit their nearest ancestor container in the
 * deterministic display forest; source roots get explicit spine containers.
 * This is a visual grouping rule only and never modifies NetworkModel.
 */
export function fitOverviewSummary(model: NetworkModel): FitOverviewSummary {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const edges: AssetEdge[] = model.connections.map(connection => {
    const a = terminalOwner.get(connection.from);
    const b = terminalOwner.get(connection.to);
    if (!a || !b) throw new Error(`Connection ${connection.id} has an unknown terminal owner`);
    return { id: connection.id, a, b };
  });
  const adjacency = new Map(model.assets.map(asset => [asset.id, [] as { peer: string; edge: AssetEdge }[]]));
  for (const edge of edges) {
    if (edge.a === edge.b) continue;
    adjacency.get(edge.a)!.push({ peer: edge.b, edge });
    adjacency.get(edge.b)!.push({ peer: edge.a, edge });
  }

  // This display forest follows only topology already present in the model.
  // It prefers the configured sources, then deterministically covers any
  // disconnected component without claiming it is energized.
  const roots = [...new Set(model.sources.map(source => source.assetId))].filter(id => assetById.has(id));
  const parent = new Map<string, string>();
  const parentEdge = new Map<string, string>();
  const treeEdgeIds = new Set<string>();
  const visitationOrder: string[] = [];
  const visited = new Set<string>();
  const visit = (componentRoot: string) => {
    if (visited.has(componentRoot)) return;
    visited.add(componentRoot);
    const queue = [componentRoot];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      visitationOrder.push(current);
      for (const neighbor of adjacency.get(current)!) {
        if (visited.has(neighbor.peer)) continue;
        visited.add(neighbor.peer);
        parent.set(neighbor.peer, current);
        parentEdge.set(neighbor.peer, neighbor.edge.id);
        treeEdgeIds.add(neighbor.edge.id);
        queue.push(neighbor.peer);
      }
    }
  };
  roots.forEach(visit);
  for (const asset of model.assets) if (!visited.has(asset.id)) {
    roots.push(asset.id);
    visit(asset.id);
  }

  const memberships = switchroomMemberships(model);
  const roomByAsset = new Map<string, string>();
  // Core device identities take precedence over broader source-view coverage.
  for (const room of memberships) for (const assetId of room.assetIds) {
    if (!roomByAsset.has(assetId)) roomByAsset.set(assetId, room.id);
  }
  // Nearest tree ancestor owns unframed chain assets, giving a visual cluster
  // to cables/poles without making them extra user-facing locations.
  const ownerByAsset = new Map<string, string>();
  for (const assetId of visitationOrder) {
    const ownRoom = roomByAsset.get(assetId);
    const inherited = ownRoom ?? (parent.has(assetId) ? ownerByAsset.get(parent.get(assetId)!) : undefined);
    if (inherited) ownerByAsset.set(assetId, inherited);
  }

  const nodeAssets = new Map<string, string[]>();
  const nodeKind = new Map<string, OverviewSummaryNode['kind']>();
  const nodeLabel = new Map<string, string>();
  const assetNodeById = new Map<string, string>();
  const sourceAssetIds = new Set(model.sources.map(source => source.assetId));
  const sourceIndexById = new Map(model.sources.map((source, index) => [source.assetId, index + 1] as const));
  const unconnectedAssetNodeId = 'unconnected:model-assets';
  const unconnectedAssets = new Set(model.assets
    .filter(asset => !ownerByAsset.has(asset.id) && !sourceAssetIds.has(asset.id) && adjacency.get(asset.id)!.length === 0)
    .map(asset => asset.id));
  if (unconnectedAssets.size) {
    nodeAssets.set(unconnectedAssetNodeId, []);
    nodeKind.set(unconnectedAssetNodeId, 'unframed-area');
    nodeLabel.set(unconnectedAssetNodeId, 'Unconnected model assets');
  }

  for (const room of memberships) {
    const id = `room:${room.id}`;
    nodeAssets.set(id, []);
    nodeKind.set(id, 'room');
    nodeLabel.set(id, room.label);
  }
  const spineNodeByRoot = new Map<string, string>();
  const unframedNodeByComponentRoot = new Map<string, string>();
  const nearestContainer = (assetId: string) => ownerByAsset.get(assetId);

  for (const assetId of visitationOrder) {
    const roomId = nearestContainer(assetId);
    let nodeId: string;
    if (roomId) nodeId = `room:${roomId}`;
    else if (unconnectedAssets.has(assetId)) nodeId = unconnectedAssetNodeId;
    else {
      let root = assetId;
      let cursor = assetId;
      while (parent.has(cursor)) { cursor = parent.get(cursor)!; root = cursor; }
      if (sourceAssetIds.has(root)) {
        nodeId = spineNodeByRoot.get(root) ?? `spine:${root}`;
        spineNodeByRoot.set(root, nodeId);
        nodeKind.set(nodeId, 'supply-spine');
        const sourceIndex = sourceIndexById.get(root);
        const source = model.sources.find(item => item.assetId === root);
        nodeLabel.set(nodeId, source?.label ?? `Supply spine ${sourceIndex ?? ''}`.trim());
      } else {
        nodeId = unframedNodeByComponentRoot.get(root) ?? `unframed:${root}`;
        unframedNodeByComponentRoot.set(root, nodeId);
        nodeKind.set(nodeId, 'unframed-area');
        nodeLabel.set(nodeId, 'Unframed network segment');
      }
      if (!nodeAssets.has(nodeId)) nodeAssets.set(nodeId, []);
    }
    assetNodeById.set(assetId, nodeId);
    nodeAssets.get(nodeId)!.push(assetId);
  }

  // Quotient only the display forest for a stable top-down overview. A group
  // may be reached more than once (for example two incomers); preserve all
  // such original edges as alternate links instead of silently merging them.
  const nodeParent = new Map<string, string>();
  const treeTransitions: OverviewSummaryConnection[] = [];
  const alternateLinks: OverviewSummaryConnection[] = [];
  const connectionDisposition = new Map<string, FitOverviewSummary['connectionDisposition'] extends ReadonlyMap<string, infer V> ? V : never>();
  const emittedTreeEdges = new Set<string>();

  const transitionPairs = new Map<string, OverviewSummaryConnection>();
  for (const assetId of visitationOrder) {
    const parentId = parent.get(assetId);
    const edgeId = parentEdge.get(assetId);
    if (!parentId || !edgeId) continue;
    const fromNodeId = assetNodeById.get(parentId)!;
    const toNodeId = assetNodeById.get(assetId)!;
    if (fromNodeId === toNodeId) {
      connectionDisposition.set(edgeId, 'inside-container');
      continue;
    }
    const pairKey = `${fromNodeId}\u0000${toNodeId}`;
    let summary = transitionPairs.get(pairKey);
    if (!summary && !nodeParent.has(toNodeId)) {
      summary = { id: `tree:${fromNodeId}->${toNodeId}`, fromNodeId, toNodeId, connectionIds: [], kind: 'tree-transition', endpointAssetIds: [parentId, assetId] };
      transitionPairs.set(pairKey, summary);
      nodeParent.set(toNodeId, fromNodeId);
      treeTransitions.push(summary);
    }
    if (summary) {
      summary.connectionIds.push(edgeId);
      emittedTreeEdges.add(edgeId);
      connectionDisposition.set(edgeId, 'tree-transition');
    } else {
      alternateLinks.push({ id: `alternate:${edgeId}`, fromNodeId, toNodeId, connectionIds: [edgeId], kind: 'alternate-link', endpointAssetIds: [parentId, assetId] });
      emittedTreeEdges.add(edgeId);
      connectionDisposition.set(edgeId, 'alternate-link');
    }
  }

  for (const edge of edges) {
    if (treeEdgeIds.has(edge.id)) continue;
    const fromNodeId = assetNodeById.get(edge.a)!;
    const toNodeId = assetNodeById.get(edge.b)!;
    alternateLinks.push({ id: `alternate:${edge.id}`, fromNodeId, toNodeId, connectionIds: [edge.id], kind: 'alternate-link', endpointAssetIds: [edge.a, edge.b] });
    connectionDisposition.set(edge.id, 'alternate-link');
  }

  // Assign deterministic top-down positions. Group transitions create one
  // tree, with any extra source roots stacked beside it. Keeping room boxes
  // compact is intentional: detailed internal assets render at zoom.
  const children = new Map([...nodeAssets.keys()].map(id => [id, [] as string[]]));
  for (const [childId, parentId] of nodeParent) children.get(parentId)?.push(childId);
  const rootsOfGroups = [...nodeAssets.keys()].filter(id => !nodeParent.has(id));
  const childOrder = (a: string, b: string) => a.localeCompare(b);
  children.forEach(items => items.sort(childOrder));
  const footprints = new Map([...nodeAssets.keys()].map(id => {
    const width = nodeWidth(nodeLabel.get(id) ?? id);
    return [id, { left: -width / 2, right: width / 2 }] as const;
  }));
  const placedTree = compactSupplyTreeLayout(rootsOfGroups, children, footprints, {
    horizontalGap: 220,
    verticalGap: 300,
    maxWidth: 5_800,
    rootGap: 360,
  });
  const positionByNode = new Map([...nodeAssets.keys()].map(id => {
    const [x, y] = placedTree.positions[id];
    return [id, { x, y, depth: Math.round(y / 300), width: nodeWidth(nodeLabel.get(id) ?? id) }] as const;
  }));

  const nodes: OverviewSummaryNode[] = [...nodeAssets].map(([id, ids]) => {
    const position = positionByNode.get(id)!;
    return { id, label: `${nodeLabel.get(id) ?? id} · ${ids.length}`, kind: nodeKind.get(id) ?? 'unframed-area', assetIds: ids, x: position.x - position.width / 2, y: position.y, width: position.width, height: 110, depth: position.depth };
  });

  const allSummaryConnections = [...treeTransitions, ...alternateLinks];
  const missingConnectionIds = edges.map(edge => edge.id).filter(id => !connectionDisposition.has(id));
  if (missingConnectionIds.length) throw new Error(`Unclassified connections: ${missingConnectionIds.join(', ')}`);
  const unassignedAssetIds = model.assets.map(asset => asset.id).filter(id => !assetNodeById.has(id));
  const overlapPairs: string[] = [];
  for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
    const a = nodes[i]; const b = nodes[j];
    if (a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height) overlapPairs.push(`${a.id}/${b.id}`);
  }
  const depths = new Map(nodes.map(node => [node.id, node.depth]));
  const treeGraphConflicts = treeTransitions.filter(edge => (depths.get(edge.toNodeId) ?? 0) <= (depths.get(edge.fromNodeId) ?? 0)).map(edge => edge.id);
  const x1 = Math.min(...nodes.map(node => node.x)); const y1 = Math.min(...nodes.map(node => node.y));
  const x2 = Math.max(...nodes.map(node => node.x + node.width)); const y2 = Math.max(...nodes.map(node => node.y + node.height));

  return {
    nodes,
    connections: allSummaryConnections,
    assetNodeById,
    connectionDisposition,
    bounds: { x: x1, y: y1, width: x2 - x1, height: y2 - y1 },
    audit: {
      assetCount: assetNodeById.size,
      connectionCount: connectionDisposition.size,
      roomCount: memberships.length,
      supplySpineCount: nodes.filter(node => node.kind === 'supply-spine').length,
      internalConnectionCount: [...connectionDisposition.values()].filter(value => value === 'inside-container').length,
      treeTransitionCount: [...connectionDisposition.values()].filter(value => value === 'tree-transition').length,
      alternateLinkCount: [...connectionDisposition.values()].filter(value => value === 'alternate-link').length,
      unassignedAssetIds,
      nodeOverlapPairs: overlapPairs,
      treeGraphConflicts,
    },
  };
}

function nodeWidth(label: string): number {
  return Math.max(300, Math.min(720, label.length * 18 + 150));
}
