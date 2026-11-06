import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {resolve,sep,extname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';
const root=fileURLToPath(new URL('./app/',import.meta.url));
let port=Number(process.argv.find(a=>a.startsWith('--port='))?.slice(7)??8765);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid local port.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-cache');
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});res.end();return;}
 try{
  const pathname=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname);
  const file=resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(resolve(root)+sep)){res.writeHead(403);res.end();return;}
  if(!(await stat(file)).isFile()){res.writeHead(404);res.end();return;}
  const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[extname(file)]??'application/octet-stream','Content-Length':data.length});res.end(req.method==='HEAD'?undefined:data);
 }catch{res.writeHead(404);res.end('Not found');}
});
const lastPort=Math.min(port+99,65535);
server.on('error',error=>{
 if(error.code==='EADDRINUSE'&&port<lastPort){
  console.log(`Port ${port} is in use; trying ${port+1}…`);port++;server.listen(port,'127.0.0.1');return;
 }
 console.error(`Cannot start HV Network on port ${port}: ${error.message}`);process.exitCode=1;
});
server.on('listening',()=>{
 const url=`http://127.0.0.1:${port}/`;console.log(`HV NETWORK — FINAL OWNER LAYOUT .9\n${url}\nKeep this window open. Close it or press Ctrl+C to stop.`);
 if(process.argv.includes('--open')){
  try{
  const powershell=join(process.env.SystemRoot??'C:\\Windows','System32','WindowsPowerShell','v1.0','powershell.exe');
  const browser=spawn(powershell,['-NoProfile','-NonInteractive','-Command',`Start-Process -FilePath '${url}' -ErrorAction Stop`],{windowsHide:true,stdio:['ignore','ignore','pipe']});
  let failure='';browser.stderr.on('data',data=>{failure+=data.toString();});
  browser.on('error',()=>console.error(`Browser could not open automatically. Open this address manually: ${url}`));
  browser.on('close',code=>{if(code!==0)console.error(`Browser could not open automatically. Open this address manually: ${url}\n${failure.trim()}`);});
  }catch{console.error(`Browser could not open automatically. Open this address manually: ${url}`);}
 }
});
server.listen(port,'127.0.0.1');
process.on('SIGINT',()=>server.close(()=>process.exit(0)));
