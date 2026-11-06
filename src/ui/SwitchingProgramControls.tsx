import type { SessionAction } from '../session/session';
import type { SwitchingProgramSnapshot, SwitchingProgramStep, SwitchingProgramType } from '../program/switching-program-coordinator';
import './switching-program.css';

type Props = {
  program: SwitchingProgramSnapshot;
  stepLabel: (step: SwitchingProgramStep) => string;
  onStart: (type: SwitchingProgramType) => void;
  onUndo: (action: SessionAction) => void;
  onEnd: () => void;
  onCancel: () => void;
};

export function SwitchingProgramControls({ program, stepLabel, onStart, onUndo, onEnd, onCancel }: Props) {
  return <section className="switching-program-controls" aria-label="Switching program capture">
    <h2>Switching program</h2>
    {!program.active && <div className="switching-program-start">
      <button onClick={() => onStart('isolation')}>Start Isolation Program</button>
      <button onClick={() => onStart('restoration')}>Start Restoration Program</button>
      {program.actions.length > 0 && <><p>{program.type === 'isolation' ? 'Isolation' : 'Restoration'} capture ended. The captured sequence is ready for document development.</p><ol>{program.steps.map(step => <li key={step.id}>{stepLabel(step)}</li>)}</ol></>}
    </div>}
    {program.active && <>
      <p>{program.type === 'isolation' ? 'Isolation' : 'Restoration'} capture started from the current simulated state. Accepted apparatus actions: {program.actions.length}.</p>
      {program.steps.length > 0 ? <ol>{program.steps.map(step => <li key={step.id}>{stepLabel(step)}</li>)}</ol> : <p>No accepted apparatus actions recorded yet.</p>}
      <div className="switching-program-buttons">
        <button disabled={!program.actions.length} onClick={() => onUndo(program.actions.at(-1)!)}>Revert last step</button>
        <button onClick={onEnd}>Finish capture</button>
        <button onClick={onCancel}>Cancel program</button>
      </div>
    </>}
    <p className="switching-program-note">Records accepted simulated apparatus actions. It does not establish live equipment status or authorize operational isolation.</p>
  </section>;
}
