import { z } from 'zod';

const id = z.string().min(1);
const pair = z.tuple([id, id]);
const assetSchema = z.strictObject({
  id, label: z.string().min(1),
  kind: z.enum(['source', 'breaker', 'disconnector', 'transformer', 'bus', 'earth-switch']),
  terminals: z.array(id).min(1),
  conductivePairs: z.array(pair),
  positions: z.array(z.strictObject({ id, label: z.string().min(1), pairs: z.array(pair) })),
});

export const modelSchema = z.strictObject({
  id, version: z.string().min(1), name: z.string().min(1), synthetic: z.boolean(),
  assets: z.array(assetSchema).min(1),
  connections: z.array(z.strictObject({ id, from: id, to: id })),
  sources: z.array(z.strictObject({ id, assetId: id, terminal: id, label: z.string().min(1) })),
  earths: z.array(z.strictObject({ id, label: z.string().min(1), terminal: id, groupId: id.optional() })).optional(),
  starting: z.strictObject({ devices: z.record(id, id), sources: z.record(id, z.boolean()) }),
}).superRefine((model, context) => {
  const error = (message: string) => context.addIssue({ code: 'custom', message });
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) error(`Duplicate ${label}.`);
  };
  const terminals = model.assets.flatMap(a => a.terminals);
  unique(model.assets.map(a => a.id), 'asset identity');
  unique(terminals, 'terminal identity');
  unique(model.connections.map(c => c.id), 'connection identity');
  unique(model.sources.map(s => s.id), 'source identity');
  unique((model.earths ?? []).map(earth => earth.id), 'earth identity');
  unique((model.earths ?? []).map(earth => earth.terminal), 'earth termination');
  for (const earth of model.earths ?? []) {
    if (!terminals.includes(earth.terminal)) error(`Earth ${earth.id} references missing terminal ${earth.terminal}.`);
  }
  for (const connection of model.connections) {
    for (const terminal of [connection.from, connection.to]) {
      if (!terminals.includes(terminal)) error(`Connection ${connection.id} references missing terminal ${terminal}.`);
    }
  }
  for (const asset of model.assets) {
    unique(asset.positions.map(p => p.id), `position in ${asset.id}`);
    for (const [a, b] of [...asset.conductivePairs, ...asset.positions.flatMap(p => p.pairs)]) {
      if (!asset.terminals.includes(a) || !asset.terminals.includes(b)) error(`Relationship in ${asset.id} references an external or missing terminal.`);
    }
    if (asset.positions.length && !asset.positions.some(p => p.id === model.starting.devices[asset.id])) error(`Missing or unsupported starting position for ${asset.id}.`);
  }
  for (const deviceId of Object.keys(model.starting.devices)) {
    if (!model.assets.some(a => a.id === deviceId && a.positions.length)) error(`Starting configuration references unknown device ${deviceId}.`);
  }
  for (const source of model.sources) {
    if (!model.assets.find(a => a.id === source.assetId)?.terminals.includes(source.terminal)) error(`Source ${source.id} references an external or missing terminal.`);
    if (!Object.hasOwn(model.starting.sources, source.id)) error(`Missing starting availability for source ${source.id}.`);
  }
  for (const sourceId of Object.keys(model.starting.sources)) {
    if (!model.sources.some(s => s.id === sourceId)) error(`Starting configuration references unknown source ${sourceId}.`);
  }
});

export type NetworkModel = z.infer<typeof modelSchema>;
export type Asset = NetworkModel['assets'][number];
