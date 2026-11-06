import type { AssetLabel, Point } from './diagram-geometry';
import type { SwitchroomFrame } from './switchroom-frames';
import type { WholeNetworkTreeEdge } from './whole-network-room-layout';

export type TopologyRoomPlacement = {
  positions: Record<string, { x: number; y: number; layer: number }>;
  roots: string[];
  parentByRoom: Record<string, string>;
  bounds: { width: number; height: number };
};

/** A diagram-only room-tree packer for testing parent/child frame adjacency. */
export function planTopologyRoomTree(
  frames: readonly Pick<SwitchroomFrame, 'id' | 'x' | 'y' | 'width' | 'height' | 'memberAssetIds'>[],
  treeEdges: readonly WholeNetworkTreeEdge[],
  options: { horizontalGap?: number; verticalGap?: number; maxRowWidth?: number } = {},
): TopologyRoomPlacement {
  const hGap = options.horizontalGap ?? 1_000;
  const vGap = options.verticalGap ?? 1_000;
  const maxRowWidth = options.maxRowWidth ?? 30_000;
  const roomByAsset = new Map(frames.flatMap(frame => frame.memberAssetIds.map(id => [id, frame.id] as const)));
  const parent = new Map<string, string>();
  const order = new Map<string, number>();
  for (const edge of treeEdges) {
    const from = roomByAsset.get(edge.parentAssetId);
    const to = roomByAsset.get(edge.childAssetId);
    if (!from || !to || from === to || parent.has(to)) continue;
    parent.set(to, from);
    order.set(to, order.size);
  }
  // Break any malformed room-level cycle without changing the underlying
  // network: the omitted parent is only a layout edge.
  for (const id of parent.keys()) {
    const seen = new Set<string>([id]);
    let current = parent.get(id);
    while (current) {
      if (seen.has(current)) { parent.delete(id); break; }
      seen.add(current);
      current = parent.get(current);
    }
  }
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  for (const [child, parentId] of parent) children.get(parentId)?.push(child);
  for (const ids of children.values()) ids.sort((a, b) => order.get(a)! - order.get(b)! || a.localeCompare(b));
  const byId = new Map(frames.map(frame => [frame.id, frame]));
  const sizes = new Map<string, { width: number; height: number }>();
  const measure = (id: string): { width: number; height: number } => {
    const frame = byId.get(id)!;
    const kids = children.get(id)!;
    const childSizes = kids.map(measure);
    const kidsWidth = childSizes.reduce((sum, item) => sum + item.width, 0) + Math.max(0, kids.length - 1) * hGap;
    const width = Math.max(frame.width, kidsWidth);
    const height = frame.height + (kids.length ? vGap + Math.max(...childSizes.map(item => item.height)) : 0);
    const size = { width, height };
    sizes.set(id, size);
    return size;
  };
  const roots = frames.map(frame => frame.id).filter(id => !parent.has(id)).sort((a, b) => {
    const fa = byId.get(a)!; const fb = byId.get(b)!;
    return fa.x - fb.x || fa.y - fb.y || a.localeCompare(b);
  });
  roots.forEach(measure);
  const positions: TopologyRoomPlacement['positions'] = {};
  const place = (id: string, left: number, top: number, layer: number) => {
    const frame = byId.get(id)!;
    const size = sizes.get(id)!;
    const x = left + (size.width - frame.width) / 2;
    positions[id] = { x, y: top, layer };
    const ids = children.get(id)!;
    const childWidth = ids.reduce((sum, child) => sum + sizes.get(child)!.width, 0) + Math.max(0, ids.length - 1) * hGap;
    let cursor = left + (size.width - childWidth) / 2;
    const childTop = top + frame.height + vGap;
    for (const child of ids) {
      place(child, cursor, childTop, layer + 1);
      cursor += sizes.get(child)!.width + hGap;
    }
  };
  let cursorX = 0; let cursorY = 0; let rowHeight = 0;
  const placedBounds: { x: number; y: number; width: number; height: number }[] = [];
  for (const root of roots) {
    const size = sizes.get(root)!;
    if (cursorX > 0 && cursorX + size.width > maxRowWidth) {
      cursorX = 0; cursorY += rowHeight + vGap; rowHeight = 0;
    }
    place(root, cursorX, cursorY, 0);
    placedBounds.push({ x: cursorX, y: cursorY, ...size });
    cursorX += size.width + hGap;
    rowHeight = Math.max(rowHeight, size.height);
  }
  const bounds = {
    width: Math.max(0, ...placedBounds.map(item => item.x + item.width)),
    height: Math.max(0, ...placedBounds.map(item => item.y + item.height)),
  };
  return { positions, roots, parentByRoom: Object.fromEntries(parent), bounds };
}

/** Apply the experimental room positions to room-owned display geometry only. */
export function applyTopologyRoomTreeCandidate(
  frames: SwitchroomFrame[],
  placement: TopologyRoomPlacement,
  assets: Record<string, Point>,
  terminals: Record<string, Point>,
  terminalsByAsset: ReadonlyMap<string, readonly string[]>,
  roomOwnerByAssetId: ReadonlyMap<string, string>,
  labels: Map<string, AssetLabel>,
): void {
  for (const frame of frames) {
    const target = placement.positions[frame.id];
    if (!target) continue;
    const dx = target.x - frame.x; const dy = target.y - frame.y;
    const ownedIds = new Set([
      ...frame.memberAssetIds,
      ...[...roomOwnerByAssetId].filter(([, owner]) => owner === frame.id).map(([id]) => id),
    ]);
    for (const id of ownedIds) {
      const position = assets[id];
      if (position) assets[id] = [position[0] + dx, position[1] + dy];
      for (const terminalId of terminalsByAsset.get(id) ?? []) {
        const point = terminals[terminalId];
        if (point) terminals[terminalId] = [point[0] + dx, point[1] + dy];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
    }
    frame.x = target.x; frame.y = target.y;
  }
}
