import type { NetworkModel } from '../../session/model';

const baselineId = 'WN-OWNER-STARTING-CONFIGURATION';
const noteMarker = 'Current teaching configuration note';
const currentNote = `${noteMarker} (${baselineId}): the teaching baseline contains 356 selected contact positions, with 4 contacts Unconfirmed, 119 racking positions and 3 available abstract supplies. Actual site positions, physical-interlock review and whole-model acceptance remain separate.`;
const reviewClauses = new Map([
  ['station:R005', 'every baseline is null.'],
  ['C1-R07', 'all represented controls remain blocked and positions null.'],
  ['C2-R11', 'All represented control baselines remain null and blocked.'],
  ['TL-R07', 'All construction device positions remain null;'],
  ['WH-Q12', 'All construction states remain null.'],
]);
const interlockClauses = new Map([
  ...['a', 'b', 'c'].flatMap(suffix => ['hv-cb', 'hv-es'].map(role => [`sw505:tf505${suffix}:${role}`, 'Baseline remains null.'] as const)),
  ['wh:h3:mc416a:in', 'baseline remains null.'],
  ['rm410:mc410a:cb', 'baseline is null.'],
]);
const annotate = (original: string) => `Historical construction note (before owner configuration): ${original}\n${currentNote}`;

/** Refresh current inspection metadata on a new package; preserve published packages and selected states. */
export function withCurrentConfigurationNotes(base: NetworkModel, version: string): NetworkModel {
  if (version === base.version || !version.trim()) throw new Error('Configuration note changes require a new immutable model version.');
  if (!base.evidence?.some(record => record.id === baselineId && record.status === 'owner-confirmed')) throw new Error('Current configuration notes require the recorded owner-selected starting configuration.');
  if (base.reviews?.some(record => record.question.includes(noteMarker))) throw new Error('Current configuration notes are already applied; use the prior immutable package.');
  const model = { ...structuredClone(base), version };
  for (const review of model.reviews ?? []) {
    const clause = reviewClauses.get(review.id);
    if (clause && review.question.includes(clause)) {
      review.question = annotate(review.question);
      review.evidenceIds = [...new Set([...review.evidenceIds, baselineId])];
    }
  }
  const reference = { document: 'Project owner conversation', revision: '2026-10-23', clause: `${baselineId}: selected teaching values from answers27,30–34,36,39–41. Actual site positions and physical-interlock acceptance remain separate; see the retained owner configuration record.` };
  for (const review of model.interlocks?.reviews ?? []) {
    const clause = interlockClauses.get(review.assetId);
    if (clause && review.note.includes(clause)) {
      review.note = annotate(review.note);
      review.evidence.push(reference);
    }
  }
  const representation = model.evidence?.find(record => record.id === 'BATTERY-STATION-REPRESENTATION');
  if (representation?.summary.includes('Availability is null;')) {
    representation.summary = annotate(representation.summary);
    representation.references.push(reference);
  }
  for (const sourceId of ['boundary:tf11', 'boundary:tf12', 'boundary:tf04']) {
    const source = model.sources.find(source => source.id === sourceId);
    const asset = model.assets.find(asset => asset.id === source?.assetId);
    if (!asset) throw new Error(`Current configuration captions require the retained abstract source ${sourceId}.`);
    asset.label = asset.label.split('\n').map(line => line === 'Availability unconfirmed' ? 'Simulation supply input' : line).join('\n');
  }
  return model;
}
