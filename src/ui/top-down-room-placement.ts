/**
 * Deterministic, presentation-only placement for room-level network diagrams.
 * The planner follows only the supplied confirmed parent relationships. It
 * does not infer a supply route from room names, drawing order, or geometry.
 */
export type TopDownRoomParent = {
  kind: 'room' | 'supply-anchor';
  id: string;
  order: number;
  route: string;
};

export type TopDownRoomPlan = Readonly<Record<string, {
  topology: 'owner-confirmed' | 'presentation-tree' | 'unconfirmed';
  parents: readonly TopDownRoomParent[];
}>>;

export type TopDownRoomDimensions = {
  id: string;
  width: number;
  height: number;
};

export type TopDownRoomPosition = {
  x: number;
  y: number;
  layer: number;
  row: number;
  parentIds: string[];
};

export type UnplacedTopDownRoom = {
  id: string;
  reason: 'unconfirmed-parent' | 'missing-parent' | 'cyclic-parent' | 'missing-dimensions';
  parentIds: string[];
};

export type TopDownRoomPlacement = {
  positions: Readonly<Record<string, TopDownRoomPosition>>;
  unplaced: readonly UnplacedTopDownRoom[];
};

export type TopDownRoomPlacementOptions = {
  horizontalGap?: number;
  verticalGap?: number;
  maxRoomsPerRow?: number;
  maxRowWidth?: number;
  origin?: { x: number; y: number };
  plan?: TopDownRoomPlan;
  adjacentPairs?: readonly { from: string; to: string }[];
};

type RoomUnit = {
  ids: string[];
  order: number;
  firstIndex: number;
  width: number;
  height: number;
  parentIds: string[];
  layer: number;
};

/** Place confirmed room trees top-down, wrapping broad sibling rows. */
export function placeTopDownRooms(
  dimensions: readonly TopDownRoomDimensions[],
  options: TopDownRoomPlacementOptions = {},
): TopDownRoomPlacement {
  const horizontalGap = options.horizontalGap ?? 240;
  const verticalGap = options.verticalGap ?? 360;
  const maxRoomsPerRow = Math.max(1, Math.floor(options.maxRoomsPerRow ?? 4));
  const maxRowWidth = options.maxRowWidth ?? 16_000;
  const origin = options.origin ?? { x: 0, y: 0 };
  const plan = options.plan ?? {};
  const adjacentPairs = options.adjacentPairs ?? [];
  const byId = new Map<string, TopDownRoomDimensions>();
  const inputOrder = new Map<string, number>();
  for (const [index, room] of dimensions.entries()) {
    if (byId.has(room.id)) throw new Error(`Duplicate room dimensions: ${room.id}`);
    byId.set(room.id, room);
    inputOrder.set(room.id, index);
  }

  const positions: Record<string, TopDownRoomPosition> = {};
  const unplacedById = new Map<string, UnplacedTopDownRoom>();
  const levels = new Map<string, number>();
  const remaining = new Set(dimensions.map(room => room.id));
  const report = (id: string, reason: UnplacedTopDownRoom['reason'], parentIds: string[]) => {
    if (!unplacedById.has(id)) unplacedById.set(id, { id, reason, parentIds: [...new Set(parentIds)].sort() });
    remaining.delete(id);
  };

  for (const room of dimensions) {
    if (!Number.isFinite(room.width) || !Number.isFinite(room.height) || room.width <= 0 || room.height <= 0) {
      report(room.id, 'missing-dimensions', []);
    }
  }

  // Resolve hierarchy depths from explicit room parents. Supply anchors are
  // external roots and do not need to appear as rooms in this input.
  while (remaining.size) {
    let progressed = false;
    for (const id of [...remaining]) {
      const node = plan[id];
      if (!node || node.topology === 'unconfirmed') {
        report(id, 'unconfirmed-parent', node?.parents.filter(parent => parent.kind === 'room').map(parent => parent.id) ?? []);
        progressed = true;
        continue;
      }
      const roomParents = node.parents.filter(parent => parent.kind === 'room');
      const missingParents = roomParents.filter(parent => !byId.has(parent.id));
      if (missingParents.length) {
        report(id, 'missing-parent', missingParents.map(parent => parent.id));
        progressed = true;
        continue;
      }
      const unavailableParents = roomParents.filter(parent => unplacedById.has(parent.id));
      if (unavailableParents.length) {
        report(id, 'unconfirmed-parent', unavailableParents.map(parent => parent.id));
        progressed = true;
        continue;
      }
      const waitingParents = roomParents.filter(parent => !levels.has(parent.id));
      if (waitingParents.length) continue;

      levels.set(id, roomParents.length ? Math.max(...roomParents.map(parent => levels.get(parent.id)!)) + 1 : 0);
      remaining.delete(id);
      progressed = true;
    }
    if (progressed) continue;

    // A parent cycle (or a chain ending in one) has no valid top-down root.
    for (const id of remaining) {
      const roomParents = plan[id]?.parents.filter(parent => parent.kind === 'room').map(parent => parent.id) ?? [];
      report(id, 'cyclic-parent', roomParents);
    }
  }

  const levelsInOrder = [...new Set(levels.values())].sort((a, b) => a - b);
  const placedRects: { id: string; x: number; y: number; width: number; height: number }[] = [];

  for (const layer of levelsInOrder) {
    const ids = dimensions.map(room => room.id).filter(id => levels.get(id) === layer);
    const units = makeUnits(ids, dimensions, inputOrder, levels, plan, adjacentPairs, horizontalGap);
    const rows = wrapUnits(units, maxRoomsPerRow, maxRowWidth, horizontalGap);

    for (const [rowIndex, rowUnits] of rows.entries()) {
      // Keep sibling branches centered on their own upstream room. Centering
      // an entire wrapped row on the average of every parent moves children
      // away from their feeder columns, especially when the row contains
      // branches from several rooms with very different widths.
      const cohorts = new Map<string, RoomUnit[]>();
      for (const unit of rowUnits) {
        const key = unit.parentIds.length ? [...unit.parentIds].sort().join('|') : '$roots';
        cohorts.set(key, [...(cohorts.get(key) ?? []), unit]);
      }
      const positionedCohorts = [...cohorts.entries()].map(([key, cohortUnits]) => {
        const parentIds = [...new Set(cohortUnits.flatMap(unit => unit.parentIds))];
        const parentCenters = parentIds.map(id => {
          const parentPosition = positions[id];
          const parentDimensions = byId.get(id)!;
          return parentPosition.x + parentDimensions.width / 2;
        });
        const centerX = parentCenters.length
          ? parentCenters.reduce((sum, value) => sum + value, 0) / parentCenters.length
          : origin.x;
        const width = cohortUnits.reduce((sum, unit) => sum + unit.width, 0)
          + Math.max(0, cohortUnits.length - 1) * horizontalGap;
        const firstIndex = Math.min(...cohortUnits.map(unit => unit.firstIndex));
        return { key, units: cohortUnits, parentIds, centerX, width, firstIndex };
      }).sort((a, b) => a.centerX - b.centerX || a.firstIndex - b.firstIndex || a.key.localeCompare(b.key));
      const rowPositions: { unit: RoomUnit; y: number; startX: number }[] = [];
      // When nearby parents cannot fit their full child cohorts side by side,
      // shift both cohorts around their parent anchors. A left-to-right greedy
      // pack would push every later branch in one direction, creating long
      // cross-room runs and wasting the available corridor on the other side.
      const cohortPositions = packCohortsAroundAnchors(positionedCohorts, horizontalGap);
      for (const [cohortIndex, cohort] of positionedCohorts.entries()) {
        const cohortX = cohortPositions[cohortIndex];
        const y = layer === 0 ? origin.y : Math.max(...cohort.parentIds.map(id => positions[id].y + byId.get(id)!.height + verticalGap));
        let x = cohortX;
        for (const unit of cohort.units) {
          rowPositions.push({ unit, y, startX: x });
          x += unit.width + horizontalGap;
        }
      }

      // Move the entire row down together until its room boxes clear all
      // previously placed rows. This preserves a readable shared level.
      let y = rowPositions.length ? Math.max(...rowPositions.map(item => item.y)) : origin.y;
      let blockerBottom = -Infinity;
      do {
        blockerBottom = -Infinity;
        for (const item of rowPositions) {
          for (const id of item.unit.ids) {
            const room = byId.get(id)!;
            const roomX = item.startX + (item.unit.ids.indexOf(id) === 0 ? 0 : byId.get(item.unit.ids[0])!.width + horizontalGap);
            const blocker = placedRects.find(rect =>
              roomX < rect.x + rect.width + horizontalGap
              && roomX + room.width + horizontalGap > rect.x
              && y < rect.y + rect.height + verticalGap
              && y + room.height + verticalGap > rect.y,
            );
            if (blocker) blockerBottom = Math.max(blockerBottom, blocker.y + blocker.height);
          }
        }
        if (blockerBottom !== -Infinity) y = blockerBottom + verticalGap;
      } while (blockerBottom !== -Infinity);

      for (const item of rowPositions) {
        item.unit.ids.forEach((id, index) => {
          const room = byId.get(id)!;
          const roomX = item.startX + (index === 0 ? 0 : byId.get(item.unit.ids[0])!.width + horizontalGap);
          positions[id] = { x: roomX, y, layer, row: rowIndex, parentIds: [...item.unit.parentIds] };
          placedRects.push({ id, x: roomX, y, width: room.width, height: room.height });
        });
      }
    }
  }

  const unplaced = [...unplacedById.values()].sort((a, b) => inputOrder.get(a.id)! - inputOrder.get(b.id)!);
  return { positions, unplaced };
}

/** Find a non-overlapping row with minimum squared horizontal drift from each cohort's parent anchor. */
function packCohortsAroundAnchors(
  cohorts: readonly { centerX: number; width: number }[],
  gap: number,
): number[] {
  if (!cohorts.length) return [];
  // For left edges x[i], non-overlap requires x[i + 1] >= x[i] + width[i] + gap.
  // Subtracting cumulative widths turns those constraints into an isotonic
  // sequence. Pool-adjacent-violators gives the least-squares solution.
  const blocks: { start: number; end: number; sum: number; weight: number }[] = [];
  let offset = 0;
  for (let index = 0; index < cohorts.length; index++) {
    const target = cohorts[index].centerX - cohorts[index].width / 2 - offset;
    blocks.push({ start: index, end: index, sum: target, weight: 1 });
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
    offset += cohorts[index].width + gap;
  }

  const positions = Array<number>(cohorts.length);
  offset = 0;
  for (const block of blocks) {
    const fitted = block.sum / block.weight;
    for (let index = block.start; index <= block.end; index++) {
      positions[index] = fitted + offset;
      offset += cohorts[index].width + gap;
    }
  }
  // No gap is needed after the last item; removing it does not affect positions.
  return positions;
}

function makeUnits(
  ids: string[],
  dimensions: readonly TopDownRoomDimensions[],
  inputOrder: ReadonlyMap<string, number>,
  levels: ReadonlyMap<string, number>,
  plan: TopDownRoomPlan,
  adjacentPairs: readonly { from: string; to: string }[],
  horizontalGap: number,
): RoomUnit[] {
  const byId = new Map(dimensions.map(room => [room.id, room]));
  const layerIds = new Set(ids);
  const paired = new Set<string>();
  const units: RoomUnit[] = [];
  const addUnit = (unitIds: string[]) => {
    const parents = [...new Set(unitIds.flatMap(id => plan[id]?.parents.filter(parent => parent.kind === 'room').map(parent => parent.id) ?? []))];
    const anchors = unitIds.flatMap(id => plan[id]?.parents.map(parent => parent.order) ?? []);
    const roomDims = unitIds.map(id => byId.get(id)!);
    units.push({
      ids: unitIds,
      order: anchors.length ? Math.min(...anchors) : 0,
      firstIndex: Math.min(...unitIds.map(id => inputOrder.get(id)!)),
      width: roomDims.reduce((sum, room) => sum + room.width, 0) + Math.max(0, unitIds.length - 1) * horizontalGap,
      height: Math.max(...roomDims.map(room => room.height)),
      parentIds: parents,
      layer: Math.max(...unitIds.map(id => levels.get(id)!)),
    });
  };

  for (const pair of adjacentPairs) {
    if (!layerIds.has(pair.from) || !layerIds.has(pair.to) || paired.has(pair.from) || paired.has(pair.to)) continue;
    addUnit([pair.from, pair.to]);
    paired.add(pair.from); paired.add(pair.to);
  }
  for (const id of ids) if (!paired.has(id)) addUnit([id]);
  return units.sort((a, b) => a.order - b.order || a.firstIndex - b.firstIndex || a.ids[0].localeCompare(b.ids[0]));
}

function wrapUnits(units: readonly RoomUnit[], maxRoomsPerRow: number, maxRowWidth: number, horizontalGap: number): RoomUnit[][] {
  const rows: RoomUnit[][] = [];
  let row: RoomUnit[] = [];
  let count = 0;
  let width = 0;
  const flush = () => {
    if (row.length) rows.push(row);
    row = []; count = 0; width = 0;
  };
  for (const unit of units) {
    const nextWidth = width + (row.length ? horizontalGap : 0) + unit.width;
    if (row.length && (count + unit.ids.length > maxRoomsPerRow || nextWidth > maxRowWidth)) flush();
    row.push(unit);
    count += unit.ids.length;
    width += (row.length > 1 ? horizontalGap : 0) + unit.width;
  }
  flush();
  return rows;
}
