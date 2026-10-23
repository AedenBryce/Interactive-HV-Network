import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { completeControlsNetworkModel as currentNetworkModel } from '../models/site/current-network';
import { withOwnerMvDriveScope } from '../models/site/owner-mv-drive-scope';

describe('owner79 MV converter/motor scope only', () => {
  it('records all five included branches without enabling unresolved source transfer or outlet actions', () => {
    const session = new SimulationSession(withOwnerMvDriveScope(currentNetworkModel, 'test-drive-scope7'));
    const snapshot = session.snapshot();
    expect(snapshot.model.evidence!.find(record => record.id === 'WN-MV-DRIVE-SCOPE')?.confirmation?.decision).toBe('Include converter-to-motor connectivity');
    expect(snapshot.model.connections).toEqual(currentNetworkModel.connections);
    expect(snapshot.model.starting).toEqual(currentNetworkModel.starting);
    expect(snapshot.model.interlocks).toEqual(currentNetworkModel.interlocks);
    for (const id of ['hpgr:drive-meb:converter', 'hpgr:drive-mea:converter', 'sw505:vs50501:converter', 'sw505:vs50502:converter', 'sw505:vs50503:converter']) {
      const converter = snapshot.model.assets.find(asset => asset.id === id)!;
      expect(converter.evidenceIds).toContain('WN-MV-DRIVE-SCOPE');
      expect(converter.sourceArcs).toBeUndefined();
      expect(converter.conductivePairs).toEqual([]);
      expect(converter.sourcePairs).toEqual([]);
      expect(converter.earthPairs).toEqual([]);
      expect(converter.knowledge).toBe('unresolved');
    }
    expect(session.changeDevice('hpgr:drive-meb:outlet', 'service').ok).toBe(false);
    expect(snapshot.model.presentation!.views.find(view => view.id === 'stockpile/mv-drives')?.label).toContain('transfer under review');
    expect(snapshot.model.reviews!.find(review => review.id === 'WN-OWNER-ACCEPTANCE')?.status).toBe('open');
  }, 20_000);
});
