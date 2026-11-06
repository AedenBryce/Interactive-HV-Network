import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const load=p=>server.ssrLoadModule('/src/'+p);
 const [{currentNetworkModel:m},{loadAuthoredLayout},{applyLayoutEdits},{switchroomBuses},{busEndClearance,applyBusTakeoffs},{transformerPortLayout},{applyLineRoutes},{rotateObjects},{enlargeLabels,fitCompactFrames},{withFinalBoardFrames},{clearConnectorCaptions},{compactEquipmentLabel,hasDeviceCard,isMotor},{deviceCard},{cutsBox},{busTieSymbols}]=await Promise.all(['models/site/current-network.ts','ui/authored-layout-loader.ts','ui/layout-edit.ts','ui/switchroom-buses.ts','ui/bus-earth-layout.ts','ui/transformer-port-layout.ts','ui/line-routing.ts','ui/object-rotation.ts','ui/compact-presentation.ts','ui/final-board-frames.ts','ui/connector-clearance.ts','ui/equipment-appearance.ts','ui/device-card.ts','ui/diagram-geometry.ts','ui/bus-tie-symbol.ts'].map(load));
 const option=(key,fallback)=>process.argv.find(arg=>arg.startsWith(`--${key}=`))?.split('=').slice(1).join('=')??fallback;
 const drawing=JSON.parse(await readFile(option('drawing','src/models/site/authored-network.json'),'utf8')),review=JSON.parse(await readFile(option('review','src/models/site/reviewed-layout.json'),'utf8'));
 const scale=review.appearance?.symbolScale??1,textScale=review.appearance?.textScale??1;
 const base=await loadAuthoredLayout(m,drawing),pos=switchroomBuses(applyLayoutEdits(base,review.edits,new Set(review.independentAssetPositions)),review.compactFrames);
 const routed=applyLineRoutes(rotateObjects(transformerPortLayout(applyBusTakeoffs(busEndClearance(pos),review.busTakeoffs??{}),scale),review.rotations),review.lineRoutes??{});
 const names={...Object.fromEntries(m.assets.map(a=>[a.id,compactEquipmentLabel(a,a.label)])),...review.names};
 const framed=fitCompactFrames(withFinalBoardFrames(enlargeLabels(routed,textScale,scale,names)),scale,review.framePaddingScale);
 const cleared=clearConnectorCaptions(framed,scale,new Set(review.manualLineRoutes));
 const {manualLabelLayout}=await load('ui/manual-label-layout.ts');
 const g=manualLabelLayout((review.framePaddingScale??1)<1?fitCompactFrames(enlargeLabels(cleared,textScale,scale,names),scale,review.framePaddingScale):cleared,review.labelPositions);
 const tie=busTieSymbols(g.assets,g.connections,g.view.layout,scale),hidden=new Set(m.assets.flatMap(a=>a.earthAssembly?[a.earthAssembly.earthAssetId]:[]));
 const wires=g.connections.filter(c=>!tie.hiddenConnectionIds.has(c.id)&&!hidden.has(g.owners.get(c.from))&&!hidden.has(g.owners.get(c.to))).map(c=>({id:c.id,path:g.routes.get(c.id)}));
 const visible=g.assets.filter(a=>!g.hiddenIds.has(a.id));
 const labels=visible.flatMap(a=>g.labels.has(a.id)?[{id:a.id,...g.labels.get(a.id)}]:[]);
 const {selectorEarthTag}=await load('ui/switch-display-tags.ts');
 const {threePositionContacts}=await load('ui/three-position-contacts.ts');
 const {equipmentPorts,orthogonalPoints}=await load('ui/diagram-geometry.ts');
 const {earthCaptionLayout,driveInputCaptions}=await load('ui/equipment-captions.ts');
 const {isDrive}=await load('ui/equipment-appearance.ts');
 for(const a of visible){
  const p=g.view.layout.assets[a.id];
  if(isDrive(a))for(const b of driveInputCaptions(a,scale))labels.push({id:`${a.id}#input-${b.lines[0]}`,ownerId:a.id,...b,x:p[0]+b.x,y:p[1]+b.y});
  if(a.earthAssembly||threePositionContacts(a)){
   const tag=a.earthAssembly?compactEquipmentLabel(m.assets.find(e=>e.id===a.earthAssembly.earthAssetId),m.assets.find(e=>e.id===a.earthAssembly.earthAssetId).label):selectorEarthTag(a);
   const b=earthCaptionLayout(tag,scale),manual=review.labelPositions?.[a.id+'#earth'];labels.push({id:`${a.id}#earth-tag`,ownerId:a.id,...b,x:p[0]+(manual?.[0]??b.x),y:p[1]+(manual?.[1]??b.y)});
  }
  if(a.kind==='bus')continue;
  const ground=threePositionContacts(a)?.ground??(a.kind==='earth-switch'?a.terminals[1]:undefined);
  const ports=equipmentPorts(a,g.view.layout).ports;
  for(let i=0;i<ports.length;i++)if(a.terminals[i]!==ground){const port=ports[i],end=[p[0]+port[0]*scale,p[1]+port[1]*scale];const path=orthogonalPoints([g.view.layout.terminals[a.terminals[i]],end]);if(path.length>1)wires.push({id:`${a.id}#lead-${i}`,path});}
 }
 const boxes=visible.map(a=>{const p=g.view.layout.assets[a.id],span=g.view.layout.busSpans?.[a.id]??60;const c=a.kind==='bus'?(g.view.layout.rotations?.[a.id]===90?{x:-span/2,y:-8,width:span,height:16}:{x:-8,y:-span/2,width:16,height:span}):hasDeviceCard(a)?deviceCard(a,p,g.labels.get(a.id),scale,g.view.layout.objectRotations?.[a.id]):{x:-40*scale,y:-40*scale,width:80*scale,height:80*scale};return{id:a.id,x:p[0]+c.x,y:p[1]+c.y,width:c.width,height:c.height};});
 const overlaps=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 const issues={labels:[],objects:[],wires:[],outside:[],frames:[]};
 for(const [i,a] of g.panels.entries())for(const b of g.panels.slice(i+1))if(overlaps(a,b))issues.frames.push([a.id,b.id]);
 for(const [i,l] of labels.entries()){
  for(const b of labels.slice(i+1))if(overlaps(l,b))issues.labels.push([l.id,b.id]);
  for(const b of boxes)if(b.id!==(l.ownerId??l.id)&&overlaps(l,b))issues.objects.push([l.id,b.id]);
  for(const w of wires)if(w.path.slice(1).some((p,j)=>cutsBox(w.path[j],p,l)))issues.wires.push([l.id,w.id]);
  const a=m.assets.find(a=>a.id===(l.ownerId??l.id));if(a.kind==='transformer'||isMotor(a)||a.id==='hpgr:jb001')continue;
  const panel=g.panels.find(p=>p.memberAssetIds.includes(a.id));if(panel&&(l.x<panel.x||l.y<panel.y||l.x+l.width>panel.x+panel.width||l.y+l.height>panel.y+panel.height))issues.outside.push([l.id,panel.id]);
 }
 const summary={rooms:g.panels.length,visibleCaptions:labels.length,symbolScale:scale,textScale,...Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.length]))};
 const {auditConductorOverlaps,uniqueConductorFragments,conductorGroups}=await load('ui/conductor-paths.ts');
 const {conductorReservations}=await load('ui/conductor-reservations.ts');
 const wireIds=new Set(wires.map(w=>w.id)),links=g.connections.filter(c=>wireIds.has(c.id));
 const rawRoutes=new Map(wires.filter(w=>links.some(c=>c.id===w.id)).map(w=>[w.id,w.path]));
 const rawOverlaps=auditConductorOverlaps(links,rawRoutes,g.assets);
 const reservations=conductorReservations(g.assets,g.view.layout,scale,new Set([...(g.hiddenIds??[]),...hidden]),g.inlineIds??new Set(),tie.bars);
 const painted=uniqueConductorFragments(links,new Map([...rawRoutes].map(([id,path])=>[id,[path]])),g.assets,()=>0,reservations);
 const paintLinks=[],paintRoutes=new Map();
 for(const c of links)for(const [i,path]of painted.get(c.id).entries()){const id=c.id+'#paint-'+i;paintLinks.push({...c,id});paintRoutes.set(id,path);}
 for(const r of reservations){paintLinks.push({id:r.id,from:r.terminal,to:r.terminal});paintRoutes.set(r.id,r.points);}
 const paintedOverlaps=auditConductorOverlaps(paintLinks,paintRoutes,g.assets);
 const groups=conductorGroups([...links,...paintLinks],g.assets),intervals=new Map();
 const segment=(a,b)=>{const h=Math.abs(a[1]-b[1])<1e-6;return{h,c:a[h?1:0],low:Math.min(a[h?0:1],b[h?0:1]),high:Math.max(a[h?0:1],b[h?0:1])};};
 const key=(id,s)=>[groups.get(id),s.h,Math.round(s.c/1e-6)].join('|');
 for(const c of paintLinks){const path=paintRoutes.get(c.id);for(let i=1;i<path.length;i++){const s=segment(path[i-1],path[i]),k=key(c.id,s),list=intervals.get(k)??[];list.push(s);intervals.set(k,list);}}
 const uncovered=[];
 for(const c of links){const path=rawRoutes.get(c.id);for(let i=1;i<path.length;i++){
  const s=segment(path[i-1],path[i]);if(s.high-s.low<1e-6)continue;
  let end=s.low;for(const span of (intervals.get(key(c.id,s))??[]).toSorted((a,b)=>a.low-b.low)){if(span.low>end+1e-5)break;if(span.high>end)end=span.high;}
  if(end<s.high-1e-5)uncovered.push({id:c.id,segment:i-1});
 }}
 const conductorSummary={wirePaths:links.length,rawSharedOverlaps:rawOverlaps.filter(o=>o.sharedConductor&&!o.retrace).length,rawUnrelatedOverlaps:rawOverlaps.filter(o=>!o.sharedConductor).length,retraces:rawOverlaps.filter(o=>o.retrace).length,paintedOverlaps:paintedOverlaps.length,uncoveredSegments:uncovered.length};
 await writeFile(option('conductors','tmp/conductor-path-audit.json'),JSON.stringify({summary:conductorSummary,rawOverlaps,paintedOverlaps,uncovered},null,2));
 await writeFile(option('report','tmp/equipment-presentation-audit.json'),JSON.stringify({summary,issues,labels,boxes,panels:g.panels,layout:g.view.layout,wires},null,2));
 console.log(JSON.stringify(summary));console.log(JSON.stringify(Object.fromEntries(Object.entries(issues).map(([k,v])=>[k,v.slice(0,10)]))));
 console.log(JSON.stringify(conductorSummary));
 if(process.argv.includes('--check')&&Object.values(issues).some(list=>list.length))process.exitCode=1;
 if(process.argv.includes('--check')&&(conductorSummary.rawUnrelatedOverlaps||conductorSummary.retraces||conductorSummary.paintedOverlaps||uncovered.length))process.exitCode=1;
}finally{await server.close();}
