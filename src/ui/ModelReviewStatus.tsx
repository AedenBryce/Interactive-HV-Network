import type { NetworkModel } from '../session/model';
import { getRemovableMechanism, isIndependentState } from '../session/mechanisms';

export function modelControlStatus(model: NetworkModel) {
  const controls = model.assets.filter(asset => asset.positions.length || getRemovableMechanism(asset));
  const selected = controls.filter(asset => {
    const state = model.starting.devices[asset.id];
    return isIndependentState(state) ? state.contact !== null && state.racking !== null : state !== null && state !== undefined;
  }).length;
  const reviews = new Map(model.interlocks?.reviews.map(review => [review.assetId, review]));
  const reviewed = controls.filter(asset => {
    const status = reviews.get(asset.id)?.status;
    return status === 'confirmed-none' || status === 'confirmed-rules';
  }).length;
  const sources = model.sources.filter(source => typeof model.starting.sources[source.id] === 'boolean').length;
  return { controls: controls.length, selected, reviewed, sources, complete: controls.length > 0 && selected === controls.length && reviewed === controls.length };
}

export function ModelReviewStatus({ model }: { model: NetworkModel }) {
  const status = modelControlStatus(model);
  return <section className={`model-review-status${status.complete ? '' : ' pending'}`} aria-label="Current model selections">
    <h3>Current model selections</h3>
    <p>{status.selected}/{status.controls} starting states selected · {status.reviewed}/{status.controls} local control profiles reviewed.</p>
    <p>{status.controls - status.reviewed} unresolved local control profiles. {status.sources}/{model.sources.length} source starting values selected.</p>
    <p>{model.evidence?.filter(record => record.status === 'owner-confirmed').length ?? 0} owner-confirmed evidence records retained in this model.</p>
    <p>These are teaching-model selections. Whole-model acceptance, physical installation and source/earth uncertainties remain separate.</p>
  </section>;
}
