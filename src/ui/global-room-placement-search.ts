import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { roomPlacementPlan } from './room-placement-plan';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import { validateDiagramGeometry } from './geometry-validator';
import { cutsBox, type Point } from './diagram-geometry';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];
type Box = { id: string; x: number; y: number; width: number; height: number };
type Footprint = { minX: number; minY: number; maxX: number; maxY: number };
type LayoutNode = { id: string; frame?: Frame; assetIds: string[]; parentIds: Set<string>; box: Footprint; baseX: number };
type PlacementCandidate = {
  id: string;
  roomTranslations: Record<string, Point>;
  assetTranslations: Record<string, Point>;
  groupOverlaps: string[];
  parentOrderViolations: string[];
  bounds: { width: number; height: number; area: number };
};

const ringPair = ['SW435', 'SW431'] as const;

/**
 * Bounded, deterministic global placement search. It keeps production device
 * geometry rigid within room groups, rejects invalid room placements using
 * measured content footprints, and scores complete route plans before any
 * candidate can be promoted. The parameter sweep is a whole-network solve:
 * it never nudges one room in response to another room's visual position.
 */
export function searchGlobalRoomPlacements(model: NetworkModel, options: {
  routeCandidates?: boolean;
  routeCandidateLimit?: number;
  onProgress?: (phase: string, detail: unknown) => void;
} = {}) {
  const base = continuousNetwork(model);
  options.onProgress?.('seed-ready', { routes: base.routes.size, frames: base.panels.length, treeEdges: base.treeEdgeIds.size });
  const frames = base.panels;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const treeConnections = model.connections.filter(connection => base.treeEdgeIds.has(connection.id));
  const roomOwner = coreRoomOwnerByAsset(frames);
  const contentBoxes = model.assets.flatMap(asset => {
    if (base.hiddenIds.has(asset.id)) return [];
    const point = base.view.layout.assets[asset.id]; const label = base.labels.get(asset.id);
    if (!point) return [];
    const result: Box[] = [];
    if (hasDeviceCard(asset) && label) {
      const card = deviceCard(asset, point, label);
      result.push({ id: `symbol:${asset.id}`, x: point[0] + card.x, y: point[1] + card.y, width: card.width, height: card.height });
    } else result.push({ id: `symbol:${asset.id}`, x: point[0] - 46, y: point[1] - 46, width: 92, height: 92 });
    if (label) result.push({ id: `label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
    return result;
  });
  const footprints = roomFootprints(frames, roomOwner, contentBoxes);
  const roomFootprintDistribution = frames.map(frame => {
    const footprint = footprints.get(frame.id)!;
    const assetCount = [...roomOwner].filter(([, owner]) => owner === frame.id).length;
    return {
      id: frame.id,
      title: frame.title,
      assetCount,
      footprintWidth: footprint.maxX - footprint.minX,
      footprintHeight: footprint.maxY - footprint.minY,
      frameWidth: frame.width,
      frameHeight: frame.height,
      contentOverflow: {
        left: frame.x - footprint.minX,
        top: frame.y - footprint.minY,
        right: footprint.maxX - (frame.x + frame.width),
        bottom: footprint.maxY - (frame.y + frame.height),
      },
    };
  }).sort((a, b) => b.footprintHeight - a.footprintHeight);
  const productionBaseline = baselineMetrics(base, model, contentBoxes);
  const layoutSpecs = [
    { gap: 300, width: 24_000 }, { gap: 420, width: 30_000 },
    { gap: 540, width: 36_000 }, { gap: 660, width: 42_000 },
    { gap: 780, width: 48_000 }, { gap: 900, width: 54_000 },
  ];
  const rawCandidates = layoutSpecs.map(({ gap, width }) => buildTreePlacement(
    frames, model, base.view.layout.assets, treeConnections, ownerByTerminal, roomOwner, contentBoxes,
    `global-gap${gap}-width${width}`, gap, width,
  ));
  const candidates = rawCandidates.filter(candidate => candidate.groupOverlaps.length === 0 && candidate.parentOrderViolations.length === 0
    && candidate.bounds.width <= 45_000 && candidate.bounds.height <= 100_000)
    .sort((a, b) => a.bounds.area - b.bounds.area || a.bounds.height - b.bounds.height || a.id.localeCompare(b.id));
  console.info('global room placement geometry ranking', JSON.stringify({
    productionBaseline,
    roomFootprintDistribution,
    feasibleCount: candidates.length,
    rejectedCount: rawCandidates.length - candidates.length,
    candidates: rawCandidates.map(({ id, bounds, groupOverlaps, parentOrderViolations }) => ({ id, bounds, groupOverlaps: groupOverlaps.length, groupOverlapIds: groupOverlaps, parentOrderViolations: parentOrderViolations.length, parentOrderViolationIds: parentOrderViolations })),
  }));
  options.onProgress?.('geometry-ranked', {
    productionBaseline,
    roomFootprintDistribution,
    feasibleCount: candidates.length,
    rejectedCount: rawCandidates.length - candidates.length,
    candidates: rawCandidates.map(({ id, bounds, groupOverlaps, parentOrderViolations, roomTranslations, assetTranslations }) => ({ id, bounds, groupOverlaps, parentOrderViolations, roomTranslations, assetTranslations })),
  });
  if (options.routeCandidates === false) return { productionBaseline, roomFootprintDistribution, geometryCandidateCount: candidates.length, geometryCandidates: candidates, fullyRouted: [] };

  const fullyRouted = candidates.slice(0, Math.max(1, options.routeCandidateLimit ?? 1)).map(candidate => {
    const layout = layoutWholeGraphCandidate(model, { roomTranslations: candidate.roomTranslations, assetTranslations: candidate.assetTranslations, routeBudget: 'quick', baseGeometry: base });
    const result = {
      id: candidate.id,
      geometryCandidate: candidate,
      routeCount: layout.routeCount,
      unresolvedCount: layout.unresolved.length,
      unresolved: layout.unresolved,
      crossings: layout.findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: layout.findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: layout.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: layout.findings.filter(item => item.type === 'non-orthogonal').length,
      frameOverlaps: layout.findings.filter(item => item.type === 'room-frame-overlap').length,
      frameCuts: layout.findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: unrelatedFrameCutCount(layout, model, ownerByTerminal),
      contentBoxCollisions: layout.contentBoxCollisions.length,
      symbolLabelRouteHits: routeHitsContent(layout.routes, layout.symbolLabelBoxes, model, ownerByTerminal),
      routedSw411Joins: sw411JoinIds(model).filter(id => layout.routes.has(id)),
      missingSw411Joins: sw411JoinIds(model).filter(id => !layout.routes.has(id)),
      bounds: layout.bounds,
      aspectRatio: layout.bounds.width / Math.max(1, layout.bounds.height),
      routeLength: [...layout.routes.values()].reduce((sum, points) => sum + points.slice(1).reduce((length, point, index) =>
        length + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]), 0), 0),
      score: [
        -layout.routeCount,
        layout.findings.filter(item => item.type === 'route-crossing').length,
        layout.findings.filter(item => item.type === 'shared-route-length').length,
        layout.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        layout.contentBoxCollisions.length,
        routeHitsContent(layout.routes, layout.symbolLabelBoxes, model, ownerByTerminal),
        unrelatedFrameCutCount(layout, model, ownerByTerminal),
        layout.bounds.width / Math.max(1, layout.bounds.height),
        layout.bounds.width * layout.bounds.height,
      ],
    };
    options.onProgress?.('candidate-routed', { id: result.id, routeCount: result.routeCount, unresolvedCount: result.unresolvedCount, score: result.score });
    return result;
  });
  fullyRouted.sort((a, b) => compareCandidateScores(a.score, b.score) || a.id.localeCompare(b.id));
  options.onProgress?.('whole-layout-ranked', fullyRouted.map(({ id, routeCount, unresolvedCount, score, bounds }) => ({ id, routeCount, unresolvedCount, score, bounds })));
  return { productionBaseline, roomFootprintDistribution, geometryCandidateCount: candidates.length, geometryCandidates: candidates, fullyRouted };
}

function compareCandidateScores(a: readonly number[], b: readonly number[]) {
  for (let index = 0; index < Math.max(a.length, b.length); index++) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference) return difference;
  }
  return 0;
}

function buildTreePlacement(
  frames: readonly Frame[],
  model: NetworkModel,
  assetPositions: Readonly<Record<string, Point>>,
  treeConnections: readonly NetworkModel['connections'][number][],
  ownerByTerminal: ReadonlyMap<string, string>,
  coreRoomOwner: ReadonlyMap<string, string>,
  contentBoxes: readonly Box[],
  id: string,
  horizontalGap: number,
  rowWidthCap: number,
): PlacementCandidate {
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const nodes: LayoutNode[] = [];
  const assetNodeId = new Map<string, string>();
  const roomBoxes = roomFootprints(frames, coreRoomOwner, contentBoxes);
  for (const frame of frames) {
    const coreAssetIds = model.assets.filter(asset => coreRoomOwner.get(asset.id) === frame.id).map(asset => asset.id);
    nodes.push({ id: frame.id, frame, assetIds: coreAssetIds, parentIds: new Set(), box: roomBoxes.get(frame.id)!, baseX: frame.x });
    for (const assetId of coreAssetIds) assetNodeId.set(assetId, frame.id);
  }
  const boxesByAsset = new Map<string, Box[]>();
  for (const box of contentBoxes) {
    const assetId = box.id.replace(/^(?:symbol|label):/, '');
    boxesByAsset.set(assetId, [...(boxesByAsset.get(assetId) ?? []), box]);
  }
  for (const asset of model.assets) {
    if (assetNodeId.has(asset.id)) continue;
    const id = `asset:${asset.id}`; const point = assetPositions[asset.id] ?? [0, 0];
    const assetBoxes = boxesByAsset.get(asset.id) ?? [];
    const seed = assetBoxes.length ? boxUnion(assetBoxes) : { minX: point[0] - 46, minY: point[1] - 46, maxX: point[0] + 46, maxY: point[1] + 46 };
    nodes.push({ id, assetIds: [asset.id], parentIds: new Set(), box: seed, baseX: point[0] });
    assetNodeId.set(asset.id, id);
  }

  const neighbors = new Map(model.assets.map(asset => [asset.id, [] as string[]]));
  for (const connection of treeConnections) {
    const from = ownerByTerminal.get(connection.from); const to = ownerByTerminal.get(connection.to);
    if (!from || !to || from === to) continue;
    neighbors.get(from)!.push(to); neighbors.get(to)!.push(from);
  }
  const assetParent = new Map<string, string>(); const visited = new Set<string>();
  const roots = [...new Set(model.sources.map(source => source.assetId).filter(id => assetById.has(id)))];
  const traverse = (rootIds: readonly string[]) => {
    const queue = [...rootIds]; for (const root of rootIds) visited.add(root);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parentAsset = queue[cursor];
      for (const childAsset of neighbors.get(parentAsset) ?? []) {
        if (visited.has(childAsset)) continue;
        visited.add(childAsset); assetParent.set(childAsset, parentAsset); queue.push(childAsset);
      }
    }
  };
  traverse(roots);
  for (const asset of model.assets) if (!visited.has(asset.id)) { roots.push(asset.id); traverse([asset.id]); }
  const nodeById = new Map(nodes.map(node => [node.id, node]));
  for (const [childAsset, parentAsset] of assetParent) {
    const childNodeId = assetNodeId.get(childAsset)!; const parentNodeId = assetNodeId.get(parentAsset)!;
    if (childNodeId === parentNodeId) continue;
    const childNode = nodeById.get(childNodeId)!;
    if (childNode.frame && roomPlacementPlan[childNode.frame.id as keyof typeof roomPlacementPlan]?.topology !== 'owner-confirmed') continue;
    childNode.parentIds.add(parentNodeId);
  }
  for (const frame of frames) {
    const node = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (node?.topology !== 'owner-confirmed') continue;
    // The owner-confirmed room hierarchy is authoritative at room boundaries.
    // Do not let a distant out-of-frame asset (including removed cable-end
    // markers) become the room macro's parent after graph contraction.
    nodeById.get(frame.id)!.parentIds.clear();
    for (const parent of node.parents) if (parent.kind === 'room'
      && roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology === 'owner-confirmed'
      && nodeById.has(parent.id)) nodeById.get(frame.id)!.parentIds.add(parent.id);
  }

  const depthMemo = new Map<string, number>();
  const depth = (nodeId: string, visiting = new Set<string>()): number => {
    const cached = depthMemo.get(nodeId); if (cached !== undefined) return cached;
    if (visiting.has(nodeId)) return 0;
    const next = new Set(visiting); next.add(nodeId);
    const parents = [...(nodeById.get(nodeId)?.parentIds ?? [])].filter(parent => nodeById.has(parent));
    const result = parents.length ? 1 + Math.max(...parents.map(parent => depth(parent, next))) : 0;
    depthMemo.set(nodeId, result); return result;
  };
  const nodeDepth = new Map(nodes.map(node => [node.id, depth(node.id)]));
  const deltas: Record<string, Point> = {};
  const placed = new Map<string, Footprint>();
  let layerBottom = 0;
  const nodeByFrameTitle = new Map(nodes.filter(node => node.frame).map(node => [node.frame!.title, node]));
  for (const level of [...new Set(nodeDepth.values())].sort((a, b) => a - b)) {
    const layerNodes = nodes.filter(node => nodeDepth.get(node.id) === level).sort((a, b) => a.baseX - b.baseX || a.id.localeCompare(b.id));
    const units: LayoutNode[][] = [];
    const paired = new Set<string>();
    const ringA = nodeByFrameTitle.get(ringPair[0]); const ringB = nodeByFrameTitle.get(ringPair[1]);
    if (ringA && ringB && layerNodes.includes(ringA) && layerNodes.includes(ringB)) { units.push([ringA, ringB]); paired.add(ringA.id); paired.add(ringB.id); }
    for (const node of layerNodes) if (!paired.has(node.id)) units.push([node]);
    units.sort((a, b) => a[0].baseX - b[0].baseX || a[0].id.localeCompare(b[0].id));
    const rows: LayoutNode[][][] = []; let row: LayoutNode[][] = []; let rowWidth = 0;
    const unitWidth = (unit: readonly LayoutNode[]) => unit.reduce((sum, node) => sum + node.box.maxX - node.box.minX, 0) + Math.max(0, unit.length - 1) * horizontalGap;
    for (const unit of units) {
      const width = unitWidth(unit);
      if (row.length && rowWidth + horizontalGap + width > rowWidthCap) { rows.push(row); row = []; rowWidth = 0; }
      row.push(unit); rowWidth += (row.length > 1 ? horizontalGap : 0) + width;
    }
    if (row.length) rows.push(row);
    let rowY = layerBottom;
    for (const rowUnits of rows) {
      const rowParentIds = [...new Set(rowUnits.flatMap(unit => unit.flatMap(node => [...node.parentIds])))];
      const parentBottom = Math.max(-Infinity, ...rowParentIds.map(parentId => placed.get(parentId)?.maxY ?? -Infinity));
      if (Number.isFinite(parentBottom)) rowY = Math.max(rowY, parentBottom + horizontalGap);
      let x = 0; let rowBottom = rowY;
      for (const unit of rowUnits) {
        const unitX = x; let unitBottom = rowY;
        for (const [index, node] of unit.entries()) {
          const dx = x - node.box.minX; const dy = rowY - node.box.minY;
          const moved = translateBox(node.box, dx, dy);
          placed.set(node.id, moved);
          if (node.frame) deltas[node.id] = [dx, dy];
          else for (const assetId of node.assetIds) deltas[`asset:${assetId}`] = [dx, dy];
          x += node.box.maxX - node.box.minX + (index < unit.length - 1 ? horizontalGap : 0);
          unitBottom = Math.max(unitBottom, moved.maxY);
        }
        x = unitX + unitWidth(unit) + horizontalGap;
        rowBottom = Math.max(rowBottom, unitBottom);
      }
      rowY = rowBottom + horizontalGap;
    }
    layerBottom = Math.max(layerBottom, rowY - horizontalGap);
  }
  const forceConfirmedTransformerBelowRoom = (parentId: string, childId: string) => {
    const parentNode = nodeById.get(parentId); const childNode = nodeById.get(childId);
    const parentBox = placed.get(parentId); const childBox = placed.get(childId);
    if (!parentNode || !childNode || !parentBox || !childBox) return;
    // The owner-confirmed room macro is the drawing parent for these two
    // transformer branches. Remove a contradictory reverse collapsed-tree
    // edge, then move the transformer and its downstream tree descendants as
    // one rigid branch below the room.
    parentNode.parentIds.delete(childId);
    const shift = parentBox.maxY + horizontalGap - childBox.minY;
    if (shift <= 0) return;
    const descendants = new Set<string>([childId]);
    let progressed = true;
    while (progressed) {
      progressed = false;
      for (const node of nodes) if (!descendants.has(node.id) && node.id !== parentId
        && [...node.parentIds].some(parent => descendants.has(parent))) {
        descendants.add(node.id); progressed = true;
      }
    }
    for (const descendantId of descendants) {
      const box = placed.get(descendantId)!;
      placed.set(descendantId, { ...box, minY: box.minY + shift, maxY: box.maxY + shift });
      const node = nodeById.get(descendantId)!;
      if (node.frame) deltas[node.id] = [deltas[node.id][0], deltas[node.id][1] + shift];
      else for (const assetId of node.assetIds) deltas[`asset:${assetId}`] = [deltas[`asset:${assetId}`][0], deltas[`asset:${assetId}`][1] + shift];
    }
  };
  forceConfirmedTransformerBelowRoom('services/mine-services', 'asset:rm712:tf712');
  forceConfirmedTransformerBelowRoom('services/workshop', 'asset:rm713:tf713');
  const boxes = [...placed.values()];
  const groupOverlaps = nodes.flatMap((a, index) => nodes.slice(index + 1).filter(b => overlap(placed.get(a.id)!, placed.get(b.id)!)).map(b => `${a.id}↔${b.id}`));
  const parentOrderViolations = nodes.flatMap(node => [...node.parentIds].filter(parentId => placed.get(node.id)!.minY < placed.get(parentId)!.maxY).map(parentId => `${parentId}→${node.id}`));
  const minX = Math.min(...boxes.map(box => box.minX)); const minY = Math.min(...boxes.map(box => box.minY));
  const maxX = Math.max(...boxes.map(box => box.maxX)); const maxY = Math.max(...boxes.map(box => box.maxY));
  const roomTranslations = Object.fromEntries(frames.map(frame => [frame.id, deltas[frame.id] ?? [0, 0] as Point]));
  const assetTranslations = Object.fromEntries(model.assets.filter(asset => !coreRoomOwner.has(asset.id)).map(asset => [asset.id, deltas[`asset:${asset.id}`] ?? [0, 0] as Point]));
  return { id, roomTranslations, assetTranslations, groupOverlaps, parentOrderViolations, bounds: { width: maxX - minX, height: maxY - minY, area: (maxX - minX) * (maxY - minY) } };
}

function coreRoomOwnerByAsset(frames: readonly Frame[]) {
  const owners = new Map<string, string>(); const ambiguous = new Set<string>();
  for (const frame of frames) for (const assetId of frame.assetIds) {
    if (owners.has(assetId) && owners.get(assetId) !== frame.id) { owners.delete(assetId); ambiguous.add(assetId); }
    else if (!ambiguous.has(assetId)) owners.set(assetId, frame.id);
  }
  return owners;
}

function roomFootprints(frames: readonly Frame[], roomOwner: ReadonlyMap<string, string>, boxes: readonly Box[]) {
  const result = new Map<string, Footprint>();
  for (const frame of frames) result.set(frame.id, { minX: frame.x, minY: frame.y, maxX: frame.x + frame.width, maxY: frame.y + frame.height });
  for (const box of boxes) {
    const assetId = box.id.replace(/^(?:symbol|label):/, ''); const room = roomOwner.get(assetId);
    if (!room) continue;
    const footprint = result.get(room)!;
    footprint.minX = Math.min(footprint.minX, box.x); footprint.minY = Math.min(footprint.minY, box.y);
    footprint.maxX = Math.max(footprint.maxX, box.x + box.width); footprint.maxY = Math.max(footprint.maxY, box.y + box.height);
  }
  return result;
}

function baselineMetrics(base: ReturnType<typeof continuousNetwork>, model: NetworkModel, boxes: readonly Box[]) {
  const routes = [...base.routes].map(([id, points]) => {
    const connection = model.connections.find(item => item.id === id)!;
    return { id, points, terminals: [connection.from, connection.to] as [string, string] };
  });
  const findings = validateDiagramGeometry({ routes, roomFrames: base.panels.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })) });
  const frameOverlaps = base.panels.flatMap((a, index) => base.panels.slice(index + 1).filter(b => overlap(
    { minX: a.x, minY: a.y, maxX: a.x + a.width, maxY: a.y + a.height },
    { minX: b.x, minY: b.y, maxX: b.x + b.width, maxY: b.y + b.height },
  )).map(b => `${a.id}↔${b.id}`));
  return {
    routes: base.routes.size,
    connections: model.connections.length,
    crossings: findings.filter(item => item.type === 'route-crossing').length,
    sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
    endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
    frameOverlaps: frameOverlaps.length,
    frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
    contentBoxes: boxes.length,
  };
}

function unrelatedFrameCutCount(layout: ReturnType<typeof layoutWholeGraphCandidate>, model: NetworkModel, ownerByTerminal: ReadonlyMap<string, string>) {
  return layout.findings.filter(item => item.type === 'route-room-frame').filter(item => {
    const connection = model.connections.find(candidate => candidate.id === item.routeId)!;
    const endpointRooms = [layout.roomOwnerByAsset.get(ownerByTerminal.get(connection.from)!), layout.roomOwnerByAsset.get(ownerByTerminal.get(connection.to)!)];
    return !endpointRooms.includes(item.roomFrameId);
  }).length;
}

function routeHitsContent(routes: ReadonlyMap<string, readonly Point[]>, boxes: readonly Box[], model: NetworkModel, ownerByTerminal: ReadonlyMap<string, string>) {
  let hits = 0;
  for (const [routeId, points] of routes) {
    const connection = model.connections.find(candidate => candidate.id === routeId)!;
    const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
    for (const box of boxes) {
      if (endpoints.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
      if (points.slice(1).some((point, index) => cutsBox(points[index], point, box))) hits++;
    }
  }
  return hits;
}

function sw411JoinIds(model: NetworkModel) {
  return model.connections.filter(connection => connection.id.startsWith('whole:join:') && (
    connection.from.startsWith('sw411:') || connection.to.startsWith('sw411:')
  )).map(connection => connection.id).sort();
}

function translateBox(box: Footprint, dx: number, dy: number): Footprint {
  return { minX: box.minX + dx, minY: box.minY + dy, maxX: box.maxX + dx, maxY: box.maxY + dy };
}

function boxUnion(boxes: readonly Box[]): Footprint {
  return {
    minX: Math.min(...boxes.map(box => box.x)), minY: Math.min(...boxes.map(box => box.y)),
    maxX: Math.max(...boxes.map(box => box.x + box.width)), maxY: Math.max(...boxes.map(box => box.y + box.height)),
  };
}

function overlap(a: Footprint, b: Footprint) {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;
}
