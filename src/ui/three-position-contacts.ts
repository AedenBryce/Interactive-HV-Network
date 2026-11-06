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
  const ports: Point[] = asset.terminals.map(terminal => terminal === contacts.ground ? [50, 66] : terminal === upper ? [0, -40] : [0, 40]);
  return { ports, tapY };
}
