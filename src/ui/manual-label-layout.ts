import type { AssetLabel, Point } from './diagram-geometry';

/** Manual captions are applied after automatic routing, so dragging text never
 * moves equipment or conductors. Relative anchors travel with their equipment. */
export function manualLabelLayout<T extends {labels:ReadonlyMap<string,AssetLabel>;view:{layout:{assets:Record<string,Point>}}}>(geometry:T,positions:Record<string,Point>={}):T{
  if(!Object.keys(positions).length)return geometry;
  const labels=new Map(geometry.labels);
  for(const[id,p]of Object.entries(positions)){
    const label=labels.get(id),anchor=geometry.view.layout.assets[id];
    if(label&&anchor)labels.set(id,{...label,x:anchor[0]+p[0],y:anchor[1]+p[1]});
  }
  return{...geometry,labels};
}
