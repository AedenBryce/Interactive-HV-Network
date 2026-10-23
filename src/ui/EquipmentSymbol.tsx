import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { contactPosition, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import { equipmentPorts, orthogonalPoints } from './diagram-geometry';
import type { Point } from './diagram-geometry';
import { Symbol } from './Symbol';
import { isDrive, isFuse, isMotor } from './equipment-appearance';

export function EquipmentSymbol({ asset, state, layout }: { asset: Asset; state: DeviceState | undefined; layout: DiagramLayout }) {
  const [cx, cy] = layout.assets[asset.id];
  const { rotation, ports } = equipmentPorts(asset, layout);
  const point = (terminal: string): Point => [layout.terminals[terminal][0] - cx, layout.terminals[terminal][1] - cy];
  const mechanism = getRemovableMechanism(asset);
  const open = ['open', 'isolated', 'earthed'].includes(String(contactPosition(state))) || isIndependentState(state) && state.racking === 'out';
  const unknown = (asset.positions.length > 0 || !!mechanism) && contactPosition(state) === null;
  const position = asset.positions.find(position => position.id === state);
  const earthTerminal = asset.terminals.length === 3 && asset.kind === 'disconnector' ? asset.terminals[2] : undefined;
  const earthContacts = [...new Map([...(position?.pairs ?? []), ...(position?.earthPairs ?? []), ...(position?.sourcePairs ?? [])].filter(pair => earthTerminal && pair.includes(earthTerminal)).map(pair => [JSON.stringify(pair), pair])).values()];
  return <g className="equipment-symbol" data-equipment-kind={asset.kind}>
    <title>{asset.label}. {asset.kind === 'transformer' ? 'Transformer symbol; winding transfer and earth relationships are listed in Asset details.' : 'State shown by the device symbol; action prerequisites are listed in Asset details.'}</title>
    {asset.terminals.slice(0, asset.kind === 'bus' ? 0 : ports.length).map((terminal, index) => <polyline key={terminal} data-terminal={terminal} points={orthogonalPoints([point(terminal), ports[index]]).map(p => p.join(',')).join(' ')} className="equipment-lead" />)}
    {isMotor(asset) ? <g className="motor-symbol"><circle r="30" /><text textAnchor="middle" y="10">M</text></g>
      : isDrive(asset) ? <g className="drive-symbol"><rect x="-34" y="-40" width="68" height="80" rx="2" /><path d="M-34-13 H34 M-34 13 H34 M-15-26 Q-7-38 0-26 T15-26 M-15-4 H15 M-15 4 H15 M-15 27 Q-7 15 0 27 T15 27" /><text x="0" y="61" textAnchor="middle">VSD</text></g>
      : isFuse(asset) ? <g className="fuse-symbol"><path d="M0-30 V30" /><rect x="-9" y="-20" width="18" height="40" /></g>
      : <g transform={`rotate(${asset.kind === 'earth-switch' ? 0 : asset.kind === 'bus' ? layout.rotations?.[asset.id] ?? 0 : rotation})`}><Symbol kind={asset.kind} open={open} unknown={unknown} rotation={rotation} windings={asset.terminals.length} /></g>}
    {earthTerminal && <>
      {earthContacts.map(([a, b]) => <polyline key={`${a}:${b}`} points={orthogonalPoints([point(a), point(b)]).map(p => p.join(',')).join(' ')} className="equipment-lead" />)}
      <g transform={`translate(${point(earthTerminal).join(',')})`} className="equipment-earth"><path d="M0 0 V8 M-15 8 H15 M-10 15 H10 M-4 22 H4" /></g>
    </>}
    {isIndependentState(state) && state.racking === 'out' && <g className="rack-out-marks" transform={`rotate(${rotation})`}><path d="M-29-8 V8 M29-8 V8" /></g>}
  </g>;
}
