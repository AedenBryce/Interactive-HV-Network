import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { SourcePath } from '../session/connectivity';
import type { DiagramPresentation } from './diagram';
import { EquipmentSymbol } from './EquipmentSymbol';
import { isIndependentState } from '../session/mechanisms';
import { isSupported } from '../session/evidence';
import { diagramGeometry } from './diagram-geometry';
import { continuousNetwork } from './continuous-network';
import { hasDeviceCard, isDrive, isFuse } from './equipment-appearance';
import { currentAssetLabel } from './review-updates';
import './navigation.css';

type Props = { snapshot: SessionSnapshot; selectedId: string; tracedPath?: SourcePath; presentation: DiagramPresentation; onSelectAsset: (id: string, element?: Element) => void };
type Camera = { x: number; y: number; width: number; height: number };
const searchable = (value: string) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

export function NetworkDiagram({ snapshot, selectedId, tracedPath, presentation, onSelectAsset }: Props) {
  const [viewId, setViewId] = useState(presentation.overviewId);
  const [viewSearch, setViewSearch] = useState('');
  const [assetSearch, setAssetSearch] = useState('');
  const continuous = snapshot.model.id === 'site-whole-network' && !!snapshot.model.presentation?.views.find(item => item.id === snapshot.model.presentation?.overviewId)?.regions?.length;
  const matchingViews = presentation.views.filter(item => item.label.toLowerCase().includes(viewSearch.trim().toLowerCase()));
  const sourceView = presentation.views.find(item => item.id === viewId)!;
  // Session packages are immutable by ID/version; switching changes no coordinates.
  const geometry: ReturnType<typeof diagramGeometry> & Partial<Pick<ReturnType<typeof continuousNetwork>, 'panels' | 'hiddenIds' | 'referenceTop' | 'referenceLabel' | 'referenceIds' | 'treeEdgeIds'>> = useMemo(() => continuous ? continuousNetwork(snapshot.model) : diagramGeometry(snapshot.model, sourceView), [snapshot.model.id, snapshot.model.version, sourceView.id]);
  const { view, assets, connections } = geometry;
  const displayedAssets = assets.filter(asset => !geometry.hiddenIds?.has(asset.id));
  const matchingAssets = useMemo(() => {
    const query = searchable(assetSearch);
    return query ? assets.filter(asset => !geometry.hiddenIds?.has(asset.id) && [asset.label, asset.id, ...(asset.aliases ?? [])].some(value => searchable(value).includes(query))).slice(0, 12) : [];
  }, [assets, assetSearch]);
  const [cameraOverride, setCamera] = useState<Camera | null>(null);
  const [viewport, setViewport] = useState({ width: 1000, height: 700 });
  const fitCamera = useMemo(() => {
    const [x, y, width, height] = view.bounds;
    const ratio = viewport.width / viewport.height;
    const fittedWidth = Math.max(width, height * ratio); const fittedHeight = fittedWidth / ratio;
    return { x: x + (width - fittedWidth) / 2, y: y + (height - fittedHeight) / 2, width: fittedWidth, height: fittedHeight };
  }, [view.bounds, viewport]);
  const camera = cameraOverride ?? fitCamera;
  const drag = useRef<{ pointerId: number; x: number; y: number; camera: Camera } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const visible = new Set(view.assetIds);
  const removedEdges = new Set(snapshot.impact.flatMap(item => item.before.routeEdgeIds.filter(id => !item.after.routeEdgeIds.includes(id))));
  const changedAssets = new Set(snapshot.impact.map(item => item.assetId));
  const labels = new Map(snapshot.model.assets.map(asset => [asset.id, asset.label]));
  const selectedVisible = visible.has(selectedId);
  const zoomPercent = Math.round(fitCamera.width / camera.width * 100);
  const maxZoom = continuous ? Math.max(16, fitCamera.width / 300) : 16;

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setCamera(previous => previous ? { ...previous, height: previous.width * height / width, y: previous.y + (previous.height - previous.width * height / width) / 2 } : null);
        setViewport({ width, height });
      }
    });
    observer.observe(svg); return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = svg.getBoundingClientRect();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? rect.height : 1);
      setCamera(previous => {
        const base = previous ?? fitCamera;
        const scale = Math.min(rect.width / base.width, rect.height / base.height);
        const ax = Math.max(0, Math.min(1, (event.clientX - rect.left - (rect.width - base.width * scale) / 2) / (base.width * scale)));
        const ay = Math.max(0, Math.min(1, (event.clientY - rect.top - (rect.height - base.height * scale) / 2) / (base.height * scale)));
        const width = Math.max(fitCamera.width / maxZoom, Math.min(fitCamera.width * 4, base.width * Math.exp(Math.max(-240, Math.min(240, delta)) * .002)));
        const height = width * viewport.height / viewport.width;
        return { x: base.x + (base.width - width) * ax, y: base.y + (base.height - height) * ay, width, height };
      });
    };
    // Wheel over the map zooms instead of scrolling the page; cancellation requires a non-passive listener.
    svg.addEventListener('wheel', wheel, { passive: false });
    return () => svg.removeEventListener('wheel', wheel);
  }, [fitCamera, maxZoom, viewport]);

  function navigate(id: string) { setViewId(id); setCamera(null); }
  function zoom(factor: number) {
    const width = Math.max(fitCamera.width / maxZoom, Math.min(fitCamera.width * 4, camera.width * factor));
    const height = width * viewport.height / viewport.width;
    setCamera({ x: camera.x + (camera.width - width) / 2, y: camera.y + (camera.height - height) / 2, width, height });
  }
  function pan(dx: number, dy: number) { setCamera({ ...camera, x: camera.x + dx * camera.width, y: camera.y + dy * camera.height }); }
  function focusBox(left: number, top: number, width: number, height: number) {
    const fittedWidth = Math.max(width, height * viewport.width / viewport.height);
    const fittedHeight = fittedWidth * viewport.height / viewport.width;
    setCamera({ x: left + (width - fittedWidth) / 2, y: top + (height - fittedHeight) / 2, width: fittedWidth, height: fittedHeight });
  }
  function focusAssets(ids: string[]) {
    const points = ids.map(id => view.layout.assets[id]).filter(Boolean);
    if (!points.length) return;
    const left = Math.min(...points.map(point => point[0])) - 150;
    const top = Math.min(...points.map(point => point[1])) - 150;
    const width = Math.max(500, Math.max(...points.map(point => point[0])) - left + 400);
    const height = Math.max(500, Math.max(...points.map(point => point[1])) - top + 250);
    focusBox(left, top, width, height);
  }
  function focusArea(id: string) {
    const room = geometry.panels?.find(item => item.id === id);
    if (room) { focusBox(room.x - 100, room.y - 100, room.width + 200, room.height + 200); return; }
    const region = presentation.views.find(item => item.id === presentation.overviewId)?.regions?.find(item => item.targetViewId === id);
    const panel = geometry.panels?.find(item => item.id === region?.id);
    if (panel) focusBox(panel.x - 100, panel.y - 100, panel.width + 200, panel.height + 200);
    else focusAssets(presentation.views.find(item => item.id === id)?.assetIds.filter(assetId => !geometry.referenceIds?.includes(assetId)) ?? []);
  }
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

  return <main className={`diagram-panel interactive-diagram${continuous ? ' whole-network' : ''}`}>
    <div className="panel-heading"><h2>{continuous ? 'Whole network · supply tree' : 'Single-line diagram'}</h2><p>{continuous ? `${assets.length} assets · ${connections.length} connections · supplies at the top, feeders downward` : snapshot.model.name}</p></div>
    {continuous ? <div className="canvas-navigation">
      <label>Find asset<input aria-label="Find asset on whole network" value={assetSearch} onChange={event => setAssetSearch(event.target.value)} placeholder="Asset tag or name" /></label>
      <label>Zoom to group<select aria-label="Zoom to network area" defaultValue="" onChange={event => { focusArea(event.target.value); event.target.value = ''; }}><option value="" disabled>Choose area or board</option><optgroup label="Switchrooms and boards">{geometry.panels?.map(panel => <option key={panel.id} value={panel.id}>{panel.label}</option>)}</optgroup><optgroup label="Network areas">{presentation.views.find(item => item.id === presentation.overviewId)?.regions?.map(region => <option key={region.id} value={region.targetViewId}>{region.label.replaceAll('\n', ' · ')}</option>)}</optgroup></select></label>
      <button onClick={() => focusAssets([selectedId])}>Locate selected</button>
      {assetSearch.trim() && <div className="asset-search-results" aria-label="Matching network assets">{matchingAssets.map(asset => <button key={asset.id} onClick={event => { onSelectAsset(asset.id, event.currentTarget); focusAssets([asset.id]); setAssetSearch(''); }}>{currentAssetLabel(snapshot.model, asset)}</button>)}{!matchingAssets.length && <p>No matching assets.</p>}</div>}
    </div> : <>{presentation.views.length > 12 && <div className="view-search"><label>Find view<input aria-label="Find network view" value={viewSearch} onChange={event => setViewSearch(event.target.value)} placeholder="Area or view name" /></label>{viewSearch && <button onClick={() => setViewSearch('')}>Clear view search</button>}<span>{matchingViews.length} of {presentation.views.length} views</span></div>}
    <nav className="view-navigation" aria-label="Network views">{matchingViews.map(item => <button key={item.id} aria-current={item.id === viewId ? 'page' : undefined} onClick={() => navigate(item.id)}>{item.label}</button>)}{!matchingViews.length && <p>No matching views. Clear the search to see all views.</p>}</nav></>}
    <div className="diagram-toolbar" aria-label="Diagram navigation">
      <div className="zoom-controls"><button aria-label="Zoom out" onClick={() => zoom(1.25)} disabled={zoomPercent <= 25}>−</button><output aria-label="Diagram zoom">{zoomPercent}%</output><button aria-label="Zoom in" onClick={() => zoom(.8)} disabled={zoomPercent >= Math.round(maxZoom * 100)}>+</button><button onClick={() => setCamera(null)}>Fit view</button></div>
      <div className="pan-controls" aria-label="Pan diagram"><button aria-label="Pan left" onClick={() => pan(-.1, 0)}>←</button><button aria-label="Pan up" onClick={() => pan(0, -.1)}>↑</button><button aria-label="Pan down" onClick={() => pan(0, .1)}>↓</button><button aria-label="Pan right" onClick={() => pan(.1, 0)}>→</button></div>
    </div>
    <p className="navigation-help">Scroll over the diagram to zoom. Drag to pan. Keyboard: arrow keys, +/−, Home to fit.</p>
    {!selectedVisible && <div className="outside-selection"><span>{labels.get(selectedId)} is outside this view. Its inspection and paths remain active.</span><button onClick={() => navigate(presentation.views.find(item => item.id !== presentation.overviewId && item.assetIds.includes(selectedId))?.id ?? presentation.overviewId)}>Show selected asset</button></div>}
    <div className="diagram-surface">
      <svg ref={svgRef} className="network-diagram" viewBox={`${camera.x} ${camera.y} ${camera.width} ${camera.height}`} aria-label={`${view.label} single-line diagram`} tabIndex={0} onKeyDown={keyboard} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <title>{view.label} single-line diagram</title>
        {geometry.panels?.map(panel => <g key={panel.id} className="canvas-area" data-switchroom={panel.label}><title>{panel.label} · diagram equipment group</title><rect x={panel.x} y={panel.y} width={panel.width} height={panel.height} rx="8" /><text x={panel.x + panel.width - 24} y={panel.y + 40} textAnchor="end" style={{ fontSize: Math.min(24, (panel.width - 48) / (panel.title.length * .65)) }}>{panel.title}</text></g>)}
        {typeof geometry.referenceTop === 'number' && <text className="reference-heading" x={view.bounds[0] + 150} y={geometry.referenceTop - 150}>{geometry.referenceLabel}</text>}
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
          const unconfirmedConnection = !isSupported(snapshot.model, connection);
          return <g key={connection.id} data-connection-id={connection.id} data-from={connection.from} data-to={connection.to} data-tree-edge={geometry.treeEdgeIds?.has(connection.id)}><title>{connection.id}{unconfirmedConnection ? ' — Connection record unconfirmed' : ' — Connection record supported'}; source: {result.sourceStatus}; earth: {result.earthStatus}</title>{removedEdges.has(`connection:${connection.id}`) && <polyline points={points} className="wire change-outline" />}{unconfirmedConnection && <polyline points={points} className="wire uncertainty-outline" />}<polyline points={points} className={`wire ${result.sourceStatus === 'connected' ? 'connected' : 'disconnected'} ${result.earthStatus === 'connected' ? 'earthed' : ''} ${result.sourceStatus === 'unconfirmed' && result.earthStatus !== 'connected' ? 'unconfirmed-source' : ''} ${conflict ? 'conflict' : ''} ${tracedPath?.connectionIds.includes(connection.id) ? 'traced' : ''}`} /></g>;
        })}
        {displayedAssets.map(item => {
          const [x, y] = view.layout.assets[item.id];
          const label = geometry.labels.get(item.id)!;
          return <g key={item.id} data-asset-id={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} data-selectable="true" aria-label={`Select ${item.label} on diagram`} aria-pressed={item.id === selectedId} className="diagram-asset" onClick={event => onSelectAsset(item.id, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(item.id, event.currentTarget); } }}>
            {hasDeviceCard(item) ? <rect className="device-card" x="-48" y="-60" width={label.x - x + label.width + 60} height={Math.max(120, label.y - y + label.height + 72)} rx="6" /> : <path className="label-leader" d={`M45 0 H${label.x - x - 6}`} />}
            {changedAssets.has(item.id) && <rect x="-48" y="-48" width="96" height="96" rx="8" className="impact-outline" />}
            <title>{item.label}</title>
            <rect x="-38" y="-38" width="76" height="76" rx="6" className={item.id === selectedId ? 'selection active' : 'selection'} />
            <EquipmentSymbol asset={item} state={snapshot.devices[item.id]} layout={view.layout} />
            {isDrive(item) && <g className="winding-labels"><text x="-45" y="-110" textAnchor="end">{/ac-star$/.test(item.terminals[0]) ? 'Y' : 'Δ'}</text><text x="45" y="-110">{/ac-star$/.test(item.terminals[0]) ? 'Δ' : 'Y'}</text></g>}
          </g>;
        })}
        {displayedAssets.map(item => {
          const label = geometry.labels.get(item.id)!;
          const state = snapshot.devices[item.id];
          return <g key={`label:${item.id}`} className={`asset-label${hasDeviceCard(item) ? ' card-label' : ''}`} role="button" tabIndex={0} data-selectable="true" aria-label={`Inspect ${item.label} label`} onClick={event => onSelectAsset(item.id, event.currentTarget)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onSelectAsset(item.id, event.currentTarget); } }}>
            <title>{item.label}</title><rect x={label.x} y={label.y} width={label.width} height={label.height} rx="4" />
            <text x={label.x + label.width / 2} y={label.y + (continuous ? 24 : 21)} textAnchor="middle">{label.lines.map((line, index) => <tspan key={index} x={label.x + label.width / 2} dy={index ? continuous ? 25 : 21 : 0}>{line}</tspan>)}</text>
            {state !== undefined && <text x={label.x + label.width / 2} y={label.y + label.height - 6} textAnchor="middle" className="position-label">{isIndependentState(state) ? `${state.contact ?? '?'} · Rack ${state.racking ?? '?'}` : state ?? 'Unconfirmed'}</text>}
            {state === undefined && isFuse(item) && <title>Closed · intact fixed fuse in the selected V1 model.</title>}
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
    <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span>{snapshot.model.earths?.length ? <span><i className="dot earth-dot" />Earth connected</span> : null}{connections.some(connection => !isSupported(snapshot.model, connection)) && <span><i className="dot unconfirmed-dot" />Amber outline: connection record unconfirmed</span>}<span>? badge: external source/earth coverage unconfirmed</span>{snapshot.model.assets.some(asset => asset.sourceArcs?.length) && <span>Winding transfer and earth relationships: inspect Asset details</span>}{snapshot.conflicts.length > 0 && <span><i className="dot conflict-dot" />Source-to-earth conflict</span>}{snapshot.impact.length > 0 && <span><i className="dot impact-dot" />Changed path or asset</span>}{tracedPath && <span><i className="dot trace-dot" />Selected supply path</span>}</div>
  </main>;
}
