import type { NetworkModel } from '../session/model';

// Entirely fictional contract: no installed switchgear or site baseline claim.
export const removableBreakerModel: NetworkModel = {
  id: 'synthetic-removable-breaker', version: 'fictional-1', name: 'Synthetic removable breaker · independent contact/racking', synthetic: true,
  assets: [
    { id: 'supply', label: 'Fictional supply', kind: 'source', terminals: ['supply:out'], conductivePairs: [], positions: [] },
    { id: 'removable', label: 'Fictional removable breaker', kind: 'breaker', terminals: ['removable:in', 'removable:out', 'removable:frame', 'removable:ground'], conductivePairs: [], earthPairs: [['removable:frame', 'removable:ground']], positions: [], removableBreaker: { mainPair: ['removable:in', 'removable:out'] }, evidenceIds: ['fictional-mechanism'] },
    { id: 'load', label: 'Fictional final LV bus', kind: 'bus', terminals: ['load:bar'], conductivePairs: [], positions: [] },
  ],
  connections: [{ id: 'supply-breaker', from: 'supply:out', to: 'removable:in' }, { id: 'breaker-load', from: 'removable:out', to: 'load:bar' }],
  sources: [{ id: 'fictional-source', assetId: 'supply', terminal: 'supply:out', label: 'Fictional source' }],
  earths: [{ id: 'frame-earth', terminal: 'removable:ground', label: 'Fictional independent frame earth' }],
  evidence: [{ id: 'fictional-mechanism', status: 'supported', summary: 'Explicit fictional software contract: main phase pair conducts only Contact Closed and Rack In; unknown axes retain compatible possible conduction. Independent fixed frame earth never joins phase terminals. Contact commands require Rack In; racking commands require Contact Open. No additional interlocks are represented. This fixture establishes no installed mechanism, source availability, state or physical permission.', references: [{ document: 'Synthetic removable-breaker software contract', revision: '1', page: 1 }] }],
  interlocks: { reviews: [{ assetId: 'removable', status: 'confirmed-none', note: 'Explicit synthetic contract: no additional interlocks beyond declared independent action guards.', evidence: [{ document: 'Synthetic removable-breaker software contract', revision: '1', page: 1 }] }], rules: [] },
  starting: { devices: { removable: { contact: 'closed', racking: 'in' } }, sources: { 'fictional-source': true } },
  presentation: { overviewId: 'overview', views: [{ id: 'overview', label: 'Synthetic removable breaker · contact and racking', assetIds: ['supply', 'removable', 'load'], bounds: [0, 10, 900, 490], layout: { assets: { supply: [100, 210], removable: [430, 210], load: [760, 210] }, terminals: { 'supply:out': [130, 210], 'removable:in': [400, 210], 'removable:out': [460, 210], 'removable:frame': [430, 310], 'removable:ground': [520, 310], 'load:bar': [760, 210] }, labelOffsets: { supply: [0, 80], removable: [0, 155], load: [0, 80] } } }] },
};
