import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { preConfigurationNetworkModel } from '../models/site/current-network';
import { withOwnerRemovableBreakers } from '../models/site/owner-removable-breakers';
import { withOwnerSw411LocalRules } from '../models/site/owner-sw411-local-rules';
import { withOwnerStartingConfiguration } from '../models/site/owner-starting-configuration';
import { withCurrentConfigurationNotes } from '../models/site/configuration-review-notes';

function configuredPackage() {
  const version = 'construction-2026-10-23.2';
  return withOwnerStartingConfiguration(withOwnerSw411LocalRules(withOwnerRemovableBreakers(preConfigurationNetworkModel, version), version), version);
}

describe('current teaching configuration notes through the session', () => {
  it('distinguishes a selected teaching baseline from historical null notes without rewriting the old package', () => {
    const base = configuredPackage();
    const original = new SimulationSession(base).saveScenario();
    const session = new SimulationSession(withCurrentConfigurationNotes(base, 'configuration-notes-2026-10-23'));
    const saved = session.saveScenario();
    const review = saved.model.reviews!.find(record => record.id === 'C2-R11')!;
    expect(review.question).toContain('Historical construction note');
    expect(review.question).toContain('All represented control baselines remain null and blocked.');
    expect(review.question).toContain('Current teaching configuration note');
    expect(review.question).toContain('356 selected contact positions');
    expect(review.evidenceIds).toContain('WN-OWNER-STARTING-CONFIGURATION');
    expect(review.status).toBe('open');
    expect(new SimulationSession(base).saveScenario()).toEqual(original);
    expect(original.modelVersion).toBe('construction-2026-10-23.2');
    expect(session.loadScenario(original)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(original);
    const older = new SimulationSession(preConfigurationNetworkModel).saveScenario();
    expect(older.formatVersion).toBe(1);
    expect(older.modelVersion).toBe('construction-2026-10-23.1');
    expect(session.loadScenario(older)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.saveScenario()).toEqual(older);
  }, 30_000);

  it('refreshes only the current null-baseline records and neutral supply captions while preserving electrical data and actual-site uncertainty', () => {
    const base = configuredPackage();
    const before = new SimulationSession(base).saveScenario();
    const session = new SimulationSession(withCurrentConfigurationNotes(base, 'configuration-notes-scope-2026-10-23'));
    const saved = session.saveScenario(); const model = saved.model;
    expect(model.reviews!.filter(record => record.question !== before.model.reviews!.find(prior => prior.id === record.id)?.question).map(record => record.id).sort()).toEqual(['C1-R07', 'C2-R11', 'TL-R07', 'WH-Q12', 'station:R005']);
    expect(model.evidence!.filter(record => record.summary !== before.model.evidence!.find(prior => prior.id === record.id)?.summary).map(record => record.id)).toEqual(['BATTERY-STATION-REPRESENTATION']);
    const changedNotes = model.interlocks!.reviews.filter(record => record.note !== before.model.interlocks!.reviews.find(prior => prior.assetId === record.assetId)?.note);
    expect(changedNotes.map(record => record.assetId).sort()).toEqual(['rm410:mc410a:cb', 'sw505:tf505a:hv-cb', 'sw505:tf505a:hv-es', 'sw505:tf505b:hv-cb', 'sw505:tf505b:hv-es', 'sw505:tf505c:hv-cb', 'sw505:tf505c:hv-es', 'wh:h3:mc416a:in']);
    for (const record of changedNotes) {
      expect(record.note).toContain('Historical construction note');
      expect(record.note).toContain('Current teaching configuration note');
      expect(record.evidence.some(reference => reference.clause?.includes('WN-OWNER-STARTING-CONFIGURATION'))).toBe(true);
    }
    for (const sourceId of ['boundary:tf11', 'boundary:tf12', 'boundary:tf04']) {
      const source = model.sources.find(source => source.id === sourceId)!;
      const asset = model.assets.find(asset => asset.id === source.assetId)!;
      expect(asset.label).toContain('Simulation supply input');
      expect(asset.label).not.toContain('Availability unconfirmed');
      expect(asset.knowledge).toBe('provisional');
    }
    expect(model.assets.filter(asset => asset.label !== before.model.assets.find(prior => prior.id === asset.id)!.label).map(asset => asset.id).sort()).toEqual(['boundary:tf04', 'boundary:tf11', 'boundary:tf12']);
    for (const asset of model.assets) expect({ ...asset, label: before.model.assets.find(prior => prior.id === asset.id)!.label }).toEqual(before.model.assets.find(prior => prior.id === asset.id));
    for (const review of model.reviews!) expect(review.status).toBe(before.model.reviews!.find(prior => prior.id === review.id)!.status);
    for (const review of model.interlocks!.reviews) expect(review.status).toBe(before.model.interlocks!.reviews.find(prior => prior.assetId === review.assetId)!.status);
    for (const evidence of model.evidence!) expect(evidence.status).toBe(before.model.evidence!.find(prior => prior.id === evidence.id)!.status);
    expect(model.interlocks!.reviews.find(review => review.assetId === 'wh:h1:rm417:sw01')).toEqual(before.model.interlocks!.reviews.find(review => review.assetId === 'wh:h1:rm417:sw01'));
    expect(model.interlocks!.reviews.find(review => review.assetId === 'sw455:in-d:cb')).toEqual(before.model.interlocks!.reviews.find(review => review.assetId === 'sw455:in-d:cb'));
    expect(model.evidence!.find(record => record.id === 'SV-DG-MCS')).toEqual(before.model.evidence!.find(record => record.id === 'SV-DG-MCS'));
    expect(model.starting).toEqual(before.model.starting); expect(saved.devices).toEqual(before.devices); expect(saved.sources).toEqual(before.sources);
    expect(Object.entries(saved.devices).filter(([, state]) => state === null).map(([id]) => id).sort()).toEqual(['cv006:abs:49-38-1', 'cv006:fused-abs:286', 'rm413a:es-q8:lower', 'rm712:in01']);
    expect(model.connections).toEqual(before.model.connections); expect(model.earths).toEqual(before.model.earths); expect(model.boundaries).toEqual(before.model.boundaries);
    expect(model.sources).toEqual(before.model.sources); expect(model.presentation).toEqual(before.model.presentation); expect(model.interlocks!.rules).toEqual(before.model.interlocks!.rules);
    expect(new SimulationSession(base).saveScenario()).toEqual(before);
    expect(session.changeSource('boundary:tf11', false)).toEqual({ ok: true });
    expect(session.snapshot().model.assets.find(asset => asset.id === 'boundary:tf11')!.label).toContain('Simulation supply input');
  }, 30_000);
});
