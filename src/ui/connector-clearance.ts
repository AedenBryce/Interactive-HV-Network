import { paddedRoom } from './room-clearance';
import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import type { Point, Box } from './diagram-geometry';
import { clearRoute, cutsBox } from './diagram-geometry';
import { simplifyLineRoute } from './line-routing';
import { deviceCard } from './device-card';
import { hasDeviceCard } from './equipment-appearance';
type Geometry=Omit<EditableGeometry,'assets'>&{assets:readonly Asset[]};
/** Short local orthogonal alternatives only, retaining every endpoint and any already-clear manual path. */
export function clearConnectorCaptions<T extends Geometry>(geometry:T,scale:number,manualRoutes:ReadonlySet<string>=new Set()):T{
 const labels=[...geometry.labels].filter(([id])=>!geometry.hiddenIds?.has(id)).map(([id,box])=>({id,...box}));
 const cards=geometry.assets.filter(a=>!geometry.hiddenIds?.has(a.id)&&hasDeviceCard(a)).map(a=>{const [x,y]=geometry.view.layout.assets[a.id],r=deviceCard(a,[x,y],geometry.labels.get(a.id)!,scale,geometry.view.layout.objectRotations?.[a.id]);return{id:a.id,...r,x:x+r.x,y:y+r.y};});
 const routes=new Map(geometry.routes);
 const contains=(b:Box,p:Point)=>p[0]>=b.x&&p[0]<=b.x+b.width&&p[1]>=b.y&&p[1]<=b.y+b.height;
 for(const link of geometry.connections){
  if(manualRoutes.has(link.id))continue;
  const old=routes.get(link.id)!;if(!old?.length)continue;const a=old[0],b=old.at(-1)!;
  const owners=[geometry.owners.get(link.from),geometry.owners.get(link.to)];
  const rooms=(geometry.panels??[]).filter(p=>!owners.some(id=>id&&(p.memberAssetIds??p.assetIds).includes(id))).map(p=>({...p,...paddedRoom(p)}));
  const obstacles=[...labels,...cards.filter(c=>!owners.includes(c.id)),...rooms].filter(o=>!contains(o,a)&&!contains(o,b));
  const clear=(path:readonly Point[])=>!path.slice(1).some((p,i)=>obstacles.some(o=>cutsBox(path[i],p,o)));
  const transformer=geometry.assets.find(asset=>asset.id===owners[0]&&asset.kind==='transformer'&&asset.terminals.length>2&&link.from!==asset.terminals[0]);
  if(transformer){
   const loadSide=simplifyLineRoute([a,[b[0],a[1]],b]);
   if(clear(loadSide)){routes.set(link.id,loadSide);continue;}
  }
  if(clear(old)){
   const direct=[[a,[b[0],a[1]],b],[a,[a[0],b[1]],b]].map(p=>simplifyLineRoute(p as Point[])).sort((a,b)=>a.length-b.length).find(p=>p.length<old.length&&clear(p));
   if(direct)routes.set(link.id,direct);
   continue;
  }
  const local=obstacles.filter(o=>o.x<Math.max(a[0],b[0])+600&&o.x+o.width>Math.min(a[0],b[0])-600&&o.y<Math.max(a[1],b[1])+600&&o.y+o.height>Math.min(a[1],b[1])-600);
  const xs=[...new Set([(a[0]+b[0])/2,...local.flatMap(o=>[o.x-40,o.x+o.width+40])])];
  const ys=[...new Set([(a[1]+b[1])/2,...local.flatMap(o=>[o.y-40,o.y+o.height+40])])];
  const paths:Point[][]=[[a,[b[0],a[1]],b],[a,[a[0],b[1]],b],...xs.map(x=>[a,[x,a[1]],[x,b[1]],b] as Point[]),...ys.map(y=>[a,[a[0],y],[b[0],y],b] as Point[])];
  const length=(path:Point[])=>path.slice(1).reduce((sum,p,i)=>sum+Math.abs(p[0]-path[i][0])+Math.abs(p[1]-path[i][1]),0);
  let best=paths.map(p=>simplifyLineRoute(p)).sort((x,y)=>x.length-y.length||length(x)-length(y)).find(clear);
  if(!best){
   const nearby=obstacles.filter(o=>o.x<Math.max(a[0],b[0])+2500&&o.x+o.width>Math.min(a[0],b[0])-2500&&o.y<Math.max(a[1],b[1])+2500&&o.y+o.height>Math.min(a[1],b[1])-2500);
   const alternative=clearRoute(a,b,nearby,[]);
   if(alternative&&clear(alternative))best=alternative;
  }
  if(best)routes.set(link.id,best);
 }
 return{...geometry,routes};
}







