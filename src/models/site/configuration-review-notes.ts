import type { NetworkModel } from '../../session/model';
import { getRemovableMechanism, isIndependentState } from '../../session/mechanisms';

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

/** Refresh inherited package-wide counts after explicitly selected new mechanisms. */
export function withExpandedMechanismNotes(base: NetworkModel, version: string): NetworkModel {
  const profileIds = ['WN-INTERLOCK-P05', 'WN-INTERLOCK-P07'];
  if (profileIds.some(id => !base.evidence?.some(record => record.id === id && record.status === 'owner-confirmed'))) throw new Error('Expanded configuration notes require the selected LV and contactor profiles.');
  const model = { ...structuredClone(base), version };
  const mechanisms = model.assets.filter(asset => getRemovableMechanism(asset));
  const states = mechanisms.map(asset => model.starting.devices[asset.id]);
  if (states.some(state => !isIndependentState(state))) throw new Error('Expanded configuration notes require explicit mechanism starting states.');
  const contacts = Object.values(model.starting.devices).map(state => isIndependentState(state) ? state.contact : state);
  const updated = `Current expanded teaching configuration: ${contacts.filter(state => state !== null).length} selected contact positions, ${contacts.filter(state => state === null).length} contacts Unconfirmed, ${mechanisms.length} independent racking positions and ${Object.values(model.starting.sources).filter(state => state === true).length} available abstract supplies. Later owner46/51 selections add two LV breaker mechanisms and24 removable contactors. Actual site positions, physical truth and whole-model acceptance remain separate.`;
  const qualify = (text: string) => text.includes(currentNote) ? `${updated}\nHistorical .3 configuration description (retained provenance; counts superseded above): ${text}` : text;
  const reference = { document: 'Project owner conversation', revision: '2026-10-23', clause: 'Answers46/51: two LV incomers selected removable and all24 FC/RC contactors selected removable with Open/Rack in baseline. Exact decisions and identities remain in WN-INTERLOCK-P05/P07. These are model selections, not live state or physical switching permission.' };
  for (const review of model.reviews ?? []) if (review.question.includes(currentNote)) {
    review.question = qualify(review.question);
    review.evidenceIds = [...new Set([...review.evidenceIds, ...profileIds])];
  }
  for (const review of model.interlocks?.reviews ?? []) if (review.note.includes(currentNote)) {
    review.note = qualify(review.note); review.evidence.push(reference);
  }
  for (const record of model.evidence ?? []) if (record.summary.includes(currentNote)) {
    record.summary = qualify(record.summary); record.references.push(reference);
  }
  return model;
}

export function withLatestConfigurationNotes(base: NetworkModel, version: string): NetworkModel {
  const id = 'WN-CURRENT-CONFIGURATION-INVENTORY';
  if (!version.trim() || version === base.version) throw new Error('Current configuration inventory requires a new immutable version.');
  if (base.evidence?.some(record => record.id === id)) throw new Error('Current configuration inventory already applied.');
  const selections = ['WN-FUSE-CONTINUITY', 'WN-MV-DRIVE-SCOPE', 'WN-MV-CONVERTER-FORWARD-POLICY', 'WN-HPGR-OUTLET-PROFILE', 'WN-DROP-TOWER-SCOPE'];
  if (selections.some(id => !base.evidence?.some(record => record.id === id && record.status === 'owner-confirmed'))) throw new Error('Review required: latest configuration selections are missing.');
  const model = { ...structuredClone(base), version };
  const contacts = Object.values(model.starting.devices).map(state => isIndependentState(state) ? state.contact : state);
  const summary = `Current teaching configuration:${contacts.filter(state => state !== null).length} selected contact positions,${contacts.filter(state => state === null).length} contacts Unconfirmed,${model.assets.filter(asset => getRemovableMechanism(asset)).length} independent racking positions,${Object.values(model.starting.sources).filter(state => state === true).length} available abstract supplies. All${model.interlocks!.reviews.filter(review => review.status !== 'unresolved').length} local control profiles are selected;${model.interlocks!.reviews.filter(review => review.status === 'unresolved').length} remain unresolved. Selected fuse/converter/outlet/Drop Tower decisions are scoped; actual site status, independent earth/reverse behavior, external coverage and whole-model acceptance remain separate.`;
  const references = [{ document: `Software model package ${model.id}`, revision: version, clause: 'Counted from this immutable package: starting contact/racking/source values and local control review statuses. Software inventory, not installed equipment acceptance.' }];
  (model.evidence ??= []).push({ id, status: 'supported', references, summary });
  const qualify = (text: string) => `${summary}\nHistorical configuration descriptions (prior counts superseded above): ${text}`;
  for (const review of model.reviews ?? []) if (review.question.includes('Current expanded teaching configuration:')) {
    review.question = qualify(review.question); review.evidenceIds = [...new Set([...review.evidenceIds, id, ...selections])];
  }
  for (const record of model.evidence) if (record.id !== id && record.summary.includes('Current expanded teaching configuration:')) {
    record.summary = qualify(record.summary); record.references.push(...references);
  }
  for (const review of model.interlocks?.reviews ?? []) if (review.note.includes('Current expanded teaching configuration:')) {
    review.note = qualify(review.note); review.evidence.push(...references);
  }
  for (const reviewId of ['C2-R10', 'SW-R06']) {
    const review = model.reviews?.find(record => record.id === reviewId);
    if (!review) throw new Error(`Review required: inherited converter scope review ${reviewId} missing.`);
    review.question = `Selected V1 converter/motor scope and forward AC→DC→output behavior are recorded by owner79/80 for HPGR MEB/MEA and SW505 VS50501/02/03. Owner82 selects the two HPGR outlet profiles. Remaining physical metadata, reverse/earth behavior, ratings and whole-model acceptance remain separate; this broad review stays open. Historical construction question: ${review.question}`;
    review.evidenceIds = [...new Set([...review.evidenceIds, ...selections.slice(1, 4)])];
  }
  const cv = model.reviews?.find(record => record.id === 'CV-R11');
  if (!cv) throw new Error('Review required: inherited CV006 coverage question missing.');
  cv.question = `Drop Tower is included through the transformer under owner86/87; its LV/changeover equipment is excluded. Other CV006 aliases, earth/external coverage and retained drawing discrepancies remain separately unresolved. Historical construction question: ${cv.question}`;
  cv.evidenceIds = [...new Set([...cv.evidenceIds, 'WN-DROP-TOWER-ROUTE', 'WN-DROP-TOWER-SCOPE'])];
  return model;
}
