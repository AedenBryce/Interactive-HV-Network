import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';

const p17 = ['rm712:in01', 'rm712:in02', 'rm712:tf712:cb', 'rm713:in01', 'rm713:in02', 'rm713:tf713:cb', 'rm413:in01', 'rm413:in02', 'rm413:tf413:cb', 'rm413:tf414:cb'];
const p19 = ['rm412:s100', 'rm412:s101', 'rm412:q100', 'rm412:feeder-contact', 'rm412:e100', 'rm412:e101', 'rm412:e102'];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const unique = (refs: EvidenceReference[]) => [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
const position = (suffix: string, value: string): InterlockCondition => ({ kind: 'device', assetId: `rm412:${suffix}`, position: value });
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Owner-selected fixed profiles, with scoped identity/presence and baseline evidence. */
export function withOwnerFixedRmuProfiles(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Fixed RMU profiles require a new immutable model version.');
  if (base.evidence?.some(record => record.id === 'WN-INTERLOCK-P17' || record.id === 'WN-INTERLOCK-P19')) throw new Error('Fixed RMU profiles already applied.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks) throw new Error('Review required: existing fixed RMU reviews missing.');
  const sourceReferences = (ids: string[] = []) => ids.flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(link => link.id === id);
    if (link?.from !== from || link.to !== to || !sourceReferences(link.evidenceIds).length) throw new Error(`Review required: evidenced fixed RMU connection ${id} changed.`);
  };
  const binary = (asset: Asset, kind: Asset['kind']) => {
    if (asset.kind !== kind || asset.removableBreaker || asset.removableContactor || asset.removableDisconnector || !same(asset.terminals, [`${asset.id}:a`, `${asset.id}:b`])
      || asset.conductivePairs.length || asset.sourcePairs?.length || asset.earthPairs?.length || asset.sourceArcs !== undefined || asset.positions.length !== 2
      || asset.positions.find(option => option.id === 'open')?.pairs.length !== 0 || !same(asset.positions.find(option => option.id === 'closed')?.pairs, [asset.terminals])
      || asset.positions.some(option => option.sourcePairs?.length || option.earthPairs?.length)) throw new Error(`Review required: fixed Open/Close mechanism ${asset.id} changed.`);
  };
  for (const [groupId, ids, answer, number] of [
    ['P17', p17, 'Use this complete profile for all9 controls', 72],
    ['P19', p19, 'Approve this complete local profile', 68],
  ] as const) {
    const group = inventory.groups.find(group => group.id === groupId);
    if (!group || group.assetIds.length !== ids.length || group.assetIds.some(id => !ids.includes(id))) throw new Error(`Review required: exact ${groupId} inventory changed.`);
    const refs: EvidenceReference[] = [
      { document: 'Project owner conversation', revision: '2026-10-23', clause: groupId === 'P17'
        ? 'Answer71 exact: Installed; use this Open baseline and profile. Answer72 exact: Use this complete profile for all9 controls. Complete fixed Open/Close, no racking, no additional local/key prerequisites; no extra earth controls added for V1. Physical absence of earth hardware is not asserted.'
        : 'Answers63/64/66 select separate S100/E100, S101/E101 and separate fixed Q100/S102; S102 is a switch. Answer68 exact: Approve this complete local profile. Full selected truth table is in drawing-review/supplemental/owner-interlocks-review.md; unknown prerequisites block. No additional local/key conditions. This is an owner-selected teaching profile, not a source-derived physical permission.' },
      { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: `${groupId}: exact ${ids.length} original controls, drawing references and unchanged stable IDs.` },
      ...group.references.map(ref => ({ document: ref.document, revision: ref.revision, page: ref.page, clause: ref.region })),
    ];
    for (const id of ids) {
      const asset = model.assets.find(asset => asset.id === id);
      const row = group.assets.find(row => row.assetId === id);
      const review = model.interlocks.reviews.find(review => review.assetId === id);
      if (!asset || !row || asset.kind !== row.kind || !review || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === id)) throw new Error(`Review required: existing fixed RMU asset/review/rules ${id} changed.`);
      binary(asset, asset.kind);
      refs.push(...row.references, ...sourceReferences(asset.evidenceIds));
      review.status = groupId === 'P17' ? 'confirmed-none' : 'confirmed-rules';
      review.note = `Owner${groupId === 'P17' ? '71/72' : '63/64/66/68'} selects this exact fixed Open/Close local profile without racking or additional local/key conditions. ${groupId === 'P17' ? 'No additional action prerequisites; no extra earth controls added for V1, without asserting physical absence.' : 'All declared common-bar and Q100/S102/earth dependencies apply; unknown prerequisites block.'} This selects model interactions only; unrelated equipment, source/earth claims and actual switching permission remain separate. Historical review context: ${review.note}`;
      review.evidence = unique([...review.evidence, ...refs]);
    }
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: `${number}: ${answer}${groupId === 'P17' ? '; 71: Installed; use this Open baseline and profile' : ''}` };
    const id = `WN-INTERLOCK-${groupId}`;
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: unique(refs), summary: `Owner-selected ${groupId} local profile only; electrical topology and claim knowledge remain unchanged. No whole-model acceptance or actual switching permission is established.` });
    (model.reviews ??= []).push({ id, status: 'resolved', question: `Complete ${groupId} selected V1 local interaction profile only.`, evidenceIds: [id], resolution: confirmation });
  }
  // Both incoming earths attach to the common bar, not their incoming cable sides.
  for (const suffix of ['s100', 's101']) branch(`rm412:${suffix}-bar`, `rm412:${suffix}:b`, 'rm412:bus:bar');
  branch('rm412:q100-bar', 'rm412:bus:bar', 'rm412:q100:a');
  branch('rm412:q100-contact', 'rm412:q100:b', 'rm412:feeder-contact:a');
  for (const suffix of ['e100', 'e101', 'e102']) {
    const id = `rm412:${suffix}`;
    branch(`${id}:branch`, suffix === 'e102' ? 'rm412:feeder-contact:b' : 'rm412:bus:bar', `${id}:a`);
    if (!model.earths?.some(earth => earth.terminal === `${id}:b`) || model.connections.filter(link => link.from === `${id}:a` || link.to === `${id}:a`).length !== 1) throw new Error(`Review required: fixed RMU earth ${id} changed.`);
  }
  for (const prefix of ['rm712', 'rm713', 'rm413']) {
    for (const suffix of ['in01', 'in02']) branch(`${prefix}:${suffix}-bar`, `${prefix}:${suffix}:b`, `${prefix}:bus:bar`);
    for (const tf of prefix === 'rm413' ? ['tf413', 'tf414'] : [prefix === 'rm712' ? 'tf712' : 'tf713']) branch(`${prefix}:${tf}:bar`, `${prefix}:bus:bar`, `${prefix}:${tf}:cb:a`);
  }
  if (model.starting.devices['rm712:in01'] !== null || model.connections.some(link => link.from === 'rm712:in01:a' || link.to === 'rm712:in01:a')) throw new Error('Review required: unconnected RM712 IN01 baseline or cable-side connection changed.');
  const presenceId = 'WN-RM712-IN01-PRESENCE';
  const presenceConfirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'Installed; use this Open baseline and profile' };
  (model.evidence ??= []).push({ id: presenceId, status: 'owner-confirmed', confirmation: presenceConfirmation, references: [{ document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer71: SF RM712 IN01 remains installed with no external cable; Open baseline; fixed Open/Close, no racking or additional local/key prerequisites.' }, { document: '11098-07110-EL-DR-2253.pdf', revision: '3', page: 1, clause: 'A–C/1–3, RM712 incoming controls.' }], summary: 'Scoped RM712 IN01 hardware presence and selected Open baseline only. No unrelated hardware or electrical claim is promoted.' });
  (model.reviews ??= []).push({ id: presenceId, status: 'resolved', question: 'RM712 IN01 retained presence and selected Open baseline only.', evidenceIds: [presenceId], resolution: presenceConfirmation });
  model.starting.devices['rm712:in01'] = 'open';
  const incoming = model.assets.find(asset => asset.id === 'rm712:in01')!;
  incoming.evidenceIds = [...(incoming.evidenceIds ?? []), presenceId]; incoming.reviewIds = [...(incoming.reviewIds ?? []), presenceId];
  const s102 = model.assets.find(asset => asset.id === 'rm412:feeder-contact')!;
  s102.aliases = [...new Set([...(s102.aliases ?? []), s102.label, 'S102', 'Owner64/66: separate fixed switch S102'])];
  s102.label = 'S102\nSeparate fixed switch below Q100';
  s102.evidenceIds = [...(s102.evidenceIds ?? []), 'WN-INTERLOCK-P19']; s102.reviewIds = [...(s102.reviewIds ?? []), 'WN-INTERLOCK-P19'];
  const evidence = model.evidence!.find(record => record.id === 'WN-INTERLOCK-P19')!.references;
  const add = (suffix: string, target: string, require: InterlockCondition, explanation: string) => model.interlocks!.rules.push({ id: `WN-INTERLOCK-P19:${suffix}:${target}`, assetId: `rm412:${suffix}`, position: target, require, explanation, evidence });
  const incomingEarthsOpen = all(position('e100', 'open'), position('e101', 'open'));
  for (const suffix of ['s100', 's101']) add(suffix, 'closed', incomingEarthsOpen, 'Incoming Close requires both common-bar earths E100 and E101 Open.');
  add('q100', 'closed', all(position('feeder-contact', 'closed'), incomingEarthsOpen, position('e102', 'open')), 'Q100 Close requires S102 Closed and E100/E101/E102 Open.');
  add('feeder-contact', 'open', position('q100', 'open'), 'S102 Open requires Q100 Open.');
  add('feeder-contact', 'closed', all(position('q100', 'open'), position('e102', 'open')), 'S102 Close requires Q100 and E102 Open.');
  for (const suffix of ['e100', 'e101']) add(suffix, 'closed', all(...['s100', 's101', 'q100', 'feeder-contact'].map(id => position(id, 'open'))), 'Common-bar Earth Close requires S100, S101, Q100 and S102 Open.');
  add('e102', 'closed', all(position('q100', 'open'), position('feeder-contact', 'open')), 'E102 Close requires Q100 and S102 Open.');
  return model;
}
