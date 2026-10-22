import type { Asset, NetworkModel } from '../../session/model';
import type { DiagramLayout, DiagramView } from '../../session/presentation';

type Point = [number, number];
type Claim = Pick<Asset, 'knowledge' | 'evidenceIds' | 'reviewIds'>;
const documents = {
  h3: { document: 'CB16OP038A-02006-DR-EL-0166', revision: '1', page: 1 },
  h8: { document: 'CB17OP023D-01006-DR-EL-0002', revision: '2 (28/01/25; AS FOUND 23.10.23)', page: 1 },
  h8lv: { document: 'CB17OP023D-01006-DR-EL-0003', revision: '1 (20/09/18; AS BUILT)', page: 1 },
};

export function withWesternDetails(base: NetworkModel, version: string): NetworkModel {
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('Western details require the existing source-scoped model presentation.');
  const views = model.presentation.views;
  const previousViews = [...views];
  const newViews: DiagramView[] = [];
  const entryConnections: NetworkModel['connections'] = [];
  const requiredAsset = (id: string) => {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`Western detail requires existing asset ${id}.`);
    return asset;
  };
  const reviewDefinitions = [
    ['WX-INSTALLED', 'Unconfirmed: verify current installed identities, revision precedence, all actual positions and complete electrical/mechanical/Ronis key interlocks. Notes 5/6 do not establish a complete truth table or permit switching.'],
    ['WX-WINDINGS', 'Unconfirmed: reconcile the existing 6.9kV transformer labels with supplemental 6.6kV phase bars and confirm source/backfeed and independent earth policies. No transformer relationships are changed by endpoint construction.'],
    ['WX-FUSES', 'Unconfirmed: verify each depicted 100A phase fuse condition/removal. Intact continuity is a provisional candidate only.'],
  ];
  for (const [id, question] of reviewDefinitions) (model.reviews ??= []).push({ id, question, status: 'open', evidenceIds: [] });
  function fact(id: string, summary: string, source: keyof typeof documents, region: string, provisional = false): Claim {
    (model.evidence ??= []).push({ id, summary, status: provisional ? 'provisional' : 'supported', references: [{ ...documents[source], clause: `Drawing region: ${region}` }] });
    return { knowledge: provisional ? 'provisional' : 'supported', evidenceIds: [id], reviewIds: ['WH-Q01', 'WH-Q07', 'WX-INSTALLED', 'WX-WINDINGS', ...(provisional ? ['WX-FUSES'] : [])] };
  }
  function add(asset: Asset) { model.assets.push(asset); return asset; }
  function link(id: string, from: string, to: string, claim: Claim) {
    const connection = { id, from, to, ...claim }; model.connections.push(connection); return connection;
  }
  function control(id: string, label: string, kind: 'breaker' | 'contactor' | 'earth-switch', aliases: string[], claim: Claim) {
    const terminals: [string, string] = [`${id}:a`, `${id}:b`];
    const asset = add({ id, label, kind, aliases, terminals, conductivePairs: [], positions: [{ id: 'open', label: 'Open (candidate)', pairs: [] }, { id: 'closed', label: 'Closed (candidate)', pairs: [[...terminals]] }], ...claim });
    model.starting.devices[id] = null;
    (model.interlocks ??= { reviews: [], rules: [] }).reviews.push({ assetId: id, status: 'unresolved', note: 'Complete physical conditions, exact key/device mapping and installed positions are unconfirmed. Notes 5/6 and drawn interlock glyphs do not confirm switching permission. Actual baseline remains null.', evidence: (claim.evidenceIds ?? []).flatMap(id => model.evidence!.find(record => record.id === id)!.references) });
    return asset;
  }
  function earth(id: string, label: string, from: string, claim: Claim) {
    const asset = control(id, label, 'earth-switch', ['Depicted phase-circuit earth; complete interlock mapping unconfirmed'], claim);
    link(`${id}:branch`, from, asset.terminals[0], claim);
    (model.earths ??= []).push({ id: `${id}:termination`, label: `${label} termination`, terminal: asset.terminals[1], ...claim });
    return asset;
  }
  function place(layout: DiagramLayout, asset: Asset, position: Point, terminals: Point[], offset: Point = [0, -45], rotation = 0) {
    layout.assets[asset.id] = position;
    asset.terminals.forEach((terminal, index) => { layout.terminals[terminal] = terminals[index]; });
    (layout.labelOffsets ??= {})[asset.id] = offset;
    (layout.rotations ??= {})[asset.id] = rotation;
  }
  function mv(hopper: 'h3' | 'h8', number: '3' | '8', motorPrefix: 'SZ003' | 'SZ008') {
    const prefix = `wh:${hopper}:mc416`; const title = `Hopper${number} · MC416`;
    const transformer = requiredAsset(`wh:${hopper}:tf416`);
    const input = requiredAsset(`${prefix}:interface`);
    const depicted = fact(`WX-H${number}-MV`, `${title}: the depicted 6.6kV 200A 25kA/3sec phase bar has a tier 1 VCB 200A and a cable-side earth below that VCB. Motor 1 tiers 2/3 and motor 2 tiers 4/5 each have two parallel 100A-fused RC/FC 400A phase routes meeting at their motor conductor, plus a separate maintenance earth. Both motors are 400kW. Dotted FC/RC auxiliary contacts, CT/VT and 24/48/110/240V control rails do not create additional phase routes or network sources.`, hopper, 'A-D / 2-11, phase bar and tiers 1-5; E-F / 7-11, sizer motor terminations');
    const notes = fact(`WX-H${number}-KEY-NOTES`, 'Source transcription: note5 SIZER MAINTENANCE KEY INTERLOCK (RONIS KEY SYSTEM), KEY CAPTIVE WHEN EARTH SWITCH OFF. Note6 6.9kV HV KEY INTERLOCK, EARTH SWITCH CAN BE CLOSED AFTER EARTH SWITCH UPSTREAM IS CLOSED, KEY CAPTIVE WHEN EARTH SWITCH ON. Exact keys, upstream device mapping and full installed conditions remain unconfirmed; these notes do not confirm switching permission.', hopper, 'G / 1-7, notes5-6; C-D / 4-5 incoming and / 7-11 motor interlock glyphs');
    const claim: Claim = { ...depicted, evidenceIds: [...depicted.evidenceIds!, ...notes.evidenceIds!] };
    const rating = fact(`WX-H${number}-VOLTAGE-REVIEW`, 'Unconfirmed: the supplemental MC416 phase bar is labelled 6.6kV while the existing source-scoped TF416 reference is labelled 6.9kV. Installed voltage, revision precedence, winding/backfeed and independent earth relationships require confirmation.', hopper, 'A / 2-5 phase-bar rating; existing transformer reference retained', true);
    model.evidence!.find(record => record.id === rating.evidenceIds![0])!.references.push(...(transformer.evidenceIds ?? []).flatMap(id => model.evidence!.find(record => record.id === id)?.references ?? []));
    const incoming = control(`${prefix}:in`, `${title}\nIncoming VCB 200 A`, 'breaker', ['VCB 200 A', 'Tier 1'], claim);
    entryConnections.push(link(`${prefix}:supplemental-supply`, input.terminals[0], incoming.terminals[0], claim));
    const incomingEarth = earth(`${prefix}:in-earth`, `${title}\nCable-side earth · note 6`, incoming.terminals[0], claim);
    const bus = add({ id: `${prefix}:bus`, label: `${title}\n6.6 kV MV phase bar`, aliases: ['SS416-MC416', '6.6 kV', '200 A', '25 kA / 3 sec', 'Existing TF416 reference: 6.9 kV; reconciliation unconfirmed'], kind: 'bus', terminals: [`${prefix}:bus:bar`], conductivePairs: [], positions: [], ...claim });
    link(`${prefix}:incoming-bar`, incoming.terminals[1], bus.terminals[0], claim);
    (model.boundaries ??= []).push({ id: `${prefix}:supplemental-coverage`, label: `${title}: 6.6/6.9kV rating, installed source/backfeed and independent earth coverage unconfirmed`, terminal: bus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...rating });
    const overviewLayout: DiagramLayout = { assets: {}, terminals: {}, bends: {} };
    place(overviewLayout, transformer, [160, 560], [[160, 605], [160, 515]], [0, 70]);
    place(overviewLayout, input, [160, 440], [[160, 440]], [-5, 35]);
    place(overviewLayout, incoming, [160, 280], [[160, 315], [160, 245]], [0, -65], 90);
    place(overviewLayout, incomingEarth, [330, 365], [[300, 365], [360, 365]], [0, 65]);
    place(overviewLayout, bus, [600, 120], [[600, 120]], [0, -45], 90);
    overviewLayout.bends![`${prefix}:incoming-bar`] = [[160, 120]];
    overviewLayout.bends![`${prefix}:in-earth:branch`] = [[160, 365]];
    const overviewId = `western-supplemental/${hopper}/mv`;
    const motorViews: DiagramView[] = [];
    for (const motor of [1, 2]) {
      const motorId = `${prefix}:m${motor}`; const tag = `${motorPrefix}-EM0${motor}`;
      const layout: DiagramLayout = { assets: {}, terminals: {}, bends: {} }; const ids = [bus.id];
      place(layout, bus, [450, 100], [[450, 100]], [0, -45], 90);
      const common = add({ id: `${motorId}:common`, label: `${tag}\nCommon phase conductor`, aliases: ['Motor-side junction of the RC and FC phase paths'], kind: 'interface', terminals: [`${motorId}:common:port`], conductivePairs: [], positions: [], ...claim });
      place(layout, common, [450, 530], [[450, 530]], [-180, 60]); ids.push(common.id);
      for (const [role, x] of [['rc', 300], ['fc', 600]] as const) {
        const fuseId = `${motorId}:${role}:fuse`; const terminals: [string, string] = [`${fuseId}:a`, `${fuseId}:b`];
        const continuity = fact(`${fuseId}:continuity`, `Inference: intact continuity is a provisional candidate for the depicted 100A ${tag} ${role.toUpperCase()} phase fuse. Actual condition/removal remains unconfirmed.`, hopper, `B-D / ${motor === 1 ? '7-8, tiers 2/3' : '10-11, tiers 4/5'}, 100A phase fuses`, true);
        const fuse = add({ id: fuseId, label: `${role.toUpperCase()} phase fuse\nContinuity unconfirmed`, aliases: ['100 A phase fuse'], kind: 'interface', terminals, conductivePairs: [[...terminals]], positions: [], ...continuity });
        place(layout, fuse, [x, 230], [[x, 210], [x, 250]], [0, -45]); ids.push(fuse.id);
        const contact = control(`${motorId}:${role}`, `${tag} ${role.toUpperCase()}\n400 A phase contactor`, 'contactor', [role.toUpperCase(), '400 A', 'Exact installed contactor tag unconfirmed'], claim);
        place(layout, contact, [x, 385], [[x, 355], [x, 415]], [role === 'rc' ? -105 : 105, 0], 90); ids.push(contact.id);
        link(`${fuseId}:bar-link`, bus.terminals[0], terminals[0], claim);
        link(`${motorId}:${role}:fuse-contact`, terminals[1], contact.terminals[0], claim);
        link(`${motorId}:${role}:common-link`, contact.terminals[1], common.terminals[0], claim);
        layout.bends![`${fuseId}:bar-link`] = [[x, 100]];
        layout.bends![`${motorId}:${role}:common-link`] = [[x, 530]];
      }
      const maintenanceEarth = earth(`${motorId}:earth`, `${tag}\nMaintenance earth · note 5`, common.terminals[0], claim);
      place(layout, maintenanceEarth, [620, 620], [[590, 620], [650, 620]], [110, 0]); ids.push(maintenanceEarth.id);
      layout.bends![`${motorId}:earth:branch`] = [[450, 620]];
      const motorAsset = add({ id: `${motorId}:motor`, label: `${tag}\n400 kW MV sizer motor`, aliases: [tag, '400 kW', 'MV motor scope endpoint'], kind: 'interface', terminals: [`${motorId}:motor:port`], conductivePairs: [], positions: [], ...claim });
      link(`${motorId}:motor-cable`, common.terminals[0], motorAsset.terminals[0], claim);
      place(layout, motorAsset, [450, 740], [[450, 740]], [0, 45]); ids.push(motorAsset.id);
      motorViews.push({ id: `western-supplemental/${hopper}/motor-${motor}`, label: `Hopper${number} · ${tag} RC/FC phase routes`, assetIds: ids, layout, bounds: [70, 0, 800, 860], boundaries: [] });
    }
    const overview: DiagramView = { id: overviewId, label: `Hopper${number} · MC416 MV overview · 6.6/6.9 kV review`, assetIds: [transformer.id, input.id, incoming.id, incomingEarth.id, bus.id], layout: overviewLayout, bounds: [0, 20, 1180, 720], boundaries: [], regions: motorViews.map((view, index) => ({ id: `motor-${index + 1}`, label: `Motor ${index + 1}\n${motorPrefix}-EM0${index + 1}`, bounds: [index === 0 ? 520 : 830, 280, 280, 240], targetViewId: view.id })) };
    newViews.push(overview, ...motorViews);
    input.label = `Hopper${number} · MC416 MV interface\nSupplemental detail received; installation unconfirmed`;
    input.aliases = ['SS416-MC416', `HOPPER${number}`, documents[hopper].document];
    for (const boundary of model.boundaries ?? []) if (boundary.terminal === input.terminals[0]) boundary.label = `Hopper${number} supplemental MV detail represented; installed source/earth and winding coverage remain unconfirmed`;
  }

  mv('h3', '3', 'SZ003');
  mv('h8', '8', 'SZ008');
  const lvInput = requiredAsset('wh:h8:mc416a:interface');
  const lvTransformer = requiredAsset('wh:h8:tf416a');
  const lvClaim = fact('WX-H8-LV', 'Hopper8 SS416-MC416A: the SS416-TF416A phase continuation marked D feeds MCCB 630A and the 630A 25kA/1sec 415VAC first phase bar. Transformer instrumentation Da, control/protection/CT/VT, neutral/earth and outgoing circuits do not create additional phase relationships. Installed identity, positions, interlocks and independent winding policy remain unconfirmed.', 'h8lv', 'A-C / 8-10, SS416-TF416A continuation D and MCCB 630A; C-D / 1-11, first LV phase bar; H revision 1 dated 20/09/18 AS BUILT');
  const lvIncoming = control('wh:h8:mc416a:in', 'Hopper8 · MC416A\nMCCB 630 A', 'breaker', ['MCCB 630 A', 'SS416-MC416A'], lvClaim);
  const lvBus = add({ id: 'wh:h8:mc416a:bus', label: 'Hopper8 · SS416-MC416A\n415 VAC / 630 A final LV bar', aliases: ['SS416-MC416A', '415 VAC', '630 A', '25 kA / 1 sec'], kind: 'bus', terminals: ['wh:h8:mc416a:bus:bar'], conductivePairs: [], positions: [], ...lvClaim });
  entryConnections.push(link('wh:h8:mc416a:supplemental-supply', lvInput.terminals[0], lvIncoming.terminals[0], lvClaim));
  link('wh:h8:mc416a:incoming-bar', lvIncoming.terminals[1], lvBus.terminals[0], lvClaim);
  (model.boundaries ??= []).push({ id: 'wh:h8:mc416a:supplemental-coverage', label: 'Hopper8 first LV bar: installed source/backfeed and independent earth coverage unconfirmed', terminal: lvBus.terminals[0], sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', ...lvClaim });
  lvInput.label = 'Hopper8 · MC416A LV interface\nSupplemental detail received; installation unconfirmed';
  lvInput.aliases = ['SS416-MC416A', 'HOPPER8', documents.h8lv.document];
  for (const boundary of model.boundaries ?? []) if (boundary.terminal === lvInput.terminals[0]) boundary.label = 'Hopper8 supplemental LV detail represented; installed source/earth and winding coverage remain unconfirmed';
  const lvLayout: DiagramLayout = { assets: {}, terminals: {}, bends: {} };
  place(lvLayout, lvTransformer, [420, 135], [[420, 90], [420, 180]], [0, -45]);
  place(lvLayout, lvInput, [420, 270], [[420, 270]], [-160, 0]);
  place(lvLayout, lvIncoming, [420, 405], [[420, 375], [420, 435]], [160, 0], 90);
  place(lvLayout, lvBus, [420, 640], [[420, 640]], [0, 60], 90);
  newViews.push({ id: 'western-supplemental/h8/lv', label: 'Hopper8 · MC416A first LV bar · 0003 rev1', assetIds: [lvTransformer.id, lvInput.id, lvIncoming.id, lvBus.id], layout: lvLayout, bounds: [70, 0, 720, 820], boundaries: [] });
  for (const [id] of reviewDefinitions) model.reviews!.find(review => review.id === id)!.evidenceIds = model.evidence!.filter(record => record.id.startsWith('WX-') || /^wh:h[38]:mc416:/.test(record.id)).map(record => record.id);
  const partial = model.reviews!.find(review => review.id === 'WH-Q07');
  if (partial) { partial.question = 'Supplemental Hopper3 -0166 revision 1 and Hopper8 -0002 revision 2 / -0003 revision 1 are received and represented through their MV motors and first LV bars. Previously received Hopper3 -0165 first LV detail remains. Installed source-scoped identities, revision precedence, 6.6/6.9kV labels, winding source/backfeed/earth policy and complete physical interlocks remain unconfirmed.'; partial.evidenceIds.push('WX-H3-MV', 'WX-H8-MV', 'WX-H8-LV'); }

  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const allViews = [...previousViews, ...newViews];
  const destination = (assetId: string, excluded: string) => allViews.filter(view => view.id !== excluded && view.assetIds.includes(assetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
  for (const view of newViews) {
    let portal = 0;
    for (const connection of model.connections) {
      const from = owners.get(connection.from)!; const to = owners.get(connection.to)!;
      if (view.assetIds.includes(from) === view.assetIds.includes(to)) continue;
      const local = view.assetIds.includes(from) ? connection.from : connection.to;
      const remote = local === connection.from ? connection.to : connection.from;
      const remoteAssetId = owners.get(remote)!; const target = destination(remoteAssetId, view.id);
      if (!target) throw new Error(`Western detail has no navigation target for ${remoteAssetId}.`);
      let position: Point;
      if (local.endsWith(':hv')) position = [view.layout.terminals[local][0], view.id.endsWith('/mv') ? view.bounds[1] + view.bounds[3] - 35 : view.bounds[1] + 25];
      else if (view.id.endsWith('/mv')) position = [remoteAssetId.includes(':m1:') ? remoteAssetId.includes(':rc:') ? 560 : 700 : remoteAssetId.includes(':rc:') ? 880 : 1020, 230];
      else position = [view.bounds[0] + 80 + portal++ * 220, view.bounds[1] + 25];
      view.layout.terminals[remote] = position;
      view.boundaries!.push({ connectionId: connection.id, remoteAssetId, targetViewId: target.id, position });
    }
  }
  for (const view of previousViews) for (const connection of entryConnections) {
    if (!view.assetIds.includes(owners.get(connection.from)!)) continue;
    const [x, y] = view.layout.terminals[connection.from]; const position: Point = [x, y + 85];
    view.layout.terminals[connection.to] = position;
    (view.boundaries ??= []).push({ connectionId: connection.id, remoteAssetId: owners.get(connection.to)!, targetViewId: destination(owners.get(connection.to)!, view.id)!.id, position });
  }
  views.push(...newViews);
  return model;
}
