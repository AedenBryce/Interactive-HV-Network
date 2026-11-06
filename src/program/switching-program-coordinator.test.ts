import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../session/session';
import { singleSupply } from '../models/synthetic';
import { SwitchingProgramCoordinator } from './switching-program-coordinator';

describe('switching program coordinator', () => {
  it('captures accepted apparatus changes in order from the current state, including opposite actions', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const program = new SwitchingProgramCoordinator(session);
    expect(program.start('isolation')).toEqual({ ok: true });
    expect(session.snapshot().devices['cb-01']).toBe('open');
    session.changeDevice('cb-01', 'closed');
    session.changeDevice('cb-01', 'open');
    expect(session.changeDevice('cb-01', 'invalid')).toMatchObject({ ok: false });
    expect(program.snapshot().actions.map(({ kind, from, to }) => ({ kind, from, to }))).toEqual([
      { kind: 'device', from: 'open', to: 'closed' },
      { kind: 'device', from: 'closed', to: 'open' },
    ]);
  });

  it('blocks non-program session changes and lets confirmed undo reverse only the latest captured action', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const program = new SwitchingProgramCoordinator(session);
    program.start('restoration');
    session.changeDevice('cb-01', 'closed');
    const last = program.snapshot().actions.at(-1)!;
    expect(session.changeSource('source-a', false).ok).toBe(false);
    expect(session.reset().ok).toBe(false);
    expect(session.loadScenario(session.saveScenario()).ok).toBe(false);
    expect(session.loadModel(singleSupply).ok).toBe(false);
    expect(session.undo().ok).toBe(false);
    expect(program.undoLast(last.id + 1)).toMatchObject({ ok: false });
    expect(program.undoLast(last.id)).toEqual({ ok: true });
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(program.snapshot().actions).toEqual([]);
  });

  it('ends capture on cancel while retaining simulated state and discarding captured sequence', () => {
    const session = new SimulationSession(singleSupply);
    const program = new SwitchingProgramCoordinator(session);
    program.start('isolation');
    session.changeDevice('cb-01', 'open');
    expect(program.cancel()).toEqual({ ok: true });
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(program.snapshot()).toMatchObject({ active: false, actions: [] });
    expect(session.changeSource('source-a', false)).toEqual({ ok: true });
  });
});
