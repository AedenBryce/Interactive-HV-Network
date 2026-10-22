import { singleSupply } from './synthetic';
import type { NetworkModel } from '../session/model';

// Every connection and switch position here is fictional, for software behaviour only.
export const earthFixture = {
  ...structuredClone(singleSupply),
  id: 'synthetic-earth', version: 'fixture-earth-1.0', name: 'Synthetic earth connections',
  assets: [
    ...structuredClone(singleSupply.assets),
    { id: 'es-01', label: 'ES-01', kind: 'earth-switch', terminals: ['es-01-in', 'earth-01'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] },
      { id: 'closed', label: 'Closed', pairs: [['es-01-in', 'earth-01']] },
    ] },
    { id: 'isolated-bus', label: 'Separate LV bus', kind: 'bus', terminals: ['isolated-lv'], conductivePairs: [], positions: [] },
    { id: 'es-02', label: 'ES-02', kind: 'earth-switch', terminals: ['es-02-in', 'earth-02'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] },
      { id: 'closed', label: 'Closed', pairs: [['es-02-in', 'earth-02']] },
    ] },
  ],
  connections: [
    ...structuredClone(singleSupply.connections),
    { id: 'section-earth', from: 'tf-hv', to: 'es-01-in' },
    { id: 'separate-section-earth', from: 'isolated-lv', to: 'es-02-in' },
  ],
  earths: [
    { id: 'earth-a', label: 'Earth connection A', terminal: 'earth-01', groupId: 'common-earth' },
    { id: 'earth-b', label: 'Earth connection B', terminal: 'earth-02', groupId: 'common-earth' },
  ],
  starting: { devices: { 'cb-01': 'closed', 'es-01': 'open', 'es-02': 'open' }, sources: { 'source-a': true } },
} satisfies NetworkModel & { earths: { id: string; label: string; terminal: string; groupId?: string }[] };
