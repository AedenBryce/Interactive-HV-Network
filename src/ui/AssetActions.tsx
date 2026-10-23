import { useEffect, useRef } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { IndependentCommand } from '../session/mechanisms';
import { describeDeviceState, isIndependentState } from '../session/mechanisms';
import { isFuse } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';

export function AssetActions({ snapshot, assetId, anchor, onChange, onSource, onClose, onDetails }: {
  snapshot: SessionSnapshot; assetId: string; anchor: { x: number; y: number };
  onChange: (id: string, command: string | IndependentCommand) => void;
  onSource: (id: string, enabled: boolean) => void; onClose: () => void; onDetails: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const asset = snapshot.model.assets.find(item => item.id === assetId)!;
  const status = snapshot.switching[assetId];
  const state = snapshot.devices[assetId];
  const actions = status?.actions ?? asset.positions.map(position => ({ command: position.id, label: position.id === 'closed' ? 'Close' : position.label, ...status?.positions.find(item => item.id === position.id) }));
  useEffect(() => {
    ref.current?.focus();
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const outside = (event: globalThis.PointerEvent) => { if (event.target instanceof Element && !ref.current?.contains(event.target) && !event.target.closest('[data-selectable]')) onClose(); };
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [assetId, onClose]);
  return <div ref={ref} className="asset-actions" role="dialog" aria-label={`Actions for ${asset.label}`} tabIndex={-1} style={{ left: anchor.x, top: anchor.y }}>
    <div className="asset-actions-heading"><h3>{currentAssetLabel(snapshot.model, asset).split('\n')[0]}</h3><button aria-label="Close asset actions" onClick={onClose}>×</button></div>
    <p className="popup-identity">{asset.id}</p>
    <p>{isIndependentState(state) ? describeDeviceState(state) : asset.positions.find(position => position.id === state)?.label ?? (isFuse(asset) ? 'Closed · intact fixed fuse' : 'Network asset')}</p>
    {snapshot.mode === 'view-only' && <p>View-only scenario.</p>}
    {!!actions.length && <div className="state-buttons">{actions.map(action => {
      const selected = typeof action.command === 'string' ? action.command === state : isIndependentState(state) && state[action.command.kind] === action.command.value;
      return <button key={action.label} aria-pressed={selected} disabled={snapshot.mode === 'view-only' || !action.allowed || selected} title={action.reason} onClick={() => onChange(assetId, action.command)}>{action.label}</button>;
    })}</div>}
    {!!actions.filter(action => !action.allowed && action.reason).length && <details><summary>Unavailable actions</summary>{actions.filter(action => !action.allowed && action.reason).map(action => <p key={action.label}><strong>{action.label}:</strong> {action.reason}</p>)}</details>}
    {snapshot.model.sources.filter(source => source.assetId === assetId).map(source => <div className="state-buttons" key={source.id}><button disabled={snapshot.mode === 'view-only' || snapshot.sources[source.id] === true} onClick={() => onSource(source.id, true)}>Enable supply</button><button disabled={snapshot.mode === 'view-only' || snapshot.sources[source.id] === false} onClick={() => onSource(source.id, false)}>Disable supply</button></div>)}
    {!actions.length && !snapshot.model.sources.some(source => source.assetId === assetId) && <p>No switching action is modelled for this asset.</p>}
    <button className="popup-details" onClick={onDetails}>Asset details and evidence</button>
  </div>;
}
