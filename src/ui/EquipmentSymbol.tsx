import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { contactPosition, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import { equipmentRotation, orthogonalPoints } from './diagram-geometry';
import type { Point } from './diagram-geometry';
import { Symbol } from './Symbol';

export function EquipmentSymbol({ asset, state, layout }: { asset: Asset; state: DeviceState | undefined; layout: DiagramLayout }) {
  const [cx, cy] = layout.assets[asset.id];
  const rotation = equipmentRotation(asset, layout.terminals);
  const rotate = ([x, y]: Point): Point => rotation === 90 ? [-y, x] : rotation === -90 ? [y, -x] : rotation === 180 ? [-x, -y] : [x, y];
  const point = (terminal: string): Point => [layout.terminals[terminal][0] - cx, layout.terminals[terminal][1] - cy];
  const mechanism = getRemovableMechanism(asset);
  const open = ['open', 'isolated', 'earthed'].includes(String(contactPosition(state))) || isIndependentState(state) && state.racking === 'out';
  const unknown = (asset.positions.length > 0 || !!mechanism) && contactPosition(state) === null;
  const ports: Point[] = asset.kind === 'transformer'
    ? asset.terminals.map((_, index) => rotate(index === 0 ? [-33, 0] : [33, (index - 1 - (asset.terminals.length - 2) / 2) * 24]))
    : asset.kind === 'interface' ? asset.terminals.map((terminal, index) => {
      if (asset.terminals.length === 1) return point(terminal);
      const y = index === 0 || asset.terminals.length === 2 ? 0 : (index - 1) / (asset.terminals.length - 2) * 24 - 12;
      return rotate([index === 0 ? -18 : Math.sqrt(18 ** 2 - y ** 2), y]);
    })
    : asset.kind === 'earth-switch' ? [rotate([-30, 0]), rotate([30, 0])]
    : asset.kind === 'source' && asset.terminals.length === 1 ? [[30, 0]]
    : asset.terminals.slice(0, 2).map((_, index) => rotate([index ? 30 : -30, 0]));
  const position = asset.positions.find(position => position.id === state);
  const earthTerminal = asset.terminals.length === 3 && asset.kind === 'disconnector' ? asset.terminals[2] : undefined;
  const earthContacts = [...new Map([...(position?.pairs ?? []), ...(position?.earthPairs ?? []), ...(position?.sourcePairs ?? [])].filter(pair => earthTerminal && pair.includes(earthTerminal)).map(pair => [JSON.stringify(pair), pair])).values()];
  return <g className="equipment-symbol" data-equipment-kind={asset.kind}>
    <title>{asset.label}. {asset.kind === 'transformer' ? 'Transformer symbol; winding transfer and earth relationships are listed in Asset details.' : 'State shown by the device symbol; action prerequisites are listed in Asset details.'}</title>
    {asset.terminals.slice(0, asset.kind === 'bus' ? 0 : ports.length).map((terminal, index) => <polyline key={terminal} points={orthogonalPoints([point(terminal), ports[index]]).map(p => p.join(',')).join(' ')} className="equipment-lead" />)}
    <g transform={`rotate(${asset.kind === 'earth-switch' ? rotation - 90 : asset.kind === 'bus' ? layout.rotations?.[asset.id] ?? 0 : rotation})`}><Symbol kind={asset.kind} open={open} unknown={unknown} rotation={rotation} windings={asset.terminals.length} /></g>
    {earthTerminal && <>
      {earthContacts.map(([a, b]) => <polyline key={`${a}:${b}`} points={orthogonalPoints([point(a), point(b)]).map(p => p.join(',')).join(' ')} className="equipment-lead" />)}
      <g transform={`translate(${point(earthTerminal).join(',')})`} className="equipment-earth"><path d="M0 0 V8 M-15 8 H15 M-10 15 H10 M-4 22 H4" /></g>
    </>}
    {isIndependentState(state) && state.racking === 'out' && <g className="rack-out-marks" transform={`rotate(${rotation})`}><path d="M-29-8 V8 M29-8 V8" /></g>}
  </g>;
}
