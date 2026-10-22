import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { demonstrations } from '../ui/model-catalog';
import { singleSupply } from '../models/synthetic';

describe('model-owned diagram organisation through the session', () => {
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
