import type { Asset } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { ReservedConductor } from './conductor-paths';
import type { BusBarExtent } from './bus-tie-symbol';
import type { Point } from './diagram-geometry';
import { equipmentPorts, orthogonalPoints } from './diagram-geometry';
import { turnPoint } from './object-rotation';
import { threePositionContacts } from './three-position-contacts';

/** Strokes already drawn by equipment symbols must not be painted a second
 * time by their incident wire routes. Keep these in the same terminal groups. */
export function conductorReservations(assets: readonly Asset[], layout: DiagramLayout, symbolScale: number, hidden: ReadonlySet<string>, inline: ReadonlySet<string>, bars: ReadonlyMap<string, BusBarExtent>, includeLeads = true): ReservedConductor[] {
  const result: ReservedConductor[] = [];
  for(const asset of assets){
    if(hidden.has(asset.id))continue;
    const [cx,cy]=layout.assets[asset.id],angle=layout.objectRotations?.[asset.id]??0;
    if(asset.kind==='bus'){
      const bar=bars.get(asset.id),half=(layout.busSpans?.[asset.id]??60)/2;
      const points:Point[]=bar?[[cx+bar.left,cy],[cx+bar.right,cy]]:layout.rotations?.[asset.id]===90?[[cx-half,cy],[cx+half,cy]]:[[cx,cy-half],[cx,cy+half]];
      result.push({id:asset.id+'#bus-stroke',terminal:asset.terminals[0],points});continue;
    }
    if(!includeLeads)continue;
    let local=layout;
    if(angle){
      const terminals={...layout.terminals};
      for(const id of asset.terminals){const p=terminals[id],q=turnPoint([p[0]-cx,p[1]-cy],-angle);terminals[id]=[cx+q[0],cy+q[1]];}
      local={...layout,terminals,rotations:{...layout.rotations,[asset.id]:((layout.rotations?.[asset.id]??0)-angle+360)%360}};
    }
    const ground=threePositionContacts(asset)?.ground??(asset.kind==='earth-switch'?asset.terminals[1]:undefined),scale=inline.has(asset.id)?1:symbolScale;
    const {ports}=equipmentPorts(asset,local);
    for(const [i,port]of ports.entries()){
      const terminal=asset.terminals[i];if(terminal===ground)continue;
      const p=local.terminals[terminal];
      const points=orthogonalPoints([[p[0]-cx,p[1]-cy],[port[0]*scale,port[1]*scale]]).map(p=>{const q=turnPoint(p,angle);return[cx+q[0],cy+q[1]] as Point;});
      result.push({id:asset.id+'#lead-'+i,terminal,points});
    }
  }
  return result;
}
