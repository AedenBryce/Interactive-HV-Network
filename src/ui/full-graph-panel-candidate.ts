import type { NetworkModel } from '../session/model';
import { labelLines, type Box, type Point } from './diagram-geometry';
import { compactEquipmentLabel } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import { planOrthogonalRoutes, type RouteRequest } from './orthogonal-route-planner';
import { switchroomMemberships } from './switchroom-frames';
import { compactSupplyTreeLayout, type TreeFootprint } from './compact-supply-tree-layout';

export type FullGraphPanelCandidate = {
  positions: Record<string, Point>;
  labels: Map<string, Box & { lines: string[] }>;
  symbolBoxes: (Box & { id: string })[];
  panelFrames: (Box & { id: string; title: string })[];
  panelByAsset: Map<string, string>;
  parentByAsset: Map<string, string>;
  treeConnectionIds: Set<string>;
  routes: Map<string, readonly Point[]>;
  unresolved: { routeId: string; reason: string }[];
  connectionsWithoutRoute: string[];
  bounds: Box;
};

/**
 * Isolated whole-model layout experiment. Panels are assigned before final
 * asset coordinates. All topology and review claims remain in the input model.
 */
export function layoutFullGraphPanels(model: NetworkModel): FullGraphPanelCandidate {
  const byId = new Map(model.assets.map(asset => [asset.id, asset]));
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacent = new Map(model.assets.map(asset => [asset.id, [] as { peer: string; connectionId: string; terminal: string }[]]));
  for (const connection of model.connections) {
    const from = terminalOwner.get(connection.from); const to = terminalOwner.get(connection.to);
    if (!from || !to || from === to) continue;
    adjacent.get(from)!.push({ peer: to, connectionId: connection.id, terminal: connection.from });
    adjacent.get(to)!.push({ peer: from, connectionId: connection.id, terminal: connection.to });
  }

  const memberships = switchroomMemberships(model);
  const panelByAsset = new Map<string, string>();
  const panelTitle = new Map(memberships.map(group => [group.id, group.label]));
  for (const group of memberships) for (const id of group.memberAssetIds) if (!panelByAsset.has(id)) panelByAsset.set(id, group.id);

  // Source-rooted BFS gives a stable spanning forest and depth for panel planning.
  const roots = [...new Set(model.sources.map(source => source.assetId).filter(id => byId.has(id)))];
  const parentByAsset = new Map<string, string>();
  const parentConnection = new Map<string, string>();
  const depth = new Map<string, number>();
  const treeConnectionIds = new Set<string>();
  const visited = new Set<string>();
  const traverse = (starts: readonly string[]) => {
    const queue = [...starts];
    for (const id of starts) { visited.add(id); depth.set(id, 0); }
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const id = queue[cursor];
      for (const edge of adjacent.get(id)!) {
        if (visited.has(edge.peer)) continue;
        visited.add(edge.peer); parentByAsset.set(edge.peer, id); parentConnection.set(edge.peer, edge.connectionId);
        depth.set(edge.peer, depth.get(id)! + 1); treeConnectionIds.add(edge.connectionId); queue.push(edge.peer);
      }
    }
  };
  traverse(roots);
  for (const asset of model.assets) if (!visited.has(asset.id)) { roots.push(asset.id); traverse([asset.id]); }

  // Assets without canonical room membership are still grouped explicitly:
  // upstream assets use named spines; other components use a corridor cluster.
  const rootFor = (id: string) => { let cursor = id; while (parentByAsset.has(cursor)) cursor = parentByAsset.get(cursor)!; return cursor; };
  const spineIds = new Set(['station', 'boundary', 'line33', 'cv006', 'mine']);
  for (const asset of model.assets) if (!panelByAsset.has(asset.id)) {
    const prefix = asset.id.split(':')[0];
    const groupId = spineIds.has(prefix) ? `spine:${prefix}` : `corridor:${rootFor(asset.id)}`;
    panelByAsset.set(asset.id, groupId);
    if (!panelTitle.has(groupId)) panelTitle.set(groupId, spineIds.has(prefix) ? `${prefix} network spine` : `Network corridor ${rootFor(asset.id)}`);
  }

  // Place panels by first occurrence in the rooted forest, before assigning
  // node coordinates. Each panel is its own non-overlapping vertical column.
  const panelDepth = new Map<string, number>();
  const panelRootOrder = new Map<string, number>();
  const rootOrder = new Map(roots.map((id, index) => [id, index]));
  for (const asset of model.assets) {
    const panel = panelByAsset.get(asset.id)!;
    const d = depth.get(asset.id) ?? 0;
    panelDepth.set(panel, Math.min(panelDepth.get(panel) ?? Infinity, d));
    const r = rootOrder.get(rootFor(asset.id)) ?? roots.length;
    panelRootOrder.set(panel, Math.min(panelRootOrder.get(panel) ?? Infinity, r));
  }
  const orderedPanels = [...panelDepth.keys()].sort((a, b) => panelRootOrder.get(a)! - panelRootOrder.get(b)!
    || panelDepth.get(a)! - panelDepth.get(b)! || a.localeCompare(b));

  const labelText = new Map<string, string[]>();
  const labelWidth = new Map<string, number>();
  const symbolWidth = 92;
  for (const asset of model.assets) {
    const lines = labelLines(compactEquipmentLabel(asset, currentAssetLabel(model, asset)));
    labelText.set(asset.id, lines);
    labelWidth.set(asset.id, Math.max(128, ...lines.map(line => line.length * 13 + 24)));
  }
  const localGap = 360;
  const rowGap = 520;
  const panelGap = 800;
  const pad = 150;
  const nodePanelOrder = new Map<string, number>();
  const panelWidth = new Map<string, number>();
  for (const panel of orderedPanels) {
    const members = model.assets.filter(asset => panelByAsset.get(asset.id) === panel);
    const rows = new Map<number, string[]>();
    for (const asset of members) {
      const d = depth.get(asset.id) ?? 0;
      rows.set(d, [...(rows.get(d) ?? []), asset.id]);
    }
    let maxRowWidth = 0;
    for (const [d, ids] of rows) {
      ids.sort((a, b) => (depth.get(a) ?? d) - (depth.get(b) ?? d) || a.localeCompare(b));
      ids.forEach((id, index) => nodePanelOrder.set(id, index));
      maxRowWidth = Math.max(maxRowWidth, ids.length * (symbolWidth + 20 + Math.max(...ids.map(id => labelWidth.get(id)!)) + localGap));
    }
    panelWidth.set(panel, Math.max(1_200, maxRowWidth + pad * 2));
  }
  const panelX = new Map<string, number>();
  let cursorX = 0;
  for (const panel of orderedPanels) { panelX.set(panel, cursorX); cursorX += panelWidth.get(panel)! + panelGap; }

  const positions: Record<string, Point> = {};
  const labels = new Map<string, Box & { lines: string[] }>();
  const symbolBoxes: (Box & { id: string })[] = [];
  for (const panel of orderedPanels) {
    const members = model.assets.filter(asset => panelByAsset.get(asset.id) === panel);
    const rows = new Map<number, string[]>();
    for (const asset of members) { const d = depth.get(asset.id) ?? 0; rows.set(d, [...(rows.get(d) ?? []), asset.id]); }
    for (const [d, ids] of rows) {
      ids.sort((a, b) => (nodePanelOrder.get(a) ?? 0) - (nodePanelOrder.get(b) ?? 0) || a.localeCompare(b));
      const rowWidth = ids.reduce((sum, id) => sum + symbolWidth + 20 + labelWidth.get(id)! + localGap, -localGap);
      let x = panelX.get(panel)! + (panelWidth.get(panel)! - rowWidth) / 2;
      for (const id of ids) {
        const cx = x + symbolWidth / 2;
        const cy = 240 + d * rowGap;
        positions[id] = [cx, cy];
        const lines = labelText.get(id)!;
        const width = labelWidth.get(id)!;
        const height = Math.max(40, lines.length * 25);
        labels.set(id, { x: cx + symbolWidth / 2 + 20, y: cy - height / 2, width, height, lines });
        symbolBoxes.push({ id: `symbol:${id}`, x: cx - symbolWidth / 2, y: cy - 46, width: symbolWidth, height: 92 });
        x += symbolWidth + 20 + width + localGap;
      }
    }
  }

  // Reflow the panel-assigned nodes as one rooted forest. The room/spine/corridor
  // memberships above remain authoritative; this pass ensures the network
  // itself still reads as a single top-down tree rather than unrelated columns.
  const treeChildren = new Map(model.assets.map(asset => [asset.id, [] as string[]]));
  for (const [child, parent] of parentByAsset) treeChildren.get(parent)!.push(child);
  for (const children of treeChildren.values()) children.sort((a, b) => panelByAsset.get(a)!.localeCompare(panelByAsset.get(b)!) || a.localeCompare(b));
  const footprints = new Map<string, TreeFootprint>(model.assets.map(asset => [asset.id, {
    left: -symbolWidth / 2,
    right: symbolWidth / 2 + 20 + labelWidth.get(asset.id)!,
  }]));
  const forest = compactSupplyTreeLayout(roots, treeChildren, footprints, {
    horizontalGap: 180, verticalGap: rowGap, maxWidth: 10_000, rootGap: 900,
  });
  for (const asset of model.assets) {
    const [x, y] = forest.positions[asset.id];
    positions[asset.id] = [x, y + 240];
    const lines = labelText.get(asset.id)!; const width = labelWidth.get(asset.id)!;
    const height = Math.max(40, lines.length * 25);
    labels.set(asset.id, { x: x + symbolWidth / 2 + 20, y: y + 240 - height / 2, width, height, lines });
  }
  symbolBoxes.splice(0, symbolBoxes.length, ...model.assets.map(asset => {
    const [x, y] = positions[asset.id];
    return { id: `symbol:${asset.id}`, x: x - symbolWidth / 2, y: y - 46, width: symbolWidth, height: 92 };
  }));

  const panelFrames = orderedPanels.map(panel => {
    const ids = model.assets.filter(asset => panelByAsset.get(asset.id) === panel).map(asset => asset.id);
    const boxes = ids.flatMap(id => {
      const symbol = symbolBoxes.find(box => box.id === `symbol:${id}`)!; const label = labels.get(id)!;
      return [symbol, label];
    });
    const left = Math.min(...boxes.map(box => box.x)); const top = Math.min(...boxes.map(box => box.y));
    const right = Math.max(...boxes.map(box => box.x + box.width)); const bottom = Math.max(...boxes.map(box => box.y + box.height));
    return { id: panel, title: panelTitle.get(panel) ?? panel, x: left - pad, y: top - pad, width: right - left + pad * 2, height: bottom - top + pad * 2 };
  });

  const earthOwner = new Map<string, string>();
  for (const asset of model.assets) if (asset.kind === 'earth-switch' && adjacent.get(asset.id)!.length === 1) earthOwner.set(asset.id, adjacent.get(asset.id)![0].peer);
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const outgoing = new Map<string, string[]>();
  for (const [child, parent] of parentByAsset) outgoing.set(parent, [...(outgoing.get(parent) ?? []), child]);
  for (const children of outgoing.values()) children.sort((a, b) => positions[a][0] - positions[b][0]);

  // Explicit port roles: buses use branch-specific taps; earths use side ports;
  // ordinary tree edges leave the parent bottom and enter the child top.
  const pointFor = (assetId: string, peerId: string, edgeId: string): Point => {
    const asset = byId.get(assetId)!; const [x, y] = positions[assetId];
    if (earthOwner.has(assetId)) return [x - symbolWidth / 2, y];
    if (asset.kind === 'bus') return [positions[peerId][0], y + 46];
    if (parentByAsset.get(assetId) === peerId && parentConnection.get(assetId) === edgeId) return [x, y - 46];
    if (parentByAsset.get(peerId) === assetId) {
      const children = outgoing.get(assetId) ?? [];
      const idx = Math.max(0, children.indexOf(peerId));
      const offset = (idx - (children.length - 1) / 2) * Math.min(24, 70 / Math.max(1, children.length));
      return [x + offset, y + 46];
    }
    return [positions[peerId][0] < x ? x - symbolWidth / 2 : x + symbolWidth / 2, y];
  };

  const treeRoutes = new Map<string, readonly Point[]>();
  const alternateRequests: RouteRequest[] = [];
  for (const connection of model.connections) {
    const fromOwner = terminalOwner.get(connection.from); const toOwner = terminalOwner.get(connection.to);
    if (!fromOwner || !toOwner) continue;
    const from = pointFor(fromOwner, toOwner, connection.id);
    const to = pointFor(toOwner, fromOwner, connection.id);
    const route: RouteRequest = { id: connection.id, from, to, fromTerminalId: connection.from, toTerminalId: connection.to,
      preferDown: treeConnectionIds.has(connection.id), order: 0,
      ignoredObstacleIds: [`symbol:${fromOwner}`, `symbol:${toOwner}`, `label:${fromOwner}`, `label:${toOwner}`] };
    if (!treeConnectionIds.has(connection.id)) { alternateRequests.push(route); continue; }
    const parentId = parentByAsset.get(fromOwner) === toOwner ? toOwner : parentByAsset.get(toOwner) === fromOwner ? fromOwner : undefined;
    const childId = parentId === fromOwner ? toOwner : parentId === toOwner ? fromOwner : undefined;
    if (!parentId || !childId) { alternateRequests.push(route); continue; }
    const parent = byId.get(parentId)!; const child = byId.get(childId)!;
    const parentPoint = positions[parentId]; const childPoint = positions[childId];
    let path: Point[];
    if (parent.kind === 'bus') {
      // A bus is drawn as one continuous horizontal spine; each connection
      // owns only its unique vertical tap/drop, so wire strokes never duplicate
      // the shared physical busbar.
      const x = childPoint[0];
      path = [[x, parentPoint[1] + 46], [x, childPoint[1] - 46]];
    } else if (child.kind === 'earth-switch') {
      const laneX = parentPoint[0] + 120;
      path = [[parentPoint[0] + 46, parentPoint[1]], [laneX, parentPoint[1]], [laneX, childPoint[1]], [childPoint[0] - 46, childPoint[1]]];
    } else {
      const siblings = outgoing.get(parentId) ?? [];
      const index = Math.max(0, siblings.indexOf(childId));
      const portX = parentPoint[0] + (index - (siblings.length - 1) / 2) * 32;
      const laneY = parentPoint[1] + 120 + index * 16;
      path = [[portX, parentPoint[1] + 46], [portX, laneY], [childPoint[0], laneY], [childPoint[0], childPoint[1] - 46]];
    }
    if (fromOwner !== parentId) path.reverse();
    treeRoutes.set(connection.id, path);
  }
  const obstacles = [
    ...symbolBoxes,
    ...[...labels].map(([id, box]) => ({ id: `label:${id}`, ...box })),
  ];
  // Ordinary tree edges use explicit semantic ports and direct source-to-load
  // drops; only the 20 alternate/cycle connections enter obstacle-aware A*.
  const routePlan = planOrthogonalRoutes(alternateRequests, { obstacles, clearance: 24,
    reservedRoutes: [...treeRoutes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, fromTerminalId: connection.from, toTerminalId: connection.to };
    }),
    localSearchPadding: 360, maxLocalSearchPadding: 2_880, maxSearchAttempts: 4, maxGridNodes: 35_000, bendPenalty: 180 });
  const allRoutes = new Map(treeRoutes);
  for (const [id, points] of routePlan.routes) allRoutes.set(id, points.map(([x, y]) => [x, y] as Point));

  const all = [...Object.values(positions), ...[...labels.values()].flatMap(box => [[box.x, box.y] as Point, [box.x + box.width, box.y + box.height] as Point]), ...[...allRoutes.values()].flat()];
  const minX = Math.min(...all.map(point => point[0])); const maxX = Math.max(...all.map(point => point[0]));
  const minY = Math.min(...all.map(point => point[1])); const maxY = Math.max(...all.map(point => point[1]));
  return { positions, labels, symbolBoxes, panelFrames, panelByAsset, parentByAsset, treeConnectionIds,
    routes: allRoutes, unresolved: [...routePlan.unresolved], connectionsWithoutRoute: model.connections.map(c => c.id).filter(id => !allRoutes.has(id)),
    bounds: { x: minX, y: minY, width: maxX - minX, height: maxY - minY } };
}
