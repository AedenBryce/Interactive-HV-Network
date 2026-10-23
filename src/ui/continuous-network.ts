import type { NetworkModel } from '../session/model';
import type { DiagramView } from '../session/presentation';
import { getRemovableMechanism } from '../session/mechanisms';
import { labelLines, orthogonalPoints } from './diagram-geometry';
import type { AssetLabel, Point } from './diagram-geometry';

// Source-area membership and a drawing forest organise existing identities only.
// Neither the forest nor its continuous routes add an electrical relationship.
export function continuousNetwork(model: NetworkModel) {
  const assets = model.assets;
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const owners = new Map(assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacent = new Map(assets.map(asset => [asset.id, [] as { assetId: string; connectionId: string; terminal: string }[]]));
  const terminalLinks = new Map<string, string[]>();
  for (const link of model.connections) {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    if (a === b) continue;
    adjacent.get(a)!.push({ assetId: b, connectionId: link.id, terminal: link.from });
    adjacent.get(b)!.push({ assetId: a, connectionId: link.id, terminal: link.to });
    for (const [terminal, peer] of [[link.from, b], [link.to, a]]) terminalLinks.set(terminal, [...(terminalLinks.get(terminal) ?? []), peer]);
  }
  // Distance is a drawing-order preference, independent of switching/source state.
  const sourceOrder = new Map(model.sources.map(source => [source.assetId, 0]));
  const sourceQueue = [...sourceOrder.keys()];
  for (let i = 0; i < sourceQueue.length; i++) for (const peer of adjacent.get(sourceQueue[i])!) if (!sourceOrder.has(peer.assetId)) {
    sourceOrder.set(peer.assetId, sourceOrder.get(sourceQueue[i])! + 1); sourceQueue.push(peer.assetId);
  }
  const original = model.presentation!;
  const regions = original.views.find(view => view.id === original.overviewId)!.regions ?? [];
  const group = new Map<string, string>();
  for (const asset of assets) {
    let best = 0;
    for (const region of regions) {
      const prefix = region.targetViewId.split('/')[0] + '/';
      const score = original.views.filter(view => view.id.startsWith(prefix) && view.assetIds.includes(asset.id)).length;
      if (score > best) { best = score; group.set(asset.id, region.id); }
    }
  }
  for (let pass = 0; pass < assets.length; pass++) {
    let changed = false;
    for (const asset of assets) if (!group.has(asset.id)) {
      const peer = adjacent.get(asset.id)!.find(item => group.has(item.assetId));
      if (peer) { group.set(asset.id, group.get(peer.assetId)!); changed = true; }
    }
    if (!changed) break;
  }
  const layout: DiagramView['layout'] = { assets: {}, terminals: {}, rotations: {} };
  const treeEdges = new Set<string>();
  const local = new Map<string, { width: number; height: number; points: Record<string, Point> }>();
  for (const region of regions) {
    const members = assets.filter(asset => group.get(asset.id) === region.id && adjacent.get(asset.id)!.length);
    const pending = new Set(members.map(asset => asset.id));
    const points: Record<string, Point> = {};
    let left = 200; let bottom = 0; let top = 0; let widest = 0;
    const subgroup = (id: string) => region.id === 'western' ? /^wh:(h\d+):/.exec(id)?.[1] ?? id : region.id;
    const roots = members.map(asset => asset.id).sort((a, b) => (sourceOrder.get(a) ?? Infinity) - (sourceOrder.get(b) ?? Infinity));
    for (const root of roots) {
      if (!pending.has(root)) continue;
      const children = new Map<string, string[]>(); const depth = new Map([[root, 0]]); const queue = [root]; pending.delete(root);
      for (let i = 0; i < queue.length; i++) {
        const id = queue[i]; children.set(id, []);
        const neighbors = [...adjacent.get(id)!].sort((a, b) => byId.get(id)!.terminals.indexOf(a.terminal) - byId.get(id)!.terminals.indexOf(b.terminal));
        for (const peer of neighbors) if (pending.has(peer.assetId) && subgroup(peer.assetId) === subgroup(root)) {
          pending.delete(peer.assetId); children.get(id)!.push(peer.assetId); depth.set(peer.assetId, depth.get(id)! + 1); queue.push(peer.assetId); treeEdges.add(peer.connectionId);
        }
      }
      const widths = new Map<string, number>();
      function measure(id: string): number { const width = Math.max(500, children.get(id)!.reduce((sum, child) => sum + measure(child), 0)); widths.set(id, width); return width; }
      function place(id: string, x: number) { points[id] = [x + widths.get(id)! / 2, top + 200 + depth.get(id)! * 360]; for (const child of children.get(id)!) { place(child, x); x += widths.get(child)!; } }
      measure(root);
      if (region.id === 'western' && left > 200 && left + widths.get(root)! > 12000) { left = 200; top = Math.ceil((bottom + 360) / 360) * 360; }
      place(root, left); left += widths.get(root)! + 500; widest = Math.max(widest, left); bottom = Math.max(bottom, ...Object.values(points).map(point => point[1]));
    }
    local.set(region.id, { width: widest + 300, height: Math.ceil((bottom + 300) / 360) * 360, points });
  }
  const columns = [...new Set(regions.map(region => region.bounds[0]))].sort((a, b) => a - b);
  const rows = [...new Set(regions.map(region => region.bounds[1]))].sort((a, b) => a - b);
  const columnWidths = columns.map(column => Math.max(2000, ...regions.filter(region => region.bounds[0] === column).map(region => local.get(region.id)!.width)) + 720);
  const rowHeights = rows.map(row => Math.max(1080, ...regions.filter(region => region.bounds[1] === row).map(region => local.get(region.id)!.height)) + 720);
  const panels = regions.map(region => {
    const x = columnWidths.slice(0, columns.indexOf(region.bounds[0])).reduce((sum, width) => sum + width, 0);
    const y = rowHeights.slice(0, rows.indexOf(region.bounds[1])).reduce((sum, height) => sum + height, 0);
    const tile = local.get(region.id)!;
    for (const [id, point] of Object.entries(tile.points)) layout.assets[id] = [x + point[0], y + point[1]];
    return { id: region.id, label: region.label.replaceAll('\n', ' · '), x, y, width: tile.width, height: tile.height };
  });
  const mainBottom = rowHeights.reduce((sum, height) => sum + height, 0);
  const mainWidth = columnWidths.reduce((sum, width) => sum + width, 0);
  const references = assets.filter(asset => !layout.assets[asset.id]);
  references.forEach((asset, index) => { layout.assets[asset.id] = [250 + index % 16 * 500, mainBottom + 200 + Math.floor(index / 16) * 360]; });
  for (const asset of assets) {
    const [x, y] = layout.assets[asset.id];
    if (asset.kind === 'bus') layout.rotations![asset.id] = 90;
    const above: string[] = []; const below: string[] = [];
    for (const terminal of asset.terminals) ((terminalLinks.get(terminal) ?? []).some(id => layout.assets[id][1] < y) ? above : below).push(terminal);
    if (asset.terminals.length === 2 && (!above.length || !below.length)) { above.splice(0, above.length, asset.terminals[0]); below.splice(0, below.length, asset.terminals[1]); }
    for (const [side, terminals] of [[-1, above], [1, below]] as const) terminals.forEach((terminal, index) => {
      layout.terminals[terminal] = asset.kind === 'bus' ? [x, y] : [x + (index - (terminals.length - 1) / 2) * 70, y + side * 54];
    });
  }
  const labels = new Map<string, AssetLabel>();
  for (const asset of assets) {
    const lines = labelLines(asset.label); const [x, y] = layout.assets[asset.id]; const state = !!(asset.positions.length || getRemovableMechanism(asset));
    labels.set(asset.id, { x: x + 110, y: y - 35, width: Math.max(state ? 150 : 0, ...lines.map(line => line.length * 9 + 14)), height: lines.length * 21 + 10 + (state ? 20 : 0), lines });
  }
  function endpoint(terminal: string, channel: number): Point[] {
    const point = layout.terminals[terminal]; const asset = byId.get(owners.get(terminal)!)!; const [x, y] = layout.assets[asset.id];
    if ((point[1] - y) * (channel - y) >= 0) return [point, [point[0], channel]];
    const offset = asset.terminals.indexOf(terminal) * 10;
    const stub = point[1] + Math.sign(point[1] - y) * (10 + offset);
    return [point, [point[0], stub], [x - 105 - offset, stub], [x - 105 - offset, channel]];
  }
  const routes = new Map<string, Point[]>();
  const crossLinks = model.connections.filter(link => !treeEdges.has(link.id));
  for (const link of model.connections) {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!; const from = layout.terminals[link.from]; const to = layout.terminals[link.to];
    if (treeEdges.has(link.id)) {
      const upper = layout.assets[a][1] < layout.assets[b][1] ? a : b;
      const terminal = upper === a ? link.from : link.to;
      const channel = layout.assets[upper][1] + 175 + byId.get(upper)!.terminals.indexOf(terminal) * 8;
      routes.set(link.id, orthogonalPoints([...endpoint(link.from, channel), ...endpoint(link.to, channel).reverse()]));
    } else {
      const index = crossLinks.indexOf(link); const gutter = mainWidth + 120 + index * 24;
      const channel = (id: string, point: Point) => layout.assets[id][1] + (point[1] < layout.assets[id][1] ? -1 : 1) * (125 + index * 35 / Math.max(1, crossLinks.length));
      const start = channel(a, from); const end = channel(b, to);
      routes.set(link.id, orthogonalPoints([...endpoint(link.from, start), [gutter, start], [gutter, end], ...endpoint(link.to, end).reverse()]));
    }
  }
  const points = [...Object.values(layout.assets), ...[...routes.values()].flat()];
  const minX = Math.min(...points.map(point => point[0])) - 100; const minY = Math.min(...points.map(point => point[1])) - 150;
  const maxX = Math.max(mainWidth, ...points.map(point => point[0]), ...[...labels.values()].map(label => label.x + label.width)) + 100;
  const maxY = Math.max(...points.map(point => point[1])) + 200;
  const view: DiagramView = { id: 'continuous-network', label: 'Whole network · continuous diagram', assetIds: assets.map(asset => asset.id), layout, bounds: [minX, minY, maxX - minX, maxY - minY] };
  const referenceLabel = references.every(asset => !adjacent.get(asset.id)!.length) ? 'References without a model connection' : 'Ungrouped model assets and references';
  return { view, assets, connections: model.connections, owners, labels, routes, panels, referenceTop: references.length ? mainBottom : undefined, referenceLabel };
}
