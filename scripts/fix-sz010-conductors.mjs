import {readFile,writeFile} from 'node:fs/promises';
import {createServer} from 'vite';
const read=async p=>JSON.parse(await readFile(p,'utf8'));
const review=await read('src/models/site/reviewed-layout.json'),drawing=await read('src/models/site/authored-network.json'),audit=await read('tmp/conductor-before.json');
if(review.layoutRevision!=='authored-2026-11-06.5')throw Error('Expected owner layout .5.');
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {attachLineRoute,simplifyLineRoute}=await server.ssrLoadModule('/src/ui/line-routing.ts');
 const moved=[];
 const move=(id,target)=>{const old=audit.layout.assets[id],d=review.edits.assets[id]??[0,0];review.edits.assets[id]=[d[0]+target[0]-old[0],d[1]+target[1]-old[1]];moved.push(id);};
 for(const motor of ['01','02']){
  const base=`rm420:mc420:motor-${motor}`,rc=audit.layout.assets[`${base}:rc`],fc=audit.layout.assets[`${base}:fc`];
  const x=(rc[0]+fc[0])/2,joinY=Math.max(rc[1],fc[1])+440,motorY=joinY+1050;
  const output=`${base}:output`,identity=drawing.identities.assets.find(a=>a.id===output),terminal=identity.terminals[0];
  move(output,[x,motorY]);move(`${base}:es`,[x+600,joinY]);
  // The motor's single terminal belongs at its upper symbol port, not at its centre.
  const module=drawing.modules.find(m=>m.assetIds.includes(output));
  const center=module.layout.assets[output];module.layout.terminals[terminal]=[center[0],center[1]-120];
  for(const c of drawing.identities.connections.filter(c=>c.from===terminal||c.to===terminal)){
   const holder=drawing.modules.find(m=>m.routes[c.id]);const routes=holder?.routes??drawing.externalRoutes;
   const path=routes[c.id],from=c.from===terminal?module.layout.terminals[terminal]:path[0],to=c.to===terminal?module.layout.terminals[terminal]:path.at(-1);
   routes[c.id]=simplifyLineRoute(attachLineRoute(path,from,to));
  }
  const head=[x,motorY-120];
  for(const mode of ['rc','fc']){
   const id=`${base}:${mode}:contact-motor`,c=drawing.identities.connections.find(c=>c.id===id),start=audit.layout.terminals[c.from];
   review.lineRoutes[id]=simplifyLineRoute([start,[start[0],joinY],[x,joinY],head]);
  }
  review.lineRoutes[`${base}:es:branch`]=[head,[x,joinY],[x+600,joinY]];
 }
 // The D winding is left of Y and feeds the left-hand incomer; its old route
 // crossed to the Y side before doubling back over the Y conductor.
 for(const winding of ['d','y']){
  const id=`sw426:sw439:${winding}:lv-cable`,path=audit.wires.find(w=>w.id===id).path,start=path[0],end=path.at(-1);
  review.lineRoutes[id]=simplifyLineRoute([start,[end[0],start[1]],end]);
 }
 review.independentAssetPositions=[...new Set([...(review.independentAssetPositions??[]),...moved])];
 review.manualLineRoutes=[...new Set([...(review.manualLineRoutes??[]),...Object.keys(review.lineRoutes).filter(id=>id.startsWith('rm420:mc420:motor-')||id.startsWith('sw426:sw439:'))])];
 review.layoutRevision='authored-2026-11-06.6';drawing.layoutRevision=review.layoutRevision;
 await writeFile('src/models/site/reviewed-layout.json',JSON.stringify(review,null,2)+'\n');
 await writeFile('src/models/site/authored-network.json',JSON.stringify(drawing,null,2)+'\n');
 console.log(JSON.stringify({moved,layoutRevision:review.layoutRevision}));
}finally{await server.close();}
