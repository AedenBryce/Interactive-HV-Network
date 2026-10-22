import { modelSchema } from './model';
import type { NetworkModel } from './model';

export type Connectivity = { sourceIds: string[]; terminalSources: Record<string, string[]> };
export type SessionSnapshot = {
  model: NetworkModel;
  devices: Record<string, string>;
  sources: Record<string, boolean>;
  connectivity: Record<string, Connectivity>;
};
export type ActionResult = { ok: true } | { ok: false; error: string };

export class SimulationSession {
  #model: NetworkModel;
  #devices: Record<string, string>;
  #sources: Record<string, boolean>;

  constructor(model: unknown) {
    this.#model = modelSchema.parse(model);
    this.#devices = { ...this.#model.starting.devices };
    this.#sources = { ...this.#model.starting.sources };
  }

  loadModel(input: unknown): ActionResult {
    const result = modelSchema.safeParse(input);
    if (!result.success) return { ok: false, error: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') };
    this.#model = result.data;
    this.#devices = { ...result.data.starting.devices };
    this.#sources = { ...result.data.starting.sources };
    return { ok: true };
  }

  changeDevice(assetId: string, position: string): ActionResult {
    const asset = this.#model.assets.find(asset => asset.id === assetId);
    if (!asset?.positions.some(state => state.id === position)) {
      return { ok: false, error: `Unsupported position ${position} for ${assetId}.` };
    }
    this.#devices[assetId] = position;
    return { ok: true };
  }

  snapshot(): SessionSnapshot {
    const adjacency = new Map<string, string[]>();
    const join = (a: string, b: string) => {
      adjacency.get(a)?.push(b);
      adjacency.get(b)?.push(a);
    };
    for (const asset of this.#model.assets) {
      for (const terminal of asset.terminals) adjacency.set(terminal, []);
    }
    for (const connection of this.#model.connections) join(connection.from, connection.to);
    for (const asset of this.#model.assets) {
      const pairs = [...asset.conductivePairs, ...(asset.positions.find(p => p.id === this.#devices[asset.id])?.pairs ?? [])];
      for (const [a, b] of pairs) join(a, b);
    }
    const terminalSources = new Map<string, string[]>();
    for (const terminal of adjacency.keys()) terminalSources.set(terminal, []);
    for (const source of this.#model.sources) {
      if (!this.#sources[source.id]) continue;
      const visited = new Set<string>();
      const queue = [source.terminal];
      for (let index = 0; index < queue.length; index++) {
        const terminal = queue[index];
        if (visited.has(terminal)) continue;
        visited.add(terminal);
        terminalSources.get(terminal)?.push(source.id);
        queue.push(...(adjacency.get(terminal) ?? []));
      }
    }
    return structuredClone({
      model: this.#model, devices: this.#devices, sources: this.#sources,
      connectivity: Object.fromEntries(this.#model.assets.map(asset => {
        const terminals = Object.fromEntries(asset.terminals.map(t => [t, terminalSources.get(t) ?? []]));
        return [asset.id, { terminalSources: terminals, sourceIds: [...new Set(Object.values(terminals).flat())].sort() }];
      })),
    });
  }
}
