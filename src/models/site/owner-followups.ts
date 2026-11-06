import type { NetworkModel } from '../../session/model';
import type { DiagramView } from '../../session/presentation';
import { recordDecision, removeAssets, tidyPresentation } from './owner-scope-connections';

export function withOwnerFollowups(base: NetworkModel, version: string): NetworkModel {
  const scopeId = 'WN-RM718-WATER-SCOPE';
  if (base.evidence?.some(record => record.id === scopeId)) throw new Error('Later owner confirmations already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('Owner followups require the existing presentation.');
  recordDecision(model, scopeId, 'RM718/TF718/SW718 excluded. SW441/TF441/MC441 should be included', 'Owner excludes the RM718/TF718/SW718 railcar/fuel-unloading branch and explicitly includes SW441/TF441/MC441 Water Tower/Process Water. This confirms model scope only, not the water source, actual positions, winding policies or physical interlocks. Earlier exact scope answers remain historical records.');
  removeAssets(model, new Set(model.assets.filter(asset => /^mine:(rm718|sw718)/.test(asset.id) || asset.id === 'mine:interface:rm718-pole').map(asset => asset.id)), scopeId);
  for (const view of model.presentation.views) {
    if (view.id === 'mine-camp/overview') view.label = 'Water Tower / Process Water · included · source unconfirmed';
    for (const region of view.regions ?? []) if (region.id === 'mine-camp') region.label = 'Water Tower\nProcess Water';
  }
  const rm713Id = 'WN-RM721-RM713-IN01';
  recordDecision(model, rm713Id, 'RM721 does still feed RM713 and it is still connected at both ends. It connect at RM713 to SF RM713 IN01', 'Owner confirms the current RM721 to SF RM713 IN01 connection at both ends. The answer does not establish the separate former RM712 IN01 cable status, cable tag, actual positions, availability or interlocks.');
  const rm713Cable = model.connections.find(connection => connection.id === 'rm721:current-rm713-cable');
  if (!rm713Cable || rm713Cable.from !== 'rm721:rm713:b' || rm713Cable.to !== 'rm713:in01:a') throw new Error('Owner RM713 decision requires the existing source-backed RM721 / RM713 IN01 endpoints.');
  rm713Cable.knowledge = 'owner-confirmed'; rm713Cable.evidenceIds = [...(rm713Cable.evidenceIds ?? []), rm713Id]; rm713Cable.reviewIds = [...(rm713Cable.reviewIds ?? []), rm713Id];
  const rm713Review = model.reviews!.find(review => review.id === 'SV-Q04')!;
  rm713Review.question = 'Current RM721 to SF RM713 IN01 is owner-confirmed at both ends. The former RM712 IN01 / RM713-P-01 cable current connection remains unanswered; do not infer its removal or a confirmed parallel feed. Starting states, availability and physical interlocks remain unconfirmed.';
  rm713Review.evidenceIds.push(rm713Id);
  const tf712Id = 'WN-TF712-LV-CONNECTED';
  recordDecision(model, tf712Id, 'TF712 LV cables are currently connected to SW712.', 'Owner confirms the current coarse TF712 LV cable connection to SW712. The exact entry point relative to MCS, incoming breaker and DG1/DG7 is not confirmed. The old disconnected/pulled-out drawing note remains historical source evidence, not the current physical condition. No executable bypass, transfer matrix, baseline or permission is inferred.');
  const cableEnd = model.assets.find(asset => asset.id === 'rm712:tf712:removed-lv-cable-end')!;
  cableEnd.aliases = [...(cableEnd.aliases ?? []), `Historical drawing caption: ${cableEnd.label}`];
  cableEnd.label = 'TF712 LV cables\nConnected to SW712 · owner confirmed\nExact entry point unconfirmed';
  cableEnd.knowledge = 'unresolved'; cableEnd.evidenceIds = [...(cableEnd.evidenceIds ?? []), tf712Id];
  for (const boundary of model.boundaries?.filter(boundary => cableEnd.terminals.includes(boundary.terminal)) ?? []) {
    boundary.label = 'TF712 LV cables connected to SW712: exact entry point relative to MCS/incomer/DGs and independent earth coverage unconfirmed; no executable continuation inferred';
    boundary.knowledge = 'unresolved'; boundary.evidenceIds = [...(boundary.evidenceIds ?? []), tf712Id];
  }
  const tf712Question = 'TF712 LV cables are owner-confirmed currently connected to SW712. Confirm exact entry point relative to MCS/incoming breaker/DG1(6207)/DG7(6206), present DG connection/availability, selector contact matrix, neutral switching and actual positions/interlocks. The former disconnected/pulled-out note is historical drawing evidence, not current physical condition. No direct bus or incomer bypass is represented.';
  for (const reviewId of ['SV-Q05', 'DES-Q01']) {
    const review = model.reviews!.find(review => review.id === reviewId)!;
    review.question = `${reviewId === 'DES-Q01' ? 'RM721 to RM712 IN02 is owner-confirmed; no SW426 bay is inferred. ' : ''}${tf712Question}`; review.evidenceIds.push(tf712Id);
  }
  const servicesMarker = model.assets.find(asset => asset.id === 'sw426:interface:sw712')!;
  servicesMarker.label = 'SW712 Services · TF712 LV connected\nEntry / DG / MCS arrangement unconfirmed';
  servicesMarker.evidenceIds = [...(servicesMarker.evidenceIds ?? []), tf712Id];
  for (const view of model.presentation.views) if (view.id === 'services/mine-services') view.label = 'RM712 / SW712 · TF712 LV connected · entry / MCS unconfirmed';
  const mc431aId = 'WN-MC431A-SCOPE';
  recordDecision(model, mc431aId, 'MC431A is an LV switchboard that is fed from MC431. Not required for this tool.', 'Owner confirms MC431A is an LV switchboard fed downstream from MC431 and excluded from this tool. Resolution concerns MC431A identity and scope only; other Crushing 1 drawing discrepancies, actual states and interlocks remain separate.');
  const mc431aReview = model.reviews!.find(review => review.id === 'C1-R01')!;
  mc431aReview.status = 'resolved'; mc431aReview.resolution = model.evidence!.find(record => record.id === mc431aId)!.confirmation!; mc431aReview.evidenceIds.push(mc431aId);
  mc431aReview.question = 'MC431A is owner-confirmed downstream LV from MC431 and excluded beyond the first MC431 phase bus. No additional modeled endpoint or upstream supply is created.';
  for (const asset of model.assets) if (asset.aliases?.includes('MC431 phase bar; MC431A coverage unresolved')) {
    asset.aliases = asset.aliases.filter(alias => alias !== 'MC431 phase bar; MC431A coverage unresolved');
    asset.aliases.push('MC431 first phase bar; owner-confirmed downstream MC431A excluded'); asset.evidenceIds = [...(asset.evidenceIds ?? []), mc431aId];
  }
  const in01Id = 'WN-RM712-IN01-UNCONNECTED';
  recordDecision(model, in01Id, 'nothing is connected.', 'In answer to the former RM712 IN01 external-cable question, owner confirms nothing is connected. No external cable/source is attached to that incoming terminal. This does not set the switch open, establish its internal earth mechanism or remove the separately confirmed RM721 to RM713 IN01 route.');
  model.connections = model.connections.filter(connection => connection.id !== 'rm712:former-rm713-cable');
  const former = model.assets.find(asset => asset.id === 'rm712:interface:former-rm713')!;
  former.aliases = [...(former.aliases ?? []), `Historical reference caption: ${former.label}`]; former.label = 'Historical former RM713 cable reference\nRM712 IN01 has no external cable attached';
  former.evidenceIds = [...(former.evidenceIds ?? []), in01Id];
  (model.boundaries ??= []).push({ id: 'owner:rm712:in01:no-external-cable', label: 'Owner confirms no external cable attached at RM712 IN01; no external supply at this input. Internal switching and earth mechanism remain unconfirmed.', terminal: 'rm712:in01:a', sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed', evidenceIds: [in01Id], reviewIds: [in01Id] });
  rm713Review.status = 'resolved'; rm713Review.resolution = model.evidence!.find(record => record.id === in01Id)!.confirmation!; rm713Review.evidenceIds.push(in01Id);
  rm713Review.question = 'RM721 to SF RM713 IN01 is owner-confirmed connected at both ends; owner separately confirms nothing is connected to RM712 IN01. Resolution is scoped to these external cable connections; control states, mechanisms and interlocks remain separately unresolved.';
  const incomerId = 'WN-TF712-SW712-INCOMER';
  recordDecision(model, incomerId, 'a the SW712 incomer. Ignore changeover switch for this', 'Owner identifies TF712 LV connection at the SW712 incoming breaker and excludes the MCS/DG alternative assembly from this tool. Exclusion is represented scope, not physical removal or a claim about disconnected DG equipment. The TF712 path retains CB SW712 IN in series, with no bus bypass, state or interlock permission inferred.');
  removeAssets(model, new Set(['rm712:dg1', 'rm712:dg7', 'rm712:mcs']), incomerId);
  model.connections.push({ id: 'owner:tf712-sw712-incoming', from: 'rm712:tf712:removed-lv-cable-end:port', to: 'rm712:sw712:cb:a', knowledge: 'owner-confirmed', evidenceIds: [tf712Id, incomerId], reviewIds: [incomerId] });
  cableEnd.label = 'TF712 LV cables\nConnected to CB SW712 IN\nEntry owner-confirmed';
  cableEnd.evidenceIds!.push(incomerId);
  for (const boundary of model.boundaries?.filter(boundary => cableEnd.terminals.includes(boundary.terminal)) ?? []) boundary.label = 'TF712 LV to CB SW712 IN entry is owner-confirmed; winding/backfeed, independent earth, actual state and interlocks remain unconfirmed';
  for (const reviewId of ['SV-Q05', 'DES-Q01']) {
    const review = model.reviews!.find(review => review.id === reviewId)!;
    review.question = `${reviewId === 'DES-Q01' ? 'RM721 to RM712 IN02 is owner-confirmed; old SW426 reference is historical. ' : ''}TF712 LV cables are owner-confirmed connected at CB SW712 IN; MCS/DG alternative assembly is owner-excluded from current scope. Confirm retained transformer/backfeed/independent earth policies, SW712/MC712 naming and actual positions/physical interlocks. The disconnected/pulled-out note remains historical drawing evidence. No MCS matrix or excluded DG availability is required for this scoped model.`;
    review.evidenceIds.push(incomerId);
  }
  servicesMarker.label = 'SW712 Services · TF712 to incoming CB\nMCS / alternative DG assembly outside scope'; servicesMarker.evidenceIds!.push(incomerId);
  for (const view of model.presentation.views) if (view.id === 'services/mine-services') view.label = 'RM712 / SW712 · TF712 to incoming CB · owner confirmed';
  addWaterSpur(model);
  const spareId = 'WN-TF436-SPARE';
  recordDecision(model, spareId, 'TF436 is a spare cubicle. Nothing installed', 'In response to installed TF436/MC436 versus unused spare-feeder/no downstream transformer or cable, owner confirms spare cubicle with nothing installed. No downstream TF436/MC436 or cable is represented. This answer does not confirm whether the depicted CB/ES hardware is installed or any physical state/interlock permission; those drawing-based control candidates stay provisional and blocked.');
  model.connections = model.connections.filter(connection => connection.id !== 'sw435:tf436:future-continuation');
  const spareMarker = model.assets.find(asset => asset.id === 'sw435:interface:mc436')!;
  spareMarker.aliases = [...(spareMarker.aliases ?? []), `Historical future caption: ${spareMarker.label}`]; spareMarker.label = 'TF436 · spare cubicle\nNo installed downstream TF / MC / cable\nHistorical future reference only'; spareMarker.evidenceIds = [...(spareMarker.evidenceIds ?? []), spareId];
  for (const id of ['sw435:tf436:hv-cb', 'sw435:tf436:hv-es']) {
    const asset = model.assets.find(asset => asset.id === id)!;
    asset.label = `TF436 spare cubicle\n${id.endsWith('hv-cb') ? 'CB' : 'ES'} hardware / state unconfirmed`; asset.evidenceIds = [...(asset.evidenceIds ?? []), spareId];
  }
  const spareReview = model.reviews!.find(review => review.id === 'C2-R01')!;
  spareReview.status = 'resolved'; spareReview.resolution = model.evidence!.find(record => record.id === spareId)!.confirmation!; spareReview.evidenceIds.push(spareId); spareReview.question = 'Owner confirms TF436 spare cubicle and no installed downstream transformer/MC/cable. Resolution is confined to installed downstream extent; CB/ES hardware, mechanism/state and interlock confirmation remain separate under C2-R11.';
  for (const boundary of model.boundaries?.filter(boundary => spareMarker.terminals.includes(boundary.terminal)) ?? []) boundary.label = 'Historical future TF436/MC436 reference only; owner confirms no installed downstream equipment/cable. No additional LV endpoint is required.';
  const sw453Id = 'WN-SW453-INSTALLED';
  recordDecision(model, sw453Id, 'Yes, installed and connected', 'Owner answered "Yes, installed and connected" to whether TF453/SW453 is installed and connected to SW435 tier8. This confirms the branch installed connection only. Historical FUTURE drawing text remains traceable; D/Y winding source/reverse transfer, independent earth, rating/title/control aliases, actual state, source availability and physical interlocks remain unconfirmed.');
  for (const edge of model.connections.filter(connection => ['sw435:tf453:bus-link', 'sw435:tf453:cable-TF453-P-01'].includes(connection.id) || connection.id.startsWith('sw435:sw453:'))) {
    edge.knowledge = 'owner-confirmed'; edge.evidenceIds = [...(edge.evidenceIds ?? []), sw453Id]; edge.reviewIds = [...(edge.reviewIds ?? []), sw453Id];
  }
  for (const asset of model.assets.filter(asset => asset.id === 'sw435:tf453:transformer' || asset.id.startsWith('sw435:sw453:'))) {
    asset.aliases = [...(asset.aliases ?? []), 'TF453/SW453 installed connection from SW435 tier8 owner-confirmed; FUTURE is historical drawing text']; asset.evidenceIds = [...(asset.evidenceIds ?? []), sw453Id];
  }
  const sw453Review = model.reviews!.find(review => review.id === 'C2-R02')!;
  sw453Review.status = 'resolved'; sw453Review.resolution = model.evidence!.find(record => record.id === sw453Id)!.confirmation!; sw453Review.evidenceIds.push(sw453Id); sw453Review.question = 'Owner confirms TF453/SW453 installed and connected to SW435 tier8. Resolution concerns installed branch status only; transformer transfer/earth policy, ratings/title/control aliases and all states/interlocks remain separate open reviews.';
  tidyPresentation(model);
  return model;
}

function addWaterSpur(model: NetworkModel) {
  const oldId = 'WN-WATER-SPUR-SUPERSEDED'; const id = 'WN-WATER-TF12-OPF1-7';
  recordDecision(model, oldId, 'This is fed from a spur off TF712. It branches off that main line, goes through WT1-CB Recloser, then to the SW441 IN01 CB', 'Historical owner answer: the TF712 source portion was explicitly corrected by WN-WATER-TF12-OPF1-7. This record preserves the answer, not a current TF712 water-supply claim. The stated series WT1-CB to SW441 IN01 route remains confirmed by the subsequent correction.');
  recordDecision(model, id, 'aplogies, i made a mistake, it is fed from TF12, not TF712. It branches offat OPF1-7 Pole', 'Owner corrects the water source to TF12 and identifies the branch point as OPF1-7 Pole. The water spur is on the existing owner-confirmed TF12 to SW411 IN04 line and continues through WT1-CB then SW441 IN01. No TF712 spur is represented. A single-terminal junction records connectivity only; no switching hardware, source availability, state, winding policy or interlock permission is inferred.');
  const claim = { knowledge: 'owner-confirmed' as const, evidenceIds: [id], reviewIds: [id] };
  const junction = 'owner:tf12:opf1-7'; const terminal = `${junction}:port`;
  const line = model.connections.find(connection => connection.id === 'whole:join:tf12-in04');
  if (!line || line.from !== 'station:sb02:f1:interface:port' || line.to !== 'sw411:in-04:interface:port') throw new Error('Water spur requires the existing owner-confirmed TF12 to SW411 IN04 endpoints.');
  const originalTo = line.to; line.to = terminal; line.evidenceIds = [...(line.evidenceIds ?? []), id]; line.reviewIds = [...(line.reviewIds ?? []), id];
  model.assets.push({ id: junction, label: 'OPF1-7 Pole\nTF12 main-line / water spur junction\nOwner confirmed', aliases: ['OPF1-7', 'Connectivity junction only; no switching device inferred'], kind: 'interface', terminals: [terminal], conductivePairs: [], positions: [], ...claim });
  const added = [
    { id: 'owner:tf12:opf1-7-to-in04', from: terminal, to: originalTo, ...claim },
    { id: 'owner:tf12:opf1-7-water', from: terminal, to: 'mine:interface:water-opf1:port', ...claim },
  ];
  model.connections.push(...added);
  for (const edgeId of ['mine:wt1:source', 'mine:sw441:incoming:cable']) {
    const edge = model.connections.find(connection => connection.id === edgeId)!;
    edge.knowledge = 'owner-confirmed'; edge.evidenceIds = [...(edge.evidenceIds ?? []), oldId, id]; edge.reviewIds = [...(edge.reviewIds ?? []), id];
  }
  const source = model.assets.find(asset => asset.id === 'mine:interface:water-opf1')!;
  source.aliases = [...(source.aliases ?? []), `Historical caption: ${source.label}`]; source.label = 'Water supply from TF12\nOPF1-7 Pole spur · owner confirmed'; Object.assign(source, claim);
  for (const boundary of model.boundaries?.filter(boundary => source.terminals.includes(boundary.terminal)) ?? []) {
    boundary.label = 'TF12 OPF1-7 water spur confirmed; availability, independent earth, actual positions and complete interlocks remain unconfirmed'; boundary.evidenceIds = [...(boundary.evidenceIds ?? []), id];
  }
  const waterReview = model.reviews!.find(review => review.id === 'MC-Q08')!;
  waterReview.question = 'Water Tower/Process Water is included. Owner confirms TF12 spur at OPF1-7 Pole through WT1-CB then SW441 IN01. Remaining unresolved: Water Tower/Process Water document aliases, TF441 400/415 V labels and winding/backfeed/independent earth policies, actual positions, source availability and complete physical interlocks.'; waterReview.evidenceIds.push(id);
  const overview = model.presentation!.views.find(view => view.id === 'mine-camp/overview')!; overview.label = 'Water Tower / Process Water · TF12 OPF1-7 supply confirmed';
  const detail: DiagramView = { id: 'supplemental/water-tf12-source', label: 'Water supply · TF12 / OPF1-7 / WT1 / SW441', assetIds: ['station:sb02:f1:interface', junction, source.id, 'mine:wt1:cb'], bounds: [-40, -40, 1120, 950], layout: { assets: {}, terminals: {}, labelOffsets: {}, rotations: {}, bends: {} }, boundaries: [] };
  for (const [assetId, x, y] of [['station:sb02:f1:interface', 170, 180], [junction, 470, 180], [source.id, 470, 400], ['mine:wt1:cb', 470, 620]] as [string, number, number][]) {
    const asset = model.assets.find(asset => asset.id === assetId)!;
    detail.layout.assets[assetId] = [x, y]; detail.layout.labelOffsets![assetId] = assetId === junction ? [0, -75] : [190, 0];
    asset.terminals.forEach((pin, index) => { detail.layout.terminals[pin] = [x, y + (asset.terminals.length > 1 ? (index === 0 ? -25 : 25) : 0)]; });
    if (asset.positions.length) detail.layout.rotations![assetId] = 90;
  }
  model.presentation!.views.push(detail);
  const changedIds = new Set([line.id, ...added.map(connection => connection.id)]);
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(pin => [pin, asset.id] as const)));
  for (const view of model.presentation!.views) {
    view.boundaries = view.boundaries?.filter(boundary => !changedIds.has(boundary.connectionId));
    for (const edge of model.connections) {
      if (!changedIds.has(edge.id) && view !== detail) continue;
      const fromVisible = view.assetIds.includes(owners.get(edge.from)!); const toVisible = view.assetIds.includes(owners.get(edge.to)!);
      if (fromVisible === toVisible) continue;
      const local = fromVisible ? edge.from : edge.to; const remote = fromVisible ? edge.to : edge.from; const remoteAssetId = owners.get(remote)!;
      const target = model.presentation!.views.filter(candidate => candidate.id !== view.id && candidate.assetIds.includes(remoteAssetId)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
      if (!target) throw new Error(`Water spur navigation requires ${remoteAssetId}.`);
      const [x, y] = view.layout.terminals[local];
      const position: [number, number] = view === detail && remoteAssetId === 'sw411:in-04:interface' ? [900, 180] : view === detail && remoteAssetId === 'station:sb02:f1:transformer' ? [20, 180] : [x, y + 150];
      view.layout.terminals[remote] = position; (view.layout.bends ??= {})[edge.id] = [];
      (view.boundaries ??= []).push({ connectionId: edge.id, remoteAssetId, targetViewId: target.id, position });
    }
  }
}
