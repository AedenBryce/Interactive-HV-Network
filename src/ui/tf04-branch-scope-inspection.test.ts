import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';

it('lists the connected TF04-to-RM420 scope without layout work', () => {
  const owner = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const adjacency = new Map(currentNetworkModel.assets.map(asset => [asset.id, [] as { peer: string; link: string }[]]));
  for (const link of currentNetworkModel.connections) {
    const a = owner.get(link.from)!; const b = owner.get(link.to)!;
    adjacency.get(a)!.push({ peer: b, link: link.id }); adjacency.get(b)!.push({ peer: a, link: link.id });
  }
  const start = 'boundary:tf04'; const end = 'rm420:interface:pole286';
  const previous = new Map<string, { from: string; link: string }>(); const queue = [start]; const seen = new Set(queue);
  for (let i = 0; i < queue.length && !seen.has(end); i++) for (const edge of adjacency.get(queue[i]) ?? []) if (!seen.has(edge.peer)) { seen.add(edge.peer); previous.set(edge.peer, { from: queue[i], link: edge.link }); queue.push(edge.peer); }
  const pathAssets = new Set<string>([end]); const pathLinks = new Set<string>();
  for (let id = end; id !== start;) { const step = previous.get(id); if (!step) throw new Error('No path from TF04 to RM420'); pathLinks.add(step.link); id = step.from; pathAssets.add(id); }
  const selected = currentNetworkModel.assets.filter(asset => asset.id === start || asset.id.startsWith('station:sb02:f4:') || asset.id.startsWith('line33:') || asset.id.startsWith('rm420:'));
  const attached = currentNetworkModel.connections.filter(link => {
    const a = owner.get(link.from)!; const b = owner.get(link.to)!;
    return selected.some(asset => asset.id === a) && selected.some(asset => asset.id === b);
  });
  console.log(JSON.stringify({ pathAssets: [...pathAssets], pathLinks: [...pathLinks], selectedAssets: selected.map(a => a.id), selectedLinks: attached.map(l => l.id) }, null, 2));
});
