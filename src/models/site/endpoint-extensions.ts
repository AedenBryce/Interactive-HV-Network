import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
const sw455Reference = { document: '11098-04400-EL-DR-8020', revision: '3', page: 1, clause: 'Printed 04400-EL-DR-8020; A-B / 4-9 TF455; B-C / 2,10 CB SW455 IN D/Y; C-D / 1-10 separate 690V 2500A phase bars; H / 12 revision3; AS BUILT 17/08/2009.' };
const hopper3Reference = { document: 'CB16OP038A-02006-DR-EL-0165', revision: '1', page: 1, clause: 'A-C / 8-9 SS416-TF416A reference, incoming phase conductor and MCCB630A; C-D / 1-11 SS416-MC416A 630A25kA1Sec3-phaseN&E415VAC phase bar; H / 10-12 title and revision1. Handwritten date unconfirmed.' };
const mc454Reference = { document: '11098-04400-EL-DR-8010', revision: '6', page: 1, clause: 'Printed 04400-EL-DR-8010; A-B / 3-5 SW454 reference and TF454 22kV/400V 2MVA; C-D / 3-5 CB MC454 IN 3000A; D / 1-10 phase bar printed400V500A50kA1sec; H / 12 revision6 IFC 19/11/25. Separate neutral/MEN is not phase continuity.' };

export function withSupplementalEndpoints(base: NetworkModel, version: string): NetworkModel {
  const model = { ...structuredClone(base), version };
  const presentation = model.presentation;
  if (!presentation) throw new Error('Supplemental endpoints require the existing model presentation.');
  const views = presentation.views;
  const previousViews = [...presentation.views];
  const requiredAsset = (id: string) => {
    const asset = model.assets.find(item => item.id === id);
    if (!asset) throw new Error(`Supplemental endpoint requires existing asset ${id}.`);
    return asset;
  };
  const sw455Interface = requiredAsset('sw454:interface:sw455');
  const sw455Transformer = requiredAsset('sw454:tf455:transformer');
  const claim: Claim = { knowledge: 'supported', evidenceIds: ['EP-SW455-ENDPOINTS'], reviewIds: ['SW-R05', 'EP-INSTALLED-REVIEW'] };
  (model.evidence ??= []).push({ id: 'EP-SW455-ENDPOINTS', status: 'supported', summary: 'Supplemental PIMS image-bearing source depicts TF455 22kV/690V/690V 5MVA, separate CB SW455 IN D and IN Y rated 2500A, and distinct D/Y 690V 2500A phase bars. Only the first LV bars are represented. Drawn screen earth and control/CT circuits do not create phase-earth paths. Installed precedence, positions, interlocks and transformer transfer policies remain unconfirmed.', references: [sw455Reference] });
  (model.reviews ??= []).push({ id: 'EP-INSTALLED-REVIEW', status: 'open', question: 'Confirm supplemental drawings against the installed arrangement and governing revisions, all incoming-device states/positions/physical interlocks and independent transformer source/backfeed/earth policies. Source depiction and software construction do not establish acceptance or switching permission.', evidenceIds: ['EP-SW455-ENDPOINTS'] });
  const layout: DiagramLayout = { assets: {}, terminals: {}, rotations: {}, labelOffsets: {}, bends: {} };
  const place = (asset: Asset, point: Point, terminals: Point[]) => {
    layout.assets[asset.id] = point;
    asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminals[index]; });
  };
  place(sw455Transformer, [470, 100], [[470, 60], [300, 160], [640, 160]]);
  place(sw455Interface, [470, 240], [[300, 240], [640, 240]]);
  const ids = [sw455Transformer.id, sw455Interface.id];
  const addedConnections: NetworkModel['connections'] = [];
  const addLink = (id: string, from: string, to: string) => {
    const connection = { id, from, to, ...claim };
    model.connections.push(connection); addedConnections.push(connection);
  };
  for (const [side, x] of [['d', 300], ['y', 640]] as const) {
    const id = `sw455:in-${side}:cb`; const terminals: [string, string] = [`${id}:a`, `${id}:b`];
    const cb: Asset = { id, label: `CB SW455 IN ${side.toUpperCase()}\n2500 A`, aliases: [`CB SW455 IN ${side.toUpperCase()}`, '2500 A'], kind: 'breaker', terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [[...terminals]] }], ...claim };
    model.assets.push(cb); model.starting.devices[id] = null; ids.push(id);
    place(cb, [x, 370], [[x, 340], [x, 400]]); layout.rotations![id] = 90; layout.labelOffsets![id] = [0, -70];
    const bus: Asset = { id: `sw455:bus-${side}`, label: `SW455 ${side.toUpperCase()}\n690 V / 2500 A final LV bus`, aliases: ['SW455', '690 V', '2500 A', side === 'd' ? 'Delta phase bar' : 'Y phase bar'], kind: 'bus', terminals: [`sw455:bus-${side}:bar`], conductivePairs: [], positions: [], ...claim };
    model.assets.push(bus); ids.push(bus.id); place(bus, [x, 560], [[x, 560]]); layout.rotations![bus.id] = 90; layout.labelOffsets![bus.id] = [0, 60];
    addLink(`ep:sw455:${side}:incoming`, `sw454:interface:sw455:${side}`, terminals[0]);
    addLink(`ep:sw455:${side}:bar`, terminals[1], bus.terminals[0]);
    (model.interlocks ??= { reviews: [], rules: [] }).reviews.push({ assetId: id, status: 'unresolved', note: 'Complete physical interlocks and installed positions are unconfirmed. The source does not confirm switching is permitted. Actual baseline remains null.', evidence: [sw455Reference] });
    (model.boundaries ??= []).push({ id: `${bus.id}:coverage`, label: 'Final LV phase bar: complete installed source/backfeed and earth coverage unconfirmed', terminal: bus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...claim });
  }
  sw455Interface.label = 'SW455 D/Y interface\n8020 supplemental endpoints';
  sw455Interface.aliases = ['SW455', '04400-EL-DR-8020 supplemental endpoint detail'];
  sw455Transformer.label = sw455Transformer.label.replace(' · detail missing', '');
  const gap = model.evidence!.find(record => record.id === 'SW-TF455-MISSING-LV');
  if (gap) { gap.summary = 'Earlier construction used 8001/overview references while 8020 was unavailable. Supplemental 8020 revision 3 now depicts the separate SW455 D/Y incomers and phase bars. Installed precedence, accepted transformer policy, current states and complete physical interlocks remain unconfirmed; original references are retained.'; gap.references.push(sw455Reference); }
  const review = model.reviews!.find(record => record.id === 'SW-R05');
  if (review) { review.question = 'Supplemental 8020 revision 3 now supplies SW455 D/Y 2500A incomers and 690V 2500A bars. Confirm installed arrangement, revision precedence, source/backfeed/earth policy, current states and complete physical interlocks.'; review.evidenceIds.push('EP-SW455-ENDPOINTS'); }
  for (const boundary of model.boundaries ?? []) if (boundary.terminal.startsWith('sw454:interface:sw455:')) boundary.label = 'SW455 supplemental 8020 endpoint represented; installed source/backfeed and earth coverage remain unconfirmed';

  const h3Interface = requiredAsset('wh:h3:mc416a:interface');
  const h3Transformer = requiredAsset('wh:h3:tf416a');
  const h3Claim: Claim = { knowledge: 'supported', evidenceIds: ['EP-H3-LV-ENDPOINT'], reviewIds: ['WH-Q01', 'WH-Q07', 'EP-INSTALLED-REVIEW'] };
  model.evidence!.push({ id: 'EP-H3-LV-ENDPOINT', status: 'supported', summary: 'Supplemental -0165 revision 1 depicts the source-scoped Hopper3 SS416-TF416A reference connected through MCCB 630A to the SS416-MC416A 630A 415VAC first phase bar. SS416-PN01 remote switching, CT/protection, neutral/earth and outgoing circuits do not create additional phase connections. Handwritten revision date, installed precedence, interlocks and winding policies remain unconfirmed. Hopper8 SS416 retains its separate source-scoped identity.', references: [hopper3Reference] });
  model.reviews!.find(record => record.id === 'EP-INSTALLED-REVIEW')!.evidenceIds.push('EP-H3-LV-ENDPOINT');
  const h3Cb: Asset = { id: 'wh:h3:mc416a:in', label: 'SS416-MC416A\nMCCB 630 A', aliases: ['MCCB 630 A', 'SS416-MC416A'], kind: 'breaker', terminals: ['wh:h3:mc416a:in:a', 'wh:h3:mc416a:in:b'], conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [['wh:h3:mc416a:in:a', 'wh:h3:mc416a:in:b']] }], ...h3Claim };
  const h3Bus: Asset = { id: 'wh:h3:mc416a:bus', label: 'Hopper3 · SS416-MC416A\n415 VAC / 630 A final LV bus', aliases: ['SS416-MC416A', '415 VAC', '630 A', 'CB16OP038A Hopper3'], kind: 'bus', terminals: ['wh:h3:mc416a:bus:bar'], conductivePairs: [], positions: [], ...h3Claim };
  model.assets.push(h3Cb, h3Bus); model.starting.devices[h3Cb.id] = null;
  model.interlocks!.reviews.push({ assetId: h3Cb.id, status: 'unresolved', note: 'Unconfirmed complete physical interlocks, remote switching restrictions and installed positions. The source does not confirm switching is permitted; baseline remains null.', evidence: [hopper3Reference] });
  model.boundaries!.push({ id: `${h3Bus.id}:coverage`, label: 'Hopper3 first LV bar: installed source/backfeed and independent earth coverage unconfirmed', terminal: h3Bus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...h3Claim });
  const h3Connections: NetworkModel['connections'] = [
    { id: 'ep:h3:mc416a:incoming', from: h3Interface.terminals[0], to: h3Cb.terminals[0], ...h3Claim },
    { id: 'ep:h3:mc416a:bar', from: h3Cb.terminals[1], to: h3Bus.terminals[0], ...h3Claim },
  ];
  model.connections.push(...h3Connections);
  h3Interface.label = 'Hopper3 · SS416-MC416A interface\n0165 supplemental LV detail';
  h3Interface.aliases = ['SS416-MC416A', 'CB16OP038A-02006-DR-EL-0165', 'HOPPER3'];
  const h3Review = model.reviews!.find(record => record.id === 'WH-Q07');
  if (h3Review) { h3Review.question = 'Supplemental Hopper3 -0165 revision 1 now depicts the MC416A 630A 415VAC first LV bar and MCCB 630A. Hopper3 MV -0166 and Hopper8 CB17OP023D -0002/-0003 coverage remain unconfirmed; reconcile repeated SS416 identities, installed precedence and complete physical interlocks.'; h3Review.evidenceIds.push('EP-H3-LV-ENDPOINT'); }
  for (const boundary of model.boundaries ?? []) if (boundary.terminal === h3Interface.terminals[0]) boundary.label = 'Hopper3 supplemental 0165 LV endpoint represented; installed source/backfeed and earth coverage remain unconfirmed';
  const h3Layout: DiagramLayout = { assets: { [h3Transformer.id]: [400, 100], [h3Interface.id]: [400, 230], [h3Cb.id]: [400, 370], [h3Bus.id]: [400, 560] }, terminals: { [h3Transformer.terminals[0]]: [400, 60], [h3Transformer.terminals[1]]: [400, 150], [h3Interface.terminals[0]]: [400, 230], [h3Cb.terminals[0]]: [400, 340], [h3Cb.terminals[1]]: [400, 400], [h3Bus.terminals[0]]: [400, 560] }, rotations: { [h3Cb.id]: 90, [h3Bus.id]: 90 }, labelOffsets: { [h3Cb.id]: [0, -70], [h3Bus.id]: [0, 60] }, bends: {} };

  const mcInterface = requiredAsset('sw454:interface:mc454-mc455');
  const mcTransformer = requiredAsset('sw454:tf454:transformer');
  const mcClaim: Claim = { knowledge: 'supported', evidenceIds: ['EP-MC454-ENDPOINT'], reviewIds: ['SW-R04', 'EP-MC454-RATING', 'EP-INSTALLED-REVIEW'] };
  model.evidence!.push({ id: 'EP-MC454-ENDPOINT', status: 'supported', summary: 'Supplemental 8010 revision 6 IFC depicts SW454 feeding TF454 22kV/400V 2MVA, CB MC454 IN labelled 3000A, and the MC454 phase bar labelled 400V,500A,50kA1sec. Both ratings are retained without correction. Neutral/MEN is separate; MC455 is an outgoing branch beyond this first LV bar, not another required endpoint. Installed arrangement, rating reconciliation and IFC precedence remain unconfirmed.', references: [mc454Reference] });
  model.reviews!.push({ id: 'EP-MC454-RATING', status: 'open', question: 'Unconfirmed: reconcile the 8010 revision 6 printed 3000 A incoming breaker with the printed 500 A phase bar, and confirm the current installed arrangement and IFC revision precedence. The source does not confirm a corrected rating.', evidenceIds: ['EP-MC454-ENDPOINT'] });
  model.reviews!.find(record => record.id === 'EP-INSTALLED-REVIEW')!.evidenceIds.push('EP-MC454-ENDPOINT');
  const mcCb: Asset = { id: 'mc454:in:cb', label: 'CB MC454 IN\n3000 A printed', aliases: ['CB MC454 IN', '3000 A'], kind: 'breaker', terminals: ['mc454:in:cb:a', 'mc454:in:cb:b'], conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [['mc454:in:cb:a', 'mc454:in:cb:b']] }], ...mcClaim };
  const mcBus: Asset = { id: 'mc454:bus', label: 'MC454 final LV bus\n400 V / 500 A printed\nRating discrepancy unconfirmed', aliases: ['MC454', '400 V', '500 A printed', '50 kA for 1 sec printed'], kind: 'bus', terminals: ['mc454:bus:bar'], conductivePairs: [], positions: [], ...mcClaim };
  model.assets.push(mcCb, mcBus); model.starting.devices[mcCb.id] = null;
  model.interlocks!.reviews.push({ assetId: mcCb.id, status: 'unresolved', note: 'Unconfirmed complete physical interlocks and installed positions. The IFC drawing and breaker glyph do not confirm switching permission; actual baseline remains null.', evidence: [mc454Reference] });
  model.boundaries!.push({ id: `${mcBus.id}:coverage`, label: 'MC454 first LV bar: installed source/backfeed and independent earth coverage unconfirmed', terminal: mcBus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...mcClaim });
  const mcConnections: NetworkModel['connections'] = [
    { id: 'ep:mc454:incoming', from: mcInterface.terminals[0], to: mcCb.terminals[0], ...mcClaim },
    { id: 'ep:mc454:bar', from: mcCb.terminals[1], to: mcBus.terminals[0], ...mcClaim },
  ];
  model.connections.push(...mcConnections);
  mcInterface.label = 'MC454 interface\n8010 supplemental LV detail';
  mcInterface.aliases = ['MC454', '04400-EL-DR-8010', 'MC455 shown as downstream outgoing branch'];
  mcTransformer.label = mcTransformer.label.replace(' · LV detail missing', '');
  const mcGap = model.evidence!.find(record => record.id === 'SW-TF454-MISSING-LV');
  if (mcGap) { mcGap.summary = 'Earlier construction lacked 8010 and retained an MC454/MC455 coverage interface from the overview. Supplemental 8010 revision 6 IFC now depicts the MC454 first LV phase bar and CB MC454 IN; MC455 is shown as a downstream outgoing branch. Original source references are retained. The printed 3000 A breaker / 500 A bar discrepancy, installed arrangement and IFC precedence remain unconfirmed.'; mcGap.references.push(mc454Reference); }
  const mcReview = model.reviews!.find(record => record.id === 'SW-R04');
  if (mcReview) { mcReview.question = 'Supplemental 8010 revision 6 IFC supplies MC454 incoming CB and first LV phase bar; MC455 is drawn downstream and excluded after that endpoint. Confirm the installed arrangement, IFC precedence, 3000 A versus 500 A ratings and complete interlocks. 8011 continuation is not required to extend outgoing LV circuits.'; mcReview.evidenceIds.push('EP-MC454-ENDPOINT'); }
  for (const boundary of model.boundaries ?? []) if (boundary.terminal === mcInterface.terminals[0]) boundary.label = 'MC454 supplemental 8010 endpoint represented; installed source/backfeed and earth coverage remain unconfirmed';
  const mcLayout: DiagramLayout = { assets: { [mcTransformer.id]: [400, 100], [mcInterface.id]: [400, 230], [mcCb.id]: [400, 370], [mcBus.id]: [400, 560] }, terminals: { [mcTransformer.terminals[0]]: [400, 60], [mcTransformer.terminals[1]]: [400, 150], [mcInterface.terminals[0]]: [400, 230], [mcCb.terminals[0]]: [400, 340], [mcCb.terminals[1]]: [400, 400], [mcBus.terminals[0]]: [400, 560] }, rotations: { [mcCb.id]: 90, [mcBus.id]: 90 }, labelOffsets: { [mcCb.id]: [0, -70], [mcBus.id]: [0, 70] }, bends: {} };

  const view: DiagramView = { id: 'supplemental/sw455-lv', label: 'SW455 · separate D/Y final LV bars · 8020 rev3', assetIds: ids, layout, bounds: [60, -70, 820, 820], boundaries: [] };
  addDetail(view, addedConnections);
  addDetail({ id: 'supplemental/hopper3-lv', label: 'Hopper3 · SS416-MC416A final LV · 0165 rev1', assetIds: [h3Transformer.id, h3Interface.id, h3Cb.id, h3Bus.id], layout: h3Layout, bounds: [70, -70, 660, 820], boundaries: [] }, h3Connections);
  addDetail({ id: 'supplemental/mc454-lv', label: 'MC454 · first LV bar · 8010 rev6 IFC · ratings unconfirmed', assetIds: [mcTransformer.id, mcInterface.id, mcCb.id, mcBus.id], layout: mcLayout, bounds: [70, -70, 660, 850], boundaries: [] }, mcConnections);
  return model;

  function addDetail(view: DiagramView, entryConnections: NetworkModel['connections']) {
    const ids = view.assetIds; const layout = view.layout;
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    for (const connection of model.connections) {
      const from = owners.get(connection.from)!; const to = owners.get(connection.to)!;
      if (ids.includes(from) === ids.includes(to)) continue;
      const local = ids.includes(from) ? connection.from : connection.to; const remote = local === connection.from ? connection.to : connection.from;
      const remoteAssetId = owners.get(remote)!;
      const target = previousViews.filter(candidate => candidate.assetIds.includes(remoteAssetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
      if (!target) throw new Error(`Missing upstream view for ${remoteAssetId}.`);
      const [x, y] = layout.terminals[local]; const position: Point = [x, y - 80];
      layout.terminals[remote] = position;
      view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target.id, position });
    }
    for (const previous of previousViews) for (const connection of entryConnections) {
      if (!previous.assetIds.includes(owners.get(connection.from)!) || previous.assetIds.includes(owners.get(connection.to)!)) continue;
      const [x, y] = previous.layout.terminals[connection.from]; const position: Point = [x, y + 90];
      previous.layout.terminals[connection.to] = position;
      (previous.boundaries ??= []).push({ connectionId: connection.id, remoteAssetId: owners.get(connection.to)!, targetViewId: view.id, position });
    }
    views.push(view);
  }
}
