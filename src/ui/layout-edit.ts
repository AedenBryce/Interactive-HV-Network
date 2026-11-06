import type { DiagramView } from '../session/presentation';
import type { AssetLabel, Point } from './diagram-geometry';

export type LayoutEdits = { assets: Record<string, Point>; rooms: Record<string, Point> };
export const MAX_LAYOUT_OFFSET = 1_000_000;
export const emptyLayoutEdits = (): LayoutEdits => ({ assets: {}, rooms: {} });

type EditablePanel = {
  id: string; x: number; y: number; width: number; height: number;
  assetIds: readonly string[]; memberAssetIds?: readonly string[];
};
export type EditableGeometry = {
  view: DiagramView;
  assets: readonly { id: string; terminals: readonly string[] }[];
  connections: readonly { id: string; from: string; to: string }[];
  owners: ReadonlyMap<string, string>;
  labels: ReadonlyMap<string, AssetLabel>;
  routes: ReadonlyMap<string, readonly Point[]>;
  panels?: readonly EditablePanel[];
  hiddenIds?: ReadonlySet<string>;
  groupByAsset?: ReadonlyMap<string, string>;
};

export type LayoutBoxSelection = { assets: string[]; rooms: string[] };
export function selectLayoutBox(geometry: EditableGeometry, start: Point, end: Point): LayoutBoxSelection {
  const left = Math.min(start[0], end[0]), right = Math.max(start[0], end[0]);
  const top = Math.min(start[1], end[1]), bottom = Math.max(start[1], end[1]);
  const inside = (x: number, y: number) => x >= left && x <= right && y >= top && y <= bottom;
  const rooms = (geometry.panels ?? []).filter(panel => inside(panel.x, panel.y) && inside(panel.x + panel.width, panel.y + panel.height)).map(panel => panel.id);
  const members = new Set((geometry.panels ?? []).filter(panel => rooms.includes(panel.id)).flatMap(panel => [...(panel.memberAssetIds ?? panel.assetIds)]));
  const assets = geometry.assets.filter(asset => {
    const point = geometry.view.layout.assets[asset.id], label = geometry.labels.get(asset.id);
    return members.has(asset.id) || inside(point[0], point[1]) || !!label && inside(label.x, label.y) && inside(label.x + label.width, label.y + label.height);
  }).map(asset => asset.id);
  return { assets, rooms };
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
    && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

/** Validate only presentation offsets. The caller owns model/version metadata. */
export function validateLayoutEdits(input: unknown, allowedAssetIds: Iterable<string>, allowedRoomIds: Iterable<string>): LayoutEdits {
  if (!record(input) || Object.keys(input).some(key => key !== 'assets' && key !== 'rooms')) throw new Error('Invalid layout edit document.');
  const parse = (value: unknown, allowed: Set<string>, kind: string): Record<string, Point> => {
    if (value === undefined) return {};
    if (!record(value)) throw new Error(`Invalid ${kind} offsets.`);
    const result: Record<string, Point> = {};
    for (const [id, offset] of Object.entries(value)) {
      if (!allowed.has(id) || ['__proto__', 'prototype', 'constructor'].includes(id)) throw new Error(`Unknown ${kind}: ${id}`);
      if (!Array.isArray(offset) || offset.length !== 2 || offset.some(number => typeof number !== 'number' || !Number.isFinite(number) || Math.abs(number) > MAX_LAYOUT_OFFSET)) throw new Error(`Invalid offset for ${id}.`);
      result[id] = [offset[0], offset[1]];
    }
    return result;
  };
  return { assets: parse(input.assets, new Set(allowedAssetIds), 'asset'), rooms: parse(input.rooms, new Set(allowedRoomIds), 'switchroom') };
}

const zero: Point = [0, 0];
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];
const plus = (a: Point, b: Point): Point => [a[0] + b[0], a[1] + b[1]];
const moved = (delta: Point) => delta[0] !== 0 || delta[1] !== 0;

function compact(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    if (result.length && same(result.at(-1)!, point)) continue;
    while (result.length > 1) {
      const a = result.at(-2)!; const b = result.at(-1)!;
      if (a[0] === b[0] && b[0] === point[0] || a[1] === b[1] && b[1] === point[1]) result.pop();
      else break;
    }
    result.push([...point]);
  }
  // Coincident objects may deliberately collapse a wire while being dragged.
  return result.length === 1 ? [[...result[0]], [...result[0]]] : result;
}

function rubberBand(points: readonly Point[], fromDelta: Point, toDelta: Point, preserveRigidShape = true, obstructionCount: (route: readonly Point[]) => number = () => 0): Point[] {
  if (preserveRigidShape && same(fromDelta, toDelta)) return points.map(point => plus(point, fromDelta));
  const start = plus(points[0], fromDelta); const end = plus(points.at(-1)!, toDelta);
  if (start[0] === end[0] || start[1] === end[1]) return compact([start, end]);
  const firstVertical = points[0][0] === points[1][0];
  // Rebuild from the current terminals. Historical routing bends must not
  // survive a manual move and leave a cable looping through its old location.
  // Every alternative below has exactly Manhattan-minimum length.
  const verticalFirst = compact([start, [start[0], end[1]], end]);
  const horizontalFirst = compact([start, [end[0], start[1]], end]);
  const x = (start[0] + end[0]) / 2, y = (start[1] + end[1]) / 2;
  const candidates = [
    ...(firstVertical ? [verticalFirst, horizontalFirst] : [horizontalFirst, verticalFirst]),
    compact([start, [start[0], y], [end[0], y], end]),
    compact([start, [x, start[1]], [x, end[1]], end]),
  ];
  // Prefer one elbow. Retain a second only when it avoids more equipment,
  // labels or unrelated switchrooms than either one-elbow alternative.
  return candidates.map((route, index) => ({ route, index, hits: obstructionCount(route) }))
    .sort((a, b) => a.hits - b.hits || a.route.length - b.route.length || a.index - b.index)[0].route;
}

type RouteBox = { id: string; x: number; y: number; width: number; height: number; kind: 'body' | 'label' | 'room' };
function insideBox(point: Point, box: RouteBox): boolean {
  return point[0] >= box.x && point[0] <= box.x + box.width && point[1] >= box.y && point[1] <= box.y + box.height;
}
function cutsBox(route: readonly Point[], box: RouteBox): boolean {
  return route.slice(1).some((b, index) => {
    const a = route[index];
    if (a[0] === b[0]) return a[0] > box.x && a[0] < box.x + box.width
      && Math.max(Math.min(a[1], b[1]), box.y) < Math.min(Math.max(a[1], b[1]), box.y + box.height);
    return a[1] > box.y && a[1] < box.y + box.height
      && Math.max(Math.min(a[0], b[0]), box.x) < Math.min(Math.max(a[0], b[0]), box.x + box.width);
  });
}

/**
 * Apply absolute user offsets to the accepted base drawing. This is a pure
 * presentation operation: no graph traversal, solver, switching or model edit.
 */
export function applyLayoutEdits<T extends EditableGeometry>(geometry: T, input: LayoutEdits, independentAssets: ReadonlySet<string> = new Set()): T {
  const edits = validateLayoutEdits(input, geometry.assets.map(asset => asset.id), (geometry.panels ?? []).map(panel => panel.id));
  if (![...Object.values(edits.assets), ...Object.values(edits.rooms)].some(moved)) return geometry;
  const roomByAsset = new Map<string, string>();
  for (const panel of geometry.panels ?? []) for (const id of panel.memberAssetIds ?? panel.assetIds) {
    if (roomByAsset.has(id)) throw new Error(`Asset belongs to more than one editable switchroom: ${id}`);
    roomByAsset.set(id, panel.id);
  }
  const deltas = new Map(geometry.assets.map(asset => [asset.id, plus(edits.assets[asset.id] ?? zero, edits.rooms[roomByAsset.get(asset.id) ?? ''] ?? zero)]));
  // Invisible drawing handoffs are cable attachments, not independently
  // positioned equipment. Follow the one visible device wired to that handoff
  // inside the same authored module. Never traverse external network branches.
  for (const asset of geometry.assets) {
    if (!geometry.hiddenIds?.has(asset.id) || asset.terminals.length !== 1 || independentAssets.has(asset.id)) continue;
    const group = geometry.groupByAsset?.get(asset.id) ?? roomByAsset.get(asset.id);
    if (!group) continue;
    const terminal = asset.terminals[0];
    const neighbours = new Set(geometry.connections.flatMap(link => {
      const otherTerminal = link.from === terminal ? link.to : link.to === terminal ? link.from : undefined;
      const other = otherTerminal ? geometry.owners.get(otherTerminal) : undefined;
      return other && !geometry.hiddenIds?.has(other) && (geometry.groupByAsset?.get(other) ?? roomByAsset.get(other)) === group ? [other] : [];
    }));
    if (neighbours.size === 1) deltas.set(asset.id, deltas.get([...neighbours][0])!);
  }
  const deltaForTerminal = (terminal: string): Point => {
    const owner = geometry.owners.get(terminal);
    if (!owner || !deltas.has(owner)) throw new Error(`Unknown terminal owner: ${terminal}`);
    return deltas.get(owner)!;
  };
  const layout = {
    ...geometry.view.layout,
    assets: Object.fromEntries(Object.entries(geometry.view.layout.assets).map(([id, point]) => [id, plus(point, deltas.get(id) ?? zero)])),
    terminals: Object.fromEntries(Object.entries(geometry.view.layout.terminals).map(([id, point]) => [id, plus(point, deltaForTerminal(id))])),
  };
  const labels = new Map([...geometry.labels].map(([id, label]) => {
    const delta = deltas.get(id) ?? zero;
    return [id, { ...label, x: label.x + delta[0], y: label.y + delta[1] }] as const;
  }));
  const obstacles: RouteBox[] = [
    ...geometry.assets.filter(asset => !geometry.hiddenIds?.has(asset.id)).map(asset => {
      const [x, y] = layout.assets[asset.id];
      return { id: asset.id, x: x - 38, y: y - 38, width: 76, height: 76, kind: 'body' as const };
    }),
    ...[...labels].filter(([id]) => !geometry.hiddenIds?.has(id)).map(([id, label]) => ({ id, ...label, kind: 'label' as const })),
    ...(geometry.panels ?? []).map(panel => ({ ...panel, x: panel.x + (edits.rooms[panel.id]?.[0] ?? 0), y: panel.y + (edits.rooms[panel.id]?.[1] ?? 0), kind: 'room' as const })),
  ];
  const routes = new Map<string, Point[]>();
  for (const connection of geometry.connections) {
    const points = geometry.routes.get(connection.id);
    if (!points || points.length < 2) throw new Error(`Missing base route: ${connection.id}`);
    // Preserve the real tap's offset along a bus; never snap it to bus centre.
    const fromDelta = deltaForTerminal(connection.from), toDelta = deltaForTerminal(connection.to);
    const fromGroup = geometry.groupByAsset?.get(geometry.owners.get(connection.from)!);
    const toGroup = geometry.groupByAsset?.get(geometry.owners.get(connection.to)!);
    const external = fromGroup !== undefined && toGroup !== undefined && fromGroup !== toGroup;
    const preserveRigidShape = !external || !moved(fromDelta) && !moved(toDelta);
    const fromOwner = geometry.owners.get(connection.from)!, toOwner = geometry.owners.get(connection.to)!;
    const start = plus(points[0], fromDelta), end = plus(points.at(-1)!, toDelta);
    // These cases do not consult obstacles in rubberBand. Avoid building an
    // obstacle list for every unchanged/internal wire on each pointer move.
    if (preserveRigidShape && same(fromDelta, toDelta) || start[0] === end[0] || start[1] === end[1]) {
      routes.set(connection.id, rubberBand(points, fromDelta, toDelta, preserveRigidShape));
      continue;
    }
    const left = Math.min(start[0], end[0]), right = Math.max(start[0], end[0]);
    const top = Math.min(start[1], end[1]), bottom = Math.max(start[1], end[1]);
    const boxes = obstacles.filter(box => {
      // Every candidate is Manhattan-minimum and lies within its endpoint
      // rectangle. Boxes outside it cannot affect the selected route.
      if (box.x >= right || box.x + box.width <= left || box.y >= bottom || box.y + box.height <= top) return false;
      if (box.kind === 'room') return box.id !== roomByAsset.get(fromOwner) && box.id !== roomByAsset.get(toOwner);
      // Bus taps and compact symbols can contain their own terminal. Other
      // endpoint bodies still obstruct a route that doubles back through them.
      if (box.kind === 'body' && (box.id === fromOwner && insideBox(start, box) || box.id === toOwner && insideBox(end, box))) return false;
      return true;
    });
    routes.set(connection.id, rubberBand(points, fromDelta, toDelta, preserveRigidShape, route => boxes.filter(box => cutsBox(route, box)).length));
  }
  const panels = geometry.panels?.map(panel => {
    const delta = edits.rooms[panel.id] ?? zero;
    let left = panel.x + delta[0]; let top = panel.y + delta[1];
    let right = left + panel.width; let bottom = top + panel.height;
    for (const id of panel.memberAssetIds ?? panel.assetIds) {
      if (!moved(edits.assets[id] ?? zero)) continue;
      const point = layout.assets[id]; const asset = geometry.assets.find(item => item.id === id)!; const label = labels.get(id);
      const xs = [point[0] - 38, point[0] + 38, ...asset.terminals.map(terminal => layout.terminals[terminal][0])];
      const ys = [point[1] - 40, point[1] + 40, ...asset.terminals.map(terminal => layout.terminals[terminal][1])];
      const busSpan = layout.busSpans?.[id];
      if (busSpan !== undefined) {
        if (layout.rotations?.[id] === 90) xs.push(point[0] - busSpan / 2, point[0] + busSpan / 2);
        else ys.push(point[1] - busSpan / 2, point[1] + busSpan / 2);
      }
      if (label) { xs.push(label.x, label.x + label.width); ys.push(label.y, label.y + label.height); }
      left = Math.min(left, ...xs.map(x => x - 24)); right = Math.max(right, ...xs.map(x => x + 24));
      top = Math.min(top, ...ys.map(y => y - 24)); bottom = Math.max(bottom, ...ys.map(y => y + 24));
    }
    return { ...panel, x: left, y: top, width: right - left, height: bottom - top };
  });
  const xs = [...Object.values(layout.assets).map(point => point[0]), ...[...routes.values()].flat().map(point => point[0]), ...[...labels.values()].flatMap(label => [label.x, label.x + label.width]), ...(panels ?? []).flatMap(panel => [panel.x, panel.x + panel.width])];
  const ys = [...Object.values(layout.assets).map(point => point[1]), ...[...routes.values()].flat().map(point => point[1]), ...[...labels.values()].flatMap(label => [label.y, label.y + label.height]), ...(panels ?? []).flatMap(panel => [panel.y, panel.y + panel.height])];
  const left = Math.min(...xs) - 100; const top = Math.min(...ys) - 100;
  const bounds: DiagramView['bounds'] = [left, top, Math.max(1, Math.max(...xs) - left + 100), Math.max(1, Math.max(...ys) - top + 100)];
  return { ...geometry, view: { ...geometry.view, layout, bounds }, labels, routes, ...(panels ? { panels } : {}) };
}

