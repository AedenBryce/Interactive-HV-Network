import type { Asset, NetworkModel } from '../../session/model';
import type { InterlockCondition } from '../../session/interlocks';
import type { DiagramView } from '../../session/presentation';

const reference = {
  document: '520CBC0003-2140-DR-EL-0002', revision: '6 (08.04.22; AS BUILT)', page: 1,
  clause: 'A-B / 4-5 FROM 22kV RING MAIN UNIT RM410-SW03, ref CB19OP001B-04057-DR-EL-0001, TF410B 22kV/415V 500kVA Dyn11; C-D / 4-5 MC410A CB 630A; D / 1-12 phase bar 415V630A63kA1Sec; C-D / 5-8 separate neutral/MEN/earth; H revision6 08.04.22 AS BUILT.',
};

export function withCv006Lv(base: NetworkModel, version: string): NetworkModel {
  const model = { ...structuredClone(base), version };
  const presentation = model.presentation;
  const input = model.assets.find(asset => asset.id === 'rm410:interface:mc410a');
  const transformer = model.assets.find(asset => asset.id === 'rm410:tf410b:transformer');
  if (!presentation || !input?.terminals.includes('rm410:interface:mc410a:input') || !transformer) throw new Error('MC410A extension requires the existing TF410B/interface presentation.');

  const removedAssets = new Set(['rm410:mc410b:cb', 'rm410:mc410b:bus']);
  const removedTerminals = new Set(model.assets.filter(asset => removedAssets.has(asset.id)).flatMap(asset => asset.terminals));
  removedTerminals.add('rm410:interface:mc410a:to-mc410b');
  const removedConnections = new Set(model.connections.filter(connection => removedTerminals.has(connection.from) || removedTerminals.has(connection.to)).map(connection => connection.id));
  const removedSources = new Set(model.sources.filter(source => removedAssets.has(source.assetId) || removedTerminals.has(source.terminal)).map(source => source.id));
  if (removedSources.size) throw new Error('MC410A boundary review required: an electrical source is attached to the excluded MC410B circuit; an explicit source/boundary decision is required before removal.');
  const retainedRule = model.interlocks?.rules.find(rule => !removedAssets.has(rule.assetId) && referencesRemoved(rule.require));
  if (retainedRule) throw new Error(`MC410A interlock review required: retained-device rule ${retainedRule.id} depends on excluded MC410B equipment/source; confirm the boundary and interlock treatment before removal.`);
  model.assets = model.assets.filter(asset => !removedAssets.has(asset.id));
  model.connections = model.connections.filter(connection => !removedConnections.has(connection.id));
  model.boundaries = model.boundaries?.filter(boundary => !removedTerminals.has(boundary.terminal));
  model.earths = model.earths?.filter(earth => !removedTerminals.has(earth.terminal));
  for (const id of removedAssets) delete model.starting.devices[id];
  if (model.interlocks) {
    model.interlocks.reviews = model.interlocks.reviews.filter(review => !removedAssets.has(review.assetId));
    model.interlocks.rules = model.interlocks.rules.filter(rule => !removedAssets.has(rule.assetId));
  }
  input.terminals = ['rm410:interface:mc410a:input'];
  input.conductivePairs = []; input.sourcePairs = []; input.earthPairs = [];
  input.label = 'MC410A incoming interface\n0002 rev6 supplemental detail';
  input.aliases = ['MC410A', '520CBC0003-2140-DR-EL-0002 rev6 supplemental detail', 'Alternative 520CBC0002 prefix remains unconfirmed', 'MC410B downstream source/MEN context retained as evidence'];

  for (const view of presentation.views) {
    view.assetIds = view.assetIds.filter(id => !removedAssets.has(id));
    view.boundaries = view.boundaries?.filter(boundary => !removedConnections.has(boundary.connectionId) && !removedAssets.has(boundary.remoteAssetId));
    for (const id of removedAssets) {
      delete view.layout.assets[id];
      if (view.layout.rotations) delete view.layout.rotations[id];
      if (view.layout.labelOffsets) delete view.layout.labelOffsets[id];
    }
    for (const terminal of removedTerminals) delete view.layout.terminals[terminal];
    for (const id of removedConnections) if (view.layout.bends) delete view.layout.bends[id];
    if (view.assetIds.includes(input.id)) {
      view.layout.terminals[input.terminals[0]] = [...view.layout.assets[input.id]];
      (view.layout.labelOffsets ??= {})[input.id] = [160, -85];
    }
    view.label = view.label.replace('MC410A→MC410B', 'MC410A first LV bus');
  }

  const claim: Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'> = { knowledge: 'supported', evidenceIds: ['CV-MC410A-ENDPOINT'], reviewIds: ['CV-R06', 'CV-MC410A-INSTALLED'] };
  (model.evidence ??= []).push({
    id: 'CV-MC410A-ENDPOINT', status: 'supported', references: [reference],
    summary: 'Supplemental 0002 revision6 depicts TF410B 22kV/415V 500kVA Dyn11, MC410A CB 630A and the first 415V/630A/63kA1sec phase bar. The existing TF410B 433V description remains a discrepancy. Source RM410-SW03 and its0001 reference remain source-scoped evidence, not a newly resolved input-identity merge. Neutral/MEN/earth are separate from the phase route. Note 1 concerns outgoing conveyor remote isolation, not an installed incoming-device interlock rule. Current installation, precedence, positions, interlocks and winding policies remain unconfirmed.',
  });
  (model.reviews ??= []).push({ id: 'CV-MC410A-INSTALLED', status: 'open', evidenceIds: ['CV-MC410A-ENDPOINT'], question: 'Confirm installed precedence of MC410A 0002 revision6, TF410B 433V versus 415V labels, printed RM410-SW03/0001 reference equivalence, supported incoming positions, complete physical interlocks and independent transformer source/backfeed/earth policies. The first phase bar is depicted; source receipt does not accept the installed arrangement.' });
  input.evidenceIds!.push('CV-MC410A-ENDPOINT'); input.reviewIds!.push('CV-MC410A-INSTALLED');
  transformer.label = 'TF410B\n22 kV / 433 V (RMU sheet)\n415 V on supplemental 0002\n500 kVA / transfer unconfirmed';
  transformer.aliases = [...(transformer.aliases ?? []), 'TF410B 22kV/415V 500kVA Dyn11 on supplemental0002rev6; earlier433V discrepancy unconfirmed'];
  transformer.evidenceIds!.push('CV-MC410A-ENDPOINT'); transformer.reviewIds!.push('CV-MC410A-INSTALLED');
  const gap = model.evidence!.find(record => record.id === 'CV-MC410A-MISSING')!;
  gap.summary = 'Earlier construction used a provisional MC410A→MC410B coverage placeholder while 0002 was unavailable. Supplemental 520CBC0003-2140-DR-EL-0002 revision6 now depicts the MC410A 630A incoming CB and 415V/630A first phase bar. The placeholder bypass and downstream MC410B phase circuit are removed at this first LV boundary. Original MC410B/0079/MEN and alternative-prefix references remain historical source context, without accepting their current installed identity, governing revision or winding policy.';
  gap.references.push(reference);
  const mc410bEvidence = model.evidence!.find(record => record.id === 'CV-MC410B-ENDPOINT')!;
  mc410bEvidence.summary = 'Retained historical source context: the supplied MC410B sheet depicts supply FROM MC410A, a 630A incomer and415V1000A bar. Supplemental MC410A 0002 revision6 establishes the represented first LV bar upstream; MC410B is therefore excluded as outgoing LV circuitry from this cloned runtime package. Its original source/MEN evidence remains inspectable; historical packages are unchanged. Current installed precedence and cross-document identity remain unconfirmed.';
  for (const boundary of model.boundaries ?? []) if (boundary.terminal === input.terminals[0]) boundary.label = 'MC410A 0002rev6 first LV endpoint represented; installed source/backfeed and earth coverage unconfirmed';
  const lvReview = model.reviews!.find(review => review.id === 'CV-R06')!;
  lvReview.question = 'Supplemental MC410A 0002 revision6 now depicts the630A incomer and 415V/630A first phase bar. Remaining unresolved: installed precedence, TF410B 433V versus 415V ratings and printed upstream-reference equivalence, positions/interlocks and independent winding policies. MC410B is excluded downstream of the first LV bar; original MC410B/MEN source context is retained without confirming installed precedence.';
  lvReview.evidenceIds.push('CV-MC410A-ENDPOINT');
  const scopeReview = model.reviews!.find(review => review.id === 'CV-R11')!;
  scopeReview.question = 'Supplemental MC410A 0002 revision 6 now supplies the first LV bar detail. Resolve remaining CV006/CV010, Drop Tower, external Norfolk/Bigge/vendor/earthing references and legacy line hardware identities. MC410B/0079/MEN references remain source context beyond the first LV endpoint; installed reference equivalence and precedence are unconfirmed. Missing references do not establish disconnection.';
  scopeReview.evidenceIds.push('CV-MC410A-ENDPOINT');

  const cb: Asset = { id: 'rm410:mc410a:cb', label: 'MC410A CB\n630 A', aliases: ['MC410A CB 630A', '630 A'], kind: 'breaker', terminals: ['rm410:mc410a:cb:a', 'rm410:mc410a:cb:b'], conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [['rm410:mc410a:cb:a', 'rm410:mc410a:cb:b']] }], ...claim };
  const bus: Asset = { id: 'rm410:mc410a:bus', label: 'MC410A first LV bus\n415 V / 630 A\n63 kA for 1 sec', aliases: ['MC410A', '415 V', '630 A', '63 kA for 1 sec'], kind: 'bus', terminals: ['rm410:mc410a:bus:bar'], conductivePairs: [], positions: [], ...claim };
  model.assets.push(cb, bus); model.starting.devices[cb.id] = null;
  (model.interlocks ??= { reviews: [], rules: [] }).reviews.push({ assetId: cb.id, status: 'unresolved', note: 'Complete installed positions and incoming-device physical interlocks remain unconfirmed. Outgoing conveyor-isolation note 1 does not establish an incomer rule or switching permission; baseline is null.', evidence: [reference] });
  (model.boundaries ??= []).push({ id: `${bus.id}:coverage`, label: 'MC410A first phase bar: installed source/backfeed and independent earth coverage unconfirmed', terminal: bus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
  const incoming = { id: 'cv006-lv:mc410a:incoming', from: input.terminals[0], to: cb.terminals[0], ...claim };
  model.connections.push(incoming, { id: 'cv006-lv:mc410a:bar', from: cb.terminals[1], to: bus.terminals[0], ...claim });

  const view: DiagramView = {
    id: 'supplemental/cv006-mc410a-lv', label: 'MC410A first LV bar · 415V / TF410B 433V discrepancy open', assetIds: [transformer.id, input.id, cb.id, bus.id], bounds: [40, -30, 900, 1020], boundaries: [],
    layout: {
      assets: { [transformer.id]: [330, 180], [input.id]: [330, 360], [cb.id]: [330, 560], [bus.id]: [330, 760] },
      terminals: { [transformer.terminals[0]]: [330, 140], [transformer.terminals[1]]: [330, 220], [input.terminals[0]]: [330, 360], [cb.terminals[0]]: [330, 530], [cb.terminals[1]]: [330, 590], [bus.terminals[0]]: [330, 760] },
      rotations: { [cb.id]: 90, [bus.id]: 90 }, labelOffsets: { [transformer.id]: [340, -50], [input.id]: [340, 0], [cb.id]: [210, -10], [bus.id]: [0, 70] }, bends: {},
    },
  };
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  for (const connection of model.connections) {
    const from = owners.get(connection.from)!; const to = owners.get(connection.to)!;
    if (view.assetIds.includes(from) === view.assetIds.includes(to)) continue;
    const local = view.assetIds.includes(from) ? connection.from : connection.to;
    const remote = local === connection.from ? connection.to : connection.from;
    const remoteAssetId = owners.get(remote)!;
    const target = presentation.views.filter(candidate => candidate.assetIds.includes(remoteAssetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
    if (!target) throw new Error(`Missing upstream MC410A view for ${remoteAssetId}.`);
    const position: [number, number] = [view.layout.terminals[local][0], 30];
    view.layout.terminals[remote] = position;
    view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target.id, position });
  }
  for (const previous of presentation.views) if (previous.assetIds.includes(input.id)) {
    const [x, y] = previous.layout.terminals[incoming.from]; const position: [number, number] = [x, y + 100];
    previous.layout.terminals[incoming.to] = position;
    (previous.boundaries ??= []).push({ connectionId: incoming.id, remoteAssetId: cb.id, targetViewId: view.id, position });
  }
  presentation.views.push(view);
  return model;

  function referencesRemoved(condition: InterlockCondition): boolean {
    if (condition.kind === 'device') return removedAssets.has(condition.assetId);
    if (condition.kind === 'source') return removedSources.has(condition.sourceId);
    return condition.conditions.some(referencesRemoved);
  }
}
