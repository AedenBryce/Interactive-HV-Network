import type { SessionSnapshot } from '../session/session';
import './history.css';
import { describeSessionAction } from '../session/action-description';

type Props = { snapshot: SessionSnapshot; onUndo: () => void; onReset: () => void };

export function SessionHistory({ snapshot, onUndo, onReset }: Props) {
  return <section className="session-history" aria-label="Session history">
    <h3>Session history</h3>
    <div className="history-controls"><button onClick={onUndo} disabled={!snapshot.canUndo}>Undo last action</button><button onClick={onReset} disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive}>Reset network</button></div>
    <p>{snapshot.model.synthetic ? 'Synthetic starting configuration.' : 'This model’s recorded starting configuration.'} Reset restores starting devices and sources and clears history.</p>
    {snapshot.history.length > 0 ? <ol>{snapshot.history.map(action => <li key={action.id}>{describeSessionAction(action, snapshot.model)}</li>)}</ol> : <p>No accepted state changes in this session.</p>}
  </section>;
}
