import type { Asset, NetworkModel } from '../session/model';
import { isSourceArcSupported } from '../session/evidence';
import { modelControlStatus } from './ModelReviewStatus';
import { isFuse } from './equipment-appearance';

const startingReviews = new Set(['sw411:R005', 'station:R005', 'C1-R06', 'C1-R07', 'C2-R11', 'SC-R05', 'SW-R09', 'TL-R07', 'CV-R10', 'WH-Q12', 'SV-Q12', 'H10-Q07']);
const interlockReviews = new Set(['sw411:R003', 'station:R003', 'PL-IDS-INTERLOCKS', 'SC-R02', 'SC-R03', 'SW-R07', 'TL-R05', 'CV-R09', 'WH-Q08']);

// Superseded construction annotations are presentation text, not equipment
// verification. The frozen original label remains available in evidence details.
export function currentAssetLabel(model: NetworkModel, asset: Asset) {
  if (model.id !== 'site-whole-network' || model.version !== 'construction-2026-10-23.10') return asset.label;
  if (isFuse(asset)) return asset.label.replace(/\s*actual condition unconfirmed/gi, '').replace(/Intact in teaching model/gi, 'Closed · intact fuse');
  if (['sw411:tier-03:cb', 'sw411:tier-03:es', 'wh:h7:rm418:sw01:es'].includes(asset.id)) return asset.label.replace('unconfirmed', 'tag unconfirmed');
  if (asset.kind === 'transformer' && asset.sourceArcs?.some(arc => arc.id.includes(':forward-') && isSourceArcSupported(model, asset, arc))) {
    return asset.label.replace(/Transfer unconfirmed/gi, 'Primary→secondary model selected');
  }
  if (['rm714:in01:es', 'rm714:in02:es', 'rm714:tf714:es'].includes(asset.id) && model.connections.filter(link => asset.terminals.includes(link.from) || asset.terminals.includes(link.to)).every(link => link.knowledge === 'supported' || link.knowledge === 'owner-confirmed')) {
    return asset.label.replace('path review pending', 'local path selected');
  }
  if (asset.id === 'sw435:tf436:hv-es' && model.starting.devices[asset.id] != null) return asset.label.replace('state unconfirmed', 'V1 starting state selected');
  return asset.label;
}

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
