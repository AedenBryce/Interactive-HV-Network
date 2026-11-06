import type { NetworkModel } from '../../session/model';
import { isBreakerState } from '../../session/mechanisms';
import selected from '../../../drawing-review/supplemental/confirmed-baseline.json';
import proposal from '../../../drawing-review/supplemental/baseline-proposal.json';

// Owner answer41 explicitly maps the selected Closed contact to Service for these16 models only.
const serviceContacts = new Set(['rm406:sw', 'rm410:sw', 'wh:h1:rm417:sw', 'wh:h9:rm419:sw'].flatMap(prefix => ['01', '02', '03', '04'].map(suffix => `${prefix}${suffix}`)));

export function withOwnerStartingConfiguration(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-OWNER-STARTING-CONFIGURATION';
  if (base.evidence?.some(record => record.id === id)) throw new Error('Starting selections already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  const contacts = [
    ...selected.contacts.map(row => ({ assetId: row.assetId, position: row.position })),
    ...proposal.records.filter(row => row.proposedContact !== null).map(row => ({ assetId: row.assetId, position: row.proposedContact! })),
    { assetId: 'line33:tie-in-abs', position: 'closed' },
  ];
  if (contacts.length !== 356 || new Set(contacts.map(row => row.assetId)).size !== 356) throw new Error('Selected contact inventory changed; owner review is required.');
  for (const row of contacts) {
    const asset = model.assets.find(candidate => candidate.id === row.assetId);
    const state = model.starting.devices[row.assetId];
    const position = serviceContacts.has(row.assetId) && row.position === 'closed' ? 'service' : row.position;
    if (!asset || !['open', 'closed'].includes(row.position) || (isBreakerState(state) ? state.contact !== null : state !== null)) throw new Error(`Starting contact mapping changed for ${row.assetId}; do not replace an existing value.`);
    if (asset.removableBreaker && isBreakerState(state)) state.contact = row.position as 'open' | 'closed';
    else if (asset.positions.some(candidate => candidate.id === position)) model.starting.devices[row.assetId] = position;
    else throw new Error(`Unsupported selected contact for ${row.assetId}.`);
  }
  if (selected.racking.length !== 119) throw new Error('Selected racking inventory changed; source/owner review is required.');
  for (const row of selected.racking) {
    const state = model.starting.devices[row.assetId];
    if (!isBreakerState(state) || state.racking !== null || !['in', 'out'].includes(row.position)) throw new Error(`Starting racking mapping changed for ${row.assetId}.`);
    state.racking = row.position as 'in' | 'out';
  }
  for (const row of selected.sources) {
    if (!model.sources.some(source => source.id === row.sourceId) || model.starting.sources[row.sourceId] !== null) throw new Error(`Starting source mapping changed for ${row.sourceId}.`);
    model.starting.sources[row.sourceId] = row.enabled;
  }
  const confirmation = { by: 'Project owner (conversation)', date: '2026-10-23', decision: 'Answer40: Approve the listed proposal. Answer39: Closed. Answer41: Yes, Closed means Service for these16. Retain the earlier exact selections in answers27,30–34,36.' };
  (model.evidence ??= []).push({ id, status: 'owner-confirmed', confirmation, references: [{ document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answers27,30–34,36,39–41. Exact answers, named ties, scope and four retained contact exceptions: drawing-review/supplemental/owner-configuration-review.md. Answer40 approved BASELINE-PROPOSAL-2026-10-23:184 proposed Closed,10 proposed Open,4 Unconfirmed and the separately answered tie Closed. Answer41 explicitly maps Closed to Service (main contact connected, earth contact open) for RM406 SW01–SW04, RM410 SW01–SW04, RM417 SW01–SW04 and RM419 SW01–SW04 only.' }], summary: 'Selected teaching baseline:356 known contact positions (including16 explicitly mapped Service positions),4 Unconfirmed contacts,119 racking positions (116 In;3 named ties Out),3 available abstract supplies. This is not a live-site status report, physical hardware/category confirmation, interlock permission or whole-model acceptance. The original contact/racking axes remain independent; source/earth relationships and interlock reviews are unchanged.' });
  (model.reviews ??= []).push({ id, status: 'resolved', question: 'Record selected simulation values only, retaining the four unconfirmed contact exceptions. Full model and physical-interlock acceptance remain separate.', evidenceIds: [id], resolution: confirmation });
  return model;
}
