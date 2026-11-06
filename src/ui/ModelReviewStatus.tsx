import type { NetworkModel } from '../session/model';
import { modelControlStatus } from './model-control-status';

export { modelControlStatus } from './model-control-status';

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
