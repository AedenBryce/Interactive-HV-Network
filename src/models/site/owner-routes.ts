import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import { recordDecision } from './owner-scope-connections';

type RouteEdge = readonly [id: string, from: string, to: string];

export function withOwnerRouteConfirmations(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-RM413-DOUBLE-BOOT';
  if (base.evidence?.some(record => record.id === id)) throw new Error('Owner route confirmations already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  confirmRoute(model, id, 'yes it is', 'Owner answered exactly "yes it is" to: Is RM413 IN02’s cable side currently a double-boot connection serving both RM417 (Hopper 1) and RM413A? This confirms the existing cable-side fork only. RM413 IN02 remains in series with its bus, and both downstream branches stay on its cable side. No bus bypass, source availability, actual positions, lower ES-Q8 mechanism, winding policy or complete interlocks are confirmed.', [
    ['rm413:in02-rm417', 'rm413:in02:a', 'rm413:interface:rm417:port'],
    ['rm413:double-boot-rm413a', 'rm413:in02:a', 'rm413a:bus:bar'],
    ['whole:join:hopper1', 'rm413:interface:rm417:port', 'wh:h1:interface:rm413:port'],
  ], [{ document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'A-C/1-6: RM413 IN02 cable-side DOUBLE BOOT CONNECTION to RM417/Hopper1 and RM413A.' }]);
  resolveJoinReview(model, 'WN-JOIN-hopper1', id, 'Owner confirms the RM413 IN02 cable-side double-boot fork to RM417/Hopper1 and RM413A. Resolution covers this route only; exact document equivalence, device/earth hardware, states, winding policies and interlocks remain separate.');
  const review = model.reviews!.find(review => review.id === 'SV-Q09')!;
  review.question = 'RM413 IN02 cable-side double-boot serving RM417/Hopper1 and RM413A is owner-confirmed. Remaining unresolved: two ES-Q8 locations, Q1 and lower switch mechanisms/aliases, earth sides, complete positions and physical interlocks at RM413A.'; review.evidenceIds.push(id);
  const hopper8Id = 'WN-HOPPER8-RM406-ROUTE';
  confirmRoute(model, hopper8Id, 'yes', 'Owner answered exactly "yes" to the RM406 CB03/SW04 to Hopper8 SS416-HV416 route feeding Hopper8 TF416 and TF416A. This confirms the source-scoped Hopper8 route and its existing primary fork; Hopper3 SS416/TF416/TF416A remains a distinct source-scoped model. No device position, source availability, winding/backfeed/earth relationship, full hardware identity or interlock permission is confirmed.', [
    ['rm406:cb03-sw04', 'rm406:cb03:b', 'rm406:sw04:line'],
    ['rm406:sw04-hopper8', 'rm406:sw04:cable', 'rm406:interface:hopper8:port'],
    ['whole:join:hopper8', 'rm406:interface:hopper8:port', 'wh:h8:interface:rm406:port'],
    ['wh:h8:rm406-cable', 'wh:h8:interface:rm406:port', 'wh:h8:hv416:port'],
    ['wh:h8:tf416:input', 'wh:h8:hv416:port', 'wh:h8:tf416:hv'],
    ['wh:h8:tf416a:input', 'wh:h8:hv416:port', 'wh:h8:tf416a:hv'],
  ], [
    { document: 'CB19OP001B-04057-DR-EL-0002.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'C-E/10-11: RM406 CB03/SW04 outgoing Hopper008 reference.' },
    { document: 'CB17OP023C-01006-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'C-G/8-11: Hopper8 SS416-HV416 incoming RM406-CB03 and TF416/TF416A fork.' },
  ]);
  resolveJoinReview(model, 'WN-JOIN-hopper8', hopper8Id, 'Owner confirms RM406 CB03/SW04 to source-scoped Hopper8 SS416-HV416, feeding its TF416 and TF416A. Resolution is confined to that route; Hopper3 is not merged. Document-reference equivalence, full hardware/position/interlock and winding policies remain separate.');
  for (const reviewId of ['WH-Q01', 'WH-Q04', 'WH-Q07', 'CV-R08']) {
    const partial = model.reviews!.find(review => review.id === reviewId)!;
    partial.question = `The RM406 CB03/SW04 to Hopper8 SS416-HV416/TF416/TF416A route is owner-confirmed without merging Hopper3. Remaining original source/reference, hardware or complete relationship scope: ${partial.question}`; partial.evidenceIds.push(hopper8Id);
  }
  const onwardId = 'WN-HOPPER9-HOPPER7-ROUTE';
  confirmRoute(model, onwardId, 'yes', 'Owner answered exactly "yes" to the current RM410 CB03/SW04 to RM419 SW01 Hopper9 route, then RM419 SW02 to RM418 SW01 Hopper7. The existing named cables and actual end controls are retained. This confirms the route only; it does not bypass either RM419 switch or restore the removed conducting remote proxy. Source availability, actual states, legacy device/transformer aliases, voltage labels, winding policies, earth hardware and complete physical interlocks remain unconfirmed.', [
    ['rm410:cb03-sw04', 'rm410:cb03:b', 'rm410:sw04:line'],
    ['rm410:sw04-rm419', 'rm410:sw04:cable', 'rm410:interface:rm419:incoming'],
    ['whole:join:hopper9', 'rm410:interface:rm419:incoming', 'wh:h9:interface:rm410:port'],
    ['wh:h9:rm410-cable', 'wh:h9:interface:rm410:port', 'wh:h9:rm419:sw01:line'],
    ['wh:h9:sw01-bus', 'wh:h9:rm419:sw01:common', 'wh:h9:rm419:bus:bar'],
    ['wh:h9:sw02-bus', 'wh:h9:rm419:sw02:common', 'wh:h9:rm419:bus:bar'],
    ['wh:h9-to-h7:cable', 'wh:h9:rm419:sw02:line', 'wh:h7:rm418:sw01:a'],
    ['wh:h7:sw01-bus', 'wh:h7:rm418:sw01:b', 'wh:h7:rm418:bus:bar'],
  ], [
    { document: 'CB19OP001B-04057-DR-EL-0004.pdf', revision: '6 (28.01.25; AS FOUND 23.10.21)', page: 1, clause: 'C-F/10-12: RM410 CB03/SW04 outgoing RM419 SW01 route.' },
    { document: 'CB19OP001C-01068-DR-EL-0001.pdf', revision: '4 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'A-B/6-8: RM419 SW01 from RM410 and SW02 onward to RM418 SW01.' },
    { document: 'CB17OP023C-01006-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'A-B/6-7: RM418 SW01 incoming from RM419 SW02.' },
  ]);
  resolveJoinReview(model, 'WN-JOIN-hopper9', onwardId, 'Owner confirms RM410 CB03/SW04 to RM419 SW01 Hopper9 and RM419 SW02 onward to RM418 SW01 Hopper7. Resolution is confined to the named route; all actual controls, states, source availability, winding policies, reference/legacy hardware identities and complete interlocks remain separate.');
  const historicalReview = model.reviews!.find(review => review.id === 'WH-Q05')!;
  historicalReview.question = 'Current RM410 CB03/SW04 to RM419 SW01, then RM419 SW02 to RM418 SW01 is owner-confirmed. Remaining unresolved: historical RM418-RM406-P1 cable wording and previous Hopper007 note/document identity; no second current RM418/RM406 feed is inferred from those historical labels.'; historicalReview.evidenceIds.push(onwardId);
  const cvReview = model.reviews!.find(review => review.id === 'CV-R08')!;
  cvReview.question = 'Owner confirms RM406 CB03/SW04 to source-scoped Hopper8 SS416-HV416/TF416/TF416A and RM410 CB03/SW04 to RM419 SW01, then RM419 SW02 to RM418 SW01. Remaining unresolved: original historical cable/document-reference equivalence and legacy hardware aliases; route confirmation does not settle complete device positions, physical interlocks or winding source/earth policies. No duplicate equipment or conducting remote proxy is created.'; cvReview.evidenceIds.push(onwardId);
  const hopper3Id = 'WN-HOPPER3-RM417-ROUTE';
  confirmRoute(model, hopper3Id, 'yes', 'Owner answered exactly "yes" to RM417 CB02/SW04 currently feeding Hopper3 separate SS416 kiosk TF416 and TF416A. This confirms the existing cable and primary fork, distinct from RM406-fed Hopper8. Reused SS416/TF416 tags are not merged. No transformer source/backfeed/earth policy, actual positions, availability or complete interlocks are accepted.', [
    ['wh:h1:cb02-sw04', 'wh:h1:rm417:cb02:b', 'wh:h1:rm417:sw04:line'],
    ['wh:h1:hopper3-cable', 'wh:h1:rm417:sw04:common', 'wh:h3:hv416:port'],
    ['wh:h3:tf416:input', 'wh:h3:hv416:port', 'wh:h3:tf416:hv'],
    ['wh:h3:tf416a:input', 'wh:h3:hv416:port', 'wh:h3:tf416a:hv'],
  ], [{ document: 'CB16OP038A-02006-DR-EL-0044.pdf', revision: '2 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-G/8-11: RM417 CB02/SW04 feeding Hopper3 SS416 kiosk and separate TF416/TF416A primaries.' }]);
  const scopedIdentity = model.reviews!.find(review => review.id === 'WH-Q01')!;
  scopedIdentity.question = 'Owner confirms separate current Hopper3 SS416/TF416/TF416A from RM417 CB02/SW04 and Hopper8 SS416/TF416/TF416A from RM406 CB03/SW04. Source-scoped records remain distinct. Remaining unresolved: governing document/tag equivalence beyond those named routes, complete hardware/position/interlock details and independent winding/backfeed/earth policies.'; scopedIdentity.evidenceIds.push(hopper3Id);
  const h3Coverage = model.reviews!.find(review => review.id === 'WH-Q09')!;
  h3Coverage.question = 'The current RM417 CB02/SW04 to Hopper3 route is owner-confirmed. The overview still truncates CB02 while detailed0044 carries the route; original drawing coverage/precedence remains traceable and does not establish different actual control states or complete hardware/interlocks.'; h3Coverage.evidenceIds.push(hopper3Id);
  const hopper7Id = 'WN-HOPPER7-CB03-CB04';
  confirmRoute(model, hopper7Id, 'yes', 'Owner answered exactly "yes" to Hopper7 RM418 CB03 feeding both TF418 MV and TF418A LV, with CB04 spare. This confirms the current named feeder/transformer tags versus older CB01/CB02 and TF418A/TF418B aliases. It does not confirm absence of an external CB04 cable, actual positions, key/interlock rules or transformer source/backfeed/earth transfer.', [
    ['wh:h7:rm418:cb03:bus-link', 'wh:h7:rm418:bus:bar', 'wh:h7:rm418:cb03:a'],
    ['wh:h7:rm418:cb03:disconnect-link', 'wh:h7:rm418:cb03:b', 'wh:h7:rm418:cb03:disconnect:a'],
    ['wh:h7:tf418:input', 'wh:h7:rm418:cb03:disconnect:b', 'wh:h7:tf418:hv'],
    ['wh:h7:tf418a:input', 'wh:h7:rm418:cb03:disconnect:b', 'wh:h7:tf418a:hv'],
  ], [
    { document: 'CB17OP023C-01006-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'A-F/3-9: current Hopper7 RM418 CB03/CB04 and shared TF418/TF418A primary fork.' },
    { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'E-F/6-8: retained older RM418 CB01/CB02 and TF418A/TF418B source aliases.' },
  ]);
  for (const assetId of ['wh:h7:rm418:cb03', 'wh:h7:rm418:cb04']) {
    const asset = model.assets.find(asset => asset.id === assetId)!; asset.evidenceIds = [...(asset.evidenceIds ?? []), hopper7Id]; asset.reviewIds = [...(asset.reviewIds ?? []), hopper7Id];
  }
  const tags = model.reviews!.find(review => review.id === 'WH-Q02')!;
  tags.question = 'Owner confirms current RM418 CB03 feeds both TF418 and TF418A, and CB04 is spare. Older CB01/CB02 and TF418A/TF418B source aliases remain historical. Remaining unresolved: exact historical/control-document correspondence, incoming ES01 hardware, complete device/earth mechanisms, states and physical interlocks. CB04 external-cable absence is not confirmed.'; tags.evidenceIds.push(hopper7Id);
  const controlAliases = model.reviews!.find(review => review.id === 'WH-Q03')!;
  controlAliases.question = `Owner confirms current CB03 feeder tags, without accepting a complete primary/control mapping. Remaining control references and aliases: ${controlAliases.question}`; controlAliases.evidenceIds.push(hopper7Id);
  const mc413Id = 'WN-MC413-RM413-SUPPLY';
  confirmRoute(model, mc413Id, 'yes', 'Owner answered exactly "yes" to the current RM413 TF413 feeder to TF413 to MC413 supply route and to RC001 being an incorrect/old reference on supplemental00151-CB-02006-DR-EL-1001 rev11. RC001 is not the current feeder reference; whether its historical cause is an old name or a drawing error remains unconfirmed. No RC001 physical asset is created. This confirms the existing named supply binding only, not document-prefix equivalence, whole installed revision precedence, ratings, actual device/racking states, winding source/backfeed/earth behaviour or complete physical interlocks.', [
    ['rm413:tf413:bar', 'rm413:bus:bar', 'rm413:tf413:cb:a'],
    ['rm413:tf413:incoming-cable', 'rm413:tf413:cb:b', 'rm413:tf413:hv'],
    ['rm413:mc413:winding-incomer', 'rm413:tf413:lv', 'rm413:mc413:cb:a'],
    ['rm413:mc413:incomer-bar', 'rm413:mc413:cb:b', 'rm413:mc413:bus:bar'],
  ], [
    { document: '00151-CB-02006-DR-EL-1001', revision: '11 (14.11.25; IFC)', page: 1, clause: 'A-B/4-5: RC001/reference2350 and TF413; current source binding corrected by owner, historical cause unconfirmed.' },
    { document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5 (28.01.25; AS FOUND 23.10.23)', page: 1, clause: 'B-E/2-4: RM413 TF413 feeder, transformer and MC413 route.' },
  ]);
  for (const id of ['rm413:mc413:cb', 'rm413:mc413:bus']) {
    const asset = model.assets.find(asset => asset.id === id)!;
    asset.evidenceIds = [...(asset.evidenceIds ?? []), mc413Id]; asset.reviewIds = [...(asset.reviewIds ?? []), mc413Id];
    asset.aliases = asset.aliases?.map(alias => alias.includes('installed identity unconfirmed') ? `Historical construction uncertainty: ${alias}` : alias);
  }
  model.assets.find(asset => asset.id === 'rm413:mc413:cb')!.label = 'CB MC413 IN\n3000 A printed · supply route confirmed';
  const mcReview = model.reviews!.find(review => review.id === 'SV-MC413-INSTALLED');
  if (!mcReview) throw new Error('MC413 route confirmation requires the reviewed supplemental source metadata.');
  mcReview.question = 'Current RM413 TF413 feeder to TF413 to MC413 binding is owner-confirmed; RC001 is not the current feeder reference. Remaining unresolved: document-prefix equivalence, historical cause of the RC001 label, governing installed revision precedence, printed ratings, complete incoming/racking/earth mechanisms, baseline/interlocks and independent winding/backfeed/earth policies.'; mcReview.evidenceIds.push(mc413Id);
  const servicesReview = model.reviews!.find(review => review.id === 'SV-Q08')!;
  servicesReview.question = 'Owner confirms the current RM413 TF413 feeder to TF413 to MC413 route and that RC001 is not its current feeder reference. Distinct TF414/MCC414 remains separate. Remaining unresolved: reference-prefix equivalence, historical RC001-label cause, full installed source precedence, ratings, complete positions/interlocks and winding/earth policy; outgoing MC413A stays excluded.'; servicesReview.evidenceIds.push(mc413Id);
  for (const boundary of model.boundaries ?? []) if (boundary.id === 'rm413:mc413:detail-coverage') {
    boundary.label = 'MC413 current RM413/TF413 supply route confirmed; ratings/source-policy, transformer backfeed and independent earth coverage remain unconfirmed'; boundary.evidenceIds = [...(boundary.evidenceIds ?? []), mc413Id];
  }
  const mcView = model.presentation!.views.find(view => view.id === 'supplemental/mc413-lv');
  if (mcView) mcView.label = 'MC413 first LV bar · supply route confirmed · ratings/interlocks unconfirmed';
  return model;
}

function confirmRoute(model: NetworkModel, id: string, answer: string, summary: string, edges: readonly RouteEdge[], references: EvidenceReference[]) {
  recordDecision(model, id, answer, summary);
  model.evidence!.find(record => record.id === id)!.references.push(...references);
  for (const [edgeId, from, to] of edges) {
    const edge = model.connections.find(connection => connection.id === edgeId);
    if (!edge || edge.from !== from || edge.to !== to) throw new Error(`Owner route review required: ${edgeId} no longer has the verified endpoints ${from} / ${to}. No connection was added or remapped.`);
    edge.knowledge = 'owner-confirmed'; edge.evidenceIds = [...(edge.evidenceIds ?? []), id]; edge.reviewIds = [...(edge.reviewIds ?? []), id];
  }
}

function resolveJoinReview(model: NetworkModel, reviewId: string, evidenceId: string, question: string) {
  const review = model.reviews!.find(review => review.id === reviewId);
  if (!review) throw new Error(`Owner route confirmation requires existing review ${reviewId}.`);
  review.status = 'resolved'; review.resolution = model.evidence!.find(record => record.id === evidenceId)!.confirmation!;
  review.question = question; review.evidenceIds.push(evidenceId);
}
