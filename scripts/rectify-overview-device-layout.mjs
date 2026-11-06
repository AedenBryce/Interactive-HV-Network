import { createServer } from 'vite';
import { readFile,writeFile,copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const hash=v=>createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex');
const read=async p=>JSON.parse((await readFile(p,'utf8')).replace(/^\uFEFF/,''));
const file='src/models/site/authored-network.json';
const original=await read(file);
if(original.modelVersion!=='construction-2026-10-23.11')throw Error('Migration only applies once to the reviewed .11 drawing');
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try {
 const {currentNetworkModel:model}=await server.ssrLoadModule('/src/models/site/current-network.ts');
 const {addedOverviewControls:added}=await server.ssrLoadModule('/src/models/site/overview-device-corrections.ts');
 const {modelSchema}=await server.ssrLoadModule('/src/session/model.ts');
 const parsed=modelSchema.safeParse(model);if(!parsed.success)throw Error(JSON.stringify(parsed.error.issues));
 const drawing=structuredClone(original);
 const review=await read('docs/layout-versions/owner-layout-before-device-corrections-2026-11-06.json');
 await copyFile(file,'docs/layout-versions/authored-before-device-corrections-2026-11-06.json');
 const owner=id=>drawing.modules.find(m=>m.assetIds.includes(id));
 const a=id=>model.assets.find(a=>a.id===id);
 const absolute=t=>{const m=drawing.modules.find(m=>t in m.layout.terminals);const p=m.layout.terminals[t];return[p[0]+m.origin[0],p[1]+m.origin[1]];};
 const local=(p,m)=>[p[0]-m.origin[0],p[1]-m.origin[1]];
 const anchor=id=>{const m=owner(id),p=m.layout.assets[id];return[p[0]+m.origin[0],p[1]+m.origin[1]];};
 const route=id=>drawing.externalRoutes[id]??(()=>{const m=drawing.modules.find(m=>id in m.routes);return m?.routes[id].map(p=>[p[0]+m.origin[0],p[1]+m.origin[1]]);})();
 const saveRoute=(id,points)=>{delete drawing.externalRoutes[id];for(const m of drawing.modules)delete m.routes[id];const c=model.connections.find(c=>c.id===id);const m=owner(aForTerminal(c.from));const n=owner(aForTerminal(c.to));if(m===n)m.routes[id]=points.map(p=>local(p,m));else drawing.externalRoutes[id]=points;};
 const aForTerminal=t=>model.assets.find(a=>a.terminals.includes(t)).id;
 const direct=(p,q)=>p[0]===q[0]||p[1]===q[1]?[p,q]:[p,[p[0],q[1]],q];
 const delta=id=>{const m=owner(id),x=review.edits.assets[id]??[0,0],r=review.edits.rooms[m.id]??[0,0];return[x[0]+r[0],x[1]+r[1]];};
 const edited=t=>{const p=absolute(t),d=delta(aForTerminal(t));return[p[0]+d[0],p[1]+d[1]];};
 for(const row of added){
  const m=owner(row.anchorId),control=a(row.id),p=anchor(row.anchorId);
  let centre;
  if(row.role==='series'){
   const old=route(row.linkId),start=old[0],end=old.at(-1);
   centre=[p[0], Math.max(p[1]+260,(start[1]+end[1])/2)];
  }else centre=[p[0]+220,p[1]+70];
  m.assetIds.push(row.id);m.layout.assets[row.id]=local(centre,m);
  const offset=review.edits.assets[row.anchorId]??[0,0];review.edits.assets[row.id]=[...offset];
  const t0=row.role==='earth'?centre:[centre[0],centre[1]-140],t1=[centre[0],centre[1]+140];
  m.layout.terminals[control.terminals[0]]=local(t0,m);m.layout.terminals[control.terminals[1]]=local(t1,m);
  m.labels[row.id]={x:centre[0]-m.origin[0]+(row.role==='earth'?-120:180),y:centre[1]-m.origin[1]+(row.role==='earth'?170:-65),width:270,height:120,lines:[control.label]};
  if(row.role==='series'){
   const link=model.connections.find(c=>c.id===row.linkId),input=model.connections.find(c=>c.id===`${row.id}:incoming`);
   saveRoute(link.id,direct(absolute(link.from),absolute(link.to)));saveRoute(input.id,direct(absolute(input.from),absolute(input.to)));
   review.lineRoutes??={};review.lineRoutes[link.id]=direct(edited(link.from),edited(link.to));review.lineRoutes[input.id]=direct(edited(input.from),edited(input.to));
  }else{
   const link=model.connections.find(c=>c.id===row.linkId);saveRoute(link.id,direct(absolute(link.from),absolute(link.to)));
   review.lineRoutes??={};review.lineRoutes[link.id]=direct(edited(link.from),edited(link.to));
  }
 }
 // The existing RM714 earth branch now attaches after the restored isolator.
 const changed=model.connections.find(c=>c.id==='rm714:tf714:es:branch');saveRoute(changed.id,direct(absolute(changed.from),absolute(changed.to)));
 review.lineRoutes[changed.id]=direct(edited(changed.from),edited(changed.to));
 drawing.identities={assets:model.assets.map(({id,terminals})=>({id,terminals})).sort((a,b)=>a.id.localeCompare(b.id)),connections:model.connections.map(({id,from,to})=>({id,from,to})).sort((a,b)=>a.id.localeCompare(b.id))};
 drawing.modelVersion=model.version;drawing.modelFingerprint=hash(model);drawing.topologyFingerprint=hash(drawing.identities);drawing.layoutRevision='authored-2026-11-06.1';
 review.modelVersion=model.version;review.layoutRevision=drawing.layoutRevision;
 const {composeAuthoredSchematic}=await server.ssrLoadModule('/src/ui/authored-schematic.ts');composeAuthoredSchematic(model,drawing);
 await writeFile(file,JSON.stringify(drawing,null,2)+'\n');
 await writeFile('src/models/site/reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
 await writeFile('docs/layout-versions/owner-layout-device-corrections-2026-11-06.json',JSON.stringify(review,null,2)+'\n');
 console.log(JSON.stringify({version:model.version,added:added.length,assets:model.assets.length,connections:model.connections.length,layout:drawing.layoutRevision}));
}finally{await server.close();}
