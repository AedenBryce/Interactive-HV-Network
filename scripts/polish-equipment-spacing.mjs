import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {currentNetworkModel:model}=await server.ssrLoadModule('/src/models/site/current-network.ts');
 const {getRemovableMechanism}=await server.ssrLoadModule('/src/session/mechanisms.ts');
 const audit=await read('tmp/equipment-presentation-audit.json'),review=await read('src/models/site/reviewed-layout.json');
 if(review.layoutRevision!=='authored-2026-11-06.1')throw Error('Spacing pass has already been applied or layout identity changed.');
 const layout=audit.layout,owners=new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a]))),moves=new Map(),rows=[];
 const plus=(a,b)=>[a[0]+b[0],a[1]+b[1]],position=id=>plus(layout.assets[id],moves.get(id)??[0,0]);
 const move=(id,dx,dy)=>{if(Math.abs(dx)+Math.abs(dy)>1e-5)moves.set(id,plus(moves.get(id)??[0,0],[dx,dy]));};
 const median=values=>values.toSorted((a,b)=>a-b)[Math.floor(values.length/2)];
 const hidden=new Set(model.assets.flatMap(a=>a.earthAssembly?[a.earthAssembly.earthAssetId]:[]));
 const roomOf=new Map(audit.panels.flatMap(p=>p.memberAssetIds.map(id=>[id,p.id])));
 const groups=new Map();
 for(const c of model.connections){
  const a=owners.get(c.from),b=owners.get(c.to),bus=a?.kind==='bus'?a:b?.kind==='bus'?b:undefined,main=bus===a?b:a;
  if(!bus||!main||main.kind!=='breaker'||main.id==='sw411:bus-tie:cb'||roomOf.get(bus.id)!==roomOf.get(main.id))continue;
  const p=layout.assets[main.id],q=layout.assets[bus.id],key=`${bus.id}:${p[1]<q[1]?'in':'out'}`;
  const ids=groups.get(key)??new Set();ids.add(main.id);groups.set(key,ids);
 }
 for(const [key,set]of groups){
  const ids=[...set],ys=ids.map(id=>layout.assets[id][1]);
  if(ids.length<2||Math.max(...ys)-Math.min(...ys)>300)continue;
  const y=median(ys);for(const id of ids)move(id,0,y-layout.assets[id][1]);
  if(ys.some(v=>Math.abs(v-y)>1e-5))rows.push({key,ids,y});
 }
 const branchRoutes={};
 for(const earth of model.assets.filter(a=>a.kind==='earth-switch'&&!hidden.has(a.id))){
  const link=model.connections.find(c=>earth.terminals.includes(c.to)||earth.terminals.includes(c.from));if(!link)continue;
  const from=earth.terminals.includes(link.to)?link.from:link.to,main=owners.get(from);
  if(!main||getRemovableMechanism(main)?.kind!=='breaker')continue;
  const p=position(main.id),terminal=layout.terminals[from],side=Math.sign(terminal[1]-layout.assets[main.id][1]);
  if(!side)continue;
  const old=layout.assets[earth.id],following=old[1]+(moves.get(main.id)?.[1]??0),distance=(following-p[1])*side;
  const y=p[1]+side*Math.max(distance,review.appearance.symbolScale*48+20);
  move(earth.id,0,y-old[1]);
  if(moves.has(earth.id)||moves.has(main.id)){
   const start=plus(terminal,moves.get(main.id)??[0,0]),end=plus(layout.terminals[earth.terminals[0]],moves.get(earth.id)??[0,0]);
   const path=[start,[start[0],end[1]],end];branchRoutes[link.id]=link.from===from?path:path.toReversed();
  }
 }
 // Three measured caption/wire contacts; move the earth and its tag together.
 move('sw411:tier-16:es',40,0);move('sw451:bus:es',-80,0);move('wh:h7:rm418:cb03:earth',40,0);
 for(const [id,d]of moves){const old=review.edits.assets[id]??[0,0];review.edits.assets[id]=plus(old,d);}
 for(const c of model.connections){
  const from=owners.get(c.from),to=owners.get(c.to);if(!moves.has(from?.id)&&!moves.has(to?.id))continue;
  const earth=from?.kind==='earth-switch'?from:to?.kind==='earth-switch'?to:undefined;
  if(earth&&!hidden.has(earth.id)){
   const a=plus(layout.terminals[c.from],moves.get(from.id)??[0,0]),b=plus(layout.terminals[c.to],moves.get(to.id)??[0,0]);
   branchRoutes[c.id]=from===earth?[a,[b[0],a[1]],b]:[a,[a[0],b[1]],b];
  }
 }
 review.lineRoutes={...review.lineRoutes,...branchRoutes};
 review.layoutRevision='authored-2026-11-06.2';
 const drawing=await read('src/models/site/authored-network.json');drawing.layoutRevision=review.layoutRevision;
 await writeFile('tmp/equipment-spacing-changes.json',JSON.stringify({rows,moves:Object.fromEntries(moves)},null,2));
 if(process.argv.includes('--apply')){
  await writeFile('src/models/site/reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
  await writeFile('src/models/site/authored-network.json',JSON.stringify(drawing,null,2)+'\n');
 }
 console.log(JSON.stringify({applied:process.argv.includes('--apply'),alignedRows:rows.length,movedObjects:moves.size,firstMoves:[...moves].slice(0,15)}));
}finally{await server.close();}
