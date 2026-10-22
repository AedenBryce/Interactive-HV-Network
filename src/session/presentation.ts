import { z } from 'zod';

const id = z.string().min(1);
const coordinate = z.number().finite();
const point = z.tuple([coordinate, coordinate]);
export const presentationSchema = z.strictObject({
  overviewId: id,
  views: z.array(z.strictObject({
    id, label: id, assetIds: z.array(id).min(1),
    bounds: z.tuple([coordinate, coordinate, z.number().positive().finite(), z.number().positive().finite()]),
    layout: z.strictObject({
      assets: z.record(id, point), terminals: z.record(id, point),
      rotations: z.record(id, coordinate).optional(), labelOffsets: z.record(id, point).optional(),
      bends: z.record(id, z.array(point)).optional(),
    }),
    boundaries: z.array(z.strictObject({ connectionId: id, remoteAssetId: id, targetViewId: id, position: point })).optional(),
  })).min(1),
});

export type DiagramPresentation = z.infer<typeof presentationSchema>;
export type DiagramView = DiagramPresentation['views'][number];
export type DiagramLayout = DiagramView['layout'];
export type DiagramBoundary = NonNullable<DiagramView['boundaries']>[number];

type PresentedModel = {
  assets: { id: string; terminals: string[] }[];
  connections: { id: string; from: string; to: string }[];
  presentation?: DiagramPresentation;
};

// Coordinates describe organisation only. Electrical connectivity comes from the model.
export function validatePresentation(model: PresentedModel, error: (message: string) => void) {
  const presentation = model.presentation;
  if (!presentation) return;
  const ids = presentation.views.map(view => view.id);
  if (new Set(ids).size !== ids.length) error('Duplicate diagram view identity.');
  if (!ids.includes(presentation.overviewId)) error('Diagram overview references a missing view.');
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const asset of model.assets) if (!presentation.views.some(view => view.assetIds.includes(asset.id))) error(`Asset ${asset.id} has no diagram view.`);
  for (const view of presentation.views) {
    const fail = (message: string) => error(`Diagram view ${view.id}: ${message}`);
    if (new Set(view.assetIds).size !== view.assetIds.length) fail('duplicate visible asset.');
    for (const assetId of view.assetIds) {
      const asset = model.assets.find(asset => asset.id === assetId);
      if (!asset || !view.layout.assets[assetId]) fail(`missing asset or coordinates for ${assetId}.`);
      for (const terminal of asset?.terminals ?? []) if (!view.layout.terminals[terminal]) fail(`missing terminal coordinates for ${terminal}.`);
    }
    for (const key of Object.keys(view.layout.assets)) if (!model.assets.some(asset => asset.id === key)) fail(`unknown layout asset ${key}.`);
    for (const key of Object.keys(view.layout.terminals)) if (!owners.has(key)) fail(`unknown layout terminal ${key}.`);
    for (const connection of model.connections) {
      if ((view.assetIds.includes(owners.get(connection.from)!) && view.assetIds.includes(owners.get(connection.to)!)) || view.boundaries?.some(boundary => boundary.connectionId === connection.id)) {
        if (!view.layout.terminals[connection.from] || !view.layout.terminals[connection.to]) fail(`missing connection endpoint coordinates for ${connection.id}.`);
      }
    }
    for (const key of Object.keys(view.layout.bends ?? {})) if (!model.connections.some(connection => connection.id === key)) fail(`unknown bend connection ${key}.`);
    for (const boundary of view.boundaries ?? []) {
      const connection = model.connections.find(connection => connection.id === boundary.connectionId);
      const target = presentation.views.find(target => target.id === boundary.targetViewId);
      if (!connection || !target?.assetIds.includes(boundary.remoteAssetId)) fail(`invalid boundary ${boundary.connectionId}.`);
      else {
        const endpoints = [owners.get(connection.from)!, owners.get(connection.to)!];
        if (!endpoints.includes(boundary.remoteAssetId) || !endpoints.some(owner => view.assetIds.includes(owner))) fail(`boundary ${boundary.connectionId} does not join the displayed assets.`);
      }
    }
  }
}

export function fallbackPresentation(model: PresentedModel): DiagramPresentation {
  const assets: DiagramLayout['assets'] = {};
  const terminals: DiagramLayout['terminals'] = {};
  for (const [index, asset] of model.assets.entries()) {
    const x = 100 + (index % 5) * 200;
    const y = 100 + Math.floor(index / 5) * 200;
    assets[asset.id] = [x, y];
    asset.terminals.forEach((terminal, terminalIndex) => { terminals[terminal] = [x + (terminalIndex - (asset.terminals.length - 1) / 2) * 30, y]; });
  }
  return { overviewId: 'overview', views: [{ id: 'overview', label: 'Network overview', assetIds: model.assets.map(asset => asset.id), layout: { assets, terminals }, bounds: [0, 0, 1100, Math.max(300, Math.ceil(model.assets.length / 5) * 200)] }] };
}
