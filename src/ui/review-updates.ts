import type { NetworkModel } from '../session/model';
import { modelControlStatus } from './ModelReviewStatus';

const startingReviews = new Set(['sw411:R005', 'station:R005', 'C1-R06', 'C1-R07', 'C2-R11', 'SC-R05', 'SW-R09', 'TL-R07', 'CV-R10', 'WH-Q12', 'SV-Q12', 'H10-Q07']);
const interlockReviews = new Set(['sw411:R003', 'station:R003', 'PL-IDS-INTERLOCKS', 'SC-R02', 'SC-R03', 'SW-R07', 'TL-R05', 'CV-R09', 'WH-Q08']);

// Presentation notes for the frozen owner-reviewed package. Original questions,
// evidence, statuses and saved scenarios retain their recorded content.
export function currentReviewUpdates(model: NetworkModel) {
  const notes = new Map<string, string>();
  if (model.id !== 'site-whole-network' || model.version !== 'construction-2026-10-23.10') return notes;
  const status = modelControlStatus(model);
  if (!status.complete) return notes;
  for (const id of startingReviews) notes.set(id, 'V1 update: every modeled control has a selected starting state and a reviewed local control profile. Source starting values are recorded in the model. Earlier wording about null baselines or blocked, unresolved local profiles is superseded. Whole-model acceptance, actual site status and other topics in the original question remain separate.');
  for (const id of interlockReviews) notes.set(id, 'V1 update: every modeled control has a reviewed local action profile. Earlier wording that all local controls are unresolved or blocked is superseded. Explicitly deferred key, door and inching sequences remain outside V1. Remaining physical-installation, identity and other topics in the original question are not resolved by these model selections.');
  return notes;
}
