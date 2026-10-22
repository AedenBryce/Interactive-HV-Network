import type { NetworkModel } from '../../session/model';
import type { InterlockCondition } from '../../session/interlocks';

const mineScopeId = 'WN-EXCLUDE-MINE-CAMP';
const ownerReference = { document: 'Project owner conversation', revision: '2026-10-22', clause: 'Exact scoped owner answers retained in confirmation.decision; no baseline, availability or interlock acceptance.' };

export function withOwnerScopeConnections(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === mineScopeId)) throw new Error('Owner scope/connection extension already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('Owner scope extension requires the existing presentation.');
  recordDecision(model, mineScopeId, 'Exclude mine-services and village/camp networks', 'Exclude definite RM711/SS711B/TF717 mine-services and village/camp networks. Separate Services RM712, workshops and conveyors remain within scope. RM718 railcar/fuel-unloading and SW441/TF441/MC441 Water Tower/Process Water scope remains unconfirmed and is retained, as are nonconducting shared-area review ports. Software namespace alone does not establish physical area. This changes represented scope, not installed connectivity; historical source/owner evidence is retained.');
  removeAssets(model, new Set(model.assets.filter(asset => asset.id.startsWith('camp:') || /^mine:(rm711|sw711|tf717|db717)/.test(asset.id) || ['mine:interface:station-tf03', 'mine:interface:study-tf03'].includes(asset.id)).map(asset => asset.id)), mineScopeId);
  for (const view of model.presentation.views) {
    if (view.id === 'mine-camp/overview') view.label = 'RM718 / water / shared-source reviews · scope pending';
    for (const region of view.regions ?? []) if (region.id === 'mine-camp') region.label = 'RM718 / water\nScope pending';
  }
  limitLineBranches(model);
  connectRm712(model);
  tidyPresentation(model);
  return model;
}

function limitLineBranches(model: NetworkModel) {
  const id = 'WN-LINE33-H10-SCOPE';
  const representationId = 'WN-LINE33-TAKEOFF-REPRESENTATION';
  recordDecision(model, id, 'that 33kV line is only relevant for the Hopper 10 stuff. Can show the branch points but no further details from that', 'Keep the represented TF04 to Hopper10 route and show other 33 kV branches only as takeoffs. Excluded branch detail is not an installed disconnection or a claim that external sources cannot backfeed.');
  model.evidence!.push({ id: representationId, status: 'provisional', summary: 'Inference: abstract takeoff markers compress excluded branch switch/cable detail to each source-backed trunk junction. These provisional edges identify the branch boundary only; they do not assert a direct installed conductor that bypasses excluded switches. External source/earth coverage and installed branch status/identity remain unconfirmed. Branch detail scope is owner-excluded. No Farwest source details are added.', references: [{ document: 'CB21OP055B-10016-DR-EL-0089.pdf', revision: '0 (10/06/2022; ISSUED FOR CONSTRUCTION)', page: 1, clause: 'C-G: pole4,214,227,272,284 and286 branch junctions; other branch details excluded by owner scope.' }, ownerReference] });
  const removed = new Set(['future-4a-fused-abs', 'future-214-abs', 'norfolk-227-abs', 'pole-272-abs', 'end-287-abs'].map(key => `line33:${key}`));
  removeAssets(model, removed, id);
  const takeoffs = [
    ['future-4a', '4', 'Future-feed branch'], ['future-214', '214', 'Future-feed branch'], ['norfolk', '227', 'Norfolk branch'], ['pole-272-1', '272', 'Unnamed branch'],
    ['bigge-sp1', '284', 'Bigge SP1 branch'], ['bigge-sp1-sp2', '284', 'Bigge SP1/SP2 branch'], ['end-287', '286', 'Trunk continuation beyond Hopper10 takeoff'],
  ] as const;
  const claims = { knowledge: 'provisional' as const, evidenceIds: [id, representationId], reviewIds: ['PL-FUTURE-EXTERNAL'] };
  // Direct Bigge arrows also stop at takeoff scope; retain their original
  // drawing evidence in the package, replacing runtime detail with a marker.
  model.connections = model.connections.filter(connection => !['line33:284-bigge-sp1', 'line33:284-bigge-sp1-sp2'].includes(connection.id));
  for (const [key, pole, name] of takeoffs) {
    const asset = model.assets.find(asset => asset.id === `line33:${key}:interface`);
    if (!asset || !model.assets.some(asset => asset.id === `line33:pole-${pole}`)) throw new Error(`33 kV branch scope requires source-backed ${key} at pole ${pole}.`);
    asset.aliases = [...(asset.aliases ?? []), `Historical detailed endpoint caption: ${asset.label}`];
    asset.label = `Branch takeoff · pole ${pole}\n${name}\nFurther detail outside scope`;
    Object.assign(asset, claims);
    model.connections.push({ id: `owner-scope:line33:takeoff:${key}`, from: `line33:pole-${pole}:port`, to: asset.terminals[0], ...claims });
    for (const boundary of model.boundaries?.filter(boundary => boundary.terminal === asset.terminals[0]) ?? []) {
      boundary.label = 'Branch takeoff: further detail outside scope; external source/backfeed and independent earth coverage unconfirmed'; Object.assign(boundary, claims);
    }
    if (!model.boundaries?.some(boundary => boundary.terminal === asset.terminals[0])) (model.boundaries ??= []).push({ id: `owner-scope:line33:${key}:coverage`, label: 'Branch takeoff: external source/backfeed and independent earth coverage unconfirmed', terminal: asset.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claims });
  }
  for (const view of model.presentation!.views) if (['station/amr', 'station/iop'].includes(view.id)) view.label = `${view.id.endsWith('amr') ? 'AMR' : 'IOP'} · TF04 to Hopper10 · other branches are takeoffs only`;
  const review = model.reviews!.find(review => review.id === 'PL-FUTURE-EXTERNAL');
  if (review) { review.question = 'Other 33 kV branches are owner-excluded beyond takeoffs. Their external source/backfeed and independent earth coverage remain unconfirmed; no branch commissioning or detailed destination acceptance is required for the scoped Hopper10 route. Confirm retained route physical states/interlocks separately.'; review.evidenceIds.push(id, representationId); }
}

function connectRm712(model: NetworkModel) {
  const id = 'WN-RM721-RM712-IN02';
  const answer = 'RM721 goes through SF RM712 IN02 at RM712';
  const question = 'Does RM721 IN02 currently connect to RM712? If yes, which RM712 incoming switch and cable does it connect to?';
  recordDecision(model, id, answer, `Owner answered exactly "${answer}" to: ${question} This confirms RM721 IN02 cable side to SF RM712 IN02 cable side. No cable tag is confirmed by the answer. Earlier SW426 source text is disputed historical drawing evidence, not a second current supply. Actual states, availability, complete mechanisms/interlocks and model acceptance remain unconfirmed.`);
  const connection = { id: 'owner:join:rm721-rm712', from: 'rm721:in02:b', to: 'rm712:in02:a', knowledge: 'owner-confirmed' as const, evidenceIds: [id], reviewIds: [id] };
  for (const terminal of [connection.from, connection.to]) if (!model.assets.some(asset => asset.terminals.includes(terminal))) throw new Error(`Owner RM721/RM712 connection requires existing cable-side terminal ${terminal}.`);
  model.connections = model.connections.filter(connection => !['rm721:in02-remote-rm712', 'rm712:sw426-reference-cable'].includes(connection.id));
  model.connections.push(connection);
  const labels: Record<string, string> = {
    'rm721:interface:rm712': 'Historical RM712 drawing reference\nCurrent IN02 connection owner-confirmed\nWrong 2252 reference unresolved',
    'rm712:interface:sw426': 'Historical disputed SW426 reference\nCurrent RM712 IN02 connects to RM721\nNo second supply joined',
    'sw426:interface:rm712': 'Historical disputed RM712 / SW426 reference\nCurrent RM712 IN02 connects to RM721\nNo SW426 bay inferred',
  };
  for (const [assetId, label] of Object.entries(labels)) {
    const asset = model.assets.find(asset => asset.id === assetId);
    if (!asset) throw new Error(`Owner RM712 reference reconciliation requires ${assetId}.`);
    asset.aliases = [...(asset.aliases ?? []), `Historical disputed caption: ${asset.label}`]; asset.label = label;
    asset.knowledge = 'unresolved'; asset.evidenceIds = [...(asset.evidenceIds ?? []), id]; asset.reviewIds = [...(asset.reviewIds ?? []), 'WN-RM712-REFERENCE-GAPS'];
    for (const boundary of model.boundaries?.filter(boundary => asset.terminals.includes(boundary.terminal)) ?? []) {
      boundary.label = 'Historical drawing reference only; no separate current supply joined. Reference equivalence and independent external coverage remain unconfirmed.';
      boundary.evidenceIds = [...(boundary.evidenceIds ?? []), id];
    }
  }
  model.reviews!.push({ id: 'WN-RM712-REFERENCE-GAPS', status: 'open', question: 'Reconcile historical wrong2252/RM711 reference and SW426/RM712-P-01 label against the owner-confirmed RM721 IN02 to RM712 IN02 route. Cable tag and document equivalence remain unconfirmed. The current route does not require inventing a SW426 bay or second supply. Actual state/interlocks remain separate.', evidenceIds: [id, 'SV-RM721-RM712-UNRESOLVED', 'SV-RM712-SW426-GAP'] });
  const decision = model.evidence!.find(record => record.id === id)!.confirmation!;
  for (const reviewId of ['SV-Q02', 'SV-Q03']) {
    const review = model.reviews!.find(review => review.id === reviewId)!;
    review.status = 'resolved'; review.resolution = decision; review.evidenceIds.push(id);
    review.question = `${reviewId === 'SV-Q02' ? 'Current RM721 IN02 remote contact is owner-confirmed as SF RM712 IN02.' : 'Current RM712 IN02 route is owner-confirmed from RM721, superseding the old SW426 source attribution.'} Resolution is scoped to these cable-facing endpoints; cable tag/wrong-document references remain open under WN-RM712-REFERENCE-GAPS. No control permission is confirmed.`;
  }
  const desandsReview = model.reviews!.find(review => review.id === 'DES-Q01')!;
  desandsReview.question = 'Owner confirms RM721 IN02 to SF RM712 IN02; old SW426 attribution is disputed historical evidence and creates no second supply or missing-bay requirement. Remaining unresolved: TF712 drawn disconnected/pulled cables versus current DG1(6207)/DG7(6206)/MCS/SW712 arrangement, current cable condition, selector matrix, source availability and actual states/interlocks.';
  desandsReview.evidenceIds.push(id);
  for (const view of model.presentation!.views) {
    const fromVisible = view.assetIds.includes('rm721:in02'); const toVisible = view.assetIds.includes('rm712:in02');
    if (fromVisible === toVisible) continue;
    const local = fromVisible ? connection.from : connection.to; const remote = fromVisible ? connection.to : connection.from;
    const remoteAssetId = fromVisible ? 'rm712:in02' : 'rm721:in02';
    const targetViewId = fromVisible ? 'services/mine-services' : 'services/rm721';
    const [x, y] = view.layout.terminals[local]; const position: [number, number] = [x, y + (fromVisible ? 150 : -150)];
    view.layout.terminals[remote] = position;
    (view.layout.bends ??= {})[connection.id] = [];
    (view.boundaries ??= []).push({ connectionId: connection.id, remoteAssetId, targetViewId, position });
  }
}

function recordDecision(model: NetworkModel, id: string, answer: string, summary: string) {
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-22', decision: answer };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, summary, references: [ownerReference] });
  (model.reviews ??= []).push({ id, status: 'resolved', question: summary, evidenceIds: [id], resolution: confirmation });
}

function removeAssets(model: NetworkModel, removed: Set<string>, scopeId: string) {
  const terminals = new Set(model.assets.filter(asset => removed.has(asset.id)).flatMap(asset => asset.terminals));
  const sources = new Set(model.sources.filter(source => removed.has(source.assetId)).map(source => source.id));
  function dependency(condition: InterlockCondition): boolean {
    if (condition.kind === 'device') return removed.has(condition.assetId);
    if (condition.kind === 'source') return sources.has(condition.sourceId);
    return condition.conditions.some(dependency);
  }
  for (const rule of model.interlocks?.rules ?? []) if (!removed.has(rule.assetId) && dependency(rule.require)) throw new Error(`Owner scope review required: retained interlock ${rule.id} depends on excluded equipment. No condition was removed.`);
  const cutConnections = model.connections.filter(connection => terminals.has(connection.from) !== terminals.has(connection.to));
  model.assets = model.assets.filter(asset => !removed.has(asset.id));
  model.connections = model.connections.filter(connection => !terminals.has(connection.from) && !terminals.has(connection.to));
  model.sources = model.sources.filter(source => !sources.has(source.id));
  model.earths = model.earths?.filter(earth => !terminals.has(earth.terminal));
  model.boundaries = model.boundaries?.filter(boundary => !terminals.has(boundary.terminal));
  model.starting.devices = Object.fromEntries(Object.entries(model.starting.devices).filter(([id]) => !removed.has(id)));
  model.starting.sources = Object.fromEntries(Object.entries(model.starting.sources).filter(([id]) => !sources.has(id)));
  if (model.interlocks) {
    model.interlocks.reviews = model.interlocks.reviews.filter(review => !removed.has(review.assetId));
    model.interlocks.rules = model.interlocks.rules.filter(rule => !removed.has(rule.assetId));
  }
  for (const connection of cutConnections) (model.boundaries ??= []).push({
    id: `owner-scope:cut:${connection.id}`, terminal: terminals.has(connection.from) ? connection.to : connection.from,
    label: 'Continuation outside the owner-defined model scope; installed connection, source/backfeed and independent earth coverage remain unconfirmed',
    sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', knowledge: 'provisional',
    evidenceIds: [...new Set([scopeId, ...(connection.evidenceIds ?? [])])], reviewIds: [scopeId],
  });
}

function tidyPresentation(model: NetworkModel) {
  const presentation = model.presentation!;
  const assets = new Set(model.assets.map(asset => asset.id));
  const terminals = new Set(model.assets.flatMap(asset => asset.terminals));
  const connections = new Set(model.connections.map(connection => connection.id));
  for (const view of presentation.views) {
    view.assetIds = view.assetIds.filter(id => assets.has(id));
    view.layout.assets = Object.fromEntries(Object.entries(view.layout.assets).filter(([id]) => assets.has(id)));
    view.layout.terminals = Object.fromEntries(Object.entries(view.layout.terminals).filter(([id]) => terminals.has(id)));
    if (view.layout.rotations) view.layout.rotations = Object.fromEntries(Object.entries(view.layout.rotations).filter(([id]) => assets.has(id)));
    if (view.layout.labelOffsets) view.layout.labelOffsets = Object.fromEntries(Object.entries(view.layout.labelOffsets).filter(([id]) => assets.has(id)));
    if (view.layout.bends) view.layout.bends = Object.fromEntries(Object.entries(view.layout.bends).filter(([id]) => connections.has(id)));
    view.boundaries = view.boundaries?.filter(boundary => connections.has(boundary.connectionId) && assets.has(boundary.remoteAssetId));
  }
  presentation.views = presentation.views.filter(view => view.assetIds.length);
  const viewIds = new Set(presentation.views.map(view => view.id));
  for (const view of presentation.views) {
    view.regions = view.regions?.filter(region => viewIds.has(region.targetViewId));
    for (const boundary of view.boundaries ?? []) {
      if (presentation.views.find(target => target.id === boundary.targetViewId)?.assetIds.includes(boundary.remoteAssetId)) continue;
      const target = presentation.views.find(target => target.id !== view.id && target.assetIds.includes(boundary.remoteAssetId));
      if (!target) throw new Error(`Owner scope review required: navigation target missing for ${boundary.remoteAssetId}.`);
      boundary.targetViewId = target.id;
    }
  }
}
