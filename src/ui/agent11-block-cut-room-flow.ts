import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import { roomPlacementPlan } from './room-placement-plan';
import { cutsBox, type Point } from './diagram-geometry';
import { placeTopDownRooms } from './top-down-room-placement';

/**
 * Top-down block-cut flow experiment. The selected source tree defines the
 * electrical hierarchy, while all non-tree links between switchroom modules
 * are contracted into cotree blocks before rooms are packed. Room internals
 * remain rigid and every real connection is rerouted after placement.
 */
export function layoutAgent11BlockCutRoomFlow(model: NetworkModel) {
  const source = layoutRoomOwnedTopDownCandidate(model);
  const base = continuousNetwork(model);
  const frameById = new Map(source.frames.map(frame => [frame.id, frame] as const));
  const roomByAsset = source.roomOwnerByAsset;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const root = parent.get(id);
    if (!root) { parent.set(id, id); return id; }
    if (root === id) return id;
    const result = find(root); parent.set(id, result); return result;
  };
  const unite = (a: string, b: string) => { const ra = find(a); const rb = find(b); if (ra !== rb) parent.set(rb, ra); };
  for (const frame of source.frames) find(frame.id);
  const cotreeEdges: { id: string; from: string; to: string }[] = [];
  for (const connection of model.connections) {
    if (base.treeEdgeIds.has(connection.id)) continue;
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to) ?? '');
    if (!fromRoom || !toRoom || fromRoom === toRoom) continue;
    cotreeEdges.push({ id: connection.id, from: fromRoom, to: toRoom });
    unite(fromRoom, toRoom);
  }
  const groups = new Map<string, string[]>();
  for (const frame of source.frames) {
    const root = find(frame.id);
    groups.set(root, [...(groups.get(root) ?? []), frame.id]);
  }
  const groupOf = new Map<string, string>();
  for (const [groupId, roomIds] of groups) for (const roomId of roomIds) groupOf.set(roomId, groupId);
  const groupWidths = new Map<string, number>();
  const groupHeights = new Map<string, number>();
  const intraGap = 900;
  for (const [groupId, roomIds] of groups) {
    const sorted = roomIds.sort((a, b) => parentOrder(a) - parentOrder(b) || a.localeCompare(b));
    groups.set(groupId, sorted);
    groupWidths.set(groupId, sorted.reduce((sum, id) => sum + frameById.get(id)!.width, 0) + Math.max(0, sorted.length - 1) * intraGap);
    groupHeights.set(groupId, Math.max(...sorted.map(id => frameById.get(id)!.height)));
  }
  const groupParents = new Map<string, Set<string>>();
  for (const roomId of frameById.keys()) {
    const node = roomPlacementPlan[roomId as keyof typeof roomPlacementPlan];
    if (!node || node.topology === 'unconfirmed') continue;
    const childGroup = groupOf.get(roomId)!;
    for (const declared of node.parents) {
      if (declared.kind !== 'room' || !frameById.has(declared.id)) continue;
      const parentGroup = groupOf.get(declared.id)!;
      if (parentGroup === childGroup) continue;
      groupParents.set(childGroup, new Set([...(groupParents.get(childGroup) ?? []), parentGroup]));
    }
  }
  const dimensions = [...groups].map(([id]) => ({ id, width: groupWidths.get(id)!, height: groupHeights.get(id)! }));
  const plan = Object.fromEntries(dimensions.map(({ id }) => [id, {
    topology: 'presentation-tree' as const,
    parents: [...(groupParents.get(id) ?? [])].sort().map((parentId, index) => ({ kind: 'room' as const, id: parentId, order: index, route: 'condensed confirmed room hierarchy' })),
  }]));
  const placed = placeTopDownRooms(dimensions, {
    plan,
    origin: { x: 0, y: 0 },
    horizontalGap: 1_000,
    verticalGap: 1_600,
    maxRoomsPerRow: 3,
    maxRowWidth: 30_000,
  });
  const targetByRoom = new Map<string, { x: number; y: number }>();
  for (const [groupId, roomIds] of groups) {
    const target = placed.positions[groupId];
    if (!target) continue;
    let x = target.x;
    for (const roomId of roomIds) {
      const frame = frameById.get(roomId)!;
      targetByRoom.set(roomId, { x, y: target.y });
      x += frame.width + intraGap;
    }
  }
  const dxByRoom = new Map<string, Point>();
  const frames = source.frames.map(frame => {
    const target = targetByRoom.get(frame.id);
    if (!target) return { ...frame };
    const delta: Point = [target.x - frame.x, target.y - frame.y];
    dxByRoom.set(frame.id, delta);
    return { ...frame, x: target.x, y: target.y };
  });
  const dxByAsset = new Map(source.deltaByAsset);
  const positions = { ...source.positions };
  const terminalPositions = { ...source.terminalPositions };
  const labels = new Map([...source.labels].map(([id, label]) => [id, { ...label }]));
  for (const [assetId, roomId] of roomByAsset) {
    const [dx, dy] = dxByRoom.get(roomId) ?? [0, 0];
    if (!dx && !dy) continue;
    if (positions[assetId]) positions[assetId] = [positions[assetId][0] + dx, positions[assetId][1] + dy];
    const asset = model.assets.find(item => item.id === assetId);
    for (const terminal of asset?.terminals ?? []) if (terminalPositions[terminal]) terminalPositions[terminal] = [terminalPositions[terminal][0] + dx, terminalPositions[terminal][1] + dy];
    const label = labels.get(assetId); if (label) labels.set(assetId, { ...label, x: label.x + dx, y: label.y + dy });
    const previous = dxByAsset.get(assetId) ?? [0, 0];
    dxByAsset.set(assetId, [previous[0] + dx, previous[1] + dy]);
  }
  const symbolLabelBoxes = source.symbolLabelBoxes.map(box => {
    const assetId = box.id.replace(/^(?:symbol|label):/, '');
    const room = roomByAsset.get(assetId);
    const [dx, dy] = room ? dxByRoom.get(room) ?? [0, 0] : [0, 0];
    return { ...box, x: box.x + dx, y: box.y + dy };
  });
  const moved = {
    ...source,
    positions,
    terminalPositions,
    labels,
    frames,
    deltaByAsset: dxByAsset,
    deltaByRoom: new Map([...source.deltaByRoom, ...dxByRoom]),
    symbolLabelBoxes,
    routes: new Map([...source.routes].map(([id, points]) => {
      if (!source.localRouteIds.includes(id)) return [id, points] as const;
      const connection = model.connections.find(item => item.id === id)!;
      const room = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
      const [dx, dy] = room ? dxByRoom.get(room) ?? [0, 0] : [0, 0];
      return [id, points.map(([x, y]) => [x + dx, y + dy] as Point)] as const;
    })),
  };
  const routing = routeRoomOwnedCandidateGutters(model, moved);
  const points = [...Object.values(moved.positions), ...[...routing.routes.values()].flat(), ...moved.frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point])];
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  const bounds = { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
  return { source, moved, routing, cotreeEdges, groups, groupParents, placed, targetByRoom, roomFrames: moved.frames, positions: moved.positions, labels: moved.labels, symbolLabelBoxes: moved.symbolLabelBoxes, bounds };

  function parentOrder(id: string) {
    const node = roomPlacementPlan[id as keyof typeof roomPlacementPlan];
    return node?.parents.reduce((min, item) => Math.min(min, item.order), Infinity) ?? Infinity;
  }
}

export function countAgent11RouteContentHits(routes: readonly { id: string; points: readonly Point[]; endpoints: readonly string[] }[], boxes: readonly { id: string; x: number; y: number; width: number; height: number }[]) {
  const hits = new Set<string>();
  for (const route of routes) for (let index = 1; index < route.points.length; index++) {
    for (const box of boxes) {
      if (route.endpoints.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
      if (cutsBox(route.points[index - 1], route.points[index], box)) hits.add(`${route.id}->${box.id}`);
    }
  }
  return hits;
}

export function agent11CountContentCollisions(boxes: readonly { id: string; x: number; y: number; width: number; height: number }[]) {
  let hits = 0;
  for (let i = 0; i < boxes.length; i++) for (const other of boxes.slice(i + 1)) {
    if (boxes[i].id.replace(/^(?:symbol|label):/, '') === other.id.replace(/^(?:symbol|label):/, '')) continue;
    if (boxes[i].x < other.x + other.width && boxes[i].x + boxes[i].width > other.x
      && boxes[i].y < other.y + other.height && boxes[i].y + boxes[i].height > other.y) hits++;
  }
  return hits;
}
