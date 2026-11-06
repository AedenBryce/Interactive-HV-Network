import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { Point } from './diagram-geometry';
import { solveAgent5GlobalConstraintLayout } from './agent5-global-constraint-layout';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';

type Rect = { left: number; top: number; right: number; bottom: number };
type Unit = { id: string; assetIds: string[]; rect: Rect; rank: number; x0: number; x: number; weight: number };
type Link = { a: string; b: string; weight: number };

/**
 * Trial 5: a projected quadratic stress layout for rigid room/equipment units.
 * Cross-rank electrical links contribute weighted springs; measured same-rank
 * intervals are kept apart by an isotonic projection after each stress step.
 */
export function layoutTrial5StressRelaxation(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = solveAgent5GlobalConstraintLayout(model, base);
  const ownerByAsset = seed.ownership.ownerByAssetId;
  const grouped = new Map<string, string[]>();
  for (const asset of model.assets) {
    const unitId = ownerByAsset.get(asset.id) ?? `asset-root:${asset.id}`;
    grouped.set(unitId, [...(grouped.get(unitId) ?? []), asset.id]);
  }
  const frameById = new Map(base.panels.map(frame => [frame.id, frame]));
  const units = new Map<string, Unit>();
  const initialDelta = (assetId: string) => seed.assetTranslations[assetId] ?? [0, 0] as Point;
  for (const [id, assetIds] of grouped) {
    const boxes: Rect[] = assetIds.flatMap(assetId => {
      const asset = model.assets.find(item => item.id === assetId)!;
      const point = base.view.layout.assets[assetId];
      if (!point || base.hiddenIds.has(assetId)) return [];
      const [dx, dy] = initialDelta(assetId);
      const label = base.labels.get(assetId);
      if (hasDeviceCard(asset) && label) {
        const card = deviceCard(asset, [point[0] + dx, point[1] + dy], { ...label, x: label.x + dx, y: label.y + dy });
        return [{ left: point[0] + dx + card.x, top: point[1] + dy + card.y, right: point[0] + dx + card.x + card.width, bottom: point[1] + dy + card.y + card.height }];
      }
      const result: Rect[] = [{ left: point[0] + dx - 46, top: point[1] + dy - 46, right: point[0] + dx + 46, bottom: point[1] + dy + 46 }];
      if (label) result.push({ left: label.x + dx, top: label.y + dy, right: label.x + dx + label.width, bottom: label.y + dy + label.height });
      return result;
    });
    const frame = frameById.get(id);
    if (frame) {
      const [dx, dy] = seed.roomTranslations[id] ?? [0, 0];
      boxes.push({ left: frame.x + dx, top: frame.y + dy, right: frame.x + dx + frame.width, bottom: frame.y + dy + frame.height });
    }
    if (!boxes.length) continue;
    const rect = unite(boxes);
    const rank = seed.rankByUnit[id] ?? Math.max(0, ...assetIds.map(assetId => seed.rankByUnit[`asset-root:${assetId}`] ?? 0));
    const x0 = (rect.left + rect.right) / 2;
    units.set(id, { id, assetIds, rect, rank, x0, x: x0, weight: Math.max(1, rect.right - rect.left) });
  }

  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, ownerByAsset.get(asset.id) ?? `asset-root:${asset.id}`] as const)));
  const links: Link[] = [];
  for (const connection of model.connections) {
    const a = ownerByTerminal.get(connection.from); const b = ownerByTerminal.get(connection.to);
    if (!a || !b || a === b || !units.has(a) || !units.has(b)) continue;
    const isTree = base.treeEdgeIds.has(connection.id);
    links.push({ a, b, weight: isTree ? 1 : 0.22 });
  }
  const rankValues = [...new Set([...units.values()].map(unit => unit.rank))].sort((a, b) => a - b);
  const unitsByRank = new Map(rankValues.map(rank => [rank, [...units.values()].filter(unit => unit.rank === rank).sort((a, b) => a.x0 - b.x0 || a.id.localeCompare(b.id))]));
  const anchorWeight = 0.16;
  const springScale = 0.72;
  const gap = 620;

  // Solve a diagonally-preconditioned quadratic stress system. Re-projecting
  // every rank to disjoint measured intervals makes separation a hard rule.
  for (let iteration = 0; iteration < 180; iteration++) {
    const gradient = new Map([...units].map(([id, unit]) => [id, anchorWeight * (unit.x - unit.x0)]));
    const diagonal = new Map([...units].map(([id]) => [id, anchorWeight]));
    for (const link of links) {
      const a = units.get(link.a)!; const b = units.get(link.b)!;
      const difference = a.x - b.x;
      gradient.set(a.id, gradient.get(a.id)! + link.weight * difference);
      gradient.set(b.id, gradient.get(b.id)! - link.weight * difference);
      diagonal.set(a.id, diagonal.get(a.id)! + link.weight);
      diagonal.set(b.id, diagonal.get(b.id)! + link.weight);
    }
    for (const unit of units.values()) {
      const movement = -springScale * gradient.get(unit.id)! / diagonal.get(unit.id)!;
      unit.x += Math.max(-500, Math.min(500, movement));
    }
    for (const layer of unitsByRank.values()) projectLayer(layer, gap);
  }

  const roomTranslations: Record<string, Point> = {};
  const assetTranslations: Record<string, Point> = {};
  for (const unit of units.values()) {
    const dx = unit.x - unit.x0;
    const layer = unitsByRank.get(unit.rank)!;
    const layerTop = Math.min(...layer.map(item => item.rect.top));
    const dy = layerTop - unit.rect.top;
    if (frameById.has(unit.id)) roomTranslations[unit.id] = [dx, dy];
    for (const assetId of unit.assetIds) assetTranslations[assetId] = [dx, dy];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, assetTranslations, routeBudget: 'quick' });
  return { candidate, roomTranslations, assetTranslations, links, unitCount: units.size, rankCount: rankValues.length, ranks: rankValues };
}

function projectLayer(layer: Unit[], gap: number) {
  if (layer.length < 2) return;
  const offsets: number[] = [0];
  for (let i = 1; i < layer.length; i++) {
    const priorHalf = (layer[i - 1].rect.right - layer[i - 1].rect.left) / 2;
    const currentHalf = (layer[i].rect.right - layer[i].rect.left) / 2;
    offsets.push(offsets[i - 1] + priorHalf + currentHalf + gap);
  }
  const blocks: { start: number; end: number; total: number; weight: number }[] = [];
  for (let i = 0; i < layer.length; i++) {
    const weight = Math.max(1, layer[i].weight);
    const value = layer[i].x - offsets[i];
    blocks.push({ start: i, end: i, total: value * weight, weight });
    while (blocks.length > 1) {
      const right = blocks.at(-1)!; const left = blocks.at(-2)!;
      if (left.total / left.weight <= right.total / right.weight) break;
      blocks.splice(-2, 2, { start: left.start, end: right.end, total: left.total + right.total, weight: left.weight + right.weight });
    }
  }
  for (const block of blocks) {
    const projected = block.total / block.weight;
    for (let i = block.start; i <= block.end; i++) layer[i].x = projected + offsets[i];
  }
}

function unite(rects: readonly Rect[]): Rect {
  return { left: Math.min(...rects.map(rect => rect.left)), top: Math.min(...rects.map(rect => rect.top)), right: Math.max(...rects.map(rect => rect.right)), bottom: Math.max(...rects.map(rect => rect.bottom)) };
}
