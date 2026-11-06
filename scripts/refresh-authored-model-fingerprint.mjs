import {createServer} from 'vite';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const canonical=v=>Array.isArray(v)?v.map(canonical):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,canonical(v[k])])):v;
const server=await createServer({configFile:false,server:{middlewareMode:true},appType:'custom'});
try{
 const {currentNetworkModel:model}=await server.ssrLoadModule('/src/models/site/current-network.ts');
 const {modelSchema}=await server.ssrLoadModule('/src/session/model.ts');modelSchema.parse(model);
 const file='src/models/site/authored-network.json',drawing=JSON.parse(await readFile(file,'utf8'));
 const {composeAuthoredSchematic}=await server.ssrLoadModule('/src/ui/authored-schematic.ts');composeAuthoredSchematic(model,drawing);
 drawing.modelFingerprint=createHash('sha256').update(JSON.stringify(canonical(model))).digest('hex');
 await writeFile(file,JSON.stringify(drawing,null,2)+'\n');console.log('Validated model and authored topology; refreshed fingerprint without changing coordinates.');
}finally{await server.close();}
