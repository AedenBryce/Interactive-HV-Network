import type { Asset, NetworkModel } from '../../session/model';
import type { InterlockCondition } from '../../session/interlocks';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

const feeders = [
  { name: 'tf11', label: 'TF11 · SB01 F4', prefix: 'station:sb01:f4', x: 150 },
  { name: 'tf12', label: 'TF12 · SB02 F1', prefix: 'station:sb02:f1', x: 570 },
  { name: 'tf04', label: 'TF04 · SB02 F4', prefix: 'station:sb02:f4', x: 990 },
] as const;
const scopeId = 'BATTERY-STATION-SCOPE';
const representationId = 'BATTERY-STATION-REPRESENTATION';
const unknownsId = 'BATTERY-STATION-UNKNOWNS';
const scopeAnswer = 'Not relevant for the scope of this tool. The only feeders from SB01 and SB02 that are required are the ones from TF11, TF12 and TF-04. That should be the battery limits.';
const cutAnswer = 'At its SB01/SB02 feeder breaker, retaining that feeder and transformer but excluding station buses, generators and other feeders';

export function withStationBatteryLimits(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === scopeId) || base.assets.some(asset => feeders.some(feeder => asset.id === `boundary:${feeder.name}`))) throw new Error('Station battery limits are already applied; review the input package before applying them again.');
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('Station battery limits require an existing presentation.');
  const previousPresentation = model.presentation;
  const removedAssets = new Set(model.assets.filter(asset => asset.id.startsWith('station:') && !feeders.some(feeder => asset.id.startsWith(`${feeder.prefix}:`))).map(asset => asset.id));
  const removedTerminals = new Set(model.assets.filter(asset => removedAssets.has(asset.id)).flatMap(asset => asset.terminals));
  const removedSources = new Set(model.sources.filter(source => removedAssets.has(source.assetId) || removedTerminals.has(source.terminal)).map(source => source.id));
  function removedDependencies(condition: InterlockCondition): string[] {
    if (condition.kind === 'device') return removedAssets.has(condition.assetId) ? [`device ${condition.assetId}`] : [];
    if (condition.kind === 'source') return removedSources.has(condition.sourceId) ? [`source ${condition.sourceId}`] : [];
    return condition.conditions.flatMap(removedDependencies);
  }
  for (const rule of model.interlocks?.rules ?? []) {
    if (removedAssets.has(rule.assetId)) continue;
    const dependencies = removedDependencies(rule.require);
    if (dependencies.length) throw new Error(`Station battery-limit review required: retained interlock ${rule.id} for ${rule.assetId} depends on removed ${dependencies.join(', ')}. No rule was weakened or remapped.`);
  }
  const removedConnections = model.connections.filter(connection => removedTerminals.has(connection.from) || removedTerminals.has(connection.to));
  model.assets = model.assets.filter(asset => !removedAssets.has(asset.id));
  model.connections = model.connections.filter(connection => !removedTerminals.has(connection.from) && !removedTerminals.has(connection.to));
  model.sources = model.sources.filter(source => !removedSources.has(source.id));
  model.earths = model.earths?.filter(earth => !removedTerminals.has(earth.terminal));
  model.boundaries = model.boundaries?.filter(boundary => !removedTerminals.has(boundary.terminal));
  model.starting.devices = Object.fromEntries(Object.entries(model.starting.devices).filter(([id]) => !removedAssets.has(id)));
  model.starting.sources = Object.fromEntries(Object.entries(model.starting.sources).filter(([id]) => !removedSources.has(id)));
  if (model.interlocks) {
    model.interlocks.reviews = model.interlocks.reviews.filter(review => !removedAssets.has(review.assetId));
    model.interlocks.rules = model.interlocks.rules.filter(rule => !removedAssets.has(rule.assetId));
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-22', decision: `${scopeAnswer}\n${cutAnswer}` };
  const ownerReference = { document: 'Project owner conversation', revision: '2026-10-22', clause: 'Exact station scope answer and explicit feeder-breaker cut answer; retained verbatim in confirmation.decision.' };
  (model.evidence ??= []).push(
    { id: scopeId, status: 'owner-confirmed', summary: 'Owner-defined physical representation scope: only SB01 F4/TF11, SB02 F1/TF12 and SB02 F4/TF04 begin at their feeder breakers and retain their transformers. Station buses, generators and other station feeders are outside this model. This is a scope decision, not an installed disconnection, source-availability, interlock or model-acceptance decision. Mine/camp disposition remains separate.', references: [ownerReference], confirmation },
    { id: representationId, status: 'provisional', summary: 'Inference: three abstract external-supply inputs at the retained feeder-breaker upstream terminals represent the owner-defined battery limits. They are not physical generator claims. Availability is null; outside source coupling, backfeed and independent earth coverage remain unconfirmed. No station bus, external tie or shared metallic earth is invented.', references: [ownerReference] },
  );
  (model.reviews ??= []).push(
    { id: scopeId, status: 'resolved', question: 'Which station feeders are within scope and where does each retained feeder begin? Resolution is confined to the model boundary.', evidenceIds: [scopeId], resolution: confirmation },
    { id: unknownsId, status: 'open', question: 'Confirm external supply availability, any coupling/backfeed outside the three battery limits, independent earth coverage, retained transformer source/earth policies and all actual positions/interlocks. Excluded station or mine/village routes are not declared disconnected. Mine/camp scope remains undecided here.', evidenceIds: [scopeId, representationId] },
  );
  const representation = { knowledge: 'provisional' as const, evidenceIds: [representationId, scopeId], reviewIds: [unknownsId] };
  for (const feeder of feeders) {
    const id = `boundary:${feeder.name}`; const terminal = `${id}:port`; const input = `${feeder.prefix}:cb:in`;
    if (!model.assets.some(asset => asset.id === `${feeder.prefix}:cb` && asset.terminals.includes(input))) throw new Error(`Station battery limit requires existing feeder breaker ${feeder.prefix}:cb.`);
    model.assets.push({ id, label: `${feeder.label}\nExternal supply boundary\nAvailability unconfirmed`, aliases: ['Abstract model input; not a physical generator', 'External source/earth coupling unconfirmed'], kind: 'source', terminals: [terminal], conductivePairs: [], positions: [], ...representation });
    model.sources.push({ id, assetId: id, terminal, label: `${feeder.label} external supply · unconfirmed`, ...representation });
    model.starting.sources[id] = null;
    model.connections.push({ id: `${id}:feeder-input`, from: terminal, to: input, ...representation });
    (model.boundaries ??= []).push({ id: `${id}:coverage`, label: `${feeder.label}: external source/backfeed and independent earth coverage unconfirmed`, terminal: input, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...representation });
  }
  // Keep every non-station asset, including mine/camp. Existing coverage records
  // stay intact; these extra records explain the intentionally removed joins.
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const connection of removedConnections) for (const terminal of [connection.from, connection.to]) {
    const owner = owners.get(terminal);
    if (!owner || owner.startsWith('station:')) continue;
    (model.boundaries ??= []).push({ id: `boundary:excluded-station:${connection.id}`, label: 'Station continuation outside the three feeder battery limits; installed route provenance retained, source/earth availability unconfirmed', terminal, sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', knowledge: 'provisional', evidenceIds: [...new Set([scopeId, representationId, ...(connection.evidenceIds ?? [])])], reviewIds: [...new Set([unknownsId, ...(connection.reviewIds ?? [])])] });
  }

  const assetIds = new Set(model.assets.map(asset => asset.id));
  const terminalIds = new Set(model.assets.flatMap(asset => asset.terminals));
  const connectionIds = new Set(model.connections.map(connection => connection.id));
  const oldStationViews = new Set(previousPresentation.views.filter(view => view.id.startsWith('station/') && !['station/amr', 'station/iop'].includes(view.id)).map(view => view.id));
  const keptViews = previousPresentation.views.filter(view => !oldStationViews.has(view.id));
  for (const view of keptViews) {
    view.assetIds = view.assetIds.filter(id => assetIds.has(id));
    view.layout.assets = Object.fromEntries(Object.entries(view.layout.assets).filter(([id]) => assetIds.has(id)));
    view.layout.terminals = Object.fromEntries(Object.entries(view.layout.terminals).filter(([id]) => terminalIds.has(id)));
    if (view.layout.rotations) view.layout.rotations = Object.fromEntries(Object.entries(view.layout.rotations).filter(([id]) => assetIds.has(id)));
    if (view.layout.labelOffsets) view.layout.labelOffsets = Object.fromEntries(Object.entries(view.layout.labelOffsets).filter(([id]) => assetIds.has(id)));
    if (view.layout.bends) view.layout.bends = Object.fromEntries(Object.entries(view.layout.bends).filter(([id]) => connectionIds.has(id)));
    view.boundaries = view.boundaries?.filter(boundary => connectionIds.has(boundary.connectionId) && assetIds.has(boundary.remoteAssetId)).map(boundary => ({ ...boundary, targetViewId: oldStationViews.has(boundary.targetViewId) ? 'station/overview' : boundary.targetViewId }));
    view.regions = view.regions?.map(region => oldStationViews.has(region.targetViewId) ? { ...region, targetViewId: 'station/overview', label: 'Station battery limits\nTF11 / TF12 / TF04' } : region);
  }
  const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };
  const stationIds: string[] = [];
  function place(asset: Asset, point: [number, number], terminals: [number, number][], offset: [number, number], rotation = 0) {
    stationIds.push(asset.id); layout.assets[asset.id] = point; layout.labelOffsets![asset.id] = offset; layout.rotations![asset.id] = rotation;
    asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminals[index]; });
  }
  const required = (id: string) => {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`Station battery-limit presentation requires ${id}.`);
    return asset;
  };
  for (const feeder of feeders) {
    const { x, prefix } = feeder;
    place(required(`boundary:${feeder.name}`), [x, 75], [[x, 110]], [0, -95]);
    place(required(`${prefix}:cb`), [x, 260], [[x, 230], [x, 290]], [120, 0], 90);
    place(required(`${prefix}:es`), [x + 115, 350], [[x + 85, 350], [x + 145, 350]], [120, 0]);
    place(required(`${prefix}:transformer`), [x, 470], [[x, 435], [x, 505]], [180, 0], 90);
    layout.bends![`${prefix}:es:branch`] = [[x, 350]];
    const output = model.assets.find(asset => asset.id === `${prefix}:interface`);
    if (output) place(output, [x, 600], [[x, 600]], [210, 0]);
  }
  const stationView: DiagramView = { id: 'station/overview', label: 'Station battery limits · TF11 / TF12 / TF04 · supplies unconfirmed', assetIds: stationIds, layout, bounds: [0, -45, 1360, 820], boundaries: [] };
  for (const connection of model.connections) {
    const from = owners.get(connection.from)!; const to = owners.get(connection.to)!;
    if (stationIds.includes(from) === stationIds.includes(to)) continue;
    const local = stationIds.includes(from) ? connection.from : connection.to; const remote = local === connection.from ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!;
    const target = keptViews.filter(view => view.assetIds.includes(remoteAssetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
    if (!target) throw new Error(`Station battery-limit navigation needs a target for ${remoteAssetId}.`);
    const position: [number, number] = [layout.terminals[local][0], 710];
    layout.terminals[remote] = position;
    stationView.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target.id, position });
  }
  const orientation = keptViews.find(view => view.id === 'whole/overview');
  if (orientation) for (const [index, feeder] of feeders.entries()) {
    const id = `boundary:${feeder.name}`; const x = 260 + index * 240;
    orientation.assetIds.push(id); orientation.layout.assets[id] = [x, 350]; orientation.layout.terminals[`${id}:port`] = [x, 350]; (orientation.layout.labelOffsets ??= {})[id] = [0, -40];
  }
  const finalViews = [...keptViews, stationView];
  for (const view of finalViews) for (const boundary of view.boundaries ?? []) {
    const target = finalViews.find(candidate => candidate.id === boundary.targetViewId);
    if (target?.assetIds.includes(boundary.remoteAssetId)) continue;
    const replacement = finalViews.filter(candidate => candidate.id !== view.id && candidate.assetIds.includes(boundary.remoteAssetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
    if (!replacement) throw new Error(`Station scope review required: no surviving navigation target for ${boundary.remoteAssetId}.`);
    boundary.targetViewId = replacement.id;
  }
  model.presentation = { overviewId: oldStationViews.has(previousPresentation.overviewId) ? stationView.id : previousPresentation.overviewId, views: finalViews };
  return model;
}
