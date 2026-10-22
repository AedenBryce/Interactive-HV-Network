import { useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { SourcePath } from '../session/connectivity';
import type { DiagramPresentation } from './diagram';
import { Symbol } from './Symbol';
import { RelationshipsSymbol } from './RelationshipsSymbol';
import './navigation.css';

type Props = { snapshot: SessionSnapshot; selectedId: string; tracedPath?: SourcePath; presentation: DiagramPresentation; onSelectAsset: (id: string) => void };
type Camera = { x: number; y: number; width: number; height: number };

export function NetworkDiagram({ snapshot, selectedId, tracedPath, presentation, onSelectAsset }: Props) {
  const [viewId, setViewId] = useState(presentation.overviewId);
  const view = presentation.views.find(item => item.id === viewId)!;
  const [cameraOverride, setCamera] = useState<Camera | null>(null);
  const camera = cameraOverride ?? { x: view.bounds[0], y: view.bounds[1], width: view.bounds[2], height: view.bounds[3] };
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const visible = new Set(view.assetIds);
  const assets = snapshot.model.assets.filter(asset => visible.has(asset.id));
  const terminalOwners = new Map(snapshot.model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connections = snapshot.model.connections.filter(connection => visible.has(terminalOwners.get(connection.from)!) && visible.has(terminalOwners.get(connection.to)!) || view.boundaries?.some(boundary => boundary.connectionId === connection.id));
  const removedEdges = new Set(snapshot.impact.flatMap(item => item.before.routeEdgeIds.filter(id => !item.after.routeEdgeIds.includes(id))));
  const changedAssets = new Set(snapshot.impact.map(item => item.assetId));
  const labels = new Map(snapshot.model.assets.map(asset => [asset.id, asset.label]));
  const selectedVisible = visible.has(selectedId);
  const zoomPercent = Math.round(view.bounds[2] / camera.width * 100);

  function navigate(id: string) { setViewId(id); setCamera(null); }
  function zoom(factor: number) {
    const width = Math.max(view.bounds[2] / 4, Math.min(view.bounds[2] * 4, camera.width * factor));
    const height = width * view.bounds[3] / view.bounds[2];
    setCamera({ x: camera.x + (camera.width - width) / 2, y: camera.y + (camera.height - height) / 2, width, height });
  }
  function pan(dx: number, dy: number) { setCamera({ ...camera, x: camera.x + dx * camera.width, y: camera.y + dy * camera.height }); }
  function keyboard(event: KeyboardEvent<SVGSVGElement>) {
    if (event.target !== event.currentTarget) return;
    const actions: Record<string, () => void> = { ArrowLeft: () => pan(-.1, 0), ArrowRight: () => pan(.1, 0), ArrowUp: () => pan(0, -.1), ArrowDown: () => pan(0, .1), '+': () => zoom(.8), '=': () => zoom(.8), '-': () => zoom(1.25), Home: () => setCamera(null) };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }
  function startDrag(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0 || (event.target instanceof Element && event.target.closest('[data-selectable]'))) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, camera };
  }
  function moveDrag(event: PointerEvent<SVGSVGElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const rect = event.currentTarget.getBoundingClientRect();
    // SVG meet scaling preserves the view's aspect ratio, including letterboxing.
    const scale = Math.min(rect.width / start.camera.width, rect.height / start.camera.height);
    setCamera({ ...start.camera, x: start.camera.x - (event.clientX - start.x) / scale, y: start.camera.y - (event.clientY - start.y) / scale });
  }

  return <main className="diagram-panel interactive-diagram">
    <div className="panel-heading"><h2>Single-line diagram</h2><p>{snapshot.model.name}</p></div>
    <nav className="view-navigation" aria-label="Network views">{presentation.views.map(item => <button key={item.id} aria-current={item.id === viewId ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}</nav>
    <div className="diagram-toolbar" aria-label="Diagram navigation">
      <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1.25)} disabled={zoomPercent <= 25}>−</button><output aria-label="Diagram zoom">{zoomPercent}%</output><button aria-label="Zoom in" onClick={() => zoom(.8)} disabled={zoomPercent >= 400}>+</button><button onClick={() => setCamera(null)}>Fit view</button></div>
      <div className="pan-controls" aria-label="Pan diagram"><button aria-label="Pan left" onClick={() => pan(-.1, 0)}>←</button><button aria-label="Pan up" onClick={() => pan(0, -.1)}>↑</button><button aria-label="Pan down" onClick={() => pan(0, .1)}>↓</button><button aria-label="Pan right" onClick={() => pan(.1, 0)}>→</button></div>
    </div>
    <p className="navigation-help">Drag the canvas to pan. Focus the diagram and use arrow keys, +/− or Home to fit.</p>
    {!selectedVisible && <div className="outside-selection"><span>{labels.get(selectedId)} is outside this view. Its inspection and paths remain active.</span><button onClick={() => navigate(presentation.views.find(item => item.id !== presentation.overviewId && item.assetIds.includes(selectedId))?.id ?? presentation.overviewId)}>Show selected asset</button></div>}
    <div className="diagram-surface">
      <svg className="network-diagram" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} aria-label={`${view.label} single-line diagram`} tabIndex={0} onKeyDown={keyboard} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <title>{view.label} single-line diagram</title>
        {connections.map(connection => {
          const [x1, y1] = view.layout.terminals[connection.from];
          const [x2, y2] = view.layout.terminals[connection.to];
          const points = [[x1, y1], ...(view.layout.bends?.[connection.id] ?? []), [x2, y2]].map(point => point.join(',')).join(' ');
          const conflict = snapshot.conflicts.some(item => item.connectionIds.includes(connection.id));
          const result = snapshot.connectionResults[connection.id];
          return <g key={connection.id}><title>{connection.id}{result.unconfirmed ? ' — Unconfirmed information' : ''}</title>{removedEdges.has(`connection:${connection.id}`) && <polyline points={points} className="wire change-outline" />}{result.unconfirmed && <polyline points={points} className="wire uncertainty-outline" />}<polyline points={points} className={`wire ${result.sourceStatus === 'connected' ? 'connected' : 'disconnected'} ${result.earthStatus === 'connected' ? 'earthed' : ''} ${result.sourceStatus === 'unconfirmed' && result.earthStatus !== 'connected' ? 'unconfirmed-source' : ''} ${conflict ? 'conflict' : ''} ${tracedPath?.connectionIds.includes(connection.id) ? 'traced' : ''}`} /></g>;
        })}
        {assets.map(item => {
          const [x, y] = view.layout.assets[item.id];
          return <g key={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} data-selectable="true" aria-label={`Select ${item.label} on diagram`} aria-pressed={item.id === selectedId} className="diagram-asset" onClick={() => onSelectAsset(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(item.id); } }}>
            {changedAssets.has(item.id) && <rect x="-48" y="-48" width="96" height="96" rx="8" className="impact-outline" />}
            <rect x="-45" y="-45" width="90" height="90" rx="6" className={item.id === selectedId ? 'selection active' : 'selection'} />
            {item.sourcePairs || item.earthPairs || item.positions.some(position => position.sourcePairs || position.earthPairs)
              ? <RelationshipsSymbol asset={item} positionId={snapshot.devices[item.id]} layout={view.layout} />
              : <g transform={`rotate(${view.layout.rotations?.[item.id] ?? 0})`}><Symbol kind={item.kind} rotation={view.layout.rotations?.[item.id] ?? 0} open={snapshot.devices[item.id] === 'open'} unknown={item.positions.length > 0 && snapshot.devices[item.id] === null} /></g>}
            <text x={view.layout.labelOffsets?.[item.id]?.[0] ?? 0} y={view.layout.labelOffsets?.[item.id]?.[1] ?? 65} textAnchor="middle">{item.label.split(/ · |\n/).map((line, index) => <tspan key={index} x={view.layout.labelOffsets?.[item.id]?.[0] ?? 0} dy={index === 0 ? 0 : 20}>{line}</tspan>)}</text>
          </g>;
        })}
        {(snapshot.model.boundaries ?? []).filter(boundary => visible.has(terminalOwners.get(boundary.terminal)!) && (boundary.sourceCoverage === 'unconfirmed' || boundary.earthCoverage === 'unconfirmed')).map(boundary => {
          const [x, y] = view.layout.terminals[boundary.terminal];
          return <g key={`coverage:${boundary.id}`} transform={`translate(${x},${y})`} role="button" tabIndex={0} data-selectable="true" className="unconfirmed-boundary" aria-label={`Inspect unconfirmed boundary ${boundary.label}`} onClick={() => onSelectAsset(terminalOwners.get(boundary.terminal)!)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(terminalOwners.get(boundary.terminal)!); } }}><title>Unconfirmed off-page coverage: {boundary.label}</title><path d="M0 0 H60" /><circle cx="60" r="12" /><text x="60" y="5" textAnchor="middle">?</text></g>;
        })}
        {view.boundaries?.map(boundary => <g key={boundary.connectionId} data-selectable="true" role="button" tabIndex={0} className="boundary-port" aria-label={`Follow ${boundary.connectionId} to ${labels.get(boundary.remoteAssetId)}`} transform={`translate(${boundary.position.join(',')})`} onClick={() => navigate(boundary.targetViewId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(boundary.targetViewId); } }}><title>{boundary.connectionId} → {labels.get(boundary.remoteAssetId)}</title><circle r="12" /><text textAnchor="middle" y="5">↗</text></g>)}
      </svg>
    </div>
    {!!view.boundaries?.length && <section className="boundary-list" aria-label="Connections beyond this view"><h3>Connections beyond this view</h3>{view.boundaries.map(boundary => <button key={boundary.connectionId} onClick={() => navigate(boundary.targetViewId)}><strong>{boundary.connectionId}</strong><span>→ {labels.get(boundary.remoteAssetId)} · {presentation.views.find(item => item.id === boundary.targetViewId)?.label}</span></button>)}</section>}
    <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span>{snapshot.model.earths?.length ? <span><i className="dot earth-dot" />Earth connected (dashed)</span> : null}{snapshot.model.assets.some(asset => asset.sourcePairs || asset.earthPairs) && <span>Inside equipment: violet = declared source transfer; blue dashes = declared earth relationship</span>}{Object.values(snapshot.connectionResults).some(result => result.unconfirmed) && <span><i className="dot unconfirmed-dot" />Unconfirmed (amber dashes)</span>}{snapshot.conflicts.length > 0 && <span><i className="dot conflict-dot" />Source-to-earth conflict</span>}{snapshot.impact.length > 0 && <span><i className="dot impact-dot" />Changed path or asset</span>}{tracedPath && <span><i className="dot trace-dot" />Selected supply path</span>}</div>
  </main>;
}
