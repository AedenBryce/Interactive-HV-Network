import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { Point } from './diagram-geometry';

const pairsOf = (position: Asset['positions'][number]) => [...new Map([...position.pairs, ...(position.sourcePairs ?? []), ...(position.earthPairs ?? [])].map(pair => [JSON.stringify([...pair].sort()), pair])).values()];

// Roles come from the recorded contact matrices, including which main side is
// earthed. Terminal order alone does not establish the earthed side.
export function threePositionContacts(asset: Asset) {
  if (asset.kind !== 'disconnector' || asset.terminals.length !== 3) return undefined;
  const service = asset.positions.find(position => position.id === 'service');
  const earthed = asset.positions.find(position => position.id === 'earthed');
  const isolated = asset.positions.find(position => position.id === 'isolated');
  if (!service || !earthed || !isolated || pairsOf(isolated).length) return undefined;
  const main = pairsOf(service); const earth = pairsOf(earthed);
  if (main.length !== 1 || earth.length !== 1) return undefined;
  const ground = asset.terminals.find(terminal => !main[0].includes(terminal));
  const common = earth[0].find(terminal => main[0].includes(terminal));
  return ground && common && earth[0].includes(ground) ? { main: main[0], ground, common } : undefined;
}

export function threePositionGeometry(asset: Asset, layout: DiagramLayout) {
  const contacts = threePositionContacts(asset);
  if (!contacts) return undefined;
  const [a, b] = contacts.main; const pa = layout.terminals[a]; const pb = layout.terminals[b];
  const upper = pa[1] === pb[1] ? pa[0] < pb[0] ? a : b : pa[1] < pb[1] ? a : b;
  const tapY = contacts.common === upper ? -40 : 40;
  const ports: Point[] = asset.terminals.map(terminal => terminal === contacts.ground ? [50, tapY + 79] : terminal === upper ? [0, -40] : [0, 40]);
  return { ports, tapY };
}

export function ThreePositionSymbol({ state, tapY }: { state: string | null | undefined; tapY: number }) {
  const known = state === 'service' || state === 'isolated' || state === 'earthed';
  const mainClosed = state === 'service'; const earthClosed = state === 'earthed';
  const hinge = tapY + 28;
  return <g className="three-position-symbol" data-main-contact={known ? mainClosed ? 'closed' : 'open' : 'unconfirmed'} data-earth-contact={known ? earthClosed ? 'closed' : 'open' : 'unconfirmed'} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <title>Combined three-position switch: Service closes the main contact; Isolated opens both; Earthed closes only the recorded earth contact.</title>
    <path d={`M0-40 V-12 M0 12 V40 M0 ${tapY} H50 V${hinge} M50 ${hinge + 24} V${hinge + 37}`} />
    <circle cy="12" r="2.5" /><circle cx="50" cy={hinge} r="2.5" />
    {known ? <><path className="selector-main-blade" d={mainClosed ? 'M0 12 V-12' : 'M0 12 L-18-8'} /><path className="selector-earth-blade" d={earthClosed ? `M50 ${hinge} V${hinge + 24}` : `M50 ${hinge} L68 ${hinge + 20}`} /></> : <><text x="-20" y="7" stroke="none" fill="currentColor">?</text><text x="61" y={hinge + 20} stroke="none" fill="currentColor">?</text></>}
    <path d={`M30 ${hinge + 37} H70 M37 ${hinge + 44} H63 M45 ${hinge + 51} H55`} />
  </g>;
}
