import { useCallback, useRef, useState } from 'react';
import { SimulationSession } from '../session/session';
import type { Asset } from '../session/model';
import { Symbol } from './Symbol';
import { NetworkDiagram } from './NetworkDiagram';
import { defaultModel, modelGroups, models } from './model-catalog';
import { fallbackPresentation } from '../session/presentation';
import { EarthDetails } from './EarthDetails';
import { InterlockDetails } from './InterlockDetails';
import { EvidenceDetails } from './EvidenceDetails';
import { UncertaintyDetails } from './UncertaintyDetails';
import { SessionHistory } from './SessionHistory';
import { RelationshipDetails } from './RelationshipDetails';
import { ScenarioControls } from './ScenarioControls';
import { contactPosition, describeDeviceState, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import type { IndependentCommand } from '../session/mechanisms';
import { ModelReviewStatus } from './ModelReviewStatus';
import { currentAssetLabel } from './review-updates';
import { AssetActions } from './AssetActions';
import { switchActions } from './combined-switch-actions';
import { healthyFuseState, isFuse, isMotorJunction } from './equipment-appearance';
import { isObsoleteReference } from './obsolete-references';
import { transformerWindings } from './transformer-windings';
import { SwitchingProgramCoordinator } from '../program/switching-program-coordinator';
import type { SwitchingProgramStep, SwitchingProgramType } from '../program/switching-program-coordinator';
import { SwitchingProgramControls } from './SwitchingProgramControls';
import type { SessionAction } from '../session/session';
import { describeApparatusAction, describeSwitchingProgramStep } from '../session/action-description';
import masterSwitchingProgramTemplate from '../../100-TE-DC-0022_0 High Voltage Switching Program.docm?url';
import { getAssetProgramMetadata } from '../program/asset-program-metadata';
import { createSwitchingProgramDocument } from '../program/switching-program-document';
import { docmBlob } from '../program/docm-template-adapter';

const kindLabels: Record<Asset['kind'], string> = { source: 'Electrical source', breaker: 'Circuit breaker', contactor: 'Contactor', disconnector: 'Disconnector', transformer: 'Transformer', bus: 'Bus', 'earth-switch': 'Earth switch', interface: 'Network interface' };
const initialSelection = (model: typeof defaultModel) => model.assets.find(item => item.id === 'sw411:in-03:cb')?.id
  ?? model.assets.find(item => item.id === 'sw411:bus-a')?.id
  ?? model.assets.find(item => item.positions.length || getRemovableMechanism(item))?.id
  ?? model.assets[0].id;

export function App() {
  const [session] = useState(() => new SimulationSession(defaultModel));
  const [programCoordinator] = useState(() => new SwitchingProgramCoordinator(session));
  const [program, setProgram] = useState(() => programCoordinator.snapshot());
  const [programBlockers, setProgramBlockers] = useState<string[]>([]);
  const [programDeveloping, setProgramDeveloping] = useState(false);
  const [snapshot, setSnapshot] = useState(() => session.snapshot());
  const [selectedId, setSelectedId] = useState(() => initialSelection(defaultModel));
  const [message, setMessage] = useState('');
  const [traceKey, setTraceKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [detailsCollapsed, setDetailsCollapsed] = useState(true);
  const [railCollapsed, setRailCollapsed] = useState(true);
  const [popup, setPopup] = useState<{ id: string; x: number; y: number; roomLabel?: string } | null>(null);
  const popupOrigin = useRef<Element | null>(null);
  const closeActions = useCallback(() => {
    setPopup(null);
    const target = popupOrigin.current?.isConnected ? popupOrigin.current : document.querySelector('.diagram-asset[aria-pressed="true"]') ?? document.querySelector('.network-diagram');
    if (target instanceof SVGElement || target instanceof HTMLElement) target.focus();
  }, []);
  const pending = useRef(false);
  const inspector = useRef<HTMLElement>(null);
  const asset = snapshot.model.assets.find(asset => asset.id === selectedId)!;
  const mechanism = getRemovableMechanism(asset);
  const selectedActions = switchActions(snapshot, asset);
  const connectivity = snapshot.connectivity[asset.id];
  const switching = snapshot.switching[asset.id];
  const startingState = snapshot.model.starting.devices[asset.id];
  const stateLabel = (state: typeof startingState) => isFuse(asset) ? healthyFuseState : mechanism ? describeDeviceState(state) : asset.positions.find(position => position.id === state)?.label ?? 'Unconfirmed';
  const hasState = !!(asset.positions.length || mechanism || isFuse(asset));
  const deviceState = snapshot.devices[asset.id];
  const changedState = hasState && (isIndependentState(deviceState) && isIndependentState(startingState)
    ? deviceState.contact !== startingState.contact || deviceState.racking !== startingState.racking
    : deviceState !== startingState);
  const differentModel = !snapshot.model.synthetic && (snapshot.model.id !== defaultModel.id || snapshot.model.version !== defaultModel.version);
  const paths = snapshot.connectivity[asset.id].paths;
  const tracedPath = paths.find(path => `${path.sourceId}:${path.terminalId}` === traceKey);
  const labels = new Map(snapshot.model.assets.map(item => [item.id, item.label]));

  function selectAsset(id: string, element?: Element, roomLabel?: string, openActions = true) {
    setSelectedId(id); setTraceKey(null); inspector.current?.scrollTo({ top: 0 });
    popupOrigin.current = element ?? null;
    if (!openActions) { setPopup(null); return; }
    const rect = element?.getBoundingClientRect();
    const width = document.documentElement.clientWidth;
    const popupWidth = Math.min(340, width - 24);
    setPopup({ id, x: Math.max(12, Math.min(width - popupWidth - 12, rect ? rect.right + 8 : (width - popupWidth) / 2)), y: Math.max(12, Math.min(innerHeight - 430, rect?.top ?? 80)), roomLabel });
  }

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
    setPopup(null);
    updateSession(() => {
      const result = session.loadModel(models.find(model => model.id === id));
      if (result.ok) { const next = session.snapshot(); setSnapshot(next); setSelectedId(initialSelection(next.model)); setTraceKey(null); setMessage(''); inspector.current?.scrollTo({ top: 0 }); }
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

  function changeAssetPosition(id: string, position: string | IndependentCommand) {
    updateSession(() => {
      const target = snapshot.model.assets.find(item => item.id === id)!;
      const result = session.changeDevice(id, position);
      if (result.ok) {
        setProgramBlockers([]);
        setSnapshot(session.snapshot());
        setProgram(programCoordinator.snapshot());
        const label = typeof position === 'string' ? target.positions.find(p => p.id === position)?.label : snapshot.switching[id].actions?.find(action => action.command.kind === position.kind && action.command.value === position.value)?.label;
        setMessage(`${target.label}: ${label}. Connectivity updated.`);
      } else setMessage(result.error);
    });
  }

  function startProgram(type: SwitchingProgramType) {
    updateSession(() => {
      const result = programCoordinator.start(type);
      if (result.ok) { setProgramBlockers([]); setSnapshot(session.snapshot()); setProgram(programCoordinator.snapshot()); setMessage(`${type === 'isolation' ? 'Isolation' : 'Restoration'} switching program started from the current simulated state.`); }
      else setMessage(result.error);
    });
  }

  function programActionLabel(action: SessionAction) {
    if (action.kind === 'source') return `${snapshot.model.sources.find(source => source.id === action.sourceId)?.label ?? action.sourceId} source availability`;
    return describeApparatusAction(action, snapshot.model);
  }

  function programStepLabel(step: SwitchingProgramStep) {
    return describeSwitchingProgramStep(step, snapshot.model);
  }

  function undoProgramAction(action: SessionAction) {
    const description = programActionLabel(action);
    if (!window.confirm(`Remove ${description}?`)) return;
    updateSession(() => {
      const result = programCoordinator.undoLast(action.id);
      if (result.ok) { setProgramBlockers([]); setSnapshot(session.snapshot()); setProgram(programCoordinator.snapshot()); setMessage(`Removed ${description}. Simulated state restored.`); }
      else setMessage(result.error);
    });
  }

  async function developProgram() {
    if (programDeveloping) return;
    setProgramDeveloping(true);
    setProgramBlockers([]);
    try {
      const current = programCoordinator.snapshot();
      if (!current.type) throw new Error('Choose Isolation or Restoration before developing a program.');
      const response = await fetch(masterSwitchingProgramTemplate);
      if (!response.ok) throw new Error('The master switching-program template could not be loaded.');
      const templateBytes = new Uint8Array(await response.arrayBuffer());
      const result = await createSwitchingProgramDocument(templateBytes, current, snapshot.model, getAssetProgramMetadata);
      if (!result.ok) {
        setProgramBlockers(result.blockers);
        setMessage(`No Word document was created. ${result.blockers.length} asset or template value(s) need review; capture remains active.`);
        return;
      }

      if (current.active) {
        const ended = programCoordinator.endForDevelopment();
        if (!ended.ok) throw new Error(ended.error);
        setSnapshot(session.snapshot());
        setProgram(programCoordinator.snapshot());
      }

      const outputName = `Interactive-HV-${current.type}-Switching-Program.docm`;
      const url = URL.createObjectURL(docmBlob(result.bytes));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = outputName;
      anchor.click();
      URL.revokeObjectURL(url);
      setMessage(`Created ${outputName}. The simulated device state was retained.`);
    } catch (error) {
      setMessage(error instanceof Error ? `Word program could not be developed: ${error.message}` : 'Word program could not be developed.');
    } finally {
      setProgramDeveloping(false);
    }
  }

  function cancelProgram() {
    updateSession(() => {
      const result = programCoordinator.cancel();
      if (result.ok) { setProgramBlockers([]); setSnapshot(session.snapshot()); setProgram(programCoordinator.snapshot()); setMessage('Switching program cancelled. Captured steps discarded; simulated state retained.'); }
      else setMessage(result.error);
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
    setPopup(null);
    updateSession(() => {
      const result = session.loadScenario(input);
      if (result.ok) {
        const next = session.snapshot(); setSnapshot(next);
        setSelectedId(initialSelection(next.model));
        setTraceKey(null); setMessage(next.mode === 'view-only' ? 'Historical scenario opened in view-only mode.' : 'Scenario opened. Connectivity restored.');
        inspector.current?.scrollTo({ top: 0 });
      } else setMessage(result.error);
    });
  }

  return <div className="app">
    <header className="app-header"><h1>HV Network</h1><button aria-controls="network-model" aria-expanded={!railCollapsed} onClick={() => setRailCollapsed(value => !value)}>{railCollapsed ? 'Show asset list' : 'Hide asset list'}</button><span role="status" aria-live="polite">{busy ? 'Updating network…' : 'Local simulation'}</span></header>
    <SwitchingProgramControls program={program} stepLabel={programStepLabel} onStart={startProgram} onUndo={undoProgramAction} onDevelop={developProgram} developing={programDeveloping} blockers={programBlockers} onCancel={cancelProgram} />
    <div className={`workspace${detailsCollapsed ? ' details-collapsed' : ''}${railCollapsed ? ' rail-collapsed' : ''}`} inert={busy || programDeveloping} aria-busy={busy || programDeveloping}>
      <aside id="network-model" className="network-rail" aria-label="Network model" hidden={railCollapsed}>
        <h2>Network model</h2>
        <p className="model-name">{snapshot.model.name}<br /><span className="version">{snapshot.model.version}</span></p>
        <p className="model-note">{snapshot.model.synthetic ? <>Demonstration model.<br /> Not the site network.</> : differentModel ? <>Different model snapshot.<br /> Uses its recorded states and interlock reviews; not the current V1 whole network.</> : <>Current V1 whole network.<br /> Owner visual review pending.</>}</p>
        {snapshot.mode === 'view-only' && <p className="model-note">View only: {snapshot.model.version}<br />Current: {snapshot.currentModel.version}</p>}
        <label className="model-picker">Model<select aria-label="Model" disabled={snapshot.programCaptureActive} value={snapshot.currentModel.id} onChange={event => selectModel(event.target.value)}>{modelGroups.map(group => <optgroup key={group.label} label={group.label}>{group.models.map(model => <option key={model.id} value={model.id}>{model.id === defaultModel.id || model.synthetic ? model.name : `Historical · ${model.name}`}</option>)}</optgroup>)}</select></label>
        {differentModel && <button className="current-model-button" disabled={snapshot.programCaptureActive} onClick={() => selectModel(defaultModel.id)}>Open current whole network</button>}
        <ScenarioControls snapshot={snapshot} onSave={() => session.saveScenario()} onLoad={loadScenario} onError={setMessage} onReturn={() => selectModel(snapshot.currentModel.id)} />
        <nav className="asset-list" aria-label="Assets">{snapshot.model.assets.filter(item => !isObsoleteReference(snapshot.model, item) && (snapshot.model.id !== 'site-whole-network' || !isMotorJunction(item))).map(item => <button key={item.id} className={selectedId === item.id ? 'asset-row selected' : 'asset-row'} aria-label={`Select ${item.label}`} aria-pressed={selectedId === item.id} onClick={event => selectAsset(item.id, event.currentTarget)}>
          <svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={item.kind} windings={item.terminals.length} primaryWindings={item.kind === 'transformer' ? transformerWindings(item).primaries.length : undefined} open={contactPosition(snapshot.devices[item.id]) === 'open'} unknown={(item.positions.length > 0 || !!getRemovableMechanism(item)) && contactPosition(snapshot.devices[item.id]) === null} /></svg><span>{currentAssetLabel(snapshot.model, item)}{getRemovableMechanism(item) && <small style={{ display: 'block' }}>{describeDeviceState(snapshot.devices[item.id])}</small>}</span>
        </button>)}</nav>
      </aside>

      <NetworkDiagram key={`${snapshot.model.id}:${snapshot.model.version}`} snapshot={snapshot} selectedId={selectedId} tracedPath={tracedPath} presentation={snapshot.model.presentation ?? fallbackPresentation(snapshot.model)} onSelectAsset={selectAsset} />

      {popup && <AssetActions snapshot={snapshot} assetId={popup.id} anchor={popup} roomLabel={popup.roomLabel} onChange={changeAssetPosition} onSource={changeSource} onClose={closeActions} />}

      {detailsCollapsed && <div className="inspector-rail"><button aria-label="Show asset details" aria-controls="asset-details" aria-expanded={false} onClick={() => setDetailsCollapsed(false)}>‹</button></div>}
      <aside ref={inspector} id="asset-details" className="inspector" aria-label="Asset details" hidden={detailsCollapsed}>
        <div className="inspector-header"><h2>Asset details</h2><button aria-label="Minimise asset details" aria-controls="asset-details" aria-expanded={true} onClick={() => setDetailsCollapsed(true)}>›</button></div>
        <div className="asset-heading"><svg viewBox="-38 -38 76 76" aria-hidden="true"><Symbol kind={asset.kind} windings={asset.terminals.length} primaryWindings={asset.kind === 'transformer' ? transformerWindings(asset).primaries.length : undefined} open={contactPosition(snapshot.devices[asset.id]) === 'open'} unknown={(asset.positions.length > 0 || !!mechanism) && contactPosition(snapshot.devices[asset.id]) === null} /></svg><div><h3>{currentAssetLabel(snapshot.model, asset)}</h3><p>{kindLabels[asset.kind]}</p></div></div>
        <dl className="identity-rows"><div><dt>Identity</dt><dd>{asset.id === 'cb-01' ? 'CB-01' : asset.id}</dd></div><div><dt>Current state</dt><dd>{hasState ? stateLabel(snapshot.devices[asset.id]) : 'No position modelled'}</dd></div>{hasState && <div><dt>Starting state</dt><dd>{stateLabel(startingState)}</dd></div>}<div><dt>Source connectivity</dt><dd>{connectivity.sourceStatus === 'unconfirmed' ? 'Unconfirmed' : connectivity.sourceStatus === 'connected' ? 'Connected' : 'No source connection'}</dd></div></dl>
        {hasState && <p className="state-baseline-note">{changedState ? 'Changed from starting state.' : 'At starting state.'} Reset network restores the starting configuration.</p>}
        {!snapshot.model.synthetic && <ModelReviewStatus model={snapshot.model} />}
        {asset.aliases?.length ? <p>Drawing aliases: {asset.aliases.join('; ')}</p> : null}
        {!!selectedActions.length && <section className="switch-controls" aria-label="Switching controls"><h3>Change device state</h3><div className="state-buttons">{selectedActions.map(action=><button key={action.label} title={action.reason} aria-pressed={action.selected} onClick={()=>changeAssetPosition(action.assetId,action.command)} disabled={snapshot.mode==='view-only'||action.selected||!action.allowed}>{action.label}</button>)}</div><p>Changing this device updates the represented connections.</p><InterlockDetails status={switching} /></section>}
        {snapshot.model.sources.filter(source => source.assetId === asset.id).map(source => <section className="switch-controls" key={source.id} aria-label={`${source.label} availability`}><h3>Source availability</h3><p>{snapshot.sources[source.id] === null ? 'Unconfirmed' : snapshot.sources[source.id] ? 'Enabled' : 'Disabled'}</p><div className="state-buttons"><button aria-label={`Enable ${source.label}`} disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive || snapshot.sources[source.id] === true} onClick={() => changeSource(source.id, true)}>Enable</button><button aria-label={`Disable ${source.label}`} disabled={snapshot.mode === 'view-only' || snapshot.programCaptureActive || snapshot.sources[source.id] === false} onClick={() => changeSource(source.id, false)}>Disable</button></div></section>)}
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
