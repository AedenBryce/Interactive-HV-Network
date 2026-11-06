import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { roomPlacementPlan } from './room-placement-plan';
import { switchroomMemberships } from './switchroom-frames';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import type { Point } from './diagram-geometry';

type Box = { minX: number; minY: number; maxX: number; maxY: number };
type MacroGroup = { id: string; assetIds: string[]; roomId?: string; box: Box; baseX: number; parentIds: Set<string> };

/**
 * Experimental hierarchy-preserving macro placement. Room cores and each
 * selected-tree external chain between branch points moves as a rigid group.
 * Branch assets remain single shared nodes, so a shared trunk is never copied.
 * No model connection
 * or evidence is changed; all electrical edges are routed by the caller.
 */
export function placeRoomAndBridgeMacros(model: NetworkModel, base = continuousNetwork(model)) {
  const frames = base.panels;
  const ownerByAsset = new Map<string, string>();
  const duplicateCoreAssets = new Set<string>();
  for (const room of switchroomMemberships(model)) for (const assetId of room.assetIds) {
    const owner = ownerByAsset.get(assetId);
    if (owner && owner !== room.id) { ownerByAsset.delete(assetId); duplicateCoreAssets.add(assetId); }
    else if (!duplicateCoreAssets.has(assetId)) ownerByAsset.set(assetId, room.id);
  }
  if (duplicateCoreAssets.size) throw new Error(`Ambiguous room-core assets: ${[...duplicateCoreAssets].join(', ')}`);

  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connections = new Map(model.connections.map(connection => [connection.id, connection]));
  const treeAdjacency = new Map(model.assets.map(asset => [asset.id, [] as { assetId: string; connectionId: string }[]]));
  for (const id of base.treeEdgeIds) {
    const connection = connections.get(id); if (!connection) continue;
    const a = ownerByTerminal.get(connection.from); const b = ownerByTerminal.get(connection.to);
    if (!a || !b || a === b) continue;
    treeAdjacency.get(a)!.push({ assetId: b, connectionId: id });
    treeAdjacency.get(b)!.push({ assetId: a, connectionId: id });
  }

  const groups: MacroGroup[] = [];
  const groupByAsset = new Map<string, string>();
  const frameById = new Map(frames.map(frame => [frame.id, frame]));
  for (const [roomId, roomAssets] of groupByRoom(ownerByAsset)) {
    const frame = frameById.get(roomId);
    if (!frame) throw new Error(`Room core ${roomId} has no production frame`);
    const contents = assetBox(roomAssets, model, base);
    const group: MacroGroup = {
      id: `room:${roomId}`, roomId, assetIds: roomAssets,
      box: union([{ minX: frame.x, minY: frame.y, maxX: frame.x + frame.width, maxY: frame.y + frame.height }, contents]),
      baseX: frame.x + frame.width / 2, parentIds: new Set(),
    };
    groups.push(group);
    roomAssets.forEach(assetId => groupByAsset.set(assetId, group.id));
  }

  const externalIds = model.assets.map(asset => asset.id).filter(id => !ownerByAsset.has(id));
  const externalSet = new Set(externalIds);
  const externalNeighbors = new Map(externalIds.map(id => [id, (treeAdjacency.get(id) ?? []).filter(edge => externalSet.has(edge.assetId))]));
  const attachedToRoom = new Set(externalIds.filter(id => (treeAdjacency.get(id) ?? []).some(edge => ownerByAsset.has(edge.assetId))));
  const branchAssets = new Set(externalIds.filter(id => (externalNeighbors.get(id)?.length ?? 0) !== 2 || attachedToRoom.has(id)));
  const addBridgeGroup = (assetIds: string[]) => {
    if (!assetIds.length) return;
    const groupId = `bridge:${assetIds.join('~')}`;
    const group: MacroGroup = { id: groupId, assetIds, box: assetBox(assetIds, model, base), baseX: averageX(assetIds, base), parentIds: new Set() };
    groups.push(group);
    assetIds.forEach(assetId => {
      if (groupByAsset.has(assetId)) throw new Error(`External asset assigned to multiple macros: ${assetId}`);
      groupByAsset.set(assetId, groupId);
    });
  };
  // A fork/junction asset belongs to one singleton macro. Each chain between
  // such nodes is a separate macro; this preserves the shared node exactly
  // once while allowing sibling branches to occupy separate top-down rows.
  for (const assetId of externalIds) if (branchAssets.has(assetId)) addBridgeGroup([assetId]);
  const walkedEdges = new Set<string>();
  for (const startId of externalIds.filter(id => branchAssets.has(id))) {
    for (const first of externalNeighbors.get(startId) ?? []) {
      const edgeKey = [startId, first.assetId].sort().join('\0');
      if (walkedEdges.has(edgeKey)) continue;
      walkedEdges.add(edgeKey);
      if (branchAssets.has(first.assetId)) continue;
      const chain = [first.assetId]; let previous = startId; let current = first.assetId;
      while (!branchAssets.has(current)) {
        const next = (externalNeighbors.get(current) ?? []).find(edge => edge.assetId !== previous);
        if (!next) break;
        const nextKey = [current, next.assetId].sort().join('\0');
        if (walkedEdges.has(nextKey)) break;
        walkedEdges.add(nextKey);
        previous = current; current = next.assetId;
        if (!branchAssets.has(current)) chain.push(current);
      }
      addBridgeGroup(chain);
    }
  }
  const missingExternalAssets = externalIds.filter(id => !groupByAsset.has(id));
  if (missingExternalAssets.length) throw new Error(`External tree classification left assets ungrouped: ${missingExternalAssets.join(', ')}`);

  const edgePairs = new Map<string, Set<string>>();
  for (const id of base.treeEdgeIds) {
    const connection = connections.get(id); if (!connection) continue;
    const a = groupByAsset.get(ownerByTerminal.get(connection.from)!); const b = groupByAsset.get(ownerByTerminal.get(connection.to)!);
    if (!a || !b || a === b) continue;
    const neighborsA = edgePairs.get(a) ?? new Set<string>(); neighborsA.add(b); edgePairs.set(a, neighborsA);
    const neighborsB = edgePairs.get(b) ?? new Set<string>(); neighborsB.add(a); edgePairs.set(b, neighborsB);
  }

  // Orient the contracted spanning forest from the model's explicit source
  // assets. Unreached components remain independent roots.
  const groupById = new Map(groups.map(group => [group.id, group]));
  const visitedGroups = new Set<string>();
  const roots = [...new Set(model.sources.map(source => groupByAsset.get(source.assetId)).filter((id): id is string => !!id))];
  const orientFrom = (rootIds: readonly string[]) => {
    const queue = [...rootIds]; rootIds.forEach(id => visitedGroups.add(id));
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parent = queue[cursor];
      for (const child of edgePairs.get(parent) ?? []) {
        if (visitedGroups.has(child)) continue;
        visitedGroups.add(child); groupById.get(child)!.parentIds.add(parent); queue.push(child);
      }
    }
  };
  orientFrom(roots);
  for (const group of groups) if (!visitedGroups.has(group.id)) { roots.push(group.id); orientFrom([group.id]); }

  const confirmedParentViolations: string[] = [];
  for (const group of groups.filter(item => item.roomId)) {
    const roomId = group.roomId!;
    const plan = roomPlacementPlan[roomId as keyof typeof roomPlacementPlan];
    if (plan?.topology !== 'owner-confirmed') continue;
    const expected = plan.parents.find(parent => parent.kind === 'room');
    if (!expected) continue;
    let cursor: string | undefined = group.id; const ancestors = new Set<string>();
    while (cursor && !ancestors.has(cursor)) {
      ancestors.add(cursor);
      const current = groupById.get(cursor);
      cursor = current?.parentIds.values().next().value as string | undefined;
      if (cursor && groupById.get(cursor)?.roomId === expected.id) break;
    }
    if (!cursor || groupById.get(cursor)?.roomId !== expected.id) confirmedParentViolations.push(`${expected.id}→${roomId}`);
  }
  if (confirmedParentViolations.length) throw new Error(`Selected-tree macro ancestry conflicts with confirmed room parents: ${confirmedParentViolations.join(', ')}`);

  const depthMemo = new Map<string, number>();
  const depth = (id: string, visiting = new Set<string>()): number => {
    if (depthMemo.has(id)) return depthMemo.get(id)!;
    if (visiting.has(id)) return 0;
    const next = new Set(visiting); next.add(id);
    const parents = [...groupById.get(id)!.parentIds];
    const result = parents.length ? 1 + Math.max(...parents.map(parent => depth(parent, next))) : 0;
    depthMemo.set(id, result); return result;
  };
  const depthByGroup = new Map(groups.map(group => [group.id, depth(group.id)]));
  const translations = new Map<string, Point>(); const placed = new Map<string, Box>();
  const gap = 420; const rowWidthCap = 30_000; let layerBottom = 0;
  const ringRooms = new Set(['crushing-1/hv', 'crushing-2/sw435-hv']);
  const targetCenter = (group: MacroGroup) => {
    const parentCenters = [...group.parentIds].flatMap(id => {
      const parent = placed.get(id);
      return parent ? [(parent.minX + parent.maxX) / 2] : [];
    });
    return parentCenters.length
      ? parentCenters.reduce((sum, center) => sum + center, 0) / parentCenters.length
      : group.baseX;
  };
  for (const level of [...new Set(depthByGroup.values())].sort((a, b) => a - b)) {
    const layerGroups = groups.filter(group => depthByGroup.get(group.id) === level)
      .sort((a, b) => targetCenter(a) - targetCenter(b)
        || macroOrder(a, b, ownerByAsset, treeAdjacency)
        || a.baseX - b.baseX || a.id.localeCompare(b.id));
    const units: MacroGroup[][] = []; const paired = new Set<string>();
    const ring = layerGroups.filter(group => group.roomId && ringRooms.has(group.roomId));
    if (ring.length === 2) {
      ring.sort((a, b) => Number(b.roomId === 'crushing-2/sw435-hv') - Number(a.roomId === 'crushing-2/sw435-hv'));
      units.push(ring); ring.forEach(group => paired.add(group.id));
    }
    for (const group of layerGroups) if (!paired.has(group.id)) units.push([group]);
    const rows: MacroGroup[][][] = []; let row: MacroGroup[][] = []; let rowWidth = 0;
    for (const unit of units) {
      const width = unit.reduce((sum, group) => sum + boxWidth(group.box), 0) + (unit.length - 1) * gap;
      if (row.length && rowWidth + gap + width > rowWidthCap) { rows.push(row); row = []; rowWidth = 0; }
      row.push(unit); rowWidth += (row.length > 1 ? gap : 0) + width;
    }
    if (row.length) rows.push(row);
    let rowY = layerBottom;
    for (const rowUnits of rows) {
      const parentIds = [...new Set(rowUnits.flatMap(unit => unit.flatMap(group => [...group.parentIds])))];
      const parentBottom = Math.max(-Infinity, ...parentIds.map(id => placed.get(id)?.maxY ?? -Infinity));
      if (Number.isFinite(parentBottom)) rowY = Math.max(rowY, parentBottom + gap);
      const unitWidths = rowUnits.map(unit => unit.reduce((sum, group) => sum + boxWidth(group.box), 0) + gap * (unit.length - 1));
      const unitTargets = rowUnits.map(unit => unit.reduce((sum, group) => sum + targetCenter(group), 0) / unit.length);
      const unitX = packNonOverlappingCenters(unitWidths, unitTargets, gap);
      const rowBoxes = () => rowUnits.flatMap((unit, index) => {
        let x = unitX[index];
        return unit.map(group => {
          const moved = shiftBox(group.box, x - group.box.minX, rowY - group.box.minY);
          x += boxWidth(group.box) + gap;
          return { group, moved };
        });
      });
      let boxes = rowBoxes();
      let blockers = boxes.flatMap(item => [...placed.values()].filter(existing => boxesOverlap(item.moved, existing)));
      while (blockers.length) {
        rowY = Math.max(...blockers.map(box => box.maxY)) + gap;
        boxes = rowBoxes();
        blockers = boxes.flatMap(item => [...placed.values()].filter(existing => boxesOverlap(item.moved, existing)));
      }
      let bottom = rowY;
      for (const { group, moved } of boxes) {
        const dx = moved.minX - group.box.minX; const dy = moved.minY - group.box.minY;
        placed.set(group.id, moved); translations.set(group.id, [dx, dy]);
        bottom = Math.max(bottom, moved.maxY);
      }
      rowY = bottom + gap;
    }
    layerBottom = Math.max(layerBottom, rowY - gap);
  }

  const overlaps: string[] = [];
  for (let i = 0; i < groups.length; i++) for (const other of groups.slice(i + 1)) {
    if (boxesOverlap(placed.get(groups[i].id)!, placed.get(other.id)!)) overlaps.push(`${groups[i].id}↔${other.id}`);
  }
  const parentOrderViolations = groups.flatMap(group => [...group.parentIds].filter(parent => placed.get(group.id)!.minY < placed.get(parent)!.maxY)
    .map(parent => `${parent}→${group.id}`));
  const roomTranslations: Record<string, Point> = {};
  const assetTranslations: Record<string, Point> = {};
  const translationByAsset: Record<string, Point> = {};
  for (const group of groups) {
    const delta = translations.get(group.id) ?? [0, 0];
    if (group.roomId) roomTranslations[group.roomId] = delta;
    else for (const assetId of group.assetIds) assetTranslations[assetId] = delta;
    for (const assetId of group.assetIds) translationByAsset[assetId] = delta;
  }
  const allBoxes = [...placed.values()];
  const minX = Math.min(...allBoxes.map(box => box.minX)); const minY = Math.min(...allBoxes.map(box => box.minY));
  const maxX = Math.max(...allBoxes.map(box => box.maxX)); const maxY = Math.max(...allBoxes.map(box => box.maxY));
  const componentAttachments = [...new Set(groups.filter(group => group.id.startsWith('bridge:')).map(group => {
    const rooms = new Set<string>();
    for (const assetId of group.assetIds) for (const neighbor of treeAdjacency.get(assetId) ?? []) {
      const roomId = ownerByAsset.get(neighbor.assetId); if (roomId) rooms.add(roomId);
    }
    return `${group.id}:${[...rooms].sort().join('|')}`;
  }))];
  return {
    roomTranslations,
    assetTranslations,
    translationByAsset,
    macroGroupByAsset: Object.fromEntries(groupByAsset),
    groupCount: groups.length,
    bridgeGroupCount: groups.filter(group => group.id.startsWith('bridge:')).length,
    detachedBridgeGroupCount: groups.filter(group => group.id.startsWith('bridge:') && !edgePairs.has(group.id)).length,
    componentAttachments,
    groupOverlaps: overlaps,
    parentOrderViolations,
    bounds: { width: maxX - minX, height: maxY - minY },
  };
}

/** Place ordered variable-width row units nearest their parent centers. */
function packNonOverlappingCenters(widths: readonly number[], centers: readonly number[], gap: number): number[] {
  if (widths.length !== centers.length) throw new Error('Packing widths and centers must have matching lengths');
  const offsets: number[] = [];
  let offset = 0;
  for (let index = 0; index < widths.length; index++) {
    offsets.push(offset);
    offset += widths[index] + (index < widths.length - 1 ? gap : 0);
  }
  const targets = widths.map((width, index) => centers[index] - width / 2 - offsets[index]);
  const blocks: { start: number; end: number; total: number; count: number }[] = [];
  for (let index = 0; index < targets.length; index++) {
    blocks.push({ start: index, end: index, total: targets[index], count: 1 });
    while (blocks.length > 1) {
      const right = blocks.at(-1)!; const left = blocks.at(-2)!;
      if (left.total / left.count <= right.total / right.count) break;
      blocks.splice(-2, 2, { start: left.start, end: right.end, total: left.total + right.total, count: left.count + right.count });
    }
  }
  const packed = new Array<number>(widths.length);
  for (const block of blocks) {
    const value = block.total / block.count;
    for (let index = block.start; index <= block.end; index++) packed[index] = value + offsets[index];
  }
  return packed;
}

function groupByRoom(owner: ReadonlyMap<string, string>) {
  const result = new Map<string, string[]>();
  for (const [assetId, roomId] of owner) result.set(roomId, [...(result.get(roomId) ?? []), assetId]);
  return result;
}

function assetBox(assetIds: readonly string[], model: NetworkModel, base: ReturnType<typeof continuousNetwork>): Box {
  const points: Box[] = [];
  for (const id of assetIds) {
    const point = base.view.layout.assets[id]; if (!point) continue;
    const asset = model.assets.find(item => item.id === id)!;
    const label = base.labels.get(id);
    if (hasDeviceCard(asset) && label) {
      const card = deviceCard(asset, point, label);
      points.push({ minX: point[0] + card.x, minY: point[1] + card.y, maxX: point[0] + card.x + card.width, maxY: point[1] + card.y + card.height });
    } else points.push({ minX: point[0] - 46, minY: point[1] - 46, maxX: point[0] + 46, maxY: point[1] + 46 });
    if (label) points.push({ minX: label.x, minY: label.y, maxX: label.x + label.width, maxY: label.y + label.height });
  }
  return union(points);
}

function averageX(assetIds: readonly string[], base: ReturnType<typeof continuousNetwork>) {
  const xs = assetIds.map(id => base.view.layout.assets[id]?.[0]).filter((x): x is number => x !== undefined);
  return xs.length ? xs.reduce((sum, x) => sum + x, 0) / xs.length : 0;
}
function union(boxes: readonly Box[]): Box {
  return { minX: Math.min(...boxes.map(box => box.minX)), minY: Math.min(...boxes.map(box => box.minY)), maxX: Math.max(...boxes.map(box => box.maxX)), maxY: Math.max(...boxes.map(box => box.maxY)) };
}
function shiftBox(box: Box, dx: number, dy: number): Box { return { minX: box.minX + dx, maxX: box.maxX + dx, minY: box.minY + dy, maxY: box.maxY + dy }; }
function boxWidth(box: Box) { return box.maxX - box.minX; }
function boxesOverlap(a: Box, b: Box) { return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY; }

function macroOrder(a: MacroGroup, b: MacroGroup, roomOwner: ReadonlyMap<string, string>, adjacency: ReadonlyMap<string, readonly { assetId: string; connectionId: string }[]>) {
  const order = (group: MacroGroup) => {
    if (group.roomId) {
      const plan = roomPlacementPlan[group.roomId as keyof typeof roomPlacementPlan];
      const parent = plan?.parents[0]; return parent?.order ?? 99;
    }
    const assetId = group.assetIds[0];
    const parentRoom = (adjacency.get(assetId) ?? []).map(edge => roomOwner.get(edge.assetId)).find(Boolean);
    const roomPlan = parentRoom ? roomPlacementPlan[parentRoom as keyof typeof roomPlacementPlan] : undefined;
    return roomPlan?.parents[0]?.order ?? 50;
  };
  return order(a) - order(b);
}
