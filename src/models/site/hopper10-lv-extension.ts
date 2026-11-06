import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramView } from '../../session/presentation';

const lvReference = { document: '520CBC0007-2130-DR-EL-0005', revision: '1 (20.01.22; AS BUILT)', page: 1, clause: 'A-B / 9-10, FROM SS420-TF420B continuation B, ACB01 MAIN SWITCH 2000A; C-D / 1-12, SR420-MC420A phase bar 2600A80kA1sec415VAC; H title/revision1.' };
const rmuReference = { document: '520CBC0007-2130-DR-EL-0003.pdf', revision: '3 (28.01.25; MODIFIED AS FOUND 23.10.23)', page: 1, clause: 'E-F / 5-6, TF420B secondary continuation B and SR420-MC420A-P01; transformer transfer policy is not established by this LV extension.' };

// Extends an existing construction package. Printed tags and source references
// establish the drawn LV endpoint; installed acceptance remains a separate gate.
export function withHopper10Lv(base: NetworkModel, version: string): NetworkModel {
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('Hopper10 LV extension requires an existing model presentation.');
  const previousViews = [...model.presentation.views];
  const incomingInterface = model.assets.find(asset => asset.id === 'rm420:mc420a:interface');
  const transformer = model.assets.find(asset => asset.id === 'rm420:tf420b');
  if (!incomingInterface?.terminals.includes('rm420:mc420a:interface:port') || !transformer?.terminals.includes('rm420:tf420b:secondary')) throw new Error('Hopper10 LV extension requires the existing TF420B secondary and MC420A interface.');
  if (!model.connections.some(connection => connection.from === 'rm420:tf420b:secondary' && connection.to === 'rm420:mc420a:interface:port')) throw new Error('Hopper10 LV extension requires the existing TF420B secondary continuation.');
  const claim = { knowledge: 'supported' as const, evidenceIds: ['EP-H10-LV-ENDPOINT'], reviewIds: ['H10-Q03', 'EP-H10-LV-INSTALLED'] };
  (model.evidence ??= []).push({ id: 'EP-H10-LV-ENDPOINT', status: 'supported', summary: 'Supplemental0005 revision1 depicts SR420-MC420A in the Hopper10 LV section: FROM SS420-TF420B continuationB through ACB01 MAIN SWITCH2000A to the first415VAC2600A80kA1sec phase bar. Source0003 retains SR420-MC420A-P01 on the existing TF420B secondary continuation. Instrumentation/trip branches, CTs, neutral/earth and outgoing LV/auxiliary circuits do not create further phase connections. Installed arrangement, incoming positions/physical interlocks and transformer source/backfeed/earth policies remain unconfirmed.', references: [lvReference, rmuReference] });
  (model.reviews ??= []).push({ id: 'EP-H10-LV-INSTALLED', status: 'open', question: 'Confirm supplemental0005 rev1 against the installed MC420A incomer/bar, governing revision, supported/withdrawal positions and complete physical interlocks. Existing transformer transfer/backfeed/earth policies and actual starting states remain unconfirmed. AS BUILT is not model acceptance or switching permission.', evidenceIds: ['EP-H10-LV-ENDPOINT'] });
  const acb: Asset = { id: 'rm420:mc420a:in:acb', label: 'MC420A · ACB01 main switch\n2000 A', aliases: ['ACB01', 'ACB01 MAIN SWITCH', '2000 A', 'SR420-MC420A'], kind: 'breaker', terminals: ['rm420:mc420a:in:acb:in', 'rm420:mc420a:in:acb:out'], conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [['rm420:mc420a:in:acb:in', 'rm420:mc420a:in:acb:out']] }], ...claim };
  const bus: Asset = { id: 'rm420:mc420a:bus', label: 'MC420A final LV bus\n415 VAC / 2600 A', aliases: ['SR420-MC420A', 'MC420A', '415 VAC', '2600 A', '80 kA for 1 sec'], kind: 'bus', terminals: ['rm420:mc420a:bus:bar'], conductivePairs: [], positions: [], ...claim };
  model.assets.push(acb, bus); model.starting.devices[acb.id] = null;
  (model.interlocks ??= { reviews: [], rules: [] }).reviews.push({ assetId: acb.id, status: 'unresolved', note: 'Complete physical interlocks and installed/withdrawal positions remain unconfirmed. The source does not confirm switching is permitted; actual baseline is null.', evidence: [lvReference] });
  model.connections.push({ id: 'ep:h10:mc420a:incoming', from: incomingInterface.terminals[0], to: acb.terminals[0], ...claim }, { id: 'ep:h10:mc420a:bar', from: acb.terminals[1], to: bus.terminals[0], ...claim });
  (model.boundaries ??= []).push({ id: 'rm420:mc420a:bus:coverage', terminal: bus.terminals[0], label: 'MC420A first LV bar represented; installed source/backfeed and independent earth coverage remain unconfirmed', sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
  incomingInterface.label = 'MC420A · LV incoming\n0005 rev1 detail'; incomingInterface.knowledge = 'supported';
  incomingInterface.aliases = ['MC420A', 'SR420-MC420A', 'SR420-MC420A-P01', '520CBC0007-2130-DR-EL-0005'];
  incomingInterface.evidenceIds = [...(incomingInterface.evidenceIds ?? []), 'EP-H10-LV-ENDPOINT'];
  incomingInterface.reviewIds = [...(incomingInterface.reviewIds ?? []), 'EP-H10-LV-INSTALLED'];
  const continuation = model.connections.find(connection => connection.from === 'rm420:tf420b:secondary' && connection.to === incomingInterface.terminals[0])!;
  continuation.knowledge = 'supported'; continuation.evidenceIds = [...(continuation.evidenceIds ?? []), 'EP-H10-LV-ENDPOINT']; continuation.reviewIds = [...(continuation.reviewIds ?? []), 'EP-H10-LV-INSTALLED'];
  const oldGap = model.evidence!.find(record => record.id === 'H10-MC420A-GAP');
  if (oldGap) {
    oldGap.status = 'supported'; oldGap.summary = 'Earlier construction retained only the0003 TF420B continuationB/interface. Supplemental0005 revision1 now explicitly depicts SR420-MC420A, FROM SS420-TF420B, ACB01 MAIN SWITCH2000A and the first415VAC2600A phase bar. Installed revision precedence, actual positions, complete interlocks and winding transfer/earth policies remain unconfirmed.0004 is the separate MC420 MV sheet; DB420 auxiliary references are outgoing/control scope, not substitute LV main buses.';
    oldGap.references.push(lvReference);
  }
  const endpointReview = model.reviews!.find(review => review.id === 'H10-Q03');
  if (endpointReview) {
    endpointReview.question = 'Supplemental0005 revision1 now supplies MC420A ACB01 MAIN SWITCH2000A and its415VAC2600A first LV phase bar. Confirm installed arrangement/revision precedence, complete physical interlocks and supported positions. Transformer transfer/backfeed/earth policies remain open; auxiliary DB420 circuits after the first bar are outside this endpoint scope.';
    endpointReview.evidenceIds.push('EP-H10-LV-ENDPOINT');
  }
  for (const boundary of model.boundaries) if (boundary.terminal === incomingInterface.terminals[0]) boundary.label = 'MC420A supplemental0005 first LV endpoint represented; installed arrangement and source/backfeed/earth policies remain unconfirmed';
  const view: DiagramView = {
    id: 'supplemental/hopper10-lv', label: 'Hopper10 · MC420A first LV bus · 0005 rev1', assetIds: [incomingInterface.id, acb.id, bus.id], bounds: [70, -70, 700, 820], boundaries: [],
    layout: { assets: { [incomingInterface.id]: [400, 120], [acb.id]: [400, 330], [bus.id]: [400, 550] }, terminals: { [incomingInterface.terminals[0]]: [400, 120], [acb.terminals[0]]: [400, 300], [acb.terminals[1]]: [400, 360], [bus.terminals[0]]: [400, 550] }, rotations: { [acb.id]: 90, [bus.id]: 90 }, labelOffsets: { [incomingInterface.id]: [170, 0], [acb.id]: [0, -70], [bus.id]: [0, 60] }, bends: {} },
  };
  const upstreamTarget = previousViews.filter(candidate => candidate.assetIds.includes(transformer.id)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
  if (!upstreamTarget) throw new Error('Hopper10 LV extension requires an existing TF420B view.');
  view.layout.terminals[continuation.from] = [400, 20];
  view.boundaries!.push({ connectionId: continuation.id, remoteAssetId: transformer.id, targetViewId: upstreamTarget.id, position: [400, 20] });
  for (const previous of previousViews) {
    if (previous.id === 'hopper-10/transformers' || previous.id === 'transformers') previous.label = 'Hopper 10 · Selected 33 kV inputs / MC420A LV';
    if (!previous.assetIds.includes(incomingInterface.id)) continue;
    const [x, y] = previous.layout.terminals[incomingInterface.terminals[0]]; const position: [number, number] = [x, y + 90];
    previous.layout.terminals[acb.terminals[0]] = position;
    (previous.layout.labelOffsets ??= {})[incomingInterface.id] = [170, 10];
    (previous.boundaries ??= []).push({ connectionId: 'ep:h10:mc420a:incoming', remoteAssetId: acb.id, targetViewId: view.id, position });
  }
  model.presentation.views.push(view);
  return model;
}
