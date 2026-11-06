import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
import { createHash } from 'node:crypto';

// Compiler for the selected authored placement. Local interiors and transforms
// are inputs, never adjusted here. Failed routes are reported, never fabricated.
const read = async path => JSON.parse(await readFile(path, 'utf8'));
const [placed, local, plan, baseline, ownership] = await Promise.all([
  read('src/models/site/authored-placed-modules.json'), read('src/models/site/authored-local-modules.json'),
  read('src/models/site/authored-placement.json'), read('docs/goals/hv-layout-baseline.json'), read('src/models/site/authored-ownership.json'),
]);
const model = await read(ownership.baselineModelPath);
const rerouteId=process.argv.find(arg=>arg.startsWith('--reroute='))?.slice('--reroute='.length);
const rerouteIds=new Set(rerouteId?.split(',')??[]);
const topDown = process.argv.includes('--top-down');
const candidateCacheArg=process.argv.find(arg=>arg==='--candidate-cache'||arg.startsWith('--candidate-cache='));
const candidateCache = Boolean(candidateCacheArg);
const candidatePath=candidateCacheArg?.includes('=')?candidateCacheArg.slice('--candidate-cache='.length):'tmp/authored-network-top-down-pending.json';
const candidateReportPath=process.argv.find(arg=>arg.startsWith('--candidate-report='))?.slice('--candidate-report='.length)??'tmp/authored-external-top-down-pending.json';
const retryUnresolved = process.argv.includes('--retry-unresolved') || Boolean(rerouteId) || topDown || candidateCache;
const cached = retryUnresolved ? await read(candidateCache?candidatePath:'src/models/site/authored-network.json') : undefined;
const cachedReport = retryUnresolved ? await read(candidateCache?candidateReportPath:'tmp/authored-external-report.json') : undefined;
const fingerprint = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const server = await createServer({ configFile: false, server: { middlewareMode: true }, appType: 'custom' });
try {
  const { planOrthogonalRoutes } = await server.ssrLoadModule('/src/ui/orthogonal-route-planner.ts');
  const { composeAuthoredSchematic } = await server.ssrLoadModule('/src/ui/authored-schematic.ts');
  const modules = new Map(placed.modules.map(m => [m.id, m]));
  const coverage = new Map(local.sourceCoverage.map(c => [c.groupId, c]));
  const rectangles = placed.measuredGroups;
  const bounds = new Map(rectangles.map(r => [r.groupId, r]));
  // Display direction comes from the explicit authored hierarchy, not electrical
  // endpoint ordering. Ring and cross connections keep their separate corridors.
  const flowFor = link => {
    if(link.role!=='primary-display-link') return undefined;
    if(link.displayParentGroupId&&link.displayChildGroupId)return {parent:link.displayParentGroupId,child:link.displayChildGroupId};
    const child=plan.groups.find(g=>g.parentConnectionIds?.includes(link.connectionId));
    if(!child?.parentGroupId)throw Error(`Primary display link lacks authored parent: ${link.connectionId}`);
    return {parent:child.parentGroupId,child:child.groupId};
  };
  const owner = new Map(model.assets.flatMap(a => a.terminals.map(t => [t, a.id])));
  const byId = new Map(model.assets.map(a => [a.id, a]));
  const terminalDegree=new Map();
  for(const link of model.connections)for(const t of [link.from,link.to])terminalDegree.set(t,(terminalDegree.get(t)??0)+1);
  // Match composeAuthoredSchematic's hidden pure handoffs. Their retained model
  // records must not create invisible symbol/label routing obstacles.
  const pureHandoff=id=>{const a=byId.get(id);return a.kind==='interface'&&a.terminals.length===1&&!a.positions.length&&!a.conductivePairs.length&&terminalDegree.get(a.terminals[0])===2&&a.id.includes(':interface');};
  const links = new Map(model.connections.map(c => [c.id, c]));
  const add = (p, origin) => [p[0] + origin[0], p[1] + origin[1]];
  const same = (a,b) => a[0] === b[0] && a[1] === b[1];
  const simplify = points => points.filter((p,i) => !i || !same(p,points[i-1])).filter((p,i,a) => !i || i === a.length-1 || !((a[i-1][0] === p[0] && p[0] === a[i+1][0]) || (a[i-1][1] === p[1] && p[1] === a[i+1][1])));
  const internal = placed.modules.flatMap(m => Object.entries(m.routes).map(([id,points]) => ({id, points: points.map(p=>add(p,m.origin)), fromTerminalId: links.get(id).from, toTerminalId: links.get(id).to})));
  const externalRoutes = {}; const unresolved = []; const entries = []; const accepted = [];
  const localAccepted = new Map();
  const cacheValidation={mode:topDown?'top-down-primary':rerouteId?'reroute-specific':retryUnresolved?'retry-unresolved':'full-compile',requestedRouteId:rerouteId,oldModuleGeometry:cached?fingerprint(cached.modules):null,newModuleGeometry:fingerprint(placed.modules),retainedRouteCount:0,invalidatedRoutes:[],changedModules:[]};
  if(cached){
    for(const id of rerouteIds)if(!plan.externalConnections.some(c=>c.connectionId===id))throw Error(`Requested reroute ID absent from external plan: ${id}`);
    const oldModules=new Map(cached.modules.map(m=>[m.id,m]));
    cacheValidation.changedModules=placed.modules.filter(m=>fingerprint(m)!==fingerprint(oldModules.get(m.id))).map(m=>({id:m.id,oldGeometry:oldModules.has(m.id)?fingerprint(oldModules.get(m.id)):null,newGeometry:fingerprint(m)}));
    const changedModuleIds=new Set(cacheValidation.changedModules.map(m=>m.id));
    if(cached.modelId!==placed.modelId||cached.modelVersion!==placed.modelVersion||cached.topologyFingerprint!==placed.topologyFingerprint)throw Error('Cached external route topology differs from placed modules.');
    for(const [id,points]of Object.entries(cached.externalRoutes)){
      const link=plan.externalConnections.find(c=>c.connectionId===id);
      if(!link)throw Error(`Cached route is absent from external connection plan: ${id}`);
      if(candidateCache&&(changedModuleIds.has(link.fromGroupId)||changedModuleIds.has(link.toGroupId))){cacheValidation.invalidatedRoutes.push({id,reason:'changed-module-port-contract'});continue;}
      if(rerouteIds.has(id) || (topDown&&!candidateCache&&flowFor(link))){cacheValidation.invalidatedRoutes.push({id,reason:rerouteIds.has(id)?'explicit-focused-reroute':'top-down-primary-display-link'});continue;}
      const from=add(modules.get(link.fromGroupId).layout.terminals[link.from],modules.get(link.fromGroupId).origin);
      const to=add(modules.get(link.toGroupId).layout.terminals[link.to],modules.get(link.toGroupId).origin);
      if(!same(points[0],from)||!same(points.at(-1),to)){
        cacheValidation.invalidatedRoutes.push({id,reason:'changed-endpoint',oldFrom:points[0],oldTo:points.at(-1),newFrom:from,newTo:to});
        continue;
      }
      externalRoutes[id]=points;
      accepted.push({id,points,fromTerminalId:link.from,toTerminalId:link.to});
      for(const groupId of [link.fromGroupId,link.toGroupId]){
        const m=modules.get(groupId);
        if(!localAccepted.has(groupId))localAccepted.set(groupId,[]);
        localAccepted.get(groupId).push({id,points:points.map(p=>[p[0]-m.origin[0],p[1]-m.origin[1]]),fromTerminalId:link.from,toTerminalId:link.to});
      }
      const entry=cachedReport.entries.find(e=>e.connectionId===id);if(entry)entries.push(entry);
      cacheValidation.retainedRouteCount++;
    }
    console.log(`Retained ${cacheValidation.retainedRouteCount} cached external routes; invalidated ${cacheValidation.invalidatedRoutes.length}.`);
  }
  const cuts = (a,b,r) => a[0] === b[0] ? a[0] > r.x && a[0] < r.x+r.width && Math.max(a[1],b[1]) > r.y && Math.min(a[1],b[1]) < r.y+r.height : a[1] > r.y && a[1] < r.y+r.height && Math.max(a[0],b[0]) > r.x && Math.min(a[0],b[0]) < r.x+r.width;
  const pointOn = (p,a,b) => a[0] === b[0] ? p[0] === a[0] && p[1] >= Math.min(a[1],b[1]) && p[1] <= Math.max(a[1],b[1]) : p[1] === a[1] && p[0] >= Math.min(a[0],b[0]) && p[0] <= Math.max(a[0],b[0]);
  // Perpendicular interior crossings have no junction semantics. Shared lengths
  // and a bend/end touching an unrelated line are rejected.
  function wireClear(a,b,reserved) {
    return reserved.every(route => route.points.slice(1).every((d,i) => {
      const c = route.points[i];
      if (a[0] === b[0] && c[0] === d[0] && a[0] === c[0]) return Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])) < Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]));
      if (a[1] === b[1] && c[1] === d[1] && a[1] === c[1]) return Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0])) < Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]));
      return ![a,b].some(p=>pointOn(p,c,d)) && ![c,d].some(p=>pointOn(p,a,b));
    }));
  }
  const corridor = link => {
    const match = link.corridorId.match(/^lane:(.*):(west|east)$/);
    if (match) { const lane = placed.lanes[match[1]]; return {axis:0, value:match[2] === 'west' ? lane.x - 150 - link.track*100 : lane.x + lane.width + 150 + link.track*100}; }
    if (link.corridorId === 'main-feeder-header') return {axis:1,value:-200-link.track*100};
    if (link.corridorId === 'crushing-ring-side') { const lane=placed.lanes['crushing-2']; return {axis:0,value:lane.x+lane.width+150}; }
    if (link.corridorId === 'secondary-supply-side') return {axis:0,value:-300};
    throw Error(`Unknown corridor ${link.corridorId}`);
  };
  function localEntry(link, groupId, terminal, track, attempt, explicitSide) {
    const m=modules.get(groupId), c=coverage.get(groupId), r=bounds.get(groupId), start=m.layout.terminals[terminal];
    const [bx,by,width,height]=c.bounds;
    const globalStart=add(start,m.origin);
    const side=explicitSide ?? (track.axis===0 ? (track.value<r.x?'west':'east') : 'north');
    // Distinct access heights avoid collinear sharing between connections.
    const rank=plan.externalConnections.filter(l=>l.fromGroupId===groupId || l.toGroupId===groupId).findIndex(l=>l.connectionId===link.connectionId);
    const offset=30+rank*14+attempt*7;
    const port=(side==='north'||side==='south') ? [Math.max(bx+20,Math.min(bx+width-20,start[0])), side==='north'?by-40-offset:by+height+40+offset] : [side==='west' ? bx-40-offset : bx+width+40+offset, Math.max(by+20,Math.min(by+height-20,start[1]+offset))];
    const obstacles = Object.entries(c.symbolBoxes).filter(([id])=>!m.hiddenAssetIds?.includes(id)&&!pureHandoff(id)).map(([id,box])=>({id:`symbol:${id}`,...box}));
    for (const [id,label] of Object.entries(m.labels)) if(!m.hiddenAssetIds?.includes(id)&&!pureHandoff(id)) obstacles.push({id:`label:${id}`,x:label.x,y:label.y,width:label.width,height:label.height});
    for (const id of m.assetIds.filter(id=>byId.get(id).kind==='bus')) {const p=m.layout.assets[id], span=m.layout.busSpans[id], horizontal=m.layout.rotations[id]===90; obstacles.push({id:`bus:${id}`,x:p[0]-(horizontal?span/2:2),y:p[1]-(horizontal?2:span/2),width:horizontal?span:4,height:horizontal?4:span});}
    const reserved=Object.entries(m.routes).map(([id,points])=>({id,points,fromTerminalId:links.get(id).from,toTerminalId:links.get(id).to}));
    for(const [i,lead] of c.leadSegments.entries()) if(lead.terminal!==terminal) reserved.push({id:`lead:${i}`,points:[lead.from,lead.to],fromTerminalId:lead.terminal,toTerminalId:lead.terminal});
    reserved.push(...(localAccepted.get(groupId)??[]));
    // Interface centers and bus taps need an envelope exemption. A device
    // terminal outside its body never authorizes returning through that body.
    const ignoredObstacleIds=obstacles.filter(o=>[`symbol:${owner.get(terminal)}`,`bus:${owner.get(terminal)}`].includes(o.id)&&start[0]>=o.x&&start[0]<=o.x+o.width&&start[1]>=o.y&&start[1]<=o.y+o.height).map(o=>o.id);
    const result=planOrthogonalRoutes([{id:link.connectionId,from:start,to:port,fromTerminalId:terminal,toTerminalId:`port:${link.connectionId}:${groupId}`,ignoredObstacleIds}],{obstacles,reservedRoutes:reserved,clearance:8,allowCrossings:true,maxSearchAttempts:2,localSearchPadding:200,maxLocalSearchPadding:Math.max(width,height),maxGridNodes:180000,bounds:{id:groupId,x:bx-200,y:by-200,width:width+400,height:height+400}});
    const path=result.routes.get(link.connectionId);
    return path ? {groupId,terminal,path,global:path.map(p=>add(p,m.origin)),port:add(port,m.origin),globalStart,side} : {failure:{planner:result.unresolved,groupId,terminal,localTerminal:start,localPort:port,endpointBlockers:obstacles.filter(o=>!ignoredObstacleIds.includes(o.id)&&[start,port].some(p=>p[0]>o.x-8&&p[0]<o.x+o.width+8&&p[1]>o.y-8&&p[1]<o.y+o.height+8)),terminalContacts:reserved.filter(r=>r.points.slice(1).some((p,i)=>pointOn(start,r.points[i],p))).map(r=>({id:r.id,fromTerminalId:r.fromTerminalId,toTerminalId:r.toTerminalId,points:r.points}))}};
  }
  // Sparse rectilinear visibility search around the measured module rectangles.
  // It handles macro access only; equipment obstacles remain the local planner's job.
  function macro(from,to,reserved) {
    const pad=12;
    const boxes=rectangles.map(r=>({...r,x:r.x-pad,y:r.y-pad,width:r.width+pad*2,height:r.height+pad*2}));
    const xs=[...new Set([from[0],to[0],-1000,...boxes.flatMap(r=>[r.x-16,r.x+r.width+16]),...reserved.flatMap(r=>r.points.flatMap(p=>[p[0]-12,p[0]+12]))])].sort((a,b)=>a-b);
    const ys=[...new Set([from[1],to[1],-1200,...boxes.flatMap(r=>[r.y-16,r.y+r.height+16]),...reserved.flatMap(r=>r.points.flatMap(p=>[p[1]-12,p[1]+12]))])].sort((a,b)=>a-b);
    const n=ys.length, key=(x,y)=>x*n+y, start=key(xs.indexOf(from[0]),ys.indexOf(from[1])), target=key(xs.indexOf(to[0]),ys.indexOf(to[1]));
    const point=k=>[xs[Math.floor(k/n)],ys[k%n]];
    const heuristic=k=>{const p=point(k);return Math.abs(p[0]-to[0])+Math.abs(p[1]-to[1]);};
    const dist=new Map([[start,0]]), prev=new Map(), heap=[[heuristic(start),start,0]];
    const push=item=>{heap.push(item);let i=heap.length-1;while(i){let p=(i-1)>>1;if(heap[p][0]<=item[0])break;heap[i]=heap[p];i=p;}heap[i]=item;};
    const pop=()=>{const first=heap[0],last=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let j=i*2+1;if(j+1<heap.length&&heap[j+1][0]<heap[j][0])j++;if(last[0]<=heap[j][0])break;heap[i]=heap[j];i=j;}heap[i]=last;}return first;};
    while(heap.length){const [,k,cost]=pop();if(cost!==dist.get(k))continue;if(k===target){const path=[];for(let at=k;at!==undefined;at=prev.get(at))path.push(point(at));return simplify(path.reverse());}const x=Math.floor(k/n),y=k%n,a=point(k);for(const [xx,yy]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(xx<0||xx>=xs.length||yy<0||yy>=ys.length)continue;const kk=key(xx,yy),b=point(kk);if(boxes.some(r=>cuts(a,b,r))||!wireClear(a,b,reserved))continue;const v=cost+Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);if(v<(dist.get(kk)??Infinity)){dist.set(kk,v);prev.set(kk,k);push([v+heuristic(kk),kk,v]);}}}
    return undefined;
  }
  for (const link of plan.externalConnections) {
    if(externalRoutes[link.connectionId])continue;
    const track=corridor(link), flow=flowFor(link); let complete; const failures=[];
    for(let attempt=0;attempt<2&&!complete;attempt++){
      const a=localEntry(link,link.fromGroupId,link.from,track,attempt,link.fromExitSide??(flow?(link.fromGroupId===flow.parent?'south':'north'):undefined)),b=localEntry(link,link.toGroupId,link.to,track,attempt,link.toExitSide??(flow?(link.toGroupId===flow.parent?'south':'north'):undefined));
      if(a.failure||b.failure){failures.push({attempt:attempt+1,stage:'local-entry',from:a.failure,to:b.failure});continue;}
      if(flow){
        const direct=macro(a.port,b.port,[...accepted]);
        if(!direct){failures.push({attempt:attempt+1,stage:'top-down-gap',fromPort:a.port,toPort:b.port});continue;}
        const points=simplify([...a.global,...direct.slice(1),...b.global.slice(0,-1).reverse()]);
        complete={points,a,b};continue;
      }
      const axis=track.axis; const wa=[...a.port],wb=[...b.port];wa[axis]=track.value;wb[axis]=track.value;
      const reserved=[...accepted];
      const first=macro(a.port,wa,reserved),middle=macro(wa,wb,reserved),last=macro(wb,b.port,reserved);
      if(!first||!middle||!last){failures.push({attempt:attempt+1,stage:'macro-corridor',first:!!first,middle:!!middle,last:!!last});continue;}
      const points=simplify([...a.global,...first.slice(1),...middle.slice(1),...last.slice(1),...b.global.slice(0,-1).reverse()]);
      complete={points,a,b};
    }
    if(!complete){unresolved.push({connectionId:link.connectionId,corridorId:link.corridorId,track:link.track,failures});continue;}
    externalRoutes[link.connectionId]=complete.points;
    accepted.push({id:link.connectionId,points:complete.points,fromTerminalId:link.from,toTerminalId:link.to});
    for(const entry of [complete.a,complete.b]){if(!localAccepted.has(entry.groupId))localAccepted.set(entry.groupId,[]);localAccepted.get(entry.groupId).push({id:link.connectionId,points:entry.path,fromTerminalId:entry.terminal,toTerminalId:`port:${link.connectionId}:${entry.groupId}`});}
    entries.push({connectionId:link.connectionId,corridorId:flow?'top-down-primary':link.corridorId,track:link.track,coordinate:flow?undefined:track,fromPort:complete.a.port,toPort:complete.b.port,fromSide:complete.a.side,toSide:complete.b.side,displayFlow:flow});
    console.log(`Routed ${Object.keys(externalRoutes).length}/88 ${link.connectionId}`);
  }
  const artifact={schemaVersion:1,layoutRevision:plan.layoutRevision,modelId:placed.modelId,modelVersion:placed.modelVersion,topologyFingerprint:placed.topologyFingerprint,modelFingerprint:baseline.modelSha256,identities:{assets:baseline.assets,connections:baseline.connections},modules:placed.modules,externalRoutes,status:unresolved.length?'external-routing-pending':'complete'};
  const partialValidation=[];
  const ownBodyCuts=[];
  for(const [id,points] of Object.entries(externalRoutes)){
    const link=links.get(id), spec=plan.externalConnections.find(c=>c.connectionId===id);
    const from=add(modules.get(spec.fromGroupId).layout.terminals[link.from],modules.get(spec.fromGroupId).origin);
    const to=add(modules.get(spec.toGroupId).layout.terminals[link.to],modules.get(spec.toGroupId).origin);
    if(!same(points[0],from)||!same(points.at(-1),to))partialValidation.push({id,defect:'detached-endpoint'});
    if(points.slice(1).some((p,i)=>p[0]!==points[i][0]&&p[1]!==points[i][1]))partialValidation.push({id,defect:'diagonal'});
    for(const [groupId,terminal,endpoint] of [[spec.fromGroupId,link.from,from],[spec.toGroupId,link.to,to]]){
      const m=modules.get(groupId),box=coverage.get(groupId).symbolBoxes[owner.get(terminal)];
      if(!box||m.hiddenAssetIds?.includes(owner.get(terminal)))continue;
      const globalBox={...box,x:box.x+m.origin[0],y:box.y+m.origin[1]};
      const inside=endpoint[0]>=globalBox.x&&endpoint[0]<=globalBox.x+globalBox.width&&endpoint[1]>=globalBox.y&&endpoint[1]<=globalBox.y+globalBox.height;
      if(!inside)points.slice(1).forEach((p,i)=>{if(cuts(points[i],p,globalBox))ownBodyCuts.push({connectionId:id,assetId:owner.get(terminal),terminal,segment:[points[i],p],box:globalBox});});
    }
  }
  if(partialValidation.length||ownBodyCuts.length)artifact.status='external-routing-pending';
  let composition;
  try {const result=composeAuthoredSchematic(model,artifact);composition={passed:true,assets:result.assets.length,routes:result.routes.size,terminals:Object.keys(result.view.layout.terminals).length};}catch(error){composition={passed:false,error:String(error)};artifact.status='external-routing-pending';}
  const artifactPath=candidateCache?(artifact.status==='complete'?'tmp/authored-network-top-down-candidate.json':'tmp/authored-network-top-down-pending.json'):topDown&&artifact.status!=='complete'?'tmp/authored-network-top-down-pending.json':'src/models/site/authored-network.json';
  await writeFile(artifactPath,JSON.stringify(artifact,null,2)+'\n');
  const report={status:artifact.status,groups:artifact.modules.length,internalRoutes:internal.length,externalRoutes:Object.keys(externalRoutes).length,missingSourceData:local.summary.missingSourceData,cacheValidation,partialValidation,ownBodyCuts,composition,entries,unresolved,collisionAudit:{status:'pending',reason:'Independent combined symbol/label/busbar/wire audit required before acceptance.'}};
  await writeFile(candidateCache?(artifact.status==='complete'?'tmp/authored-external-top-down-candidate.json':'tmp/authored-external-top-down-pending.json'):topDown&&artifact.status!=='complete'?'tmp/authored-external-top-down-pending.json':'tmp/authored-external-report.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,entries:undefined},null,2));
}finally{await server.close();}
