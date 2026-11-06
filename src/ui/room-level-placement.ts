import {
  roomPlacementAdjacencies,
  roomPlacementPlan,
  type RoomFrameId,
  type RoomPlacementNode,
} from './room-placement-plan';

export type RoomDimensions = {
  id: string;
  width: number;
  height: number;
};

export type RoomPosition = {
  x: number;
  y: number;
  layer: number;
};

export type UnplacedRoom = {
  id: string;
  reason: 'unconfirmed-parent' | 'missing-parent' | 'cyclic-parent' | 'missing-dimensions';
  parentIds: string[];
};

export type RoomLevelPlacement = {
  positions: Readonly<Record<string, RoomPosition>>;
  unplaced: readonly UnplacedRoom[];
};

export type RoomLevelPlacementOptions = {
  horizontalGap?: number;
  verticalGap?: number;
  plan?: Readonly<Record<RoomFrameId, RoomPlacementNode>>;
  adjacentPairs?: readonly { from: RoomFrameId; to: RoomFrameId }[];
};

/**
 * Places rooms from explicit, confirmed parent edges only. Rooms with an
 * unconfirmed or unavailable parent are reported and left unplaced; they are
 * never assigned a guessed root or supply relationship.
 *
 * Coordinates are top-left positions in a presentation plane. This helper
 * does not place equipment or route conductors between rooms.
 */
export function placeRoomsByConfirmedParents(
  dimensions: readonly RoomDimensions[],
  options: RoomLevelPlacementOptions = {},
): RoomLevelPlacement {
  const horizontalGap = options.horizontalGap ?? 240;
  const verticalGap = options.verticalGap ?? 360;
  const plan = options.plan ?? roomPlacementPlan;
  const adjacentPairs = options.adjacentPairs ?? roomPlacementAdjacencies;
  const byId = new Map(dimensions.map(room => [room.id, room]));
  const positions: Record<string, RoomPosition> = {};
  const unplaced: UnplacedRoom[] = [];
  const levels = new Map<string, number>();
  const remaining = new Set(dimensions.map(room => room.id));
  const reported = new Set<string>();

  const nodeFor = (id: string) => plan[id as RoomFrameId];
  const report = (id: string, reason: UnplacedRoom['reason'], parentIds: string[]) => {
    if (reported.has(id)) return;
    unplaced.push({ id, reason, parentIds: [...parentIds].sort() });
    reported.add(id);
  };

  for (const room of dimensions) {
    if (!Number.isFinite(room.width) || !Number.isFinite(room.height) || room.width <= 0 || room.height <= 0) {
      report(room.id, 'missing-dimensions', []);
      remaining.delete(room.id);
    }
  }

  // Resolve levels in parent-first waves. Supply anchors are explicit external
  // roots and do not need room coordinates.
  while (remaining.size > 0) {
    let progressed = false;
    for (const id of [...remaining]) {
      const node = nodeFor(id);
      if (!node || node.topology !== 'owner-confirmed') {
        report(id, 'unconfirmed-parent', node?.parents.filter(parent => parent.kind === 'room').map(parent => parent.id) ?? []);
        remaining.delete(id);
        continue;
      }
      const roomParents = node.parents.filter(parent => parent.kind === 'room');
      const unresolvedParents = roomParents.filter(parent => !byId.has(parent.id) || !levels.has(parent.id));
      const blockedParents = unresolvedParents.filter(parent => {
        const parentNode = nodeFor(parent.id);
        return !byId.has(parent.id) || !parentNode || parentNode.topology !== 'owner-confirmed' || reported.has(parent.id);
      });
      if (blockedParents.length) {
        report(id, blockedParents.some(parent => !byId.has(parent.id)) ? 'missing-parent' : 'unconfirmed-parent', blockedParents.map(parent => parent.id));
        remaining.delete(id);
        continue;
      }
      if (unresolvedParents.length) continue;

      const parentLevels = roomParents.map(parent => levels.get(parent.id)!);
      levels.set(id, parentLevels.length ? Math.max(...parentLevels) + 1 : 0);
      remaining.delete(id);
      progressed = true;
    }
    if (!progressed) {
      // Any nodes left depend on one another cyclically or on an unplaceable
      // chain. Report the declared parents without trying to break the cycle.
      for (const id of remaining) {
        const roomParents = nodeFor(id)?.parents.filter(parent => parent.kind === 'room').map(parent => parent.id) ?? [];
        report(id, 'cyclic-parent', roomParents);
      }
      remaining.clear();
    }
  }

  const layerNumbers = [...new Set(levels.values())].sort((a, b) => a - b);
  let y = 0;
  for (const layer of layerNumbers) {
    const ids = [...levels].filter(([, level]) => level === layer).map(([id]) => id);
    const layerGroups = orderLayer(ids, plan, adjacentPairs);
    let x = 0;
    let layerHeight = 0;
    for (const group of layerGroups) {
      for (const id of group) {
        const room = byId.get(id)!;
        positions[id] = { x, y, layer };
        x += room.width + horizontalGap;
        layerHeight = Math.max(layerHeight, room.height);
      }
    }
    y += layerHeight + verticalGap;
  }

  return { positions, unplaced };
}

function orderLayer(
  ids: string[],
  plan: Readonly<Record<RoomFrameId, RoomPlacementNode>>,
  adjacentPairs: readonly { from: RoomFrameId; to: RoomFrameId }[],
): string[][] {
  const layerIds = new Set(ids);
  const grouped = new Set<string>();
  const groups: { order: number; firstIndex: number; ids: string[] }[] = [];
  const sourceIndex = new Map(ids.map((id, index) => [id, index]));
  const branchOrder = (id: string) => {
    const parents = plan[id as RoomFrameId]?.parents ?? [];
    return parents.length ? Math.min(...parents.map(parent => parent.order)) : 0;
  };

  for (const pair of adjacentPairs) {
    if (!layerIds.has(pair.from) || !layerIds.has(pair.to)) continue;
    groups.push({
      order: Math.min(branchOrder(pair.from), branchOrder(pair.to)),
      firstIndex: Math.min(sourceIndex.get(pair.from)!, sourceIndex.get(pair.to)!),
      ids: [pair.from, pair.to],
    });
    grouped.add(pair.from);
    grouped.add(pair.to);
  }
  for (const id of ids) {
    if (grouped.has(id)) continue;
    groups.push({ order: branchOrder(id), firstIndex: sourceIndex.get(id)!, ids: [id] });
  }
  groups.sort((a, b) => a.order - b.order || a.firstIndex - b.firstIndex || a.ids[0].localeCompare(b.ids[0]));
  return groups.map(group => group.ids);
}
