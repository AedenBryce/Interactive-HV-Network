import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { switchroomMemberships } from './switchroom-frames';
import { roomPlacementPlan } from './room-placement-plan';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { Point } from './diagram-geometry';

type Box = { left: number; top: number; right: number; bottom: number };
type LayerNode = { id: string; roomId?: string; assetIds: string[]; box: Box; baseX: number; neighbors: Set<string>; parents: Set<string> };

/** Isolated Sugiyama-style room-compound layout; never used by production. */
export function layoutAgent1Sugiyama(model: NetworkModel, base = continuousNetwork(model)) {
  const frameById = new Map(base.panels.map(frame => [frame.id, frame]));
  const roomByAsset = new Map<string, string>(); const ambiguous = new Set<string>();
  for (const room of switchroomMemberships(model)) for (const assetId of room.assetIds) {
    const prior = roomByAsset.get(assetId);
    if (prior && prior !== room.id) { roomByAsset.delete(assetId); ambiguous.add(assetId); }
    else if (!ambiguous.has(assetId)) roomByAsset.set(assetId, room.id);
  }
  if (ambiguous.size) throw new Error(`Ambiguous compound membership: ${[...ambiguous].join(', ')}`);
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const roomAssets = new Map<string, string[]>();
  for (const [assetId, roomId] of roomByAsset) roomAssets.set(roomId, [...(roomAssets.get(roomId) ?? []), assetId]);
  const nodes: LayerNode[] = [];
  const groupByAsset = new Map<string, string>();
  for (const [roomId, assetIds] of roomAssets) {
    const frame = frameById.get(roomId);
    if (!frame) throw new Error(`Compound ${roomId} has no production frame`);
    const content = footprint(assetIds, model, base);
    const box = union([content, { left: frame.x, top: frame.y, right: frame.x + frame.width, bottom: frame.y + frame.height }]);
    const id = `room:${roomId}`;
    nodes.push({ id, roomId, assetIds, box, baseX: (box.left + box.right) / 2, neighbors: new Set(), parents: new Set() });
    assetIds.forEach(assetId => groupByAsset.set(assetId, id));
  }

  const externalIds = model.assets.map(asset => asset.id).filter(assetId => !roomByAsset.has(assetId));
  const externalSet = new Set(externalIds);
  const externalAdj = new Map(externalIds.map(id => [id, [] as { assetId: string; connectionId: string }[]]));
  for (const edgeId of base.treeEdgeIds) {
    const edge = connectionById.get(edgeId); if (!edge) continue;
    const a = ownerByTerminal.get(edge.from); const b = ownerByTerminal.get(edge.to);
    if (!a || !b || a === b || !externalSet.has(a) || !externalSet.has(b)) continue;
    externalAdj.get(a)!.push({ assetId: b, connectionId: edgeId }); externalAdj.get(b)!.push({ assetId: a, connectionId: edgeId });
  }
  const visitedExternal = new Set<string>();
  for (const root of externalIds) {
    if (visitedExternal.has(root)) continue;
    const queue = [root]; visitedExternal.add(root); const assetIds: string[] = [];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]; assetIds.push(current);
      for (const neighbor of externalAdj.get(current) ?? []) if (!visitedExternal.has(neighbor.assetId)) {
        visitedExternal.add(neighbor.assetId); queue.push(neighbor.assetId);
      }
    }
    const id = `bridge:${root}`;
    nodes.push({ id, assetIds, box: footprint(assetIds, model, base), baseX: averageX(assetIds, base), neighbors: new Set(), parents: new Set() });
    assetIds.forEach(assetId => groupByAsset.set(assetId, id));
  }

  const groupAdjacency = new Map(nodes.map(node => [node.id, new Set<string>()]));
  for (const edgeId of base.treeEdgeIds) {
    const edge = connectionById.get(edgeId); if (!edge) continue;
    const from = groupByAsset.get(ownerByTerminal.get(edge.from)!); const to = groupByAsset.get(ownerByTerminal.get(edge.to)!);
    if (!from || !to || from === to) continue;
    groupAdjacency.get(from)!.add(to); groupAdjacency.get(to)!.add(from);
  }
  for (const node of nodes) for (const neighbor of groupAdjacency.get(node.id) ?? []) node.neighbors.add(neighbor);
  const nodeById = new Map(nodes.map(node => [node.id, node]));

  // The selected electrical spanning tree fixes ranks; disconnected or
  // owner-unconfirmed room compounds start as independent presentation roots.
  const detachedRoots = nodes.filter(node => node.roomId
    && roomPlacementPlan[node.roomId as keyof typeof roomPlacementPlan]?.topology === 'unconfirmed').map(node => node.id);
  const sourceRoots = model.sources.map(source => groupByAsset.get(source.assetId)).filter((id): id is string => !!id);
  const roots = [...new Set([...sourceRoots, ...detachedRoots])];
  const visited = new Set<string>(); const rankById = new Map<string, number>();
  const orient = (rootIds: readonly string[]) => {
    const queue = [...rootIds]; rootIds.forEach(id => { visited.add(id); rankById.set(id, 0); });
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parent = queue[cursor]; const parentRank = rankById.get(parent)!;
      for (const child of groupAdjacency.get(parent) ?? []) {
        if (visited.has(child)) continue;
        visited.add(child); nodeById.get(child)!.parents.add(parent); rankById.set(child, parentRank + 1); queue.push(child);
      }
    }
  };
  orient(roots);
  for (const node of nodes) if (!visited.has(node.id)) { roots.push(node.id); orient([node.id]); }

  const confirmedParentViolations: string[] = [];
  for (const node of nodes.filter(item => item.roomId)) {
    const roomId = node.roomId!; const planned = roomPlacementPlan[roomId as keyof typeof roomPlacementPlan];
    if (planned?.topology !== 'owner-confirmed') continue;
    const expected = planned.parents.find(parent => parent.kind === 'room'); if (!expected) continue;
    let cursor: string | undefined = node.id; const seen = new Set<string>(); let found = false;
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor); cursor = [...(nodeById.get(cursor)?.parents ?? [])][0];
      if (cursor && nodeById.get(cursor)?.roomId === expected.id) { found = true; break; }
    }
    if (!found) confirmedParentViolations.push(`${expected.id}→${roomId}`);
  }

  const layers = new Map<number, string[]>();
  for (const node of nodes) {
    const rank = rankById.get(node.id) ?? 0;
    layers.set(rank, [...(layers.get(rank) ?? []), node.id]);
  }
  for (const ids of layers.values()) ids.sort((a, b) => nodeById.get(a)!.baseX - nodeById.get(b)!.baseX || a.localeCompare(b));
  const ringIds = ['room:crushing-2/sw435-hv', 'room:crushing-1/hv'];
  const enforceRingAdjacency = (ids: string[]) => {
    if (!ringIds.every(id => ids.includes(id))) return;
    const oldIndex = Math.min(...ringIds.map(id => ids.indexOf(id)));
    const rest = ids.filter(id => !ringIds.includes(id));
    const insertAt = Math.min(oldIndex, rest.length);
    rest.splice(insertAt, 0, ...ringIds);
    ids.splice(0, ids.length, ...rest);
  };
  enforceAllRingLayers(layers, enforceRingAdjacency);

  // Eight alternating barycenter sweeps over the layered compound graph.
  // Stable base-x and ID are tie-breaks; the confirmed ring pair stays adjacent.
  const ranks = [...layers.keys()].sort((a, b) => a - b);
  for (let sweep = 0; sweep < 4; sweep++) {
    for (const rank of ranks.slice(1)) reorderLayer(rank, rank - 1, layers, nodeById, enforceRingAdjacency);
    for (const rank of ranks.slice(0, -1).reverse()) reorderLayer(rank, rank + 1, layers, nodeById, enforceRingAdjacency);
  }

  const roomTranslations: Record<string, Point> = {}; const assetTranslations: Record<string, Point> = {};
  const positionsByGroup = new Map<string, Box>(); const groupGap = 320; const layerGap = 600; const rowCap = 28_000;
  let layerY = 0;
  for (const rank of ranks) {
    const ids = layers.get(rank)!;
    const rows: string[][] = []; let row: string[] = []; let rowWidth = 0;
    for (const id of ids) {
      const width = nodeWidth(nodeById.get(id)!.box);
      if (row.length && rowWidth + groupGap + width > rowCap) { rows.push(row); row = []; rowWidth = 0; }
      row.push(id); rowWidth += (row.length > 1 ? groupGap : 0) + width;
    }
    if (row.length) rows.push(row);
    let rowY = layerY; let layerBottom = layerY;
    for (const rowIds of rows) {
      let x = 0; let rowHeight = 0;
      for (const id of rowIds) {
        const node = nodeById.get(id)!; const dx = x - node.box.left; const dy = rowY - node.box.top;
        const moved = translate(node.box, dx, dy); positionsByGroup.set(id, moved);
        if (node.roomId) roomTranslations[node.roomId] = [dx, dy];
        else for (const assetId of node.assetIds) assetTranslations[assetId] = [dx, dy];
        x += nodeWidth(node.box) + groupGap; rowHeight = Math.max(rowHeight, nodeHeight(node.box));
      }
      rowY += rowHeight + groupGap; layerBottom = rowY;
    }
    layerY = Math.max(layerBottom, layerY + Math.max(1, ...ids.map(id => nodeHeight(nodeById.get(id)!.box))) + layerGap);
  }

  const overlapIds: string[] = [];
  for (let i = 0; i < nodes.length; i++) for (const other of nodes.slice(i + 1)) {
    if (overlap(positionsByGroup.get(nodes[i].id)!, positionsByGroup.get(other.id)!)) overlapIds.push(`${nodes[i].id}↔${other.id}`);
  }
  const all = [...positionsByGroup.values()];
  const minX = Math.min(...all.map(box => box.left)); const maxX = Math.max(...all.map(box => box.right));
  const minY = Math.min(...all.map(box => box.top)); const maxY = Math.max(...all.map(box => box.bottom));
  return {
    roomTranslations,
    assetTranslations,
    groupByAsset: Object.fromEntries(groupByAsset),
    groupCount: nodes.length,
    bridgeGroupCount: nodes.filter(node => !node.roomId).length,
    ranks: rankById.size ? Math.max(...rankById.values()) + 1 : 0,
    rankByGroup: Object.fromEntries(rankById),
    layerOrder: Object.fromEntries([...layers].map(([rank, ids]) => [rank, [...ids]])),
    confirmedParentViolations,
    groupOverlaps: overlapIds,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY, aspect: (maxX - minX) / (maxY - minY) },
    adjacency: Object.fromEntries([...groupAdjacency].map(([id, neighbors]) => [id, [...neighbors]])),
  };
}

function reorderLayer(rank: number, neighborRank: number, layers: Map<number, string[]>, nodes: ReadonlyMap<string, LayerNode>, enforceRing: (ids: string[]) => void) {
  const neighborPosition = new Map((layers.get(neighborRank) ?? []).map((id, index) => [id, index]));
  const ids = layers.get(rank)!;
  const oldPosition = new Map(ids.map((id, index) => [id, index]));
  ids.sort((a, b) => {
    const score = (id: string) => {
      const values = [...nodes.get(id)!.neighbors].map(neighbor => neighborPosition.get(neighbor)).filter((value): value is number => value !== undefined);
      return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : oldPosition.get(id)!;
    };
    return score(a) - score(b) || nodes.get(a)!.baseX - nodes.get(b)!.baseX || a.localeCompare(b);
  });
  enforceRing(ids);
}

function enforceAllRingLayers(layers: Map<number, string[]>, enforce: (ids: string[]) => void) { for (const ids of layers.values()) enforce(ids); }
function footprint(ids: readonly string[], model: NetworkModel, base: ReturnType<typeof continuousNetwork>): Box {
  const boxes: Box[] = [];
  for (const id of ids) {
    const position = base.view.layout.assets[id]; if (!position) continue;
    const asset = model.assets.find(item => item.id === id)!; const label = base.labels.get(id);
    if (hasDeviceCard(asset) && label) {
      const card = deviceCard(asset, position, label);
      boxes.push({ left: position[0] + card.x, top: position[1] + card.y, right: position[0] + card.x + card.width, bottom: position[1] + card.y + card.height });
    } else boxes.push({ left: position[0] - 46, top: position[1] - 46, right: position[0] + 46, bottom: position[1] + 46 });
    if (label) boxes.push({ left: label.x, top: label.y, right: label.x + label.width, bottom: label.y + label.height });
  }
  return union(boxes);
}
function averageX(ids: readonly string[], base: ReturnType<typeof continuousNetwork>) { const xs = ids.map(id => base.view.layout.assets[id]?.[0]).filter((x): x is number => x !== undefined); return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0; }
function union(boxes: readonly Box[]): Box { return { left: Math.min(...boxes.map(box => box.left)), top: Math.min(...boxes.map(box => box.top)), right: Math.max(...boxes.map(box => box.right)), bottom: Math.max(...boxes.map(box => box.bottom)) }; }
function translate(box: Box, dx: number, dy: number): Box { return { left: box.left + dx, right: box.right + dx, top: box.top + dy, bottom: box.bottom + dy }; }
function nodeWidth(box: Box) { return box.right - box.left; }
function nodeHeight(box: Box) { return box.bottom - box.top; }
function overlap(a: Box, b: Box) { return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top; }
