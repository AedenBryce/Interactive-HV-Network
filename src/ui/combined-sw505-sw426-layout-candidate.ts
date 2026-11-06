import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { placeSw505BelowSw454 } from './sw454-sw505-room-placement-candidate';
import { sw426DestinationPlus600Candidate } from './sw426-destination-plus-600-candidate';

const samePoints = (a: readonly Point[] | undefined, b: readonly Point[] | undefined) =>
  !!a && !!b && a.length === b.length && a.every((point, index) => point[0] === b[index][0] && point[1] === b[index][1]);

/** Compose the two isolated, disjoint room moves from one deterministic production layout. */
export function combinedSw505Sw426LayoutCandidate(model: NetworkModel) {
  const base = continuousNetwork(model);
  const sw505 = placeSw505BelowSw454(model, base);
  const sw426 = sw426DestinationPlus600Candidate(model, base);
  if (!sw505.applied) throw new Error(`SW505 candidate unavailable: ${sw505.reason}`);

  const positions = Object.fromEntries(Object.entries(base.view.layout.assets).map(([id, point]) => [id, [...point] as Point]));
  const terminals = Object.fromEntries(Object.entries(base.view.layout.terminals).map(([id, point]) => [id, [...point] as Point]));
  const labels = new Map([...base.labels].map(([id, label]) => [id, { ...label }]));
  const movedBySw505 = new Set<string>();
  for (const [id, next] of Object.entries(sw505.positions)) {
    const before = base.view.layout.assets[id];
    if (!before || before[0] === next[0] && before[1] === next[1]) continue;
    movedBySw505.add(id);
    positions[id] = [...next];
  }
  for (const id of sw426.movedAssetIds) {
    if (movedBySw505.has(id)) throw new Error(`Room move overlap at asset ${id}`);
    const before = base.view.layout.assets[id];
    if (!before) throw new Error(`SW426 candidate references missing asset ${id}`);
    positions[id] = [before[0] + 16_296, before[1]];
  }
  for (const [id, next] of Object.entries(sw505.terminals)) {
    const before = base.view.layout.terminals[id];
    if (before && (before[0] !== next[0] || before[1] !== next[1])) terminals[id] = [...next];
  }
  for (const id of sw426.movedAssetIds) {
    const asset = model.assets.find(item => item.id === id);
    for (const terminal of asset?.terminals ?? []) {
      const before = base.view.layout.terminals[terminal];
      if (before) terminals[terminal] = [before[0] + 16_296, before[1]];
    }
  }
  for (const [id, next] of sw505.labels) {
    const before = base.labels.get(id);
    if (before && (before.x !== next.x || before.y !== next.y)) labels.set(id, { ...next });
  }
  for (const id of sw426.movedAssetIds) {
    const before = base.labels.get(id);
    if (before) labels.set(id, { ...before, x: before.x + 16_296 });
  }

  const framesById = new Map(base.panels.map(frame => [frame.id, { ...frame }]));
  for (const next of sw505.panels) {
    const before = base.panels.find(frame => frame.id === next.id);
    if (before && (before.x !== next.x || before.y !== next.y)) framesById.set(next.id, { ...next });
  }
  for (const next of sw426.frames) {
    const before = base.panels.find(frame => frame.id === next.id);
    if (before && (before.x !== next.x || before.y !== next.y)) framesById.set(next.id, { ...next });
  }

  const routes = new Map([...base.routes].map(([id, points]) => [id, points.map(point => [...point] as Point)]));
  const sw426ChangedRoutes = new Set<string>();
  for (const [id, points] of sw426.routes) {
    const original = base.routes.get(id);
    if (!samePoints(original, points)) {
      sw426ChangedRoutes.add(id);
      routes.set(id, points.map(point => [...point] as Point));
    }
  }
  for (const [id, points] of sw505.routes) {
    const original = base.routes.get(id);
    if (!samePoints(original, points)) {
      if (sw426ChangedRoutes.has(id) && !samePoints(routes.get(id), points)) {
        throw new Error(`Candidates modify the same route differently: ${id}`);
      }
      routes.set(id, points.map(point => [...point] as Point));
    }
  }
  const byId = new Map(model.connections.map(link => [link.id, link]));
  const findings = validateDiagramGeometry({
    routes: [...routes].flatMap(([id, points]) => {
      const link = byId.get(id);
      return link ? [{ id, points, terminals: [link.from, link.to] as [string, string] }] : [];
    }),
    roomFrames: [...framesById.values()].map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  });
  return { base, positions, terminals, labels, panels: [...framesById.values()], routes, findings, sw505, sw426 };
}
