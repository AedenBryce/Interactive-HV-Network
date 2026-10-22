import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { demonstrations } from '../ui/model-catalog';
import { singleSupply } from '../models/synthetic';

describe('model-owned diagram organisation through the session', () => {
  it('preserves navigation regions in a detached model snapshot without adding electrical relationships', () => {
    const base = structuredClone(demonstrations[0]);
    const region = { id: 'supply-area', label: 'Supply area', bounds: [0, 0, 300, 160] satisfies [number, number, number, number], targetViewId: base.presentation!.views[1].id };
    const model = { ...base, version: 'region-fixture-1', presentation: { ...base.presentation!, views: base.presentation!.views.map(view => view.id === base.presentation!.overviewId ? { ...view, regions: [region] } : view) } };
    const session = new SimulationSession(model);
    const snapshot = session.snapshot();
    expect(snapshot.model.presentation!.views[0]).toMatchObject({ regions: [region] });
    expect(snapshot.model.connections).toEqual(base.connections);
    snapshot.model.presentation!.views[0].label = 'Detached change';
    expect(session.snapshot().model.presentation).toEqual(model.presentation);
  });

  it('rejects missing region targets and duplicate region identities without replacing the active session', () => {
    const session = new SimulationSession(demonstrations[0]);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    for (const kind of ['missing target', 'duplicate identity']) {
      const invalid = structuredClone(demonstrations[0]);
      invalid.version = `invalid-region-${kind}`;
      const view = invalid.presentation!.views[0];
      view.regions = [{ id: 'area', label: 'Area', bounds: [0, 0, 300, 160], targetViewId: invalid.presentation!.views[1].id }];
      if (kind === 'missing target') view.regions[0].targetViewId = 'missing';
      else view.regions.push(structuredClone(view.regions[0]));
      expect(session.loadModel(invalid)).toMatchObject({ ok: false, error: expect.stringContaining('region') });
      expect(session.snapshot()).toEqual(before);
    }
  });

  it('retains region data in JSON roundtrips and historical views, with identities scoped to each view', () => {
    const model = structuredClone(demonstrations[0]);
    model.version = 'region-scenario-1';
    const [overview, detail] = model.presentation!.views;
    overview.regions = [{ id: 'area', label: 'Supply area', bounds: [-10, 20, 300, 160], targetViewId: detail.id }];
    detail.regions = [{ id: 'area', label: 'Back to overview', bounds: [10, -20, 100, 50], targetViewId: overview.id }];
    const original = new SimulationSession(model);
    expect(original.changeDevice('cb-01', 'open')).toEqual({ ok: true });
    const file = JSON.parse(JSON.stringify(original.saveScenario()));
    const reopened = new SimulationSession(model);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot()).toMatchObject({ mode: 'exploration', model: { presentation: model.presentation }, devices: { 'cb-01': 'open' } });
    const historical = new SimulationSession(demonstrations[0]);
    expect(historical.loadScenario(file)).toEqual({ ok: true });
    expect(historical.snapshot()).toMatchObject({ mode: 'view-only', model: { presentation: model.presentation } });
    expect(historical.saveScenario()).toEqual(file);
  });

  it('rejects empty region names and non-finite or non-positive bounds atomically', () => {
    const session = new SimulationSession(demonstrations[0]);
    const before = session.snapshot();
    const region = { id: 'area', label: 'Area', bounds: [0, 0, 300, 160] satisfies [number, number, number, number], targetViewId: before.model.presentation!.views[1].id };
    const invalidRegions = [
      { ...region, id: '' }, { ...region, label: '' },
      ...[Infinity, NaN].map(value => ({ ...region, bounds: [value, 0, 300, 160] })),
      ...[Infinity, NaN].map(value => ({ ...region, bounds: [0, value, 300, 160] })),
      ...[0, -1, Infinity, NaN].map(value => ({ ...region, bounds: [0, 0, value, 160] })),
      ...[0, -1, Infinity, NaN].map(value => ({ ...region, bounds: [0, 0, 300, value] })),
    ];
    for (const invalidRegion of invalidRegions) {
      const invalid = structuredClone(demonstrations[0]);
      expect(session.loadModel({ ...invalid, presentation: { ...invalid.presentation!, views: invalid.presentation!.views.map((view, index) => index === 0 ? { ...view, regions: [invalidRegion] } : view) } }).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });

  it('gives a completed diagram package a different version from its topology fixture', () => {
    const session = new SimulationSession(demonstrations[0]);
    const topologyScenario = new SimulationSession(singleSupply).saveScenario();
    expect(session.loadScenario(topologyScenario)).toEqual({ ok: true });
    expect(session.snapshot().mode).toBe('view-only');
    expect(session.snapshot().currentModel.version).not.toBe(singleSupply.version);
  });

  it('retains every demonstration layout in its detached model snapshot', () => {
    for (const model of demonstrations) {
      const session = new SimulationSession(model);
      const snapshot = session.snapshot();
      expect(snapshot.model.presentation).toEqual(model.presentation);
      snapshot.model.presentation!.views[0].label = 'Changed detached snapshot';
      expect(session.snapshot().model.presentation).toEqual(model.presentation);
    }
  });

  it('rejects malformed diagram identities and coordinates without changing the active session', () => {
    const session = new SimulationSession(demonstrations[0]);
    session.changeDevice('cb-01', 'open');
    const before = session.snapshot();
    const invalidModels = [
      (model: typeof before.model) => { model.presentation!.overviewId = 'missing'; },
      (model: typeof before.model) => { model.presentation!.views[0].assetIds.push('missing'); },
      (model: typeof before.model) => { delete model.presentation!.views[0].layout.terminals['tf-hv']; },
      (model: typeof before.model) => { model.presentation!.views[1].boundaries![0].targetViewId = 'missing'; },
      (model: typeof before.model) => { model.presentation!.views[0].bounds[2] = 0; },
    ];
    for (const mutate of invalidModels) {
      const invalid = structuredClone(demonstrations[0]);
      mutate(invalid);
      expect(session.loadModel(invalid).ok).toBe(false);
      expect(session.snapshot()).toEqual(before);
    }
  });
});
