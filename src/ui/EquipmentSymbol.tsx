import {turnPoint,turnBox} from './object-rotation';
import { memo } from 'react';
import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import { contactPosition, getRemovableMechanism, isIndependentState } from '../session/mechanisms';
import type { DeviceState } from '../session/mechanisms';
import { equipmentPorts, orthogonalPoints } from './diagram-geometry';
import type { Point } from './diagram-geometry';
import { Symbol } from './Symbol';
import { isDrive, isFuse, isMotor } from './equipment-appearance';
import { ThreePositionSymbol, threePositionGeometry, threePositionContacts } from './ThreePositionSymbol';
import { selectorEarthTag } from './switch-display-tags';
import type { BusBarExtent } from './bus-tie-symbol';
import { earthCaptionLayout } from './equipment-captions';
import { transformerWindings } from './transformer-windings';

export const EquipmentSymbol = memo(function EquipmentSymbol({ asset, state, earthState, earthLabel, earthLabelPosition, hideEarthLabel=false, busTie = false, busBar, layout, inline = false, overview = false, symbolScale = 1, diagramScale = 1 }: { asset: Asset; state: DeviceState | undefined; earthState?: DeviceState; earthLabel?: string; earthLabelPosition?:Point; hideEarthLabel?:boolean; busTie?: boolean; busBar?: BusBarExtent; layout: DiagramLayout; inline?: boolean; overview?: boolean; symbolScale?: number; diagramScale?: number }) {
  const [cx, cy] = layout.assets[asset.id];
  const angle=layout.objectRotations?.[asset.id]??0;
  if(angle){
    const terminals={...layout.terminals};
    for(const id of asset.terminals){const p=terminals[id],q=turnPoint([p[0]-cx,p[1]-cy],-angle);terminals[id]=[cx+q[0],cy+q[1]];}
    layout={...layout,terminals,rotations:{...layout.rotations,[asset.id]:((layout.rotations?.[asset.id]??0)-angle+360)%360}};
  }
  const { rotation, ports } = equipmentPorts(asset, layout);
  const scale = asset.kind === 'bus' || inline ? 1 : symbolScale;
  const point = (terminal: string): Point => [layout.terminals[terminal][0] - cx, layout.terminals[terminal][1] - cy];
  const mechanism = getRemovableMechanism(asset);
  const open = ['open', 'isolated', 'earthed'].includes(String(contactPosition(state))) || isIndependentState(state) && state.racking === 'out';
  const unknown = (asset.positions.length > 0 || !!mechanism) && contactPosition(state) === null;
  const selector = threePositionGeometry(asset, layout);
  const earthCaption=selector || asset.earthAssembly && earthLabel ? earthCaptionLayout(selector?selectorEarthTag(asset):earthLabel!,scale) : undefined;
  const earthBox=earthCaption?turnBox(earthCaption,angle):undefined;
  const earthOffset=earthLabelPosition&&earthBox?turnPoint([earthLabelPosition[0]-earthBox.x,earthLabelPosition[1]-earthBox.y],-angle):[0,0];
  // Ground destinations are represented by the earth glyph itself. Their
  // layout anchors are not additional external conductor endpoints.
  const groundTerminal = threePositionContacts(asset)?.ground ?? (asset.kind === 'earth-switch' ? asset.terminals[1] : undefined);
  const busSpan = asset.kind === 'bus' ? layout.busSpans?.[asset.id] ?? Math.max(60, ...asset.terminals.map(terminal => Math.abs(layout.terminals[terminal][0] - cx) * 2 + 60)) : undefined;
  const busEndCapSize = Math.max(12, Math.min((busSpan ?? 60) / 4, 4 / Math.max(.001, diagramScale)));
  return <g className="equipment-symbol" data-equipment-kind={asset.kind} data-object-rotation={angle} transform={angle ? `rotate(${angle})` : undefined}>
    <title>{`${asset.label}. ${asset.kind === 'transformer' ? 'Transformer symbol; winding transfer and earth relationships are listed in Asset details.' : 'State shown by the device symbol; action prerequisites are listed in Asset details.'}`}</title>
    {asset.terminals.slice(0, asset.kind === 'bus' ? 0 : ports.length).map((terminal, index) => terminal === groundTerminal ? null : <polyline key={terminal} data-terminal={terminal} points={orthogonalPoints([point(terminal), [ports[index][0] * scale, ports[index][1] * scale]]).map(p => p.join(',')).join(' ')} className="equipment-lead" />)}
    <g className="equipment-glyph" transform={`scale(${scale})`}>
    {inline ? <circle className="junction-symbol" r="12" fill="currentColor" /> : selector ? <ThreePositionSymbol state={typeof state === 'string' ? state : null} tapY={selector.tapY} />
      : asset.earthAssembly ? <ThreePositionSymbol breaker={asset.kind==='breaker'} extent={30} tapY={layout.terminals[asset.earthAssembly.commonTerminal][1]<cy?-40:40} state={earthState==='closed' ? contactPosition(state)==='closed'?null:'earthed' : earthState==='open' ? contactPosition(state)==='closed'?'service':contactPosition(state)==='open'?'isolated':null : null} />
      : overview && asset.kind === 'bus' ? <circle className="overview-bus-mark" r="20" />
      : asset.kind==='bus' && busBar ? <g className="tie-section-bus" fill="none" stroke="currentColor" strokeWidth="5"><path d={`M${busBar.left} 0 H${busBar.right}`} /><path className="bus-end-caps" d={`${busBar.leftCap?`M${busBar.left} ${-busEndCapSize} V${busEndCapSize}`:''} ${busBar.rightCap?`M${busBar.right} ${-busEndCapSize} V${busEndCapSize}`:''}`} /></g>
      : isMotor(asset) ? <g className="motor-symbol"><circle r="30" /><text textAnchor="middle" y="10">M</text></g>
      : isDrive(asset) ? <g className="drive-symbol"><rect x="-34" y="-40" width="68" height="80" rx="2" /><path d="M-34-13 H34 M-34 13 H34 M-15-26 Q-7-38 0-26 T15-26 M-15-4 H15 M-15 4 H15 M-15 27 Q-7 15 0 27 T15 27" /></g>
      : isFuse(asset) ? <g className="fuse-symbol"><path d="M0-30 V30" /><rect x="-9" y="-20" width="18" height="40" /></g>
      : <g transform={`rotate(${asset.kind === 'earth-switch' ? 0 : asset.kind === 'bus' ? layout.rotations?.[asset.id] ?? 0 : rotation})`}><Symbol kind={asset.kind} open={open} unknown={unknown} rotation={rotation} windings={asset.terminals.length} primaryWindings={asset.kind==='transformer'?transformerWindings(asset).primaries.length:undefined} busSpan={busSpan} busEndCapSize={busEndCapSize} removable={!!mechanism&&!busTie} isolatorDuty={asset.isolatorDuty} /></g>}
    {isIndependentState(state) && state.racking === 'out' && !busTie && <g className="rack-out-marks" transform={`rotate(${rotation})`}><path d="M-29-8 V8 M29-8 L29 8" /></g>}
    {earthCaption && !hideEarthLabel && <g className="embedded-equipment-label" data-layout-label-id={asset.id+'#earth'} transform={`translate(${earthOffset[0]/scale},${earthOffset[1]/scale})`}><rect x={earthCaption.x/scale} y={earthCaption.y/scale} width={earthCaption.width/scale} height={earthCaption.height/scale} fill="transparent" stroke="none" pointerEvents="all" /><text className="combined-earth-tag" x="50" y="94" textAnchor="middle" fill="currentColor" stroke="none" style={{fontSize:9}}>{earthCaption.lines.map((line,i)=><tspan key={i} x="50" dy={i?11:0}>{line}</tspan>)}</text></g>}
    </g>
  </g>;
});

