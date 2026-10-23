import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

const sectionId = 'WN-MC451B-CONTINUOUS-SECTION'; const scopeId = 'WN-LV-CONVERTER-AC-ENDPOINTS';
const prefixes = ['rm406:vs4061:input-a', 'rm406:vs4061:input-b', 'rm410:vs4101:input-a', 'rm410:vs4101:input-b', 'rm413a:ac-input-a', 'rm413a:ac-input-b'];

export function withOwnerLvEndpointScope(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('LV endpoint decisions require a new immutable model version.');
  if (base.evidence?.some(record => [sectionId, scopeId].includes(record.id))) throw new Error('LV endpoint decisions already applied.');
  const model = { ...structuredClone(base), version };
  const section = model.assets.find(asset => asset.id === 'sw451:mc451b:section');
  const bridge = model.connections.find(link => link.id === 'sw451:mc451:section-bridge');
  if (section?.kind !== 'interface' || section.terminals.length !== 1 || section.terminals[0] !== 'sw451:mc451b:section:port' || section.positions.length || section.conductivePairs.length
    || bridge?.from !== 'sw451:mc451:bus:port' || bridge.to !== section.terminals[0] || !bridge.evidenceIds?.includes('TL-MC451B-BRIDGE')) throw new Error('Review required: MC451/MC451B section binding changed.');
  const sectionRefs: EvidenceReference[] = [
    { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer91 exact: yes. MC451B is a continuously connected MC451 LV bus section, no switch or separate incoming supply between sections. Ratings were explicitly excluded from the question.' },
    { document: '11098-07110-EL-DR-2658.pdf', revision: '12A', page: 1, clause: 'C–E/4–10, MC451 incoming phase bar and continuation' },
    { document: '11098-07110-EL-DR-2672.pdf', revision: '7', page: 1, clause: 'Row D, continuing MC451 phase bar' },
    { document: '11098-07110-EL-DR-2673.pdf', revision: '6', page: 1, clause: 'B–C/4–5, continuous bridge to MC451B enclosure' },
  ];
  function record(id: string, references: EvidenceReference[], summary: string) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'yes' };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references, summary });
    (model.reviews ??= []).push({ id, status: 'resolved', question: references[0].clause!, evidenceIds: [id], resolution: confirmation });
  }
  record(sectionId, sectionRefs, 'Owner91 confirms continuous MC451/MC451B phase-bar section identity, no intervening switch or separate incoming supply. Keep the existing direct bridge; add no source, control or outgoing LV circuit. Ratings, reference equivalence, independent earth coverage and whole-model acceptance remain separate.');
  section.aliases = [...new Set([...(section.aliases ?? []), section.label])]; section.kind = 'bus'; section.label = 'MC451B · continuous MC451 bus section';
  for (const claim of [section, bridge]) { claim.knowledge = 'owner-confirmed'; claim.evidenceIds = [...(claim.evidenceIds ?? []), sectionId]; claim.reviewIds = [...(claim.reviewIds ?? []), sectionId]; }
  const sectionReview = model.reviews!.find(review => review.id === 'TL-R04');
  if (!sectionReview) throw new Error('Review required: MC451 remaining rating/reference review missing.');
  sectionReview.question = `Owner91 confirms MC451B continuously connected to MC451, with no intervening switch or separate incoming supply. Remaining Unconfirmed:3000A/500A labels, source precedence and2659 versus2672/2673 reference identity. Historical question: ${sectionReview.question}`; sectionReview.evidenceIds.push(sectionId);
  const scopeRefs: EvidenceReference[] = [
    { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer92 exact: yes. V1 ends at the two separate AC input points after input switches for VS4061,VS4101 and RM413A. Converter/DC/motor detail excluded for these three LV feeds only; the five included MV drives retain their separately selected scope. This selects endpoint scope, not electrical contact, transfer or independent earth knowledge.' },
    { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6', page: 1, clause: 'D–F/1–3 and9–11, VS4101/VS4061 separate input switches/rectifiers' },
    { document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5', page: 1, clause: 'D–E/4–8, TF413A separate AC input/rectifier routes' },
  ];
  for (const prefix of prefixes) {
    const endpoint = model.assets.find(asset => asset.id === `${prefix}:boundary`);
    const input = model.assets.find(asset => asset.id === `${prefix}:switch`);
    const link = model.connections.find(link => link.id === `${prefix}:switch-boundary`);
    if (endpoint?.kind !== 'interface' || endpoint.terminals.length !== 1 || endpoint.terminals[0] !== `${prefix}:boundary:port` || endpoint.positions.length || endpoint.conductivePairs.length
      || input?.kind !== 'disconnector' || link?.from !== `${prefix}:switch:b` || link.to !== endpoint.terminals[0] || !link.evidenceIds?.length) throw new Error(`Review required: exact LV AC endpoint ${prefix} changed.`);
    endpoint.aliases = [...new Set([...(endpoint.aliases ?? []), endpoint.label])];
    endpoint.label = `${prefix.startsWith('rm413a') ? 'TF413A' : prefix.startsWith('rm406') ? 'VS4061' : 'VS4101'} input ${prefix.endsWith('-a') ? 'A' : 'B'}\nV1 AC endpoint · after input switch`;
    endpoint.evidenceIds = [...(endpoint.evidenceIds ?? []), scopeId]; endpoint.reviewIds = [...(endpoint.reviewIds ?? []), scopeId];
    for (const boundary of model.boundaries ?? []) if (endpoint.terminals.includes(boundary.terminal)) {
      boundary.label = `${endpoint.label.replaceAll('\n', ' ')}; converter/DC/motor detail excluded by owner92. Electrical/independent earth coverage remain Unconfirmed.`;
      boundary.evidenceIds = [...(boundary.evidenceIds ?? []), scopeId]; boundary.reviewIds = [...(boundary.reviewIds ?? []), scopeId];
    }
  }
  record(scopeId, scopeRefs, 'Owner92 selects exactly six separate LV AC endpoint points after their input switches. No converter/DC/motor expansion, common AC bus, new internal relationship, source/earth knowledge promotion or action/profile change. Existing five MV converter/motor scopes are unchanged.');
  for (const reviewId of ['CV-R07', 'SV-Q10']) {
    const review = model.reviews!.find(review => review.id === reviewId);
    if (!review) throw new Error(`Review required: existing LV scope review ${reviewId} missing.`);
    review.question = `Owner92 selects VS4061/VS4101/RM413A as six separate AC endpoints after their input switches; these three LV converter/DC/motor details are excluded. Electrical/earth/ratings and remaining original concerns stay Unconfirmed. Historical question: ${review.question}`; review.evidenceIds.push(scopeId);
  }
  return model;
}
