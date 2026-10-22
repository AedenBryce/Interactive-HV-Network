import type { NetworkModel } from '../session/model';

// Explicit fictional relationships: these are software examples, not site evidence.
export const singleSupply: NetworkModel = {
  id: 'single-supply', version: 'fixture-1.0', name: 'Synthetic network', synthetic: true,
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
  starting: { devices: { 'cb-01': 'closed' }, sources: { 'source-a': true } },
};
