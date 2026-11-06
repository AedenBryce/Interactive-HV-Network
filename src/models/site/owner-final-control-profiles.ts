import type { Asset, NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';
import type { InterlockCondition } from '../../session/interlocks';
import inventory from '../../../drawing-review/supplemental/interlock-profile-review.json';
import { tidyPresentation } from './owner-scope-connections';

const cb = 'rm413a:q1'; const lower = 'rm413a:es-q8:lower'; const upper = 'rm413a:es-q8:upper';
const formerIds = ['cv006:abs:49-38-1', 'cv006:fused-abs:286'];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);
const unique = (refs: EvidenceReference[]) => [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()];
const pos = (assetId: string, position: string): InterlockCondition => ({ kind: 'device', assetId, position });
const all = (...conditions: InterlockCondition[]): InterlockCondition => ({ kind: 'all', conditions });

/** Owner73/74/77 local profiles and owner76 absent former22kV control treatment. */
export function withOwnerFinalControlProfiles(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-INTERLOCK-P20'; const removalId = 'WN-FORMER22KV-HARDWARE-REMOVED';
  if (!version.trim() || version === base.version) throw new Error('Final control profiles require a new immutable model version.');
  if (base.evidence?.some(record => record.id === id || record.id === removalId)) throw new Error('Final control selections already applied.');
  const model = { ...structuredClone(base), version };
  if (!model.interlocks || !model.presentation) throw new Error('Review required: existing controls/presentation missing.');
  const group = inventory.groups.find(group => group.id === 'P20');
  if (!group || group.assetIds.length !== 3 || group.assetIds.some(id => ![cb, lower, upper].includes(id))) throw new Error('Review required: exact P20 inventory changed.');
  const refs: EvidenceReference[] = [
    { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer73 exact: Confirm all three mechanisms and lower Service baseline. Answer74 exact: confirmed (full proposed Q1/lower profile recorded in drawing-review/supplemental/owner-interlocks-review.md). Answer75 action wording was ambiguous and not used as permission. Answer77 exact: Earth Close requires both Open; Earth Open unrestricted; no other V1 prerequisites. Upper ES-Q8 Close requires RM413 IN02 and Q1 Open. No RM417-end guard is added. Unknown prerequisites block; no racking or additional local/key conditions. This selects a teaching profile, not operational permission or absence of incoming sources.' },
    { document: 'drawing-review/supplemental/interlock-profile-review.json', revision: inventory.reviewDate, clause: 'P20 exact three controls and original references.' },
    ...group.assets.flatMap(row => row.references),
  ];
  const branch = (id: string, from: string, to: string) => {
    const link = model.connections.find(link => link.id === id);
    const references = (link?.evidenceIds ?? []).flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
    if (link?.from !== from || link.to !== to || !references.length) throw new Error(`Review required: RM413A evidenced branch ${id} changed.`);
    refs.push(...references);
  };
  const fixed = (assetId: string, kind: Asset['kind']) => {
    const found = model.assets.find(asset => asset.id === assetId);
    if (!found || found.kind !== kind || found.removableBreaker || found.removableContactor || found.removableDisconnector || !same(found.terminals, [`${assetId}:a`, `${assetId}:b`])
      || found.conductivePairs.length || found.sourcePairs?.length || found.earthPairs?.length || found.sourceArcs !== undefined || found.positions.length !== 2
      || found.positions.find(option => option.id === 'open')?.pairs.length !== 0 || !same(found.positions.find(option => option.id === 'closed')?.pairs, [found.terminals])
      || found.positions.some(option => option.sourcePairs?.length || option.earthPairs?.length)) throw new Error(`Review required: fixed RM413A mechanism ${assetId} changed.`);
    return found;
  };
  fixed(cb, 'breaker'); fixed(upper, 'earth-switch'); fixed('rm413:in02', 'disconnector');
  const selector = model.assets.find(asset => asset.id === lower);
  const terminals = [`${lower}:line`, `${lower}:cable`, `${lower}:earth`];
  if (!selector || selector.kind !== 'disconnector' || selector.removableBreaker || selector.removableContactor || selector.removableDisconnector
    || !same(selector.terminals, terminals) || selector.conductivePairs.length || selector.sourcePairs?.length || selector.earthPairs?.length || selector.sourceArcs !== undefined
    || selector.positions.length !== 3 || !same(selector.positions.find(option => option.id === 'service')?.pairs, [[terminals[0], terminals[1]]])
    || selector.positions.find(option => option.id === 'isolated')?.pairs.length !== 0 || !same(selector.positions.find(option => option.id === 'earthed')?.pairs, [[terminals[1], terminals[2]]])
    || selector.positions.some(option => option.sourcePairs?.length || option.earthPairs?.length) || model.starting.devices[lower] !== null) throw new Error('Review required: RM413A lower three-position mechanism/baseline changed.');
  branch('rm413:double-boot-rm413a', 'rm413:in02:a', 'rm413a:bus:bar');
  branch('rm413a:q1-bar', 'rm413a:bus:bar', `${cb}:a`);
  branch('rm413a:q1-lower-contact', `${cb}:b`, terminals[0]);
  branch(`${upper}:branch`, 'rm413a:bus:bar', `${upper}:a`);
  if (!model.earths?.some(earth => earth.terminal === `${upper}:b`) || !model.earths.some(earth => earth.terminal === terminals[2])
    || model.connections.filter(link => link.from === `${upper}:a` || link.to === `${upper}:a`).length !== 1) throw new Error('Review required: RM413A earth terminations changed.');
  const evidence = unique(refs);
  for (const assetId of [cb, lower, upper]) {
    const review = model.interlocks.reviews.find(review => review.assetId === assetId);
    if (!review || review.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: existing P20 review/rules ${assetId} changed.`);
    review.status = 'confirmed-rules'; review.evidence = unique([...review.evidence, ...evidence]);
    review.note = `Owner73/74/77 select the exact mechanisms, lower Service baseline and complete P20 local action profile. Unknown prerequisites block. Upper Earth Close requires RM413 IN02 and Q1 Open; Earth Open unrestricted. No additional RM417/key prerequisite is modeled. The double-boot incoming bar remains connected as drawn; these local rules do not prove source absence or operational permission. Historical review context: ${review.note}`;
  }
  model.starting.devices[lower] = 'service';
  selector.aliases = [...new Set([...(selector.aliases ?? []), selector.label])]; selector.label = 'ES-Q8 · lower\nService / Isolated / Earthed';
  for (const option of selector.positions) option.label = option.id === 'service' ? 'Service' : option.id === 'isolated' ? 'Isolated' : 'Earthed';
  for (const assetId of [cb, lower, upper]) {
    const found = model.assets.find(asset => asset.id === assetId)!;
    found.evidenceIds = [...(found.evidenceIds ?? []), id]; found.reviewIds = [...(found.reviewIds ?? []), id];
  }
  const add = (assetId: string, target: string, require: InterlockCondition, explanation: string) => model.interlocks!.rules.push({ id: `${id}:${assetId}:${target}`, assetId, position: target, require, explanation, evidence });
  add(cb, 'closed', all(pos(lower, 'service'), pos(upper, 'open')), 'Q1 Close requires lower switch Service and upper ES-Q8 Open.');
  add(lower, 'isolated', pos(cb, 'open'), 'Lower switch movement requires Q1 Open.');
  add(lower, 'service', all(pos(cb, 'open'), pos(lower, 'isolated'), pos(upper, 'open')), 'Select Service only from Isolated with Q1 and upper earth Open.');
  add(lower, 'earthed', all(pos(cb, 'open'), pos(lower, 'isolated')), 'Select Earthed only from Isolated with Q1 Open.');
  add(upper, 'closed', all(pos('rm413:in02', 'open'), pos(cb, 'open')), 'Upper ES-Q8 Close requires RM413 IN02 and Q1 Open. No additional V1 prerequisite selected.');
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: '73: Confirm all three mechanisms and lower Service baseline; 74: confirmed; 77: Earth Close requires both Open; Earth Open unrestricted; no other V1 prerequisites' };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: evidence, summary: 'Scoped RM413A mechanisms, lower Service baseline and complete local teaching profile. Electrical relationships and claim knowledge remain separate; no RM417 guard or source-absence inference is supplied. Whole-model acceptance and operational permission remain separate.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'P20 selected V1 local actions/mechanisms/baseline only.', evidenceIds: [id], resolution: confirmation });

  const removalConfirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'The hardware no longer exists. assume that line is non-existent now.' };
  const removalReferences = [{ document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer76 explicitly confirms absence of former CV006 ABS49-38-1 and fused ABS286 hardware and former22kV Hopper10 line. Preserve only disconnected historical drawing markers, no current switch state or active connections. This is separate from the current TF04 33kV route.' }, { document: 'CB19OP001B-04057-DR-EL-0001.pdf', revision: '6', page: 1, clause: 'Row A, former22kV Hopper10 branch; historical drawing depiction superseded by owner76 hardware confirmation.' }];
  for (const assetId of formerIds) {
    const found = fixed(assetId, 'disconnector');
    const review = model.interlocks.reviews.find(review => review.assetId === assetId);
    if (model.starting.devices[assetId] !== null || review?.status !== 'unresolved' || model.interlocks.rules.some(rule => rule.assetId === assetId)) throw new Error(`Review required: former OHL control ${assetId} changed.`);
    const links = model.connections.filter(link => found.terminals.includes(link.from) || found.terminals.includes(link.to));
    if (assetId === formerIds[0] ? links.length !== 1 || links[0].id !== 'cv006:pole49-38-abs-branch' || links[0].from !== 'cv006:pole:49-38:port' || links[0].to !== `${assetId}:a` : links.length !== 0) throw new Error(`Review required: former OHL active branch inventory ${assetId} changed.`);
    found.aliases = [...new Set([...(found.aliases ?? []), found.label])];
    found.label = `${assetId === formerIds[0] ? 'Former ABS49-38-1' : 'Former fused ABS286'}\nHistorical drawing marker · hardware removed`;
    found.kind = 'interface'; found.positions = [];
    found.evidenceIds = [...(found.evidenceIds ?? []), removalId]; found.reviewIds = [...(found.reviewIds ?? []), removalId];
    model.connections = model.connections.filter(link => !found.terminals.includes(link.from) && !found.terminals.includes(link.to));
    delete model.starting.devices[assetId];
  }
  model.interlocks.reviews = model.interlocks.reviews.filter(review => !formerIds.includes(review.assetId));
  model.evidence.push({ id: removalId, status: 'owner-confirmed', confirmation: removalConfirmation, references: removalReferences, summary: 'Owner76 confirms the two former22kV controls and line hardware absent. The stable drawing identities remain only as disconnected historical markers; their switching controls, baseline entries and last active branch stub are removed. Current33kV route untouched; no old/new pole equivalence established.' });
  model.reviews.push({ id: removalId, status: 'resolved', question: 'Presence and V1 treatment of former22kV Hopper10 branch controls only.', evidenceIds: [removalId], resolution: removalConfirmation });
  tidyPresentation(model);
  return model;
}
