import { useState } from 'react';
import { SimulationSession } from '../session/session';
import { singleSupply, alternateSupplies } from '../models/synthetic';
import { earthFixture } from '../models/earth-fixture';
import type { Asset } from '../session/model';
import { Symbol } from './Symbol';
import { singleSupplyLayout, alternateLayout, earthLayout } from './diagram';
import type { DiagramLayout } from './diagram';
import { EarthDetails } from './EarthDetails';

const kindLabels: Record<Asset['kind'], string> = { source: 'Electrical source', breaker: 'Circuit breaker', disconnector: 'Disconnector', transformer: 'Transformer', bus: 'Bus', 'earth-switch': 'Earth switch' };
const demonstrations = [singleSupply, alternateSupplies, earthFixture];
const layouts: Record<string, DiagramLayout> = { 'single-supply': singleSupplyLayout, 'alternate-supplies': alternateLayout, 'synthetic-earth': earthLayout };

export function App() {
  const [session] = useState(() => new SimulationSession(singleSupply));
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [selectedId, setSelectedId] = useState('cb-01');
  const [message, setMessage] = useState('');
  const [traceKey, setTraceKey] = useState<string | null>(null);
  const asset = snapshot.model.assets.find(asset => asset.id === selectedId)!;
  const currentPosition = asset.positions.find(p => p.id === snapshot.devices[asset.id]);
  const connected = snapshot.connectivity[asset.id].sourceIds.length > 0;
  const terminalSources = Object.assign({}, ...Object.values(snapshot.connectivity).map(c => c.terminalSources)) as Record<string, string[]>;
  const layout = layouts[snapshot.model.id];
  const paths = snapshot.connectivity[asset.id].paths;
  const tracedPath = paths.find(path => `${path.sourceId}:${path.terminalId}` === traceKey);
  const removedEdges = new Set(snapshot.impact.flatMap(item => item.before.routeEdgeIds.filter(id => !item.after.routeEdgeIds.includes(id))));
  const changedAssets = new Set(snapshot.impact.map(item => item.assetId));
  const labels = new Map(snapshot.model.assets.map(item => [item.id, item.label]));

  function selectAsset(id: string) { setSelectedId(id); setTraceKey(null); }

  function selectModel(id: string) {
    const result = session.loadModel(demonstrations.find(model => model.id === id));
    if (result.ok) { setSnapshot(session.snapshot()); setSelectedId('cb-01'); setTraceKey(null); setMessage(''); }
    else setMessage(result.error);
  }

  function changeSource(id: string, enabled: boolean) {
    const result = session.changeSource(id, enabled);
    if (result.ok) { setSnapshot(session.snapshot()); setMessage(`${snapshot.model.sources.find(source => source.id === id)?.label} ${enabled ? 'enabled' : 'disabled'}. Connectivity updated.`); }
    else setMessage(result.error);
  }

  function changePosition(position: string) {
    const result = session.changeDevice(asset.id, position);
    if (result.ok) {
      setSnapshot(session.snapshot());
      setMessage(`${asset.label} changed to ${asset.positions.find(p => p.id === position)?.label}. Connectivity updated.`);
    } else setMessage(result.error);
  }

  return <div className="app">
    <header className="app-header"><h1>HV Network</h1><span>Local simulation</span></header>
    <div className="workspace">
      <aside className="network-rail" aria-label="Network model">
        <h2>Network model</h2>
        <p className="model-name">{snapshot.model.name}<br /><span className="version">{snapshot.model.version}</span></p>
        <p className="model-note">Demonstration model.<br />Not the site network.</p>
        <label className="model-picker">Demonstration model<select value={snapshot.model.id} onChange={event => selectModel(event.target.value)}>{demonstrations.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <nav className="asset-list" aria-label="Assets">{snapshot.model.assets.map(item => <button key={item.id} className={selectedId === item.id ? 'asset-row selected' : 'asset-row'} aria-label={`Select ${item.label}`} aria-pressed={selectedId === item.id} onClick={() => selectAsset(item.id)}>
          <svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={item.kind} open={snapshot.devices[item.id] === 'open'} /></svg><span>{item.label}</span>
        </button>)}</nav>
      </aside>

      <main className="diagram-panel">
        <div className="panel-heading"><h2>Single-line diagram</h2><p>{snapshot.model.name}</p></div>
        <div className="diagram-surface">
          <svg className="network-diagram" viewBox="0 0 830 600" aria-label={`${snapshot.model.name} single-line diagram`}>
            <title>{snapshot.model.name} single-line diagram</title>
            {snapshot.model.connections.map(connection => {
              const [x1, y1] = layout.terminals[connection.from];
              const [x2, y2] = layout.terminals[connection.to];
              const points = [[x1, y1], ...(layout.bends?.[connection.id] ?? []), [x2, y2]].map(point => point.join(',')).join(' ');
              const earthConnected = Object.values(snapshot.connectivity).some(c => c.terminalEarths[connection.from]?.length);
              const conflict = snapshot.conflicts.some(c => c.connectionIds.includes(connection.id));
              return <g key={connection.id}>{removedEdges.has(`connection:${connection.id}`) && <polyline points={points} className="wire change-outline" />}<polyline points={points} className={`wire ${terminalSources[connection.from]?.length ? 'connected' : 'disconnected'} ${earthConnected ? 'earthed' : ''} ${conflict ? 'conflict' : ''} ${tracedPath?.connectionIds.includes(connection.id) ? 'traced' : ''}`} /></g>;
            })}
            {snapshot.model.assets.map(item => {
              const [x, y] = layout.assets[item.id];
              return <g key={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`Select ${item.label} on diagram`} aria-pressed={item.id === selectedId} className="diagram-asset" onClick={() => selectAsset(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); selectAsset(item.id); } }}>
                {changedAssets.has(item.id) && <rect x="-48" y="-48" width="96" height="96" rx="8" className="impact-outline" />}
                <rect x="-45" y="-45" width="90" height="90" rx="6" className={item.id === selectedId ? 'selection active' : 'selection'} />
                <g transform={`rotate(${layout.rotations?.[item.id] ?? 0})`}><Symbol kind={item.kind} open={snapshot.devices[item.id] === 'open'} /></g>
                <text x={layout.labelOffsets?.[item.id]?.[0] ?? 0} y={layout.labelOffsets?.[item.id]?.[1] ?? 65} textAnchor="middle">{item.label}</text>
              </g>;
            })}
          </svg>
        </div>
        <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span>{snapshot.model.earths?.length ? <span><i className="dot earth-dot" />Earth connected (dashed)</span> : null}{snapshot.conflicts.length > 0 && <span><i className="dot conflict-dot" />Source-to-earth conflict</span>}{snapshot.impact.length > 0 && <span><i className="dot impact-dot" />Changed path or asset</span>}{tracedPath && <span><i className="dot trace-dot" />Selected supply path</span>}</div>
      </main>

      <aside className="inspector" aria-label="Asset details">
        <h2>Asset details</h2>
        <div className="asset-heading"><svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={asset.kind} open={currentPosition?.id === 'open'} /></svg><div><h3>{asset.label}</h3><p>{kindLabels[asset.kind]}</p></div></div>
        <dl className="identity-rows"><div><dt>Identity</dt><dd>{asset.id === 'cb-01' ? 'CB-01' : asset.id}</dd></div><div><dt>State</dt><dd>{currentPosition?.label ?? 'Fixed connection'}</dd></div><div><dt>Source connectivity</dt><dd>{connected ? 'Connected' : 'No source connection'}</dd></div></dl>
        {asset.positions.length > 0 && <section className="switch-controls" aria-label="Switching controls"><h3>Set intended state</h3><div className="state-buttons">{asset.positions.map(position => <button key={position.id} onClick={() => changePosition(position.id)} disabled={currentPosition?.id === position.id}>{position.id === 'closed' ? 'Close' : position.label}</button>)}</div><p>Changing this device updates the represented connections.</p></section>}
        {snapshot.model.sources.filter(source => source.assetId === asset.id).map(source => <section className="switch-controls" key={source.id} aria-label={`${source.label} availability`}><h3>Source availability</h3><p>{snapshot.sources[source.id] ? 'Enabled' : 'Disabled'}</p><div className="state-buttons"><button aria-label={`Enable ${source.label}`} disabled={snapshot.sources[source.id]} onClick={() => changeSource(source.id, true)}>Enable</button><button aria-label={`Disable ${source.label}`} disabled={!snapshot.sources[source.id]} onClick={() => changeSource(source.id, false)}>Disable</button></div></section>)}
        {snapshot.model.earths?.length ? <EarthDetails model={snapshot.model} connectivity={snapshot.connectivity[asset.id]} /> : null}
        <section className="source-paths" aria-label="Source paths"><h3>Source paths</h3>{paths.length ? <><p>One example per source and terminal. Highlight a path to follow its equipment.</p>{paths.map(path => <button key={`${path.sourceId}:${path.terminalId}`} aria-pressed={tracedPath === path} onClick={() => setTraceKey(`${path.sourceId}:${path.terminalId}`)}><strong>{snapshot.model.sources.find(source => source.id === path.sourceId)?.label} → {path.terminalId}</strong><span>{path.assetIds.map(id => labels.get(id)).join(' → ')}</span></button>)}</> : <p>No path to an enabled modelled source.</p>}</section>
        {snapshot.impact.length > 0 && <section className="impact-list" aria-label="Last action impacts"><h3>Last action impacts</h3><ul>{snapshot.impact.map(item => <li key={item.assetId}><button onClick={() => selectAsset(item.assetId)}>{labels.get(item.assetId)}</button><span>{item.connectivityChanged ? 'Connectivity changed' : 'Route changed; source connection retained'}</span></li>)}</ul></section>}
        <p className="action-message" role="status" aria-live="polite">{message}</p>
      </aside>
    </div>
    <footer>Connectivity model only · No electrical calculations</footer>
  </div>;
}
