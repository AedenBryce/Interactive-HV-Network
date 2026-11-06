import { earthFixture } from './earth-fixture';
import type { InterlockDefinition } from '../session/interlocks';
import type { NetworkModel } from '../session/model';

// Fictional restrictions for software exercises; no installed interlock is established here.
export const interlockFixture = {
  ...structuredClone(earthFixture),
  id: 'synthetic-interlocks', version: 'fixture-interlocks-1.0', name: 'Synthetic physical interlocks',
  interlocks: {
    reviews: [
      { assetId: 'cb-01', status: 'confirmed-rules', note: 'Fictional breaker interlock defined for this fixture.', evidence: [] },
      { assetId: 'es-01', status: 'confirmed-rules', note: 'Fictional earth-switch interlock defined for this fixture.', evidence: [] },
      { assetId: 'es-02', status: 'unresolved', note: 'Unconfirmed fictional interlock conditions: this fixture intentionally leaves ES-02 unresolved.', evidence: [] },
    ],
    rules: [
      { id: 'breaker-close-earth-open', assetId: 'cb-01', position: 'closed', require: { kind: 'device', assetId: 'es-01', position: 'open' }, explanation: 'Fixture condition: ES-01 must be Open before CB-01 can close.', evidence: [] },
      { id: 'earth-close-breaker-open', assetId: 'es-01', position: 'closed', require: { kind: 'device', assetId: 'cb-01', position: 'open' }, explanation: 'Fixture condition: CB-01 must be Open before ES-01 can close.', evidence: [] },
    ],
  },
} satisfies NetworkModel & { interlocks: InterlockDefinition };
