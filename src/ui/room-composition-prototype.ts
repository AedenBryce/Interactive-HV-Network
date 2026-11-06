import type { NetworkModel } from '../session/model';
import { diagramGeometry, clearRoute, sharedLength } from './diagram-geometry';
import { switchroomMemberships } from './switchroom-frames';
import { planWholeNetworkRooms, type WholeNetworkTreeEdge } from './whole-network-room-layout';
import { continuousNetwork } from './continuous-network';

export type PrototypePoint = [number, number];
export type PrototypeSegment = { from: PrototypePoint; to: PrototypePoint };
export type PrototypePanel = {
  id: string; label: string; x: number; y: number; width: number; height: number;
  sourceViews: string[]; assetIds: string[];
};
export type RoomCompositionPrototype = {
  panels: PrototypePanel[];
  externalRoutes: Map<string, PrototypePoint[]>;
  treeEdges: WholeNetworkTreeEdge[];
  crossRoomConnectionIds: string[];
  unassignedAssetIds: string[];
  unassignedConnectionIds: string[];
  unresolvedEndpointIds: string[];
  localConnectionIds: string[];
  unresolvedLocalConnectionIds: string[];
  localRouteSegments: PrototypeSegment[];
  routeFindings: { overlaps: string[]; crossings: string[]; nonOrthogonal: string[] };
  bounds: { x: number; y: number; width: number; height: number };
};

/**
 * Compose the current model's existing detail-view geometry into canonical
 * room panels. This is a throwaway presentation experiment; it does not edit
 * the model, electrical relationships, source claims or device states.
 */
export function composeRoomPanels(model: NetworkModel): RoomCompositionPrototype {
  const memberships = switchroomMemberships(model);
  const views = model.presentation!.views;
  const viewById = new Map(views.map(view => [view.id, view]));
  const assetById = new Map(model.assets.map(asset => [asset.id, asset]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = new Map<string, string>();
  const viewGeometry = new Map<string, ReturnType<typeof diagramGeometry>>();
  const localAsset = new Map<string, PrototypePoint>();
  const localTerminal = new Map<string, PrototypePoint>();
  const localBoundary = new Map<string, Map<string, PrototypePoint>>();
  const localRoutesByRoom = new Map<string, Map<string, PrototypePoint[]>>();
  const localObstacles = new Map<string, { assetId: string; box: { x: number; y: number; width: number; height: number } }[]>();
  const panels: PrototypePanel[] = [];
  const duplicateMemberships: string[] = [];
  const pad = 90;
  const viewGap = 100;

  for (const membership of memberships) for (const id of membership.memberAssetIds) {
    if (roomByAsset.has(id)) duplicateMemberships.push(id);
    else roomByAsset.set(id, membership.id);
  }

  for (const membership of memberships) {
    const memberSet = new Set(membership.memberAssetIds);
    const primary = viewById.get(membership.id);
    if (!primary) throw new Error(`No primary detail view for room ${membership.id}`);
    const sourceViews = [primary];
    const covered = new Set(primary.assetIds);
    while (membership.memberAssetIds.some(id => !covered.has(id))) {
      const candidate = views
        .filter(view => view.id !== primary.id && !view.id.endsWith('/overview')
          && view.assetIds.length > 0 && view.assetIds.every(id => memberSet.has(id)))
        .map(view => ({ view, gain: view.assetIds.filter(id => !covered.has(id)).length }))
        .filter(item => item.gain > 0)
        .sort((a, b) => b.gain - a.gain || a.view.id.localeCompare(b.view.id))[0]?.view;
      if (!candidate) throw new Error(`Room ${membership.id} has members without a local detail layout`);
      sourceViews.push(candidate);
      candidate.assetIds.forEach(id => covered.add(id));
    }
    const geometries = sourceViews.map(view => {
      const geometry = diagramGeometry(model, view);
      viewGeometry.set(view.id, geometry);
      return { view, geometry, bounds: geometry.view.bounds };
    });
    const primaryGeometry = geometries[0];
    const extras = geometries.slice(1);
    const extraWidth = extras.reduce((sum, item) => sum + item.bounds[2], 0) + Math.max(0, extras.length - 1) * viewGap;
    const width = Math.max(primaryGeometry.bounds[2], extraWidth) + pad * 2;
    const extraHeight = extras.length ? Math.max(...extras.map(item => item.bounds[3])) + viewGap : 0;
    const height = primaryGeometry.bounds[3] + extraHeight + pad * 2;
    const panel: PrototypePanel = {
      id: membership.id, label: membership.label, x: 0, y: 0, width, height,
      sourceViews: sourceViews.map(view => view.id), assetIds: membership.memberAssetIds,
    };
    panels.push(panel);
    localRoutesByRoom.set(panel.id, new Map());
    localObstacles.set(panel.id, []);

    let extraX = (width - extraWidth) / 2 + pad;
    for (let index = 0; index < geometries.length; index++) {
      const item = geometries[index];
      const [bx, by, bw] = item.bounds;
      const tx = index === 0 ? (width - bw) / 2 - bx : extraX - bx;
      const ty = index === 0 ? pad - by : pad + primaryGeometry.bounds[3] + viewGap - by;
      if (index > 0) extraX += item.bounds[2] + viewGap;
      const currentAssets = new Set<string>();
      for (const id of item.view.assetIds) {
        const isCanonical = memberSet.has(id);
        const alreadyPlaced = localAsset.has(id);
        if (isCanonical && !alreadyPlaced) {
          const point = item.geometry.view.layout.assets[id];
          if (!point) throw new Error(`Missing position for ${id} in ${item.view.id}`);
          localAsset.set(id, [point[0] + tx, point[1] + ty]);
          currentAssets.add(id);
          localObstacles.get(panel.id)!.push({ assetId: id, box: { x: point[0] + tx - 42, y: point[1] + ty - 42, width: 84, height: 84 } });
          const label = item.geometry.labels.get(id);
          if (label) localObstacles.get(panel.id)!.push({ assetId: id, box: { x: label.x + tx, y: label.y + ty, width: label.width, height: label.height } });
        }
        // Interface assets are not duplicated as panel devices, but their
        // exact detail-view terminal coordinates are the model's port anchors.
        for (const terminal of assetById.get(id)!.terminals) {
          const terminalPoint = item.geometry.view.layout.terminals[terminal];
          if (terminalPoint && !localTerminal.has(terminal)) localTerminal.set(terminal, [terminalPoint[0] + tx, terminalPoint[1] + ty]);
        }
      }
      for (const [connectionId, route] of item.geometry.routes) {
        const connection = model.connections.find(candidate => candidate.id === connectionId)!;
        const fromOwner = ownerByTerminal.get(connection.from)!;
        const toOwner = ownerByTerminal.get(connection.to)!;
        if (currentAssets.has(fromOwner) && currentAssets.has(toOwner)) localRoutesByRoom.get(panel.id)!.set(connectionId,
          route.map(([x, y]) => [x + tx, y + ty]));
      }
      const boundaries = localBoundary.get(item.view.id) ?? new Map<string, PrototypePoint>();
      for (const boundary of item.geometry.view.boundaries ?? []) boundaries.set(boundary.connectionId, [boundary.position[0] + tx, boundary.position[1] + ty]);
      localBoundary.set(item.view.id, boundaries);
    }
  }
  if (duplicateMemberships.length) throw new Error(`Assets assigned to multiple room groups: ${duplicateMemberships.join(', ')}`);
  const missingMemberPositions = panels.flatMap(panel => panel.assetIds.filter(id => !localAsset.has(id)));
  if (missingMemberPositions.length) throw new Error(`No canonical position for room members: ${missingMemberPositions.join(', ')}`);

  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const localConnectionIds = model.connections.flatMap(connection => {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from)!);
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to)!);
    return fromRoom && fromRoom === toRoom ? [connection.id] : [];
  });
  const unresolvedLocalConnectionIds: string[] = [];
  for (const id of localConnectionIds) {
    const connection = connectionById.get(id)!;
    const fromOwner = ownerByTerminal.get(connection.from)!;
    const toOwner = ownerByTerminal.get(connection.to)!;
    const roomId = roomByAsset.get(fromOwner)!;
    if (localRoutesByRoom.get(roomId)!.has(id)) continue;
    const from = localTerminal.get(connection.from); const to = localTerminal.get(connection.to);
    if (!from || !to) { unresolvedLocalConnectionIds.push(id); continue; }
    const obstacles = localObstacles.get(roomId)!
      .filter(item => item.assetId !== fromOwner && item.assetId !== toOwner)
      .map(item => item.box);
    const occupied = [...localRoutesByRoom.get(roomId)!.values()].flatMap(route => route.slice(1).map((point, index) => ({
      from: route[index], to: point, terminals: [] as string[],
    })));
    const route = clearRoute(from, to, obstacles, occupied);
    if (!route) unresolvedLocalConnectionIds.push(id);
    else localRoutesByRoom.get(roomId)!.set(id, route);
  }

  // Reuse the presentation-only tree chosen by the current renderer. A room
  // edge controls visual ordering only; non-tree model connections remain
  // separate cross-room conductors.
  const existingTreeIds = continuousNetwork(model).treeEdgeIds;
  const treeEdges: WholeNetworkTreeEdge[] = [];
  for (const connection of model.connections) {
    if (!existingTreeIds.has(connection.id)) continue;
    const fromAssetId = ownerByTerminal.get(connection.from)!;
    const toAssetId = ownerByTerminal.get(connection.to)!;
    const fromRoom = roomByAsset.get(fromAssetId);
    const toRoom = roomByAsset.get(toAssetId);
    if (fromRoom && toRoom && fromRoom !== toRoom) treeEdges.push({ id: connection.id, parentAssetId: fromAssetId, childAssetId: toAssetId });
  }
  const placement = planWholeNetworkRooms(panels, treeEdges, roomByAsset);
  for (const panel of panels) {
    const position = placement.positions[panel.id];
    if (!position) throw new Error(`Room placement left ${panel.id} unplaced`);
    panel.x = position.x;
    panel.y = position.y;
  }

  const parentByRoom = new Map<string, string>();
  for (const edge of treeEdges) {
    const fromRoom = roomByAsset.get(edge.parentAssetId)!;
    const toRoom = roomByAsset.get(edge.childAssetId)!;
    if (!parentByRoom.has(toRoom)) parentByRoom.set(toRoom, fromRoom);
  }
  const panelById = new Map(panels.map(panel => [panel.id, panel]));
  const terminalPosition = (terminalId: string): PrototypePoint | undefined => {
    const owner = ownerByTerminal.get(terminalId)!;
    const roomId = roomByAsset.get(owner);
    const panel = roomId ? panelById.get(roomId) : undefined;
    const local = localTerminal.get(terminalId);
    return panel && local ? [panel.x + local[0], panel.y + local[1]] : undefined;
  };
  const boundaryPosition = (roomId: string, connectionId: string): PrototypePoint | undefined => {
    const panel = panelById.get(roomId)!;
    const local = panel.sourceViews.map(id => localBoundary.get(id)?.get(connectionId)).find((point): point is PrototypePoint => !!point);
    return local ? [panel.x + local[0], panel.y + local[1]] : undefined;
  };
  const panelBoxes = panels.map(panel => ({ id: panel.id, x: panel.x, y: panel.y, width: panel.width, height: panel.height }));
  const crossRoomConnectionIds = model.connections.flatMap(connection => {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from)!);
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to)!);
    return fromRoom && toRoom && fromRoom !== toRoom ? [connection.id] : [];
  });
  const assignedAssets = new Set(panels.flatMap(panel => panel.assetIds));
  const representedConnections = new Set([...localConnectionIds, ...crossRoomConnectionIds]);
  const unassignedAssetIds = model.assets.filter(asset => !assignedAssets.has(asset.id)).map(asset => asset.id);
  const unassignedConnectionIds = model.connections.filter(connection => !representedConnections.has(connection.id)).map(connection => connection.id);
  const externalRoutes = new Map<string, PrototypePoint[]>();
  const unresolvedEndpointIds: string[] = [];
  const occupied: { from: PrototypePoint; to: PrototypePoint; terminals: string[] }[] = [];
  for (const id of crossRoomConnectionIds) {
    const connection = connectionById.get(id)!;
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from)!)!;
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to)!)!;
    const start = boundaryPosition(fromRoom, id) ?? terminalPosition(connection.from);
    const end = boundaryPosition(toRoom, id) ?? terminalPosition(connection.to);
    if (!start || !end) { unresolvedEndpointIds.push(id); continue; }
    const obstacles = panelBoxes.filter(box => box.id !== fromRoom && box.id !== toRoom);
    const route = clearRoute(start, end, obstacles, occupied);
    if (!route) { unresolvedEndpointIds.push(id); continue; }
    externalRoutes.set(id, route);
    route.slice(1).forEach((to, index) => occupied.push({ from: route[index], to, terminals: [] }));
  }

  const positionedLocalSegments = panels.flatMap(panel => [...localRoutesByRoom.get(panel.id)!.values()].flatMap(route => route.slice(1).map((to, index) => ({
    from: [panel.x + route[index][0], panel.y + route[index][1]] as PrototypePoint,
    to: [panel.x + to[0], panel.y + to[1]] as PrototypePoint,
  }))));
  const positionedExternalSegments = [...externalRoutes.values()].flatMap(route => route.slice(1).map((to, index) => ({ from: route[index], to })));
  const routeFindings = validateRoutes([...positionedLocalSegments, ...positionedExternalSegments]);
  const minX = Math.min(...panels.map(panel => panel.x));
  const minY = Math.min(...panels.map(panel => panel.y));
  const maxX = Math.max(...panels.map(panel => panel.x + panel.width));
  const maxY = Math.max(...panels.map(panel => panel.y + panel.height));
  return {
    panels, externalRoutes, treeEdges, crossRoomConnectionIds, unassignedAssetIds, unassignedConnectionIds, unresolvedEndpointIds,
    localConnectionIds, unresolvedLocalConnectionIds,
    localRouteSegments: positionedLocalSegments, routeFindings,
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
  };
}

function validateRoutes(segments: PrototypeSegment[]) {
  const overlaps: string[] = [];
  const crossings: string[] = [];
  const nonOrthogonal: string[] = [];
  for (let i = 0; i < segments.length; i++) {
    const a = segments[i];
    if (a.from[0] !== a.to[0] && a.from[1] !== a.to[1]) nonOrthogonal.push(JSON.stringify(a));
    for (let j = i + 1; j < segments.length; j++) {
      const b = segments[j];
      if (sharedLength(a.from, a.to, { from: b.from, to: b.to, terminals: [] }) > 0) overlaps.push(`${i}/${j}`);
      if ((a.from[0] === a.to[0]) !== (b.from[0] === b.to[0])) {
        const vertical = a.from[0] === a.to[0] ? a : b;
        const horizontal = vertical === a ? b : a;
        const x = vertical.from[0]; const y = horizontal.from[1];
        if (x > Math.min(horizontal.from[0], horizontal.to[0]) && x < Math.max(horizontal.from[0], horizontal.to[0])
          && y > Math.min(vertical.from[1], vertical.to[1]) && y < Math.max(vertical.from[1], vertical.to[1])) crossings.push(`${i}/${j}`);
      }
    }
  }
  return { overlaps, crossings, nonOrthogonal };
}
