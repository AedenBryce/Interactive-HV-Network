import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { TopDownRoomPlacement } from './top-down-room-placement';
import type { SwitchroomFrame } from './switchroom-frames';
import type { WholeNetworkTreeEdge } from './whole-network-room-layout';

export type AnchoredRoomPlacementResult = {
  placement: TopDownRoomPlacement;
  applied: boolean;
  anchoredRoomIds: string[];
  reason?: 'no-feeder-anchors' | 'frame-collision';
};

/**
 * Derive a desired frame-center x for each receiving room from its actual
 * selected-tree feeder terminals. The room's current receiving-terminal
 * offset from frame center is preserved, so the feeder endpoint itself is
 * aimed at the source column rather than merely centering the box there.
 */
export function deriveIncomingRoomCenterAnchors(
  model: NetworkModel,
  layout: DiagramLayout,
  frames: readonly SwitchroomFrame[],
  basePlacement: TopDownRoomPlacement,
  roomOwnerByAssetId: ReadonlyMap<string, string>,
  treeEdges: readonly WholeNetworkTreeEdge[],
): Map<string, number> {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const frameById = new Map(frames.map(frame => [frame.id, frame]));
  const anchorsByRoom = new Map<string, number[]>();

  for (const edge of treeEdges) {
    const parentRoomId = roomOwnerByAssetId.get(edge.parentAssetId);
    const childRoomId = roomOwnerByAssetId.get(edge.childAssetId);
    if (!parentRoomId || !childRoomId || parentRoomId === childRoomId) continue;
    const frame = frameById.get(childRoomId);
    const parentFrame = frameById.get(parentRoomId);
    const connection = model.connections.find(item => item.id === edge.id);
    const parentAsset = assetById.get(edge.parentAssetId);
    if (!frame || !connection || !parentAsset) continue;

    const sourceTerminalId = parentAsset.terminals.includes(connection.from) ? connection.from
      : parentAsset.terminals.includes(connection.to) ? connection.to
        : undefined;
    const receivingTerminalId = sourceTerminalId === connection.from ? connection.to
      : sourceTerminalId === connection.to ? connection.from
        : undefined;
    if (!sourceTerminalId || !receivingTerminalId) continue;

    const source = layout.terminals[sourceTerminalId];
    const receiving = layout.terminals[receivingTerminalId];
    if (!source || !receiving) continue;

    // `layout` and `frames` still hold the pre-application geometry here, but
    // `basePlacement` will move both endpoint rooms before the row anchor is
    // applied. Preserve that actual baseline placement on each side of the
    // feeder before calculating the final center target.
    const parentCurrentX = parentFrame?.x;
    const parentPlacedX = basePlacement.positions[parentRoomId]?.x;
    const parentBaseDeltaX = parentCurrentX !== undefined && parentPlacedX !== undefined
      ? parentPlacedX - parentCurrentX
      : 0;
    const childPlacedX = basePlacement.positions[childRoomId]?.x ?? frame.x;
    const childBaseDeltaX = childPlacedX - frame.x;
    const placedSourceX = source[0] + parentBaseDeltaX;
    const placedReceivingX = receiving[0] + childBaseDeltaX;
    const placedFrameCenter = childPlacedX + frame.width / 2;
    const receivingOffsetAfterBasePlacement = placedReceivingX - placedFrameCenter;
    const desiredCenter = placedSourceX - receivingOffsetAfterBasePlacement;
    anchorsByRoom.set(childRoomId, [...(anchorsByRoom.get(childRoomId) ?? []), desiredCenter]);
  }

  return new Map([...anchorsByRoom].map(([roomId, anchors]) => [
    roomId,
    anchors.reduce((sum, value) => sum + value, 0) / anchors.length,
  ]));
}

/**
 * Repack each already-planned top-down row around measured feeder-column
 * anchors. Unanchored rooms keep their current centers as soft targets. The
 * least-squares isotonic pack preserves left-to-right order and enforces
 * non-overlap with the chosen horizontal gap. If rows overlap vertically
 * after repacking, the original placement is returned unchanged.
 */
export function applyIncomingRoomAnchorCandidate(
  frames: readonly Pick<SwitchroomFrame, 'id' | 'width' | 'height'>[],
  placement: TopDownRoomPlacement,
  centerAnchorXByRoom: ReadonlyMap<string, number>,
  horizontalGap = 640,
): AnchoredRoomPlacementResult {
  if (!centerAnchorXByRoom.size) {
    return { placement, applied: false, anchoredRoomIds: [], reason: 'no-feeder-anchors' };
  }

  const frameById = new Map(frames.map(frame => [frame.id, frame]));
  const rows = new Map<string, string[]>();
  for (const [id, position] of Object.entries(placement.positions)) {
    if (!frameById.has(id)) continue;
    const key = `${position.layer}:${position.row}:${position.y}`;
    rows.set(key, [...(rows.get(key) ?? []), id]);
  }

  const nextPositions = { ...placement.positions };
  for (const ids of rows.values()) {
    const entries = ids.map(id => {
      const frame = frameById.get(id)!;
      const position = placement.positions[id];
      const currentCenter = position.x + frame.width / 2;
      return {
        id,
        width: frame.width,
        targetCenter: centerAnchorXByRoom.get(id) ?? currentCenter,
      };
    }).sort((a, b) => a.targetCenter - b.targetCenter || a.id.localeCompare(b.id));

    const leftEdges = isotonicPack(entries.map(({ targetCenter, width }) => targetCenter - width / 2), entries.map(item => item.width), horizontalGap);
    entries.forEach((entry, index) => {
      nextPositions[entry.id] = { ...placement.positions[entry.id], x: leftEdges[index] };
    });
  }

  if (hasFrameCollision(frames, nextPositions)) {
    return {
      placement,
      applied: false,
      anchoredRoomIds: [...centerAnchorXByRoom.keys()].filter(id => !!placement.positions[id]).sort(),
      reason: 'frame-collision',
    };
  }

  return {
    placement: { ...placement, positions: nextPositions },
    applied: true,
    anchoredRoomIds: [...centerAnchorXByRoom.keys()].filter(id => !!nextPositions[id]).sort(),
  };
}

function isotonicPack(targetLeftEdges: number[], widths: number[], gap: number): number[] {
  const blocks: { start: number; end: number; sum: number; weight: number }[] = [];
  let offset = 0;
  for (let index = 0; index < targetLeftEdges.length; index++) {
    blocks.push({ start: index, end: index, sum: targetLeftEdges[index] - offset, weight: 1 });
    while (blocks.length > 1) {
      const right = blocks.at(-1)!;
      const left = blocks.at(-2)!;
      if (left.sum / left.weight <= right.sum / right.weight) break;
      blocks.splice(-2, 2, {
        start: left.start,
        end: right.end,
        sum: left.sum + right.sum,
        weight: left.weight + right.weight,
      });
    }
    offset += widths[index] + gap;
  }

  const result = Array<number>(targetLeftEdges.length);
  offset = 0;
  for (const block of blocks) {
    const fitted = block.sum / block.weight;
    for (let index = block.start; index <= block.end; index++) {
      result[index] = fitted + offset;
      offset += widths[index] + gap;
    }
  }
  return result;
}

function hasFrameCollision(
  frames: readonly Pick<SwitchroomFrame, 'id' | 'width' | 'height'>[],
  positions: TopDownRoomPlacement['positions'],
): boolean {
  const placed = frames.flatMap(frame => {
    const position = positions[frame.id];
    return position ? [{ id: frame.id, x: position.x, y: position.y, width: frame.width, height: frame.height }] : [];
  });
  for (let i = 0; i < placed.length; i++) for (let j = i + 1; j < placed.length; j++) {
    const a = placed[i];
    const b = placed[j];
    if (a.x < b.x + b.width && a.x + a.width > b.x
      && a.y < b.y + b.height && a.y + a.height > b.y) return true;
  }
  return false;
}
