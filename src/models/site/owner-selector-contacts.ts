import type { NetworkModel } from '../../session/model';
import type { EvidenceReference } from '../../session/evidence';

const rmuId = 'WN-RMU-SELECTOR-CONTACTS'; const lowerId = 'WN-RM413A-LOWER-CONTACTS';
const rows = [
  ...['rm406', 'rm410'].flatMap(board => ['01', '02', '03', '04'].map((number, index) => ({
    id: `${board}:sw${number}`, second: 'cable', external: index === 0 ? 'line' : 'cable',
    roleLink: index === 0 ? `${board}:incoming-bar` : `${board}:cb0${index}-sw${number}`,
    roleFrom: index === 0 ? `${board}:sw${number}:cable` : `${board}:cb0${index}:b`,
    roleTo: index === 0 ? `${board}:bus:bar` : `${board}:sw${number}:line`,
  }))),
  ...[['wh:h1:rm417', 'wh:h1'], ['wh:h9:rm419', 'wh:h9']].flatMap(([board, area]) => ['01', '02', '03', '04'].map((number, index) => ({
    id: `${board}:sw${number}`, second: 'common', external: index < 2 ? 'line' : 'common',
    roleLink: index < 2 ? `${area === 'wh:h9' ? area : board}:sw${number}-bus` : `${area}:cb0${index - 1}-sw${number}`,
    roleFrom: index < 2 ? `${board}:sw${number}:common` : `${board}:cb0${index - 1}:b`,
    roleTo: index < 2 ? `${board}:bus:bar` : `${board}:sw${number}:line`,
  }))),
  { id: 'rm413a:es-q8:lower', second: 'cable', external: 'cable', roleLink: 'rm413a:q1-lower-contact', roleFrom: 'rm413a:q1:b', roleTo: 'rm413a:es-q8:lower:line' },
];
const same = (left: unknown, right: unknown) => JSON.stringify(left) === JSON.stringify(right);

export function withOwnerSelectorContacts(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Selector contacts require a new immutable model version.');
  if (base.evidence?.some(record => [rmuId, lowerId].includes(record.id))) throw new Error('Selector contact decisions already applied.');
  const model = { ...structuredClone(base), version };
  const refs: EvidenceReference[] = [
    { document: 'CB19OP001B-04057-DR-EL-0002.pdf', revision: '4', page: 1, clause: 'RM406 RMU contact region' },
    { document: 'CB19OP001B-04057-DR-EL-0004.pdf', revision: '6', page: 1, clause: 'RM410 RMU contact region' },
    { document: 'CB16OP038A-02006-DR-EL-0044.pdf', revision: '2', page: 1, clause: 'RM417 RMU contact region' },
    { document: 'CB19OP001C-01068-DR-EL-0001.pdf', revision: '4', page: 1, clause: 'RM419 RMU contact region' },
  ];
  const lowerRefs: EvidenceReference[] = [
    { document: 'CB17OP023A-04057-DR-EL-0004.pdf', revision: '5', page: 1, clause: 'B–C/4–6, lower RM413A contact and TF413A side' },
    { document: 'CB-10016-DR-EL-0011.pdf', revision: '0', page: 1, clause: 'C–D/10–12, RM413A' },
  ];
  for (const row of rows) {
    const asset = model.assets.find(asset => asset.id === row.id);
    const main: [string, string] = [`${row.id}:line`, `${row.id}:${row.second}`]; const earth = `${row.id}:earth`;
    const role = model.connections.find(link => link.id === row.roleLink);
    if (asset?.kind !== 'disconnector' || !same(asset.terminals, [...main, earth]) || asset.conductivePairs.length || asset.sourceArcs !== undefined
      || asset.sourcePairs?.length || asset.earthPairs?.length || asset.positions.length !== 3
      || !same(asset.positions.find(position => position.id === 'service')?.pairs, [main]) || !same(asset.positions.find(position => position.id === 'isolated')?.pairs, [])
      || !same(asset.positions.find(position => position.id === 'earthed')?.pairs, [[main[1], earth]])
      || asset.positions.some(position => position.supportScope !== undefined || position.sourcePairs?.length || position.earthPairs?.length)
      || role?.from !== row.roleFrom || role.to !== row.roleTo || !role.evidenceIds?.length
      || !model.earths?.some(termination => termination.terminal === earth)
      || model.interlocks?.reviews.find(review => review.assetId === row.id)?.status !== 'confirmed-rules') throw new Error(`Review required: selector role/contact/earth mapping ${row.id} changed.`);
    const id = row.id === 'rm413a:es-q8:lower' ? lowerId : rmuId;
    for (const position of asset.positions) {
      position.pairs = position.id === 'service' ? [main] : position.id === 'earthed' ? [[`${row.id}:${row.external}`, earth]] : [];
      position.label = position.id === 'service' ? 'Service' : position.id === 'earthed' ? 'Earthed' : 'Isolated';
      position.supportScope = 'relationship'; position.knowledge = 'owner-confirmed';
      position.evidenceIds = [...(asset.evidenceIds ?? []), id]; position.reviewIds = [...(asset.reviewIds ?? []), id];
    }
    asset.evidenceIds = [...(asset.evidenceIds ?? []), id]; asset.reviewIds = [...(asset.reviewIds ?? []), id];
    const originalId = row.id === 'rm413a:es-q8:lower' ? 'SV-RM413A-LOWER-INTERPRETATION' : row.second === 'common' ? `${row.id}:position-evidence` : `${row.id}:contact-interpretation`;
    const original = model.evidence?.find(record => record.id === originalId);
    if (!original) throw new Error(`Review required: original selector interpretation ${originalId} missing.`);
    original.summary = `Current V1 contact matrix is selected by ${id}; use the scoped position pairs. Parent installation and independent earth-termination knowledge remain separate. Historical candidate interpretation (superseded for modeled contacts): ${original.summary}`;
    for (const boundary of model.boundaries ?? []) if (asset.terminals.includes(boundary.terminal) && /position/i.test(boundary.id)) {
      boundary.label = `${asset.label.replaceAll('\n', ' ')}: internal contact matrix selected by owner93/94; independent external/earth coverage remains Unconfirmed.`;
      boundary.evidenceIds = [...(boundary.evidenceIds ?? []), id]; boundary.reviewIds = [...(boundary.reviewIds ?? []), id];
    }
  }
  for (const [id, answer, references, question] of [
    [rmuId, 'approved', refs, 'Answer93: all16 RMU selectors Service joins main terminals with earth disconnected; Isolated no pair; Earthed only external incoming/onward/transformer cable side to earth, RMU bus side disconnected. Existing actions, baseline and prerequisites unchanged.'],
    [lowerId, 'aproved', lowerRefs, 'Answer94: lower RM413A selector Service Q1-side to TF413A-side; Isolated no pair; Earthed TF413A-side to own earth terminal, Q1-side disconnected. Baseline and approved action prerequisites unchanged.'],
  ] as const) {
    const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: answer };
    (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [...references, { document: 'Project owner conversation', revision: '2026-10-23', clause: question }], summary: `${question} Relationship-scoped position claims select only internal contact paths. Parent metadata, physical installation, external wires and earth-termination knowledge remain unchanged; these are not operational permissions or whole-model acceptance.` });
    (model.reviews ??= []).push({ id, status: 'resolved', question, evidenceIds: [id], resolution: confirmation });
  }
  return model;
}
