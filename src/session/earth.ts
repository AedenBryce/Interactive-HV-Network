import { indexWalks, pathFromWalk } from './connectivity';
import type { ActiveGraph, WalkStep } from './connectivity';
import type { NetworkModel, SourceStates } from './model';
import { isSupported } from './evidence';
import { indexRoutes } from './routes';
import { indexSourceQueries } from './source-query';

export type SourceEarthConflict = {
  sourceId: string;
  earthId: string;
  terminalPath: string[];
  connectionIds: string[];
};

export type EarthConnectivity = {
  earthIds: string[];
  terminalEarths: Record<string, string[]>;
  conflictSourceIds: string[];
  earthRouteEdgeIds: string[];
};

/** Earth labels/group IDs never create conductive edges. Every earth terminal is a trace sink. */
export function evaluateEarths(model: NetworkModel, graph: ActiveGraph, enabledSources: SourceStates, options: { includeUnconfirmed?: boolean; sourceGraph?: ActiveGraph } = {}) {
  const earths = (model.earths ?? []).filter(earth => options.includeUnconfirmed || isSupported(model, earth));
  const stopAt = new Set((model.earths ?? []).map(earth => earth.terminal));
  const walks = indexWalks(graph, { stopAt });
  const sourceWalks = indexSourceQueries(options.sourceGraph ?? graph, stopAt);
  const routes = indexRoutes(graph, stopAt);
  const terminalEarths = Object.fromEntries(graph.terminals.map(terminal => {
    if (earths.length === 0) return [terminal, [] as string[]];
    const reachable = walks.walk(terminal);
    return [terminal, earths.filter(earth => reachable.has(earth.terminal)).map(earth => earth.id).sort()];
  }));
  const conflicts: SourceEarthConflict[] = [];
  const sourceReach = new Map<string, Map<string, WalkStep>>();
  for (const source of earths.length ? model.sources : []) {
    const enabled = enabledSources[source.id];
    if (!(enabled === true || (options.includeUnconfirmed && enabled === null)) || (!options.includeUnconfirmed && !isSupported(model, source))) continue;
    const reachable = sourceWalks.walk(source.terminal);
    sourceReach.set(source.id, reachable);
    for (const earth of earths) {
      if (!reachable.has(earth.terminal)) continue;
      const path = pathFromWalk(reachable, earth.terminal);
      conflicts.push({ sourceId: source.id, earthId: earth.id, terminalPath: path.terminals, connectionIds: path.connectionIds });
    }
  }
  const connectivity: Record<string, EarthConnectivity> = Object.fromEntries(model.assets.map(asset => {
    const terminals = Object.fromEntries(asset.terminals.map(terminal => [terminal, terminalEarths[terminal]]));
    const conflictSourceIds = [...new Set(conflicts.filter(conflict => asset.terminals.some(terminal => sourceReach.get(conflict.sourceId)?.has(terminal))).map(conflict => conflict.sourceId))].sort();
    // Route edge sets are undirected. Root at the shared earth endpoint to reuse
    // its parent tree; the route index still splits earth into independent sinks.
    const earthRouteEdgeIds = [...new Set(asset.terminals.flatMap(terminal => earths.filter(earth => terminalEarths[terminal].includes(earth.id)).flatMap(earth => routes.edgeIds(earth.terminal, terminal))))].sort();
    return [asset.id, { terminalEarths: terminals, earthIds: [...new Set(Object.values(terminals).flat())].sort(), conflictSourceIds, earthRouteEdgeIds }];
  }));
  return { terminalEarths, connectivity, conflicts };
}
