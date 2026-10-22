import type { ActiveGraph, GraphEdge } from './connectivity';

type Node = string | symbol;
type Edge = { data: GraphEdge; from: Node; to: Node };

// In an undirected graph, the blocks on the block-cut tree path between two
// terminals contain exactly the edges of their possible simple supply paths.
// This preserves alternate routes without enumerating exponentially many paths.
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
  for (const block of blocks) {
    const blockNode = Symbol('block');
    const nodes = [...new Set(block.flatMap(edge => [edge.from, edge.to]))];
    tree.set(blockNode, nodes);
    blockEdges.set(blockNode, block.map(edge => edge.data.id));
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
          let node: Node | null = destination;
          while (node !== null) {
            for (const id of blockEdges.get(node) ?? []) result.add(id);
            node = parents.get(node)!;
          }
        }
      }
      return [...result].sort();
    },
  };
}
