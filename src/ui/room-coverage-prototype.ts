import type { NetworkModel } from '../session/model';
import { switchroomMemberships } from './switchroom-frames';
import { diagramGeometry, clearRoute, sharedLength } from './diagram-geometry';
import { continuousNetwork } from './continuous-network';
import { planWholeNetworkRooms, type WholeNetworkTreeEdge } from './whole-network-room-layout';

export function auditRoomCoverage(model: NetworkModel) {
  const views = model.presentation!.views;
  const memberships = switchroomMemberships(model);
  const members = new Set(memberships.flatMap(group => group.memberAssetIds));
  const coordinates = (assetId: string) => views.flatMap(view => view.assetIds.includes(assetId) && view.layout.assets[assetId]
    ? [{ viewId: view.id, point: view.layout.assets[assetId] }]
    : []);
  const assets = model.assets.map(asset => ({
    id: asset.id, label: asset.label, kind: asset.kind, assigned: members.has(asset.id),
    candidates: coordinates(asset.id), terminalCandidates: asset.terminals.map(terminal => ({
      terminal, views: views.filter(view => view.assetIds.includes(asset.id) && view.layout.terminals[terminal]).map(view => view.id),
    })),
  }));
  const owner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connections = model.connections.map(connection => {
    const fromOwner = owner.get(connection.from)!; const toOwner = owner.get(connection.to)!;
    const commonViews = views.filter(view => view.layout.terminals[connection.from] && view.layout.terminals[connection.to]).map(view => view.id);
    return { id: connection.id, from: fromOwner, to: toOwner, commonViews,
      fromViews: views.filter(view => view.layout.terminals[connection.from]).map(view => view.id),
      toViews: views.filter(view => view.layout.terminals[connection.to]).map(view => view.id) };
  });
  const uncoveredAssets = assets.filter(asset => !asset.assigned);
  const unresolvedAssets = uncoveredAssets.filter(asset => asset.candidates.length === 0);
  const duplicateAssets = uncoveredAssets.filter(asset => asset.candidates.length > 1);
  const missingTerminalCoordinate = assets.filter(asset => asset.terminalCandidates.some(terminal => terminal.views.length === 0));
  const unresolvedConnections = connections.filter(connection => !connection.commonViews.length);
  return {
    assetCount: assets.length, connectionCount: connections.length, viewCount: views.length,
    canonicalGroupCount: memberships.length, assignedAssetCount: members.size,
    uncoveredAssets, unresolvedAssets, duplicateAssets, missingTerminalCoordinate,
    connectionCandidates: connections, unresolvedConnections,
    connectionsWithCommonView: connections.length - unresolvedConnections.length,
  };
}

export function composeCoverageCandidate(model: NetworkModel) {
  const audit = auditRoomCoverage(model);
  const views = model.presentation!.views;
  const groups = switchroomMemberships(model);
  const groupByAsset = new Map(groups.flatMap(group => group.memberAssetIds.map(id => [id, group.id] as const)));
  const panelByAsset = new Map<string, string>();
  const homeViewByAsset = new Map<string, string>();
  for (const [assetId, panelId] of groupByAsset) panelByAsset.set(assetId, panelId);
  for (const asset of model.assets) {
    if (['line33', 'station', 'boundary', 'cv006', 'mine'].includes(asset.id.split(':')[0]) && !panelByAsset.has(asset.id)) {
      panelByAsset.set(asset.id, topLevelPanel(asset.id));
    }
  }
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const asset of model.assets) {
      if (panelByAsset.has(asset.id)) continue;
      const neighbors = model.connections.flatMap(connection => {
        const peer = asset.terminals.includes(connection.from) ? terminalOwner.get(connection.to)
          : asset.terminals.includes(connection.to) ? terminalOwner.get(connection.from) : undefined;
        const panel = peer ? panelByAsset.get(peer) : undefined;
        return panel ? [panel] : [];
      });
      if (!neighbors.length) continue;
      const counts = new Map<string, number>(); neighbors.forEach(panel => counts.set(panel, (counts.get(panel) ?? 0) + 1));
      const ordered = [...counts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]));
      if (ordered.length === 1 || ordered[0][1] > ordered[1][1]) { panelByAsset.set(asset.id, ordered[0][0]); changed = true; }
    }
  }
  for (const asset of model.assets) {
    const candidates = coordinatesFor(model, asset.id);
    const panelId = panelByAsset.get(asset.id) ?? candidates.map(id => bestGroupForView(id, groups)).find((candidate): candidate is string => !!candidate)
      ?? topLevelPanel(asset.id, candidates[0]);
    panelByAsset.set(asset.id, panelId);
    const chosen = candidates.find(id => viewCanRepresentPanel(id, panelId, groups))
      ?? candidates.find(id => id !== 'whole/overview' && !id.endsWith('/overview')) ?? candidates[0];
    if (chosen) homeViewByAsset.set(asset.id, chosen);
  }
  const geometryByView = new Map<string, ReturnType<typeof diagramGeometry>>();
  const routeViewByConnection = new Map<string, { viewId: string; points: [number, number][] }>();
  const routeCandidatesByConnection = new Map<string, string[]>();
  for (const connection of model.connections) {
    const fromOwner = terminalOwner.get(connection.from)!; const toOwner = terminalOwner.get(connection.to)!;
    const candidates = views.filter(view => view.layout.terminals[connection.from] && view.layout.terminals[connection.to]);
    routeCandidatesByConnection.set(connection.id, candidates.map(view => view.id));
    const fromHome = homeViewByAsset.get(fromOwner); const toHome = homeViewByAsset.get(toOwner);
    candidates.sort((a, b) => {
      const score = (id: string) => Number(id === fromHome) + Number(id === toHome);
      return score(b.id) - score(a.id) || a.id.localeCompare(b.id);
    });
    for (const view of candidates) {
      let geometry = geometryByView.get(view.id);
      if (!geometry) { geometry = diagramGeometry(model, view); geometryByView.set(view.id, geometry); }
      const points = geometry.routes.get(connection.id);
      if (points?.length) { routeViewByConnection.set(connection.id, { viewId: view.id, points }); break; }
    }
  }
  const panelInventory = new Map<string, string[]>();
  for (const [assetId, panelId] of panelByAsset) panelInventory.set(panelId, [...(panelInventory.get(panelId) ?? []), assetId]);
  const panelView = new Map<string, string>();
  for (const group of groups) panelView.set(group.id, group.id);
  for (const [panelId, ids] of panelInventory) if (!panelView.has(panelId)) {
    const counts = new Map<string, number>();
    ids.forEach(id => { const viewId = homeViewByAsset.get(id)!; counts.set(viewId, (counts.get(viewId) ?? 0) + 1); });
    panelView.set(panelId, [...counts].sort((a,b) => b[1]-a[1] || a[0].localeCompare(b[0]))[0][0]);
  }
  const transforms = new Map<string, { panelId: string; dx: number; dy: number; sharedAssets: number; maxAnchorDrift: number }>();
  const viewById = new Map(views.map(view => [view.id, view]));
  for (const [panelId, ids] of panelInventory) {
    const target = viewById.get(panelView.get(panelId)!)!;
    const sourceViews = new Set(ids.map(id => homeViewByAsset.get(id)!));
    for (const sourceId of sourceViews) {
      const source = viewById.get(sourceId)!;
      const anchors = ids.filter(id => target.layout.assets[id] && source.layout.assets[id]).map(id => [
        target.layout.assets[id][0] - source.layout.assets[id][0], target.layout.assets[id][1] - source.layout.assets[id][1],
      ] as const);
      if (sourceId === target.id) { transforms.set(sourceId, { panelId, dx: 0, dy: 0, sharedAssets: anchors.length, maxAnchorDrift: 0 }); continue; }
      if (!anchors.length) { transforms.set(sourceId, { panelId, dx: 0, dy: 0, sharedAssets: 0, maxAnchorDrift: Infinity }); continue; }
      const dx = median(anchors.map(anchor => anchor[0])); const dy = median(anchors.map(anchor => anchor[1]));
      transforms.set(sourceId, { panelId, dx, dy, sharedAssets: anchors.length,
        maxAnchorDrift: Math.max(...anchors.map(anchor => Math.hypot(anchor[0]-dx, anchor[1]-dy))) });
    }
  }
  const localViewOffsets = new Map<string, { panelId: string; dx: number; dy: number }>();
  const panelSizes: { id: string; width: number; height: number }[] = [];
  const localAssetPositions = new Map<string, [number, number]>();
  const subpanelGap = 160; const panelPad = 120;
  for (const [panelId, ids] of panelInventory) {
    const byView = new Map<string, string[]>();
    ids.forEach(id => { const viewId = homeViewByAsset.get(id)!; byView.set(viewId, [...(byView.get(viewId) ?? []), id]); });
    const viewIds = [...byView.keys()].sort((a,b) => a === panelView.get(panelId) ? -1 : b === panelView.get(panelId) ? 1 : a.localeCompare(b));
    let cursorY = panelPad; let maxWidth = 0;
    for (const viewId of viewIds) {
      const view = viewById.get(viewId)!; const ownedIds = byView.get(viewId)!;
      const points = ownedIds.map(id => view.layout.assets[id]).filter((point): point is [number,number] => !!point);
      if (!points.length) continue;
      const minX = Math.min(...points.map(point => point[0])); const maxX = Math.max(...points.map(point => point[0]));
      const minY = Math.min(...points.map(point => point[1])); const maxY = Math.max(...points.map(point => point[1]));
      const dx = panelPad - minX; const dy = cursorY - minY;
      localViewOffsets.set(`${panelId}|${viewId}`, { panelId, dx, dy });
      for (const id of ownedIds) localAssetPositions.set(id, [view.layout.assets[id][0] + dx, view.layout.assets[id][1] + dy]);
      maxWidth = Math.max(maxWidth, maxX - minX + panelPad * 2);
      cursorY += maxY - minY + subpanelGap;
    }
    panelSizes.push({ id: panelId, width: maxWidth, height: cursorY - subpanelGap + panelPad });
  }
  const localTerminalPositions = new Map<string, [number,number]>();
  for (const asset of model.assets) for (const terminal of asset.terminals) {
    const panelId = panelByAsset.get(asset.id)!;
    const homeId = homeViewByAsset.get(asset.id)!; const homeView = viewById.get(homeId)!; const offset = localViewOffsets.get(`${panelId}|${homeId}`)!;
    const homeTerminal = homeView.layout.terminals[terminal];
    if (homeTerminal) { localTerminalPositions.set(terminal, [homeTerminal[0] + offset.dx, homeTerminal[1] + offset.dy]); continue; }
    const fallback = views.find(view => view.assetIds.includes(asset.id) && view.layout.assets[asset.id] && view.layout.terminals[terminal]);
    if (fallback) {
      const fallbackOffset = localViewOffsets.get(`${panelId}|${fallback.id}`);
      const assetPoint = localAssetPositions.get(asset.id)!; const sourceAsset = fallback.layout.assets[asset.id]; const sourceTerminal = fallback.layout.terminals[terminal];
      if (fallbackOffset) localTerminalPositions.set(terminal, [sourceTerminal[0] + fallbackOffset.dx, sourceTerminal[1] + fallbackOffset.dy]);
      else localTerminalPositions.set(terminal, [assetPoint[0] + sourceTerminal[0] - sourceAsset[0], assetPoint[1] + sourceTerminal[1] - sourceAsset[1]]);
    }
  }
  const treeIds = continuousNetwork(model).treeEdgeIds;
  const treeEdges: WholeNetworkTreeEdge[] = model.connections.flatMap(connection => {
    if (!treeIds.has(connection.id)) return [];
    const parentAssetId = terminalOwner.get(connection.from)!; const childAssetId = terminalOwner.get(connection.to)!;
    return [{ id: connection.id, parentAssetId, childAssetId }];
  });
  const placement = planWholeNetworkRooms(panelSizes, treeEdges, panelByAsset);
  const assetPositions = new Map<string, [number,number]>(); const terminalPositions = new Map<string, [number,number]>();
  const panels = panelSizes.map(panel => ({ ...panel, x: placement.positions[panel.id]?.x ?? 0, y: placement.positions[panel.id]?.y ?? 0 }));
  const placedById = new Map(panels.map(panel => [panel.id,panel]));
  for (const [id, point] of localAssetPositions) { const panel = placedById.get(panelByAsset.get(id)!)!; assetPositions.set(id,[point[0]+panel.x,point[1]+panel.y]); }
  for (const [terminal, point] of localTerminalPositions) { const assetId = terminalOwner.get(terminal)!; const panel = placedById.get(panelByAsset.get(assetId)!)!; terminalPositions.set(terminal,[point[0]+panel.x,point[1]+panel.y]); }
  const globalRoutes = new Map<string, [number,number][]>();
  const unresolvedGlobalRouteIds: string[] = [];
  const panelObstacles = panels.map(panel => ({ x: panel.x, y: panel.y, width: panel.width, height: panel.height }));
  const assetObstacles = new Map<string, { x: number; y: number; width: number; height: number }[]>();
  for (const panel of panels) {
    assetObstacles.set(panel.id, panelInventory.get(panel.id)!.filter(id => id !== '').map(id => {
      const [x,y] = assetPositions.get(id)!; return { x: x-44, y: y-44, width: 88, height: 88 };
    }));
  }
  const localOccupied = new Map<string, { from: [number,number]; to: [number,number]; terminals: string[] }[]>();
  const externalOccupied: { from: [number,number]; to: [number,number]; terminals: string[] }[] = [];
  const ownerForTerminal = terminalOwner;
  const pushSegments = (route: [number,number][], occupied: { from: [number,number]; to: [number,number]; terminals: string[] }[], terminals: string[]) => {
    route.slice(1).forEach((to,index) => occupied.push({ from: route[index], to, terminals }));
  };
  const panelBorderPoint = (panel: typeof panels[number], from: [number,number], to: [number,number]): [number,number] => {
    const cx = panel.x + panel.width / 2; const cy = panel.y + panel.height / 2;
    if (Math.abs(to[0]-cx) > Math.abs(to[1]-cy)) {
      const y = Math.min(panel.y+panel.height-24, Math.max(panel.y+24, from[1]));
      return [to[0] >= cx ? panel.x+panel.width : panel.x, y];
    }
    const x = Math.min(panel.x+panel.width-24, Math.max(panel.x+24, from[0]));
    return [x, to[1] >= cy ? panel.y+panel.height : panel.y];
  };
  const append = (a: [number,number][], b: [number,number][]) => [...a, ...b.slice(1)];
  for (const connection of model.connections) {
    const from = terminalPositions.get(connection.from); const to = terminalPositions.get(connection.to);
    if (!from || !to) { unresolvedGlobalRouteIds.push(connection.id); continue; }
    const fromPanel = placedById.get(panelByAsset.get(ownerForTerminal.get(connection.from)!)!)!;
    const toPanel = placedById.get(panelByAsset.get(ownerForTerminal.get(connection.to)!)!)!;
    const endpointOwners = [ownerForTerminal.get(connection.from)!, ownerForTerminal.get(connection.to)!];
    const fromHomeView = homeViewByAsset.get(endpointOwners[0])!; const toHomeView = homeViewByAsset.get(endpointOwners[1])!;
    if (fromPanel.id === toPanel.id && fromHomeView === toHomeView) {
      const source = routeViewByConnection.get(connection.id);
      const sourceOffset = localViewOffsets.get(`${fromPanel.id}|${fromHomeView}`);
      if (source?.viewId === fromHomeView && sourceOffset) {
        const points = source.points.map(([x,y]) => [x/1.6+sourceOffset.dx+fromPanel.x,y/1.6+sourceOffset.dy+fromPanel.y] as [number,number]);
        globalRoutes.set(connection.id, points); continue;
      }
    }
    let route: [number,number][] | undefined;
    if (fromPanel.id === toPanel.id) {
      const occupiedKey = `${fromPanel.id}|${fromHomeView}|${toHomeView}`;
      const occupied = localOccupied.get(occupiedKey) ?? [];
      const sourceAssets = new Set(panelInventory.get(fromPanel.id)!.filter(id => homeViewByAsset.get(id) === fromHomeView || homeViewByAsset.get(id) === toHomeView));
      route = clearRoute(from, to, assetObstacles.get(fromPanel.id)!.filter((_,index) => {
        const id = panelInventory.get(fromPanel.id)![index]; return sourceAssets.has(id) && !endpointOwners.includes(id);
      }), occupied);
      if (route) { localOccupied.set(occupiedKey, occupied); pushSegments(route, occupied, [connection.from,connection.to]); }
    } else {
      const startEdge = panelBorderPoint(fromPanel, from, [toPanel.x+toPanel.width/2,toPanel.y+toPanel.height/2]);
      const endEdge = panelBorderPoint(toPanel, to, [fromPanel.x+fromPanel.width/2,fromPanel.y+fromPanel.height/2]);
      const startStub = clearRoute(from, startEdge, assetObstacles.get(fromPanel.id)!.filter((_,index) => panelInventory.get(fromPanel.id)![index] !== endpointOwners[0]), localOccupied.get(fromPanel.id) ?? []);
      const endStub = clearRoute(endEdge, to, assetObstacles.get(toPanel.id)!.filter((_,index) => panelInventory.get(toPanel.id)![index] !== endpointOwners[1]), localOccupied.get(toPanel.id) ?? []);
      const corridorMinX = Math.min(startEdge[0],endEdge[0])-2000; const corridorMaxX = Math.max(startEdge[0],endEdge[0])+2000;
      const corridorMinY = Math.min(startEdge[1],endEdge[1])-2000; const corridorMaxY = Math.max(startEdge[1],endEdge[1])+2000;
      const nearbyOccupied = externalOccupied.filter(segment => Math.max(segment.from[0],segment.to[0])>=corridorMinX&&Math.min(segment.from[0],segment.to[0])<=corridorMaxX
        &&Math.max(segment.from[1],segment.to[1])>=corridorMinY&&Math.min(segment.from[1],segment.to[1])<=corridorMaxY);
      const between = startStub && endStub ? clearRoute(startEdge, endEdge, panelObstacles, nearbyOccupied) : undefined;
      if (startStub && endStub && between) {
        route = append(append(startStub, between), endStub);
        const fromOccupied = localOccupied.get(fromPanel.id) ?? [];
        const toOccupied = localOccupied.get(toPanel.id) ?? [];
        pushSegments(startStub, fromOccupied, [connection.from]); pushSegments(endStub, toOccupied, [connection.to]);
        localOccupied.set(fromPanel.id, fromOccupied); localOccupied.set(toPanel.id, toOccupied);
        pushSegments(between, externalOccupied, [connection.from,connection.to]);
      }
    }
    if (route) globalRoutes.set(connection.id, route); else unresolvedGlobalRouteIds.push(connection.id);
  }
  const globalRouteFindings = inspectGlobalRoutes(globalRoutes, model.connections);
  return { audit, homeViewByAsset, panelByAsset, panelInventory, panelView, transforms,
    routeViewByConnection, routeCandidatesByConnection, geometryViewCount: geometryByView.size,
    panels, assetPositions, terminalPositions, treeEdges, globalRoutes, unresolvedGlobalRouteIds, globalRouteFindings };
}

function coordinatesFor(model: NetworkModel, assetId: string) {
  return model.presentation!.views.filter(view => view.assetIds.includes(assetId) && view.layout.assets[assetId]).map(view => view.id);
}


function median(values: number[]) { const sorted = [...values].sort((a,b)=>a-b); return sorted[Math.floor(sorted.length/2)]; }

function inspectGlobalRoutes(routes: Map<string,[number,number][]>, connections: NetworkModel['connections']) {
  const byId = new Map(connections.map(connection => [connection.id, connection]));
  const segments = [...routes].flatMap(([id,points]) => points.slice(1).map((to,index) => ({
    id, from: points[index], to, terminals: [byId.get(id)!.from,byId.get(id)!.to],
  })));
  const overlaps: string[] = []; const crossings: string[] = []; const nonOrthogonal: string[] = []; const sharedTerminalIntersections: string[] = [];
  for (let i=0;i<segments.length;i++) {
    const a=segments[i]; if (a.from[0]!==a.to[0]&&a.from[1]!==a.to[1]) nonOrthogonal.push(a.id);
    for (let j=i+1;j<segments.length;j++) {
      const b=segments[j]; if (a.id===b.id) continue;
      const common = a.terminals.some(terminal=>b.terminals.includes(terminal));
      const overlap = sharedLength(a.from,a.to,{from:b.from,to:b.to,terminals:[]});
      if (overlap>0) { if (!common) overlaps.push(`${a.id}/${b.id}`); continue; }
      let point: [number,number] | undefined;
      if (a.from[0]===a.to[0] && b.from[1]===b.to[1]) {
        if (a.from[0]>=Math.min(b.from[0],b.to[0])&&a.from[0]<=Math.max(b.from[0],b.to[0])&&b.from[1]>=Math.min(a.from[1],a.to[1])&&b.from[1]<=Math.max(a.from[1],a.to[1])) point=[a.from[0],b.from[1]];
      } else if (a.from[1]===a.to[1] && b.from[0]===b.to[0]) {
        if (b.from[0]>=Math.min(a.from[0],a.to[0])&&b.from[0]<=Math.max(a.from[0],a.to[0])&&a.from[1]>=Math.min(b.from[1],b.to[1])&&a.from[1]<=Math.max(b.from[1],b.to[1])) point=[b.from[0],a.from[1]];
      }
      if (point) { if (common) sharedTerminalIntersections.push(`${a.id}/${b.id}`); else crossings.push(`${a.id}/${b.id}`); }
    }
  }
  return { overlaps, crossings, nonOrthogonal, sharedTerminalIntersections, routedConnections: routes.size };
}

function bestGroupForView(viewId: string, groups: ReturnType<typeof switchroomMemberships>) {
  return groups.map(group => ({ id: group.id, score: group.id === viewId ? 100 : viewId.startsWith(`${group.id}/`) ? 90
    : group.id.endsWith('/overview') && viewId.startsWith(group.id.slice(0, -'overview'.length)) ? 70 : 0 }))
    .filter(item => item.score).sort((a,b) => b.score-a.score || a.id.localeCompare(b.id))[0]?.id;
}

function viewCanRepresentPanel(viewId: string, panelId: string, groups: ReturnType<typeof switchroomMemberships>) {
  if (panelId.startsWith('trunk:')) return viewId !== 'whole/overview';
  if (panelId.startsWith('detail:')) return viewId !== 'whole/overview';
  return bestGroupForView(viewId, groups) === panelId;
}

function topLevelPanel(assetId: string, viewId?: string) {
  const prefix = assetId.split(':')[0];
  if (prefix === 'line33') return 'trunk:33kv';
  if (prefix === 'station' || prefix === 'boundary') return 'trunk:station';
  if (prefix === 'cv006') return 'trunk:cv006';
  if (prefix === 'mine') return 'trunk:mine';
  if (viewId && viewId !== 'whole/overview') return `detail:${viewId}`;
  return `detail:${prefix}`;
}
