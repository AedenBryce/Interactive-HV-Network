import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import type { Point } from './diagram-geometry';
import { simplifyLineRoute } from './line-routing';

type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };
/** Leave a short clear tail between the outermost feeder and each end tick. */
export function busEndClearance<T extends Geometry>(geometry: T, gap = 120): T {
  const assets = new Map(geometry.assets.map(asset => [asset.id, asset]));
  const spans = { ...geometry.view.layout.busSpans };
  for (const connection of geometry.connections) {
    const from = assets.get(geometry.owners.get(connection.from)!)!, to = assets.get(geometry.owners.get(connection.to)!)!;
    if (!from || !to) continue;
    const bus = from.kind === 'bus' ? from : to.kind === 'bus' ? to : undefined;
    const peer = bus === from ? to : from;
    if (!bus || peer.kind === 'earth-switch') continue;
    const points = geometry.routes.get(connection.id); if (!points?.length) continue;
    const tap = bus === from ? points[0] : points.at(-1)!;
    const center = geometry.view.layout.assets[bus.id], axis = geometry.view.layout.rotations?.[bus.id] === 90 ? 0 : 1;
    spans[bus.id] = Math.max(spans[bus.id] ?? 60, 2 * (Math.abs(tap[axis] - center[axis]) + gap));
  }
  return { ...geometry, view: { ...geometry.view, layout: { ...geometry.view.layout, busSpans: spans } } };
}
export type BusTakeoffs = Record<string, number>;
export function validateBusTakeoffs(value: unknown): BusTakeoffs {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid bus takeoffs.');
  const result: BusTakeoffs = {};
  for (const [id, fraction] of Object.entries(value)) {
    if (['__proto__', 'constructor', 'prototype'].includes(id) || typeof fraction !== 'number' || !Number.isFinite(fraction) || fraction < 0 || fraction > 1) throw new Error('Invalid bus takeoff.');
    result[id] = fraction;
  }
  return result;
}
export function busEarthPairs(geometry: Geometry) {
  const assets = new Map(geometry.assets.map(asset => [asset.id, asset]));
  return geometry.connections.flatMap(connection => {
    const from = assets.get(geometry.owners.get(connection.from)!)!, to = assets.get(geometry.owners.get(connection.to)!)!;
    if (!from || !to) return [];
    if (from.kind === 'bus' && to.kind === 'earth-switch') return [{ connection, bus: from, earth: to, busFrom: true }];
    if (to.kind === 'bus' && from.kind === 'earth-switch') return [{ connection, bus: to, earth: from, busFrom: false }];
    return [];
  });
}

/** Per-connection taps can move along a shared bus without moving its other taps. */
export function applyBusTakeoffs<T extends Geometry>(geometry: T, takeoffs: BusTakeoffs): T {
  if (!Object.keys(takeoffs).length) return geometry;
  const routes = new Map(geometry.routes);
  for (const { connection, bus, busFrom } of busEarthPairs(geometry)) {
    const fraction = takeoffs[connection.id]; if (fraction === undefined) continue;
    const [x, y] = geometry.view.layout.assets[bus.id], span = geometry.view.layout.busSpans?.[bus.id] ?? 60;
    const horizontal = geometry.view.layout.rotations?.[bus.id] === 90;
    const tap: Point = horizontal ? [x + (fraction - .5) * span, y] : [x, y + (fraction - .5) * span];
    const existing = routes.get(connection.id)!;
    const end = busFrom ? existing.at(-1)! : existing[0];
    const points = simplifyLineRoute(horizontal ? [tap, [tap[0], end[1]], end] : [tap, [end[0], tap[1]], end]);
    routes.set(connection.id, busFrom ? points : points.reverse());
  }
  return { ...geometry, routes };
}

/** Centre each takeoff in a clear bay and align its symbol to the local earth row. */
export function centredBusEarthMoves(geometry: Geometry) {
  const pairs = busEarthPairs(geometry), busEarthIds = new Set(pairs.map(pair => pair.earth.id));
  const occupied: Point[] = [];
  return pairs.map(({ connection, bus, earth }) => {
    const layout = geometry.view.layout, current = layout.assets[earth.id];
    const panel = geometry.panels?.find(room => (room.memberAssetIds ?? room.assetIds).includes(earth.id));
    const members = new Set(panel?.memberAssetIds ?? panel?.assetIds ?? []);
    const peers = geometry.assets.filter(asset => members.has(asset.id) && !busEarthIds.has(asset.id));
    const earthYs = peers.filter(asset => asset.kind === 'earth-switch').map(asset => layout.assets[asset.id][1]).sort((a, b) => a - b);
    const y = earthYs.length ? earthYs[Math.floor(earthYs.length / 2)] : current[1];
    const [busX] = layout.assets[bus.id], span = layout.busSpans?.[bus.id] ?? 60;
    const columns = [...new Set(peers.filter(asset => asset.kind === 'breaker' || asset.kind === 'disconnector').map(asset => layout.assets[asset.id][0]))].sort((a, b) => a - b);
    const candidates = [busX, ...[-.35, -.25, -.15, .15, .25, .35].map(offset => busX + span * offset), ...columns.slice(1).map((x, i) => (x + columns[i]) / 2)]
      .filter(x => Math.abs(x - busX) <= span * .35);
    const label = geometry.labels.get(earth.id);
    const score = (tap: number) => {
      const x = tap + 220;
      if (occupied.some(p => Math.abs(p[0] - x) < 650 && Math.abs(p[1] - y) < 240)) return Number.POSITIVE_INFINITY;
      let penalty = Math.abs(tap - busX) / Math.max(1, span);
      for (const asset of peers) {
        const p = layout.assets[asset.id];
        if (Math.abs(p[0] - x) < 240 && Math.abs(p[1] - y) < 240) penalty += 100;
        // Keep the drop clear of vertical feeder columns.
        if (Math.abs(p[0] - tap) < 150 && p[1] > layout.assets[bus.id][1] && p[1] < y + 100) penalty += 100;
        const other = geometry.labels.get(asset.id);
        if (label && other) {
          const lx = label.x + x - current[0], ly = label.y + y - current[1];
          if (lx < other.x + other.width && lx + label.width > other.x && ly < other.y + other.height && ly + label.height > other.y) penalty += 25;
        }
      }
      return penalty;
    };
    const tap = candidates.sort((a, b) => score(a) - score(b))[0] ?? busX;
    const x = tap + 220; occupied.push([x, y]);
    return { assetId: earth.id, connectionId: connection.id, delta: [x - current[0], y - current[1]] as Point,
      fraction: Math.max(0, Math.min(1, .5 + (tap - busX) / span)), row: y };
  });
}

/** Depicted tier order, CB-10016-DR-EL-0010/0011 rev0 p1. Only the nine dedicated bus earths shown there. */
export function drawingBusEarthMoves(geometry: Geometry) {
  const bays: Record<string, string[]> = {
    'sw411:bus-a:es': ['sw411:tier-04:cb', 'sw411:in-03:cb'],
    'sw411:bus-b:es': ['sw411:in-02:cb', 'sw411:tier-13:cb'],
    'sw435:bus:es': ['sw435:tf435:hv-cb', 'sw435:tf436:hv-cb'],
    'sw454:bus:es': ['sw454:tf454:hv-cb', 'sw454:tf455:hv-cb'],
    'sw505:bus:es': ['sw505:tf506:hv-cb', 'sw505:tf507:hv-cb'],
    'sw451:bus:es': ['sw451:spare-2:cb', 'sw451:tf451:hv-cb'],
    'sw431:bus:es': ['sw431:tf431:hv-cb', 'sw431:tf432:hv-cb'],
    'sw426:bus:es': ['sw426:tf426:cb', 'sw426:tf428:cb'],
    'sw421:bus:es': ['sw421:spare:tier2:cb', 'sw421:tf421:hv-cb'],
  };
  return busEarthPairs(geometry).flatMap(({connection, bus, earth}) => {
    const ids = bays[earth.id]; if (!ids) return [];
    const points = ids.map(id => geometry.view.layout.assets[id]);
    if (points.some(point => !point)) throw new Error(`Missing drawing tier reference for ${earth.id}`);
    const tap = points.reduce((sum, point) => sum + point[0], 0) / points.length;
    const row = Math.max(...points.map(point => point[1]), geometry.view.layout.assets[bus.id][1] + 500);
    const current = geometry.view.layout.assets[earth.id], [busX] = geometry.view.layout.assets[bus.id], span = geometry.view.layout.busSpans?.[bus.id] ?? 60;
    return [{assetId:earth.id,connectionId:connection.id,delta:[tap + 220 - current[0], row - current[1]] as Point,fraction:Math.max(0,Math.min(1,.5+(tap-busX)/span)),row}];
  });
}

