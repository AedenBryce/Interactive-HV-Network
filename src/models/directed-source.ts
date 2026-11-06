import type { NetworkModel } from '../session/model';
import { relationshipsFixture } from './relationships-fixture';

// A separately versioned fictional package; the published bidirectional fixture is unchanged.
export const directedSourceModel: NetworkModel = buildDirectedSourceModel();

function buildDirectedSourceModel(): NetworkModel {
  const model: NetworkModel = structuredClone(relationshipsFixture);
  model.id = 'synthetic-directed-source'; model.version = 'fictional-directed-1';
  model.name = 'Synthetic directed source transfer · reverse unconfirmed';
  const transformer = model.assets.find(asset => asset.id === 'tf-01')!;
  transformer.sourcePairs = [];
  transformer.sourceArcs = [
    { id: 'fictional-primary-to-secondary', from: 'tf-hv', to: 'tf-lv-a', knowledge: 'supported', evidenceIds: ['fictional-forward-evidence'] },
    { id: 'fictional-secondary-to-primary', from: 'tf-lv-a', to: 'tf-hv', knowledge: 'unresolved', evidenceIds: ['fictional-reverse-evidence'], reviewIds: ['fictional-reverse-review'] },
  ];
  model.evidence = [
    { id: 'fictional-forward-evidence', status: 'supported', summary: 'Fictional software example: the declared primary supplies secondary A in the shown direction. No relationship is declared to winding B; earth continuity remains separate. This establishes no installed transformer behavior.', references: [{ document: 'Fictional directed-transfer example', revision: '1', page: 1 }] },
    { id: 'fictional-reverse-evidence', status: 'unresolved', summary: 'Explicit fictional reverse candidate, included only in conservative connectivity. Its direction and review are separate from the supported forward arc. This is not an installed-network winding claim.', references: [{ document: 'Fictional directed-transfer example', revision: '1', page: 1 }] },
  ];
  model.reviews = [{ id: 'fictional-reverse-review', status: 'open', question: 'Fictional example: reverse transfer onto the primary remains Unconfirmed. An external supply on secondary A remains visible regardless of the open normal primary feed.', evidenceIds: ['fictional-reverse-evidence'] }];
  model.presentation = { overviewId: 'overview', views: [{
    id: 'overview', label: 'Fictional forward transfer / reverse uncertainty', assetIds: model.assets.map(asset => asset.id), bounds: [0, 70, 900, 520],
    layout: {
      assets: { 'supply-a': [70, 200], 'cb-01': [280, 200], 'tf-01': [510, 200], 'lv-bus-a': [740, 160], 'lv-bus-b': [740, 360], 'supply-b': [300, 470] },
      terminals: { 'source-a-out': [100, 200], 'ds-in': [245, 200], 'ds-out': [315, 200], 'ds-earth': [280, 240], 'tf-hv': [475, 200], 'tf-lv-a': [545, 180], 'tf-lv-b': [545, 230], 'lv-a': [740, 160], 'lv-b': [740, 360], 'source-b-out': [330, 470] },
      bends: { 'winding-a-bus': [[620, 180], [620, 160]], 'winding-b-bus': [[620, 230], [620, 360]], 'lv-backfeed': [[680, 470], [680, 160]] },
      labelOffsets: { 'lv-bus-b': [-60, 65] },
    },
  }] };
  return model;
}
