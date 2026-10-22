import type { NetworkModel } from '../session/model';

// All positions, winding relationships and restrictions are fictional software examples.
// Source transfer below is explicitly bidirectional; it is not a generic transformer rule.
export const relationshipsFixture = {
  id: 'synthetic-relationships', version: 'fixture-relationships-1.0', name: 'Synthetic positions and windings', synthetic: true,
  assets: [
    { id: 'supply-a', label: 'HV source A', kind: 'source', terminals: ['source-a-out'], conductivePairs: [], positions: [] },
    { id: 'cb-01', label: 'DS-01 three-position device', kind: 'disconnector', terminals: ['ds-in', 'ds-out', 'ds-earth'], conductivePairs: [], sourcePairs: [], earthPairs: [], positions: [
      { id: 'service', label: 'Service', pairs: [], sourcePairs: [['ds-in', 'ds-out']], earthPairs: [['ds-in', 'ds-out']] },
      { id: 'isolated', label: 'Isolated', pairs: [], sourcePairs: [], earthPairs: [] },
      { id: 'earthed', label: 'Earthed', pairs: [], sourcePairs: [['ds-out', 'ds-earth']], earthPairs: [['ds-out', 'ds-earth']] },
    ] },
    { id: 'tf-01', label: 'TF-01 three-winding example', kind: 'transformer', terminals: ['tf-hv', 'tf-lv-a', 'tf-lv-b'], conductivePairs: [], sourcePairs: [['tf-hv', 'tf-lv-a']], earthPairs: [], positions: [] },
    { id: 'lv-bus-a', label: 'LV bus A', kind: 'bus', terminals: ['lv-a'], conductivePairs: [], positions: [] },
    { id: 'lv-bus-b', label: 'LV bus B — transfer unrepresented', kind: 'bus', terminals: ['lv-b'], conductivePairs: [], positions: [] },
    { id: 'supply-b', label: 'LV source B', kind: 'source', terminals: ['source-b-out'], conductivePairs: [], positions: [] },
  ],
  connections: [
    { id: 'source-device', from: 'source-a-out', to: 'ds-in' },
    { id: 'device-hv', from: 'ds-out', to: 'tf-hv' },
    { id: 'winding-a-bus', from: 'tf-lv-a', to: 'lv-a' },
    { id: 'winding-b-bus', from: 'tf-lv-b', to: 'lv-b' },
    { id: 'lv-backfeed', from: 'source-b-out', to: 'lv-a' },
  ],
  sources: [
    { id: 'source-a', label: 'HV source A', assetId: 'supply-a', terminal: 'source-a-out' },
    { id: 'source-b', label: 'LV source B', assetId: 'supply-b', terminal: 'source-b-out' },
  ],
  earths: [{ id: 'device-earth', label: 'DS-01 earth termination', terminal: 'ds-earth' }],
  interlocks: {
    reviews: [{ assetId: 'cb-01', status: 'confirmed-rules', note: 'Fictional three-position restriction: both represented sources must be disabled before earthing.', evidence: [] }],
    rules: [{ id: 'earth-sources-disabled', assetId: 'cb-01', position: 'earthed', require: { kind: 'all', conditions: [{ kind: 'source', sourceId: 'source-a', enabled: false }, { kind: 'source', sourceId: 'source-b', enabled: false }] }, explanation: 'Fixture condition: disable HV source A and LV source B before selecting Earthed.', evidence: [] }],
  },
  starting: { devices: { 'cb-01': 'service' }, sources: { 'source-a': true, 'source-b': false } },
} satisfies NetworkModel;
