import type { Asset } from '../session/model';
import type { EditableGeometry, LayoutEdits } from './layout-edit';
import type { Point } from './diagram-geometry';
import type { LineRoutes } from './line-routing';
type Geometry = Omit<EditableGeometry,'assets'> & {assets:readonly Asset[]};
/** Align transformer columns without changing any electrical relationship. */
export function straightenTransformerColumns(g:Geometry,previous:LayoutEdits,previousRoutes:LineRoutes={}) {
 const byId=new Map(g.assets.map(a=>[a.id,a]));
 const delta=new Map<string,Point>();
 const peers=(id:string)=>g.connections.flatMap(c=>{const a=g.owners.get(c.from),b=g.owners.get(c.to);return a===id&&b?[b]:b===id&&a?[a]:[];});
 const move=(id:string,dx:number,dy:number)=>delta.set(id,[dx,dy]);
 for(const tf of g.assets.filter(a=>a.kind==='transformer')){
  const primary=g.connections.find(c=>c.from===tf.terminals[0]||c.to===tf.terminals[0]);
  if(!primary)continue;
  const upstream=g.owners.get(primary.from===tf.terminals[0]?primary.to:primary.from)!;
  const [x]=g.view.layout.assets[tf.id],up=g.view.layout.assets[upstream];
  const shared=peers(upstream).filter(id=>byId.get(id)?.kind==='transformer').length>1;
  const downstream=peers(tf.id).filter(id=>id!==upstream&&byId.get(id)?.kind!=='earth-switch');
  const target=shared&&tf.terminals.length===2&&downstream.length===1?g.view.layout.assets[downstream[0]][0]:shared?x:up[0];
  const dx=target-x;
  // Ignore only numerical placement noise, not a meaningful lateral detour.
  if(Math.abs(dx)<.1)continue;
  move(tf.id,dx,0);
  // Independently supplied downstream columns follow their transformer; shared
  // feeds retain the already established downstream board column instead.
  if(!shared){
   const visited=new Set([tf.id,upstream]); const queue=[...downstream];
   while(queue.length){const id=queue.shift()!;if(visited.has(id))continue;visited.add(id);const a=byId.get(id)!;
    if(!a||a.kind==='transformer'||a.kind==='source'||a.kind==='earth-switch')continue;
    const p=g.view.layout.assets[id];
    // A downstream column already aligned with the target stays there.
    const shift=tf.terminals.length===2&&Math.abs(p[0]-target)<1?target-p[0]:dx;
    move(id,shift,0);
    if(a.kind!=='bus')queue.push(...peers(id).filter(peer=>!visited.has(peer)));
   }
  }
 }
 // These confirmed LV cable handoffs are drawing metadata, not equipment
 // which should extend the upstream RMU's outline down past its transformer.
 const frames=g.panels??[];
 for(const tf of g.assets.filter(a=>a.kind==='transformer')){
  if(!delta.has(tf.id))continue;
  const [,y]=g.view.layout.assets[tf.id],d=delta.get(tf.id)!;
  const panel=frames.find(p=>(p.memberAssetIds??p.assetIds).includes(tf.id));
  if(!panel)continue;
  const controls=(panel.memberAssetIds??panel.assetIds).map(id=>byId.get(id)!).filter(a=>a&&['breaker','disconnector','earth-switch'].includes(a.kind)&&g.view.layout.assets[a.id][1]<y+400);
  const bottom=Math.max(...controls.map(a=>g.view.layout.assets[a.id][1]+(a.kind==='earth-switch'?850:500)));
  const dy=Math.max(0,bottom+250-y);
  if(dy){move(tf.id,d[0],dy);for(const id of peers(tf.id)){const a=byId.get(id);if(!a||g.view.layout.assets[id][1]<=y)continue;const seen=new Set([tf.id]);const q=[id];while(q.length){const next=q.shift()!;if(seen.has(next))continue;seen.add(next);const a=byId.get(next)!;if(!a||a.kind==='transformer'||a.kind==='earth-switch')continue;const old=delta.get(next)??[0,0];move(next,old[0],dy);if(a.kind!=='bus')q.push(...peers(next).filter(p=>!seen.has(p)));}}}
 }
 // Fit the single LV Hopper9 column between its RMU and the neighbouring
 // motor board, rather than taking it sideways into Hopper7's enclosure.
 const placeY=(id:string,y:number)=>{const old=delta.get(id)??[0,0];move(id,old[0],y-g.view.layout.assets[id][1]);};
 placeY('wh:h9:tf419b',33100);
 placeY('wh:h9:mc419a:in',33800);
 placeY('wh:h9:mc419a:bus',34300);
 placeY('wh:h7:tf418',44000);
 for(const a of g.assets)if(a.id.startsWith('wh:h7:mc418:')){const d=delta.get(a.id)??[0,0];move(a.id,d[0],d[1]+800);}
 // Keep neighbouring dual-incomer board enclosures in separate rows.
 for(const a of g.assets)if(/^sw426:sw439:/.test(a.id)||/^sw426:mc430:/.test(a.id)){const d=delta.get(a.id)??[0,0];move(a.id,d[0],d[1]+(/^sw426:mc430:/.test(a.id)?1800:1700));}
 const edits={assets:{...previous.assets},rooms:{...previous.rooms}};
 for(const[id,d]of delta){const old=edits.assets[id]??[0,0];edits.assets[id]=[old[0]+d[0],old[1]+d[1]];}
 const routes={...previousRoutes};
 for(const c of g.connections){const a=delta.get(g.owners.get(c.from)!),b=delta.get(g.owners.get(c.to)!);if(!a&&!b)continue;const old=g.routes.get(c.id)!;const s:Point=[old[0][0]+(a?.[0]??0),old[0][1]+(a?.[1]??0)],last=old.at(-1)!,e:Point=[last[0]+(b?.[0]??0),last[1]+(b?.[1]??0)];routes[c.id]=Math.abs(s[0]-e[0])<.1?[[e[0],s[1]],e]:[s,[s[0],e[1]],e];}
 return{edits,routes};
}



