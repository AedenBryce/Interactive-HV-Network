import type { SwitchroomFrame } from './switchroom-frames';
import { roomPlacementPlan, type RoomFrameId, type RoomPlacementNode } from './room-placement-plan';

/**
 * Return confirmed rooms in a stable parent-before-child order. Unconfirmed
 * rooms retain their relative input order and are not assigned inferred parents.
 * This only orders frames; it assigns no coordinates or routes.
 */
export function orderRoomFramesTopologically(
  frames: readonly SwitchroomFrame[],
  plan: Readonly<Record<RoomFrameId, RoomPlacementNode>> = roomPlacementPlan,
): SwitchroomFrame[] {
  const byId = new Map(frames.map((frame, index) => [frame.id, { frame, index }]));
  const confirmed = frames.filter(frame => isConfirmedPlanId(frame.id, plan));
  const confirmedIds = new Set(confirmed.map(frame => frame.id));
  const remaining = new Set(confirmedIds);
  const ordered: SwitchroomFrame[] = [];

  const branchOrder = (id: string): number => {
    const node = plan[id as RoomFrameId];
    return node?.topology === 'owner-confirmed' && node.parents.length
      ? Math.min(...node.parents.map(parent => parent.order))
      : Number.NEGATIVE_INFINITY;
  };

  while (remaining.size > 0) {
    const ready = [...remaining].filter(id => {
      const node = plan[id as RoomFrameId];
      if (!node || node.topology !== 'owner-confirmed') return false;
      return node.parents.every(parent => parent.kind !== 'room' || !confirmedIds.has(parent.id) || !remaining.has(parent.id));
    });
    if (!ready.length) {
      ready.push(...remaining);
      ready.sort((a, b) => byId.get(a)!.index - byId.get(b)!.index);
    } else {
      ready.sort((a, b) => branchOrder(a) - branchOrder(b) || byId.get(a)!.index - byId.get(b)!.index);
    }
    for (const id of ready) {
      const entry = byId.get(id);
      if (entry) ordered.push(entry.frame);
      remaining.delete(id);
    }
  }

  ordered.push(...frames.filter(frame => !isConfirmedPlanId(frame.id, plan)));
  return ordered;
}

function isConfirmedPlanId(
  id: string,
  plan: Readonly<Record<RoomFrameId, RoomPlacementNode>>,
): id is RoomFrameId {
  return plan[id as RoomFrameId]?.topology === 'owner-confirmed';
}

