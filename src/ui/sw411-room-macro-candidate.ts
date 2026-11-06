import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { extractSw411RoomBridgePaths } from './room-bridge-paths';
import { planOrthogonalRoutes, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryFinding, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';

/** Isolated geometry experiment. Does not alter the model or production renderer. */
export function layoutSw411RoomMacroCandidate(model: NetworkModel) {
  const base = continuousNetwork(model);
  const extraction = extractSw411RoomBridgePaths(model, base.treeEdgeIds);
  const positions = Object.fromEntries(Object.entries(base.view.layout.assets).map(([id, point]) => [id, [...point] as Point]));
  const labels = new Map([...base.labels].map(([id, label]) => [id, { ...label }]));
  const frames = base.panels.map(frame => ({ ...frame }));
  const selectedRooms = new Set(['sw411/overview', ...extraction.bridges.map(path => path.childRoomId)]);
  const frameById = new Map(frames.filter(frame => selectedRooms.has(frame.id)).map(frame => [frame.id, frame]));
  const root = frameById.get('sw411/overview');
  if (!root) throw new Error('SW411 root frame is missing');
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const deltaByAsset = new Map<string, Point>();
  const moveAssets = (ids: readonly string[], dx: number, dy: number) => {
    for (const id of ids) {
      const asset = assetById.get(id); const point = positions[id];
      if (!asset || !point) continue;
      positions[id] = [point[0] + dx, point[1] + dy];
      const prior = deltaByAsset.get(id) ?? [0, 0]; deltaByAsset.set(id, [prior[0] + dx, prior[1] + dy]);
      const label = labels.get(id); if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
    }
  };
  const translateFrame = (frame: typeof frames[number], dx: number, dy: number) => {
    moveAssets(frame.assetIds, dx, dy);
    frame.x += dx; frame.y += dy;
  };
  const routeAnchor = (connectionId: string, assetId: string): Point => {
    const edge = connectionById.get(connectionId)!; const points = base.routes.get(connectionId)!;
    if (ownerByTerminal.get(edge.from) === assetId) return [...points[0]];
    if (ownerByTerminal.get(edge.to) === assetId) return [...points.at(-1)!];
    throw new Error(`${connectionId} has no route endpoint on ${assetId}`);
  };
  const rootBottom = root.y + root.height;
  let leftRowTop = rootBottom + 1100;
  let rightRowTop = rootBottom + 1100;
  let cvRowTop: number | undefined;
  let sw435RowTop: number | undefined;
  const cvX = root.x - 4500;
  const cvTop = rootBottom + 350;
  // The shared CV006 trunk is a separate overhead-line corridor between SW411
  // and its two RMU rooms. It is not part of either room frame.
  const corridorPositions: Record<string, Point> = {
    'cv006:interface:sw411': [cvX, cvTop],
    'cv006:pole:17': [cvX, cvTop + 520],
    'cv006:pole:49': [cvX, cvTop + 1120],
  };
  for (const [id, target] of Object.entries(corridorPositions)) {
    const prior = positions[id]; if (!prior) continue;
    moveAssets([id], target[0] - prior[0], target[1] - prior[1]);
  }

  // The extractor order is the approved tier sequence, including the two
  // tier-03 branches. Alternate rooms into two exterior columns so a later
  // feeder does not need to drop through every prior room frame.
  const ordered = [...extraction.bridges];
  for (const path of ordered) {
    const frame = frameById.get(path.childRoomId);
    if (!frame) throw new Error(`Missing rigid room ${path.childRoomId}`);
    let targetFrameX: number;
    let targetFrameY: number;
    if (path.childRoomId === 'stockpile/stockpile-hv' || path.childRoomId === 'train-loading/hv') {
      targetFrameX = root.x - frame.width - 2200;
      targetFrameY = leftRowTop;
      leftRowTop = targetFrameY + frame.height + 1000;
    } else if (path.childRoomId === 'cv006/rm406-hv' || path.childRoomId === 'cv006/rm410-hv') {
      cvRowTop ??= leftRowTop;
      targetFrameX = path.childRoomId === 'cv006/rm406-hv' ? cvX - frame.width - 1200 : cvX + 1200;
      targetFrameY = cvRowTop;
      if (path.childRoomId === 'cv006/rm410-hv') leftRowTop = cvRowTop + frame.height + 1000;
    } else if (path.childRoomId === 'crushing-2/sw435-hv') {
      targetFrameX = root.x + 3000 - frame.width;
      targetFrameY = leftRowTop;
      sw435RowTop = targetFrameY;
      leftRowTop = targetFrameY + frame.height + 1000;
    } else if (path.childRoomId === 'crushing-1/hv') {
      const sw435 = frameById.get('crushing-2/sw435-hv')!;
      targetFrameX = sw435.x + sw435.width + 1200;
      targetFrameY = sw435RowTop ?? leftRowTop;
      rightRowTop = targetFrameY + frame.height + 1000;
    } else {
      targetFrameX = root.x + root.width + 2200;
      targetFrameY = rightRowTop;
      rightRowTop = targetFrameY + frame.height + 1000;
    }
    const dx = targetFrameX - frame.x;
    const dy = targetFrameY - frame.y;
    translateFrame(frame, dx, dy);
  }

  // Position every exclusive bridge asset along its ordered top-down route.
  // Shared CV006 prefix assets remain once in their dedicated corridor.
  for (const path of ordered) {
    const shared = new Set(path.sharedBridgeAssetIds);
    const sourceOld = routeAnchor(path.orderedConnectionIds[0], path.sourceCoreAssetId);
    const sourceDelta = deltaByAsset.get(path.sourceCoreAssetId) ?? [0, 0];
    let start: Point = [sourceOld[0] + sourceDelta[0], sourceOld[1] + sourceDelta[1]];
    let startIndex = 0;
    for (let index = 1; index < path.orderedAssetIds.length - 1; index++) {
      const id = path.orderedAssetIds[index];
      if (shared.has(id)) { start = [...positions[id]]; startIndex = index; }
    }
    const targetOld = routeAnchor(path.orderedConnectionIds.at(-1)!, path.childCoreAssetId);
    const targetDelta = deltaByAsset.get(path.childCoreAssetId) ?? [0, 0];
    const end: Point = [targetOld[0] + targetDelta[0], targetOld[1] + targetDelta[1]];
    const exclusive = path.orderedAssetIds.slice(startIndex + 1, -1).filter(id => !shared.has(id));
    for (let index = 0; index < exclusive.length; index++) {
      const id = exclusive[index]; const point = positions[id];
      if (!point) continue;
      const fraction = (index + 1) / (exclusive.length + 1);
      const next: Point = [start[0] + (end[0] - start[0]) * fraction, start[1] + (end[1] - start[1]) * fraction];
      moveAssets([id], next[0] - point[0], next[1] - point[1]);
    }
  }

  const routeIds = new Set(extraction.inventoryConnectionIds);
  const requests: RouteRequest[] = [];
  const candidateAssetIds = new Set(extraction.bridges.flatMap(path => path.orderedAssetIds));
  for (const frame of frameById.values()) frame.assetIds.forEach(id => candidateAssetIds.add(id));
  const ring = connectionById.get(extraction.ring.id)!;
  candidateAssetIds.add(ownerByTerminal.get(ring.from)!); candidateAssetIds.add(ownerByTerminal.get(ring.to)!);
  const obstacles = model.assets.filter(asset => candidateAssetIds.has(asset.id)).flatMap(asset => {
    const point = positions[asset.id]; const label = labels.get(asset.id);
    if (!point) return [];
    const items = [{ id: `symbol:${asset.id}`, x: point[0] - 46, y: point[1] - 46, width: 92, height: 92 }];
    if (label) items.push({ id: `label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
    return items;
  });
  for (const id of routeIds) {
    const edge = connectionById.get(id)!; const old = base.routes.get(id);
    if (!old) continue;
    const fromOwner = ownerByTerminal.get(edge.from)!; const toOwner = ownerByTerminal.get(edge.to)!;
    const fromDelta = deltaByAsset.get(fromOwner) ?? [0, 0]; const toDelta = deltaByAsset.get(toOwner) ?? [0, 0];
    const from: Point = [old[0][0] + fromDelta[0], old[0][1] + fromDelta[1]];
    const end = old.at(-1)!; const to: Point = [end[0] + toDelta[0], end[1] + toDelta[1]];
    const ignored = [`symbol:${fromOwner}`, `symbol:${toOwner}`, `label:${fromOwner}`, `label:${toOwner}`];
    for (const frame of frameById.values()) if ((from[0] >= frame.x && from[0] <= frame.x + frame.width && from[1] >= frame.y && from[1] <= frame.y + frame.height)
      || (to[0] >= frame.x && to[0] <= frame.x + frame.width && to[1] >= frame.y && to[1] <= frame.y + frame.height)) ignored.push(`room:${frame.id}`);
    requests.push({ id, from, to, fromTerminalId: edge.from, toTerminalId: edge.to, preferDown: true, order: extraction.inventoryConnectionIds.indexOf(id), ignoredObstacleIds: ignored });
  }
  const roomObstacles = [...frameById.values()].map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const routeOptions = { obstacles: [...obstacles, ...roomObstacles], clearance: 60, localSearchPadding: 900, maxLocalSearchPadding: 12_000, maxSearchAttempts: 5, maxGridNodes: 180_000 } as const;
  const plan = planOrthogonalRoutes(requests, routeOptions);
  const routes = new Map<string, readonly Point[]>([...plan.routes].map(([id, points]) => [id, points.map(point => [point[0], point[1]] as Point)]));
  const collisionFreePartialRoutes = new Map(routes);
  // Recovery pass keeps all accepted candidate routes as reservations, then
  // routes failed edges in tier order. No collision is waived by the audit.
  const reservedRoutes: ReservedRoute[] = [...routes].map(([id, points]) => {
    const edge = connectionById.get(id)!;
    return { id, points: points.map(point => [point[0], point[1]] as Point), fromTerminalId: edge.from, toTerminalId: edge.to };
  });
  for (const item of plan.unresolved) {
    const request = requests.find(candidate => candidate.id === item.routeId)!;
    const preferredPath: Point[] = [request.from as Point, [request.to[0], request.from[1]], request.to as Point];
    const retry = planOrthogonalRoutes([{ ...request, preferredPath }], { ...routeOptions, reservedRoutes });
    const points = retry.routes.get(item.routeId);
    if (points) {
      routes.set(item.routeId, points.map(point => [point[0], point[1]] as Point));
      reservedRoutes.push({ id: item.routeId, points, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
    }
  }
  const geometryRoutes: GeometryRoute[] = [...routes].map(([id, points]) => {
    const edge = connectionById.get(id)!; return { id, points, terminals: [edge.from, edge.to] };
  });
  const geometryFrames = [...frameById.values()].map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const findings: GeometryFinding[] = validateDiagramGeometry({ routes: geometryRoutes, roomFrames: geometryFrames });
  const unresolvedDetails = plan.unresolved.map(item => {
    const request = requests.find(candidate => candidate.id === item.routeId)!;
    const lPaths = [
      [request.from, [request.to[0], request.from[1]], request.to] as Point[],
      [request.from, [request.from[0], request.to[1]], request.to] as Point[],
    ];
    const obstacleHits = lPaths.map(points => obstacles.concat(roomObstacles).filter(box => points.slice(1).some((to, index) => segmentBoxExpanded(points[index], to, box, 60))).map(box => box.id));
    return { id: item.routeId, reason: item.reason, from: request.from, to: request.to, endpointOwners: [ownerByTerminal.get(request.fromTerminalId), ownerByTerminal.get(request.toTerminalId)], horizontalFirstObstacleIds: obstacleHits[0], verticalFirstObstacleIds: obstacleHits[1] };
  });
  const routeFrameHits = findings.filter((item): item is Extract<GeometryFinding, { type: 'route-room-frame' }> => item.type === 'route-room-frame').map(item => {
    const route = connectionById.get(item.routeId)!;
    const endpoints = [ownerByTerminal.get(route.from), ownerByTerminal.get(route.to)];
    const frame = frameById.get(item.roomFrameId);
    return { routeId: item.routeId, frameId: item.roomFrameId, intended: !!frame && endpoints.some(id => frame.assetIds.includes(id!)) };
  });
  const routeHits = geometryRoutes.flatMap(route => model.assets.flatMap(asset => {
    const assetId = asset.id; const point = positions[assetId]; const label = labels.get(assetId);
    const owners = (route.terminals ?? []).map(terminal => ownerByTerminal.get(terminal));
    if (owners.includes(assetId)) return [];
    const labelHit = !!label && route.points.slice(1).some((to, index) => segmentBox(route.points[index], to, label));
    const symbolHit = !!point && route.points.slice(1).some((to, index) => segmentBox(route.points[index], to, { x: point[0] - 46, y: point[1] - 46, width: 92, height: 92 }));
    return labelHit || symbolHit ? [`${route.id}→${assetId}${labelHit ? ':label' : ':symbol'}`] : [];
  }));
  return {
    positions, labels, frames, routes, collisionFreePartialRoutes, unresolved: [...plan.unresolved], remainingUnresolved: [...routeIds].filter(id => !routes.has(id)), unresolvedDetails, findings, routeHits, routeFrameHits,
    routeInventoryIds: [...routeIds], missingRouteIds: [...routeIds].filter(id => !routes.has(id)),
    roomFrames: geometryFrames,
    bounds: boundsOf([...Object.values(positions), ...[...routes.values()].flat()]),
  };
}

function segmentBox(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }) {
  if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height;
  if (a[1] === b[1]) return a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
  return true;
}
function segmentBoxExpanded(a: Point, b: Point, box: { x: number; y: number; width: number; height: number }, pad: number) {
  return segmentBox(a, b, { x: box.x - pad, y: box.y - pad, width: box.width + pad * 2, height: box.height + pad * 2 });
}
function boundsOf(points: readonly Point[]) {
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
