import type { NetworkModel } from '../session/model';
import type { DiagramView } from '../session/presentation';
import { contactPosition, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import { clearRoute, cutsBox, labelLines, orthogonalPoints, sharedLength } from './diagram-geometry';
import type { AssetLabel, Point, Segment } from './diagram-geometry';
import { currentAssetLabel } from './review-updates';
import { compactEquipmentLabel, isDrive, isMotor, isMotorJunction } from './equipment-appearance';
import { layoutDriveAssemblies, layoutMotorAssemblies } from './assembly-layout';
import { switchroomFrames } from './switchroom-frames';
import { threePositionContacts } from './ThreePositionSymbol';

// Rendering forest only. The immutable model supplies every terminal/connection.
// Agreed starting states prefer the main drawing backbone; live switching never
// changes this layout. Earth switches remain attached side branches, not roots.
export function continuousNetwork(model: NetworkModel) {
  const assets = model.assets;
  const byId = new Map(assets.map(asset => [asset.id, asset]));
  const owners = new Map(assets.flatMap(asset => asset.terminals.map(t => [t, asset.id] as const)));
  const adjacent = new Map(assets.map(asset => [asset.id, [] as { id: string; link: string; terminal: string }[]]));
  for (const link of model.connections) {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    if (a === b) continue;
    adjacent.get(a)!.push({ id: b, link: link.id, terminal: link.from });
    adjacent.get(b)!.push({ id: a, link: link.id, terminal: link.to });
  }
  const earthParents = new Map(assets.filter(a => a.kind === 'earth-switch' && adjacent.get(a.id)!.length === 1).map(a => [a.id, adjacent.get(a.id)![0].id]));
  const children = new Map(assets.map(a => [a.id, [] as string[]]));
  const parent = new Map<string, string>(); const parentLink = new Map<string, string>();
  const roots = [...new Set(model.sources.map(source => source.assetId))];
  const visited = new Set(roots); const treeEdgeIds = new Set<string>();
  const isOpen = (id: string) => {
    const asset = byId.get(id)!; const state = model.starting.devices[id];
    if (!asset.positions.length && !getRemovableMechanism(asset)) return false;
    return isIndependentState(state) ? state.contact !== 'closed' || state.racking !== 'in' : !['closed', 'service'].includes(String(contactPosition(state)));
  };
  function traverse(preferred: boolean) {
    const queue = [...visited];
    for (let i = 0; i < queue.length; i++) {
      const id = queue[i];
      for (const peer of adjacent.get(id)!) {
        if (visited.has(peer.id) || earthParents.has(peer.id) || preferred && (isOpen(id) || isOpen(peer.id))) continue;
        visited.add(peer.id); parent.set(peer.id, id); parentLink.set(peer.id, peer.link); treeEdgeIds.add(peer.link);
        children.get(id)!.push(peer.id); queue.push(peer.id);
      }
    }
  }
  traverse(true); traverse(false);
  for (const asset of assets) if (!visited.has(asset.id) && !earthParents.has(asset.id) && adjacent.get(asset.id)!.length) {
    roots.push(asset.id); visited.add(asset.id); traverse(false);
  }
  for (const asset of assets) children.get(asset.id)!.sort((a, b) => {
    const pin = (id: string) => asset.terminals.indexOf(adjacent.get(asset.id)!.find(peer => peer.id === id)!.terminal);
    return pin(a) - pin(b) || Number(isOpen(a)) - Number(isOpen(b));
  });
  // Spare incomers remain connected to their recorded bus, but are drawn above
  // it like the supplied incomers, rather than among the outgoing feeders.
  const spareIncomers: [string, string][] = [['sw411:in-01:cb', 'sw411:bus-a'], ['sw411:in-02:cb', 'sw411:bus-b']];
  const aboveBus = new Map(spareIncomers.filter(([id, bus]) => parent.get(id) === bus));
  for (const [id, bus] of aboveBus) children.set(bus, children.get(bus)!.filter(child => child !== id));
  const widths = new Map<string, number>();
  const leafWidth = 680;
  const siblingGap = (a: string, b: string) => Math.max(widths.get(a)!, widths.get(b)!) > leafWidth ? 480 : 0;
  function measure(id: string): number {
    const kids = children.get(id)!; kids.forEach(measure);
    const width = Math.max(leafWidth, kids.reduce((sum, child, index) => sum + widths.get(child)! + (index ? siblingGap(kids[index - 1], child) : 0), 0));
    widths.set(id, width); return width;
  }
  const layout: DiagramView['layout'] = { assets: {}, terminals: {}, rotations: {} };
  function place(id: string, left: number, y: number) {
    const kids = children.get(id)!; let cursor = left;
    for (const [index, child] of kids.entries()) { if (index) cursor += siblingGap(kids[index - 1], child); place(child, cursor, y + 600); cursor += widths.get(child)!; }
    layout.assets[id] = [kids.length ? (layout.assets[kids[0]][0] + layout.assets[kids.at(-1)!][0]) / 2 : left + leafWidth / 2, y];
  }
  let cursor = 100;
  for (const root of roots) { measure(root); place(root, cursor, 120); cursor += widths.get(root)! + 1240; }
  const upward = new Set<string>();
  function placeAbove(id: string, x: number, y: number) {
    upward.add(id); layout.assets[id] = [x, y];
    children.get(id)!.forEach(child => placeAbove(child, x, y - 600));
  }
  for (const [id, bus] of aboveBus) { const [x, y] = layout.assets[bus]; placeAbove(id, x - 800, y - 600); }
  const merges = layoutMotorAssemblies(model, layout);
  layoutDriveAssemblies(model, layout);
  const hiddenIds = new Set(assets.filter(isMotorJunction).map(asset => asset.id));
  for (const [id, owner] of earthParents) {
    const [x, y] = layout.assets[owner];
    const ownerLink = adjacent.get(owner)!.find(peer => peer.id === id)!;
    const incoming = adjacent.get(owner)!.find(peer => peer.link === parentLink.get(owner))?.terminal;
    const siblings = [...earthParents].filter(([, main]) => main === owner).map(([earth]) => earth);
    const index = siblings.indexOf(id);
    const incomingSide = !hiddenIds.has(owner) && ownerLink.terminal === incoming;
    layout.assets[id] = [x + 170, y + ((upward.has(owner) ? !incomingSide : incomingSide) ? -1 : 1) * (200 + index * 200)];
    visited.add(id); treeEdgeIds.add(adjacent.get(id)![0].link);
  }
  const mainBottom = Math.max(...Object.values(layout.assets).map(p => p[1])) + 600;
  const references = assets.filter(asset => !visited.has(asset.id));
  references.forEach((asset, i) => { layout.assets[asset.id] = [310 + i % 16 * 420, mainBottom + Math.floor(i / 16) * 320]; });
  for (const asset of assets) {
    const [x, y] = layout.assets[asset.id];
    if (asset.kind === 'bus') layout.rotations![asset.id] = 90;
    if (earthParents.has(asset.id)) {
      const input = adjacent.get(asset.id)![0].terminal;
      asset.terminals.forEach(t => { layout.terminals[t] = t === input ? [x - 90, y - 30] : [x, y + 45]; }); continue;
    }
    if (hiddenIds.has(asset.id)) { asset.terminals.forEach(t => { layout.terminals[t] = [x, y]; }); continue; }
    if (isMotor(asset)) { asset.terminals.forEach(t => { layout.terminals[t] = [x, y - 70]; }); continue; }
    if (isDrive(asset)) {
      asset.terminals.forEach(t => { layout.terminals[t] = /:ac-(?:star|d)$/.test(t) ? [x - 35, y - 100] : /:ac-(?:delta|y)$/.test(t) ? [x + 35, y - 100] : t.endsWith(':dc') ? [x + 70, y] : [x, y + 100]; }); continue;
    }
    const incoming = adjacent.get(asset.id)!.find(peer => peer.link === parentLink.get(asset.id))?.terminal;
    const selector = threePositionContacts(asset);
    if (selector) {
      const upper = selector.main.includes(incoming ?? '') ? incoming! : selector.main[0];
      const tapY = selector.common === upper ? -40 : 40;
      asset.terminals.forEach(terminal => { layout.terminals[terminal] = terminal === selector.ground ? [x + 50, y + tapY + 79] : [x, y + (terminal === upper ? -150 : 170)]; });
      continue;
    }
    const lower = asset.terminals.filter(t => t !== incoming);
    for (const terminal of asset.terminals) {
      const direction = upward.has(asset.id) ? -1 : 1;
      layout.terminals[terminal] = asset.kind === 'bus' ? [x, y] : terminal === incoming ? [x, y - 120 * direction] : [x + (lower.indexOf(terminal) - (lower.length - 1) / 2) * 70, y + 120 * direction];
    }
  }
  const labels = new Map<string, AssetLabel>();
  for (const asset of assets) {
    const lines = labelLines(compactEquipmentLabel(asset, currentAssetLabel(model, asset))); const [x, y] = layout.assets[asset.id]; const state = !!(asset.positions.length || getRemovableMechanism(asset));
    const earthOwner = earthParents.get(asset.id);
    const height = lines.length * 25 + 10 + (state ? 24 : 0);
    labels.set(asset.id, { x: x + (earthOwner ? 55 : 110), y: y + (asset.kind === 'bus' ? -height - 25 : earthOwner ? -25 : -35), width: Math.max(state ? 170 : 0, ...lines.map(line => line.length * 10.5 + 14)), height, lines });
  }
  const routes = new Map<string, Point[]>(); const occupied: Segment[] = [];
  const remember = (id: string, points: Point[]) => {
    routes.set(id, points); const link = model.connections.find(link => link.id === id)!;
    points.slice(1).forEach((p, i) => occupied.push({ from: points[i], to: p, terminals: [link.from, link.to] }));
  };
  const mergeLinks = new Set(model.connections.filter(link => {
    const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    return merges.get(a)?.controls.includes(b) || merges.get(b)?.controls.includes(a);
  }).map(link => link.id));
  for (const link of model.connections.filter(link => treeEdgeIds.has(link.id) || mergeLinks.has(link.id))) {
    const from = layout.terminals[link.from]; const to = layout.terminals[link.to]; const a = owners.get(link.from)!; const b = owners.get(link.to)!;
    if (earthParents.has(a) || earthParents.has(b)) {
      const earth = earthParents.has(a) ? a : b;
      const start = earth === a ? to : from; const end = earth === a ? from : to;
      const points = orthogonalPoints([start, [start[0], end[1]], end]);
      remember(link.id, earth === a ? points.reverse() : points); continue;
    }
    if (mergeLinks.has(link.id)) {
      const merge = merges.get(a) ?? merges.get(b)!; const targetFirst = merges.has(a);
      const start = targetFirst ? to : from; const end = targetFirst ? from : to;
      const points = orthogonalPoints([start, [start[0], merge.y], [merge.x, merge.y], end]);
      remember(link.id, targetFirst ? points.reverse() : points); continue;
    }
    const upper = parent.get(b) === a ? a : b;
    const terminal = upper === a ? link.from : link.to;
    const upperAsset = byId.get(upper)!;
    const channel = layout.assets[upper][1] + (upperAsset.kind === 'bus' ? 0 : (upward.has(upper) ? -1 : 1) * (threePositionContacts(upperAsset) ? 210 : 140 + upperAsset.terminals.indexOf(terminal) * 12));
    const incoming = adjacent.get(upper)!.find(peer => peer.link === parentLink.get(upper))?.terminal;
    if (terminal === incoming && byId.get(upper)!.kind !== 'bus') {
      // A same-terminal continuation must leave beside the symbol. Passing down
      // its centre could visually join a different, independent terminal.
      const start = upper === a ? from : to; const end = upper === a ? to : from;
      const points = orthogonalPoints([start, [start[0] - 90, start[1]], [start[0] - 90, channel], [end[0], channel], end]);
      remember(link.id, upper === a ? points : points.reverse());
    } else remember(link.id, orthogonalPoints([from, [from[0], channel], [to[0], channel], to]));
  }
  const symbols = assets.map(asset => { const [x, y] = layout.assets[asset.id]; return { id: asset.id, x: x - 38, y: y - 38, width: 76, height: 76 }; });
  for (const link of model.connections.filter(link => !treeEdgeIds.has(link.id) && !mergeLinks.has(link.id))) {
    const from = layout.terminals[link.from]; const to = layout.terminals[link.to]; const own = new Set([owners.get(link.from), owners.get(link.to)]);
    const left = Math.min(from[0], to[0]) - 400; const right = Math.max(from[0], to[0]) + 400;
    const top = Math.min(from[1], to[1]) - 400; const bottom = Math.max(from[1], to[1]) + 400;
    const obstacles = [...symbols.filter(box => !own.has(box.id) && !hiddenIds.has(box.id)), ...assets.filter(asset => !hiddenIds.has(asset.id)).map(asset => labels.get(asset.id)!)].filter(box => box.x + box.width >= left && box.x <= right && box.y + box.height >= top && box.y <= bottom).map(box => ({ x: box.x - 10, y: box.y - 10, width: box.width + 20, height: box.height + 20 }));
    const others = occupied.filter(s => !s.terminals.includes(link.from) && !s.terminals.includes(link.to) && Math.max(s.from[0], s.to[0]) >= left && Math.min(s.from[0], s.to[0]) <= right && Math.max(s.from[1], s.to[1]) >= top && Math.min(s.from[1], s.to[1]) <= bottom);
    const candidates = [orthogonalPoints([from, to])];
    for (const x of [left + 100, right - 100, from[0] - 100, from[0] + 100, to[0] - 100, to[0] + 100]) candidates.push(orthogonalPoints([from, [x, from[1]], [x, to[1]], to]));
    for (const y of [top + 100, bottom - 100, (from[1] + to[1]) / 2]) candidates.push(orthogonalPoints([from, [from[0], y], [to[0], y], to]));
    const score = (points: Point[]) => points.slice(1).reduce((cost, p, i) => cost + Math.abs(p[0] - points[i][0]) + Math.abs(p[1] - points[i][1]) + obstacles.filter(box => cutsBox(points[i], p, box)).length * 1e8 + others.reduce((sum, s) => sum + sharedLength(points[i], p, s) * 200, 0), 0);
    let route = candidates.reduce((best, route) => score(route) < score(best) ? route : best);
    if (score(route) >= 1e8 || route.some((p, i) => i && others.some(s => sharedLength(route[i - 1], p, s) > 0))) { const alternative = clearRoute(from, to, obstacles, others); if (alternative && score(alternative) < score(route)) route = alternative; }
    remember(link.id, route);
  }
  const points = [...Object.values(layout.assets), ...[...routes.values()].flat()];
  const minX = Math.min(...points.map(p => p[0])) - 100; const minY = Math.min(...points.map(p => p[1])) - 150;
  const maxX = Math.max(...points.map(p => p[0]), ...[...labels.values()].map(label => label.x + label.width)) + 100;
  const maxY = Math.max(...points.map(p => p[1]), ...[...labels.values()].map(label => label.y + label.height)) + 150;
  const view: DiagramView = { id: 'continuous-network', label: 'Whole network · downward supply tree', assetIds: assets.map(asset => asset.id), layout, bounds: [minX, minY, maxX - minX, maxY - minY] };
  return { view, assets, connections: model.connections, owners, labels, routes, panels: switchroomFrames(model, layout, labels), hiddenIds, referenceTop: references.length ? mainBottom : undefined, referenceLabel: 'Drawing references without network connections', referenceIds: references.map(asset => asset.id), treeEdgeIds };
}
