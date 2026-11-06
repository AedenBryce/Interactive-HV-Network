import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { switchroomMemberships } from './switchroom-frames';

it('audits the topology-staggered room placement candidate', () => {
  const model=currentNetworkModel; const layout=layoutTopDownFullNetwork(model,{placement:'topology-staggered'});
  const routes:GeometryRoute[]=[...layout.routes].map(([id,points])=>{const c=model.connections.find(x=>x.id===id)!;return{id,points:points.map(([x,y])=>[x,y] as [number,number]),terminals:[c.from,c.to]};});
  const findings=validateDiagramGeometry({routes,roomFrames:layout.roomFrames});
  const owner=new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a.id] as const)));
  const membership=new Map(switchroomMemberships(model).map(frame=>[frame.id,new Set(frame.memberAssetIds)]));
  const unrelated=findings.filter(f=>f.type==='route-room-frame').filter(f=>{const c=model.connections.find(x=>x.id===f.routeId)!;const m=membership.get(f.roomFrameId);return !m?.has(owner.get(c.from)!)&&!m?.has(owner.get(c.to)!);});
  const p=layout.roomFrames.find(f=>f.id==='sw411/overview')!, sw435=layout.roomFrames.find(f=>f.id==='crushing-2/sw435-hv')!, sw451=layout.roomFrames.find(f=>f.id==='train-loading/hv')!, rm721=layout.roomFrames.find(f=>f.id==='services/rm721')!;
  console.log(JSON.stringify({assets:Object.keys(layout.positions).length,connections:model.connections.length,routed:layout.routes.size,unresolved:layout.unresolved.length,stage:layout.routingStages,bounds:layout.bounds,aspect:+(layout.bounds.width/layout.bounds.height).toFixed(3),crossings:findings.filter(f=>f.type==='route-crossing').length,shared:findings.filter(f=>f.type==='shared-route-length').length,frameOverlaps:findings.filter(f=>f.type==='room-frame-overlap').length,frameCuts:findings.filter(f=>f.type==='route-room-frame').length,unrelatedFrameCuts:unrelated.length,selectedFrames:[p,sw435,sw451,rm721].map(f=>({id:f.id,x:f.x,y:f.y,w:f.width,h:f.height})),unresolvedIds:layout.unresolved},null,2));
}, 120_000);
