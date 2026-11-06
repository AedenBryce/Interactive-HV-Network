import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { electricalPolicyNetworkModel as policyNetworkModel } from '../models/site/current-network';
import { withOwnerDropTowerBranch } from '../models/site/owner-drop-tower-branch';
import { withLatestConfigurationNotes } from '../models/site/configuration-review-notes';

describe('latest configuration inspection notes', () => {
  it('leads with current counts and selected converter scope while retaining historical descriptions and unresolved claims', () => {
    const base = withOwnerDropTowerBranch(policyNetworkModel, 'test-latest-notes-input8');
    const original = new SimulationSession(base).saveScenario();
    const model = new SimulationSession(withLatestConfigurationNotes(base, 'test-latest-notes8')).saveScenario().model;
    const review = model.reviews!.find(review => review.id === 'C2-R11')!;
    expect(review.question).toMatch(/^Current teaching configuration:362 selected contact positions,0 contacts Unconfirmed,148 independent racking positions,3 available abstract supplies/);
    expect(review.question).toContain('Historical'); expect(review.status).toBe('open');
    for (const id of ['C2-R10', 'SW-R06']) {
      expect(model.reviews!.find(review => review.id === id)?.question).toMatch(/^Selected V1 converter/);
      expect(model.reviews!.find(review => review.id === id)?.status).toBe('open');
    }
    expect(model.starting).toEqual(original.model.starting);
    expect(model.assets).toEqual(original.model.assets); expect(model.connections).toEqual(original.model.connections);
    expect(model.boundaries).toEqual(original.model.boundaries); expect(model.earths).toEqual(original.model.earths);
    expect(model.interlocks!.rules).toEqual(original.model.interlocks!.rules);
    expect(new SimulationSession(base).saveScenario()).toEqual(original);
  });
});
