import type { DiagramLayout } from '../session/presentation';
import type { AssetLabel, Point } from './diagram-geometry';
import type { SwitchroomFrame } from './switchroom-frames';
import { roomPlacementAdjacencies, roomPlacementPlan } from './room-placement-plan';
import { placeTopDownRooms, type TopDownRoomPlan, type TopDownRoomPlacement } from './top-down-room-placement';

export type WholeNetworkTreeEdge = { id: string; parentAssetId: string; childAssetId: string };

/**
 * Extend room ownership for diagram placement only. A selected-tree asset that
 * has no unique nearest room stays attached to the closest upstream room on
 * that same tree, so moving a feeder column cannot leave its junctions behind.
 * This map is never used to add or change a model connection.
 */
export function wholeNetworkPlacementOwnerByAssetId(
  treeEdges: readonly WholeNetworkTreeEdge[],
  roomOwnerByAssetId: ReadonlyMap<string, string>,
): Map<string, string> {
  const placementOwner = new Map(roomOwnerByAssetId);
  const parentByAsset = new Map(treeEdges.map(edge => [edge.childAssetId, edge.parentAssetId]));
  const assetIds = new Set(treeEdges.flatMap(edge => [edge.parentAssetId, edge.childAssetId]));
  for (const assetId of assetIds) {
    if (placementOwner.has(assetId)) continue;
    const visited = new Set<string>([assetId]);
    let parent = parentByAsset.get(assetId);
    while (parent && !visited.has(parent)) {
      const owner = placementOwner.get(parent);
      if (owner) { placementOwner.set(assetId, owner); break; }
      visited.add(parent);
      parent = parentByAsset.get(parent);
    }
  }
  return placementOwner;
}

/**
 * Order switchroom clusters by the deterministic presentation-tree placement.
 * The returned frames are the original objects; only their display order
 * changes. In particular, this does not modify or promote any model evidence,
 * owner-confirmation status, or electrical relationship.
 *
 * Frames without a selected presentation parent remain roots. Unplaceable
 * frames are kept at the end in stable ID order so a caller can still display
 * them without inventing a parent relationship.
 */
export function orderWholeNetworkRoomClustersTopDown(
  frames: readonly SwitchroomFrame[],
  treeEdges: readonly WholeNetworkTreeEdge[],
  roomOwnerByAssetId: ReadonlyMap<string, string>,
): SwitchroomFrame[] {
  const stableFrames = [...frames].sort((a, b) => a.id.localeCompare(b.id));
  const placement = planWholeNetworkRooms(stableFrames, treeEdges, roomOwnerByAssetId);
  const inputOrder = new Map(stableFrames.map((frame, index) => [frame.id, index]));

  return [...stableFrames].sort((a, b) => {
    const aPosition = placement.positions[a.id];
    const bPosition = placement.positions[b.id];
    if (aPosition && bPosition) {
      return aPosition.layer - bPosition.layer
        || aPosition.row - bPosition.row
        || aPosition.x - bPosition.x
        || a.id.localeCompare(b.id);
    }
    if (aPosition) return -1;
    if (bPosition) return 1;
    return inputOrder.get(a.id)! - inputOrder.get(b.id)!;
  });
}

/**
 * Plan the whole diagram as a top-down room tree. Explicit owner-confirmed
 * room relationships take precedence. Where the owner has not confirmed a
 * room parent, a presentation-tree edge is projected from the already-built
 * source-rooted asset tree. That projection controls only diagram placement;
 * it does not change model claims, evidence, or the switching network.
 */
export function planWholeNetworkRooms(
  frames: readonly Pick<SwitchroomFrame, 'id' | 'width' | 'height'>[],
  treeEdges: readonly WholeNetworkTreeEdge[],
  roomOwnerByAssetId: ReadonlyMap<string, string>,
): TopDownRoomPlacement {
  const frameIds = new Set(frames.map(frame => frame.id));
  const parentByRoom = new Map<string, string>();
  const orderByRoom = new Map<string, number>();
  const siblingOrder = new Map<string, number>();
  for (const edge of treeEdges) {
    const parentRoom = roomOwnerByAssetId.get(edge.parentAssetId);
    const childRoom = roomOwnerByAssetId.get(edge.childAssetId);
    if (!parentRoom || !childRoom || parentRoom === childRoom || !frameIds.has(parentRoom) || !frameIds.has(childRoom)) continue;
    if (parentByRoom.has(childRoom)) continue;
    parentByRoom.set(childRoom, parentRoom);
    const order = siblingOrder.get(parentRoom) ?? 1;
    orderByRoom.set(childRoom, order);
    siblingOrder.set(parentRoom, order + 1);
  }

  const plan: Record<string, TopDownRoomPlan[string]> = {};
  for (const frame of frames) {
    const configured = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    const configuredRoomParents = configured?.topology === 'owner-confirmed'
      ? configured.parents.filter(parent => parent.kind === 'room' && frameIds.has(parent.id))
      : [];
    const explicitParentsArePlaceable = configured?.topology === 'owner-confirmed'
      && configured.parents.every(parent => parent.kind !== 'room'
        || !frameIds.has(parent.id)
        || roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology === 'owner-confirmed');

    if (configured?.topology === 'owner-confirmed' && explicitParentsArePlaceable) {
      plan[frame.id] = configured;
      continue;
    }

    const parentId = configuredRoomParents[0]?.id ?? parentByRoom.get(frame.id);
    plan[frame.id] = parentId
      ? {
          topology: 'presentation-tree',
          parents: [{ kind: 'room', id: parentId, order: configuredRoomParents[0]?.order ?? orderByRoom.get(frame.id) ?? 1, route: `diagram tree edge to ${parentId}` }],
        }
      : { topology: 'presentation-tree', parents: [] };
  }

  return placeTopDownRooms(frames.map(({ id, width, height }) => ({ id, width, height })), {
    plan,
    adjacentPairs: roomPlacementAdjacencies,
    origin: { x: 0, y: 0 },
    horizontalGap: 640,
    verticalGap: 760,
    maxRoomsPerRow: 3,
    maxRowWidth: 20_000,
  });
}

/** Apply room offsets to all associated layout geometry without editing model data. */
export function applyWholeNetworkRoomPlacement(
  frames: SwitchroomFrame[],
  placement: TopDownRoomPlacement,
  layout: DiagramLayout,
  labels: Map<string, AssetLabel>,
  roomOwnerByAssetId: ReadonlyMap<string, string>,
  assetTerminals: ReadonlyMap<string, readonly string[]>,
  junctionTaps: Map<string, Map<string, Point>>,
  busTapXs: Map<string, Map<string, number>>,
  outsideFrameAssets: ReadonlySet<string> = new Set(),
): void {
  for (const frame of frames) {
    const target = placement.positions[frame.id];
    if (!target) continue;
    const dx = target.x - frame.x;
    const dy = target.y - frame.y;
    if (!dx && !dy) continue;

    const members = new Set([
      ...frame.assetIds,
      ...[...roomOwnerByAssetId].filter(([, owner]) => owner === frame.id).map(([assetId]) => assetId),
    ].filter(id => !outsideFrameAssets.has(id)));
    for (const id of members) {
      const position = layout.assets[id];
      if (position) layout.assets[id] = [position[0] + dx, position[1] + dy];
      for (const terminal of assetTerminals.get(id) ?? []) {
        const terminalPoint = layout.terminals[terminal];
        if (terminalPoint) layout.terminals[terminal] = [terminalPoint[0] + dx, terminalPoint[1] + dy];
      }
      const label = labels.get(id);
      if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
      for (const taps of junctionTaps.values()) {
        const point = taps.get(id);
        if (point) taps.set(id, [point[0] + dx, point[1] + dy]);
      }
      if (dx) for (const taps of busTapXs.values()) {
        const x = taps.get(id);
        if (x !== undefined) taps.set(id, x + dx);
      }
    }
    frame.x = target.x;
    frame.y = target.y;
  }
}
