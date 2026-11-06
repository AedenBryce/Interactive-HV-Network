import type { NetworkModel } from '../session/model';
import type { AssetConnectivity } from '../session/session';
import './evidence.css';

export function UncertaintyDetails({ model, connectivity }: { model: NetworkModel; connectivity: AssetConnectivity }) {
  if (!connectivity.hasSourceUncertainty && !connectivity.hasEarthUncertainty) return null;
  const assetLabels = new Map(model.assets.map(asset => [asset.id, asset.label]));
  const coverageIds = [...new Set([...connectivity.sourceBoundaryIds, ...connectivity.earthBoundaryIds])];
  return <section className="uncertainty-details" aria-label="Unconfirmed connectivity">
    <h3>Unconfirmed information</h3>
    {connectivity.hasSourceUncertainty && <p>Source routes or availability depend on unresolved model information. {connectivity.sourceStatus === 'connected' ? 'A known model supply path remains available.' : 'Source connectivity is unconfirmed.'}</p>}
    {connectivity.hasEarthUncertainty && <p>Earth routes depend on unresolved model information. {connectivity.earthStatus === 'connected' ? 'A known model earth path remains available.' : 'Earth connectivity is unconfirmed.'}</p>}
    {connectivity.possiblePaths.length > 0 && <details><summary>Candidate source paths ({connectivity.possiblePaths.length})</summary>{connectivity.possiblePaths.map(path => <p key={`${path.sourceId}:${path.terminalId}`}><strong>Unconfirmed candidate path:</strong> {path.assetIds.map(id => assetLabels.get(id)).join(' → ')}</p>)}</details>}
    {coverageIds.length > 0 && <details><summary>Unconfirmed coverage boundaries ({coverageIds.length})</summary>{coverageIds.map(id => <p key={id}><strong>Unconfirmed model coverage:</strong> {model.boundaries?.find(boundary => boundary.id === id)?.label}</p>)}</details>}
    <p>Candidate paths depend on unresolved model information. Review the linked evidence and questions.</p>
  </section>;
}
