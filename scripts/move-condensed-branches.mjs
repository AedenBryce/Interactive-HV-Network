import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const drawing=await read('src/models/site/authored-network.json');
const review=await read('docs/layout-versions/owner-layout-before-branch-moves-2026-11-06.json');
if(drawing.layoutRevision!=='authored-2026-11-06.3'||review.layoutRevision!==drawing.layoutRevision)throw Error('Branch move requires the saved condensed layout.');
const owners=new Map(drawing.identities.assets.flatMap(a=>a.terminals.map(t=>[t,a.id])));
const adjacency=new Map(drawing.identities.assets.map(a=>[a.id,new Set()]));
for(const c of drawing.identities.connections){const a=owners.get(c.from),b=owners.get(c.to);adjacency.get(a).add(b);adjacency.get(b).add(a);}
const tf04=new Set(['boundary:tf04']),queue=[...tf04];
for(const id of queue)for(const peer of adjacency.get(id))if(!tf04.has(peer)){tf04.add(peer);queue.push(peer);}
const hopper=new Set(drawing.identities.assets.filter(a=>a.id.startsWith('wh:h1:')||a.id.startsWith('wh:h3:')).map(a=>a.id));
const dx=id=>tf04.has(id)?5000:hopper.has(id)?-12000:0;
for(const a of drawing.identities.assets)if(dx(a.id)){
 const old=review.edits.assets[a.id]??[0,0];review.edits.assets[a.id]=[old[0]+dx(a.id),old[1]];
}
review.independentAssetPositions=[...new Set([...(review.independentAssetPositions??[]),...tf04,...hopper])];
for(const c of drawing.identities.connections){
 const a=dx(owners.get(c.from)),b=dx(owners.get(c.to)),path=review.lineRoutes?.[c.id];
 if(!path||!a&&!b)continue;
 if(a===b)review.lineRoutes[c.id]=path.map(p=>[p[0]+a,p[1]]);
 else{
  const start=[path[0][0]+a,path[0][1]],end=[path.at(-1)[0]+b,path.at(-1)[1]];
  const elbowY=24000;
  review.lineRoutes[c.id]=[start,[start[0],elbowY],[end[0],elbowY],end];
 }
}
const hopper3=review.lineRoutes['wh:h3:tf416a:input'];
if(hopper3){const start=hopper3[0],end=hopper3.at(-1);review.lineRoutes['wh:h3:tf416a:input']=[start,[start[0],28400],[end[0],28400],end];}
await writeFile('docs/layout-versions/authored-before-branch-moves-2026-11-06.json',JSON.stringify(drawing,null,2)+'\n');
drawing.layoutRevision='authored-2026-11-06.4';review.layoutRevision=drawing.layoutRevision;
await writeFile('src/models/site/authored-network.json',JSON.stringify(drawing,null,2)+'\n');
await writeFile('src/models/site/reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
console.log(JSON.stringify({tf04Assets:tf04.size,tf04Right:5000,hopperAssets:hopper.size,hopperLeft:12000}));
