import { useState } from 'react';
import { SimulationSession } from '../session/session';
import { singleSupply } from '../models/synthetic';
import type { Asset } from '../session/model';
import { Symbol } from './Symbol';
import { singleSupplyLayout } from './diagram';

const kindLabels: Record<Asset['kind'], string> = { source: 'Electrical source', breaker: 'Circuit breaker', disconnector: 'Disconnector', transformer: 'Transformer', bus: 'LV bus endpoint', 'earth-switch': 'Earth switch' };

export function App() {
  const [session] = useState(() => new SimulationSession(singleSupply));
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [selectedId, setSelectedId] = useState('cb-01');
  const [message, setMessage] = useState('');
  const asset = snapshot.model.assets.find(asset => asset.id === selectedId)!;
  const currentPosition = asset.positions.find(p => p.id === snapshot.devices[asset.id]);
  const connected = snapshot.connectivity[asset.id].sourceIds.length > 0;
  const terminalSources = Object.assign({}, ...Object.values(snapshot.connectivity).map(c => c.terminalSources)) as Record<string, string[]>;
  const layout: { assets: Record<string, [number, number]>; terminals: Record<string, [number, number]> } = singleSupplyLayout;

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
        <nav className="asset-list" aria-label="Assets">{snapshot.model.assets.map(item => <button key={item.id} className={selectedId === item.id ? 'asset-row selected' : 'asset-row'} aria-label={`Select ${item.label}`} aria-pressed={selectedId === item.id} onClick={() => setSelectedId(item.id)}>
          <svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={item.kind} open={snapshot.devices[item.id] === 'open'} /></svg><span>{item.label}</span>
        </button>)}</nav>
      </aside>

      <main className="diagram-panel">
        <div className="panel-heading"><h2>Single-line diagram</h2><p>{snapshot.model.name}</p></div>
        <div className="diagram-surface">
          <svg className="network-diagram" viewBox="0 0 830 600" aria-label="Synthetic source to LV bus single-line diagram">
            <title>Synthetic source to LV bus single-line diagram</title>
            {snapshot.model.connections.map(connection => {
              const [x1, y1] = layout.terminals[connection.from];
              const [x2, y2] = layout.terminals[connection.to];
              return <line key={connection.id} x1={x1} y1={y1} x2={x2} y2={y2} className={terminalSources[connection.from]?.length ? 'wire connected' : 'wire disconnected'} />;
            })}
            {snapshot.model.assets.map(item => {
              const [x, y] = layout.assets[item.id];
              return <g key={item.id} transform={`translate(${x},${y})`} role="button" tabIndex={0} aria-label={`Select ${item.label} on diagram`} aria-pressed={item.id === selectedId} className="diagram-asset" onClick={() => setSelectedId(item.id)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedId(item.id); } }}>
                <rect x="-45" y="-45" width="90" height="90" rx="6" className={item.id === selectedId ? 'selection active' : 'selection'} />
                <Symbol kind={item.kind} open={snapshot.devices[item.id] === 'open'} />
                <text y="65" textAnchor="middle">{item.label}</text>
              </g>;
            })}
          </svg>
        </div>
        <div className="legend" aria-label="Diagram legend"><span><i className="dot connected" />Source connected</span><span><i className="dot disconnected" />No source connection</span></div>
      </main>

      <aside className="inspector" aria-label="Asset details">
        <h2>Asset details</h2>
        <div className="asset-heading"><svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={asset.kind} open={currentPosition?.id === 'open'} /></svg><div><h3>{asset.label}</h3><p>{kindLabels[asset.kind]}</p></div></div>
        <dl className="identity-rows"><div><dt>Identity</dt><dd>{asset.id === 'cb-01' ? 'CB-01' : asset.id}</dd></div><div><dt>State</dt><dd>{currentPosition?.label ?? 'Fixed connection'}</dd></div><div><dt>Source connectivity</dt><dd>{connected ? 'Connected' : 'No source connection'}</dd></div></dl>
        {asset.positions.length > 0 && <section className="switch-controls" aria-label="Switching controls"><h3>Set intended state</h3><div className="state-buttons">{asset.positions.map(position => <button key={position.id} onClick={() => changePosition(position.id)} disabled={currentPosition?.id === position.id}>{position.id === 'closed' ? 'Close' : position.label}</button>)}</div><p>Changing this breaker updates the downstream path.</p></section>}
        <p className="action-message" role="status" aria-live="polite">{message}</p>
      </aside>
    </div>
    <footer>Connectivity model only · No electrical calculations</footer>
  </div>;
}
