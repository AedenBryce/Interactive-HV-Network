import type { SessionAction, SimulationSession } from '../session/session';
import type { DeviceState } from '../session/mechanisms';

export type SwitchingProgramType = 'isolation' | 'restoration';
export type SwitchingProgramSnapshot = {
  active: boolean;
  type?: SwitchingProgramType;
  actions: SessionAction[];
  steps: SwitchingProgramStep[];
};
export type ApparatusProgramStep = { source: 'apparatus'; id: string; actionId: number; role: 'verify-before' | 'action' | 'verify-after'; action: Exclude<SessionAction, { kind: 'source' }>; state?: DeviceState };
export type ProgramCommunicationStep = { source: 'program'; id: string; action: 'INFORM'; instructions: string };
export type SwitchingProgramStep = ApparatusProgramStep | ProgramCommunicationStep;

type ActiveCapture = { token: number; historyStart: number; type: SwitchingProgramType };

export class SwitchingProgramCoordinator {
  #session: SimulationSession;
  #active?: ActiveCapture;
  #completed: SwitchingProgramSnapshot = { active: false, actions: [], steps: [] };

  constructor(session: SimulationSession) { this.#session = session; }

  start(type: SwitchingProgramType) {
    if (this.#active) return { ok: false as const, error: 'A switching program is already active.' };
    const started = this.#session.beginProgramCapture();
    if (!started.ok) return started;
    this.#active = { token: started.token, historyStart: started.historyStart, type };
    this.#completed = { active: true, type, actions: [], steps: [] };
    return { ok: true as const };
  }

  snapshot(): SwitchingProgramSnapshot {
    if (!this.#active) return structuredClone(this.#completed);
    const history = this.#session.snapshot().history;
    const actions = history.slice(this.#active.historyStart).filter((action): action is Exclude<SessionAction, { kind: 'source' }> => action.kind !== 'source');
    const steps = this.#steps(this.#active.type, actions);
    return structuredClone({ active: true, type: this.#active.type, actions, steps });
  }

  #steps(type: SwitchingProgramType, actions: Exclude<SessionAction, { kind: 'source' }>[]): SwitchingProgramStep[] {
    const opening: ProgramCommunicationStep[] = type === 'isolation'
      ? [{ source: 'program', id: 'program:opening', action: 'INFORM', instructions: 'INFORM CCR OF INTENT TO ISOLATE EQUIPMENT' }]
      : [
        { source: 'program', id: 'program:cancel-certificate', action: 'INFORM', instructions: 'CANCEL ACCESS CERTIFICATE' },
        { source: 'program', id: 'program:opening', action: 'INFORM', instructions: 'INFORM CCR OF INTENT TO DE-ISOLATE EQUIPMENT' },
      ];
    const apparatus = actions.flatMap((action): ApparatusProgramStep[] => [
      { source: 'apparatus', id: `${action.id}:before`, actionId: action.id, role: 'verify-before', action, state: action.from },
      { source: 'apparatus', id: `${action.id}:action`, actionId: action.id, role: 'action', action },
      { source: 'apparatus', id: `${action.id}:after`, actionId: action.id, role: 'verify-after', action, state: action.to },
    ]);
    const closing: ProgramCommunicationStep[] = type === 'isolation'
      ? [
        { source: 'program', id: 'program:isolation-complete', action: 'INFORM', instructions: 'INFORM CCR ISOLATIONS IS COMPLETE' },
        { source: 'program', id: 'program:issue-certificate', action: 'INFORM', instructions: 'ISSUE ACCESS CERTIFICATE' },
      ]
      : [{ source: 'program', id: 'program:restoration-complete', action: 'INFORM', instructions: 'INFORM CCR THAT EQUIPMENT IS DE-ISOLATED' }];
    return [...opening, ...apparatus, ...closing];
  }

  undoLast(expectedActionId: number) {
    if (!this.#active) return { ok: false as const, error: 'No switching program is active.' };
    return this.#session.undoProgramCaptureAction(this.#active.token, expectedActionId);
  }

  /** Ends recording for the document-generation step while preserving the captured sequence. */
  endForDevelopment() {
    if (!this.#active) return { ok: false as const, error: 'No switching program is active.' };
    const program = this.snapshot();
    const result = this.#session.endProgramCapture(this.#active.token);
    if (!result.ok) return result;
    this.#active = undefined;
    this.#completed = { ...program, active: false };
    return { ok: true as const };
  }

  /** Cancelling discards the program record but deliberately leaves the simulated state as-is. */
  cancel() {
    if (!this.#active) return { ok: false as const, error: 'No switching program is active.' };
    const result = this.#session.endProgramCapture(this.#active.token);
    if (!result.ok) return result;
    this.#active = undefined;
    this.#completed = { active: false, actions: [], steps: [] };
    return { ok: true as const };
  }
}
