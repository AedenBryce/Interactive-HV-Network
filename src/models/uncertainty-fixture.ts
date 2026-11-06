import { earthFixture } from './earth-fixture';
import type { NetworkModel } from '../session/model';

// Fictional missing/competing information used only to exercise review behaviour.
export const uncertaintyFixture: NetworkModel = {
  ...structuredClone(earthFixture), id: 'synthetic-uncertainty', version: 'uncertainty-fixture-1.0', name: 'Synthetic unconfirmed connections',
  assets: [...structuredClone(earthFixture.assets),
    { id: 'candidate-bus', label: 'Unconfirmed LV supply', kind: 'bus', terminals: ['candidate-lv'], conductivePairs: [], positions: [], knowledge: 'unresolved', reviewIds: ['review-feed'] },
    { id: 'unknown-supply', label: 'Source B', kind: 'source', terminals: ['unknown-source-out'], conductivePairs: [], positions: [], reviewIds: ['review-source'] },
  ],
  connections: [...structuredClone(earthFixture.connections),
    { id: 'candidate-feed', from: 'tf-lv', to: 'candidate-lv', knowledge: 'provisional', evidenceIds: ['feed-interpretation'], reviewIds: ['review-feed'] },
    { id: 'unknown-source-feed', from: 'unknown-source-out', to: 'isolated-lv' },
  ],
  sources: [...structuredClone(earthFixture.sources), { id: 'source-b', assetId: 'unknown-supply', terminal: 'unknown-source-out', label: 'Source B', reviewIds: ['review-source'] }],
  earths: earthFixture.earths.map(earth => earth.id === 'earth-a' ? { ...earth, knowledge: 'provisional', evidenceIds: ['earth-interpretation'], reviewIds: ['review-earth'] } : structuredClone(earth)),
  starting: { devices: { ...earthFixture.starting.devices, 'es-01': 'closed' }, sources: { 'source-a': true, 'source-b': null } },
  boundaries: [{ id: 'unconfirmed-continuation', label: 'Candidate off-page continuation', terminal: 'candidate-lv', sourceCoverage: 'unconfirmed', earthCoverage: 'unconfirmed', knowledge: 'unresolved', reviewIds: ['review-boundary'] }],
  evidence: [
    { id: 'feed-interpretation', status: 'provisional', summary: 'Unconfirmed: fictional provisional connection for software review.', references: [{ document: 'Synthetic demonstration drawing', revision: 'F1', page: 1 }] },
    { id: 'earth-interpretation', status: 'provisional', summary: 'Unconfirmed: fictional earth attachment requires review.', references: [{ document: 'Synthetic demonstration drawing', revision: 'F1', page: 2 }] },
  ],
  reviews: [
    { id: 'review-feed', question: 'Does the fictional candidate feed join this transformer?', status: 'open', evidenceIds: ['feed-interpretation'] },
    { id: 'review-source', question: 'What is the fictional starting availability of Source B?', status: 'open', evidenceIds: [] },
    { id: 'review-earth', question: 'Is the fictional earth attachment correct?', status: 'open', evidenceIds: ['earth-interpretation'] },
    { id: 'review-boundary', question: 'What does the fictional off-page continuation connect to?', status: 'open', evidenceIds: [] },
  ],
};
