import type { Asset } from '../session/model';
import type { EditableGeometry, LayoutEdits } from './layout-edit';
import type { LineRoutes } from './line-routing';
import type { Point } from './diagram-geometry';
import { withFinalBoardFrames } from './final-board-frames';
type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };
/** One review edit, retaining the owner's layout and electrical relationships. */
export function visualAlignmentEdits(geometry: Geometry, previous: LayoutEdits, previousRoutes: LineRoutes = {}) {
 const delta = new Map<string, Point>();
 const add=(id:string,x:number,y:number)=>{const old=delta.get(id)??[0,0];delta.set(id,[old[0]+x,old[1]+y]);};
 const point=(id:string)=>geometry.view.layout.assets[id];
 const boards=withFinalBoardFrames(geometry).panels?.filter(p=>p.id.startsWith('final-board/'))??[];
 for(const board of boards){
  const ids=board.memberAssetIds??board.assetIds;
  const xs=[...new Set(ids.map(id=>Math.round(point(id)[0])))].sort((a,b)=>a-b);
  if(xs.length!==2||xs[1]-xs[0]>=860)continue;
  const extra=(860-xs[1]+xs[0])/2;
  for(const id of ids)add(id,Math.abs(point(id)[0]-xs[0])<Math.abs(point(id)[0]-xs[1])?-extra:extra,0);
 }
 const lower=new Set(['SW437','SW453','MC426','SW427','MC430','SW456']);
 for(const board of boards)if(lower.has((board as {label?:string}).label??''))for(const id of board.memberAssetIds??board.assetIds)add(id,0,1700);
 const lvH1=boards.find(p=>p.id.includes('wh:h1:mc417a'));
 for(const id of lvH1?.memberAssetIds??[])add(id,0,-1000);
 add('wh:h1:tf417a',0,-600);
 for(const asset of geometry.assets)if(asset.id === 'sw426:tf443' || /^sw426:sw443/.test(asset.id))add(asset.id,800,0);
 for(const [earth,cb] of [['wh:h1:mc417:in-earth','wh:h1:mc417:in'],['wh:h7:mc418:in-earth','wh:h7:mc418:in'],['rm420:mc420:in:es','rm420:mc420:in:vcb'],['mine:sw441:in:es','mine:sw441:in:cb']]){
  const a=point(earth),b=point(cb);if(a&&b)add(earth,b[0]+1100-a[0],b[1]-500-a[1]);
 }
 const upper=point('rm413a:es-q8:upper'),q1=point('rm413a:q1');
 if(upper&&q1)add('rm413a:es-q8:upper',q1[0]+1000-upper[0],0);
 add('sw421:bus:es',-60,1000);
 add('wh:h7:rm418:sw02:es',100,0);
 for(const asset of geometry.assets)if(/^(?:sw426:|rm714:)/.test(asset.id))add(asset.id,0,1500);
 // Outgoing breakers on one HV bus share a row; incoming breakers stay above it.
 const byId=new Map(geometry.assets.map(a=>[a.id,a]));
 for(const bus of geometry.assets.filter(a=>a.kind==='bus')){
  const ids=geometry.connections.flatMap(c=>{const a=geometry.owners.get(c.from),b=geometry.owners.get(c.to),id=a===bus.id?b:b===bus.id?a:undefined;return id&&byId.get(id)?.kind==='breaker'&&point(id)[1]>point(bus.id)[1]?[id]:[];});
  if(ids.length<2)continue;const ys=ids.map(id=>point(id)[1]).sort((a,b)=>a-b),row=ys[Math.floor(ys.length/2)];
  for(const id of ids)if(Math.abs(point(id)[1]-row)<1000)add(id,0,row-point(id)[1]);
 }
 const edits={assets:{...previous.assets},rooms:{...previous.rooms}};
 for(const [id,d]of delta){const old=edits.assets[id]??[0,0];edits.assets[id]=[old[0]+d[0],old[1]+d[1]];}
 const routes={...previousRoutes};
 for(const link of geometry.connections){const a=delta.get(geometry.owners.get(link.from)!),b=delta.get(geometry.owners.get(link.to)!);if(!a&&!b)continue;
  const old=geometry.routes.get(link.id)!;const start:Point=[old[0][0]+(a?.[0]??0),old[0][1]+(a?.[1]??0)],last=old.at(-1)!,end:Point=[last[0]+(b?.[0]??0),last[1]+(b?.[1]??0)];
  routes[link.id]=start[0]===end[0]||start[1]===end[1]?[start,end]:[start,[end[0],start[1]],end];
 }
 return{edits,routes};
}


