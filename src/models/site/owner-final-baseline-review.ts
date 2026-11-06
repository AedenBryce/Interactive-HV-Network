import type { NetworkModel } from '../../session/model';
import { getRemovableMechanism, isIndependentState } from '../../session/mechanisms';

const ownerBaselineId = 'WN-OWNER-STARTING-CONFIGURATION';
const inventoryId = 'WN-CURRENT-CONFIGURATION-INVENTORY';
const sw411ReviewId = 'sw411:R005';
const stationReviewId = 'station:R005';

/**
 * Publish a final presentation package after every modeled control has a
 * selected teaching position and local V1 action profile. This refreshes
 * review prose only; it does not change network topology, positions, or rules.
 */
export function withOwnerFinalBaselineReview(base: NetworkModel, version: string): NetworkModel {
  if (!version.trim() || version === base.version) throw new Error('Final baseline review requires a new immutable model version.');
  if (base.evidence?.some(record => record.id === 'WN-OWNER-FINAL-BASELINE-REVIEW')) throw new Error('Final baseline review already applied.');

  const model = { ...structuredClone(base), version };
  const controls = model.assets.filter(asset => asset.positions.length > 0 || getRemovableMechanism(asset));
  const interlocksByAsset = new Map((model.interlocks?.reviews ?? []).map(review => [review.assetId, review]));

  for (const asset of controls) {
    const state = model.starting.devices[asset.id];
    const mechanism = getRemovableMechanism(asset);
    if (mechanism) {
      if (!isIndependentState(state) || state.contact === null || state.racking === null) {
        throw new Error(`Final teaching baseline is incomplete for removable control ${asset.id}.`);
      }
    } else if (typeof state !== 'string' || !asset.positions.some(position => position.id === state)) {
      throw new Error(`Final teaching baseline is incomplete for control ${asset.id}.`);
    }

    const profile = interlocksByAsset.get(asset.id);
    if (!profile || profile.status === 'unresolved') {
      throw new Error(`Final local V1 interlock profile is unresolved for ${asset.id}.`);
    }
  }

  const stateLabel = (assetId: string) => {
    const state = model.starting.devices[assetId];
    if (isIndependentState(state)) return `${capitalize(state.contact!)} · Rack ${capitalize(state.racking!)}`;
    if (typeof state === 'string') return capitalize(state);
    throw new Error(`No selected position is available for ${assetId}.`);
  };
  const stateCounts = new Map<string, number>();
  for (const asset of controls) {
    const state = model.starting.devices[asset.id];
    const label = isIndependentState(state) ? state.contact! : state as string;
    stateCounts.set(label, (stateCounts.get(label) ?? 0) + 1);
  }
  const removable = controls.filter(asset => getRemovableMechanism(asset));
  const rackingCounts = new Map<string, number>();
  for (const asset of removable) {
    const state = model.starting.devices[asset.id];
    if (!isIndependentState(state)) throw new Error(`Missing racking state for ${asset.id}.`);
    rackingCounts.set(state.racking!, (rackingCounts.get(state.racking!) ?? 0) + 1);
  }
  const profileCounts = new Map<string, number>();
  for (const profile of interlocksByAsset.values()) profileCounts.set(profile.status, (profileCounts.get(profile.status) ?? 0) + 1);
  const selectedSources = Object.values(model.starting.sources).filter(enabled => enabled === true).length;
  const selectedStateSummary = [...stateCounts].map(([state, count]) => `${count} ${capitalize(state)}`).join(', ');
  const rackingSummary = [...rackingCounts].map(([state, count]) => `${count} Rack ${capitalize(state)}`).join(', ');
  const profileSummary = [...profileCounts].map(([status, count]) => `${count} ${status}`).join(', ');
  const inventorySummary = `Final teaching configuration inventory for ${version}: ${controls.length} modeled controls have selected starting positions (${selectedStateSummary}); all ${removable.length} removable controls have selected racking positions (${rackingSummary}). All ${controls.length} controls have non-unresolved local V1 profiles (${profileSummary}). ${selectedSources} abstract supply inputs are enabled in this teaching model. These are simulation selections only; current/live equipment positions and source availability, physical installation, source/earth coverage, operational permission and whole-model acceptance remain unconfirmed.`;
  const packageReference = {
    document: `Software model package ${model.id}`,
    revision: version,
    clause: 'Computed from the final package starting positions, removable racking axes and local V1 interlock profile statuses. These package values are teaching selections, not installed/live equipment status or operational permission.',
  };

  const inventory = model.evidence?.find(record => record.id === inventoryId);
  if (!inventory) throw new Error('Final configuration inventory evidence is missing.');
  inventory.summary = inventorySummary;
  inventory.references = [...inventory.references.filter(reference => reference.document !== packageReference.document), packageReference];

  const ownerBaseline = model.evidence?.find(record => record.id === ownerBaselineId);
  if (!ownerBaseline) throw new Error('Owner-selected baseline evidence is missing.');
  ownerBaseline.summary = `The owner-selected teaching baseline was first recorded with four unresolved contact exceptions. Later owner selections and completed V1 profiles resolved and removed those four exceptions from the final model. The final package contains ${controls.length} controls with selected model starting positions, including ${removable.length} removable controls with selected racking states. These values describe the simulation baseline only; live equipment positions and source availability remain unconfirmed.`;
  ownerBaseline.references = [...ownerBaseline.references.filter(reference => reference.document !== packageReference.document), packageReference];

  const ownerBaselineReview = model.reviews?.find(review => review.id === ownerBaselineId);
  if (!ownerBaselineReview) throw new Error('Resolved owner-selected baseline review is missing.');
  ownerBaselineReview.question = `Record the selected teaching-model baseline. The four contact exceptions in the initial owner-approved proposal were resolved by later owner selections and are absent from the final package. This resolved review covers simulation values only; live equipment positions, live source availability and whole-model physical acceptance remain separate.`;
  ownerBaselineReview.evidenceIds = [...new Set([...ownerBaselineReview.evidenceIds, inventoryId])];

  for (const reviewId of [sw411ReviewId, stationReviewId]) {
    const review = model.reviews?.find(candidate => candidate.id === reviewId);
    if (!review) throw new Error(`Required open baseline review is missing: ${reviewId}.`);
    review.question = `${inventorySummary} This review remains open because the selected simulation baseline does not confirm current/live equipment positions, source availability, physical installation or whole-model acceptance.`;
    review.evidenceIds = [...new Set([...review.evidenceIds, ownerBaselineId, inventoryId])];
  }

  const staleBaselinePhrase = /(?:actual\s+)?(?:starting\s+)?baseline(?:\s+positions?)?\s+(?:remains?|is|are)\s+null\.?/gi;
  for (const review of model.interlocks?.reviews ?? []) {
    if (!staleBaselinePhrase.test(review.note)) continue;
    staleBaselinePhrase.lastIndex = 0;
    const asset = model.assets.find(candidate => candidate.id === review.assetId);
    if (!asset) throw new Error(`Interlock baseline note references missing control ${review.assetId}.`);
    const position = stateLabel(asset.id);
    const replacement = `Current selected teaching-model position: ${position}. This is a simulation starting value only; the live equipment position remains unconfirmed.`;
    review.note = review.note.replace(staleBaselinePhrase, replacement);
    review.evidence = [...review.evidence.filter(reference => reference.document !== packageReference.document), packageReference];
    staleBaselinePhrase.lastIndex = 0;
  }

  (model.evidence ??= []).push({
    id: 'WN-OWNER-FINAL-BASELINE-REVIEW',
    status: 'supported',
    references: [packageReference],
    summary: `Final-package consistency check: ${inventorySummary}`,
  });
  return model;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
