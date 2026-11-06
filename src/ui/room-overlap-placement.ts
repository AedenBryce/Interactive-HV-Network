import { roomPlacementAdjacencies, roomPlacementPlan, type RoomFrameId, type RoomPlacementNode } from './room-placement-plan';

export type RoomPlacementRect = { id: string; x: number; y: number; width: number; height: number };
export type RoomPlacementAdjacency = (typeof roomPlacementAdjacencies)[number];
export type RoomOverlapIssue = {
  ids: readonly [string, string];
  reason: 'unconfirmed-overlap' | 'ring-row-mismatch' | 'missing-confirmed-parent' | 'cyclic-plan';
};
export type RoomOverlapPlacement = {
  /** Add each value to the input rectangle's y coordinate. */
  verticalShifts: Readonly<Record<string, number>>;
  /** Confirmed frames in stable parent-before-child order. */
  orderedIds: readonly string[];
  /** Conflicts the helper cannot resolve without inventing topology. */
  unresolved: readonly RoomOverlapIssue[];
};

const GAP = 48;

/**
 * Computes vertical-only shifts for confirmed room frames. It keeps confirmed
 * parent rooms above their children, pushes later confirmed rooms down to
 * clear earlier confirmed rectangles, and gives each confirmed ring pair one
 * shared shift. Unconfirmed rooms are not repositioned; overlaps involving
 * them are reported. This ensures room-box placement only, not cable routing.
 */
export function placeRoomFramesWithoutOverlap(
  rectangles: readonly RoomPlacementRect[],
  plan: Readonly<Record<RoomFrameId, RoomPlacementNode>> = roomPlacementPlan,
  adjacencies: readonly RoomPlacementAdjacency[] = roomPlacementAdjacencies,
): RoomOverlapPlacement {
  const byId = new Map(rectangles.map(rect => [rect.id, rect]));
  const unresolved: RoomOverlapIssue[] = [];
  const ids = rectangles.filter(rect => isConfirmed(rect.id, plan)).map(rect => rect.id);
  const confirmedIds = new Set(ids);
  const groupByRoom = new Map<string, string>();
  const groupRooms = new Map<string, string[]>();
  for (const { id } of rectangles) {
    if (groupByRoom.has(id)) continue;
    const partner = adjacencies.find(edge => edge.from === id || edge.to === id);
    const members = partner && confirmedIds.has(partner.from) && confirmedIds.has(partner.to)
      ? [partner.from, partner.to].sort((a, b) => a.localeCompare(b))
      : [id];
    const groupId = members.join('|');
    groupRooms.set(groupId, members);
    members.forEach(member => groupByRoom.set(member, groupId));
    const a = byId.get(members[0]);
    const b = byId.get(members[1]);
    if (b && a && a.y !== b.y) unresolved.push({ ids: [members[0], members[1]], reason: 'ring-row-mismatch' });
  }

  const groupBounds = new Map<string, { x: number; y: number; width: number; height: number }>();
  for (const [groupId, members] of groupRooms) {
    const groupRects = members.map(id => byId.get(id)).filter((rect): rect is RoomPlacementRect => !!rect);
    if (!groupRects.length) continue;
    const left = Math.min(...groupRects.map(rect => rect.x));
    const right = Math.max(...groupRects.map(rect => rect.x + rect.width));
    const top = Math.min(...groupRects.map(rect => rect.y));
    const bottom = Math.max(...groupRects.map(rect => rect.y + rect.height));
    groupBounds.set(groupId, { x: left, y: top, width: right - left, height: bottom - top });
  }

  // Build all vertical-order constraints from the original rectangles first.
  // The resulting coordinates are solved from this immutable constraint graph;
  // no already-moved frame becomes the input to a later move.
  const successors = new Map([...groupRooms.keys()].map(id => [id, new Set<string>()]));
  const indegree = new Map([...groupRooms.keys()].map(id => [id, 0]));
  const addConstraint = (aboveRoom: string, belowRoom: string) => {
    const above = groupByRoom.get(aboveRoom);
    const below = groupByRoom.get(belowRoom);
    if (!above || !below || above === below || successors.get(above)!.has(below)) return;
    successors.get(above)!.add(below);
    indegree.set(below, indegree.get(below)! + 1);
  };
  const reaches = (from: string, to: string) => {
    const start = groupByRoom.get(from);
    const target = groupByRoom.get(to);
    if (!start || !target) return false;
    const seen = new Set<string>();
    const queue = [start];
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor];
      if (current === target) return true;
      if (seen.has(current)) continue;
      seen.add(current);
      queue.push(...successors.get(current) ?? []);
    }
    return false;
  };

  for (const id of ids) {
    for (const parent of plan[id as RoomFrameId].parents) {
      if (parent.kind === 'room' && confirmedIds.has(parent.id)) addConstraint(parent.id, id);
    }
  }
  const stableRoomRank = (id: string) => plan[id as RoomFrameId] ? branchOrder(id, plan) : Number.MAX_SAFE_INTEGER;
  const allIds = rectangles.map(rect => rect.id);
  for (let i = 0; i < allIds.length; i++) for (let j = i + 1; j < allIds.length; j++) {
    const aId = allIds[i]; const bId = allIds[j];
    const aGroup = groupByRoom.get(aId)!; const bGroup = groupByRoom.get(bId)!;
    if (aGroup === bGroup) continue;
    const a = groupBounds.get(aGroup)!; const b = groupBounds.get(bGroup)!;
    if (a.x >= b.x + b.width || b.x >= a.x + a.width) continue;
    if (reaches(aId, bId) || reaches(bId, aId)) continue;
    const aAbove = a.y < b.y || (a.y === b.y && (stableRoomRank(aId) < stableRoomRank(bId)
      || stableRoomRank(aId) === stableRoomRank(bId) && aId.localeCompare(bId) < 0));
    addConstraint(aAbove ? aId : bId, aAbove ? bId : aId);
  }

  const ready = [...groupRooms.keys()].filter(id => indegree.get(id) === 0).sort(compareGroups);
  const orderedGroups: string[] = [];
  while (ready.length) {
    const group = ready.shift()!;
    orderedGroups.push(group);
    for (const next of successors.get(group)!) {
      indegree.set(next, indegree.get(next)! - 1);
      if (indegree.get(next) === 0) {
        ready.push(next);
        ready.sort(compareGroups);
      }
    }
  }
  for (const group of groupRooms.keys()) if (!orderedGroups.includes(group)) {
    const rooms = groupRooms.get(group)!;
    unresolved.push({ ids: [rooms[0], rooms[0]], reason: 'cyclic-plan' });
  }

  const verticalShifts: Record<string, number> = Object.fromEntries(rectangles.map(rect => [rect.id, 0]));
  const groupShift = new Map<string, number>();
  for (const group of orderedGroups) {
    const rect = groupBounds.get(group)!;
    const shift = [...successors.entries()]
      .filter(([, children]) => children.has(group))
      .reduce((required, [parent]) => {
        const parentBounds = groupBounds.get(parent)!;
        const parentShift = groupShift.get(parent) ?? 0;
        return Math.max(required, parentBounds.y + parentBounds.height + GAP + parentShift - rect.y);
      }, 0);
    groupShift.set(group, Math.max(0, shift));
    for (const id of groupRooms.get(group)!) verticalShifts[id] = Math.max(0, shift);
  }

  // Report any unresolved intersections involving an unconfirmed room. Those
  // rooms remain at their supplied coordinates rather than gaining a guessed parent.
  const unresolvedPairs = new Set<string>();
  for (let i = 0; i < rectangles.length; i++) {
    for (let j = i + 1; j < rectangles.length; j++) {
      const a = rectangles[i];
      const b = rectangles[j];
      if (confirmedIds.has(a.id) && confirmedIds.has(b.id)) continue;
      if (!intersects(a, verticalShifts[a.id] ?? 0, b, verticalShifts[b.id] ?? 0)) continue;
      const key = [a.id, b.id].sort().join('\0');
      if (unresolvedPairs.has(key)) continue;
      unresolvedPairs.add(key);
      unresolved.push({ ids: [a.id, b.id], reason: 'unconfirmed-overlap' });
    }
  }

  const orderedIds = orderedGroups.flatMap(group => groupRooms.get(group) ?? []);
  return { verticalShifts, orderedIds, unresolved };

  function compareGroups(a: string, b: string) {
    const aRooms = groupRooms.get(a)!; const bRooms = groupRooms.get(b)!;
    const aRank = Math.min(...aRooms.map(stableRoomRank));
    const bRank = Math.min(...bRooms.map(stableRoomRank));
    return aRank - bRank || a.localeCompare(b);
  }
}

function isConfirmed(id: string, plan: Readonly<Record<RoomFrameId, RoomPlacementNode>>): id is RoomFrameId {
  return plan[id as RoomFrameId]?.topology === 'owner-confirmed';
}

function branchOrder(id: string, plan: Readonly<Record<RoomFrameId, RoomPlacementNode>>): number {
  const parents = plan[id as RoomFrameId].parents;
  return parents.length ? Math.min(...parents.map(parent => parent.order)) : 0;
}

function intersects(a: RoomPlacementRect, aShift: number, b: RoomPlacementRect, bShift: number): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y + aShift < b.y + bShift + b.height
    && b.y + bShift < a.y + aShift + a.height;
}
