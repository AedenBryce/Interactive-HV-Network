import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import { roomPlacementPlan } from './room-placement-plan';
import { cutsBox, type Point } from './diagram-geometry';

/**
 * Port-aware Sugiyama experiment. Confirmed room-parent edges assign layers;
 * per-connection room ports bias barycentric sweeps, long links receive dummy
 * nodes, and all rigid room modules are placed top-down before rerouting.
 */
export function layoutTrial7PortAwareSugiyama(model: NetworkModel) {
  const source = layoutRoomOwnedTopDownCandidate(model);
  const base = continuousNetwork(model);
  const frameById = new Map(source.frames.map(frame => [frame.id, frame] as const));
  const roomByAsset = source.roomOwnerByAsset;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const rankMemo = new Map<string, number>();
  const rankRoom = (id: string, active = new Set<string>()): number => {
    const memo = rankMemo.get(id); if (memo !== undefined) return memo;
    if (active.has(id)) return 0;
    const node = roomPlacementPlan[id as keyof typeof roomPlacementPlan];
    const parents = node?.topology === 'owner-confirmed' ? node.parents.filter(item => item.kind === 'room' && frameById.has(item.id)) : [];
    if (!parents.length) { rankMemo.set(id, 0); return 0; }
    const nextActive = new Set(active); nextActive.add(id);
    const rank = Math.max(...parents.map(item => rankRoom(item.id, nextActive))) + 1;
    rankMemo.set(id, rank); return rank;
  };
  for (const id of frameById.keys()) rankRoom(id);
  type Link = { id: string; fromRoom: string; toRoom: string; fromPort: number; toPort: number; rankFrom: number; rankTo: number; tree: boolean };
  const portCoordinate = (connectionId: string, roomId: string, atStart: boolean) => {
    const frame = source.originalFrames.find(item => item.id === roomId)!;
    const path = source.originalRoutes.get(connectionId) ?? [];
    const endpoint = atStart ? path[0] : path.at(-1);
    if (!endpoint) return 0.5;
    // Cable-port identity is retained per connection; its source drawing
    // position within the room gives the crossing minimizer a stable port order.
    const terminalRoom = frame;
    const position = endpoint[0];
    return Math.max(0, Math.min(1, (position - terminalRoom.x) / Math.max(1, frame.width)));
  };
  const links: Link[] = [];
  for (const connection of model.connections) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to) ?? '');
    if (!fromRoom || !toRoom || fromRoom === toRoom) continue;
    links.push({
      id: connection.id, fromRoom, toRoom,
      fromPort: portCoordinate(connection.id, fromRoom, true),
      toPort: portCoordinate(connection.id, toRoom, false),
      rankFrom: rankMemo.get(fromRoom) ?? 0, rankTo: rankMemo.get(toRoom) ?? 0,
      tree: base.treeEdgeIds.has(connection.id),
    });
  }
  type LayerNode = { id: string; rank: number; kind: 'room' | 'dummy'; roomId?: string; baseX: number };
  const nodes = new Map<string, LayerNode>();
  for (const frame of source.frames) nodes.set(`room:${frame.id}`, { id: `room:${frame.id}`, rank: rankMemo.get(frame.id) ?? 0, kind: 'room', roomId: frame.id, baseX: frame.x + frame.width / 2 });
  const chains = new Map<string, string[]>();
  const oriented = links.map(link => {
    let a = link.fromRoom; let b = link.toRoom; let ap = link.fromPort; let bp = link.toPort;
    if (link.rankFrom > link.rankTo || (link.rankFrom === link.rankTo && a.localeCompare(b) > 0)) { [a, b] = [b, a]; [ap, bp] = [bp, ap]; }
    const ra = rankMemo.get(a) ?? 0; const rb = rankMemo.get(b) ?? ra;
    const chain = [`room:${a}`];
    for (let rank = ra + 1; rank < rb; rank++) {
      const id = `dummy:${link.id}:${rank}`;
      nodes.set(id, { id, rank, kind: 'dummy', baseX: source.positions[ownerByTerminal.get(model.connections.find(item => item.id === link.id)!.from)!]?.[0] ?? 0 });
      chain.push(id);
    }
    chain.push(`room:${b}`);
    chains.set(link.id, chain);
    return { ...link, a, b, ap, bp, ra, rb };
  });
  const layers = new Map<number, LayerNode[]>();
  for (const node of nodes.values()) layers.set(node.rank, [...(layers.get(node.rank) ?? []), node]);
  const chainNeighbors = new Map<string, { id: string; port: number }[]>();
  for (const link of oriented) {
    const chain = chains.get(link.id)!;
    for (let i = 1; i < chain.length; i++) {
      const left = chain[i - 1]; const right = chain[i];
      chainNeighbors.set(left, [...(chainNeighbors.get(left) ?? []), { id: right, port: link.ap }]);
      chainNeighbors.set(right, [...(chainNeighbors.get(right) ?? []), { id: left, port: link.bp }]);
    }
  }
  for (const [rank, layer] of layers) layers.set(rank, layer.sort((a, b) => a.baseX - b.baseX || a.id.localeCompare(b.id)));
  const orderIndex = (rank: number) => new Map((layers.get(rank) ?? []).map((node, index) => [node.id, index] as const));
  const maxRank = Math.max(...layers.keys());
  const portWeight = 0.08;
  for (let sweep = 0; sweep < 8; sweep++) {
    const ranks = sweep % 2 === 0 ? Array.from({ length: maxRank + 1 }, (_, i) => i) : Array.from({ length: maxRank + 1 }, (_, i) => maxRank - i);
    for (const rank of ranks) {
      const layer = layers.get(rank) ?? [];
      if (!layer.length) continue;
      const neighborRank = rank + (sweep % 2 === 0 ? -1 : 1);
      const neighborIndex = orderIndex(neighborRank);
      if (!neighborIndex.size) continue;
      const oldIndex = new Map(layer.map((node, index) => [node.id, index] as const));
      const score = (node: LayerNode) => {
        const neighbors = (chainNeighbors.get(node.id) ?? []).filter(item => neighborIndex.has(item.id));
        if (!neighbors.length) return oldIndex.get(node.id) ?? 0;
        const bary = neighbors.reduce((sum, item) => sum + neighborIndex.get(item.id)! + (item.port - 0.5) * portWeight, 0) / neighbors.length;
        return bary;
      };
      layer.sort((a, b) => score(a) - score(b) || (oldIndex.get(a.id) ?? 0) - (oldIndex.get(b.id) ?? 0) || a.id.localeCompare(b.id));
      layers.set(rank, layer);
    }
  }
  const targetByRoom = new Map<string, { x: number; y: number }>();
  const rankHeights = new Map<number, number>();
  for (const [rank, layer] of layers) rankHeights.set(rank, Math.max(0, ...layer.filter(node => node.roomId).map(node => frameById.get(node.roomId!)!.height)));
  let y = 0;
  for (let rank = 0; rank <= maxRank; rank++) {
    const layer = layers.get(rank) ?? [];
    const rooms = layer.filter(node => node.kind === 'room' && node.roomId);
    const width = rooms.reduce((sum, node) => sum + frameById.get(node.roomId!)!.width, 0) + Math.max(0, rooms.length - 1) * 1_500;
    let x = -width / 2;
    for (const node of rooms) {
      const frame = frameById.get(node.roomId!)!;
      targetByRoom.set(node.roomId!, { x, y });
      x += frame.width + 1_500;
    }
    y += (rankHeights.get(rank) ?? 0) + 1_800;
  }
  const dxByRoom = new Map<string, Point>();
  const frames = source.frames.map(frame => {
    const target = targetByRoom.get(frame.id);
    if (!target) return { ...frame };
    const delta: Point = [target.x - frame.x, target.y - frame.y];
    dxByRoom.set(frame.id, delta);
    return { ...frame, x: target.x, y: target.y };
  });
  const dxByAsset = new Map(source.deltaByAsset);
  const positions = { ...source.positions };
  const terminalPositions = { ...source.terminalPositions };
  const labels = new Map([...source.labels].map(([id, label]) => [id, { ...label }]));
  for (const [assetId, roomId] of roomByAsset) {
    const [dx, dy] = dxByRoom.get(roomId) ?? [0, 0];
    if (!dx && !dy) continue;
    if (positions[assetId]) positions[assetId] = [positions[assetId][0] + dx, positions[assetId][1] + dy];
    const asset = model.assets.find(item => item.id === assetId);
    for (const terminal of asset?.terminals ?? []) if (terminalPositions[terminal]) terminalPositions[terminal] = [terminalPositions[terminal][0] + dx, terminalPositions[terminal][1] + dy];
    const label = labels.get(assetId); if (label) labels.set(assetId, { ...label, x: label.x + dx, y: label.y + dy });
    const previous = dxByAsset.get(assetId) ?? [0, 0]; dxByAsset.set(assetId, [previous[0] + dx, previous[1] + dy]);
  }
  const symbolLabelBoxes = source.symbolLabelBoxes.map(box => {
    const room = roomByAsset.get(box.id.replace(/^(?:symbol|label):/, ''));
    const [dx, dy] = room ? dxByRoom.get(room) ?? [0, 0] : [0, 0];
    return { ...box, x: box.x + dx, y: box.y + dy };
  });
  const moved = {
    ...source, positions, terminalPositions, labels, frames, deltaByAsset: dxByAsset,
    deltaByRoom: new Map([...source.deltaByRoom, ...dxByRoom]), symbolLabelBoxes,
    routes: new Map([...source.routes].map(([id, points]) => {
      if (!source.localRouteIds.includes(id)) return [id, points] as const;
      const connection = model.connections.find(item => item.id === id)!;
      const room = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
      const [dx, dy] = room ? dxByRoom.get(room) ?? [0, 0] : [0, 0];
      return [id, points.map(([px, py]) => [px + dx, py + dy] as Point)] as const;
    })),
  };
  const routing = routeRoomOwnedCandidateGutters(model, moved);
  const points = [...Object.values(moved.positions), ...[...routing.routes.values()].flat(), ...moved.frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point])];
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  const bounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return { source, moved, routing, links: oriented, layers, targetByRoom, roomRanks: rankMemo, roomFrames: moved.frames, positions: moved.positions, labels: moved.labels, symbolLabelBoxes: moved.symbolLabelBoxes, bounds };
}
export function countTrial7RouteContentHits(routes: readonly { id: string; points: readonly Point[]; endpoints: readonly string[] }[], boxes: readonly { id: string; x: number; y: number; width: number; height: number }[]) {
  const hits = new Set<string>();
  for (const route of routes) for (let index = 1; index < route.points.length; index++) {
    for (const box of boxes) {
      if (route.endpoints.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
      if (cutsBox(route.points[index - 1], route.points[index], box)) hits.add(`${route.id}->${box.id}`);
    }
  }
  return hits;
}

export function trial7CountContentCollisions(boxes: readonly { id: string; x: number; y: number; width: number; height: number }[]) {
  let hits = 0;
  for (let i = 0; i < boxes.length; i++) for (const other of boxes.slice(i + 1)) {
    if (boxes[i].id.replace(/^(?:symbol|label):/, '') === other.id.replace(/^(?:symbol|label):/, '')) continue;
    if (boxes[i].x < other.x + other.width && boxes[i].x + boxes[i].width > other.x
      && boxes[i].y < other.y + other.height && boxes[i].y + boxes[i].height > other.y) hits++;
  }
  return hits;
}
