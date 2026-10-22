import { z } from 'zod';
import { interlockSchema, validateInterlocks } from './interlock-model';
import { claimFields, evidenceRecordSchema, reviewRecordSchema } from './evidence';
import { presentationSchema, validatePresentation } from './presentation';
import { deviceStateSchema, getRemovableMechanism, isIndependentState } from './mechanisms';

const id = z.string().min(1);
const pair = z.tuple([id, id]);
const assetSchema = z.strictObject({
  ...claimFields,
  id, label: z.string().min(1),
  aliases: z.array(id).optional(),
  kind: z.enum(['source', 'breaker', 'contactor', 'disconnector', 'transformer', 'bus', 'earth-switch', 'interface']),
  terminals: z.array(id).min(1),
  conductivePairs: z.array(pair),
  sourcePairs: z.array(pair).optional(),
  sourceArcs: z.array(z.strictObject({ id, from: id, to: id, supportScope: z.literal('relationship').optional(), ...claimFields })).optional(),
  earthPairs: z.array(pair).optional(),
  removableBreaker: z.strictObject({ mainPair: pair }).optional(),
  removableContactor: z.strictObject({ mainPair: pair }).optional(),
  positions: z.array(z.strictObject({ id, label: z.string().min(1), pairs: z.array(pair), sourcePairs: z.array(pair).optional(), earthPairs: z.array(pair).optional() })),
});

export const modelSchema = z.strictObject({
  id, version: z.string().min(1), name: z.string().min(1), synthetic: z.boolean(),
  assets: z.array(assetSchema).min(1),
  connections: z.array(z.strictObject({ id, from: id, to: id, ...claimFields })),
  sources: z.array(z.strictObject({ id, assetId: id, terminal: id, label: z.string().min(1), ...claimFields })),
  earths: z.array(z.strictObject({ id, label: z.string().min(1), terminal: id, groupId: id.optional(), ...claimFields })).optional(),
  evidence: z.array(evidenceRecordSchema).optional(),
  reviews: z.array(reviewRecordSchema).optional(),
  boundaries: z.array(z.strictObject({ id, label: id, terminal: id, sourceCoverage: z.enum(['unconfirmed', 'complete']), earthCoverage: z.enum(['unconfirmed', 'complete']), ...claimFields })).optional(),
  interlocks: interlockSchema.optional(),
  presentation: presentationSchema.optional(),
  starting: z.strictObject({ devices: z.record(id, deviceStateSchema), sources: z.record(id, z.boolean().nullable()) }),
}).superRefine((model, context) => {
  const error = (message: string) => context.addIssue({ code: 'custom', message });
  validateInterlocks(model, error);
  validatePresentation(model, error);
  const unique = (values: string[], label: string) => {
    if (new Set(values).size !== values.length) error(`Duplicate ${label}.`);
  };
  const terminals = model.assets.flatMap(a => a.terminals);
  unique(model.assets.map(a => a.id), 'asset identity');
  unique(terminals, 'terminal identity');
  unique(model.connections.map(c => c.id), 'connection identity');
  unique(model.assets.flatMap(asset => (asset.sourceArcs ?? []).map(arc => arc.id)), 'source arc identity');
  unique(model.sources.map(s => s.id), 'source identity');
  unique((model.earths ?? []).map(earth => earth.id), 'earth identity');
  unique((model.earths ?? []).map(earth => earth.terminal), 'earth termination');
  unique((model.evidence ?? []).map(record => record.id), 'evidence identity');
  unique((model.reviews ?? []).map(record => record.id), 'review identity');
  unique((model.boundaries ?? []).map(boundary => boundary.id), 'boundary identity');
  for (const boundary of model.boundaries ?? []) if (!terminals.includes(boundary.terminal)) error(`Boundary ${boundary.id} references missing terminal ${boundary.terminal}.`);
  for (const claim of [...model.assets, ...model.assets.flatMap(asset => asset.sourceArcs ?? []), ...model.connections, ...model.sources, ...(model.earths ?? []), ...(model.boundaries ?? [])]) {
    for (const evidenceId of claim.evidenceIds ?? []) if (!model.evidence?.some(record => record.id === evidenceId)) error(`${claim.id} references missing evidence ${evidenceId}.`);
    for (const reviewId of claim.reviewIds ?? []) if (!model.reviews?.some(record => record.id === reviewId)) error(`${claim.id} references missing review ${reviewId}.`);
    if (!model.synthetic && (claim.knowledge === 'supported' || claim.knowledge === 'owner-confirmed') && !claim.evidenceIds?.length) error(`Supported fact ${claim.id} requires evidence.`);
    if (claim.knowledge === 'supported' && !claim.evidenceIds?.some(evidenceId => model.evidence?.some(record => record.id === evidenceId && ((record.status === 'supported' && record.references.length > 0) || record.status === 'owner-confirmed')))) error(`Fact ${claim.id} has no supporting evidence with a source reference or owner confirmation.`);
    if (claim.knowledge === 'owner-confirmed' && !claim.evidenceIds?.some(evidenceId => model.evidence?.some(record => record.id === evidenceId && record.status === 'owner-confirmed'))) error(`Owner-confirmed fact ${claim.id} requires an owner confirmation record.`);
  }
  for (const review of model.reviews ?? []) for (const evidenceId of review.evidenceIds) if (!model.evidence?.some(record => record.id === evidenceId)) error(`Review ${review.id} references missing evidence ${evidenceId}.`);
  for (const earth of model.earths ?? []) {
    if (!terminals.includes(earth.terminal)) error(`Earth ${earth.id} references missing terminal ${earth.terminal}.`);
  }
  for (const connection of model.connections) {
    for (const terminal of [connection.from, connection.to]) {
      if (!terminals.includes(terminal)) error(`Connection ${connection.id} references missing terminal ${terminal}.`);
    }
  }
  for (const asset of model.assets) {
    const mechanism = getRemovableMechanism(asset);
    if (asset.removableBreaker && asset.removableContactor) error(`Asset ${asset.id} cannot declare both removable breaker and contactor mechanisms.`);
    if (asset.sourceArcs !== undefined && (asset.positions.length > 0 || mechanism)) error(`Source arcs in ${asset.id} require a fixed asset without positions or a removable mechanism.`);
    for (const arc of asset.sourceArcs ?? []) {
      if (arc.from === arc.to || !asset.terminals.includes(arc.from) || !asset.terminals.includes(arc.to)) error(`Source arc ${arc.id} requires two distinct owned terminals in ${asset.id}.`);
      if (arc.supportScope === 'relationship' && (arc.knowledge === undefined || !arc.evidenceIds?.length)) error(`Relationship-scoped source arc ${arc.id} requires explicit knowledge and linked evidence.`);
    }
    const state = model.starting.devices[asset.id];
    if (mechanism) {
      if (asset.kind !== mechanism.kind || asset.positions.length) error(`Removable ${mechanism.kind} ${asset.id} requires ${mechanism.kind} kind and no discrete positions.`);
      if (!isIndependentState(state)) error(`Removable ${mechanism.kind} ${asset.id} requires explicit nullable contact and racking starting states.`);
      const [a, b] = mechanism.mainPair;
      if (a === b || !asset.terminals.includes(a) || !asset.terminals.includes(b)) error(`Removable ${mechanism.kind} ${asset.id} requires two distinct owned main terminals.`);
      if ([...asset.conductivePairs, ...(asset.sourcePairs ?? []), ...(asset.earthPairs ?? [])].some(([x, y]) => x === a && y === b || x === b && y === a)) error(`Removable ${mechanism.kind} ${asset.id} main pair cannot also be fixed conducting.`);
    } else if (isIndependentState(state)) error(`Discrete asset ${asset.id} cannot use independent contact/racking states.`);
    unique(asset.positions.map(p => p.id), `position in ${asset.id}`);
    for (const [a, b] of [...asset.conductivePairs, ...(asset.sourcePairs ?? []), ...(asset.earthPairs ?? []), ...asset.positions.flatMap(p => [...p.pairs, ...(p.sourcePairs ?? []), ...(p.earthPairs ?? [])])]) {
      if (!asset.terminals.includes(a) || !asset.terminals.includes(b)) error(`Relationship in ${asset.id} references an external or missing terminal.`);
    }
    if (!model.synthetic && asset.kind === 'transformer') {
      if ((asset.sourcePairs === undefined && asset.sourceArcs === undefined) || asset.earthPairs === undefined || asset.positions.some(position => position.sourcePairs === undefined || position.earthPairs === undefined)) error(`Transformer ${asset.id} requires explicit source and earth relationships.`);
      if (asset.conductivePairs.length || asset.positions.some(position => position.pairs.length)) error(`Transformer ${asset.id} cannot use shared conductive relationships; specify source and earth relationships separately.`);
    }
    if (asset.positions.length && (!Object.hasOwn(model.starting.devices, asset.id) || (model.starting.devices[asset.id] !== null && !asset.positions.some(p => p.id === model.starting.devices[asset.id])))) error(`Missing or unsupported starting position for ${asset.id}.`);
  }
  for (const deviceId of Object.keys(model.starting.devices)) {
    if (!model.assets.some(a => a.id === deviceId && (a.positions.length || getRemovableMechanism(a)))) error(`Starting configuration references unknown device ${deviceId}.`);
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
export type SourceStates = NetworkModel['starting']['sources'];
export type DeviceStates = NetworkModel['starting']['devices'];
