import type { SessionAction, SessionSnapshot } from '../session/session';
import './history.css';
import { describeDeviceState } from '../session/mechanisms';

type Props = { snapshot: SessionSnapshot; onUndo: () => void; onReset: () => void };

export function SessionHistory({ snapshot, onUndo, onReset }: Props) {
  const assets = new Map(snapshot.model.assets.map(asset => [asset.id, asset]));
  const sources = new Map(snapshot.model.sources.map(source => [source.id, source.label]));
  function describe(action: SessionAction) {
    if (action.kind === 'source') return `${sources.get(action.sourceId) ?? action.sourceId}: ${action.from === null ? 'Unconfirmed' : action.from ? 'Enabled' : 'Disabled'} → ${action.to ? 'Enabled' : 'Disabled'}`;
    if (action.kind === 'device') {
      const asset = assets.get(action.assetId);
      const position = (id: string | null) => id === null ? 'Unconfirmed' : asset?.positions.find(position => position.id === id)?.label ?? id;
      return `${asset?.label ?? action.assetId}: ${position(action.from)} → ${position(action.to)}`;
    }
    return `${assets.get(action.assetId)?.label ?? action.assetId}: ${describeDeviceState(action.from)} → ${describeDeviceState(action.to)}`;
  }
  return <section className="session-history" aria-label="Session history">
    <h3>Session history</h3>
    <div className="history-controls"><button onClick={onUndo} disabled={!snapshot.canUndo}>Undo last action</button><button onClick={onReset} disabled={snapshot.mode === 'view-only'}>Reset network</button></div>
    <p>{snapshot.model.synthetic ? 'Synthetic starting configuration.' : 'This model’s recorded starting configuration.'} Reset restores starting devices and sources and clears history.</p>
    {snapshot.history.length > 0 ? <ol>{snapshot.history.map(action => <li key={action.id}>{describe(action)}</li>)}</ol> : <p>No accepted state changes in this session.</p>}
  </section>;
}
