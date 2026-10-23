import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramView } from '../../session/presentation';
import type { EvidenceReference } from '../../session/evidence';

const routeId = 'WN-DROP-TOWER-ROUTE'; const scopeId = 'WN-DROP-TOWER-SCOPE'; const profileId = 'WN-DROP-TOWER-HV-PROFILE';
const policyId = 'WN-TRANSFORMER-FORWARD-POLICY'; const unknownId = 'WN-DROP-TOWER-ELECTRICAL-REVIEW';
const entryId = 'cv006:interface:drop-tower-workshop'; const tfId = 'drop-tower:tf:p18-8';
const refs: EvidenceReference[] = [
  { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND23.10.23)', page: 1, clause: 'A–B/8–10, pole17 → pole17-1 → DROP TOWER LV WORKSHOP' },
  { document: 'CB-10016-DR-EL-0003.004.pdf', revision: '0 (02.05.18; AS BUILT)', page: 1, clause: 'C–E/5, P18 takeoff, P18-1 ABS, P18-2, P18-8 10A fused ABS, P18-8 TF22kV/400V315kVA and downstream changeover-board reference' },
];

/** Owner86 identifies the route;87 cuts at the transformer;88 selects only the two HV control profiles. */
export function withOwnerDropTowerBranch(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Drop Tower branch requires a new immutable model version.');
  if (base.evidence?.some(record => [routeId, scopeId, profileId].includes(record.id)) || base.assets.some(asset => asset.id.startsWith('drop-tower:'))) throw new Error('Drop Tower branch already applied or its identity is occupied.');
  const model = { ...structuredClone(base), version };
  const entry = model.assets.find(asset => asset.id === entryId);
  const branch = model.connections.find(link => link.id === 'cv006:pole17-drop-tower');
  const parentView = model.presentation?.views.find(view => view.id === 'cv006/overhead');
  if (!model.interlocks || !parentView?.assetIds.includes(entryId) || entry?.kind !== 'interface' || entry.terminals.length !== 1 || entry.terminals[0] !== `${entryId}:port`
    || entry.conductivePairs.length || entry.positions.length || !entry.evidenceIds?.includes('CV-DROP-TOWER')
    || branch?.from !== 'cv006:pole:17:port' || branch.to !== entry.terminals[0] || !branch.evidenceIds?.length
    || model.connections.filter(link => link.from === entry.terminals[0] || link.to === entry.terminals[0]).length !== 1
    || !model.evidence?.some(record => record.id === policyId && record.status === 'owner-confirmed')) throw new Error('Review required: Drop Tower entry, inherited policy or CV006 view changed.');
  function decision(id: string, answer: string, summary: string, clause: string) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [...refs, { document: 'Project owner conversation', revision: '2026-10-23', clause }], summary });
    (model.reviews ??= []).push({ id, status: 'resolved', question: clause, evidenceIds: [id], resolution: confirmation });
  }
  decision(routeId, 'yes', 'Owner86 identifies CV006 pole17/17-1 Drop Tower branch as the study P18 → P18-1 ABS → P18-8 fused ABS → P18-8 TF route. Preserve both naming schemes without changing unrelated pole identities.', 'Answer86 exact yes to the complete named route, transformer22kV/400V315kVA and changeover-board destination. This selects current route identity only; control states and final modeled extent are separate.');
  decision(scopeId, '83: Include through its final LV bus\n87: not relevant. just have the final point be the Drop tower Transformer for V1', 'Owner87 supersedes answer83 downstream extent: V1 ends at the Drop Tower transformer. Do not invent the changeover board, final LV bus, incoming devices or alternate supply. Answer89 yes selects the depicted400A LV fuse continuity but that fuse lies outside this final cut and is not added.', 'Answers83/87 exact quotes retained in confirmation. Answer89 exact yes to intact fixed400A LV fuse continuity, no removal action, actual condition/independent earth not accepted. Record89 without extending87 battery limit.');
  decision(profileId, 'correct', 'Owner88 selects P18-1 ABS and P18-8 fused ABS Closed, fixed Open/Close only, no racking and no additional local/key prerequisites. Fused ABS fuse intact for modeled source continuity, no blown/removal action. No actual fuse condition, earth behavior or operational permission is selected.', 'Answer88 exact correct to the complete stated two-control baseline/profile and intact fused-ABS model.');
  (model.evidence ??= []).push({ id: unknownId, status: 'unresolved', references: refs, summary: 'Unconfirmed: actual fuse condition, independent earth behavior, reverse transformer transfer and excluded LV/changeover-board continuation. Source does not confirm those. Source paths are selected only as separately evidenced scoped relationships; no phase-earth link is inferred from transformer neutral earth.' });
  (model.reviews ??= []).push({ id: unknownId, status: 'open', evidenceIds: [unknownId, routeId, scopeId, policyId], question: 'Retained Drop Tower transformer/fuse physical metadata, reverse and independent earth behavior remain Unconfirmed. LV/changeover equipment beyond transformer is explicitly excluded by87; source coverage outside this cut remains Unconfirmed. Whole-network acceptance remains separate.' });
  entry.aliases = [...new Set([...(entry.aliases ?? []), entry.label, 'P18 study takeoff identified by owner86'])];
  entry.label = 'Drop Tower branch\nPole17-1 / study P18 route confirmed';
  entry.evidenceIds = [...(entry.evidenceIds ?? []), routeId, scopeId]; entry.reviewIds = [...(entry.reviewIds ?? []), routeId, scopeId];
  for (const boundary of model.boundaries ?? []) if (boundary.terminal === entry.terminals[0]) {
    boundary.sourceCoverage = 'complete'; boundary.earthCoverage = 'unconfirmed'; boundary.knowledge = 'owner-confirmed';
    boundary.label = 'Drop Tower continuation is represented through its transformer by owner86/87; independent earth coverage remains Unconfirmed.';
    boundary.evidenceIds = [...(boundary.evidenceIds ?? []), routeId, scopeId]; boundary.reviewIds = [...(boundary.reviewIds ?? []), scopeId];
  }
  const claim = { knowledge: 'owner-confirmed' as const, evidenceIds: [routeId, profileId], reviewIds: [profileId] };
  const absIds = ['drop-tower:abs:p18-1', 'drop-tower:abs:p18-8'];
  for (const [index, id] of absIds.entries()) {
    model.assets.push({ id, label: index === 0 ? 'P18-1 ABS' : 'P18-8 fused ABS', kind: 'disconnector', terminals: [`${id}:a`, `${id}:b`], conductivePairs: [], positions: [{ id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [[`${id}:a`, `${id}:b`]] }], ...claim });
    model.starting.devices[id] = 'closed';
    model.interlocks.reviews.push({ assetId: id, status: 'confirmed-none', evidence: model.evidence!.find(record => record.id === profileId)!.references, note: 'Owner88 complete V1 profile: fixed Open/Close, no additional local/key prerequisites, Closed baseline. No racking or fuse removal/blown action.' });
  }
  const fuseId = 'drop-tower:fuse:p18-8'; const fusePorts: [string, string] = [`${fuseId}:a`, `${fuseId}:b`];
  model.assets.push({ id: fuseId, label: 'P18-8 ·10A fuse\nIntact in teaching model\nActual condition unconfirmed', kind: 'interface', terminals: fusePorts, conductivePairs: [], earthPairs: [fusePorts], positions: [], knowledge: 'provisional', evidenceIds: [routeId, profileId, unknownId], reviewIds: [unknownId], sourceArcs: fusePorts.map((from, index) => ({ id: `${fuseId}:source-${index}`, from, to: fusePorts[1 - index], supportScope: 'relationship', ...claim })) });
  const hv = `${tfId}:hv`; const lv = `${tfId}:lv`;
  model.assets.push({ id: tfId, label: 'Drop Tower · P18-8 TF\n22kV /400V ·315kVA\nV1 endpoint at transformer', aliases: ['Drop Tower Transformer', 'P18-8 TF'], kind: 'transformer', terminals: [hv, lv], conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [], knowledge: 'provisional', evidenceIds: [routeId, scopeId, policyId, unknownId], reviewIds: [unknownId], sourceArcs: [
    { id: `${tfId}:forward`, from: hv, to: lv, supportScope: 'relationship', knowledge: 'owner-confirmed', evidenceIds: [routeId, policyId], reviewIds: [policyId] },
    { id: `${tfId}:reverse`, from: lv, to: hv, supportScope: 'relationship', knowledge: 'unresolved', evidenceIds: [routeId, unknownId], reviewIds: [unknownId] },
  ] });
  const links = [
    { id: 'drop-tower:entry-abs', from: entry.terminals[0], to: `${absIds[0]}:a` },
    { id: 'drop-tower:abs-line', from: `${absIds[0]}:b`, to: `${absIds[1]}:a` },
    { id: 'drop-tower:abs-fuse', from: `${absIds[1]}:b`, to: fusePorts[0] },
    { id: 'drop-tower:fuse-transformer', from: fusePorts[1], to: hv },
  ];
  model.connections.push(...links.map(link => ({ ...link, knowledge: 'owner-confirmed' as const, evidenceIds: [routeId], reviewIds: [routeId] })));
  (model.boundaries ??= []).push(...[hv, lv].map(terminal => ({ id: `${terminal}:coverage`, terminal, label: terminal === hv ? 'Confirmed Drop Tower HV route; independent earth behavior Unconfirmed.' : 'V1 ends at transformer by owner87; excluded LV continuation and independent earth coverage Unconfirmed.', sourceCoverage: terminal === hv ? 'complete' as const : 'unconfirmed' as const, earthCoverage: 'unconfirmed' as const, knowledge: 'owner-confirmed' as const, evidenceIds: [routeId, scopeId], reviewIds: [unknownId] })));
  const view: DiagramView = { id: 'cv006/drop-tower', label: 'CV006 / Drop Tower · V1 ends at transformer', assetIds: [entryId, ...absIds, fuseId, tfId], bounds: [0, 0, 1400, 800], layout: { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} }, boundaries: [] };
  const positions: [string, number, number][] = [[entryId, 160, 220], [absIds[0], 400, 220], [absIds[1], 700, 220], [fuseId, 920, 220], [tfId, 1160, 220]];
  for (const [id, x, y] of positions) {
    const asset: Asset = model.assets.find(asset => asset.id === id)!;
    view.layout.assets[id] = [x, y]; view.layout.labelOffsets![id] = [0, 100];
    asset.terminals.forEach((terminal, index) => { view.layout.terminals[terminal] = [x + (index === 0 ? -35 : 35), y]; });
  }
  view.layout.terminals[branch.from] = [40, 220];
  view.boundaries!.push({ connectionId: branch.id, remoteAssetId: 'cv006:pole:17', targetViewId: parentView.id, position: [40, 220] });
  model.presentation!.views.push(view);
  parentView.layout.terminals[`${absIds[0]}:a`] = [370, 720];
  parentView.boundaries ??= []; parentView.boundaries.push({ connectionId: links[0].id, remoteAssetId: absIds[0], targetViewId: view.id, position: [370, 720] });
  return model;
}
