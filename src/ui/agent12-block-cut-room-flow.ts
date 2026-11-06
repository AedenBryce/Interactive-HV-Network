import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { placeTopDownRooms, type TopDownRoomPlan } from './top-down-room-placement';
import { roomPlacementPlan } from './room-placement-plan';
import type { Point } from './diagram-geometry';

type RoomEdge = { id: string; a: string; b: string };

/**
 * Block-cut room-flow trial. Inter-room connections are reduced to room pairs,
 * decomposed into biconnected blocks, then the block-cut forest is oriented from
 * the model's existing supply roots. Each block's non-articulation rooms become
 * one downstream level under its entry room. This is presentation-only.
 */
export function layoutAgent12BlockCutRoomFlow(model: NetworkModel) {
  const base = continuousNetwork(model);
  const frames = base.panels.map(frame => ({ ...frame, assetIds: [...frame.assetIds], memberAssetIds: [...frame.memberAssetIds] }));
  const roomByAsset = new Map<string, string>();
  for (const frame of frames) for (const assetId of new Set([...frame.memberAssetIds, ...frame.assetIds])) {
    if (!roomByAsset.has(assetId)) roomByAsset.set(assetId, frame.id);
  }
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, roomByAsset.get(asset.id)] as const)));
  const edgeByPair = new Map<string, RoomEdge>();
  for (const connection of model.connections) {
    const a = ownerByTerminal.get(connection.from);
    const b = ownerByTerminal.get(connection.to);
    if (!a || !b || a === b) continue;
    const [left, right] = [a, b].sort();
    const key = `${left}\u0000${right}`;
    if (!edgeByPair.has(key)) edgeByPair.set(key, { id: connection.id, a: left, b: right });
  }
  const edges = [...edgeByPair.values()].sort((a, b) => a.a.localeCompare(b.a) || a.b.localeCompare(b.b));
  const blocks = biconnectedRoomBlocks(frames.map(frame => frame.id), edges);
  const roots = frames.map(frame => frame.id).filter(id => {
    const configured = roomPlacementPlan[id as keyof typeof roomPlacementPlan];
    return configured?.parents.some(parent => parent.kind === 'supply-anchor')
      || !configured?.parents.some(parent => parent.kind === 'room');
  }).sort((a, b) => rootOrder(a) - rootOrder(b) || a.localeCompare(b));
  const hierarchy = orientBlockCutForest(frames.map(frame => frame.id), blocks, roots);
  const plan: Record<string, TopDownRoomPlan[string]> = Object.fromEntries(frames.map(frame => {
    const parent = hierarchy.parentByRoom[frame.id];
    return [frame.id, { topology: 'presentation-tree', parents: parent ? [{ kind: 'room' as const, id: parent, order: 1, route: 'block-cut presentation parent' }] : [] }];
  }));
  const placement = placeTopDownRooms(frames.map(frame => ({ id: frame.id, width: frame.width, height: frame.height })), {
    plan,
    origin: { x: 0, y: 0 },
    horizontalGap: 1_000,
    verticalGap: 1_000,
    maxRoomsPerRow: 4,
    maxRowWidth: 20_000,
  });
  const roomTranslations: Record<string, Point> = {};
  for (const frame of frames) {
    const target = placement.positions[frame.id];
    if (target) roomTranslations[frame.id] = [target.x - frame.x, target.y - frame.y];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, routeBudget: 'quick' });
  return { candidate, blocks, roomEdges: edges, roots, hierarchy, placement };
}

function rootOrder(roomId: string) {
  const parents = roomPlacementPlan[roomId as keyof typeof roomPlacementPlan]?.parents ?? [];
  return Math.min(...parents.filter(parent => parent.kind === 'supply-anchor').map(parent => parent.order), 10_000);
}

/** Tarjan edge-stack decomposition for a simple undirected room graph. */
function biconnectedRoomBlocks(roomIds: readonly string[], edges: readonly RoomEdge[]) {
  const adjacency = new Map(roomIds.map(id => [id, [] as RoomEdge[]]));
  for (const edge of edges) {
    adjacency.get(edge.a)?.push(edge);
    adjacency.get(edge.b)?.push(edge);
  }
  const discovery = new Map<string, number>();
  const low = new Map<string, number>();
  const stack: RoomEdge[] = [];
  const blocks: string[][] = [];
  let time = 0;
  const emitUntil = (edgeId: string) => {
    const members = new Set<string>();
    while (stack.length) {
      const edge = stack.pop()!;
      members.add(edge.a); members.add(edge.b);
      if (edge.id === edgeId) break;
    }
    if (members.size) blocks.push([...members].sort());
  };
  const visit = (room: string, parentEdgeId?: string) => {
    discovery.set(room, ++time);
    low.set(room, time);
    for (const edge of adjacency.get(room) ?? []) {
      if (edge.id === parentEdgeId) continue;
      const next = edge.a === room ? edge.b : edge.a;
      if (!discovery.has(next)) {
        stack.push(edge);
        visit(next, edge.id);
        low.set(room, Math.min(low.get(room)!, low.get(next)!));
        if (low.get(next)! >= discovery.get(room)!) emitUntil(edge.id);
      } else if (discovery.get(next)! < discovery.get(room)!) {
        stack.push(edge);
        low.set(room, Math.min(low.get(room)!, discovery.get(next)!));
      }
    }
  };
  for (const id of [...roomIds].sort()) {
    if (!discovery.has(id)) visit(id);
    if (!adjacency.get(id)?.length) blocks.push([id]);
  }
  return blocks.sort((a, b) => a[0].localeCompare(b[0]) || a.length - b.length);
}

function orientBlockCutForest(roomIds: readonly string[], blocks: readonly string[][], requestedRoots: readonly string[]) {
  const blocksByRoom = new Map(roomIds.map(id => [id, [] as number[]]));
  blocks.forEach((block, index) => block.forEach(id => blocksByRoom.get(id)?.push(index)));
  const parentByRoom: Record<string, string | undefined> = {};
  const blockDepth: Record<number, number> = {};
  const roomDepth: Record<string, number> = {};
  const queue = [...requestedRoots.filter(id => blocksByRoom.get(id)?.length === 0 || blocksByRoom.has(id))];
  for (const root of queue) roomDepth[root] = 0;
  const seenBlocks = new Set<number>();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const entryRoom = queue[cursor];
    for (const blockId of blocksByRoom.get(entryRoom) ?? []) {
      if (seenBlocks.has(blockId)) continue;
      seenBlocks.add(blockId);
      blockDepth[blockId] = (roomDepth[entryRoom] ?? 0) + 1;
      for (const room of blocks[blockId]) {
        if (roomDepth[room] !== undefined) continue;
        parentByRoom[room] = entryRoom;
        roomDepth[room] = blockDepth[blockId] + 1;
        queue.push(room);
      }
    }
  }
  for (const id of roomIds) {
    if (roomDepth[id] !== undefined) continue;
    roomDepth[id] = 0;
    queue.push(id);
    for (let cursor = queue.length - 1; cursor < queue.length; cursor++) {
      const room = queue[cursor];
      for (const blockId of blocksByRoom.get(room) ?? []) {
        if (seenBlocks.has(blockId)) continue;
        seenBlocks.add(blockId);
        blockDepth[blockId] = (roomDepth[room] ?? 0) + 1;
        for (const child of blocks[blockId]) if (roomDepth[child] === undefined) {
          parentByRoom[child] = room;
          roomDepth[child] = blockDepth[blockId] + 1;
          queue.push(child);
        }
      }
    }
  }
  return { parentByRoom, roomDepth, blockDepth };
}
