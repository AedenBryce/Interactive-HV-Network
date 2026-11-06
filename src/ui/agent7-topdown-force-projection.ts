import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { Point } from './diagram-geometry';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { solveAgent5GlobalConstraintLayout } from './agent5-global-constraint-layout';

type Rect = { left: number; top: number; right: number; bottom: number };
type Unit = { id: string; assetIds: string[]; rect: Rect; rank: number; x: number; velocity: number };

/** Trial 7: top-down fixed rank bands, followed by global horizontal force relaxation
 * and exact interval projection. It keeps every equipment group rigid and lets
 * all sibling branches respond together to shared space pressure.
 */
export function layoutAgent7TopdownForceProjection(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = solveAgent5GlobalConstraintLayout(model, base);
  const ownerByAsset = seed.ownership.ownerByAssetId;
  const grouped = new Map<string, string[]>();
  for (const asset of model.assets) {
    const id = ownerByAsset.get(asset.id) ?? `asset-root:${asset.id}`;
    grouped.set(id, [...(grouped.get(id) ?? []), asset.id]);
  }
  const frameById = new Map(base.panels.map(frame => [frame.id, frame]));
  const unitById = new Map<string, Unit>();
  const seedDx = (assetId: string) => seed.assetTranslations[assetId] ?? [0, 0] as Point;
  for (const [id, assetIds] of grouped) {
    const boxes = assetIds.flatMap(assetId => {
      const asset = model.assets.find(item => item.id === assetId)!;
      const point = base.view.layout.assets[assetId];
      if (!point || base.hiddenIds.has(assetId)) return [];
      const [dx, dy] = seedDx(assetId);
      const label = base.labels.get(assetId);
      const result: Rect[] = [];
      if (hasDeviceCard(asset) && label) {
        const card = deviceCard(asset, [point[0] + dx, point[1] + dy], { ...label, x: label.x + dx, y: label.y + dy });
        result.push({ left: point[0] + dx + card.x, top: point[1] + dy + card.y, right: point[0] + dx + card.x + card.width, bottom: point[1] + dy + card.y + card.height });
      } else result.push({ left: point[0] + dx - 46, top: point[1] + dy - 46, right: point[0] + dx + 46, bottom: point[1] + dy + 46 });
      if (label) result.push({ left: label.x + dx, top: label.y + dy, right: label.x + dx + label.width, bottom: label.y + dy + label.height });
      return result;
    });
    const frame = frameById.get(id);
    if (frame) {
      const [dx, dy] = seed.roomTranslations[id] ?? [0, 0];
      boxes.push({ left: frame.x + dx, top: frame.y + dy, right: frame.x + dx + frame.width, bottom: frame.y + dy + frame.height });
    }
    if (!boxes.length) continue;
    const rect = union(boxes);
    const rank = seed.rankByUnit[id] ?? Math.max(0, ...assetIds.map(assetId => seed.rankByUnit[`asset-root:${assetId}`] ?? 0));
    unitById.set(id, { id, assetIds, rect, rank, x: (rect.left + rect.right) / 2, velocity: 0 });
  }

  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, ownerByAsset.get(asset.id) ?? `asset-root:${asset.id}`] as const)));
  const links = model.connections.flatMap(connection => {
    const a = ownerByTerminal.get(connection.from); const b = ownerByTerminal.get(connection.to);
    return a && b && a !== b && unitById.has(a) && unitById.has(b) ? [{ a, b, tree: base.treeEdgeIds.has(connection.id) }] : [];
  });
  const gapX = 620;
  const ranks = [...new Set([...unitById.values()].map(unit => unit.rank))].sort((a, b) => a - b);
  const rankUnits = new Map(ranks.map(rank => [rank, [...unitById.values()].filter(unit => unit.rank === rank)]));

  // Hard top-down rank bands. Each band's height accommodates its largest group.
  let y = 0;
  const rankTop = new Map<number, number>();
  for (const rank of ranks) {
    const values = rankUnits.get(rank)!;
    rankTop.set(rank, y);
    y += Math.max(260, ...values.map(unit => unit.rect.bottom - unit.rect.top)) + 900;
  }
  const neighborIds = new Map([...unitById.keys()].map(id => [id, new Set<string>()]));
  for (const link of links) { neighborIds.get(link.a)!.add(link.b); neighborIds.get(link.b)!.add(link.a); }

  // Relax all layers as one system. Edge springs align connected branches;
  // interval projection keeps same-rank groups from colliding after each step.
  for (let step = 0; step < 100; step++) {
    const forces = new Map<string, number>();
    for (const unit of unitById.values()) {
      const neighbors = [...neighborIds.get(unit.id)!].map(id => unitById.get(id)!).filter(other => other.rank !== unit.rank);
      const targetX = neighbors.length ? neighbors.reduce((sum, other) => sum + other.x, 0) / neighbors.length : (unit.rect.left + unit.rect.right) / 2;
      forces.set(unit.id, (targetX - unit.x) * 0.035 + ((unit.rect.left + unit.rect.right) / 2 - unit.x) * 0.008);
    }
    for (const layer of rankUnits.values()) {
      const sorted = [...layer].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
      for (let i = 0; i < sorted.length; i++) for (let j = i + 1; j < sorted.length; j++) {
        const a = sorted[i]; const b = sorted[j];
        const need = (a.rect.right - a.rect.left + b.rect.right - b.rect.left) / 2 + gapX;
        const delta = b.x - a.x;
        if (delta < need) {
          const push = (need - delta) * 0.12;
          forces.set(a.id, forces.get(a.id)! - push);
          forces.set(b.id, forces.get(b.id)! + push);
        }
      }
    }
    for (const unit of unitById.values()) {
      unit.velocity = unit.velocity * 0.62 + forces.get(unit.id)!;
      unit.x += Math.max(-520, Math.min(520, unit.velocity));
    }
    // Project each rank into non-overlapping measured intervals.
    for (const layer of rankUnits.values()) {
      const sorted = [...layer].sort((a, b) => a.x - b.x || a.id.localeCompare(b.id));
      for (let i = 1; i < sorted.length; i++) {
        const left = sorted[i - 1]; const right = sorted[i];
        const minRightX = left.x + (left.rect.right - left.rect.left + right.rect.right - right.rect.left) / 2 + gapX;
        if (right.x < minRightX) right.x = minRightX;
      }
    }
  }

  const roomTranslations: Record<string, Point> = {};
  const assetTranslations: Record<string, Point> = {};
  for (const unit of unitById.values()) {
    const dx = unit.x - (unit.rect.left + unit.rect.right) / 2;
    const top = rankTop.get(unit.rank) ?? unit.rect.top;
    const dy = top - unit.rect.top;
    if (frameById.has(unit.id)) roomTranslations[unit.id] = [dx, dy];
    for (const assetId of unit.assetIds) assetTranslations[assetId] = [dx, dy];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, assetTranslations, routeBudget: 'quick' });
  const rects = [...unitById.values()].map(unit => {
    const [dx, dy] = assetTranslations[unit.assetIds[0]] ?? [0, 0];
    const left = unit.rect.left + dx; const top = unit.rect.top + dy;
    return { left, top, right: left + unit.rect.right - unit.rect.left, bottom: top + unit.rect.bottom - unit.rect.top };
  });
  return { seed, candidate, roomTranslations, assetTranslations, links, unitCount: unitById.size, rankCount: ranks.length, ranks, projectedBounds: rects.length ? union(rects) : undefined };
}

function union(rects: readonly Rect[]): Rect {
  return { left: Math.min(...rects.map(rect => rect.left)), top: Math.min(...rects.map(rect => rect.top)), right: Math.max(...rects.map(rect => rect.right)), bottom: Math.max(...rects.map(rect => rect.bottom)) };
}
