import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { planOrthogonalRoutes, type ReservedRoute, type RouteRequest } from './orthogonal-route-planner';
import { planWholeNetworkRooms } from './whole-network-room-layout';
import { roomClusterOwnership } from './room-cluster-ownership';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';

/**
 * Isolated alternative: retain continuous-network room internals rigidly,
 * place only those frames with owner-confirmed parent relationships, then
 * reroute only joins whose endpoints belong to different room clusters.
 */
export function layoutRoomOwnedTopDownCandidate(model: NetworkModel) {
  const base = continuousNetwork(model);
  const layout = base.view.layout;
  const frames = base.panels.map(frame => ({ ...frame, assetIds: [...frame.assetIds], memberAssetIds: [...frame.memberAssetIds] }));
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const treeConnections = model.connections.filter(connection => base.treeEdgeIds.has(connection.id));
  const earthSwitchIds = new Set(model.assets.filter(asset => asset.kind === 'earth-switch').map(asset => asset.id));
  const treeEdges = treeConnections.flatMap(connection => {
    const from = owners.get(connection.from); const to = owners.get(connection.to);
    return from && to && from !== to && !earthSwitchIds.has(from) && !earthSwitchIds.has(to)
      ? [{ id: connection.id, parentAssetId: from, childAssetId: to }]
      : [];
  });
  const earthBranches = treeConnections.flatMap(connection => {
    const from = owners.get(connection.from); const to = owners.get(connection.to);
    const earthSwitchAssetId = from && earthSwitchIds.has(from) ? from : to && earthSwitchIds.has(to) ? to : undefined;
    const ownerAssetId = earthSwitchAssetId === from ? to : from;
    return earthSwitchAssetId && ownerAssetId ? [{ id: connection.id, ownerAssetId, earthSwitchAssetId, direction: 'owner-to-earth-switch' as const }] : [];
  });
  const ownership = roomClusterOwnership(model, treeEdges, earthBranches);
  const roomOwnerByAsset = new Map(ownership.ownerByAssetId);
  const duplicateRoomOwners = [...ownership.ambiguousAssetIds];

  // Expand each room block to include all uniquely owned feeder assets and
  // their actual rendered cards/labels before solving the room positions.
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  for (const frame of frames) {
    const owned = [...roomOwnerByAsset].filter(([, owner]) => owner === frame.id).map(([assetId]) => assetId);
    const extents = [{ left: frame.x, top: frame.y, right: frame.x + frame.width, bottom: frame.y + frame.height }];
    for (const assetId of owned) {
      const asset = assetById.get(assetId)!;
      const point = layout.assets[assetId]; if (!point) continue;
      const label = base.labels.get(assetId);
      if (hasDeviceCard(asset) && label) {
        const card = deviceCard(asset, point, label);
        extents.push({ left: point[0] + card.x, top: point[1] + card.y, right: point[0] + card.x + card.width, bottom: point[1] + card.y + card.height });
      } else extents.push({ left: point[0] - 46, top: point[1] - 46, right: point[0] + 46, bottom: point[1] + 46 });
      if (label) extents.push({ left: label.x, top: label.y, right: label.x + label.width, bottom: label.y + label.height });
    }
    const left = Math.min(...extents.map(rect => rect.left)) - 220;
    const top = Math.min(...extents.map(rect => rect.top)) - 260;
    const right = Math.max(...extents.map(rect => rect.right)) + 220;
    const bottom = Math.max(...extents.map(rect => rect.bottom)) + 260;
    frame.x = left; frame.y = top; frame.width = right - left; frame.height = bottom - top;
    frame.assetIds = owned; frame.memberAssetIds = owned;
  }
  const placement = planWholeNetworkRooms(frames, treeEdges, roomOwnerByAsset);
  const positions = Object.fromEntries(Object.entries(layout.assets).map(([id, point]) => [id, [...point] as Point]));
  const terminalPositions = Object.fromEntries(Object.entries(layout.terminals).map(([id, point]) => [id, [...point] as Point]));
  const labels = new Map([...base.labels].map(([id, label]) => [id, { ...label }]));
  const deltaByRoom = new Map<string, Point>();
  const deltaByAsset = new Map<string, Point>();
  for (const frame of frames) {
    const target = placement.positions[frame.id];
    if (!target) continue;
    const dx = target.x - frame.x; const dy = target.y - frame.y;
    deltaByRoom.set(frame.id, [dx, dy]);
    for (const id of frame.memberAssetIds) {
      const point = positions[id]; if (!point) continue;
      positions[id] = [point[0] + dx, point[1] + dy];
      deltaByAsset.set(id, [dx, dy]);
      const asset = model.assets.find(item => item.id === id)!;
      for (const terminal of asset.terminals) {
        const terminalPoint = terminalPositions[terminal];
        if (terminalPoint) terminalPositions[terminal] = [terminalPoint[0] + dx, terminalPoint[1] + dy];
      }
      const label = labels.get(id); if (label) labels.set(id, { ...label, x: label.x + dx, y: label.y + dy });
    }
    frame.x = target.x; frame.y = target.y;
  }
  const roomObstacles = frames.map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
  const ownerByTerminal = owners;
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const localRouteIds = new Set<string>(); const externalRequests: RouteRequest[] = [];
  const routes = new Map<string, readonly Point[]>();
  const reservedRoutes: ReservedRoute[] = [];
  for (const connection of model.connections) {
    const fromOwner = ownerByTerminal.get(connection.from)!; const toOwner = ownerByTerminal.get(connection.to)!;
    const fromRoom = roomOwnerByAsset.get(fromOwner); const toRoom = roomOwnerByAsset.get(toOwner);
    const original = base.routes.get(connection.id);
    if (!original) continue;
    if (fromRoom && fromRoom === toRoom) {
      const delta = deltaByAsset.get(fromOwner) ?? [0, 0];
      const moved = original.map(([x, y]) => [x + delta[0], y + delta[1]] as Point);
      routes.set(connection.id, moved); localRouteIds.add(connection.id);
      reservedRoutes.push({ id: connection.id, points: moved, fromTerminalId: connection.from, toTerminalId: connection.to });
      continue;
    }
    const fromDelta = deltaByAsset.get(fromOwner) ?? [0, 0]; const toDelta = deltaByAsset.get(toOwner) ?? [0, 0];
    const from: Point = [original[0][0] + fromDelta[0], original[0][1] + fromDelta[1]];
    const last = original.at(-1)!; const to: Point = [last[0] + toDelta[0], last[1] + toDelta[1]];
    const ignored = [`symbol:${fromOwner}`, `label:${fromOwner}`, `symbol:${toOwner}`, `label:${toOwner}`];
    for (const frame of frames) if (pointInside(from, frame) || pointInside(to, frame)) ignored.push(`room:${frame.id}`);
    externalRequests.push({
      id: connection.id, from, to, fromTerminalId: connection.from, toTerminalId: connection.to,
      preferDown: base.treeEdgeIds.has(connection.id), order: base.treeEdgeIds.has(connection.id) ? 0 : 1,
      ignoredObstacleIds: ignored,
    });
  }
  const symbolsAndLabels = model.assets.flatMap(asset => {
    const point = positions[asset.id]; const label = labels.get(asset.id);
    if (!point) return [];
    const boxes = [] as { id: string; x: number; y: number; width: number; height: number }[];
    if (hasDeviceCard(asset) && label) {
      const card = deviceCard(asset, point, label);
      boxes.push({ id: `symbol:${asset.id}`, x: point[0] + card.x, y: point[1] + card.y, width: card.width, height: card.height });
    } else boxes.push({ id: `symbol:${asset.id}`, x: point[0] - 46, y: point[1] - 46, width: 92, height: 92 });
    if (label) boxes.push({ id: `label:${asset.id}`, x: label.x, y: label.y, width: label.width, height: label.height });
    return boxes;
  });
  const routePlan = planOrthogonalRoutes(externalRequests, {
    obstacles: [...symbolsAndLabels, ...roomObstacles],
    reservedRoutes,
    clearance: 32,
    localSearchPadding: 500,
    maxLocalSearchPadding: 8_000,
    maxSearchAttempts: 4,
    maxGridNodes: 50_000,
    bendPenalty: 160,
  });
  for (const [id, points] of routePlan.routes) routes.set(id, points.map(point => [point[0], point[1]] as Point));
  const routesForValidation: GeometryRoute[] = [...routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points, terminals: [connection.from, connection.to] };
  });
  const findings = validateDiagramGeometry({
    routes: routesForValidation,
    roomFrames: frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
  });
  const unresolved = routePlan.unresolved.map(item => `${item.routeId}:${item.reason}`);
  const bounds = boundsOf([...Object.values(positions), ...[...routes.values()].flat(), ...frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point])]);
  return {
    positions, terminalPositions, labels, frames, routes, findings, unresolved, bounds,
    originalRoutes: base.routes,
    originalFrames: base.panels.map(frame => ({ ...frame, assetIds: [...frame.assetIds], memberAssetIds: [...frame.memberAssetIds] })),
    deltaByAsset,
    deltaByRoom,
    externalRequests,
    routingObstacles: [...symbolsAndLabels, ...roomObstacles],
    initialRouteCount: base.routes.size,
    routeCount: routes.size,
    expectedConnectionCount: model.connections.length,
    connectionsWithoutRoute: model.connections.map(connection => connection.id).filter(id => !routes.has(id)),
    localRouteIds: [...localRouteIds],
    externalConnectionIds: externalRequests.map(request => request.id),
    roomOwnerByAsset,
    duplicateRoomOwners: [...new Set(duplicateRoomOwners)],
    placement,
    symbolLabelBoxes: symbolsAndLabels,
  };
}

function pointInside(point: Point, box: { x: number; y: number; width: number; height: number }) {
  return point[0] >= box.x && point[0] <= box.x + box.width && point[1] >= box.y && point[1] <= box.y + box.height;
}
function boundsOf(points: readonly Point[]) {
  const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
