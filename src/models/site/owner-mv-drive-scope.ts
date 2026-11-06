import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

export const mvDriveBindings = [
  ...['meb', 'mea'].map(name => ({
    converter: `hpgr:drive-${name}:converter`, inputs: [`hpgr:drive-${name}:converter:ac-star`, `hpgr:drive-${name}:converter:ac-delta`],
    dc: `hpgr:drive-${name}:converter:dc`, output: `hpgr:drive-${name}:converter:output`, motor: `hpgr:motor-${name}`,
  })),
  ...['01', '02', '03'].map((number, index) => ({
    converter: `sw505:vs505${number}:converter`, inputs: [`sw505:vs505${number}:ac-d`, `sw505:vs505${number}:ac-y`],
    dc: `sw505:vs505${number}:dc`, output: `sw505:vs505${number}:output`, motor: `sw505:sb${214 + index}-em01`,
  })),
];
const scopeId = 'WN-MV-DRIVE-SCOPE';
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

/** Record owner79 scope only; converter relationships and outlet profiles remain separate. */
export function withOwnerMvDriveScope(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('MV drive scope requires a new immutable version.');
  if (base.evidence?.some(record => record.id === scopeId)) throw new Error('MV drive scope already applied.');
  const model = { ...structuredClone(base), version };
  const refs: EvidenceReference[] = [{ document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answer79 exact: Include converter-to-motor connectivity. This selects scope only for HPGR MEB/MEA and SW505 VS50501/02/03; transfer rules, earth behavior and HPGR outlet mechanisms/local actions require separate decisions.' }];
  for (const drive of mvDriveBindings) {
    const converter = model.assets.find(asset => asset.id === drive.converter); const motor = model.assets.find(asset => asset.id === drive.motor);
    const sourceRefs = (converter?.evidenceIds ?? []).flatMap(id => model.evidence?.find(record => record.id === id)?.references ?? []);
    if (converter?.kind !== 'interface' || !same(converter.terminals, [...drive.inputs, drive.dc, drive.output]) || converter.sourceArcs !== undefined
      || converter.conductivePairs.length || converter.sourcePairs?.length || converter.earthPairs?.length || converter.positions.length || !sourceRefs.length
      || motor?.kind !== 'interface' || !same(motor.terminals, [`${drive.motor}:port`])) throw new Error(`Review required: exact converter/motor scope binding ${drive.converter} changed.`);
    refs.push(...sourceRefs);
    for (const asset of [converter, motor]) {
      asset.evidenceIds = [...(asset.evidenceIds ?? []), scopeId]; asset.reviewIds = [...(asset.reviewIds ?? []), scopeId];
    }
    if (motor.label.includes('Scope unconfirmed')) {
      motor.aliases = [...new Set([...(motor.aliases ?? []), motor.label])];
      motor.label = motor.label.replace('Scope unconfirmed', 'Included MV-drive endpoint · transfer under review');
    }
  }
  for (const [id, label] of [
    ['crushing-2/hpgr-drives', 'Crushing 2 / HPGR · MV converters and motors · transfer under review'],
    ['stockpile/mv-drives', 'Stockpile / wet plant · MV scrubber drives and motors · transfer under review'],
  ]) {
    const view = model.presentation?.views.find(view => view.id === id);
    if (!view) throw new Error(`Review required: included MV-drive view ${id} missing.`);
    view.label = label;
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'Include converter-to-motor connectivity' };
  (model.evidence ??= []).push({ id: scopeId, status: 'owner-confirmed', confirmation, references: [...new Map(refs.map(ref => [JSON.stringify(ref), ref])).values()], summary: 'Owner79 includes exactly HPGR MEB/MEA and SW505 VS50501/02/03 converter/motor branches in V1. Scope only: this record enables no internal electrical transfer, outlet action or new operating state. Source/earth behavior, converter policy, HPGR outlet mechanisms and whole-model acceptance remain separate.' });
  (model.reviews ??= []).push({ id: scopeId, status: 'resolved', question: 'Included scope of five MV converter/motor branches only.', evidenceIds: [scopeId], resolution: confirmation });
  return model;
}
