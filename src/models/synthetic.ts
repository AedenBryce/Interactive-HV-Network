import type { NetworkModel } from '../session/model';

// Explicit fictional relationships: these are software examples, not site evidence.
export const singleSupply: NetworkModel = {
  id: 'single-supply', version: 'fixture-1.1', name: 'Synthetic network', synthetic: true,
  assets: [
    { id: 'supply-a', label: 'Source A', kind: 'source', terminals: ['source-out'], conductivePairs: [], positions: [] },
    { id: 'cb-01', label: 'CB-01', kind: 'breaker', terminals: ['cb-in', 'cb-out'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] },
      { id: 'closed', label: 'Closed', pairs: [['cb-in', 'cb-out']] },
    ] },
    { id: 'tf-01', label: 'TF-01', kind: 'transformer', terminals: ['tf-hv', 'tf-lv'], conductivePairs: [['tf-hv', 'tf-lv']], positions: [] },
    { id: 'lv-bus', label: 'LV bus', kind: 'bus', terminals: ['lv'], conductivePairs: [], positions: [] },
  ],
  connections: [
    { id: 'supply-breaker', from: 'source-out', to: 'cb-in' },
    { id: 'breaker-transformer', from: 'cb-out', to: 'tf-hv' },
    { id: 'transformer-lv', from: 'tf-lv', to: 'lv' },
  ],
  sources: [{ id: 'source-a', assetId: 'supply-a', terminal: 'source-out', label: 'Source A' }],
  interlocks: { reviews: [{ assetId: 'cb-01', status: 'confirmed-none', note: 'This fictional fixture explicitly defines no physical interlocks for CB-01.', evidence: [] }], rules: [] },
  starting: { devices: { 'cb-01': 'closed' }, sources: { 'source-a': true } },
};

export const alternateSupplies: NetworkModel = {
  ...structuredClone(singleSupply), id: 'alternate-supplies', version: 'alternate-fixture-1.1', name: 'Synthetic alternate supplies',
  assets: [
    ...structuredClone(singleSupply.assets),
    { id: 'supply-b', label: 'Source B', kind: 'source', terminals: ['source-b-out'], conductivePairs: [], positions: [] },
    { id: 'cb-02', label: 'CB-02', kind: 'breaker', terminals: ['cb-b-in', 'cb-b-out'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['cb-b-in', 'cb-b-out']] },
    ] },
    { id: 'bus-a', label: 'HV bus A', kind: 'bus', terminals: ['hv-a'], conductivePairs: [], positions: [] },
    { id: 'bus-b', label: 'HV bus B', kind: 'bus', terminals: ['hv-b'], conductivePairs: [], positions: [] },
    { id: 'tie-01', label: 'Bus tie', kind: 'breaker', terminals: ['tie-a', 'tie-b'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['tie-a', 'tie-b']] },
    ] },
    { id: 'loop-01', label: 'Loop link', kind: 'disconnector', terminals: ['loop-a', 'loop-b'], conductivePairs: [], positions: [
      { id: 'open', label: 'Open', pairs: [] }, { id: 'closed', label: 'Closed', pairs: [['loop-a', 'loop-b']] },
    ] },
  ],
  connections: [
    { id: 'supply-breaker', from: 'source-out', to: 'cb-in' },
    { id: 'breaker-bus-a', from: 'cb-out', to: 'hv-a' },
    { id: 'bus-a-transformer', from: 'hv-a', to: 'tf-hv' },
    { id: 'transformer-lv', from: 'tf-lv', to: 'lv' },
    { id: 'source-b-breaker', from: 'source-b-out', to: 'cb-b-in' },
    { id: 'breaker-bus-b', from: 'cb-b-out', to: 'hv-b' },
    { id: 'bus-a-tie', from: 'hv-a', to: 'tie-a' },
    { id: 'tie-bus-b', from: 'tie-b', to: 'hv-b' },
    { id: 'bus-b-loop', from: 'hv-b', to: 'loop-a' },
    { id: 'loop-bus-a', from: 'loop-b', to: 'hv-a' },
  ],
  sources: [...structuredClone(singleSupply.sources), { id: 'source-b', assetId: 'supply-b', terminal: 'source-b-out', label: 'Source B' }],
  interlocks: { reviews: ['cb-01', 'cb-02', 'tie-01', 'loop-01'].map(assetId => ({ assetId, status: 'confirmed-none' as const, note: `This fictional fixture explicitly defines no physical interlocks for ${assetId}.`, evidence: [] })), rules: [] },
  starting: { devices: { 'cb-01': 'closed', 'cb-02': 'closed', 'tie-01': 'closed', 'loop-01': 'closed' }, sources: { 'source-a': true, 'source-b': true } },
};
