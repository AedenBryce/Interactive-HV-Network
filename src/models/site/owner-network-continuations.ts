import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

const continuations = [
  { device: 'rm713:in02', terminal: 'rm713:in02:a', stub: 'rm713:in02-undestinated', marker: 'rm713:interface:in02', tag: 'RM713 IN02', answer: '84', decision: 'no cable connected', document: '11098-07110-EL-DR-2254.pdf', revision: '1', clause: 'A–C/2–3, IN02 unnamed continuation' },
  { device: 'rm714:in02', terminal: 'rm714:in02:a', stub: 'rm714:in02:external-stub', marker: 'rm714:interface:ring-in02', tag: 'RM714 IN02', answer: '84', decision: 'no cable connected', document: '11098-07110-EL-DR-2255.pdf', revision: '1', clause: 'A–C/1–3, IN02 unnamed continuation' },
  { device: 'wh:h1:rm417:sw02', terminal: 'wh:h1:rm417:sw02:line', stub: 'wh:h1:rm417:sw02-stub', marker: 'wh:h1:rm417:sw02:interface', tag: 'RM417 SW02', answer: '85', decision: 'nothing is connected', document: 'CB16OP038A-02006-DR-EL-0044.pdf', revision: '2', clause: 'A–C/3–9, SW02 line-side unnamed continuation' },
] as const;

/** Applies only the owner's scoped external-continuation and inclusion decisions. */
export function withOwnerNetworkContinuations(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Network continuation decisions require a new immutable model version.');
  const model = { ...structuredClone(base), version };
  for (const row of continuations) {
    const id = `WN-NO-EXTERNAL-CABLE:${row.device}`;
    if (model.evidence?.some(record => record.id === id)) throw new Error('Network continuation decisions already applied.');
    const device = model.assets.find(asset => asset.id === row.device);
    const marker = model.assets.find(asset => asset.id === row.marker);
    const stub = model.connections.find(link => link.id === row.stub);
    const attachments = model.connections.filter(link => link.from === row.terminal || link.to === row.terminal);
    const earthBranch = row.device === 'rm714:in02' ? model.connections.find(link => link.id === 'rm714:in02:es:branch') : undefined;
    if (!device?.terminals.includes(row.terminal) || !marker || marker.kind !== 'interface'
      || marker.terminals.length !== 1 || marker.terminals[0] !== `${row.marker}:port` || marker.positions.length || marker.conductivePairs.length
      || !stub || stub.from !== marker.terminals[0] || stub.to !== row.terminal || !stub.evidenceIds?.length
      || attachments.length !== (row.device === 'rm714:in02' ? 2 : 1)
      || (row.device === 'rm714:in02' && (earthBranch?.from !== row.terminal || earthBranch.to !== 'rm714:in02:es:a'))
      || model.connections.filter(link => marker.terminals.includes(link.from) || marker.terminals.includes(link.to)).length !== 1
      || model.boundaries?.some(boundary => boundary.id === `owner:${row.device}:no-external-cable`)) throw new Error(`Review required: external continuation mapping for ${row.tag} changed.`);
    const references: EvidenceReference[] = [
      { document: 'Project owner conversation', revision: '2026-10-23', clause: `Answer${row.answer} exact: ${row.decision}. ${row.answer === '84' ? 'Question named both RM713 IN02 and RM714 IN02; shared answer applies to both.' : 'Question named RM417 SW02 line/cable side at Hopper1.'} No baseline, hardware-removal, earth-coverage or local-profile change is selected.` },
      { document: row.document, revision: row.revision, page: 1, clause: row.clause },
      ...stub.evidenceIds.flatMap(evidenceId => model.evidence?.find(record => record.id === evidenceId)?.references ?? []),
    ];
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: row.decision };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references, summary: `Owner${row.answer} confirms no external cable at ${row.tag}. Remove only the unnamed external stub. Installed device, bus/earth connections, selected baseline and local profile stay as separately recorded. Independent earth coverage and whole-model acceptance remain separate.` });
    (model.reviews ??= []).push({ id, status: 'resolved', question: `Current external cable connection at ${row.tag} only.`, evidenceIds: [id], resolution: confirmation });
    model.connections = model.connections.filter(link => link.id !== row.stub);
    marker.aliases = [...new Set([...(marker.aliases ?? []), marker.label])];
    marker.label = `${row.tag} · No external cable\nDisconnected drawing reference`;
    marker.evidenceIds = [...(marker.evidenceIds ?? []), id]; marker.reviewIds = [...(marker.reviewIds ?? []), id];
    for (const boundary of model.boundaries ?? []) if (marker.terminals.includes(boundary.terminal)) {
      boundary.label = `${row.tag}: disconnected drawing reference; no external cable at the actual control. Independent earth coverage remains Unconfirmed.`;
      boundary.evidenceIds = [...(boundary.evidenceIds ?? []), id]; boundary.reviewIds = [...(boundary.reviewIds ?? []), id];
    }
    (model.boundaries ??= []).push({ id: `owner:${row.device}:no-external-cable`, terminal: row.terminal, label: `${row.tag}: owner confirms no external cable; no external source continuation at this terminal. Independent earth coverage Unconfirmed.`, sourceCoverage: 'complete', earthCoverage: 'unconfirmed', knowledge: 'owner-confirmed', evidenceIds: [id], reviewIds: [id] });
    for (const view of model.presentation?.views ?? []) if (view.layout.bends) delete view.layout.bends[row.stub];
  }
  return model;
}
