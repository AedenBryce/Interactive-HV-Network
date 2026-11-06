import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { roomPlacementPlan } from './room-placement-plan';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];
type Point = [number, number];
type RoomEdge = { from: string; to: string; connectionId: string; weight: number };

/**
 * Trial 9: room-level hierarchical planarization. Confirmed room parentage
 * establishes top-down layers; weighted barycentric sweeps order rooms within
 * each layer to reduce crossings among cross-room links. Width is reserved
 * along each column cut in proportion to the number of links that need that
 * corridor. The electrical graph is unchanged and all edges are routed by the
 * whole-graph router.
 */
export function planTrial9HierarchicalPlanarization(frames: readonly Frame[], model: NetworkModel) {
  const frameById = new Map(frames.map(frame => [frame.id, frame] as const));
  const roomByAsset = new Map(frames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const edges: RoomEdge[] = [];
  const parent = new Map<string, string>();
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  for (const frame of frames) {
    const record = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    const parentRoom = record?.topology === 'owner-confirmed'
      ? record.parents.find(item => item.kind === 'room' && frameById.has(item.id))
      : undefined;
    if (parentRoom) {
      parent.set(frame.id, parentRoom.id);
      children.get(parentRoom.id)!.push(frame.id);
    }
  }
  for (const connection of model.connections) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to) ?? '');
    if (!fromRoom || !toRoom || fromRoom === toRoom) continue;
    edges.push({ from: fromRoom, to: toRoom, connectionId: connection.id, weight: 1 });
  }

  const roots = frames.map(frame => frame.id).filter(id => !parent.has(id)).sort((a, b) => a.localeCompare(b));
  const depth = new Map<string, number>();
  const queue: [string, number][] = roots.map(id => [id, 0]);
  for (let index = 0; index < queue.length; index++) {
    const [id, level] = queue[index];
    if (depth.has(id)) continue;
    depth.set(id, level);
    for (const child of children.get(id) ?? []) queue.push([child, level + 1]);
  }
  for (const frame of frames) if (!depth.has(frame.id)) { roots.push(frame.id); depth.set(frame.id, 0); }

  const layers = Array.from({ length: Math.max(0, ...depth.values()) + 1 }, (_, rank) =>
    frames.filter(frame => depth.get(frame.id) === rank).map(frame => frame.id).sort((a, b) => a.localeCompare(b)));
  const order = new Map<string, number>();
  const refreshOrder = () => layers.forEach(layer => layer.forEach((id, index) => order.set(id, index)));
  refreshOrder();
  const positionInLayer = (roomId: string) => order.get(roomId) ?? 0;
  const layerOf = (roomId: string) => depth.get(roomId) ?? 0;
  const score = (roomId: string, neighborRanks: readonly number[]) => {
    const incident = edges.filter(edge => edge.from === roomId || edge.to === roomId);
    let weighted = 0; let total = 0;
    for (const edge of incident) {
      const other = edge.from === roomId ? edge.to : edge.from;
      if (other === roomId || !neighborRanks.includes(layerOf(other))) continue;
      weighted += positionInLayer(other) * edge.weight;
      total += edge.weight;
    }
    return total ? weighted / total : positionInLayer(roomId);
  };
  const scoreBefore = crossingCount(edges, layers, order);
  for (let sweep = 0; sweep < 8; sweep++) {
    const downward = sweep % 2 === 0;
    const rankOrder = downward
      ? Array.from({ length: layers.length - 1 }, (_, i) => i + 1)
      : Array.from({ length: layers.length - 1 }, (_, i) => layers.length - 2 - i);
    for (const rank of rankOrder) {
      const layer = layers[rank];
      const neighbors = downward ? [rank - 1] : [rank + 1];
      layer.sort((a, b) => score(a, neighbors) - score(b, neighbors) || a.localeCompare(b));
      refreshOrder();
    }
  }
  const scoreAfter = crossingCount(edges, layers, order);

  const rowHeights = layers.map(layer => Math.max(0, ...layer.map(id => frameById.get(id)!.height)));
  const rowY = [0];
  for (let rank = 1; rank < layers.length; rank++) rowY.push(rowY[rank - 1] + rowHeights[rank - 1] + 1_200);
  const targets: Record<string, Point> = {};
  const xByRoom = new Map<string, number>();
  const gapByLayer = new Map<number, number[]>();
  for (let rank = 0; rank < layers.length; rank++) {
    const layer = layers[rank];
    const gaps = Array.from({ length: Math.max(0, layer.length - 1) }, (_, cutIndex) => {
      const left = new Set(layer.slice(0, cutIndex + 1));
      let cutDemand = 0;
      for (const edge of edges) {
        const fromSide = left.has(edge.from); const toSide = left.has(edge.to);
        if (fromSide !== toSide) cutDemand += edge.weight;
      }
      return 700 + Math.min(2_800, cutDemand * 90);
    });
    gapByLayer.set(rank, gaps);
    const totalWidth = layer.reduce((sum, id) => sum + frameById.get(id)!.width, 0) + gaps.reduce((sum, value) => sum + value, 0);
    let cursor = -totalWidth / 2;
    for (const [index, id] of layer.entries()) {
      const frame = frameById.get(id)!;
      targets[id] = [cursor, rowY[rank]];
      xByRoom.set(id, cursor + frame.width / 2);
      cursor += frame.width + (gaps[index] ?? 0);
    }
  }
  const roomTranslations = Object.fromEntries(frames.map(frame => {
    const [x, y] = targets[frame.id];
    return [frame.id, [x - frame.x, y - frame.y] as Point];
  }));
  const prioritizedConnections = edges
    .sort((a, b) => layerOf(a.from) - layerOf(b.from)
      || Math.min(positionInLayer(a.from), positionInLayer(a.to)) - Math.min(positionInLayer(b.from), positionInLayer(b.to))
      || a.connectionId.localeCompare(b.connectionId))
    .map(edge => edge.connectionId);
  return {
    roomTranslations,
    targets,
    roots,
    layers: layers.map(items => [...items]),
    depthByRoom: Object.fromEntries(depth),
    orderByRoom: Object.fromEntries(order),
    xByRoom: Object.fromEntries(xByRoom),
    gapByLayer: Object.fromEntries(gapByLayer),
    crossRoomEdges: edges,
    prioritizedConnections,
    roomLevelCrossingsBefore: scoreBefore,
    roomLevelCrossingsAfter: scoreAfter,
  };
}

function crossingCount(edges: readonly RoomEdge[], layers: readonly (readonly string[])[], order: ReadonlyMap<string, number>) {
  let count = 0;
  const depth = new Map(layers.flatMap((ids, rank) => ids.map(id => [id, rank] as const)));
  for (let i = 0; i < edges.length; i++) for (const other of edges.slice(i + 1)) {
    const a = edges[i];
    const aRanks = [depth.get(a.from)!, depth.get(a.to)!].sort((x, y) => x - y);
    const bRanks = [depth.get(other.from)!, depth.get(other.to)!].sort((x, y) => x - y);
    if (aRanks[0] !== bRanks[0] || aRanks[1] !== bRanks[1]) continue;
    if (a.from === other.from || a.from === other.to || a.to === other.from || a.to === other.to) continue;
    const ax1 = order.get(a.from)!; const ax2 = order.get(a.to)!;
    const bx1 = order.get(other.from)!; const bx2 = order.get(other.to)!;
    if ((ax1 - bx1) * (ax2 - bx2) < 0) count++;
  }
  return count;
}

export function layoutTrial9HierarchicalPlanarization(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const plan = planTrial9HierarchicalPlanarization(seed.frames, model);
  const candidate = layoutWholeGraphCandidate(model, {
    baseGeometry: base,
    roomTranslations: plan.roomTranslations,
    prioritizeConnectionIds: plan.prioritizedConnections,
    routeBudget: 'quick',
  });
  return { ...candidate, planarizationPlan: plan };
}
