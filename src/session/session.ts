import { modelSchema } from './model';
import type { NetworkModel } from './model';
import { buildGraph, evaluateSources } from './connectivity';
import type { Connectivity, SourcePath } from './connectivity';
import { evaluateEarths } from './earth';
import type { EarthConnectivity, SourceEarthConflict } from './earth';

export type AssetConnectivity = Connectivity & EarthConnectivity;

export type SessionSnapshot = {
  model: NetworkModel;
  devices: Record<string, string>;
  sources: Record<string, boolean>;
  connectivity: Record<string, AssetConnectivity>;
  impact: Impact[];
  conflicts: SourceEarthConflict[];
};
export type Impact = { assetId: string; connectivityChanged: boolean; routesChanged: boolean; before: AssetConnectivity; after: AssetConnectivity };
export type ActionResult = { ok: true } | { ok: false; error: string };

export class SimulationSession {
  #model: NetworkModel;
  #devices: Record<string, string>;
  #sources: Record<string, boolean>;
  #impact: Impact[] = [];

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
    this.#impact = [];
    return { ok: true };
  }

  changeDevice(assetId: string, position: string): ActionResult {
    const asset = this.#model.assets.find(asset => asset.id === assetId);
    if (!asset?.positions.some(state => state.id === position)) {
      return { ok: false, error: `Unsupported position ${position} for ${assetId}.` };
    }
    const before = this.snapshot().connectivity;
    this.#devices[assetId] = position;
    this.#recordImpact(before);
    return { ok: true };
  }

  changeSource(sourceId: string, enabled: boolean): ActionResult {
    if (!this.#model.sources.some(source => source.id === sourceId) || typeof enabled !== 'boolean') return { ok: false, error: `Unknown source or unsupported availability: ${sourceId}.` };
    const before = this.snapshot().connectivity;
    this.#sources[sourceId] = enabled;
    this.#recordImpact(before);
    return { ok: true };
  }

  trace(assetId: string): { ok: true; paths: SourcePath[] } | { ok: false; error: string } {
    if (!this.#model.assets.some(asset => asset.id === assetId)) return { ok: false, error: `Unknown asset ${assetId}.` };
    return { ok: true, paths: this.snapshot().connectivity[assetId].paths };
  }

  #recordImpact(before: Record<string, AssetConnectivity>) {
    const after = this.snapshot().connectivity;
    this.#impact = this.#model.assets.flatMap(asset => {
      const classification = (result: AssetConnectivity) => [result.sourceIds.length > 0, result.earthIds.length > 0, result.conflictSourceIds.length > 0];
      const explanation = (result: AssetConnectivity) => [result.terminalSources, result.terminalEarths, result.conflictSourceIds, result.routeEdgeIds];
      const connectivityChanged = JSON.stringify(classification(before[asset.id])) !== JSON.stringify(classification(after[asset.id]));
      const routesChanged = JSON.stringify(explanation(before[asset.id])) !== JSON.stringify(explanation(after[asset.id]));
      return connectivityChanged || routesChanged ? [{ assetId: asset.id, connectivityChanged, routesChanged, before: before[asset.id], after: after[asset.id] }] : [];
    });
  }

  snapshot(): SessionSnapshot {
    const graph = buildGraph(this.#model, this.#devices);
    const sourceConnectivity = evaluateSources(this.#model, graph, this.#sources);
    const earths = evaluateEarths(this.#model, graph, this.#sources);
    return structuredClone({
      model: this.#model, devices: this.#devices, sources: this.#sources,
      connectivity: Object.fromEntries(this.#model.assets.map(asset => [asset.id, { ...sourceConnectivity[asset.id], ...earths.connectivity[asset.id] }])),
      impact: this.#impact,
      conflicts: earths.conflicts,
    });
  }
}
