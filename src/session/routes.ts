import type { ActiveGraph, GraphEdge } from './connectivity';

type Node = string | symbol;
type Edge = { data: GraphEdge; from: Node; to: Node };

function mixedBlockRoutes(edges: Edge[]) {
  const outgoing = new Map<Node, { next: Node; edge: Edge }[]>();
  const incoming = new Map<Node, Node[]>();
  const add = (from: Node, to: Node, edge: Edge) => {
    outgoing.set(from, [...(outgoing.get(from) ?? []), { next: to, edge }]);
    incoming.set(to, [...(incoming.get(to) ?? []), from]);
  };
  for (const edge of edges) {
    add(edge.from, edge.to, edge);
    if (!edge.data.directed) add(edge.to, edge.from, edge);
  }
  const indegree = new Map([...outgoing.keys(), ...incoming.keys()].map(node => [node, incoming.get(node)?.length ?? 0]));
  const roots = [...indegree].filter(([, count]) => count === 0).map(([node]) => node);
  for (let i = 0; i < roots.length; i++) for (const { next } of outgoing.get(roots[i]) ?? []) {
    indegree.set(next, indegree.get(next)! - 1);
    if (indegree.get(next) === 0) roots.push(next);
  }
  const acyclic = roots.length === indegree.size;
  const cache = new Map<Node, Map<Node, string[] | null>>();
  return (start: Node, target: Node): string[] | null => {
    const cached = cache.get(start);
    if (cached?.has(target)) return cached.get(target)!;
    const canReachTarget = new Set<Node>([target]);
    const queue = [target];
    for (let i = 0; i < queue.length; i++) for (const previous of incoming.get(queue[i]) ?? []) {
      if (!canReachTarget.has(previous)) { canReachTarget.add(previous); queue.push(previous); }
    }
    const union = new Set<string>();
    const visited = new Set<Node>([start]);
    const path: string[] = [];
    let found = false;
    function visit(node: Node) {
      if (node === target) {
        found = true;
        for (const id of path) union.add(id);
        return;
      }
      for (const { next, edge } of outgoing.get(node) ?? []) {
        if (visited.has(next) || !canReachTarget.has(next)) continue;
        visited.add(next); path.push(edge.data.id);
        visit(next);
        path.pop(); visited.delete(next);
        // Every edge is already proved to occur on a simple path. This is a
        // complete result, not an enumeration cap or a reachability estimate.
        if (union.size === edges.length) return;
      }
    }
    if (acyclic && canReachTarget.has(start)) {
      // Only in a DAG does reachability prove simple-path edge membership:
      // combining a prefix and suffix cannot revisit a terminal.
      found = true;
      const reached = new Set<Node>([start]);
      const pending = [start];
      for (let i = 0; i < pending.length; i++) for (const { next, edge } of outgoing.get(pending[i]) ?? []) {
        if (!canReachTarget.has(next)) continue;
        union.add(edge.data.id);
        if (!reached.has(next)) { reached.add(next); pending.push(next); }
      }
    } else if (canReachTarget.has(start)) visit(start);
    const result = found ? [...union] : null;
    if (!cache.has(start)) cache.set(start, new Map());
    cache.get(start)!.set(target, result);
    return result;
  };
}

// In an undirected graph, the blocks on the block-cut tree path between two
// terminals contain exactly the edges of their possible simple supply paths.
// This preserves the fast legacy path. Directed paths cannot leave and reenter a
// block through the same articulation without repeating a terminal, so exact
// enumeration is localized to asymmetric blocks and cached by ordered endpoints.
export function indexRoutes(graph: ActiveGraph, stops: ReadonlySet<string>) {
  const aliases = new Map<string, Node[]>(graph.terminals.map(t => [t, stops.has(t) ? [] : [t]]));
  const endpoint = (terminal: string): Node => {
    if (!stops.has(terminal)) return terminal;
    // Each incident edge ends independently at earth; earth never joins paths.
    const node = Symbol(terminal);
    aliases.get(terminal)!.push(node);
    return node;
  };
  const edges: Edge[] = graph.edges.map(data => ({ data, from: endpoint(data.from), to: endpoint(data.to) }));
  const adjacency = new Map<Node, Edge[]>();
  for (const edge of edges) {
    adjacency.set(edge.from, [...(adjacency.get(edge.from) ?? []), edge]);
    adjacency.set(edge.to, [...(adjacency.get(edge.to) ?? []), edge]);
  }
  const discovered = new Map<Node, number>();
  const low = new Map<Node, number>();
  const pending: Edge[] = [];
  const blocks: Edge[][] = [];
  let sequence = 0;
  function visit(node: Node, parent?: Edge) {
    discovered.set(node, ++sequence);
    low.set(node, sequence);
    for (const edge of adjacency.get(node) ?? []) {
      if (edge === parent) continue;
      const next = edge.from === node ? edge.to : edge.from;
      if (!discovered.has(next)) {
        pending.push(edge);
        visit(next, edge);
        low.set(node, Math.min(low.get(node)!, low.get(next)!));
        if (low.get(next)! >= discovered.get(node)!) {
          const block: Edge[] = [];
          let popped: Edge;
          do { popped = pending.pop()!; block.push(popped); } while (popped !== edge);
          blocks.push(block);
        }
      } else if (discovered.get(next)! < discovered.get(node)!) {
        pending.push(edge);
        low.set(node, Math.min(low.get(node)!, discovered.get(next)!));
      }
    }
  }
  for (const terminal of adjacency.keys()) if (!discovered.has(terminal)) visit(terminal);

  const tree = new Map<Node, Node[]>();
  const blockEdges = new Map<Node, string[]>();
  const mixedRoutes = new Map<Node, ReturnType<typeof mixedBlockRoutes>>();
  for (const block of blocks) {
    const blockNode = Symbol('block');
    const nodes = [...new Set(block.flatMap(edge => [edge.from, edge.to]))];
    tree.set(blockNode, nodes);
    blockEdges.set(blockNode, block.map(edge => edge.data.id));
    if (block.some(edge => edge.data.directed)) mixedRoutes.set(blockNode, mixedBlockRoutes(block));
    for (const node of nodes) tree.set(node, [...(tree.get(node) ?? []), blockNode]);
  }
  const parentCache = new Map<Node, Map<Node, Node | null>>();
  return {
    edgeIds(start: string, target: string): string[] {
      if (start === target) return [];
      const result = new Set<string>();
      for (const origin of aliases.get(start) ?? []) {
        let parents = parentCache.get(origin);
        if (!parents) {
          parents = new Map([[origin, null]]);
          const queue = [origin];
          for (let index = 0; index < queue.length; index++) {
            const node = queue[index];
            for (const next of tree.get(node) ?? []) {
              if (parents.has(next)) continue;
              parents.set(next, node); queue.push(next);
            }
          }
          parentCache.set(origin, parents);
        }
        for (const destination of aliases.get(target) ?? []) {
          if (!parents.has(destination)) continue;
          const path: Node[] = [];
          let node: Node | null = destination;
          while (node !== null) { path.push(node); node = parents.get(node)!; }
          const candidate: string[] = [];
          let valid = true;
          // Path order is destination -> origin; block entry is on its right.
          for (let i = 1; i < path.length - 1; i += 2) {
            const query = mixedRoutes.get(path[i]);
            const ids = query ? query(path[i + 1], path[i - 1]) : blockEdges.get(path[i])!;
            if (ids === null) { valid = false; break; }
            candidate.push(...ids);
          }
          if (valid) for (const id of candidate) result.add(id);
        }
      }
      return [...result].sort();
    },
  };
}
