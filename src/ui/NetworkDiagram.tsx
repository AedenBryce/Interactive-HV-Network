import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { SourcePath } from '../session/connectivity';
import type { DiagramPresentation } from './diagram';
import { EquipmentSymbol } from './EquipmentSymbol';
import { isIndependentState } from '../session/mechanisms';
import { diagramGeometry } from './diagram-geometry';
import './navigation.css';

type Props = { snapshot: SessionSnapshot; selectedId: string; tracedPath?: SourcePath; presentation: DiagramPresentation; onSelectAsset: (id: string) => void };
type Camera = { x: number; y: number; width: number; height: number };

export function NetworkDiagram({ snapshot, selectedId, tracedPath, presentation, onSelectAsset }: Props) {
  const [viewId, setViewId] = useState(presentation.overviewId);
  const [viewSearch, setViewSearch] = useState('');
  const matchingViews = presentation.views.filter(item => item.label.toLowerCase().includes(viewSearch.trim().toLowerCase()));
  const sourceView = presentation.views.find(item => item.id === viewId)!;
  // Session packages are immutable by ID/version; switching changes no coordinates.
  const geometry = useMemo(() => diagramGeometry(snapshot.model, sourceView), [snapshot.model.id, snapshot.model.version, sourceView.id]);
  const { view, assets, connections } = geometry;
  const [cameraOverride, setCamera] = useState<Camera | null>(null);
  const camera = cameraOverride ?? { x: view.bounds[0], y: view.bounds[1], width: view.bounds[2], height: view.bounds[3] };
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = new Set(view.assetIds);
  const removedEdges = new Set(snapshot.impact.flatMap(item => item.before.routeEdgeIds.filter(id => !item.after.routeEdgeIds.includes(id))));
  const changedAssets = new Set(snapshot.impact.map(item => item.assetId));
  const labels = new Map(snapshot.model.assets.map(asset => [asset.id, asset.label]));
  const selectedVisible = visible.has(selectedId);
  const zoomPercent = Math.round(view.bounds[2] / camera.width * 100);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      setCamera(previous => {
        const base = previous ?? { x: view.bounds[0], y: view.bounds[1], width: view.bounds[2], height: view.bounds[3] };
        const scale = Math.min(rect.width / base.width, rect.height / base.height);
        const ax = Math.max(0, Math.min(1, (event.clientX - rect.left - (rect.width - base.width * scale) / 2) / (base.width * scale)));
        const ay = Math.max(0, Math.min(1, (event.clientY - rect.top - (rect.height - base.height * scale) / 2) / (base.height * scale)));
        const width = Math.max(view.bounds[2] / 16, Math.min(view.bounds[2] * 4, base.width * Math.exp(Math.max(-240, Math.min(240, delta)) * .002)));
        const height = width * view.bounds[3] / view.bounds[2];
        return { x: base.x + (base.width - width) * ax, y: base.y + (base.height - height) * ay, width, height };
      });
    };
    // Wheel over the map zooms instead of scrolling the page; cancellation requires a non-passive listener.
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [view.bounds]);

  function navigate(id: string) { setViewId(id); setCamera(null); }
  function zoom(factor: number) {
    const width = Math.max(view.bounds[2] / 16, Math.min(view.bounds[2] * 4, camera.width * factor));
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
    {presentation.views.length > 12 && <div className="view-search"><label>Find view<input aria-label="Find network view" value={viewSearch} onChange={event => setViewSearch(event.target.value)} placeholder="Area or view name" /></label>{viewSearch && <button onClick={() => setViewSearch('')}>Clear view search</button>}<span>{matchingViews.length} of {presentation.views.length} views</span></div>}
    <nav className="view-navigation" aria-label="Network views">{matchingViews.map(item => <button key={item.id} aria-current={item.id === viewId ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}{!matchingViews.length && <p>No matching views. Clear the search to see all views.</p>}</nav>
    <div className="diagram-toolbar" aria-label="Diagram navigation">
      <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1.25)} disabled={zoomPercent <= 25}>−</button><output aria-label="Diagram zoom">{zoomPercent}%</output><button aria-label="Zoom in" onClick={() => zoom(.8)} disabled={zoomPercent >= 1600}>+</button><button onClick={() => setCamera(null)}>Fit view</button></div>
      <div className="pan-controls" aria-label="Pan diagram"><button aria-label="Pan left" onClick={() => pan(-.1, 0)}>←</button><button aria-label="Pan up" onClick={() => pan(0, -.1)}>↑</button><button aria-label="Pan down" onClick={() => pan(0, .1)}>↓</button><button aria-label="Pan right" onClick={() => pan(.1, 0)}>→</button></div>
    </div>
    <p className="navigation-help">Scroll over the diagram to zoom. Drag to pan. Keyboard: arrow keys, +/−, Home to fit.</p>
    {!selectedVisible && <div className="outside-selection"><span>{labels.get(selectedId)} is outside this view. Its inspection and paths remain active.</span><button onClick={() => navigate(presentation.views.find(item => item.id !== presentation.overviewId && item.assetIds.includes(selectedId))?.id ?? presentation.overviewId)}>Show selected asset</button></div>}
    <div className="diagram-surface">
      <svg ref={svgRef} className="network-diagram" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} aria-label={`${view.label} single-line diagram`} tabIndex={0} onKeyDown={keyboard} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <title>{view.label} single-line diagram</title>
        {view.regions?.map(region => {
          const [x, y, width, height] = region.bounds;
          const fontSize = Math.min(width / 12, height / 8);
          return <g key={`region:${region.id}`} className="diagram-region" role="button" tabIndex={0} data-selectable="true" aria-label={`Open area ${region.label}`} onClick={() => navigate(region.targetViewId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(region.targetViewId); } }}>
            <title>{region.label} — open detailed area view</title>
            <rect x={x} y={y} width={width} height={height} rx={25} />
            <text x={x + width / 2} y={y + fontSize + 15} textAnchor="middle" fontSize={fontSize}>{region.label.split('\n').map((line, index) => <tspan key={index} x={x + width / 2} dy={index === 0 ? 0 : fontSize * 1.1}>{line}</tspan>)}</text>
          </g>;
        })}
        {connections.map(connection => {
          const points = geometry.routes.get(connection.id)!.map(point => point.join(',')).join(' ');
          const conflict = snapshot.conflicts.some(item => item.connectionIds.includes(connection.id));
          const result = snapshot.connectionResults[connection.id];
          return <g key={connection.id} data-connection-id={connection.id} data-from={connection.from} data-to={connection.to}><title>{connection.id}{result.unconfirmed ? ' — Unconfirmed information' : ''}</title>{removedEdges.has(`connection:${connection.id}`) && <polyline points={points} className="wire change-outline" />}{result.unconfirmed && <polyline points={points} className="wire uncertainty-outline" />}<polyline points={points} className={`wire ${result.sourceStatus === 'connected' ? 'connected' : 'disconnected'} ${result.earthStatus === 'connected' ? 'earthed' : ''} ${result.sourceStatus === 'unconfirmed' && result.earthStatus !== 'connected' ? 'unconfirmed-source' : ''} ${conflict ? 'conflict' : ''} ${tracedPath?.connectionIds.includes(connection.id) ? 'traced' : ''}`} /></g>;
        })}
        {assets.map(item => {
          const [x, y] = view.layout.assets[item.id];
          return <g key={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} data-selectable="true" aria-label={`Select ${item.label} on diagram`} aria-pressed={item.id === selectedId} className="diagram-asset" onClick={() => onSelectAsset(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(item.id); } }}>
            {changedAssets.has(item.id) && <rect x="-48" y="-48" width="96" height="96" rx="8" className="impact-outline" />}
            <title>{item.label}</title>
            <rect x="-38" y="-38" width="76" height="76" rx="6" className={item.id === selectedId ? 'selection active' : 'selection'} />
            <EquipmentSymbol asset={item} state={snapshot.devices[item.id]} layout={view.layout} />
          </g>;
        })}
        {assets.map(item => {
          const label = geometry.labels.get(item.id)!;
          const state = snapshot.devices[item.id];
          return <g key={`label:${item.id}`} className="asset-label" role="button" tabIndex={0} data-selectable="true" aria-label={`Inspect ${item.label} label`} onClick={() => onSelectAsset(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(item.id); } }}>
            <title>{item.label}</title><rect x={label.x} y={label.y} width={label.width} height={label.height} rx="4" />
            <text x={label.x + label.width / 2} y={label.y + 21} textAnchor="middle">{label.lines.map((line, index) => <tspan key={index} x={label.x + label.width / 2} dy={index ? 21 : 0}>{line}</tspan>)}</text>
            {state !== undefined && <text x={label.x + label.width / 2} y={label.y + label.height - 6} textAnchor="middle" className="position-label">{isIndependentState(state) ? `${state.contact ?? '?'} · Rack ${state.racking ?? '?'}` : state ?? 'Unconfirmed'}</text>}
          </g>;
        })}
        {assets.filter(asset => snapshot.model.boundaries?.some(boundary => asset.terminals.includes(boundary.terminal) && (boundary.sourceCoverage === 'unconfirmed' || boundary.earthCoverage === 'unconfirmed'))).map(asset => {
          const [x, y] = view.layout.assets[asset.id];
          return <g key={`coverage:${asset.id}`} transform={`translate(${x + 34},${y - 34})`} role="button" tabIndex={0} data-selectable="true" className="unconfirmed-boundary" aria-label={`Inspect unconfirmed coverage for ${asset.label}`} onClick={() => onSelectAsset(asset.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(asset.id); } }}><title>Unconfirmed external source or earth coverage; inspect Asset details for exact boundaries.</title><circle r="10" /><text y="5" textAnchor="middle">?</text></g>;
        })}
        {view.boundaries?.map(boundary => <g key={boundary.connectionId} data-selectable="true" role="button" tabIndex={0} className="boundary-port" aria-label={`Follow ${boundary.connectionId} to ${labels.get(boundary.remoteAssetId)}`} transform={`translate(${boundary.position.join(',')})`} onClick={() => navigate(boundary.targetViewId)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); navigate(boundary.targetViewId); } }}><title>{boundary.connectionId} → {labels.get(boundary.remoteAssetId)}</title><circle r="12" /><text textAnchor="middle" y="5">↗</text></g>)}
      </svg>
    </div>
    {!!view.boundaries?.length && <section className="boundary-list" aria-label="Connections beyond this view"><h3>Connections beyond this view</h3>{view.boundaries.map(boundary => <button key={boundary.connectionId} onClick={() => navigate(boundary.targetViewId)}><strong>{boundary.connectionId}</strong><span>→ {labels.get(boundary.remoteAssetId)} · {presentation.views.find(item => item.id === boundary.targetViewId)?.label}</span></button>)}</section>}
    <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span>{snapshot.model.earths?.length ? <span><i className="dot earth-dot" />Earth connected</span> : null}{Object.values(snapshot.connectionResults).some(result => result.unconfirmed) && <span><i className="dot unconfirmed-dot" />Amber outline: Unconfirmed information</span>}{snapshot.model.assets.some(asset => asset.sourceArcs?.length) && <span>Winding transfer and earth relationships: inspect Asset details</span>}{snapshot.conflicts.length > 0 && <span><i className="dot conflict-dot" />Source-to-earth conflict</span>}{snapshot.impact.length > 0 && <span><i className="dot impact-dot" />Changed path or asset</span>}{tracedPath && <span><i className="dot trace-dot" />Selected supply path</span>}</div>
  </main>;
}
