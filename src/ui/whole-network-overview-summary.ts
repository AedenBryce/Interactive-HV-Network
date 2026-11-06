import type { NetworkModel } from '../session/model';
import type { SwitchroomMembership } from './switchroom-frames';
import { roomPlacementPlan, type RoomPlacementNode, type SupplyAnchorId } from './room-placement-plan';

export type OverviewSummaryNode = {
  id: string;
  label: string;
  kind: 'source' | 'room';
  width: number;
  height: number;
};

export type OverviewSummaryEdge = { id: string; from: string; to: string };
export type OverviewPoint = readonly [x: number, y: number];
export type OverviewSummaryCard = OverviewSummaryNode & { x: number; y: number; layer: number };
export type OverviewConductor = { id: string; points: readonly OverviewPoint[]; edgeIds: readonly string[] };
export type OverviewSummary = {
  cards: readonly OverviewSummaryCard[];
  edges: readonly OverviewSummaryEdge[];
  conductors: readonly OverviewConductor[];
  roots: readonly string[];
  bounds: { x: number; y: number; width: number; height: number };
};

/**
 * Build a compact, presentation-only room graph from the selected tree edges.
 * A room edge follows the source-rooted spanning tree; alternate/ring links
 * remain in the full detail diagram and are not changed or discarded.
 */
export function buildWholeNetworkOverviewSummary(
  model: NetworkModel,
  treeEdgeIds: ReadonlySet<string>,
  rooms: readonly SwitchroomMembership[],
  roomByAssetId: ReadonlyMap<string, string>,
  options: { roomWidth?: number; sourceWidth?: number; cardHeight?: number; horizontalGap?: number; verticalGap?: number; rootGap?: number } = {},
): OverviewSummary {
  const roomWidth = options.roomWidth ?? 1_400;
  const sourceWidth = options.sourceWidth ?? 1_250;
  const cardHeight = options.cardHeight ?? 700;
  const horizontalGap = options.horizontalGap ?? 300;
  const rootGap = options.rootGap ?? 900;
  const roomIds = new Set(rooms.map(room => room.id));
  const nodes: OverviewSummaryNode[] = [
    ...model.sources.map(source => ({ id: source.assetId, label: model.assets.find(asset => asset.id === source.assetId)?.label ?? source.assetId, kind: 'source' as const, width: sourceWidth, height: cardHeight })),
    ...rooms.map(room => ({ id: room.id, label: ('overviewTitle' in room ? String(room.overviewTitle) : undefined) || room.label, kind: 'room' as const, width: roomWidth, height: cardHeight })),
  ];
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  const sourceNodeByAsset = new Map(model.sources.map(source => [source.assetId, source.assetId]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const treeAdjacency = new Map(model.assets.map(asset => [asset.id, [] as { peerId: string; connectionId: string }[]]));
  for (const connection of model.connections) {
    if (!treeEdgeIds.has(connection.id)) continue;
    const from = ownerByTerminal.get(connection.from);
    const to = ownerByTerminal.get(connection.to);
    if (!from || !to || from === to) continue;
    treeAdjacency.get(from)!.push({ peerId: to, connectionId: connection.id });
    treeAdjacency.get(to)!.push({ peerId: from, connectionId: connection.id });
  }

  const parentByRoom = new Map<string, string>();
  const edgeByPair = new Map<string, OverviewSummaryEdge>();
  const visitedAssets = new Set<string>();
  const addRoomEdge = (from: string, to: string, id: string) => {
    if (from === to || !nodeById.has(from) || !roomIds.has(to) || parentByRoom.has(to)) return;
    parentByRoom.set(to, from);
    edgeByPair.set(to, { id, from, to });
  };

  const traverse = (startAssetId: string, sourceNodeId?: string) => {
    const initialRoom = roomByAssetId.get(startAssetId);
    const queue: { assetId: string; lastRoomId?: string }[] = [{ assetId: startAssetId, lastRoomId: initialRoom }];
    if (initialRoom && sourceNodeId) addRoomEdge(sourceNodeId, initialRoom, `overview:${sourceNodeId}:${initialRoom}`);
    visitedAssets.add(startAssetId);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      for (const adjacent of treeAdjacency.get(current.assetId) ?? []) {
        if (visitedAssets.has(adjacent.peerId)) continue;
        visitedAssets.add(adjacent.peerId);
        const nextRoom = roomByAssetId.get(adjacent.peerId);
        const parentNodeId = current.lastRoomId ?? sourceNodeId;
        if (nextRoom && nextRoom !== current.lastRoomId && parentNodeId) addRoomEdge(parentNodeId, nextRoom, adjacent.connectionId);
        queue.push({ assetId: adjacent.peerId, lastRoomId: nextRoom ?? current.lastRoomId });
      }
    }
  };
  // Source roots are disjoint roots in the selected presentation forest.
  for (const source of model.sources) {
    const sourceNodeId = sourceNodeByAsset.get(source.assetId)!;
    if (!visitedAssets.has(source.assetId)) traverse(source.assetId, sourceNodeId);
  }
  // Preserve any selected disconnected presentation component as a room root;
  // this is a layout position only and makes no claim about electrical source.
  for (const room of rooms) {
    if (parentByRoom.has(room.id)) continue;
    const assetId = room.assetIds.find(id => !visitedAssets.has(id));
    if (assetId) traverse(assetId);
  }

  // Replace a BFS-derived room parent when the owner supplied an explicit
  // single-parent route and its real model connection ID. This keeps the
  // summary tree aligned with reviewed routes without inventing a connection.
  // SW411's two-source case continues to use its dedicated dual-feed layout.
  const sourceAssetByAnchor: Record<SupplyAnchorId, string> = {
    'source:TF11': 'boundary:tf11',
    'source:TF12': 'boundary:tf12',
    'source:TF04': 'boundary:tf04',
  };
  for (const room of rooms) {
    const configured = roomPlacementPlan[room.id as keyof typeof roomPlacementPlan] as RoomPlacementNode | undefined;
    if (configured?.topology !== 'owner-confirmed' || configured.parents.length !== 1) continue;
    const parent = configured.parents[0];
    const connectionId = parent.connectionIds?.[0] ?? parent.connectionId;
    if (!connectionId) continue;
    const from = parent.kind === 'room' ? parent.id : sourceAssetByAnchor[parent.id];
    if (!nodeById.has(from) || !roomIds.has(room.id)) continue;
    parentByRoom.set(room.id, from);
    edgeByPair.set(room.id, { id: connectionId, from, to: room.id });
  }

  const children = new Map(nodes.map(node => [node.id, [] as string[]]));
  for (const edge of edgeByPair.values()) children.get(edge.from)!.push(edge.to);
  for (const childIds of children.values()) childIds.sort((a, b) => nodeById.get(a)!.label.localeCompare(nodeById.get(b)!.label));
  const roots = nodes.map(node => node.id).filter(id => !parentByRoom.has(id));
  const verticalGap = options.verticalGap ?? 900;
  const rowStep = cardHeight + verticalGap;
  const placement = layoutTopDownTree(roots, children, nodeById, horizontalGap, rowStep, rootGap);
  const cards = nodes.map(node => {
    const [centerX, y] = placement.positions[node.id];
    return { ...node, x: centerX - node.width / 2, y, layer: Math.round(y / rowStep) };
  });
  const cardById = new Map(cards.map(card => [card.id, card]));
  const edges = [...edgeByPair.values()];
  const conductors: OverviewConductor[] = [];
  for (const parentId of nodes.map(node => node.id)) {
    const childIds = children.get(parentId)!;
    if (!childIds.length) continue;
    const parent = cardById.get(parentId)!;
    const childCards = childIds.map(id => cardById.get(id)!).sort((a, b) => a.x + a.width / 2 - (b.x + b.width / 2));
    const edgeIds = childIds.map(id => edgeByPair.get(id)!.id);
    const parentCenter: OverviewPoint = [parent.x + parent.width / 2, parent.y + parent.height];
    const childXs = childCards.map(child => child.x + child.width / 2);
    const busY = childCards[0].y - verticalGap / 2;
    conductors.push({ id: `overview:stem:${parentId}`, edgeIds, points: orthogonalPoints([parentCenter, [parentCenter[0], busY]]) });
    if (childCards.length > 1) conductors.push({
      id: `overview:bus:${parentId}`,
      edgeIds: childCards.map(child => edgeByPair.get(child.id)!.id),
      points: [[childXs[0], busY], [childXs.at(-1)!, busY]],
    });
    for (const child of childCards) {
      const x = child.x + child.width / 2;
      conductors.push({
        id: `overview:drop:${parentId}:${child.id}`,
        edgeIds: [edgeByPair.get(child.id)!.id],
        points: [[x, busY], [x, child.y]],
      });
    }
  }

  const xs = cards.flatMap(card => [card.x, card.x + card.width]);
  const ys = cards.flatMap(card => [card.y, card.y + card.height]);
  return {
    cards,
    edges,
    conductors: coalesceSharedSegments(conductors),
    roots,
    bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
  };
}

/** Tidy, layered placement keeps every connection between adjacent tree rows. */
function layoutTopDownTree(
  roots: readonly string[],
  children: ReadonlyMap<string, readonly string[]>,
  nodes: ReadonlyMap<string, OverviewSummaryNode>,
  horizontalGap: number,
  rowStep: number,
  rootGap: number,
) {
  const widths = new Map<string, number>();
  const measure = (id: string): number => {
    const childIds = children.get(id) ?? [];
    const childrenWidth = childIds.reduce((sum, childId) => sum + measure(childId), 0) + Math.max(0, childIds.length - 1) * horizontalGap;
    const width = Math.max(nodes.get(id)!.width, childrenWidth);
    widths.set(id, width);
    return width;
  };
  roots.forEach(measure);
  const positions: Record<string, OverviewPoint> = {};
  const place = (id: string, left: number, row: number) => {
    const width = widths.get(id)!;
    const center = left + width / 2;
    positions[id] = [center, row * rowStep];
    const childIds = children.get(id) ?? [];
    const childrenWidth = childIds.reduce((sum, childId) => sum + widths.get(childId)!, 0) + Math.max(0, childIds.length - 1) * horizontalGap;
    let childLeft = left + (width - childrenWidth) / 2;
    for (const childId of childIds) {
      place(childId, childLeft, row + 1);
      childLeft += widths.get(childId)! + horizontalGap;
    }
  };
  let cursor = 0;
  for (const root of roots) {
    const width = widths.get(root)!;
    place(root, cursor, 0);
    cursor += width + rootGap;
  }
  const xs = Object.entries(positions).flatMap(([id, [x]]) => [x - nodes.get(id)!.width / 2, x + nodes.get(id)!.width / 2]);
  const ys = Object.entries(positions).map(([, [, y]]) => y);
  return {
    positions,
    bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
  };
}

/** Draw each physical path segment once when tree routes share a trunk. */
function coalesceSharedSegments(conductors: readonly OverviewConductor[]): OverviewConductor[] {
  type Segment = { start: number; end: number; edgeIds: Set<string> };
  const groups = new Map<string, { horizontal: boolean; fixed: number; segments: Segment[] }>();
  for (const conductor of conductors) for (let index = 1; index < conductor.points.length; index++) {
    const [x1, y1] = conductor.points[index - 1];
    const [x2, y2] = conductor.points[index];
    if (x1 === x2 && y1 === y2) continue;
    const horizontal = y1 === y2;
    const fixed = horizontal ? y1 : x1;
    const start = Math.min(horizontal ? x1 : y1, horizontal ? x2 : y2);
    const end = Math.max(horizontal ? x1 : y1, horizontal ? x2 : y2);
    const key = `${horizontal ? 'h' : 'v'}:${fixed}`;
    const group = groups.get(key) ?? { horizontal, fixed, segments: [] };
    group.segments.push({ start, end, edgeIds: new Set(conductor.edgeIds) });
    groups.set(key, group);
  }

  const result: OverviewConductor[] = [];
  let segmentNumber = 0;
  for (const group of groups.values()) {
    const points = [...new Set(group.segments.flatMap(segment => [segment.start, segment.end]))].sort((a, b) => a - b);
    for (let index = 1; index < points.length; index++) {
      const start = points[index - 1]; const end = points[index];
      if (start === end) continue;
      const midpoint = (start + end) / 2;
      const edgeIds = [...new Set(group.segments.filter(segment => segment.start < midpoint && midpoint < segment.end).flatMap(segment => [...segment.edgeIds]))].sort();
      if (!edgeIds.length) continue;
      const a: OverviewPoint = group.horizontal ? [start, group.fixed] : [group.fixed, start];
      const b: OverviewPoint = group.horizontal ? [end, group.fixed] : [group.fixed, end];
      result.push({ id: `overview:segment:${segmentNumber++}`, points: [a, b], edgeIds });
    }
  }
  return result;
}

function orthogonalPoints(points: readonly OverviewPoint[]): readonly OverviewPoint[] {
  const output: OverviewPoint[] = [];
  for (const point of points) {
    const previous = output.at(-1);
    if (previous && previous[0] !== point[0] && previous[1] !== point[1]) output.push([point[0], previous[1]]);
    const last = output.at(-1);
    if (!last || last[0] !== point[0] || last[1] !== point[1]) output.push(point);
  }
  return output;
}
