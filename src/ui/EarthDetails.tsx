import type { NetworkModel } from '../session/model';
import type { EarthConnectivity } from '../session/earth';
import './earth.css';

export function EarthDetails({ model, connectivity }: { model: NetworkModel; connectivity: EarthConnectivity }) {
  const earthLabels = connectivity.earthIds.map(id => model.earths?.find(earth => earth.id === id)?.label ?? id);
  const conflictSources = connectivity.conflictSourceIds.map(id => model.sources.find(source => source.id === id)?.label ?? id);
  return <section className="earth-details" aria-label="Earth connectivity">
    <h3>Earth connectivity</h3>
    <p>{earthLabels.length ? `A terminal is connected to ${earthLabels.join(', ')}.` : 'No modelled earth connection.'}</p>
    <dl className="terminal-earths">{Object.entries(connectivity.terminalEarths).map(([terminal, earths]) => <div key={terminal}>
      <dt>{terminal}</dt><dd>{earths.length ? earths.map(id => model.earths?.find(earth => earth.id === id)?.label ?? id).join(', ') : 'No earth connection'}</dd>
    </div>)}</dl>
    {conflictSources.length > 0 && <div className="earth-conflict" role="status">
      <h3>Source-to-earth conflict</h3>
      <p>An enabled source is connected to earth: {conflictSources.join(', ')}.</p>
      <p>This is a modelled connectivity conflict. Switching restrictions come from the represented interlocks.</p>
    </div>}
  </section>;
}
