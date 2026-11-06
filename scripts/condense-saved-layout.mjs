import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';

// Bake a presentation-only contraction of the saved owner layout. Module order,
// equipment identities and electrical endpoints stay unchanged; glyph sizes do not scale.
const factor=Number(process.argv.find(arg=>arg.startsWith('--factor='))?.split('=')[1]??'.8');
if(!Number.isFinite(factor)||factor<.5||factor>1)throw new Error('Factor must be between .5 and 1.');
const root='docs/layout-versions/pre-condense-2026-11-06';
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const drawing=await read(`${root}/authored-network.json`),review=await read(`${root}/reviewed-layout.json`);
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p);
 const [{currentNetworkModel:model},{loadAuthoredLayout},{applyLayoutEdits},{switchroomBuses},{applyLineRoutes,attachLineRoute,simplifyLineRoute}]=await Promise.all(['models/site/current-network.ts','ui/authored-layout-loader.ts','ui/layout-edit.ts','ui/switchroom-buses.ts','ui/line-routing.ts'].map(load));
 const base=await loadAuthoredLayout(model,drawing);
 const positioned=switchroomBuses(applyLayoutEdits(base,review.edits,new Set(review.independentAssetPositions)),review.compactFrames);
 const g=applyLineRoutes(positioned,review.lineRoutes??{});
 // Runtime bus fitting may have extended a route beyond the authored span.
 // Bake that same tap as part of the bus, rather than detaching its endpoint.
 const byId=new Map(model.assets.map(a=>[a.id,a]));
 for(const c of g.connections){
  const path=g.routes.get(c.id);
  const endpoint=(terminal,p)=>{
   const id=g.owners.get(terminal),asset=byId.get(id),center=g.view.layout.assets[id];
   if(asset.kind!=='bus')return g.view.layout.terminals[terminal];
   const horizontal=g.view.layout.rotations?.[id]===90,axis=horizontal?0:1;
   g.view.layout.busSpans[id]=Math.max(g.view.layout.busSpans[id]??60,Math.abs(p[axis]-center[axis])*2+60);
   return horizontal?[p[0],center[1]]:[center[0],p[1]];
  };
  g.routes.set(c.id,simplifyLineRoute(attachLineRoute(path,endpoint(c.from,path[0]),endpoint(c.to,path.at(-1)))));
 }
 const point=p=>p.map(n=>n*factor);
 const shifts=new Map();
 const addShift=(id,dx,dy)=>{const old=shifts.get(id)??[0,0];shifts.set(id,[old[0]+dx,old[1]+dy]);};
 // Preserve the integrated earth-tag envelope between these tightly spaced
 // incoming selectors and their buses, and between the HPGR outlets and motors.
 for(const id of ['rm714:in01','rm714:in02','rm413:in01','rm413:in02','hpgr:drive-meb:outlet','hpgr:drive-mea:outlet']){
  addShift(id,0,-100);
  const earth=byId.get(id)?.earthAssembly?.earthAssetId;if(earth)addShift(earth,0,-100);
 }
 const {getRemovableMechanism}=await load('session/mechanisms.ts');
 const hiddenEarths=new Set(model.assets.flatMap(a=>a.earthAssembly?[a.earthAssembly.earthAssetId]:[]));
 for(const earth of model.assets.filter(a=>a.kind==='earth-switch'&&!hiddenEarths.has(a.id))){
  const link=model.connections.find(c=>earth.terminals.includes(c.to)||earth.terminals.includes(c.from));if(!link)continue;
  const terminal=earth.terminals.includes(link.to)?link.from:link.to,main=byId.get(g.owners.get(terminal));
  if(!main||getRemovableMechanism(main)?.kind!=='breaker')continue;
  const p=g.view.layout.assets[main.id],q=g.view.layout.assets[earth.id],side=Math.sign(g.view.layout.terminals[terminal][1]-p[1]);
  if(!side)continue;
  const gap=(q[1]-p[1])*factor*side,min=review.appearance.symbolScale*48+20;
  if(gap<min)addShift(earth.id,0,side*(min-gap));
 }
 addShift('sw411:tier-16:es',60,0);addShift('sw451:bus:es',-80,0);addShift('wh:h7:rm418:cb03:earth',60,0);addShift('sw505:tf505a:hv-es',80,0);
 addShift('wh:h9:mc419:in-earth',160,0);
 const baseline=await read('tmp/equipment-presentation-audit.json');
 const bodies=baseline.boxes.filter(b=>!hiddenEarths.has(b.id));
 const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 const body=b=>{const p=baseline.layout.assets[b.id],d=shifts.get(b.id)??[0,0];return{...b,x:b.x+p[0]*(factor-1)+d[0],y:b.y+p[1]*(factor-1)+d[1]};};
 // Keep the pre-existing equipment ordering, but reserve the fixed glyph
 // footprint where a uniform contraction would otherwise make two bodies touch.
 for(let pass=0;pass<8;pass++){
  let moved=false;
  for(let i=0;i<bodies.length;i++)for(const originalB of bodies.slice(i+1)){
   const originalA=bodies[i];if(overlaps(originalA,originalB))continue;
   let a=body(originalA),b=body(originalB);if(!overlaps(a,b))continue;
   const assetA=byId.get(a.id),assetB=byId.get(b.id);
   if(assetA.kind==='earth-switch'&&assetB.kind!=='earth-switch'){[a,b]=[b,a];}
   const oldA=baseline.boxes.find(box=>box.id===a.id),oldB=baseline.boxes.find(box=>box.id===b.id);
   const candidates=[];
   if(oldB.x>=oldA.x+oldA.width)candidates.push([a.x+a.width+24-b.x,0]);
   if(oldB.x+oldB.width<=oldA.x)candidates.push([a.x-24-b.x-b.width,0]);
   if(oldB.y>=oldA.y+oldA.height)candidates.push([0,a.y+a.height+24-b.y]);
   if(oldB.y+oldB.height<=oldA.y)candidates.push([0,a.y-24-b.y-b.height]);
   candidates.sort((a,b)=>Math.abs(a[0])+Math.abs(a[1])-Math.abs(b[0])-Math.abs(b[1]));
   if(candidates.length){const [dx,dy]=candidates[0];addShift(b.id,dx,dy);const earth=byId.get(b.id)?.earthAssembly?.earthAssetId;if(earth)addShift(earth,dx,dy);moved=true;}
  }
  if(!moved)break;
 }
 const shifted=(p,id)=>{const q=point(p),d=shifts.get(id)??[0,0];return[q[0]+d[0],q[1]+d[1]];};
 const caption=(l,id)=>{const p=shifted([l.x,l.y],id);return{...l,x:p[0],y:p[1]};};
 const scaledRoutes=new Map([...g.routes].map(([id,path])=>[id,path.map(point)]));
 for(const c of model.connections){const path=scaledRoutes.get(c.id);const from=shifts.get(g.owners.get(c.from))??[0,0],to=shifts.get(g.owners.get(c.to))??[0,0];
  scaledRoutes.set(c.id,simplifyLineRoute(attachLineRoute(path,[path[0][0]+from[0],path[0][1]+from[1]],[path.at(-1)[0]+to[0],path.at(-1)[1]+to[1]])));
 }
 const panels=new Map(g.panels.map(p=>[p.id,p]));
 for(const module of drawing.modules){
  module.hiddenAssetIds=module.assetIds.filter(id=>g.hiddenIds.has(id));
  module.origin=[0,0];
  module.layout.assets=Object.fromEntries(module.assetIds.map(id=>[id,shifted(g.view.layout.assets[id],id)]));
  module.layout.terminals=Object.fromEntries(module.assetIds.flatMap(id=>model.assets.find(a=>a.id===id).terminals.map(t=>[t,shifted(g.view.layout.terminals[t],id)])));
  module.layout.rotations=Object.fromEntries(module.assetIds.filter(id=>g.view.layout.rotations?.[id]!==undefined).map(id=>[id,g.view.layout.rotations[id]]));
  module.layout.busSpans=Object.fromEntries(module.assetIds.filter(id=>g.view.layout.busSpans?.[id]!==undefined).map(id=>[id,g.view.layout.busSpans[id]*factor]));
  module.labels=Object.fromEntries(module.assetIds.filter(id=>g.labels.has(id)).map(id=>[id,caption(g.labels.get(id),id)]));
  if(module.labels['rm413a:bus']){const p=module.layout.assets['rm413a:bus'];module.labels['rm413a:bus']={...module.labels['rm413a:bus'],x:p[0]+240,y:p[1]+100,width:466,height:164};}
  module.routes=Object.fromEntries(Object.keys(module.routes).map(id=>[id,scaledRoutes.get(id)]));
  const p=panels.get(module.id);if(p)module.frame=[p.x,p.y,p.width,p.height].map(n=>n*factor);
 }
 drawing.externalRoutes=Object.fromEntries(Object.keys(drawing.externalRoutes).map(id=>[id,scaledRoutes.get(id)]));
 drawing.layoutRevision='authored-2026-11-06.3';
 review.layoutRevision=drawing.layoutRevision;
 review.edits={assets:{},rooms:{}};
 review.lineRoutes=Object.fromEntries(scaledRoutes);
 review.independentAssetPositions=[];
 review.framePaddingScale=.55;
 review.names={...review.names,'wh:h9:mc419:in-earth':'MC419\nincoming earth'};
 // Reattach this transformer incomer directly after the runtime transformer
 // port alignment; retaining its old low bend would create a hairpin below its bus.
 const {busEndClearance,applyBusTakeoffs}=await load('ui/bus-earth-layout.ts');
 const {transformerPortLayout}=await load('ui/transformer-port-layout.ts');
 const {rotateObjects}=await load('ui/object-rotation.ts');
 const preview=rotateObjects(transformerPortLayout(applyBusTakeoffs(busEndClearance(switchroomBuses(await loadAuthoredLayout(model,drawing),review.compactFrames)),review.busTakeoffs??{}),review.appearance.symbolScale),review.rotations);
 const path=preview.routes.get('rm420:mc420:incoming-cable'),start=path[0],end=path.at(-1);
 review.lineRoutes['rm420:mc420:incoming-cable']=simplifyLineRoute([start,[start[0],end[1]],end]);
 // Preserve which routes the owner manually authored; caption clearance still
 // treats these as intentional routes rather than globally rerouting the graph.
 await writeFile('tmp/condensed-authored-network.json',JSON.stringify(drawing,null,2)+'\n');
 await writeFile('tmp/condensed-reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
 console.log(JSON.stringify({factor,assets:model.assets.length,connections:model.connections.length}));
}finally{await server.close();}
