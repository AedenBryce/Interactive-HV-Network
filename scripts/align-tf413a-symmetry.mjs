import {readFile,writeFile} from 'node:fs/promises';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const review=await read('src/models/site/reviewed-layout.json'),drawing=await read('src/models/site/authored-network.json'),audit=await read('tmp/pre-tf413a-audit.json');
if(review.layoutRevision!=='authored-2026-11-06.4')throw Error('Expected saved owner layout .4.');
const center=audit.layout.assets['rm413a:tf413a'];
const switches=['rm413a:ac-input-a:switch','rm413a:ac-input-b:switch'];
const switchY=switches.reduce((sum,id)=>sum+audit.layout.assets[id][1],0)/2;
const endpointY=switchY+600,offset=640,moves=new Map();
for(const [side,index]of [['a',-1],['b',1]])for(const part of ['switch','boundary']){
 const id=`rm413a:ac-input-${side}:${part}`,old=audit.layout.assets[id],target=[center[0]+index*offset,part==='switch'?switchY:endpointY],delta=[target[0]-old[0],target[1]-old[1]],edit=review.edits.assets[id]??[0,0];
 review.edits.assets[id]=[edit[0]+delta[0],edit[1]+delta[1]];moves.set(id,delta);
}
const owners=new Map(drawing.identities.assets.flatMap(a=>a.terminals.map(t=>[t,a.id])));
for(const c of drawing.identities.connections.filter(c=>c.id.startsWith('rm413a:ac-input-'))){
 const from=audit.layout.terminals[c.from],to=audit.layout.terminals[c.to],a=moves.get(owners.get(c.from))??[0,0],b=moves.get(owners.get(c.to))??[0,0];
 const start=[from[0]+a[0],from[1]+a[1]],end=[to[0]+b[0],to[1]+b[1]];
 review.lineRoutes[c.id]=c.id.endsWith(':winding-cable')?[start,[start[0],center[1]+240],[end[0],center[1]+240],end]:[start,end];
}
review.independentAssetPositions=[...new Set([...(review.independentAssetPositions??[]),...moves.keys()])];
review.framePaddingScale=.55;
review.layoutRevision='authored-2026-11-06.5';drawing.layoutRevision=review.layoutRevision;
await writeFile('src/models/site/reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
await writeFile('src/models/site/authored-network.json',JSON.stringify(drawing,null,2)+'\n');
console.log(JSON.stringify({center,switchY,endpointY,branchOffset:offset,movedAssets:moves.size}));
