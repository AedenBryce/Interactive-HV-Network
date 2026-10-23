import type { NetworkModel, SourceStates, DeviceStates } from './model';
import { indexSourceQueries } from './source-query';
import { isPositionSupported, isSourceArcSupported, isSupported } from './evidence';
import { getRemovableMechanism, removablePairs } from './mechanisms';

export type GraphEdge = { id: string; from: string; to: string; connectionId?: string; assetId?: string; directed?: true; sourceArcId?: string };
export type ActiveGraph = { terminals: string[]; edges: GraphEdge[] };
export type WalkStep = { previous: string | null; edge: GraphEdge | null };
export type SourcePath = { sourceId: string; terminalId: string; terminals: string[]; connectionIds: string[]; assetIds: string[] };
export type Connectivity = { sourceIds: string[]; terminalSources: Record<string, string[]>; paths: SourcePath[]; routeEdgeIds: string[] };

export function buildGraph(model: NetworkModel, devices: DeviceStates, options: { includeUnconfirmed?: boolean; channel?: 'source' | 'earth' } = {}): ActiveGraph {
  const edges: GraphEdge[] = model.connections.filter(c => options.includeUnconfirmed || isSupported(model, c)).map(c => ({ id: `connection:${c.id}`, from: c.from, to: c.to, connectionId: c.id }));
  for (const asset of model.assets) {
    const pairKey = (pair: [string, string]) => JSON.stringify([...pair].sort());
    const channelPairs = (item: { sourcePairs?: [string, string][]; earthPairs?: [string, string][] }) => (options.channel === 'earth' ? item.earthPairs : item.sourcePairs) ?? [];
    const positionRelationships = asset.positions.map(position => ({ id: position.id, pairs: [...position.pairs, ...channelPairs(position)], supported: isPositionSupported(model, asset, position) }));
    const activePosition = positionRelationships.find(position => position.id === devices[asset.id]);
    const positionPairs = devices[asset.id] === null
      ? options.includeUnconfirmed ? positionRelationships.flatMap(position => position.pairs) : (positionRelationships[0]?.pairs ?? []).filter(pair => positionRelationships.every(position => position.supported && position.pairs.some(candidate => pairKey(candidate) === pairKey(pair))))
      : activePosition && (options.includeUnconfirmed || activePosition.supported) ? activePosition.pairs : [];
    const parentIncluded = options.includeUnconfirmed || isSupported(model, asset);
    const mechanism = getRemovableMechanism(asset);
    const mechanicalPairs = parentIncluded && mechanism ? removablePairs(mechanism.mainPair, devices[asset.id], options.includeUnconfirmed ?? false) : [];
    const fixedPairs = parentIncluded ? [...asset.conductivePairs, ...channelPairs(asset)] : [];
    // Retain legacy fixed/position/mechanism insertion order for historical path examples.
    const pairs = new Map([...fixedPairs, ...positionPairs, ...mechanicalPairs].map(pair => [pairKey(pair), pair]));
    for (const [key, [from, to]] of pairs) edges.push({ id: `asset:${JSON.stringify([asset.id, key])}`, from, to, assetId: asset.id });
    if (options.channel !== 'earth') for (const arc of asset.sourceArcs ?? []) {
      if (options.includeUnconfirmed || isSourceArcSupported(model, asset, arc)) edges.push({ id: `source-arc:${JSON.stringify([asset.id, arc.id, arc.from, arc.to])}`, from: arc.from, to: arc.to, assetId: asset.id, directed: true, sourceArcId: arc.id });
    }
  }
  return { terminals: model.assets.flatMap(a => a.terminals), edges };
}

export function indexWalks(graph: ActiveGraph, options: { stopAt?: ReadonlySet<string> } = {}) {
  // One evaluation shares adjacency; each walk still owns its traversal state.
  const adjacency = new Map(graph.terminals.map(t => [t, [] as { terminal: string; edge: GraphEdge }[]]));
  for (const edge of graph.edges) {
    adjacency.get(edge.from)?.push({ terminal: edge.to, edge });
    if (!edge.directed) adjacency.get(edge.to)?.push({ terminal: edge.from, edge });
  }
  return { walk(start: string): Map<string, WalkStep> {
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
  } };
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

export function evaluateSources(model: NetworkModel, graph: ActiveGraph, sources: SourceStates, options: { includeUnconfirmed?: boolean } = {}): Record<string, Connectivity> {
  const stops = new Set((model.earths ?? []).map(earth => earth.terminal));
  const queries = indexSourceQueries(graph, stops);
  const owners = new Map(model.assets.flatMap(a => a.terminals.map(t => [t, a.id] as const)));
  const terminalSources = new Map(graph.terminals.map(t => [t, [] as string[]]));
  const paths = new Map(graph.terminals.map(t => [t, [] as SourcePath[]]));
  const routeEdges = new Map(graph.terminals.map(t => [t, new Set<string>()]));
  for (const source of model.sources) {
    const enabled = sources[source.id];
    if (!(enabled === true || (options.includeUnconfirmed && enabled === null)) || (!options.includeUnconfirmed && !isSupported(model, source))) continue;
    const reached = queries.walk(source.terminal);
    for (const terminal of reached.keys()) {
      terminalSources.get(terminal)!.push(source.id);
      for (const edgeId of queries.edgeIds(source.terminal, terminal)) routeEdges.get(terminal)!.add(edgeId);
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
