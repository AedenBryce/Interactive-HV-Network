import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { placeTopDownRooms, type TopDownRoomPlan } from './top-down-room-placement';

type Rect = { x: number; y: number; width: number; height: number };

/** Isolated feeder-sector decomposition trial. Does not modify the model. */
export function layoutAgent6FeederSectors(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const frameById = new Map(seed.frames.map(frame => [frame.id, frame]));
  const roomParentById = new Map<string, string>();
  const sectorRootByRoom = new Map<string, string>();
  const findSectorRoot = (roomId: string) => {
    const cached = sectorRootByRoom.get(roomId);
    if (cached) return cached;
    const seen = new Set<string>();
    let cursor = roomId;
    while (!seen.has(cursor)) {
      seen.add(cursor);
      const parent = seed.safePlan[cursor]?.parents.find(item => item.kind === 'room')?.id;
      if (!parent || !frameById.has(parent)) break;
      roomParentById.set(cursor, parent);
      cursor = parent;
    }
    for (const id of seen) sectorRootByRoom.set(id, cursor);
    return cursor;
  };
  for (const frame of seed.frames) findSectorRoot(frame.id);

  const assetsByUnit = new Map<string, string[]>();
  const roomIdsByUnit = new Map<string, string[]>();
  for (const asset of model.assets) {
    const room = seed.roomOwnerByAsset.get(asset.id);
    if (!room) continue;
    const root = findSectorRoot(room);
    assetsByUnit.set(root, [...(assetsByUnit.get(root) ?? []), asset.id]);
    roomIdsByUnit.set(root, [...(roomIdsByUnit.get(root) ?? []), room]);
  }

  // Assets not uniquely assigned to a room stay in explicit detached bridge
  // units, grouped only when they share a selected-tree component.
  const unowned = model.assets.filter(asset => !seed.roomOwnerByAsset.has(asset.id));
  const unownedIds = new Set(unowned.map(asset => asset.id));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacent = new Map(unowned.map(asset => [asset.id, [] as string[]]));
  for (const connection of model.connections) {
    if (!base.treeEdgeIds.has(connection.id)) continue;
    const from = ownerByTerminal.get(connection.from); const to = ownerByTerminal.get(connection.to);
    if (from && to && unownedIds.has(from) && unownedIds.has(to)) {
      adjacent.get(from)!.push(to); adjacent.get(to)!.push(from);
    }
  }
  const seenUnowned = new Set<string>();
  for (const asset of unowned) {
    if (seenUnowned.has(asset.id)) continue;
    const unitId = `detached:${asset.id}`;
    const ids: string[] = [];
    const queue = [asset.id]; seenUnowned.add(asset.id);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = queue[cursor]; ids.push(current);
      for (const next of adjacent.get(current) ?? []) if (!seenUnowned.has(next)) {
        seenUnowned.add(next); queue.push(next);
      }
    }
    assetsByUnit.set(unitId, ids);
    roomIdsByUnit.set(unitId, []);
  }

  const frameIdsByUnit = new Map<string, string[]>();
  for (const frame of seed.frames) {
    const root = findSectorRoot(frame.id);
    frameIdsByUnit.set(root, [...(frameIdsByUnit.get(root) ?? []), frame.id]);
  }
  const boxByUnit = new Map<string, Rect>();
  for (const [unitId, assetIds] of assetsByUnit) {
    const boxes = seed.symbolLabelBoxes.filter(box => assetIds.includes(box.id.replace(/^(?:symbol|label):/, '')));
    const frames = (frameIdsByUnit.get(unitId) ?? []).flatMap(id => {
      const frame = frameById.get(id)!;
      return [{ x: frame.x, y: frame.y, width: frame.width, height: frame.height }];
    });
    const rects = [...boxes, ...frames];
    if (!rects.length) continue;
    const left = Math.min(...rects.map(rect => rect.x));
    const top = Math.min(...rects.map(rect => rect.y));
    const right = Math.max(...rects.map(rect => rect.x + rect.width));
    const bottom = Math.max(...rects.map(rect => rect.y + rect.height));
    boxByUnit.set(unitId, { x: left, y: top, width: right - left, height: bottom - top });
  }

  const mutableUnitPlan: Record<string, TopDownRoomPlan[string]> = {};
  for (const unitId of boxByUnit.keys()) {
    const roomIds = [...new Set(roomIdsByUnit.get(unitId) ?? [])];
    const rootFrameId = roomIds.find(id => sectorRootByRoom.get(id) === id);
    const rootNode = rootFrameId ? seed.safePlan[rootFrameId] : undefined;
    const supply = rootNode?.parents.find(parent => parent.kind === 'supply-anchor');
    const configuredParentRoom = rootFrameId ? roomParentById.get(rootFrameId) : undefined;
    const parentSector = configuredParentRoom ? findSectorRoot(configuredParentRoom) : undefined;
    const parents = parentSector && parentSector !== unitId && boxByUnit.has(parentSector)
      ? [{ kind: 'room' as const, id: parentSector, order: rootNode?.parents[0]?.order ?? 1, route: rootNode?.parents[0]?.route ?? `Upstream room ${parentSector}` }]
      : supply ? [supply] : [];
    mutableUnitPlan[unitId] = { topology: 'presentation-tree', parents };
  }
  const unitPlan: TopDownRoomPlan = mutableUnitPlan;

  const dimensions = [...boxByUnit].map(([id, box]) => ({ id, width: Math.max(1, box.width), height: Math.max(1, box.height) }));
  const ringFrom = findSectorRoot('crushing-1/hv');
  const ringTo = findSectorRoot('crushing-2/sw435-hv');
  const adjacentPairs = ringFrom !== ringTo && boxByUnit.has(ringFrom) && boxByUnit.has(ringTo)
    ? [{ from: ringFrom, to: ringTo }]
    : [];
  const placementOptions = {
    plan: unitPlan,
    adjacentPairs,
    origin: { x: 0, y: 0 },
    horizontalGap: 1_000,
    verticalGap: 1_100,
    maxRoomsPerRow: 3,
    maxRowWidth: 28_000,
  } as const;
  const placement = placeTopDownRooms(dimensions, placementOptions);

  const assetTranslations: Record<string, [number, number]> = {};
  for (const [unitId, assetIds] of assetsByUnit) {
    const from = boxByUnit.get(unitId); const target = placement.positions[unitId];
    if (!from || !target) continue;
    const dx = target.x - from.x; const dy = target.y - from.y;
    for (const assetId of assetIds) {
      const original = base.view.layout.assets[assetId] ?? [0, 0];
      const alreadyPlaced = seed.positions[assetId] ?? original;
      assetTranslations[assetId] = [alreadyPlaced[0] - original[0] + dx, alreadyPlaced[1] - original[1] + dy];
    }
  }
  const roomTranslations = Object.fromEntries(seed.frames.map(frame => {
    const unitId = findSectorRoot(frame.id);
    const from = boxByUnit.get(unitId); const target = placement.positions[unitId];
    const dx = from && target ? target.x - from.x : 0;
    const dy = from && target ? target.y - from.y : 0;
    const original = base.panels.find(candidate => candidate.id === frame.id)!;
    return [frame.id, [frame.x - original.x + dx, frame.y - original.y + dy] as [number, number]];
  }));
  const candidate = layoutWholeGraphCandidate(model, {
    baseGeometry: base,
    assetTranslations,
    roomTranslations,
    routeBudget: 'quick',
  });
  return {
    base,
    seed,
    candidate,
    placement,
    unitPlan,
    unitBoxes: boxByUnit,
    unitAssets: assetsByUnit,
    sectorRootByRoom,
    deterministicPlacement: JSON.stringify(placement) === JSON.stringify(placeTopDownRooms(dimensions, placementOptions)),
    expectedAssetIds: new Set(model.assets.map(asset => asset.id)),
    expectedConnectionIds: new Set(model.connections.map(connection => connection.id)),
  };
}
