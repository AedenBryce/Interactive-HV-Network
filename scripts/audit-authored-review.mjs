import { readFile, writeFile } from 'node:fs/promises';
import { createServer } from 'vite';
const read = async p => JSON.parse(await readFile(p, 'utf8'));
const [full, audit, ownership] = await Promise.all([read('src/models/site/authored-network.json'), read('tmp/authored-geometry-audit.json'), read('src/models/site/authored-ownership.json')]);
const model = await read(ownership.baselineModelPath);
const server = await createServer({configFile:false,server:{middlewareMode:true,hmr:false},appType:'custom'});
try {
  const {composeAuthoredSchematic} = await server.ssrLoadModule('/src/ui/authored-schematic.ts');
  const {findVisualRouteCrossings,applyVisualCrossingGaps,crossingGapWidthForScale} = await server.ssrLoadModule('/src/ui/route-crossing-gaps.ts');
  const c = composeAuthoredSchematic(model, full);
  const terminalOwner = new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a.id])));
  const linkMap = new Map(model.connections.map(x=>[x.id,x]));
  const group = id=>c.groupByAsset.get(terminalOwner.get(id));
  const frames = full.modules.filter(m=>m.frame).map(m=>({groupId:m.id,x:m.origin[0]+m.frame[0],y:m.origin[1]+m.frame[1],width:m.frame[2],height:m.frame[3]}));
  const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
  const frameOverlaps=frames.flatMap((a,i)=>frames.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.groupId,b.groupId]));
  function cut(a,b,r) {
    if(a[0]===b[0])return a[0]>r.x&&a[0]<r.x+r.width&&Math.min(Math.max(a[1],b[1]),r.y+r.height)>Math.max(Math.min(a[1],b[1]),r.y);
    return a[1]>r.y&&a[1]<r.y+r.height&&Math.min(Math.max(a[0],b[0]),r.x+r.width)>Math.max(Math.min(a[0],b[0]),r.x);
  }
  const framePassages=[];
  for(const [id,points]of c.routes){const link=linkMap.get(id),endpointGroups=[group(link.from),group(link.to)];for(const f of frames){const segments=points.slice(1).flatMap((p,i)=>cut(points[i],p,f)?[i]:[]);if(segments.length)framePassages.push({routeId:id,frameGroup:f.groupId,endpointGroups,segments,classification:endpointGroups.includes(f.groupId)?'own-equipment-entry':'unrelated-room-passage'});}}
  const detected = findVisualRouteCrossings(model.connections,c.routes);
  const recorded = audit.scopes.find(s=>s.name==='full-authored-network').findings.filter(f=>f.type==='route-crossing');
  const samples=[0.006,0.0125,0.1,0.29,0.45,0.8,1].map(scale=>({scale,gapWidth:crossingGapWidthForScale(scale),pieces:applyVisualCrossingGaps(c.routes,detected,crossingGapWidthForScale(scale))}));
  const drawnRouteDefects=samples.flatMap(s=>[...c.routes].flatMap(([id,points])=>{
    const pieces=s.pieces.get(id), vertices=pieces.flat();
    const missingEndpoints=[points[0],points.at(-1)].flatMap((p,i)=>vertices.some(v=>v[0]===p[0]&&v[1]===p[1])?[]:[i===0?'from':'to']);
    const diagonalSegments=pieces.flatMap((p,j)=>p.slice(1).flatMap((b,i)=>p[i][0]!==b[0]&&p[i][1]!==b[1]?[{piece:j,segment:i,from:p[i],to:b}]:[]));
    return missingEndpoints.length||diagonalSegments.length?[{scale:s.scale,routeId:id,missingEndpoints,diagonalSegments}]:[];
  }));
  const crossings=recorded.map((f,index)=>{
    const [a,b]=f.routeIds.map(id=>c.routes.get(id));
    const [ai,bi]=f.segmentIndices;
    const ah=a[ai][1]===a[ai+1][1];
    const hid=f.routeIds[ah?0:1],hi=f.segmentIndices[ah?0:1],h=c.routes.get(hid),v=ah?b:a,vi=ah?bi:ai;
    const horizontalDistanceToBend=Math.min(Math.abs(f.point[0]-h[hi][0]),Math.abs(f.point[0]-h[hi+1][0]));
    const verticalDistanceToBend=Math.min(Math.abs(f.point[1]-v[vi][1]),Math.abs(f.point[1]-v[vi+1][1]));
    const matched=detected.filter(d=>d.routeId===hid&&d.segmentIndex===hi+1&&d.x===f.point[0]);
    const roles=f.routeIds.map(id=>{const l=linkMap.get(id);return {routeId:id,fromGroup:group(l.from),toGroup:group(l.to),internal:group(l.from)===group(l.to)};});
    const gapChecks=samples.map(s=>{
      const pieces=s.pieces.get(hid);
      const inkAtCrossing=pieces.some(p=>p.slice(1).some((to,i)=>p[i][1]===f.point[1]&&to[1]===f.point[1]&&f.point[0]>Math.min(p[i][0],to[0])&&f.point[0]<Math.max(p[i][0],to[0])));
      return {scale:s.scale,gapWidth:s.gapWidth,inkAtCrossing,gapClippedAtHorizontalBend:s.gapWidth/2>=horizontalDistanceToBend};
    });
    const classification=roles.every(r=>r.internal&&r.fromGroup===roles[0].fromGroup)?'internal-switchgear-crossing':roles.some(r=>r.routeId==='whole:join:crushing-tie')?'inter-substation-ring-crossing':'external-feeder-crossing';
    return {index,routeIds:f.routeIds,segmentIndices:f.segmentIndices,point:f.point,roles,classification,horizontalRouteId:hid,horizontalDistanceToBend,verticalDistanceToBend,matchedRendererCrossings:matched.length,gapChecks,coverageVerified:matched.length>0&&gapChecks.every(g=>!g.inkAtCrossing)};
  });
  const report={schemaVersion:1,generatedAt:new Date().toISOString(),frames:frames.length,frameOverlaps,framePassages,unrelatedFramePassages:framePassages.filter(p=>p.classification==='unrelated-room-passage'),recordedCrossingCount:recorded.length,rendererCrossingCount:detected.length,crossingClassCounts:Object.fromEntries([...new Set(crossings.map(x=>x.classification))].map(k=>[k,crossings.filter(x=>x.classification===k).length])),crossings,drawnRouteDefects,summary:{crossingsWithMissingGap:crossings.filter(x=>!x.coverageVerified).length,crossingsWithGapClippedAtDetail:crossings.filter(x=>x.gapChecks.find(g=>g.scale===0.45).gapClippedAtHorizontalBend).length,drawnRouteDefects:drawnRouteDefects.length},limits:['A verified rendered gap proves distinct visual crossing, not owner acceptance or electrical correctness.','Very small overview scales can clip crossing gaps to bends, documented for each crossing.','Frame entry classification is by actual endpoint presentation ownership; unrelated passage is never waived by hierarchy.']};
  await writeFile('tmp/authored-review-audit.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({...report,crossings:undefined,framePassages:undefined,drawnRouteDefects:undefined},null,2));
}finally{await server.close();}
