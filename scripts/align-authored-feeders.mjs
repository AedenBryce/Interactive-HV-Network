import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const read = async p => JSON.parse(await readFile(p,'utf8'));
const [full, placed, ownership, plan] = await Promise.all([read('src/models/site/authored-network.json'),read('src/models/site/authored-placed-modules.json'),read('src/models/site/authored-ownership.json'),read('src/models/site/authored-placement.json')]);
const model = await read(ownership.baselineModelPath);
const shifts = {'crushing-1/lv':367.5,'crushing-2/hpgr-drives':576.25,'screening/lv':252.5,'stockpile/mv-drives':3331.25,'train-loading/lv':-848.75};
const modules = new Map(full.modules.map(m=>[m.id,m]));
const assetGroup = new Map(full.modules.flatMap(m=>m.assetIds.map(id=>[id,m.id])));
const terminalGroup = new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,assetGroup.get(a.id)])));
const candidate = structuredClone(full), shiftedPlaced=structuredClone(placed);
for(const [groupId,dx]of Object.entries(shifts)){
  const c=candidate.modules.find(m=>m.id===groupId),p=shiftedPlaced.modules.find(m=>m.id===groupId),b=shiftedPlaced.measuredGroups.find(m=>m.groupId===groupId);
  if(!c||!p||!b)throw Error(`Missing group ${groupId}`);
  c.origin[0]+=dx;p.origin[0]+=dx;b.x+=dx;
}
const overlap=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
const groupOverlaps=shiftedPlaced.measuredGroups.flatMap((a,i)=>shiftedPlaced.measuredGroups.slice(i+1).filter(b=>overlap(a,b)).map(b=>[a.groupId,b.groupId]));
if(groupOverlaps.length)throw Error(`Shifted measured bounds overlap: ${JSON.stringify(groupOverlaps)}`);
const newModules=new Map(candidate.modules.map(m=>[m.id,m]));
const point=t=>{const m=newModules.get(terminalGroup.get(t)),p=m.layout.terminals[t];return [p[0]+m.origin[0],p[1]+m.origin[1]];};
const changes=[],unsupported=[];
for(const [id,oldPoints]of Object.entries(full.externalRoutes)){
  const link=model.connections.find(c=>c.id===id),groups=[terminalGroup.get(link.from),terminalGroup.get(link.to)];
  if(!groups.some(g=>Object.hasOwn(shifts,g)))continue;
  const from=point(link.from),to=point(link.to),spec=plan.externalConnections.find(l=>l.connectionId===id);
  if(spec?.role!=='primary-display-link'||from[0]!==to[0]){unsupported.push({id,groups,from,to,role:spec?.role});continue;}
  candidate.externalRoutes[id]=[from,to];changes.push({id,groups,oldPoints,newPoints:[from,to]});
}
if(unsupported.length)throw Error(`Unexpected incident route requires review: ${JSON.stringify(unsupported)}`);
if(changes.length!==14)throw Error(`Expected 14 external feeders, found ${changes.length}`);
const localPayloadChanges=candidate.modules.filter(m=>JSON.stringify({...m,origin:[0,0]})!==JSON.stringify({...modules.get(m.id),origin:[0,0]})).map(m=>m.id);
if(localPayloadChanges.length)throw Error('Local module geometry changed');
const sha=v=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
const report={schemaVersion:1,source:'src/models/site/authored-network.json',sourceSha256:sha(full),candidateSha256:sha(candidate),shifts,groupOverlaps,localPayloadChanges,changedExternalRouteCount:changes.length,unchangedExternalRouteCount:Object.keys(full.externalRoutes).length-changes.length,changes,unsupported,limitations:['This candidate establishes only rigid geometric alignment and exact terminal attachment. Full collision/frame/gap audit is still required.','Physical shared source stems use existing modeled terminal identities; no model relation is added.']};
await writeFile('tmp/authored-network-aligned-feeders.json',JSON.stringify(candidate,null,2)+'\n');
await writeFile('tmp/authored-placed-aligned-feeders.json',JSON.stringify(shiftedPlaced,null,2)+'\n');
await writeFile('tmp/authored-aligned-feeders-report.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,changes:changes.map(({oldPoints,...rest})=>rest)},null,2));
