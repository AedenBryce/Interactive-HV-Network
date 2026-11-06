import type { SwitchroomFrame } from './switchroom-frames';
import type { WholeNetworkTreeEdge } from './whole-network-room-layout';
import { planWholeNetworkRooms } from './whole-network-room-layout';
import { roomPlacementAdjacencies } from './room-placement-plan';
import { placeTopDownRooms, type TopDownRoomPlan, type TopDownRoomPlacement } from './top-down-room-placement';

/**
 * Build a more vertical candidate using the same room dimensions and the
 * already selected presentation hierarchy as the current whole-network plan.
 * The returned coordinates are presentation-only: this candidate neither
 * changes model connectivity nor promotes unconfirmed electrical evidence.
 *
 * It is intentionally isolated from the production renderer so the complete
 * route audit can decide whether the narrower tree is safe to adopt.
 */
export function planVerticalWholeNetworkCandidate(
  frames: readonly Pick<SwitchroomFrame, 'id' | 'width' | 'height'>[],
  treeEdges: readonly WholeNetworkTreeEdge[],
  roomOwnerByAssetId: ReadonlyMap<string, string>,
): TopDownRoomPlacement {
  const existing = planWholeNetworkRooms(frames, treeEdges, roomOwnerByAssetId);
  const dimensions = frames.filter(frame => existing.positions[frame.id]);
  const plan: Record<string, TopDownRoomPlan[string]> = {};

  for (const frame of dimensions) {
    const parentIds = existing.positions[frame.id].parentIds;
    plan[frame.id] = {
      topology: 'presentation-tree',
      parents: parentIds.map((id, index) => ({
        kind: 'room',
        id,
        order: index + 1,
        route: 'existing selected presentation hierarchy; placement only',
      })),
    };
  }

  const candidate = placeTopDownRooms(dimensions, {
    plan,
    adjacentPairs: roomPlacementAdjacencies,
    origin: { x: 0, y: 0 },
    horizontalGap: 640,
    verticalGap: 760,
    maxRoomsPerRow: 2,
    maxRowWidth: 15_000,
  });

  // Keep unplaced frames out of the candidate result so the caller can retain
  // their existing coordinates and display status without fabricating parents.
  return {
    positions: candidate.positions,
    unplaced: [
      ...existing.unplaced,
      ...candidate.unplaced.filter(room => !existing.unplaced.some(old => old.id === room.id)),
    ],
  };
}
