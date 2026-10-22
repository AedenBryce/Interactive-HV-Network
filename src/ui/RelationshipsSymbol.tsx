import type { Asset } from '../session/model';
import type { DiagramLayout } from './diagram';

// A diagram of declared relationships in the selected position, not a connectivity evaluator.
export function RelationshipsSymbol({ asset, positionId, layout }: { asset: Asset; positionId: string | null | undefined; layout: DiagramLayout }) {
  const [cx, cy] = layout.assets[asset.id];
  const position = asset.positions.find(position => position.id === positionId);
  const common = [...asset.conductivePairs, ...(position?.pairs ?? [])];
  const source = [...common, ...(asset.sourcePairs ?? []), ...(position?.sourcePairs ?? [])];
  const earth = [...common, ...(asset.earthPairs ?? []), ...(position?.earthPairs ?? [])];
  const point = (terminal: string) => { const [x, y] = layout.terminals[terminal]; return { x: x - cx, y: y - cy }; };
  return <g className="explicit-relationships">
    {source.map(([a, b], index) => <line key={`source:${index}`} x1={point(a).x} y1={point(a).y} x2={point(b).x} y2={point(b).y} className="relationship-source"><title>Declared bidirectional source relationship: {a} ↔ {b}</title></line>)}
    {earth.map(([a, b], index) => <line key={`earth:${index}`} x1={point(a).x} y1={point(a).y + 5} x2={point(b).x} y2={point(b).y + 5} className="relationship-earth"><title>Declared earth relationship: {a} ↔ {b}</title></line>)}
    {asset.terminals.map(terminal => <circle key={terminal} cx={point(terminal).x} cy={point(terminal).y} r="4" className="relationship-terminal"><title>{terminal}</title></circle>)}
    {asset.positions.length > 0 && <text x="0" y="-62" textAnchor="middle" className="position-label">{positionId === null ? 'Unconfirmed position' : position?.label}</text>}
    {asset.kind === 'transformer' && <text x="0" y="-62" textAnchor="middle" className="position-label">Explicit winding relationships</text>}
  </g>;
}
