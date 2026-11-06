import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { AssetLabel, Point } from './diagram-geometry';
import { cutsBox } from './diagram-geometry';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { SwitchroomFrame } from './switchroom-frames';

type Bounds = Pick<AssetLabel, 'x' | 'y' | 'width' | 'height'>;
const overlaps = (a: Bounds, b: Bounds) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
const cardBounds = (asset: Asset, position: Point, label: AssetLabel) => {
  const card = deviceCard(asset, position, label);
  return { x: position[0] + card.x, y: position[1] + card.y, width: card.width, height: card.height };
};

// Keep labels readable at the whole-network scale. Labels may move around their
// own symbol, but remain inside their switchroom frame and clear of every wire,
// other label, and unrelated symbol.
export function resolveAssetLabels(assets: Asset[], layout: DiagramLayout, labels: Map<string, AssetLabel>, routes: Map<string, Point[]>, frames: SwitchroomFrame[], hidden: Set<string>) {
  const roomOf = new Map(frames.flatMap(frame => frame.assetIds.map(id => [id, frame] as const)));
  const symbols = assets.filter(asset => !hidden.has(asset.id)).map(asset => ({ id: asset.id, x: layout.assets[asset.id][0] - 44, y: layout.assets[asset.id][1] - 44, width: 88, height: 88 }));
  const segments = [...routes.values()].flatMap(points => points.slice(1).map((to, i) => ({ from: points[i], to })));
  const candidatesFor = (asset: Asset, original: AssetLabel) => {
    const [x, y] = layout.assets[asset.id]; const { width, height } = original;
    const gap = 88;
    const placements: [number, number][] = [
      [x + gap, y - height / 2], [x - width - gap, y - height / 2],
      [x - width / 2, y - height - gap], [x - width / 2, y + gap],
      [x + gap, y - height - 24], [x - width - gap, y - height - 24],
      [x + gap, y + 24], [x - width - gap, y + 24],
      [x + gap, y - height - 180], [x - width - gap, y - height - 180],
      [x + gap, y + 180], [x - width - gap, y + 180],
      [x + 260, y - height / 2], [x - width - 260, y - height / 2],
      [x - width / 2, y - height - 260], [x - width / 2, y + 260],
      [x - width / 2, y - height - 360], [x - width / 2, y + 360],
      [x + 360, y - height / 2], [x - width - 360, y - height / 2],
    ];
    const seen = new Set<string>();
    const result: AssetLabel[] = [{ ...original }];
    seen.add(`${original.x}/${original.y}`);
    result.push(...placements.flatMap(([left, top]) => {
      const key = `${left}/${top}`;
      if (seen.has(key)) return [];
      seen.add(key);
      return [{ ...original, x: left, y: top }];
    }));
    return result;
  };
  const nearbyCandidatesFor = (original: AssetLabel) => {
    // The coarse symbol-relative candidates can leave a label sitting a few
    // units across a wire or neighbouring symbol. When that happens, search
    // small deterministic offsets around its current position before keeping
    // a known collision. This keeps labels close to their assets and avoids
    // moving room geometry just to clear a label edge.
    const offsets = [24, 48, 96, 192, 384, 768];
    return offsets.flatMap(offset => [
      { ...original, x: original.x - offset },
      { ...original, x: original.x + offset },
      { ...original, y: original.y - offset },
      { ...original, y: original.y + offset },
    ]);
  };
  const ordered = [...assets].filter(asset => !hidden.has(asset.id) && labels.has(asset.id)).sort((a, b) => {
    const aa = labels.get(a.id)!; const bb = labels.get(b.id)!;
    return (bb.width * bb.height) - (aa.width * aa.height) || a.id.localeCompare(b.id);
  });
  const assetsById = new Map(assets.map(asset => [asset.id, asset]));
  for (let pass = 0; pass < 3; pass++) for (const asset of ordered) {
    const current = labels.get(asset.id)!;
    const room = roomOf.get(asset.id);
    const score = (candidate: AssetLabel) => {
      if (room && (candidate.x < room.x + 14 || candidate.y < room.y + 14 || candidate.x + candidate.width > room.x + room.width - 14 || candidate.y + candidate.height > room.y + room.height - 14)) return Number.POSITIVE_INFINITY;
      const candidateCard = hasDeviceCard(asset) ? cardBounds(asset, layout.assets[asset.id], candidate) : undefined;
      if (room && candidateCard && (candidateCard.x < room.x + 8 || candidateCard.y < room.y + 8 || candidateCard.x + candidateCard.width > room.x + room.width - 8 || candidateCard.y + candidateCard.height > room.y + room.height - 8)) return Number.POSITIVE_INFINITY;
      let cost = Math.abs(candidate.x - current.x) + Math.abs(candidate.y - current.y);
      for (const segment of segments) if (cutsBox(segment.from, segment.to, candidate)) cost += 1e12;
      for (const [id, other] of labels) {
        if (id !== asset.id && !hidden.has(id) && overlaps(candidate, other)) cost += 1e11;
        if (id === asset.id || hidden.has(id)) continue;
        const otherAsset = assetsById.get(id)!;
        const otherCard = hasDeviceCard(otherAsset) ? cardBounds(otherAsset, layout.assets[id], other) : undefined;
        if (candidateCard && overlaps(candidateCard, other)) cost += 1e11;
        if (otherCard && overlaps(candidate, otherCard)) cost += 1e11;
        if (candidateCard && otherCard && overlaps(candidateCard, otherCard)) cost += 1e11;
      }
      for (const symbol of symbols) {
        if (symbol.id === asset.id || candidate.x >= symbol.x + symbol.width || candidate.x + candidate.width <= symbol.x || candidate.y >= symbol.y + symbol.height || candidate.y + candidate.height <= symbol.y) continue;
        cost += 1e10;
      }
      if (candidateCard) for (const symbol of symbols) {
        if (symbol.id === asset.id || candidateCard.x >= symbol.x + symbol.width || candidateCard.x + candidateCard.width <= symbol.x || candidateCard.y >= symbol.y + symbol.height || candidateCard.y + candidateCard.height <= symbol.y) continue;
        cost += 1e10;
      }
      return cost;
    };
    const currentScore = score(current);
    const candidates = candidatesFor(asset, current);
    if (currentScore >= 1e10) candidates.push(...nearbyCandidatesFor(current));
    const best = candidates.reduce((selected, candidate) => score(candidate) < score(selected) ? candidate : selected);
    labels.set(asset.id, best);
  }
}
