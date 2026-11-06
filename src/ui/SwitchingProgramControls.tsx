import { useState } from 'react';
import type { SessionAction } from '../session/session';
import type { SwitchingProgramSnapshot, SwitchingProgramType } from '../program/switching-program-coordinator';
import './switching-program.css';

type Props = {
  program: SwitchingProgramSnapshot;
  actionLabel: (action: SessionAction) => string;
  onStart: (type: SwitchingProgramType) => void;
  onUndo: (action: SessionAction) => void;
  onEnd: () => void;
  onCancel: () => void;
};

export function SwitchingProgramControls({ program, actionLabel, onStart, onUndo, onEnd, onCancel }: Props) {
  const [type, setType] = useState<SwitchingProgramType>('isolation');
  return <section className="switching-program-controls" aria-label="Switching program capture">
    <h2>Switching program</h2>
    {!program.active && <div className="switching-program-start">
      <label>Program type<select aria-label="Switching program type" value={type} onChange={event => setType(event.target.value as SwitchingProgramType)}><option value="isolation">Isolation</option><option value="restoration">Restoration</option></select></label>
      <button onClick={() => onStart(type)}>Start switching program</button>
      {program.actions.length > 0 && <><p>{program.type === 'isolation' ? 'Isolation' : 'Restoration'} capture ended. The captured sequence is ready for document development.</p><ol>{program.actions.map(action => <li key={action.id}>{actionLabel(action)}</li>)}</ol></>}
    </div>}
    {program.active && <>
      <p>{program.type === 'isolation' ? 'Isolation' : 'Restoration'} capture started from the current simulated state. Accepted apparatus actions: {program.actions.length}.</p>
      {program.actions.length > 0 ? <ol>{program.actions.map(action => <li key={action.id}>{actionLabel(action)}</li>)}</ol> : <p>No accepted apparatus actions recorded yet.</p>}
      <div className="switching-program-buttons">
        <button disabled={!program.actions.length} onClick={() => onUndo(program.actions.at(-1)!)}>Revert last step</button>
        <button onClick={onEnd}>Finish capture</button>
        <button onClick={onCancel}>Cancel program</button>
      </div>
    </>}
    <p className="switching-program-note">Records accepted simulated apparatus actions. It does not establish live equipment status or authorize operational isolation.</p>
  </section>;
}
