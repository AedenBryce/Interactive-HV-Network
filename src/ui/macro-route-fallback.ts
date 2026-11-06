import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

type Candidate = ReturnType<typeof import('./whole-graph-layout-candidate').layoutWholeGraphCandidate>;
type MacroPlacement = { macroGroupByAsset: Readonly<Record<string, string>> };

/**
 * Restores every connection after bounded orthogonal routing. Existing A*
 * paths win; unresolved same-macro edges retain their rigid translated seed
 * path, and unresolved inter-macro edges retain translated endpoint leads plus
 * an orthogonal diagnostic bridge. This is diagnostic completeness, not a
 * claim that fallback paths are collision-free.
 */
export function completeMacroRoutesWithFallback(
  model: NetworkModel,
  base: ReturnType<typeof import('./continuous-network').continuousNetwork>,
  candidate: Candidate,
  placement: MacroPlacement,
  explicitCorridors: ReadonlyMap<string, readonly Point[]> = new Map(),
) {
  const requests = new Map(candidate.routeRequests.map(request => [request.id, request]));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const routes = new Map(candidate.routes);
  const fallbackKinds = new Map<string, 'same-macro-translated' | 'inter-macro-leads' | 'explicit-corridor'>();
  for (const unresolved of candidate.unresolved) {
    const separator = unresolved.lastIndexOf(':');
    const routeId = unresolved.slice(0, separator);
    const connection = connectionById.get(routeId); const original = base.routes.get(routeId); const request = requests.get(routeId);
    if (!connection || !original?.length || !request) throw new Error(`Cannot fallback route ${routeId}: missing source path, connection or endpoint request`);
    const corridor = explicitCorridors.get(routeId);
    if (corridor) {
      routes.set(routeId, normalizeOrthogonal(corridor));
      fallbackKinds.set(routeId, 'explicit-corridor');
      continue;
    }
    const fromAsset = ownerByTerminal.get(connection.from)!; const toAsset = ownerByTerminal.get(connection.to)!;
    const requestFrom: Point = [request.from[0], request.from[1]];
    const requestTo: Point = [request.to[0], request.to[1]];
    const fromDelta: Point = [request.from[0] - original[0][0], request.from[1] - original[0][1]];
    const toDelta: Point = [request.to[0] - original.at(-1)![0], request.to[1] - original.at(-1)![1]];
    const sameMacro = placement.macroGroupByAsset[fromAsset] === placement.macroGroupByAsset[toAsset];
    const endpointDeltasEqual = nearPoint(fromDelta, toDelta) && nearPoint(
      [original[0][0] + fromDelta[0], original[0][1] + fromDelta[1]], requestFrom,
    ) && nearPoint([original.at(-1)![0] + toDelta[0], original.at(-1)![1] + toDelta[1]], requestTo);
    if (sameMacro && endpointDeltasEqual) {
      routes.set(routeId, original.map(([x, y]) => [x + fromDelta[0], y + fromDelta[1]] as Point));
      fallbackKinds.set(routeId, 'same-macro-translated');
      continue;
    }
    // The local leads retain their original symbol/terminal departure vectors;
    // only the inter-macro span is rebuilt between those exact moved ports.
    const sourceLeadEnd: Point = [original[Math.min(1, original.length - 1)][0] + fromDelta[0], original[Math.min(1, original.length - 1)][1] + fromDelta[1]];
    const destinationLeadStart: Point = [original[Math.max(0, original.length - 2)][0] + toDelta[0], original[Math.max(0, original.length - 2)][1] + toDelta[1]];
    const sourceLead: Point[] = [requestFrom, sourceLeadEnd];
    const destinationLead: Point[] = [destinationLeadStart, requestTo];
    const elbow: Point = [destinationLeadStart[0], sourceLeadEnd[1]];
    routes.set(routeId, normalizeOrthogonal([...sourceLead, elbow, ...destinationLead]));
    fallbackKinds.set(routeId, 'inter-macro-leads');
  }

  const expectedIds = new Set(model.connections.map(connection => connection.id));
  const missingIds = [...expectedIds].filter(id => !routes.has(id));
  const extraIds = [...routes.keys()].filter(id => !expectedIds.has(id));
  if (missingIds.length || extraIds.length || routes.size !== expectedIds.size) {
    throw new Error(`Macro fallback route inventory mismatch: missing=${missingIds.join(',')} extra=${extraIds.join(',')}`);
  }
  const geometryRoutes: GeometryRoute[] = [...routes].map(([id, points]) => {
    const connection = connectionById.get(id)!;
    return { id, points, terminals: [connection.from, connection.to] };
  });
  const findings = validateDiagramGeometry({
    routes: geometryRoutes,
    roomFrames: candidate.frames.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
  });
  return { routes, fallbackKinds, findings, missingIds, extraIds, fromSeedCount: base.routes.size };
}

function normalizeOrthogonal(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  const append = (point: Point) => {
    const previous = result.at(-1);
    if (!previous) { result.push(point); return; }
    if (previous[0] !== point[0] && previous[1] !== point[1]) result.push([point[0], previous[1]]);
    if (result.at(-1)![0] !== point[0] || result.at(-1)![1] !== point[1]) result.push(point);
    while (result.length >= 3) {
      const a = result.at(-3)!; const b = result.at(-2)!; const c = result.at(-1)!;
      if ((a[0] === b[0] && b[0] === c[0]) || (a[1] === b[1] && b[1] === c[1])) result.splice(result.length - 2, 1);
      else break;
    }
  };
  points.forEach(append);
  return result;
}

function nearPoint(a: Point, b: Point) { return Math.abs(a[0] - b[0]) < 0.001 && Math.abs(a[1] - b[1]) < 0.001; }
