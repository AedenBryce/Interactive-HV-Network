import { walkGraph, pathFromWalk } from './connectivity';
import type { ActiveGraph, WalkStep } from './connectivity';
import type { NetworkModel } from './model';

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
};

/** Earth labels/group IDs never create conductive edges. Every earth terminal is a trace sink. */
export function evaluateEarths(model: NetworkModel, graph: ActiveGraph, enabledSources: Record<string, boolean>) {
  const earths = model.earths ?? [];
  const stopAt = new Set(earths.map(earth => earth.terminal));
  const terminalEarths = Object.fromEntries(graph.terminals.map(terminal => {
    if (earths.length === 0) return [terminal, [] as string[]];
    const reachable = walkGraph(graph, terminal, { stopAt });
    return [terminal, earths.filter(earth => reachable.has(earth.terminal)).map(earth => earth.id).sort()];
  }));
  const conflicts: SourceEarthConflict[] = [];
  const sourceReach = new Map<string, Map<string, WalkStep>>();
  for (const source of earths.length ? model.sources : []) {
    if (!enabledSources[source.id]) continue;
    const reachable = walkGraph(graph, source.terminal, { stopAt });
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
    return [asset.id, { terminalEarths: terminals, earthIds: [...new Set(Object.values(terminals).flat())].sort(), conflictSourceIds }];
  }));
  return { terminalEarths, connectivity, conflicts };
}
