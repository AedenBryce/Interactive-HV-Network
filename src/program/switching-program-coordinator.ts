import type { SessionAction, SimulationSession } from '../session/session';

export type SwitchingProgramType = 'isolation' | 'restoration';
export type SwitchingProgramSnapshot = {
  active: boolean;
  type?: SwitchingProgramType;
  actions: SessionAction[];
};

type ActiveCapture = { token: number; historyStart: number; type: SwitchingProgramType };

export class SwitchingProgramCoordinator {
  #session: SimulationSession;
  #active?: ActiveCapture;
  #completed: SwitchingProgramSnapshot = { active: false, actions: [] };

  constructor(session: SimulationSession) { this.#session = session; }

  start(type: SwitchingProgramType) {
    if (this.#active) return { ok: false as const, error: 'A switching program is already active.' };
    const started = this.#session.beginProgramCapture();
    if (!started.ok) return started;
    this.#active = { token: started.token, historyStart: started.historyStart, type };
    this.#completed = { active: true, type, actions: [] };
    return { ok: true as const };
  }

  snapshot(): SwitchingProgramSnapshot {
    if (!this.#active) return structuredClone(this.#completed);
    const history = this.#session.snapshot().history;
    return structuredClone({ active: true, type: this.#active.type, actions: history.slice(this.#active.historyStart).filter(action => action.kind !== 'source') });
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
    this.#completed = { active: false, actions: [] };
    return { ok: true as const };
  }
}
