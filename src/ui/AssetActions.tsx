import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { IndependentCommand } from '../session/mechanisms';
import { describeDeviceState, isIndependentState } from '../session/mechanisms';
import { healthyFuseState, isFuse } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import { switchActions } from './combined-switch-actions';
import { getAssetProgramMetadata } from '../program/asset-program-metadata';

export function AssetActions({ snapshot, assetId, anchor, roomLabel, onChange, onSource, onClose }: {
  snapshot: SessionSnapshot; assetId: string; anchor: { x: number; y: number }; roomLabel?: string;
  onChange: (id: string, command: string | IndependentCommand) => void;
  onSource: (id: string, enabled: boolean) => void; onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState(anchor);
  const drag = useRef<{ pointerId: number; x: number; y: number; left: number; top: number } | null>(null);
  const asset = snapshot.model.assets.find(item => item.id === assetId)!;
  const state = snapshot.devices[assetId];
  const programMetadata = Object.hasOwn(snapshot.devices, assetId) ? getAssetProgramMetadata(snapshot.model, asset) : undefined;
  const actions = switchActions(snapshot, asset);
  const name = currentAssetLabel(snapshot.model, asset).split('\n')[0].toUpperCase();

  useEffect(() => {
    setPosition({ x: anchor.x, y: anchor.y });
    drag.current = null;
  }, [assetId, anchor.x, anchor.y]);

  useEffect(() => {
    ref.current?.focus();
    const escape = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') onClose(); };
    const outside = (event: globalThis.PointerEvent) => {
      if (!drag.current && event.target instanceof Element && !ref.current?.contains(event.target) && !event.target.closest('[data-selectable]')) onClose();
    };
    document.addEventListener('keydown', escape); document.addEventListener('pointerdown', outside);
    return () => { document.removeEventListener('keydown', escape); document.removeEventListener('pointerdown', outside); };
  }, [assetId, onClose]);

  const constrain = (x: number, y: number) => ({
    x: Math.max(12, Math.min(x, window.innerWidth - (ref.current?.offsetWidth ?? 340) - 12)),
    y: Math.max(12, Math.min(y, window.innerHeight - (ref.current?.offsetHeight ?? 200) - 12)),
  });
  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
    event.preventDefault(); event.stopPropagation();
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, left: position.x, top: position.y };
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = drag.current;
    if (!current || current.pointerId !== event.pointerId) return;
    event.preventDefault(); event.stopPropagation();
    setPosition(constrain(current.left + event.clientX - current.x, current.top + event.clientY - current.y));
  }
  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }
  function moveWithKeyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target instanceof Element && event.target.closest('button')) return;
    const delta = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] }[event.key];
    if (!delta) return;
    event.preventDefault(); event.stopPropagation();
    setPosition(previous => constrain(previous.x + delta[0], previous.y + delta[1]));
  }

  return <div ref={ref} className="asset-actions" role="dialog" aria-label={'ACTIONS FOR ' + name} tabIndex={-1} style={{ left: position.x, top: position.y }}>
    <div className="asset-actions-heading" role="group" aria-label="Move control popup" tabIndex={0} title="DRAG TO MOVE · ARROW KEYS ALSO MOVE THIS POPUP" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={finishDrag} onKeyDown={moveWithKeyboard}>
      <h3>{name}</h3><button aria-label="Close asset actions" onClick={onClose}>×</button>
    </div>
    {roomLabel && <p className="popup-room">WITHIN {roomLabel.toUpperCase()}</p>}
    <p className={isFuse(asset) ? 'fuse-state-status' : undefined}>
      {isFuse(asset)
        ? <><span>MODELLED FUSE CONDITION</span><strong>{healthyFuseState.toUpperCase()}</strong></>
        : (isIndependentState(state) ? describeDeviceState(state) : asset.positions.find(position => position.id === state)?.label ?? 'NETWORK ASSET').toUpperCase()}
    </p>
    {snapshot.mode === 'view-only' && <p>VIEW-ONLY SCENARIO</p>}
    {programMetadata && <section className="program-metadata" aria-label="Switching program details">
      <h4>SWITCHING PROGRAM DETAILS</h4>
      <dl>
        <div><dt>PROGRAM LOCATION</dt><dd>{programMetadata.location ?? 'NOT ASSIGNED'}</dd></div>
        <div><dt>PROGRAM VOLTAGE</dt><dd>{programMetadata.voltage ?? 'NOT ASSIGNED'}</dd></div>
        <div><dt>DRAWING REFERENCES</dt><dd>{programMetadata.drawingReferences.length
          ? programMetadata.drawingReferences.join(', ')
          : 'NOT ASSIGNED'}</dd></div>
      </dl>
      {programMetadata.missingFields.length > 0 && <p className="program-metadata-status" role="status">PROGRAM METADATA INCOMPLETE</p>}
    </section>}
    {!!actions.length && <div className="state-buttons">{actions.map(action =>
      <button key={action.label} aria-pressed={action.selected} disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive || !action.allowed || action.selected} title={snapshot.programCaptureActive ? 'Program capture controls accepted apparatus actions only.' : action.reason?.toUpperCase()} onClick={() => onChange(action.assetId, action.command)}>{action.label.toUpperCase()}</button>
    )}</div>}
    {snapshot.model.sources.filter(source => source.assetId === assetId).map(source => <div className="state-buttons" key={source.id}><button disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive || snapshot.sources[source.id] === true} onClick={() => onSource(source.id, true)}>ENABLE SUPPLY</button><button disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive || snapshot.sources[source.id] === false} onClick={() => onSource(source.id, false)}>DISABLE SUPPLY</button></div>)}
  </div>;
}

