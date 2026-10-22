import { useRef, useState } from 'react';
import { SimulationSession } from '../session/session';
import type { Asset } from '../session/model';
import { Symbol } from './Symbol';
import { NetworkDiagram } from './NetworkDiagram';
import { models } from './model-catalog';
import { fallbackPresentation } from '../session/presentation';
import { EarthDetails } from './EarthDetails';
import { InterlockDetails } from './InterlockDetails';
import { EvidenceDetails } from './EvidenceDetails';
import { UncertaintyDetails } from './UncertaintyDetails';
import { SessionHistory } from './SessionHistory';
import { RelationshipDetails } from './RelationshipDetails';
import { ScenarioControls } from './ScenarioControls';
import { contactPosition, describeDeviceState, getRemovableMechanism } from '../session/mechanisms';
import type { IndependentCommand } from '../session/mechanisms';

const kindLabels: Record<Asset['kind'], string> = { source: 'Electrical source', breaker: 'Circuit breaker', contactor: 'Contactor', disconnector: 'Disconnector', transformer: 'Transformer', bus: 'Bus', 'earth-switch': 'Earth switch', interface: 'Network interface' };

export function App() {
  const [session] = useState(() => new SimulationSession(models[0]));
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [selectedId, setSelectedId] = useState('cb-01');
  const [message, setMessage] = useState('');
  const [traceKey, setTraceKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const inspector = useRef<HTMLElement>(null);
  const asset = snapshot.model.assets.find(asset => asset.id === selectedId)!;
  const mechanism = getRemovableMechanism(asset);
  const currentPosition = asset.positions.find(p => p.id === snapshot.devices[asset.id]);
  const connectivity = snapshot.connectivity[asset.id];
  const switching = snapshot.switching[asset.id];
  const paths = snapshot.connectivity[asset.id].paths;
  const tracedPath = paths.find(path => `${path.sourceId}:${path.terminalId}` === traceKey);
  const labels = new Map(snapshot.model.assets.map(item => [item.id, item.label]));

  function selectAsset(id: string) { setSelectedId(id); setTraceKey(null); inspector.current?.scrollTo({ top: 0 }); }

  function updateSession(action: () => void) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    // Yield the input event so progress is visible before a whole-network calculation.
    window.requestAnimationFrame(() => window.setTimeout(() => {
      try { action(); }
      finally { pending.current = false; setBusy(false); }
    }, 0));
  }

  function selectModel(id: string) {
    updateSession(() => {
      const result = session.loadModel(models.find(model => model.id === id));
      if (result.ok) { const next = session.snapshot(); setSnapshot(next); setSelectedId(next.model.assets.find(item => item.positions.length || getRemovableMechanism(item))?.id ?? next.model.assets[0].id); setTraceKey(null); setMessage(''); inspector.current?.scrollTo({ top: 0 }); }
      else setMessage(result.error);
    });
  }

  function changeSource(id: string, enabled: boolean) {
    updateSession(() => {
      const result = session.changeSource(id, enabled);
      if (result.ok) { setSnapshot(session.snapshot()); setMessage(`${snapshot.model.sources.find(source => source.id === id)?.label} ${enabled ? 'enabled' : 'disabled'}. Connectivity updated.`); }
      else setMessage(result.error);
    });
  }

  function changePosition(position: string | IndependentCommand) {
    updateSession(() => {
      const result = session.changeDevice(asset.id, position);
      if (result.ok) {
        setSnapshot(session.snapshot());
        const label = typeof position === 'string' ? asset.positions.find(p => p.id === position)?.label : switching.actions?.find(action => action.command.kind === position.kind && action.command.value === position.value)?.label;
        setMessage(`${asset.label}: ${label}. Connectivity updated.`);
      } else setMessage(result.error);
    });
  }

  function restoreSession(action: 'undo' | 'reset') {
    updateSession(() => {
      const result = action === 'undo' ? session.undo() : session.reset();
      if (result.ok) { setSnapshot(session.snapshot()); setMessage(action === 'undo' ? 'Previous accepted states restored. Connectivity updated.' : 'Starting configuration restored.'); }
      else setMessage(result.error);
    });
  }

  function loadScenario(input: unknown) {
    updateSession(() => {
      const result = session.loadScenario(input);
      if (result.ok) {
        const next = session.snapshot(); setSnapshot(next);
        setSelectedId(next.model.assets.find(item => item.positions.length || getRemovableMechanism(item))?.id ?? next.model.assets[0].id);
        setTraceKey(null); setMessage(next.mode === 'view-only' ? 'Historical scenario opened in view-only mode.' : 'Scenario opened. Connectivity restored.');
        inspector.current?.scrollTo({ top: 0 });
      } else setMessage(result.error);
    });
  }

  return <div className="app">
    <header className="app-header"><h1>HV Network</h1><span role="status" aria-live="polite">{busy ? 'Updating network…' : 'Local simulation'}</span></header>
    <div className="workspace" inert={busy} aria-busy={busy}>
      <aside className="network-rail" aria-label="Network model">
        <h2>Network model</h2>
        <p className="model-name">{snapshot.model.name}<br /><span className="version">{snapshot.model.version}</span></p>
        <p className="model-note">{snapshot.model.synthetic ? <>Demonstration model.<br /> Not the site network.</> : <>Site model under construction.<br /> Not owner accepted.</>}</p>
        {snapshot.mode === 'view-only' && <p className="model-note">View only: {snapshot.model.version}<br />Current: {snapshot.currentModel.version}</p>}
        <label className="model-picker">Model<select aria-label="Model" value={snapshot.currentModel.id} onChange={event => selectModel(event.target.value)}>{models.map(model => <option key={model.id} value={model.id}>{model.name}</option>)}</select></label>
        <ScenarioControls snapshot={snapshot} onSave={() => session.saveScenario()} onLoad={loadScenario} onError={setMessage} onReturn={() => selectModel(snapshot.currentModel.id)} />
        <nav className="asset-list" aria-label="Assets">{snapshot.model.assets.map(item => <button key={item.id} className={selectedId === item.id ? 'asset-row selected' : 'asset-row'} aria-label={`Select ${item.label}`} aria-pressed={selectedId === item.id} onClick={() => selectAsset(item.id)}>
          <svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={item.kind} open={contactPosition(snapshot.devices[item.id]) === 'open'} unknown={(item.positions.length > 0 || !!getRemovableMechanism(item)) && contactPosition(snapshot.devices[item.id]) === null} /></svg><span>{item.label}{getRemovableMechanism(item) && <small style={{ display: 'block' }}>{describeDeviceState(snapshot.devices[item.id])}</small>}</span>
        </button>)}</nav>
      </aside>

      <NetworkDiagram key={`${snapshot.model.id}:${snapshot.model.version}`} snapshot={snapshot} selectedId={selectedId} tracedPath={tracedPath} presentation={snapshot.model.presentation ?? fallbackPresentation(snapshot.model)} onSelectAsset={selectAsset} />

      <aside ref={inspector} className="inspector" aria-label="Asset details">
        <h2>Asset details</h2>
        <div className="asset-heading"><svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={asset.kind} open={contactPosition(snapshot.devices[asset.id]) === 'open'} unknown={(asset.positions.length > 0 || !!mechanism) && contactPosition(snapshot.devices[asset.id]) === null} /></svg><div><h3>{asset.label}</h3><p>{kindLabels[asset.kind]}</p></div></div>
        <dl className="identity-rows"><div><dt>Identity</dt><dd>{asset.id === 'cb-01' ? 'CB-01' : asset.id}</dd></div><div><dt>State</dt><dd>{mechanism ? describeDeviceState(snapshot.devices[asset.id]) : asset.positions.length && snapshot.devices[asset.id] === null ? 'Unconfirmed' : currentPosition?.label ?? 'No position modelled'}</dd></div><div><dt>Source connectivity</dt><dd>{connectivity.sourceStatus === 'unconfirmed' ? 'Unconfirmed' : connectivity.sourceStatus === 'connected' ? 'Connected' : 'No source connection'}</dd></div></dl>
        {asset.aliases?.length ? <p>Drawing aliases: {asset.aliases.join('; ')}</p> : null}
        {asset.positions.length > 0 && <section className="switch-controls" aria-label="Switching controls"><h3>Set intended state</h3><div className="state-buttons">{asset.positions.map(position => { const option = switching.positions.find(option => option.id === position.id)!; return <button key={position.id} title={option.reason} onClick={() => changePosition(position.id)} disabled={currentPosition?.id === position.id || !option.allowed}>{position.id === 'closed' ? 'Close' : position.label}</button>; })}</div><p>Changing this device updates the represented connections.</p><InterlockDetails status={switching} /></section>}
        {mechanism && <section className="switch-controls" aria-label={`Independent ${mechanism.kind} controls`}><h3>Contact and racking</h3><p>{describeDeviceState(snapshot.devices[asset.id])}</p><div className="state-buttons">{switching.actions?.map(action => <button key={`${action.command.kind}:${action.command.value}`} title={action.reason} disabled={!action.allowed} onClick={() => changePosition(action.command)}>{action.label}</button>)}</div><InterlockDetails status={switching} /></section>}
        {snapshot.model.sources.filter(source => source.assetId === asset.id).map(source => <section className="switch-controls" key={source.id} aria-label={`${source.label} availability`}><h3>Source availability</h3><p>{snapshot.sources[source.id] === null ? 'Unconfirmed' : snapshot.sources[source.id] ? 'Enabled' : 'Disabled'}</p><div className="state-buttons"><button aria-label={`Enable ${source.label}`} disabled={snapshot.mode === 'view-only' || snapshot.sources[source.id] === true} onClick={() => changeSource(source.id, true)}>Enable</button><button aria-label={`Disable ${source.label}`} disabled={snapshot.mode === 'view-only' || snapshot.sources[source.id] === false} onClick={() => changeSource(source.id, false)}>Disable</button></div></section>)}
        {snapshot.model.earths?.length ? <EarthDetails model={snapshot.model} connectivity={snapshot.connectivity[asset.id]} /> : null}
        <RelationshipDetails asset={asset} positionId={snapshot.devices[asset.id]} model={snapshot.model} />
        <UncertaintyDetails model={snapshot.model} connectivity={connectivity} />
        <section className="source-paths" aria-label="Source paths"><h3>Source paths</h3>{paths.length ? <><p>One example per source and terminal. Highlight a path to follow its equipment.</p>{paths.map(path => <button key={`${path.sourceId}:${path.terminalId}`} aria-pressed={tracedPath === path} onClick={() => setTraceKey(`${path.sourceId}:${path.terminalId}`)}><strong>{snapshot.model.sources.find(source => source.id === path.sourceId)?.label} → {path.terminalId}</strong><span>{path.assetIds.map(id => labels.get(id)).join(' → ')}</span></button>)}</> : <p>{connectivity.sourceStatus === 'unconfirmed' ? 'No established source path; unresolved information remains.' : 'No path to an enabled modelled source.'}</p>}</section>
        {snapshot.model.evidence?.length || snapshot.model.reviews?.length || !snapshot.model.synthetic ? <EvidenceDetails key={`${snapshot.model.id}:${asset.id}`} model={snapshot.model} asset={asset} connectivity={connectivity} /> : null}
        {snapshot.impact.length > 0 && <section className="impact-list" aria-label="Last action impacts"><h3>Last action impacts</h3><ul>{snapshot.impact.map(item => <li key={item.assetId}><button onClick={() => selectAsset(item.assetId)}>{labels.get(item.assetId)}</button><span>{item.connectivityChanged ? 'Connectivity classification changed' : item.after.sourceIds.length ? 'Supply route changed; source connection retained' : 'Connection explanation changed'}</span></li>)}</ul></section>}
        <SessionHistory snapshot={snapshot} onUndo={() => restoreSession('undo')} onReset={() => restoreSession('reset')} />
        <p className="action-message" role="status" aria-live="polite">{message}</p>
      </aside>
    </div>
    <footer>Connectivity model only · No electrical calculations</footer>
  </div>;
}
