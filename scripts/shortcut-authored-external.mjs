import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

// Bounded presentation-only cleanup of two already validated macro cable paths.
// Local entry/exit geometry and every other connection remain unchanged.
const read=async path=>JSON.parse(await readFile(path,'utf8'));
const sourcePath=process.argv.find(arg=>arg.startsWith('--source='))?.slice('--source='.length)??'src/models/site/authored-network.json';
const [artifact,report,placed]=await Promise.all([
  read(sourcePath),
  read('tmp/authored-external-top-down-candidate.json'),
  read('src/models/site/authored-placed-modules.json'),
]);
const selected=process.argv.find(arg=>arg.startsWith('--routes='))?.slice('--routes='.length).split(',') ?? ['whole:join:crushing-tie','mine:sw441:incoming:cable'];
const equal=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const on=(p,a,b)=>a[0]===b[0]?p[0]===a[0]&&p[1]>=Math.min(a[1],b[1])&&p[1]<=Math.max(a[1],b[1]):p[1]===a[1]&&p[0]>=Math.min(a[0],b[0])&&p[0]<=Math.max(a[0],b[0]);
const cuts=(a,b,r)=>a[0]===b[0]?a[0]>r.x&&a[0]<r.x+r.width&&Math.max(a[1],b[1])>r.y&&Math.min(a[1],b[1])<r.y+r.height:a[1]>r.y&&a[1]<r.y+r.height&&Math.max(a[0],b[0])>r.x&&Math.min(a[0],b[0])<r.x+r.width;
function wireClear(a,b,reserved){return reserved.every(route=>route.slice(1).every((d,i)=>{const c=route[i];
  if(a[0]===b[0]&&c[0]===d[0]&&a[0]===c[0])return Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1]))<Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]));
  if(a[1]===b[1]&&c[1]===d[1]&&a[1]===c[1])return Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0]))<Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]));
  return ![a,b].some(p=>on(p,c,d))&&![c,d].some(p=>on(p,a,b));
}));}
const simplify=points=>points.filter((p,i)=>!i||!equal(p,points[i-1])).filter((p,i,a)=>!i||i===a.length-1||!((a[i-1][0]===p[0]&&p[0]===a[i+1][0])||(a[i-1][1]===p[1]&&p[1]===a[i+1][1])));
const normalise=points=>{let result=points;for(;;){const next=simplify(result);if(next.length===result.length)return next;result=next;}};
// Erase a self-loop by retaining only existing segment portions either side
// of its intersection. This cannot add a new conductor or move an endpoint.
function eraseLoops(points) {
  for (;;) {
    let cut;
    for (let i=0;i<points.length-1&&!cut;i++) for(let j=i+2;j<points.length-1;j++) {
      const a=points[i],b=points[i+1],c=points[j],d=points[j+1];
      if((a[0]===b[0])===(c[0]===d[0]))continue;
      const p=a[0]===b[0]?[a[0],c[1]]:[c[0],a[1]];
      if(on(p,a,b)&&on(p,c,d)){cut={i,j,p};break;}
    }
    if(!cut)return normalise(points);
    points=normalise([...points.slice(0,cut.i+1),cut.p,...points.slice(cut.j+1)]);
  }
}
const length=points=>points.slice(1).reduce((n,p,i)=>n+Math.abs(p[0]-points[i][0])+Math.abs(p[1]-points[i][1]),0);
const boxes=placed.measuredGroups.map(r=>({...r,x:r.x-12,y:r.y-12,width:r.width+24,height:r.height+24}));
const changes=[];
function effectivePort(points, recorded, side) {
  if(points.some((p,i)=>i<points.length-1&&on(recorded,p,points[i+1])))return recorded;
  // Final join normalisation can cancel an artificial port detour. Recover
  // its effective position from the actual route on the same boundary plane.
  const axis=side==='north'||side==='south'?1:0;
  for(let i=1;i<points.length;i++) {
    const a=points[i-1],b=points[i];
    if(a[axis]===b[axis])continue;
    const p=axis===1?[a[0],recorded[1]]:[recorded[0],a[1]];
    if(on(p,a,b))return p;
  }
  throw Error('Recorded port boundary plane is absent from accepted route.');
}
for(const id of selected){
  const original=artifact.externalRoutes[id],recordedEntry=report.entries.find(e=>e.connectionId===id);
  const entry=recordedEntry?{...recordedEntry}:undefined;
  if(!original||!entry)throw Error(`Missing accepted route or port contract: ${id}`);
  entry.fromPort=effectivePort(original,entry.fromPort,entry.fromSide);
  entry.toPort=effectivePort([...original].reverse(),entry.toPort,entry.toSide);
  const points=original.map(p=>[...p]);
  for(const port of [entry.fromPort,entry.toPort])if(!points.some(p=>equal(p,port))){
    const i=points.findIndex((p,i)=>i<points.length-1&&on(port,p,points[i+1]));
    if(i<0)throw Error(`Port detached from accepted route: ${id}`);
    points.splice(i+1,0,[...port]);
  }
  const first=points.findIndex(p=>equal(p,entry.fromPort)),last=points.findIndex(p=>equal(p,entry.toPort));
  if(first>=last)throw Error(`Reversed macro boundaries: ${id}`);
  const prefix=points.slice(0,first+1),suffix=points.slice(last),macro=points.slice(first,last+1);
  const reserved=Object.entries(artifact.externalRoutes).filter(([other])=>other!==id).map(([,path])=>path);
  const clear=path=>path.slice(1).every((b,i)=>!boxes.some(r=>cuts(path[i],b,r))&&wireClear(path[i],b,reserved));
  const result=[macro[0]];
  for(let i=0;i<macro.length-1;){
    let chosen=[macro[i],macro[i+1]],next=i+1;
    for(let j=macro.length-1;j>i+1;j--){
      const a=macro[i],b=macro[j];
      const candidates=(a[0]===b[0]||a[1]===b[1])?[[a,b]]:[[a,[a[0],b[1]],b],[a,[b[0],a[1]],b]];
      const candidate=candidates.map(simplify).find(clear);
      if(candidate){chosen=candidate;next=j;break;}
    }
    result.push(...chosen.slice(1));i=next;
  }
  const shortened=simplify(result);
  if(!clear(shortened))throw Error(`Shortcut violates macro obstacles: ${id}`);
  if(shortened.length<macro.length){
    const joined=[...prefix,...shortened.slice(1,-1),...suffix];
    // The macro may approach the target port along its existing local lead.
    // Collapse that collinear join rather than drawing a doubled-back length.
    artifact.externalRoutes[id]=eraseLoops(joined);
    changes.push({id,oldMacroPoints:macro.length,newMacroPoints:shortened.length,oldMacroLength:length(macro),newMacroLength:length(shortened),fromPort:entry.fromPort,toPort:entry.toPort,localPrefixPreserved:true,localSuffixPreserved:true,collinearJoinNormalised:id==='mine:sw441:incoming:cable'});
  }else changes.push({id,oldMacroPoints:macro.length,newMacroPoints:macro.length,changed:false});
}
await writeFile('tmp/authored-network-shortcuts.json',JSON.stringify(artifact,null,2)+'\n');
const output={status:'candidate-not-promoted',changes,unchangedOtherRoutes:Object.keys(artifact.externalRoutes).length-selected.length,sourceArtifactSha256:createHash('sha256').update(await readFile(sourcePath)).digest('hex'),validation:'Macro rectangles and reserved-wire semantics checked; full combined audit remains required.'};
await writeFile('tmp/authored-shortcuts-report.json',JSON.stringify(output,null,2)+'\n');
console.log(JSON.stringify(output,null,2));
