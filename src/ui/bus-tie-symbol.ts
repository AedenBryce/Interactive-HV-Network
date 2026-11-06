import type { Asset, NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';

export type BusBarExtent = { left: number; right: number; leftCap: boolean; rightCap: boolean };

/** Clip only the visual bus strokes; all electrical terminals and routes stay intact. */
export function busTieSymbols(assets:readonly Asset[],connections:NetworkModel['connections'],layout:DiagramLayout,symbolScale:number) {
  const owners=new Map(assets.flatMap(a=>a.terminals.map(t=>[t,a] as const)));
  const tieIds=new Set<string>(),bars=new Map<string,BusBarExtent>(),hiddenConnectionIds=new Set<string>();
  for(const asset of assets.filter(a=>a.kind==='breaker'&&a.terminals.length===2)){
    const peers=asset.terminals.map(t=>connections.filter(c=>c.from===t||c.to===t).map(c=>owners.get(c.from===t?c.to:c.from)).find(a=>a?.kind==='bus'));
    if(!peers[0]||!peers[1]||peers[0].id===peers[1].id)continue;
    const [tx,ty]=layout.assets[asset.id];
    if(peers.some(bus=>layout.rotations?.[bus!.id]!==90||Math.abs(layout.assets[bus!.id][1]-ty)>1e-6))continue;
    tieIds.add(asset.id);
    for(const connection of connections)if(asset.terminals.includes(connection.from)&&owners.get(connection.to)?.kind==='bus'||asset.terminals.includes(connection.to)&&owners.get(connection.from)?.kind==='bus')hiddenConnectionIds.add(connection.id);
    for(const bus of peers){
      const [x]=layout.assets[bus!.id],half=(layout.busSpans?.[bus!.id]??60)/2;
      const extent=bars.get(bus!.id)??{left:-half,right:half,leftCap:true,rightCap:true};
      if(x<tx){extent.right=tx-30*symbolScale-x;extent.rightCap=false;}
      else{extent.left=tx+30*symbolScale-x;extent.leftCap=false;}
      bars.set(bus!.id,extent);
    }
  }
  return {tieIds,bars,hiddenConnectionIds};
}
