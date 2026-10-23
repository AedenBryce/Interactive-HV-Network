import type { Asset, NetworkModel } from '../session/model';
import type { DiagramView } from '../session/presentation';

export type Point = [number, number];
export type Box = { x: number; y: number; width: number; height: number };
type Segment = { from: Point; to: Point; terminals: string[] };
export type AssetLabel = Box & { lines: string[] };
const gap = 12;
const overlaps = (a: Box, b: Box) => a.x < b.x + b.width + gap && a.x + a.width + gap > b.x && a.y < b.y + b.height + gap && a.y + a.height + gap > b.y;

export function labelLines(label: string) {
  const lines: string[] = [];
  for (const section of label.split(/ · |\n/)) {
    let line = '';
    for (const word of section.split(/\s+/)) {
      if (line && (line + ' ' + word).length > 25) { lines.push(line); line = ''; }
      line += (line ? ' ' : '') + word;
    }
    if (line) lines.push(line);
  }
  return lines.length <= 4 ? lines : [...lines.slice(0, 3), `${lines[3].slice(0, 23)}…`];
}

export function orthogonalPoints(points: Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (previous && previous[0] !== point[0] && previous[1] !== point[1]) result.push([point[0], previous[1]]);
    if (!previous || previous[0] !== point[0] || previous[1] !== point[1]) result.push(point);
  }
  return result.filter((point, index) => !index || index === result.length - 1 || !(
    result[index - 1][0] === point[0] && point[0] === result[index + 1][0]
    || result[index - 1][1] === point[1] && point[1] === result[index + 1][1]
  ));
}

function cutsBox(from: Point, to: Point, box: Box) {
  return from[0] === to[0]
    ? from[0] > box.x && from[0] < box.x + box.width && Math.max(from[1], to[1]) > box.y && Math.min(from[1], to[1]) < box.y + box.height
    : from[1] > box.y && from[1] < box.y + box.height && Math.max(from[0], to[0]) > box.x && Math.min(from[0], to[0]) < box.x + box.width;
}

function sharedLength(a: Point, b: Point, segment: Segment) {
  if (a[0] === b[0] && segment.from[0] === segment.to[0] && a[0] === segment.from[0]) return Math.max(0, Math.min(Math.max(a[1], b[1]), Math.max(segment.from[1], segment.to[1])) - Math.max(Math.min(a[1], b[1]), Math.min(segment.from[1], segment.to[1])));
  if (a[1] === b[1] && segment.from[1] === segment.to[1] && a[1] === segment.from[1]) return Math.max(0, Math.min(Math.max(a[0], b[0]), Math.max(segment.from[0], segment.to[0])) - Math.max(Math.min(a[0], b[0]), Math.min(segment.from[0], segment.to[0])));
  return 0;
}

function crossing(a: Point, b: Point, segment: Segment) {
  if (a[0] === b[0] && segment.from[1] === segment.to[1]) return a[0] > Math.min(segment.from[0], segment.to[0]) && a[0] < Math.max(segment.from[0], segment.to[0]) && segment.from[1] > Math.min(a[1], b[1]) && segment.from[1] < Math.max(a[1], b[1]);
  if (a[1] === b[1] && segment.from[0] === segment.to[0]) return a[1] > Math.min(segment.from[1], segment.to[1]) && a[1] < Math.max(segment.from[1], segment.to[1]) && segment.from[0] > Math.min(a[0], b[0]) && segment.from[0] < Math.max(a[0], b[0]);
  return false;
}

export function clearRoute(from: Point, to: Point, obstacles: Box[], occupied: Segment[]): Point[] | undefined {
  const xs = [...new Set([from[0], to[0], ...obstacles.flatMap(box => [box.x, box.x + box.width]), ...occupied.flatMap(segment => [segment.from[0] - 16, segment.from[0] + 16, segment.to[0] - 16, segment.to[0] + 16])])].sort((a, b) => a - b);
  const ys = [...new Set([from[1], to[1], ...obstacles.flatMap(box => [box.y, box.y + box.height]), ...occupied.flatMap(segment => [segment.from[1] - 16, segment.from[1] + 16, segment.to[1] - 16, segment.to[1] + 16])])].sort((a, b) => a - b);
  const id = (p: Point) => xs.indexOf(p[0]) * ys.length + ys.indexOf(p[1]);
  const point = (node: number): Point => [xs[Math.floor(node / ys.length)], ys[node % ys.length]];
  const start = id(from); const end = id(to);
  const distance = new Map<number, number>([[start, 0]]); const previous = new Map<number, number>();
  const queue: { node: number; cost: number }[] = [];
  const push = (node: number, cost: number) => {
    queue.push({ node, cost }); let index = queue.length - 1;
    while (index) { const parent = Math.floor((index - 1) / 2); if (queue[parent].cost <= cost) break; [queue[parent], queue[index]] = [queue[index], queue[parent]]; index = parent; }
  };
  const pop = () => {
    const first = queue[0]; const last = queue.pop()!;
    if (queue.length) { queue[0] = last; let index = 0; while (index * 2 + 1 < queue.length) { let next = index * 2 + 1; if (next + 1 < queue.length && queue[next + 1].cost < queue[next].cost) next++; if (queue[index].cost <= queue[next].cost) break; [queue[index], queue[next]] = [queue[next], queue[index]]; index = next; } }
    return first;
  };
  const closed = new Set<number>(); push(start, 0);
  while (queue.length) {
    const { node } = pop(); if (closed.has(node)) continue;
    if (node === end) { const result: Point[] = [to]; let current = end; while (current !== start) { current = previous.get(current)!; result.unshift(point(current)); } return orthogonalPoints(result); }
    closed.add(node); const a = point(node); const ix = Math.floor(node / ys.length); const iy = node % ys.length;
    const neighbors = [ix > 0 ? node - ys.length : -1, ix < xs.length - 1 ? node + ys.length : -1, iy > 0 ? node - 1 : -1, iy < ys.length - 1 ? node + 1 : -1];
    for (const next of neighbors) {
      if (next < 0 || closed.has(next)) continue;
      const b = point(next); if (obstacles.some(box => cutsBox(a, b, box))) continue;
      const cost = distance.get(node)! + Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + occupied.reduce((sum, segment) => sum + sharedLength(a, b, segment) * 200 + (crossing(a, b, segment) ? 180 : 0), 0);
      if (cost >= (distance.get(next) ?? Infinity)) continue;
      distance.set(next, cost); previous.set(next, node); push(next, cost + Math.abs(b[0] - to[0]) + Math.abs(b[1] - to[1]));
    }
  }
  return undefined;
}

// Rendering geometry only: routes, symbols and labels never add electrical edges.
export function diagramGeometry(model: NetworkModel, source: DiagramView) {
  const scale = 1.6;
  const point = ([x, y]: Point): Point => [x * scale, y * scale];
  const visible = new Set(source.assetIds);
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const assets = model.assets.filter(asset => visible.has(asset.id));
  const layout = {
    ...source.layout,
    assets: Object.fromEntries(Object.entries(source.layout.assets).map(([id, p]) => [id, point(p)])),
    terminals: Object.fromEntries(Object.entries(source.layout.terminals).map(([id, p]) => [id, point(p)])),
  };
  const connections = model.connections.filter(link => visible.has(owners.get(link.from)!) && visible.has(owners.get(link.to)!) || source.boundaries?.some(boundary => boundary.connectionId === link.id));
  const symbolBoxes = assets.map(asset => { const [x, y] = layout.assets[asset.id]; return { id: asset.id, x: x - 38, y: y - 38, width: 76, height: 76 }; });
  const terminalBoxes = [...new Set(connections.flatMap(link => [link.from, link.to]))].map(id => { const [x, y] = layout.terminals[id]; return { x: x - 10, y: y - 10, width: 20, height: 20 }; });
  const hints = new Map(connections.map(link => [link.id, orthogonalPoints([layout.terminals[link.from], ...(source.layout.bends?.[link.id] ?? []).map(point), layout.terminals[link.to]])]));
  const leadHints = assets.flatMap(asset => { const [x, y] = layout.assets[asset.id]; return equipmentPorts(asset, layout).ports.map((port, index) => ({ terminal: asset.terminals[index], points: orthogonalPoints([layout.terminals[asset.terminals[index]], [x + port[0], y + port[1]]]) })); });
  const labelPaths = [...hints.values(), ...leadHints.map(hint => hint.points)];
  const labels = new Map<string, AssetLabel>();
  for (const asset of assets) {
    const hasState = !!(asset.positions.length || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector);
    const lines = labelLines(asset.label); const width = Math.max(hasState ? 150 : 0, Math.max(...lines.map(line => line.length)) * 9 + 14); const height = lines.length * 21 + 10 + (hasState ? 20 : 0);
    const [x, y] = layout.assets[asset.id];
    const [dx, dy] = source.layout.labelOffsets?.[asset.id] ?? [0, 65];
    const candidates: Box[] = [{ x: x + dx * scale - width / 2, y: y + dy * scale - 17, width, height }];
    for (const distance of [55, 90, 140, 210, 300, 410]) {
      candidates.push({ x: x + distance, y: y - height / 2, width, height }, { x: x - distance - width, y: y - height / 2, width, height }, { x: x - width / 2, y: y + distance, width, height }, { x: x - width / 2, y: y - distance - height, width, height });
    }
    const score = (box: Box) => 1e6 * [...symbolBoxes, ...terminalBoxes, ...labels.values()].filter(other => overlaps(box, other)).length
      + 1000 * labelPaths.filter(points => points.some((p, index) => index && cutsBox(points[index - 1], p, box))).length
      + Math.abs(box.x + width / 2 - x) + Math.abs(box.y + height / 2 - y);
    let box = candidates[0]; let bestScore = score(box);
    for (const candidate of candidates.slice(1)) { const value = score(candidate); if (value < bestScore) { box = candidate; bestScore = value; } }
    labels.set(asset.id, { ...box, lines });
  }
  const routed: Segment[] = leadHints.flatMap(hint => hint.points.slice(1).map((point, index) => ({ from: hint.points[index], to: point, terminals: [hint.terminal] }))); const routes = new Map<string, Point[]>();
  for (const link of connections) {
    const from = layout.terminals[link.from]; const to = layout.terminals[link.to];
    const own = new Set([owners.get(link.from), owners.get(link.to)]);
    const obstacles = [...symbolBoxes.filter(box => !own.has(box.id)), ...labels.values()].map(box => ({ x: box.x - gap, y: box.y - gap, width: box.width + gap * 2, height: box.height + gap * 2 }));
    const candidates = [hints.get(link.id)!, orthogonalPoints([from, to]), orthogonalPoints([from, [from[0], to[1]], to])];
    const minX = Math.min(from[0], to[0]) - 180; const maxX = Math.max(from[0], to[0]) + 180;
    const minY = Math.min(from[1], to[1]) - 180; const maxY = Math.max(from[1], to[1]) + 180;
    const xs = new Set([from[0] - 32, from[0] + 32, to[0] - 32, to[0] + 32, (from[0] + to[0]) / 2, minX, maxX]);
    const ys = new Set([from[1] - 32, from[1] + 32, to[1] - 32, to[1] + 32, (from[1] + to[1]) / 2, minY, maxY]);
    for (const box of obstacles) { if (box.x >= minX && box.x <= maxX) xs.add(box.x); if (box.x + box.width >= minX && box.x + box.width <= maxX) xs.add(box.x + box.width); if (box.y >= minY && box.y <= maxY) ys.add(box.y); if (box.y + box.height >= minY && box.y + box.height <= maxY) ys.add(box.y + box.height); }
    for (const x of xs) candidates.push(orthogonalPoints([from, [x, from[1]], [x, to[1]], to]));
    for (const y of ys) candidates.push(orthogonalPoints([from, [from[0], y], [to[0], y], to]));
    const otherSegments = routed.filter(segment => !segment.terminals.includes(link.from) && !segment.terminals.includes(link.to));
    const score = (points: Point[]) => {
      let cost = points.length * 18;
      for (let i = 1; i < points.length; i++) {
        const a = points[i - 1]; const b = points[i]; cost += Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
        cost += obstacles.filter(box => cutsBox(a, b, box)).length * 1e7;
        for (const segment of otherSegments) cost += sharedLength(a, b, segment) * 200 + (crossing(a, b, segment) ? 180 : 0);
      }
      return cost;
    };
    let route = candidates[0]; let bestScore = score(route);
    for (const candidate of candidates.slice(1)) { const value = score(candidate); if (value < bestScore) { route = candidate; bestScore = value; } }
    if (bestScore >= 1e7 || route.some((p, index) => index && otherSegments.some(segment => sharedLength(route[index - 1], p, segment) > 0))) {
      const alternative = clearRoute(from, to, obstacles, otherSegments);
      if (alternative && score(alternative) < bestScore) route = alternative;
    }
    routes.set(link.id, route);
    route.slice(1).forEach((p, index) => routed.push({ from: route[index], to: p, terminals: [link.from, link.to] }));
  }
  const [x, y, width, height] = source.bounds.map(value => value * scale);
  const boxes: Box[] = [...labels.values(), ...symbolBoxes, ...[...routes.values()].flat().map(([px, py]) => ({ x: px, y: py, width: 0, height: 0 }))];
  const left = Math.min(x, ...boxes.map(box => box.x - 35)); const top = Math.min(y, ...boxes.map(box => box.y - 35));
  const right = Math.max(x + width, ...boxes.map(box => box.x + box.width + 35)); const bottom = Math.max(y + height, ...boxes.map(box => box.y + box.height + 35));
  const view: DiagramView = { ...source, layout, bounds: [left, top, right - left, bottom - top], regions: source.regions?.map(region => ({ ...region, bounds: region.bounds.map(value => value * scale) as [number, number, number, number] })), boundaries: source.boundaries?.map(boundary => ({ ...boundary, position: point(boundary.position) })) };
  return { view, assets, connections, owners, labels, routes };
}

export function equipmentRotation(asset: Asset, terminals: Record<string, Point>, center: Point) {
  if (asset.kind === 'transformer') { const input = terminals[asset.terminals[0]]; const dx = input[0] - center[0]; const dy = input[1] - center[1]; return Math.abs(dx) >= Math.abs(dy) ? dx > 0 ? 180 : 0 : dy > 0 ? -90 : 90; }
  if (asset.terminals.length < 2) return 0;
  const from = terminals[asset.terminals[0]]; const to = terminals[asset.terminals[1]];
  return Math.abs(to[0] - from[0]) >= Math.abs(to[1] - from[1]) ? to[0] >= from[0] ? 0 : 180 : to[1] >= from[1] ? 90 : -90;
}

export function equipmentPorts(asset: Asset, layout: DiagramView['layout']) {
  const [cx, cy] = layout.assets[asset.id]; const rotation = equipmentRotation(asset, layout.terminals, [cx, cy]);
  const rotate = ([x, y]: Point): Point => rotation === 90 ? [-y, x] : rotation === -90 ? [y, -x] : rotation === 180 ? [-x, -y] : [x, y];
  const point = (terminal: string): Point => [layout.terminals[terminal][0] - cx, layout.terminals[terminal][1] - cy];
  const transverse = (terminal: string) => { const [x, y] = point(terminal); return rotation === 90 ? -x : rotation === -90 ? x : rotation === 180 ? -y : y; };
  const secondaryOrder = asset.terminals.slice(1).toSorted((a, b) => transverse(a) - transverse(b));
  const ports: Point[] = asset.kind === 'bus' ? [] : asset.kind === 'transformer'
    ? asset.terminals.map((terminal, index) => rotate(index === 0 ? [-33, 0] : [33, (secondaryOrder.indexOf(terminal) - (asset.terminals.length - 2) / 2) * 24]))
    : asset.kind === 'interface' ? asset.terminals.map(terminal => {
      const [x, y] = point(terminal);
      if (!x && !y) return asset.terminals.length === 1 ? [0, 0] : [18, 0];
      if (Math.abs(x) >= Math.abs(y)) { const py = y / Math.abs(x) * 12; return [Math.sign(x) * Math.sqrt(18 ** 2 - py ** 2), py]; }
      const px = x / Math.abs(y) * 12; return [px, Math.sign(y) * Math.sqrt(18 ** 2 - px ** 2)];
    })
    : asset.kind === 'earth-switch' ? [rotate([-30, 0]), rotate([30, 0])]
    : asset.kind === 'source' && asset.terminals.length === 1 ? [[30, 0]]
    : asset.terminals.slice(0, 2).map((_, index) => rotate([index ? 30 : -30, 0]));
  return { rotation, ports };
}
