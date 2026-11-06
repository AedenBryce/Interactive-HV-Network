import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { roomPlacementAdjacencies, roomPlacementPlan } from './room-placement-plan';
import type { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';

type Candidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;
/**
 * Isolated packing experiment: pack only confirmed room-parent subtrees as
 * rigid clusters. If a configured parent is unconfirmed, both rooms remain
 * separate root branches; no electrical connection is inferred here.
 */
export function packRoomSiblingBranches(model: NetworkModel, candidate: Candidate, options: { columns?: number; gapX?: number; gapY?: number } = {}) {
  const columns = Math.max(1, Math.floor(options.columns ?? 4));
  const gapX = options.gapX ?? 1_200;
  const gapY = options.gapY ?? 1_200;
  const frameById = new Map(candidate.frames.map(frame => [frame.id, frame]));
  const parentById = new Map<string, string>();
  for (const frame of candidate.frames) {
    const node = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (!node || node.topology !== 'owner-confirmed') continue;
    const parents = node.parents.filter(parent => parent.kind === 'room' && frameById.has(parent.id));
    const parentsPlaceable = node.parents.every(parent => parent.kind !== 'room'
      || !frameById.has(parent.id)
      || roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology === 'owner-confirmed');
    if (parentsPlaceable && parents.length === 1) parentById.set(frame.id, parents[0].id);
  }

  const children = new Map<string, string[]>();
  for (const [child, parent] of parentById) children.set(parent, [...(children.get(parent) ?? []), child]);
  for (const [parent, childIds] of children) {
    childIds.sort((a, b) => parentOrder(a) - parentOrder(b) || a.localeCompare(b));
    children.set(parent, childIds);
  }
  const pairs = new Map<string, string>();
  for (const pair of roomPlacementAdjacencies) {
    if (!frameById.has(pair.from) || !frameById.has(pair.to)) continue;
    pairs.set(pair.from, pair.to); pairs.set(pair.to, pair.from);
  }
  type Unit = { ids: string[]; width: number; height: number };
  const unitCache = new Map<string, Unit[]>();
  const frameWidth = (id: string) => frameById.get(id)!.width;
  const frameHeight = (id: string) => frameById.get(id)!.height;
  const unitsFor = (id: string): Unit[] => {
    if (unitCache.has(id)) return unitCache.get(id)!;
    const ids = children.get(id) ?? [];
    const units: Unit[] = [];
    const used = new Set<string>();
    for (const child of ids) {
      if (used.has(child)) continue;
      const mate = pairs.get(child);
      if (mate && ids.includes(mate) && !used.has(mate)) {
        const ordered = [child, mate].sort((a, b) => parentOrder(a) - parentOrder(b) || a.localeCompare(b));
        units.push({ ids: ordered, width: treeWidth(ordered[0]) + gapX + treeWidth(ordered[1]), height: Math.max(treeHeight(ordered[0]), treeHeight(ordered[1])) });
        used.add(child); used.add(mate);
      } else {
        units.push({ ids: [child], width: treeWidth(child), height: treeHeight(child) });
        used.add(child);
      }
    }
    unitCache.set(id, units);
    return units;
  };
  const widthCache = new Map<string, number>();
  const heightCache = new Map<string, number>();
  const visiting = new Set<string>();
  function treeWidth(id: string): number {
    if (widthCache.has(id)) return widthCache.get(id)!;
    if (visiting.has(id)) return frameWidth(id);
    visiting.add(id);
    const childUnits = unitsFor(id);
    const descendantsWidth = childUnits.reduce((sum, unit) => sum + unit.width, 0) + Math.max(0, childUnits.length - 1) * gapX;
    const result = Math.max(frameWidth(id), descendantsWidth);
    visiting.delete(id); widthCache.set(id, result); return result;
  }
  function treeHeight(id: string): number {
    if (heightCache.has(id)) return heightCache.get(id)!;
    const below = Math.max(0, ...(children.get(id) ?? []).map(child => treeHeight(child)));
    const result = frameHeight(id) + (children.has(id) ? gapY + below : 0);
    heightCache.set(id, result); return result;
  }

  const roots = candidate.frames.map(frame => frame.id).filter(id => !parentById.has(id));
  const rootTrees = roots.map(id => ({ id, width: treeWidth(id), height: treeHeight(id) }))
    .sort((a, b) => b.height - a.height || b.width - a.width || a.id.localeCompare(b.id));
  const columnItems = Array.from({ length: Math.min(columns, Math.max(1, roots.length)) }, () => [] as typeof rootTrees);
  const columnHeights = new Array(columnItems.length).fill(0);
  for (const tree of rootTrees) {
    let index = 0;
    for (let next = 1; next < columnItems.length; next++) if (columnHeights[next] < columnHeights[index]) index = next;
    columnItems[index].push(tree);
    columnHeights[index] += tree.height + gapY;
  }
  const columnWidths = columnItems.map(items => Math.max(0, ...items.map(item => item.width)));
  const columnX: number[] = [];
  for (let index = 0; index < columnItems.length; index++) columnX[index] = index === 0 ? 0 : columnX[index - 1] + columnWidths[index - 1] + gapX;
  const desired: Record<string, { x: number; y: number; layer: number; row: number; parentIds: string[] }> = {};
  const placeTree = (id: string, left: number, y: number, layer: number, parentIds: string[]) => {
    const frame = frameById.get(id)!;
    const span = treeWidth(id);
    const x = left + (span - frame.width) / 2;
    desired[id] = { x, y, layer, row: 0, parentIds };
    const childUnits = unitsFor(id);
    const childrenWidth = childUnits.reduce((sum, unit) => sum + unit.width, 0) + Math.max(0, childUnits.length - 1) * gapX;
    let childLeft = left + (span - childrenWidth) / 2;
    for (const unit of childUnits) {
      let itemLeft = childLeft;
      for (const child of unit.ids) {
        const childSpan = treeWidth(child);
        placeTree(child, itemLeft, y + frame.height + gapY, layer + 1, [id]);
        itemLeft += childSpan + (unit.ids.length > 1 ? gapX : 0);
      }
      childLeft += unit.width + gapX;
    }
  };
  columnItems.forEach((items, column) => {
    let y = 0;
    for (const tree of items) {
      placeTree(tree.id, columnX[column] + (columnWidths[column] - tree.width) / 2, y, 0, []);
      y += tree.height + gapY;
    }
  });

  const dxByRoom = new Map<string, Point>();
  const frames = candidate.frames.map(frame => {
    const target = desired[frame.id];
    const delta: Point = [target.x - frame.x, target.y - frame.y];
    dxByRoom.set(frame.id, delta);
    return { ...frame, x: target.x, y: target.y };
  });
  const roomOwnerByAsset = candidate.roomOwnerByAsset;
  const assetDelta = new Map(candidate.deltaByAsset);
  const positions = { ...candidate.positions };
  const terminalPositions = { ...candidate.terminalPositions };
  const labels = new Map([...candidate.labels].map(([id, label]) => [id, { ...label }]));
  for (const [assetId, roomId] of roomOwnerByAsset) {
    const [dx, dy] = dxByRoom.get(roomId) ?? [0, 0];
    if (!dx && !dy) continue;
    if (positions[assetId]) positions[assetId] = [positions[assetId][0] + dx, positions[assetId][1] + dy];
    const asset = model.assets.find(item => item.id === assetId);
    for (const terminal of asset?.terminals ?? []) if (terminalPositions[terminal]) terminalPositions[terminal] = [terminalPositions[terminal][0] + dx, terminalPositions[terminal][1] + dy];
    const label = labels.get(assetId); if (label) labels.set(assetId, { ...label, x: label.x + dx, y: label.y + dy });
    const previous = assetDelta.get(assetId) ?? [0, 0];
    assetDelta.set(assetId, [previous[0] + dx, previous[1] + dy]);
  }
  const symbolLabelBoxes = candidate.symbolLabelBoxes.map(box => {
    const id = box.id.replace(/^(?:symbol|label):/, '');
    const roomId = roomOwnerByAsset.get(id);
    const [dx, dy] = roomId ? dxByRoom.get(roomId) ?? [0, 0] : [0, 0];
    return { ...box, x: box.x + dx, y: box.y + dy };
  });
  const routingObstacles = [
    ...symbolLabelBoxes,
    ...frames.map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
  ];
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connections = new Map(model.connections.map(connection => [connection.id, connection]));
  const externalRequests = candidate.externalRequests.map(request => {
    const connection = connections.get(request.id)!;
    const fromOwner = ownerByTerminal.get(connection.from)!; const toOwner = ownerByTerminal.get(connection.to)!;
    const original = candidate.originalRoutes.get(request.id)!;
    const fromDelta = assetDelta.get(fromOwner) ?? [0, 0]; const toDelta = assetDelta.get(toOwner) ?? [0, 0];
    return {
      ...request,
      from: [original[0][0] + fromDelta[0], original[0][1] + fromDelta[1]] as Point,
      to: [original.at(-1)![0] + toDelta[0], original.at(-1)![1] + toDelta[1]] as Point,
    };
  });
  const routes = new Map(candidate.routes);
  for (const id of candidate.localRouteIds) {
    const connection = connections.get(id)!;
    const owner = ownerByTerminal.get(connection.from)!;
    const delta = assetDelta.get(owner) ?? [0, 0];
    routes.set(id, candidate.originalRoutes.get(id)!.map(([x, y]) => [x + delta[0], y + delta[1]] as Point));
  }
  const bounds = boundsOf([...Object.values(positions), ...[...routes.values()].flat(), ...frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point])]);
  return {
    ...candidate,
    positions, terminalPositions, labels, frames, routes,
    bounds, deltaByAsset: assetDelta, externalRequests, symbolLabelBoxes, routingObstacles,
    placement: { ...candidate.placement, positions: desired },
  };

  function parentOrder(id: string) {
    const node = roomPlacementPlan[id as keyof typeof roomPlacementPlan];
    return node?.parents.reduce((min, parent) => Math.min(min, parent.order), Infinity) ?? Infinity;
  }
}

function boundsOf(points: readonly Point[]) {
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
