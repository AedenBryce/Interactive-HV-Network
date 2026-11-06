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
