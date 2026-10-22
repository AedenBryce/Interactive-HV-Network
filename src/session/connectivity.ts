import type { NetworkModel } from './model';
import { indexRoutes } from './routes';

export type GraphEdge = { id: string; from: string; to: string; connectionId?: string; assetId?: string };
export type ActiveGraph = { terminals: string[]; edges: GraphEdge[] };
export type WalkStep = { previous: string | null; edge: GraphEdge | null };
export type SourcePath = { sourceId: string; terminalId: string; terminals: string[]; connectionIds: string[]; assetIds: string[] };
export type Connectivity = { sourceIds: string[]; terminalSources: Record<string, string[]>; paths: SourcePath[]; routeEdgeIds: string[] };

export function buildGraph(model: NetworkModel, devices: Record<string, string>): ActiveGraph {
  const edges: GraphEdge[] = model.connections.map(c => ({ id: `connection:${c.id}`, from: c.from, to: c.to, connectionId: c.id }));
  for (const asset of model.assets) {
    const pairs = [...asset.conductivePairs, ...(asset.positions.find(p => p.id === devices[asset.id])?.pairs ?? [])];
    pairs.forEach(([from, to], index) => edges.push({ id: `asset:${JSON.stringify([asset.id, ...[from, to].sort(), index])}`, from, to, assetId: asset.id }));
  }
  return { terminals: model.assets.flatMap(a => a.terminals), edges };
}

export function walkGraph(graph: ActiveGraph, start: string, options: { stopAt?: ReadonlySet<string> } = {}): Map<string, WalkStep> {
  const adjacency = new Map(graph.terminals.map(t => [t, [] as { terminal: string; edge: GraphEdge }[]]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ terminal: edge.to, edge });
    adjacency.get(edge.to)?.push({ terminal: edge.from, edge });
  }
  const reached = new Map<string, WalkStep>([[start, { previous: null, edge: null }]]);
  const queue = [start];
  for (let index = 0; index < queue.length; index++) {
    const terminal = queue[index];
    if (options.stopAt?.has(terminal)) continue;
    for (const neighbor of adjacency.get(terminal) ?? []) {
      if (reached.has(neighbor.terminal)) continue;
      reached.set(neighbor.terminal, { previous: terminal, edge: neighbor.edge });
      queue.push(neighbor.terminal);
    }
  }
  return reached;
}

export function pathFromWalk(reached: Map<string, WalkStep>, terminal: string) {
  const terminals: string[] = [];
  const connectionIds: string[] = [];
  let step: string | null = terminal;
  while (step !== null) {
    terminals.push(step);
    const entry: WalkStep = reached.get(step)!;
    if (entry.edge?.connectionId) connectionIds.push(entry.edge.connectionId);
    step = entry.previous;
  }
  return { terminals: terminals.reverse(), connectionIds: connectionIds.reverse() };
}

export function evaluateSources(model: NetworkModel, graph: ActiveGraph, sources: Record<string, boolean>): Record<string, Connectivity> {
  const stops = new Set((model.earths ?? []).map(earth => earth.terminal));
  const routes = indexRoutes(graph, stops);
  const owners = new Map(model.assets.flatMap(a => a.terminals.map(t => [t, a.id] as const)));
  const terminalSources = new Map(graph.terminals.map(t => [t, [] as string[]]));
  const paths = new Map(graph.terminals.map(t => [t, [] as SourcePath[]]));
  const routeEdges = new Map(graph.terminals.map(t => [t, new Set<string>()]));
  for (const source of model.sources) {
    if (!sources[source.id]) continue;
    const reached = walkGraph(graph, source.terminal, { stopAt: stops });
    for (const terminal of reached.keys()) {
      terminalSources.get(terminal)!.push(source.id);
      for (const edgeId of routes.edgeIds(source.terminal, terminal)) routeEdges.get(terminal)!.add(edgeId);
      const { terminals, connectionIds } = pathFromWalk(reached, terminal);
      const assetIds = terminals.map(t => owners.get(t)!).filter((id, index, all) => id !== all[index - 1]);
      paths.get(terminal)!.push({ sourceId: source.id, terminalId: terminal, terminals, connectionIds, assetIds });
    }
  }
  return Object.fromEntries(model.assets.map(asset => {
    const terminals = Object.fromEntries(asset.terminals.map(t => [t, terminalSources.get(t)!]));
    return [asset.id, { terminalSources: terminals, sourceIds: [...new Set(Object.values(terminals).flat())].sort(), paths: asset.terminals.flatMap(t => paths.get(t)!), routeEdgeIds: [...new Set(asset.terminals.flatMap(t => [...routeEdges.get(t)!]))].sort() }];
  }));
}
