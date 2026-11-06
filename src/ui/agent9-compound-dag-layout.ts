import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import type { Point } from './diagram-geometry';

type RoomNode = {
  id: string;
  width: number;
  height: number;
  seedX: number;
  parents: string[];
  rank: number;
};
type RowBox = { id: string; x: number; y: number; width: number; height: number; centerX: number };

/**
 * Trial 9: compound DAG constraints. Room frames are indivisible supernodes;
 * explicit room-parent arcs set top-down ranks, while all real cross-room
 * connections contribute weighted horizontal alignment. Room centers are
 * fitted by a one-dimensional isotonic projection with hard non-overlap gaps.
 */
export function layoutAgent9CompoundDag(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const frameById = new Map(seed.frames.map(frame => [frame.id, frame] as const));
  const nodes: RoomNode[] = seed.frames.map(frame => ({
    id: frame.id,
    width: frame.width,
    height: frame.height,
    seedX: frame.x + frame.width / 2,
    parents: seed.safePlan[frame.id]?.parents.filter(parent => parent.kind === 'room' && frameById.has(parent.id)).map(parent => parent.id) ?? [],
    rank: 0,
  }));
  const byId = new Map(nodes.map(node => [node.id, node] as const));
  let remaining = new Set(nodes.map(node => node.id));
  while (remaining.size) {
    let progressed = false;
    for (const id of [...remaining]) {
      const node = byId.get(id)!;
      if (node.parents.every(parent => !remaining.has(parent))) {
        node.rank = node.parents.length ? Math.max(...node.parents.map(parent => byId.get(parent)!.rank)) + 1 : 0;
        remaining.delete(id);
        progressed = true;
      }
    }
    if (!progressed) {
      // Defensive cycle handling: keep unresolved room-parent arcs from
      // preventing a deterministic view; cyclic members become explicit roots.
      for (const id of remaining) { byId.get(id)!.parents = []; byId.get(id)!.rank = 0; }
      remaining.clear();
    }
  }

  const weights = new Map(nodes.map(node => [node.id, new Map<string, number>()] as const));
  const connect = (a: string | undefined, b: string | undefined, weight: number) => {
    if (!a || !b || a === b || !weights.has(a) || !weights.has(b)) return;
    weights.get(a)!.set(b, (weights.get(a)!.get(b) ?? 0) + weight);
    weights.get(b)!.set(a, (weights.get(b)!.get(a) ?? 0) + weight);
  };
  for (const node of nodes) for (const parent of node.parents) connect(node.id, parent, 8);
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const connection of model.connections) {
    const fromAsset = ownerByTerminal.get(connection.from); const toAsset = ownerByTerminal.get(connection.to);
    const from = fromAsset ? seed.roomOwnerByAsset.get(fromAsset) : undefined;
    const to = toAsset ? seed.roomOwnerByAsset.get(toAsset) : undefined;
    connect(from, to, base.treeEdgeIds.has(connection.id) ? 1 : 2.5);
  }
  const layers = [...new Set(nodes.map(node => node.rank))].sort((a, b) => a - b);
  const ordered = new Map<number, string[]>(layers.map(rank => [rank, nodes.filter(node => node.rank === rank).sort((a, b) => a.seedX - b.seedX || a.id.localeCompare(b.id)).map(node => node.id)]));
  let boxes = new Map<string, RowBox>();
  const targetX = (id: string, positions: ReadonlyMap<string, RowBox>, direction: 'down' | 'up') => {
    const node = byId.get(id)!;
    const graphNeighbors = [...(weights.get(id) ?? [])].flatMap(([other, weight]) => {
      const otherNode = byId.get(other)!;
      const included = direction === 'down' ? otherNode.rank < node.rank : otherNode.rank > node.rank;
      const box = positions.get(other);
      return included && box ? [[box.centerX, weight] as const] : [];
    });
    const graphTotal = graphNeighbors.reduce((sum, [, weight]) => sum + weight, 0);
    const graphMean = graphTotal ? graphNeighbors.reduce((sum, [x, weight]) => sum + x * weight, 0) / graphTotal : node.seedX;
    const parentBoxes = node.parents.flatMap(parent => positions.has(parent) ? [positions.get(parent)!.centerX] : []);
    const childBoxes = [...nodes].filter(child => child.parents.includes(id)).flatMap(child => positions.has(child.id) ? [positions.get(child.id)!.centerX] : []);
    const vertical = direction === 'down' ? parentBoxes : childBoxes;
    const verticalMean = vertical.length ? vertical.reduce((sum, x) => sum + x, 0) / vertical.length : node.seedX;
    return verticalMean * 0.68 + graphMean * 0.22 + node.seedX * 0.10;
  };

  const place = () => {
    const placed = new Map<string, RowBox>();
    let cursorY = 0;
    for (const rank of layers) {
      const ids = ordered.get(rank) ?? [];
      const rows: string[][] = [];
      let row: string[] = []; let rowWidth = 0;
      for (const id of ids) {
        const node = byId.get(id)!;
        const needed = (row.length ? 680 : 0) + node.width;
        if (row.length && rowWidth + needed > 30_000) { rows.push(row); row = []; rowWidth = 0; }
        row.push(id); rowWidth += (row.length > 1 ? 680 : 0) + node.width;
      }
      if (row.length) rows.push(row);
      let y = cursorY;
      for (const currentRow of rows) {
        const targetLeft = currentRow.map(id => targetX(id, placed, 'down') - byId.get(id)!.width / 2);
        const fitted = isotonicWithSpacing(targetLeft, currentRow.map(id => byId.get(id)!.width), 680);
        const rowHeight = Math.max(...currentRow.map(id => byId.get(id)!.height));
        currentRow.forEach((id, index) => {
          const node = byId.get(id)!; const x = fitted[index];
          placed.set(id, { id, x, y, width: node.width, height: node.height, centerX: x + node.width / 2 });
        });
        y += rowHeight + 760;
      }
      cursorY = y + 800;
    }
    return placed;
  };

  // Alternate down/up barycentric sweeps, but respect hard rank constraints.
  for (let pass = 0; pass < 8; pass++) {
    boxes = place();
    const ranks = pass % 2 ? [...layers].reverse() : [...layers];
    for (const rank of ranks) {
      const current = ordered.get(rank)!;
      current.sort((a, b) => targetX(a, boxes, pass % 2 ? 'up' : 'down') - targetX(b, boxes, pass % 2 ? 'up' : 'down')
        || byId.get(a)!.seedX - byId.get(b)!.seedX || a.localeCompare(b));
    }
  }
  boxes = place();
  const roomTranslations: Record<string, Point> = {};
  for (const frame of seed.frames) {
    const target = boxes.get(frame.id)!;
    const originalFrame = base.panels.find(item => item.id === frame.id);
    const seededDelta: Point = originalFrame ? [frame.x - originalFrame.x, frame.y - originalFrame.y] : [0, 0];
    roomTranslations[frame.id] = [seededDelta[0] + target.x - frame.x, seededDelta[1] + target.y - frame.y];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, routeBudget: 'quick' });
  const bounds = union([...boxes.values()].map(box => ({ left: box.x, top: box.y, right: box.x + box.width, bottom: box.y + box.height })));
  return {
    candidate,
    seed,
    roomTranslations,
    roomOrder: Object.fromEntries([...ordered].map(([rank, ids]) => [rank, [...ids]])),
    rankByRoom: Object.fromEntries(nodes.map(node => [node.id, node.rank])),
    constraintBounds: { x: bounds.left, y: bounds.top, width: bounds.right - bounds.left, height: bounds.bottom - bounds.top },
    determinismKey: [...boxes.values()].map(box => `${box.id}:${box.x}:${box.y}`).join('|'),
  };
}

/** Weighted pool-adjacent-violators projection for left edges with widths. */
function isotonicWithSpacing(desiredLeft: readonly number[], widths: readonly number[], gap: number) {
  const offsets: number[] = []; let offset = 0;
  for (let index = 0; index < widths.length; index++) {
    offsets.push(offset);
    offset += widths[index] + gap;
  }
  const blocks: { start: number; end: number; sum: number; weight: number }[] = [];
  for (let index = 0; index < desiredLeft.length; index++) {
    const value = desiredLeft[index] - offsets[index];
    blocks.push({ start: index, end: index, sum: value, weight: 1 });
    while (blocks.length > 1) {
      const a = blocks[blocks.length - 2]; const b = blocks[blocks.length - 1];
      if (a.sum / a.weight <= b.sum / b.weight) break;
      blocks.splice(-2, 2, { start: a.start, end: b.end, sum: a.sum + b.sum, weight: a.weight + b.weight });
    }
  }
  const values = new Array<number>(desiredLeft.length);
  for (const block of blocks) for (let index = block.start; index <= block.end; index++) values[index] = block.sum / block.weight + offsets[index];
  return values;
}

function union(rects: readonly { left: number; top: number; right: number; bottom: number }[]) {
  return { left: Math.min(...rects.map(rect => rect.left)), top: Math.min(...rects.map(rect => rect.top)), right: Math.max(...rects.map(rect => rect.right)), bottom: Math.max(...rects.map(rect => rect.bottom)) };
}
