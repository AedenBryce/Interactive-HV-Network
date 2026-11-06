import type { Point } from './diagram-geometry';
import type { RoutedConnection } from './route-crossing-gaps';

const EPS = 1e-6;
type Segment = { id: string; index: number; horizontal: boolean; coordinate: number; low: number; high: number; group: string };
type Bus = { kind: string; terminals: readonly string[] };
export type ReservedConductor = { id: string; terminal: string; points: readonly Point[] };

/** Fixed wire connections and each individual bus define conductor identity.
 * Never union through switches, transformers, converters or another bus. */
export function conductorGroups(connections: readonly RoutedConnection[], assets: readonly Bus[] = []) {
  const parents = new Map<string, string>();
  const root = (id: string): string => {
    const parent = parents.get(id);
    if (!parent) { parents.set(id, id); return id; }
    if (parent === id) return id;
    const result = root(parent); parents.set(id, result); return result;
  };
  const union = (a: string, b: string) => parents.set(root(a), root(b));
  for (const link of connections) union(link.from, link.to);
  for (const bus of assets.filter(asset => asset.kind === 'bus')) for (const terminal of bus.terminals.slice(1)) union(bus.terminals[0], terminal);
  return new Map(connections.map(link => [link.id, root(link.from)]));
}

function segments(id: string, pieces: readonly (readonly Point[])[], group: string): Segment[] {
  let index = 0;
  return pieces.flatMap(points => points.slice(1).flatMap((b, i) => {
    const a = points[i], horizontal = Math.abs(a[1] - b[1]) < EPS;
    if (!horizontal && Math.abs(a[0] - b[0]) >= EPS) throw new Error('Conductor route must be orthogonal: ' + id);
    const low = Math.min(a[horizontal ? 0 : 1], b[horizontal ? 0 : 1]);
    const high = Math.max(a[horizontal ? 0 : 1], b[horizontal ? 0 : 1]);
    return high - low < EPS ? [] : [{ id, index: index++, horizontal, coordinate: a[horizontal ? 1 : 0], low, high, group }];
  }));
}

export function auditConductorOverlaps(connections: readonly RoutedConnection[], routes: ReadonlyMap<string, readonly Point[]>, assets: readonly Bus[] = []) {
  const groups = conductorGroups(connections, assets);
  const items = connections.flatMap(link => segments(link.id, [routes.get(link.id) ?? []], groups.get(link.id)!));
  const overlaps: { a: string; b: string; aSegment: number; bSegment: number; length: number; sharedConductor: boolean; retrace: boolean }[] = [];
  for (let i = 0; i < items.length; i++) for (const b of items.slice(i + 1)) {
    const a = items[i];
    if (a.horizontal !== b.horizontal || Math.abs(a.coordinate - b.coordinate) >= EPS) continue;
    const length = Math.min(a.high, b.high) - Math.max(a.low, b.low);
    if (length > EPS) overlaps.push({ a: a.id, b: b.id, aSegment: a.index, bSegment: b.index, length, sharedConductor: a.group === b.group, retrace: a.id === b.id });
  }
  return overlaps;
}

/** Draw overlapping portions of a proven shared conductor exactly once.
 * Different conductor groups remain separate, even if a later manual edit
 * places them at the same coordinates. The audit reports those conflicts. */
export function uniqueConductorFragments(
  connections: readonly RoutedConnection[],
  fragments: ReadonlyMap<string, readonly (readonly Point[])[]>,
  assets: readonly Bus[] = [],
  priority: (id: string) => number = () => 0,
  reserved: readonly ReservedConductor[] = [],
) {
  const reservations = reserved.map(item => ({ id: item.id, from: item.terminal, to: item.terminal }));
  const groups = conductorGroups([...connections, ...reservations], assets), lanes = new Map<string, Segment[]>();
  for (const link of connections) for (const segment of segments(link.id, fragments.get(link.id) ?? [], groups.get(link.id)!)) {
    const key = [segment.group, segment.horizontal, Math.round(segment.coordinate / EPS)].join('|');
    const lane = lanes.get(key) ?? []; lane.push(segment); lanes.set(key, lane);
  }
  const reservedIds = new Set(reserved.map(item => item.id));
  for(const item of reserved)for(const segment of segments(item.id,[item.points],groups.get(item.id)!)){
    const key=[segment.group,segment.horizontal,Math.round(segment.coordinate/EPS)].join('|');
    const lane=lanes.get(key)??[];lane.push(segment);lanes.set(key,lane);
  }
  const result = new Map<string, Point[][]>(connections.map(link => [link.id, []]));
  for (const lane of lanes.values()) {
    const cuts = [...new Set(lane.flatMap(segment => [segment.low, segment.high]))].sort((a, b) => a - b);
    for (let i = 1; i < cuts.length; i++) {
      const low = cuts[i - 1], high = cuts[i]; if (high - low < EPS) continue;
      const middle = (low + high) / 2;
      const covering = lane.filter(segment => segment.low <= middle && segment.high >= middle);
      covering.sort((a, b) => Number(reservedIds.has(b.id))-Number(reservedIds.has(a.id)) || priority(b.id) - priority(a.id) || a.id.localeCompare(b.id));
      const owner = covering[0]; if (!owner) continue;
      if(reservedIds.has(owner.id))continue;
      const a: Point = owner.horizontal ? [low, owner.coordinate] : [owner.coordinate, low];
      const b: Point = owner.horizontal ? [high, owner.coordinate] : [owner.coordinate, high];
      const pieces = result.get(owner.id)!, previous = pieces.at(-1);
      if (previous && previous.at(-1)![0] === a[0] && previous.at(-1)![1] === a[1]) previous.push(b);
      else pieces.push([a, b]);
    }
  }
  return result;
}
