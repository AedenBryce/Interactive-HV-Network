import { modelSchema } from './model';
import type { NetworkModel, SourceStates, DeviceStates } from './model';
import { buildGraph, evaluateSources } from './connectivity';
import type { Connectivity, SourcePath } from './connectivity';
import { evaluateEarths } from './earth';
import type { EarthConnectivity, SourceEarthConflict } from './earth';
import { evaluateInterlocks } from './interlocks';
import type { SwitchingStatus } from './interlocks';
import { evaluateUncertainty } from './uncertainty';
import type { UncertaintyConnectivity, ConnectionResult } from './uncertainty';
import { scenarioSchema, canonicalModelPackage } from './scenario';
import type { ScenarioFile } from './scenario';
import { breakerCommandSchema, isBreakerState } from './mechanisms';
import type { BreakerCommand, BreakerState } from './mechanisms';

export type AssetConnectivity = Connectivity & EarthConnectivity & UncertaintyConnectivity;
export type SessionChange =
  | { kind: 'device'; assetId: string; from: string | null; to: string }
  | { kind: 'breaker'; assetId: string; command: BreakerCommand; from: BreakerState; to: BreakerState }
  | { kind: 'source'; sourceId: string; from: boolean | null; to: boolean };
export type SessionAction = SessionChange & { id: number };
type ScenarioStates = { devices: DeviceStates; sources: SourceStates };
type HistoryEntry = { action: SessionAction; before: ScenarioStates };

export type SessionSnapshot = {
  model: NetworkModel;
  mode: 'exploration' | 'view-only';
  currentModel: { id: string; version: string; name: string };
  devices: DeviceStates;
  sources: SourceStates;
  connectivity: Record<string, AssetConnectivity>;
  impact: Impact[];
  conflicts: SourceEarthConflict[];
  possibleConflicts: SourceEarthConflict[];
  switching: Record<string, SwitchingStatus>;
  connectionResults: Record<string, ConnectionResult>;
  history: SessionAction[];
  canUndo: boolean;
};
export type Impact = { assetId: string; connectivityChanged: boolean; routesChanged: boolean; before: AssetConnectivity; after: AssetConnectivity };
export type ActionResult = { ok: true } | { ok: false; error: string };
const viewOnlyReason = 'View-only scenario: electrical state changes, undo and reset are disabled.';

export class SimulationSession {
  #model: NetworkModel;
  #currentModel: NetworkModel;
  #mode: 'exploration' | 'view-only' = 'exploration';
  #devices: DeviceStates;
  #sources: SourceStates;
  #impact: Impact[] = [];
  #history: HistoryEntry[] = [];
  #nextActionId = 1;
  #packages = new Map<string, string>();

  constructor(model: unknown) {
    this.#model = modelSchema.parse(model);
    this.#currentModel = this.#model;
    this.#registerPackage(this.#model);
    this.#devices = structuredClone(this.#model.starting.devices);
    this.#sources = { ...this.#model.starting.sources };
  }

  loadModel(input: unknown): ActionResult {
    const result = modelSchema.safeParse(input);
    if (!result.success) return { ok: false, error: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') };
    const registered = this.#registerPackage(result.data);
    if (!registered.ok) return registered;
    this.#model = result.data;
    this.#currentModel = result.data;
    this.#mode = 'exploration';
    this.#devices = structuredClone(result.data.starting.devices);
    this.#sources = { ...result.data.starting.sources };
    this.#impact = [];
    this.#history = [];
    this.#nextActionId = 1;
    return { ok: true };
  }

  saveScenario(): ScenarioFile {
    return structuredClone({ formatVersion: this.#model.assets.some(asset => asset.removableBreaker) ? 2 : 1, modelVersion: this.#model.version, model: this.#model, devices: this.#devices, sources: this.#sources });
  }

  loadScenario(input: unknown): ActionResult {
    const result = scenarioSchema.safeParse(input);
    if (!result.success) return { ok: false, error: result.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('\n') };
    const registered = this.#registerPackage(result.data.model);
    if (!registered.ok) return registered;
    this.#model = result.data.model;
    this.#mode = this.#model.id === this.#currentModel.id && this.#model.version === this.#currentModel.version ? 'exploration' : 'view-only';
    this.#devices = structuredClone(result.data.devices);
    this.#sources = { ...result.data.sources };
    this.#impact = [];
    this.#history = [];
    this.#nextActionId = 1;
    return { ok: true };
  }

  #registerPackage(model: NetworkModel): ActionResult {
    const key = JSON.stringify([model.id, model.version]);
    const fingerprint = canonicalModelPackage(model);
    const known = this.#packages.get(key);
    if (known !== undefined && known !== fingerprint) return { ok: false, error: `Model packages are immutable: ${model.id} ${model.version} differs from a previously loaded package. Use a new version.` };
    this.#packages.set(key, fingerprint);
    return { ok: true };
  }

  changeDevice(assetId: string, position: string | BreakerCommand): ActionResult {
    if (this.#mode === 'view-only') return { ok: false, error: viewOnlyReason };
    const asset = this.#model.assets.find(asset => asset.id === assetId);
    if (typeof position !== 'string') {
      const parsed = breakerCommandSchema.safeParse(position); const state = this.#devices[assetId];
      if (!asset?.removableBreaker || !parsed.success || !isBreakerState(state)) return { ok: false, error: `Unsupported independent breaker command for ${assetId}.` };
      const command = parsed.data;
      const option = evaluateInterlocks(this.#model, this.#devices, this.#sources)[assetId].actions!.find(action => action.command.kind === command.kind && action.command.value === command.value)!;
      if (!option.allowed) return { ok: false, error: option.reason ?? 'Breaker action blocked.' };
      if (state[command.kind] === command.value) return { ok: true };
      const next = { ...state, [command.kind]: command.value };
      this.#acceptChange({ kind: 'breaker', assetId, command, from: structuredClone(state), to: structuredClone(next) }, () => { this.#devices[assetId] = next; });
      return { ok: true };
    }
    if (!asset?.positions.some(state => state.id === position)) {
      return { ok: false, error: `Unsupported position ${position} for ${assetId}.` };
    }
    const option = evaluateInterlocks(this.#model, this.#devices, this.#sources)[assetId].positions.find(option => option.id === position)!;
    if (!option.allowed) return { ok: false, error: option.reason ?? 'Switching is blocked by the represented interlock.' };
    if (this.#devices[assetId] === position) return { ok: true };
    const from = this.#devices[assetId];
    if (isBreakerState(from)) return { ok: false, error: `Unsupported discrete position for removable breaker ${assetId}.` };
    this.#acceptChange({ kind: 'device', assetId, from, to: position }, () => { this.#devices[assetId] = position; });
    return { ok: true };
  }

  changeSource(sourceId: string, enabled: boolean): ActionResult {
    if (this.#mode === 'view-only') return { ok: false, error: viewOnlyReason };
    if (!this.#model.sources.some(source => source.id === sourceId) || typeof enabled !== 'boolean') return { ok: false, error: `Unknown source or unsupported availability: ${sourceId}.` };
    if (this.#sources[sourceId] === enabled) return { ok: true };
    this.#acceptChange({ kind: 'source', sourceId, from: this.#sources[sourceId], to: enabled }, () => { this.#sources[sourceId] = enabled; });
    return { ok: true };
  }

  #acceptChange(change: SessionChange, apply: () => void) {
    const before = this.snapshot().connectivity;
    this.#history.push({ action: { ...change, id: this.#nextActionId++ }, before: { devices: structuredClone(this.#devices), sources: { ...this.#sources } } });
    apply();
    this.#recordImpact(before);
  }

  undo(): ActionResult {
    if (this.#mode === 'view-only') return { ok: false, error: viewOnlyReason };
    const previous = this.#history.at(-1);
    if (!previous) return { ok: false, error: 'No accepted action is available to undo.' };
    const before = this.snapshot().connectivity;
    this.#devices = structuredClone(previous.before.devices);
    this.#sources = { ...previous.before.sources };
    this.#history.pop();
    this.#recordImpact(before);
    return { ok: true };
  }

  reset(): ActionResult {
    if (this.#mode === 'view-only') return { ok: false, error: viewOnlyReason };
    const before = this.snapshot().connectivity;
    this.#devices = structuredClone(this.#model.starting.devices);
    this.#sources = { ...this.#model.starting.sources };
    this.#history = [];
    this.#nextActionId = 1;
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
      const classification = (result: AssetConnectivity) => [result.sourceStatus, result.earthStatus, result.conflictSourceIds.length > 0 ? 'conflict' : result.possibleConflictSourceIds.length > 0 ? 'unconfirmed' : 'none'];
      const explanation = (result: AssetConnectivity) => [result.terminalSources, result.terminalEarths, result.conflictSourceIds, result.routeEdgeIds, result.earthRouteEdgeIds, result.possibleSourceIds, result.possibleEarthIds, result.sourceBoundaryIds, result.earthBoundaryIds, result.hasSourceUncertainty, result.hasEarthUncertainty];
      const connectivityChanged = JSON.stringify(classification(before[asset.id])) !== JSON.stringify(classification(after[asset.id]));
      const routesChanged = JSON.stringify(explanation(before[asset.id])) !== JSON.stringify(explanation(after[asset.id]));
      return connectivityChanged || routesChanged ? [{ assetId: asset.id, connectivityChanged, routesChanged, before: before[asset.id], after: after[asset.id] }] : [];
    });
  }

  snapshot(): SessionSnapshot {
    const graph = buildGraph(this.#model, this.#devices);
    const earthGraph = buildGraph(this.#model, this.#devices, { channel: 'earth' });
    const sourceConnectivity = evaluateSources(this.#model, graph, this.#sources);
    const earths = evaluateEarths(this.#model, earthGraph, this.#sources, { sourceGraph: graph });
    const definite = Object.fromEntries(this.#model.assets.map(asset => [asset.id, { ...sourceConnectivity[asset.id], ...earths.connectivity[asset.id] }]));
    const uncertainty = evaluateUncertainty(this.#model, this.#devices, this.#sources, definite, earths.conflicts);
    const switching = evaluateInterlocks(this.#model, this.#devices, this.#sources);
    if (this.#mode === 'view-only') for (const status of Object.values(switching)) {
      status.positions = status.positions.map(position => ({ ...position, allowed: false, reason: viewOnlyReason }));
      if (status.actions) status.actions = status.actions.map(action => ({ ...action, allowed: false, reason: viewOnlyReason }));
    }
    return structuredClone({
      model: this.#model, devices: this.#devices, sources: this.#sources,
      mode: this.#mode,
      currentModel: { id: this.#currentModel.id, version: this.#currentModel.version, name: this.#currentModel.name },
      connectivity: Object.fromEntries(this.#model.assets.map(asset => [asset.id, { ...definite[asset.id], ...uncertainty.connectivity[asset.id] }])),
      impact: this.#impact,
      conflicts: earths.conflicts,
      possibleConflicts: uncertainty.possibleConflicts,
      switching,
      connectionResults: uncertainty.connectionResults,
      history: this.#history.map(entry => entry.action),
      canUndo: this.#mode === 'exploration' && this.#history.length > 0,
    });
  }
}
