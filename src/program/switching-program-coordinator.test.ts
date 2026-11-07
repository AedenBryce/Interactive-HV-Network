import { describe, expect, it } from 'vitest';
import { SimulationSession } from '../session/session';
import { singleSupply } from '../models/synthetic';
import { SwitchingProgramCoordinator } from './switching-program-coordinator';
import { describeApparatusAction, describeSessionAction, describeSwitchingProgramStep } from '../session/action-description';

describe('switching program coordinator', () => {
  it.each([
    ['isolation', ['INFORM CCR OF INTENT TO ISOLATE EQUIPMENT', 'INFORM CCR ISOLATIONS IS COMPLETE', 'ISSUE ACCESS CERTIFICATE']],
    ['restoration', ['CANCEL ACCESS CERTIFICATE', 'INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT', 'INFORM CCR THAT EQUIPMENT IS DE-ISOLATED']],
  ] as const)('includes the fixed %s program communications in sequence order', (type, instructions) => {
    const program = new SwitchingProgramCoordinator(new SimulationSession(singleSupply));
    program.start(type);

    expect(program.snapshot().steps.map(step => step.source === 'program' ? [step.action, step.instructions] : 'apparatus'))
      .toEqual(instructions.map(instruction => ['INFORM', instruction]));
  });

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
    expect(program.snapshot().steps.filter(step => step.source === 'apparatus').map(step => [step.actionId, step.role, step.state])).toEqual([
      [2, 'verify-before', 'open'], [2, 'action', undefined], [2, 'verify-after', 'closed'],
      [3, 'verify-before', 'closed'], [3, 'action', undefined], [3, 'verify-after', 'open'],
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
    expect(program.snapshot().steps.filter(step => step.source === 'apparatus')).toEqual([]);
  });

  it('ends capture on cancel while retaining simulated state and discarding captured sequence', () => {
    const session = new SimulationSession(singleSupply);
    const program = new SwitchingProgramCoordinator(session);
    program.start('isolation');
    session.changeDevice('cb-01', 'open');
    expect(program.cancel()).toEqual({ ok: true });
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(program.snapshot()).toMatchObject({ active: false, actions: [], steps: [] });
    expect(session.changeSource('source-a', false)).toEqual({ ok: true });
  });

  it('ends capture after development while retaining the completed sequence and simulated state', () => {
    const session = new SimulationSession(singleSupply);
    const program = new SwitchingProgramCoordinator(session);
    program.start('isolation');
    session.changeDevice('cb-01', 'open');
    const expectedSteps = program.snapshot().steps;

    expect(program.endForDevelopment()).toEqual({ ok: true });
    expect(program.snapshot()).toMatchObject({ active: false, type: 'isolation', actions: [{ assetId: 'cb-01', to: 'open' }], steps: expectedSteps });
    expect(session.snapshot().devices['cb-01']).toBe('open');
    expect(session.snapshot().programCaptureActive).toBe(false);
    expect(session.changeSource('source-a', false)).toEqual({ ok: true });
  });

  it('uses one action description for the undo prompt and session history', () => {
    const session = new SimulationSession(singleSupply);
    session.changeDevice('cb-01', 'open');
    const action = session.snapshot().history[0];
    expect(describeApparatusAction(action, singleSupply)).toBe('Open CB-01');
    expect(describeSessionAction(action, singleSupply)).toBe('CB-01: Closed → Open');
    const program = new SwitchingProgramCoordinator(session);
    program.start('isolation');
    session.changeDevice('cb-01', 'closed');
    expect(program.snapshot().steps.map(step => describeSwitchingProgramStep(step, singleSupply))).toEqual([
      'INFORM · INFORM CCR OF INTENT TO ISOLATE EQUIPMENT',
      'Verify Open CB-01', 'Action: Closed CB-01', 'Verify Closed CB-01',
      'INFORM · INFORM CCR ISOLATIONS IS COMPLETE', 'INFORM · ISSUE ACCESS CERTIFICATE',
    ]);
  });
});
