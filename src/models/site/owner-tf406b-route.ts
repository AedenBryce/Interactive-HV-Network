import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

const id = 'WN-TF406B-CB02-SW03-ROUTE';
const route = [
  ['rm406:cb02:bar', 'rm406:bus:bar', 'rm406:cb02:a'],
  ['rm406:cb02-sw03', 'rm406:cb02:b', 'rm406:sw03:line'],
  ['rm406:tf406b:cable-TF406B-P1', 'rm406:sw03:cable', 'rm406:tf406b:hv'],
  ['rm406:mc406a:winding-incomer', 'rm406:tf406b:lv', 'rm406:mc406a:cb:a'],
  ['rm406:mc406a:incomer-bus', 'rm406:mc406a:cb:b', 'rm406:mc406a:bus:bar'],
] as const;

export function withOwnerTf406bRoute(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('TF406B route requires a new immutable model version.');
  if (base.evidence?.some(record => record.id === id)) throw new Error('TF406B route decision already applied.');
  const model = { ...structuredClone(base), version };
  const transformer = model.assets.find(asset => asset.id === 'rm406:tf406b:transformer');
  const review = model.reviews?.find(record => record.id === 'CV-R04');
  if (transformer?.kind !== 'transformer' || !transformer.sourceArcs?.some(arc => arc.from === 'rm406:tf406b:hv' && arc.to === 'rm406:tf406b:lv' && arc.knowledge === 'owner-confirmed' && arc.evidenceIds?.includes('WN-TRANSFORMER-FORWARD-POLICY'))
    || review?.status !== 'open') throw new Error('Review required: TF406B winding role, inherited policy or original feeder review changed.');
  const refs: EvidenceReference[] = [
    { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer90 exact: It is as per the first statement you said. Question first statement was: Is TF406B currently fed from RM406 CB02 / SW03, then supplying MC406A? This confirms that named feeding route; no rating, actual position, mechanism, independent earth behavior or whole-model acceptance is selected.' },
    { document: 'CB19OP001B-04057-DR-EL-0002.pdf', revision: '4', page: 1, clause: 'B–E/6–9, RM406 CB02/SW03 and TF406B branch' },
    { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6', page: 1, clause: 'B–D/9–11, RM406/TF406B/MC406A distribution route' },
    { document: 'CB19OP001B-04057-DR-EL-0003.pdf', revision: '2', page: 1, clause: 'A–B/5–6, disputed upstream RM406-SW02; C–D incomer and first phase bar' },
  ];
  for (const [connectionId, from, to] of route) {
    const connection = model.connections.find(connection => connection.id === connectionId);
    if (!connection || connection.from !== from || connection.to !== to || !connection.evidenceIds?.length) throw new Error(`Review required: named TF406B route edge ${connectionId} changed.`);
    refs.push(...connection.evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []));
    connection.knowledge = 'owner-confirmed'; connection.evidenceIds.push(id); connection.reviewIds = [...(connection.reviewIds ?? []), id];
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'It is as per the first statement you said' };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [...new Map(refs.map(reference => [JSON.stringify(reference), reference])).values()], summary: 'Owner90 confirms RM406 CB02 / SW03 → TF406B → MC406A, resolving the competing upstream SW02 label for modeled route selection. Keep the existing CB, three-position switch, inherited forward winding policy and MC406A incomer in series. No added path, state/interlock change, rating correction, parent equipment promotion or winding-earth claim. Actual source availability and whole-model acceptance remain separate.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'Current TF406B feeding route from RM406 CB02/SW03 to MC406A only.', evidenceIds: [id], resolution: confirmation });
  review.status = 'resolved'; review.resolution = confirmation; review.evidenceIds.push(id);
  review.question = 'Owner90 confirms RM406 CB02/SW03 → TF406B → MC406A. MC406A sheet upstream SW02 remains an original disputed drawing label; no second feed is added. Ratings and independent electrical/earth behavior remain separate under CV-R05 and the winding reviews.';
  for (const evidenceId of ['CV-TF406B-FEEDER', 'CV-MC406A-ENDPOINT']) {
    const evidence = model.evidence.find(record => record.id === evidenceId);
    if (!evidence) throw new Error(`Review required: original TF406B source record ${evidenceId} missing.`);
    evidence.summary = `Current route is owner90-confirmed RM406 CB02/SW03 → TF406B → MC406A. Ratings, installed metadata and independent earth behavior remain Unconfirmed. Historical drawing comparison: ${evidence.summary}`;
    evidence.references.push(refs[0]);
  }
  return model;
}
