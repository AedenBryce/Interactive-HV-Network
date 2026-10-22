import type { NetworkModel } from '../../session/model';
import type { DiagramView } from '../../session/presentation';

const sourceId = 'SV-MC413-SUPPLEMENT';
const reviewId = 'SV-MC413-INSTALLED';
const reference = { document: '00151-CB-02006-DR-EL-1001', revision: '11 (14.11.25; IFC)', page: 1, clause: 'A-B / 4-6, FROM 22kV RING MAIN UNIT RC001 / reference 11098-07110-EL-DR-2350 and TF413; C-D / 4-5, CB MC413 IN 3000 A; D / 1-11, 400 V / 3000 A / 50 kA for 1 sec phase bar; H / 8-12, title/revision 11.' };

export function withMc413Detail(base: NetworkModel, version: string): NetworkModel {
  if (base.evidence?.some(record => record.id === sourceId)) throw new Error('MC413 supplemental detail is already applied.');
  const model = { ...structuredClone(base), version };
  if (!model.presentation) throw new Error('MC413 detail requires the existing presentation.');
  const required = (id: string) => {
    const asset = model.assets.find(asset => asset.id === id);
    if (!asset) throw new Error(`MC413 detail requires existing asset ${id}.`);
    return asset;
  };
  const transformer = required('rm413:tf413');
  const breaker = required('rm413:mc413:cb');
  const bus = required('rm413:mc413:bus');
  const upstream = required('rm413:tf413:cb');
  (model.evidence ??= []).push({ id: sourceId, status: 'supported', references: [reference], summary: 'The received MC413 source page depicts TF413 22 kV / 400 V, 2 MVA, CB MC413 IN 3000 A and its first 400 V / 3000 A / 50 kA for 1 sec phase bar. The neutral bar, MEN link and earth bar are separate from the phase route. MC413A and other outgoing LV circuits are beyond the first bar. The page names upstream RC001 / ref 2350, whereas the existing RM413 source uses RM413 and a shortened 1001 reference. Cross-document installed identity, revision precedence, complete positions/interlocks and winding policies remain unconfirmed. The IFC stamp and outgoing motor-upgrade notes do not accept the installed incomer or permit switching.' });
  (model.reviews ??= []).push({ id: reviewId, status: 'open', evidenceIds: [sourceId, 'SV-MC413-ENDPOINT', 'SV-RM413-HV'], question: 'Confirm installed equivalence of received 00151-CB-02006-DR-EL-1001 revision 11 with the existing shortened 1001 / RM413 reference. Reconcile upstream RC001 / ref 2350 versus RM413 without inventing another transformer or source. Confirm incoming identity/position set, complete physical interlocks, revision precedence and independent source/backfeed/earth winding policies. The first LV bar is depicted; installation remains unconfirmed.' });
  for (const asset of [breaker, bus]) {
    // The source depiction is supported; its binding to the installed asset is
    // still provisional. Preserve the existing electrical candidates and state.
    asset.evidenceIds = [...(asset.evidenceIds ?? []), sourceId];
    asset.reviewIds = [...(asset.reviewIds ?? []), reviewId];
  }
  breaker.label = 'CB MC413 IN\n3000 A · installation unconfirmed';
  breaker.aliases = [...(breaker.aliases ?? []), 'CB MC413 IN', '3000 A', 'Depicted on supplemental 1001 rev 11; installed identity unconfirmed'];
  bus.label = 'MC413 first LV bus\n400 V / 3000 A';
  bus.aliases = [...(bus.aliases ?? []), '400 V', '3000 A', '50 kA for 1 sec'];
  for (const id of ['rm413:mc413:winding-incomer', 'rm413:mc413:incomer-bar']) {
    const connection = model.connections.find(connection => connection.id === id);
    if (!connection) throw new Error(`MC413 detail requires existing connection ${id}.`);
    connection.evidenceIds = [...(connection.evidenceIds ?? []), sourceId];
    connection.reviewIds = [...(connection.reviewIds ?? []), reviewId];
  }
  const oldEndpoint = model.evidence!.find(record => record.id === 'SV-MC413-ENDPOINT')!;
  oldEndpoint.summary = 'Earlier construction used the RM413 schematic incoming contact/bar while the shortened 1001 detail was unavailable. Received 00151-CB-02006-DR-EL-1001 revision 11 now depicts CB MC413 IN 3000 A and the 400 V / 3000 A / 50 kA for 1 sec first phase bar. Inference: these details are provisionally attached to the existing source-scoped MC413 endpoint; RC001 / ref 2350 versus RM413, reference-prefix equivalence and installed precedence remain open. MC413A remains excluded beyond this first LV bar.';
  oldEndpoint.references.push(reference);
  const oldReview = model.reviews!.find(review => review.id === 'SV-Q08')!;
  oldReview.question = 'MC413 supplemental 1001 revision 11 is now received and depicts its incoming CB and first LV bar. Resolve installed identity/prefix equivalence and RC001 / ref 2350 versus RM413, while preserving distinct TF413/MC413 and TF414/MCC414 branches. Complete position/interlock and revision-policy questions remain open; outgoing MC413A remains excluded.';
  oldReview.evidenceIds.push(sourceId);
  for (const boundary of model.boundaries ?? []) if (boundary.id === 'rm413:mc413:detail-coverage') {
    boundary.label = 'MC413 supplemental first LV detail represented; installed identity, source/backfeed and independent earth coverage unconfirmed';
    boundary.evidenceIds = [...(boundary.evidenceIds ?? []), sourceId];
    boundary.reviewIds = [...(boundary.reviewIds ?? []), reviewId];
  }
  const target = model.presentation.views.filter(view => view.assetIds.includes(upstream.id)).sort((a, b) => a.bounds[2] * a.bounds[3] - b.bounds[2] * b.bounds[3])[0];
  if (!target) throw new Error('MC413 detail requires an upstream feeder view.');
  const incoming = model.connections.find(connection => connection.from === upstream.terminals[1] && connection.to === transformer.terminals[0]);
  if (!incoming) throw new Error('MC413 detail requires the existing feeder-to-transformer connection.');
  const view: DiagramView = {
    id: 'supplemental/mc413-lv', label: 'MC413 first LV bar · 1001 rev11 · installed identity unconfirmed',
    assetIds: [transformer.id, breaker.id, bus.id], bounds: [10, 0, 1000, 780],
    boundaries: [{ connectionId: incoming.id, remoteAssetId: upstream.id, targetViewId: target.id, position: [350, 35] }],
    layout: {
      assets: { [transformer.id]: [350, 190], [breaker.id]: [350, 400], [bus.id]: [350, 610] },
      terminals: { [transformer.terminals[0]]: [350, 150], [transformer.terminals[1]]: [350, 230], [breaker.terminals[0]]: [350, 370], [breaker.terminals[1]]: [350, 430], [bus.terminals[0]]: [350, 610], [incoming.from]: [350, 35] },
      rotations: { [transformer.id]: 90, [breaker.id]: 90, [bus.id]: 90 },
      labelOffsets: { [transformer.id]: [250, -10], [breaker.id]: [240, 0], [bus.id]: [0, 80] }, bends: {},
    },
  };
  model.presentation.views.push(view);
  return model;
}
