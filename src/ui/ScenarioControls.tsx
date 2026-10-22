import { useRef } from 'react';
import type { SessionSnapshot } from '../session/session';
import type { ScenarioFile } from '../session/scenario';
import './scenarios.css';

type Props = { snapshot: SessionSnapshot; onSave: () => ScenarioFile; onLoad: (input: unknown) => void; onError: (message: string) => void; onReturn: () => void };

export function ScenarioControls({ snapshot, onSave, onLoad, onError, onReturn }: Props) {
  const input = useRef<HTMLInputElement>(null);
  function save() {
    const file = onSave();
    const url = URL.createObjectURL(new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${file.model.id}-${file.model.version}.scenario.json`.replace(/[^a-zA-Z0-9._-]/g, '_');
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }
  async function load(file: File | undefined) {
    if (!file) return;
    try { onLoad(JSON.parse(await file.text())); }
    catch (error) { onError(`Could not read scenario: ${error instanceof Error ? error.message : 'Invalid JSON file.'}`); }
    finally { if (input.current) input.current.value = ''; }
  }
  return <section className="scenario-controls" aria-label="Scenario files">
    <h3>Scenario files</h3>
    {snapshot.mode === 'view-only' && <div className="historical-notice" role="status"><strong>View only — model versions differ</strong><p>Viewing {snapshot.model.id} / {snapshot.model.version}.</p><p>Current model: {snapshot.currentModel.id} / {snapshot.currentModel.version}.</p><p>Inspection, navigation and tracing remain available. Electrical state changes are disabled.</p><button onClick={onReturn}>Start current model</button></div>}
    <div className="scenario-buttons"><button onClick={save}>Save scenario</button><label className="load-scenario">Open scenario<input ref={input} aria-label="Open scenario file" type="file" accept=".json,application/json" onChange={event => { void load(event.target.files?.[0]); }} /></label></div>
    <p>Scenario files include the original model, diagram and selected states.</p>
  </section>;
}
