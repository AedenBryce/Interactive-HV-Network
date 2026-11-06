import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { roomClusterOwnership } from './room-cluster-ownership';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { Point } from './diagram-geometry';

type Rect = { left: number; top: number; right: number; bottom: number };
type Unit = { id: string; roomId?: string; assetIds: string[]; rect: Rect; baseX: number; parentIds: Set<string>; neighborIds: Set<string> };
type UnitLink = { a: string; b: string; id: string };

/** Deterministic global rank + non-overlap energy layout. Presentation-only. */
export function solveAgent5GlobalConstraintLayout(model: NetworkModel, base = continuousNetwork(model)) {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const frameById = new Map(base.panels.map(frame => [frame.id, frame]));
  const coreOwner = new Map<string, string>();
  for (const frame of base.panels) for (const assetId of frame.assetIds) coreOwner.set(assetId, frame.id);
  const treeConnections = model.connections.filter(connection => base.treeEdgeIds.has(connection.id));
  const earthIds = new Set(model.assets.filter(asset => asset.kind === 'earth-switch').map(asset => asset.id));
  const treeEdges = treeConnections.filter(connection => !earthIds.has(terminalOwner.get(connection.from)!) && !earthIds.has(terminalOwner.get(connection.to)!))
    .flatMap(connection => {
      const parentAssetId = terminalOwner.get(connection.from); const childAssetId = terminalOwner.get(connection.to);
      return parentAssetId && childAssetId ? [{ id: connection.id, parentAssetId, childAssetId }] : [];
    });
  const earthBranches = treeConnections.flatMap(connection => {
    const from = terminalOwner.get(connection.from); const to = terminalOwner.get(connection.to);
    const earthSwitchAssetId = from && earthIds.has(from) ? from : to && earthIds.has(to) ? to : undefined;
    const ownerAssetId = earthSwitchAssetId === from ? to : from;
    return earthSwitchAssetId && ownerAssetId ? [{ id: connection.id, ownerAssetId, earthSwitchAssetId, direction: 'owner-to-earth-switch' as const }] : [];
  });
  const ownership = roomClusterOwnership(model, treeEdges, earthBranches);
  const nodeForAsset = (assetId: string) => ownership.ownerByAssetId.get(assetId) ?? `asset-root:${assetId}`;
  const assigned = new Map<string, string[]>();
  for (const asset of model.assets) {
    const nodeId = nodeForAsset(asset.id);
    assigned.set(nodeId, [...(assigned.get(nodeId) ?? []), asset.id]);
  }
  const unitMap = new Map<string, Unit>();
  for (const [nodeId, assetIds] of assigned) {
    const roomId = frameById.has(nodeId) ? nodeId : undefined;
    const boxes: Rect[] = assetIds.flatMap(assetId => assetRect(assetById.get(assetId)!, base));
    const frame = roomId ? frameById.get(roomId)! : undefined;
    if (frame) boxes.push({ left: frame.x, top: frame.y, right: frame.x + frame.width, bottom: frame.y + frame.height });
    const fallback = base.view.layout.assets[assetIds[0]] ?? [0, 0];
    const rect = boxes.length ? union(boxes) : { left: fallback[0] - 46, top: fallback[1] - 46, right: fallback[0] + 46, bottom: fallback[1] + 46 };
    unitMap.set(nodeId, { id: nodeId, roomId, assetIds, rect, baseX: (rect.left + rect.right) / 2, parentIds: new Set(), neighborIds: new Set() });
  }
  const links: UnitLink[] = [];
  const linkIds = new Set<string>();
  for (const connection of model.connections) {
    const aAsset = terminalOwner.get(connection.from); const bAsset = terminalOwner.get(connection.to);
    if (!aAsset || !bAsset) continue;
    const a = nodeForAsset(aAsset); const b = nodeForAsset(bAsset);
    if (a === b) continue;
    links.push({ a, b, id: connection.id });
    linkIds.add(connection.id);
    unitMap.get(a)?.neighborIds.add(b); unitMap.get(b)?.neighborIds.add(a);
  }
  const treeLinks = links.filter(link => base.treeEdgeIds.has(link.id));
  const roots = [...new Set(model.sources.map(source => nodeForAsset(source.assetId)))].filter(id => unitMap.has(id));
  const rankById = new Map<string, number>(); const parentById = new Map<string, string>(); const visited = new Set<string>();
  const walk = (starts: readonly string[]) => {
    const queue = [...starts];
    for (const id of starts) { visited.add(id); rankById.set(id, 0); }
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parent = queue[cursor];
      for (const edge of treeLinks) {
        const child = edge.a === parent ? edge.b : edge.b === parent ? edge.a : undefined;
        if (!child || visited.has(child)) continue;
        visited.add(child); parentById.set(child, parent); unitMap.get(child)!.parentIds.add(parent);
        rankById.set(child, rankById.get(parent)! + 1); queue.push(child);
      }
    }
  };
  walk(roots);
  for (const id of unitMap.keys()) if (!visited.has(id)) { roots.push(id); walk([id]); }

  const layers = new Map<number, string[]>();
  for (const [id, rank] of rankById) layers.set(rank, [...(layers.get(rank) ?? []), id]);
  const maxWidth = 31_000; const gapX = 520; const gapY = 760; const iterations = 12;
  const ringIds = ['crushing-2/sw435-hv', 'crushing-1/hv'].filter(id => unitMap.has(id));
  const candidates: { strategy: string; positions: Map<string, Rect>; score: readonly number[]; metrics: ReturnType<typeof scoreLayout> }[] = [];
  const startOrders = ['base-x', 'id', 'reverse-base-x'];
  for (const strategy of startOrders) {
    const orderByRank = new Map([...layers].map(([rank, ids]) => [rank, initialOrder(ids, unitMap, strategy)]));
    let positions = new Map<string, Rect>();
    for (let iteration = 0; iteration < iterations; iteration++) {
      positions = placeRanks(orderByRank, layers, unitMap, parentById, positions, { maxWidth, gapX, gapY, ringIds });
      for (const ids of orderByRank.values()) {
        if (iteration === iterations - 1) continue;
        const targetX = (id: string) => {
          const node = unitMap.get(id)!;
          const neighbors = [...node.neighborIds].map(neighbor => positions.get(neighbor)).filter((rect): rect is Rect => !!rect);
          const mean = neighbors.length ? neighbors.reduce((sum, rect) => sum + centerX(rect), 0) / neighbors.length : node.baseX;
          const parent = parentById.get(id); const parentX = parent ? centerX(positions.get(parent) ?? unitMap.get(parent)!.rect) : mean;
          return 0.58 * parentX + 0.27 * mean + 0.15 * node.baseX;
        };
        ids.sort((a, b) => targetX(a) - targetX(b) || unitMap.get(a)!.baseX - unitMap.get(b)!.baseX || a.localeCompare(b));
        forceRingAdjacency(ids, ringIds);
      }
    }
    const metrics = scoreLayout(unitMap, links, positions);
    candidates.push({ strategy, positions, score: metrics.score, metrics });
  }
  candidates.sort((a, b) => compare(a.score, b.score) || a.strategy.localeCompare(b.strategy));
  const chosen = candidates[0];
  const roomTranslations: Record<string, Point> = {}; const assetTranslations: Record<string, Point> = {};
  for (const unit of unitMap.values()) {
    const target = chosen.positions.get(unit.id)!;
    const dx = target.left - unit.rect.left; const dy = target.top - unit.rect.top;
    if (unit.roomId) roomTranslations[unit.roomId] = [dx, dy];
    for (const assetId of unit.assetIds) assetTranslations[assetId] = [dx, dy];
  }
  const bounds = union([...chosen.positions.values()]);
  return {
    base,
    ownership,
    roomTranslations,
    assetTranslations,
    unitCount: unitMap.size,
    rankCount: layers.size,
    rankByUnit: Object.fromEntries(rankById),
    deterministic: true,
    candidates: candidates.map(item => ({ strategy: item.strategy, score: item.score, metrics: item.metrics })),
    chosen: chosen.strategy,
    geometryScore: chosen.metrics,
    bounds: { x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top },
  };
}

function assetRect(asset: NetworkModel['assets'][number], base: ReturnType<typeof continuousNetwork>): Rect[] {
  if (base.hiddenIds.has(asset.id)) return [];
  const point = base.view.layout.assets[asset.id]; if (!point) return [];
  const label = base.labels.get(asset.id);
  let boxes: Rect[];
  if (hasDeviceCard(asset) && label) {
    const card = deviceCard(asset, point, label);
    boxes = [{ left: point[0] + card.x, top: point[1] + card.y, right: point[0] + card.x + card.width, bottom: point[1] + card.y + card.height }];
  } else boxes = [{ left: point[0] - 46, top: point[1] - 46, right: point[0] + 46, bottom: point[1] + 46 }];
  if (label) boxes.push({ left: label.x, top: label.y, right: label.x + label.width, bottom: label.y + label.height });
  return boxes;
}

function initialOrder(ids: readonly string[], units: ReadonlyMap<string, Unit>, strategy: string) {
  return [...ids].sort((a, b) => {
    if (strategy === 'id') return a.localeCompare(b);
    const delta = units.get(a)!.baseX - units.get(b)!.baseX;
    return strategy === 'reverse-base-x' ? -delta || a.localeCompare(b) : delta || a.localeCompare(b);
  });
}

function placeRanks(
  orderByRank: ReadonlyMap<number, readonly string[]>, layers: ReadonlyMap<number, readonly string[]>, units: ReadonlyMap<string, Unit>,
  parentById: ReadonlyMap<string, string>, prior: ReadonlyMap<string, Rect>, options: { maxWidth: number; gapX: number; gapY: number; ringIds: readonly string[] },
) {
  const placed = new Map<string, Rect>();
  const rowBottomByRank = new Map<number, number>();
  for (const rank of [...layers.keys()].sort((a, b) => a - b)) {
    const ids = [...(orderByRank.get(rank) ?? [])];
    forceRingAdjacency(ids, options.ringIds);
    const rows: string[][] = []; let row: string[] = []; let width = 0;
    for (const id of ids) {
      const rect = units.get(id)!.rect; const nodeWidth = rect.right - rect.left;
      if (row.length && width + options.gapX + nodeWidth > options.maxWidth) { rows.push(row); row = []; width = 0; }
      row.push(id); width += (row.length > 1 ? options.gapX : 0) + nodeWidth;
    }
    if (row.length) rows.push(row);
    const parentBottom = ids.flatMap(id => { const parent = parentById.get(id); const rect = parent ? placed.get(parent) : undefined; return rect ? [rect.bottom] : []; });
    let y = parentBottom.length ? Math.max(...parentBottom) + options.gapY : 0;
    for (const rowIds of rows) {
      const rowWidth = rowIds.reduce((sum, id) => sum + units.get(id)!.rect.right - units.get(id)!.rect.left, 0)
        + Math.max(0, rowIds.length - 1) * options.gapX;
      const parentCenters = rowIds.flatMap(id => { const parent = parentById.get(id); const rect = parent ? placed.get(parent) : undefined; return rect ? [centerX(rect)] : []; });
      const center = parentCenters.length ? parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length : 0;
      let x = center - rowWidth / 2; let rowHeight = 0;
      for (const id of rowIds) {
        const unit = units.get(id)!; const width = unit.rect.right - unit.rect.left; const height = unit.rect.bottom - unit.rect.top;
        const rect = { left: x, right: x + width, top: y, bottom: y + height };
        placed.set(id, rect); rowHeight = Math.max(rowHeight, height); x = rect.right + options.gapX;
      }
      y += rowHeight + options.gapY;
    }
    rowBottomByRank.set(rank, y);
  }
  void prior;
  void rowBottomByRank;
  return placed;
}

function forceRingAdjacency(ids: string[], ringIds: readonly string[]) {
  if (ringIds.length !== 2 || !ringIds.every(id => ids.includes(id))) return;
  const first = Math.min(...ringIds.map(id => ids.indexOf(id)));
  const rest = ids.filter(id => !ringIds.includes(id));
  rest.splice(Math.min(first, rest.length), 0, ...ringIds);
  ids.splice(0, ids.length, ...rest);
}

function scoreLayout(units: ReadonlyMap<string, Unit>, links: readonly UnitLink[], positions: ReadonlyMap<string, Rect>) {
  let crossings = 0; let totalLength = 0; let sameRankInversions = 0;
  const routeSegments = links.flatMap(link => {
    const a = positions.get(link.a); const b = positions.get(link.b); if (!a || !b) return [];
    totalLength += Math.abs(centerX(a) - centerX(b)) + Math.abs(centerY(a) - centerY(b));
    return [{ id: link.id, a: link.a, b: link.b, x1: centerX(a), y1: centerY(a), x2: centerX(b), y2: centerY(b) }];
  });
  for (let i = 0; i < routeSegments.length; i++) for (const other of routeSegments.slice(i + 1)) {
    const a = routeSegments[i];
    if (a.a === other.a || a.a === other.b || a.b === other.a || a.b === other.b) continue;
    if (segmentsCross(a.x1, a.y1, a.x2, a.y2, other.x1, other.y1, other.x2, other.y2)) crossings++;
    if ((a.y1 < other.y1 && a.y2 > other.y2) || (a.y1 > other.y1 && a.y2 < other.y2)) sameRankInversions++;
  }
  const all = [...positions.values()];
  const bounds = union(all);
  const aspect = (bounds.right - bounds.left) / Math.max(1, bounds.bottom - bounds.top);
  const score = [crossings, sameRankInversions, totalLength, Math.abs(Math.log(Math.max(0.001, aspect)))];
  return { score, crossings, sameRankInversions, totalLength, aspect, unitCount: units.size };
}

function segmentsCross(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number) {
  const orient = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  const a = orient(x1, y1, x2, y2, x3, y3); const b = orient(x1, y1, x2, y2, x4, y4);
  const c = orient(x3, y3, x4, y4, x1, y1); const d = orient(x3, y3, x4, y4, x2, y2);
  return a * b < 0 && c * d < 0;
}

function union(rects: readonly Rect[]): Rect {
  return { left: Math.min(...rects.map(rect => rect.left)), top: Math.min(...rects.map(rect => rect.top)), right: Math.max(...rects.map(rect => rect.right)), bottom: Math.max(...rects.map(rect => rect.bottom)) };
}
function centerX(rect: Rect) { return (rect.left + rect.right) / 2; }
function centerY(rect: Rect) { return (rect.top + rect.bottom) / 2; }
function compare(a: readonly number[], b: readonly number[]) { for (let i = 0; i < Math.max(a.length, b.length); i++) { const delta = (a[i] ?? 0) - (b[i] ?? 0); if (delta) return delta; } return 0; }
