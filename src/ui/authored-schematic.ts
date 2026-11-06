import type { NetworkModel } from '../session/model';
import type { DiagramLayout, DiagramView } from '../session/presentation';
import type { AssetLabel, Point } from './diagram-geometry';
import { healthyFuseLabel, isFuse, isMotor, isMotorJunction } from './equipment-appearance';
import { isObsoleteReference } from './obsolete-references';

/** A drawing owner, independent of electrical graph traversal. */
export type AuthoredModule = {
  id: string;
  label: string;
  origin: Point;
  assetIds: string[];
  layout: DiagramLayout;
  labels: Record<string, AssetLabel>;
  routes: Record<string, Point[]>;
  frame?: [number, number, number, number];
  hiddenAssetIds?: string[];
};

export type AuthoredSchematic = {
  schemaVersion: 1;
  modelId: string;
  modelVersion: string;
  topologyFingerprint: string;
  modelFingerprint?: string;
  status?: string;
  identities: { assets: { id: string; terminals: string[] }[]; connections: { id: string; from: string; to: string }[] };
  modules: AuthoredModule[];
  /** Global paths through reserved corridors, keyed by real connection ID. */
  externalRoutes: Record<string, Point[]>;
};

const translated = (point: Point, origin: Point): Point => [point[0] + origin[0], point[1] + origin[1]];
const same = (a: Point, b: Point) => a[0] === b[0] && a[1] === b[1];

/** Rigid composition only: no placement search, graph traversal or rerouting. */
export function composeAuthoredSchematic(model: NetworkModel, schematic: AuthoredSchematic) {
  if (schematic.schemaVersion !== 1 || schematic.modelId !== model.id || schematic.modelVersion !== model.version) {
    throw new Error('Authored schematic does not match this model/version.');
  }
  const byId = new Map(model.assets.map(asset => [asset.id, asset]));
  const identities = {
    assets: model.assets.map(({ id, terminals }) => ({ id, terminals })).sort((a, b) => a.id.localeCompare(b.id)),
    connections: model.connections.map(({ id, from, to }) => ({ id, from, to })).sort((a, b) => a.id.localeCompare(b.id)),
  };
  if (JSON.stringify(identities) !== JSON.stringify(schematic.identities)) throw new Error('Authored schematic topology differs from the model.');
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const groupByAsset = new Map<string, string>();
  const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, busSpans: {} };
  const labels = new Map<string, AssetLabel>();
  const routes = new Map<string, Point[]>();
  const hiddenIds = new Set<string>();
  const panels = [] as { id: string; label: string; title: string; overviewTitle: string; x: number; y: number; width: number; height: number; assetIds: string[]; memberAssetIds: string[] }[];
  const addRoute = (id: string, points: Point[]) => {
    if (routes.has(id)) throw new Error(`Connection drawn twice: ${id}`);
    routes.set(id, points);
  };
  if (new Set(schematic.modules.map(module => module.id)).size !== schematic.modules.length) throw new Error('Duplicate drawing group.');
  for (const module of schematic.modules) {
    if (Object.keys(module.layout.assets).some(id => !module.assetIds.includes(id))) throw new Error(`Foreign local anchor in ${module.id}`);
    for (const id of module.assetIds) {
      const asset = byId.get(id);
      if (!asset || groupByAsset.has(id)) throw new Error(`Unknown or multiply owned asset: ${id}`);
      groupByAsset.set(id, module.id);
      const anchor = module.layout.assets[id];
      if (!anchor) throw new Error(`Missing local anchor: ${id}`);
      layout.assets[id] = translated(anchor, module.origin);
      for (const terminal of asset.terminals) {
        const point = module.layout.terminals[terminal];
        if (!point) throw new Error(`Missing local terminal: ${terminal}`);
        layout.terminals[terminal] = translated(point, module.origin);
      }
      const label = module.labels[id];
      if (!label && !module.hiddenAssetIds?.includes(id)) throw new Error(`Missing local label: ${id}`);
      if (label) {
        const lines = isFuse(asset) ? healthyFuseLabel(asset).split('\n') : label.lines;
        labels.set(id, { ...label, x: label.x + module.origin[0], y: label.y + module.origin[1], lines,
          ...(isFuse(asset) ? { width: Math.min(label.width, Math.max(200, ...lines.map(line => line.length * 20 + 36))), height: Math.min(label.height, lines.length * 35 + 40) } : {}) });
      }
      if (module.layout.rotations?.[id] !== undefined) layout.rotations![id] = module.layout.rotations[id];
      if (module.layout.busSpans?.[id] !== undefined) layout.busSpans![id] = module.layout.busSpans[id];
    }
    for (const id of module.hiddenAssetIds ?? []) {
      if (!module.assetIds.includes(id)) throw new Error(`Hidden asset belongs to another group: ${id}`);
      hiddenIds.add(id);
    }
    for (const [id, points] of Object.entries(module.routes)) {
      const link = model.connections.find(connection => connection.id === id);
      if (!link || !module.assetIds.includes(owners.get(link.from)!) || !module.assetIds.includes(owners.get(link.to)!)) throw new Error(`Foreign internal route in ${module.id}: ${id}`);
      addRoute(id, points.map(point => translated(point, module.origin)));
    }
    if (module.frame) {
      const [x, y, width, height] = module.frame;
      panels.push({ id: module.id, label: module.label, title: module.label, overviewTitle: module.label,
        x: x + module.origin[0], y: y + module.origin[1], width, height,
        assetIds: [...module.assetIds], memberAssetIds: [...module.assetIds] });
    }
  }
  if (groupByAsset.size !== model.assets.length) throw new Error(`Unowned assets: ${model.assets.filter(asset => !groupByAsset.has(asset.id)).map(asset => asset.id).join(', ')}`);
  for (const [id, points] of Object.entries(schematic.externalRoutes)) addRoute(id, points.map(point => [...point] as Point));
  const isAttached = (terminal: string, point: Point) => {
    if (same(layout.terminals[terminal], point)) return true;
    const asset = byId.get(owners.get(terminal)!);
    if (asset?.kind !== 'bus') return false;
    const [x, y] = layout.assets[asset.id];
    const span = layout.busSpans?.[asset.id] ?? 60;
    return layout.rotations?.[asset.id] === 90
      ? point[1] === y && Math.abs(point[0] - x) <= span / 2
      : point[0] === x && Math.abs(point[1] - y) <= span / 2;
  };
  for (const link of model.connections) {
    const points = routes.get(link.id);
    if (!points || points.length < 2 || !isAttached(link.from, points[0]) || !isAttached(link.to, points.at(-1)!)) throw new Error(`Missing or detached connection: ${link.id}`);
    if (points.some(point => point.length !== 2 || !point.every(Number.isFinite))) throw new Error(`Invalid coordinates: ${link.id}`);
    if (points.some((point, index) => index > 0 && point[0] !== points[index - 1][0] && point[1] !== points[index - 1][1])) throw new Error(`Diagonal connection: ${link.id}`);
  }
  if (routes.size !== model.connections.length) throw new Error('Authored schematic contains unknown connections.');
  const inlineIds = new Set<string>();
  // Grouped earth functions keep their identities and electrical paths, but
  // their operating symbol is incorporated into the parent's selector glyph.
  for (const main of model.assets) if (main.earthAssembly) {
    hiddenIds.add(main.earthAssembly.earthAssetId);
    labels.delete(main.earthAssembly.earthAssetId);
  }
  // Motor common conductors are real shared terminals, drawn as a small
  // junction dot instead of a separate arrow symbol and floating asset label.
  // Pure two-wire view handoffs have no independent operating symbol.
  for (const asset of model.assets) {
    if (isObsoleteReference(model, asset)) {
      hiddenIds.add(asset.id);
      labels.delete(asset.id);
    } else if (isMotorJunction(asset)) {
      inlineIds.add(asset.id);
      const [x, y] = layout.assets[asset.id];
      labels.set(asset.id, { x, y, width: 0, height: 0, lines: [] });
    } else if (!isMotor(asset) && asset.kind === 'interface' && asset.terminals.length === 1 && !asset.positions.length && !asset.conductivePairs.length) {
      const degree = model.connections.filter(link => link.from === asset.terminals[0] || link.to === asset.terminals[0]).length;
      if (degree >= 3) inlineIds.add(asset.id);
      else if (degree === 2 && asset.id.includes(':interface')) { hiddenIds.add(asset.id); labels.delete(asset.id); }
    }
  }
  const points = [...Object.values(layout.assets), ...[...routes.values()].flat()];
  const xs = [...points.map(point => point[0]), ...[...labels.values()].flatMap(label => [label.x, label.x + label.width]), ...panels.flatMap(panel => [panel.x, panel.x + panel.width])];
  const ys = [...points.map(point => point[1]), ...[...labels.values()].flatMap(label => [label.y, label.y + label.height]), ...panels.flatMap(panel => [panel.y, panel.y + panel.height])];
  const left = Math.min(...xs) - 100; const top = Math.min(...ys) - 100;
  const view: DiagramView = { id: 'authored-network', label: 'Whole network · single-line diagram', assetIds: model.assets.map(asset => asset.id), layout,
    bounds: [left, top, Math.max(...xs) - left + 100, Math.max(...ys) - top + 100] };
  return { view, assets: model.assets, connections: model.connections, owners, groupByAsset, labels, routes, panels, hiddenIds, inlineIds, treeEdgeIds: new Set<string>() };
}
