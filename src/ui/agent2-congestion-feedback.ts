import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import type { Point } from './diagram-geometry';

/** Isolated placement feedback experiment; never used by the production UI. */
export function evaluateCongestionFeedback(model: NetworkModel) {
  const base=continuousNetwork(model);
  const baseline=layoutWholeGraphCandidate(model,{baseGeometry:base,routeBudget:'quick'});
  const basePositions=base.view.layout.assets;
  const roomDelta=new Map<string,Point>();
  for(const frame of baseline.frames){
    const assetId=frame.assetIds.find(id=>basePositions[id]&&baseline.positions[id])??frame.memberAssetIds.find(id=>basePositions[id]&&baseline.positions[id]);
    if(!assetId){roomDelta.set(frame.id,[0,0]);continue;}
    roomDelta.set(frame.id,[baseline.positions[assetId][0]-basePositions[assetId][0],baseline.positions[assetId][1]-basePositions[assetId][1]]);
  }
  const children=new Map(baseline.frames.map(frame=>[frame.id,new Set<string>()]));
  for(const [id,plan] of Object.entries(baseline.safePlan))for(const parent of plan.parents)if(parent.kind==='room'&&children.has(parent.id))children.get(parent.id)!.add(id);
  const roomCongestion=scoreRoomCongestion(model,baseline);
  const hotRoom=[...roomCongestion].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];
  const subtree=new Set<string>();
  if(hotRoom){const queue=[hotRoom];while(queue.length){const id=queue.pop()!;if(subtree.has(id))continue;subtree.add(id);queue.push(...(children.get(id)??[]));}}
  const upstreamIds=model.connections.filter(c=>base.treeEdgeIds.has(c.id)).filter(c=>{
    const ownerByTerminal=new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a.id] as const)));
    const a=baseline.roomOwnerByAsset.get(ownerByTerminal.get(c.from)??'');const b=baseline.roomOwnerByAsset.get(ownerByTerminal.get(c.to)??'');return a&&b&&a!==b;
  }).map(c=>c.id);
  const trials=[
    {id:'baseline',shift:[0,0] as Point},
    {id:'down-1200',shift:[0,1200] as Point},
    {id:'down-4000',shift:[0,4000] as Point},
    {id:'down-right-2500',shift:[2500,2500] as Point},
    {id:'down-left-2500',shift:[-2500,2500] as Point},
  ];
  const results=trials.map(trial=>{
    const roomTranslations=Object.fromEntries(baseline.frames.map(frame=>{
      const [dx,dy]=roomDelta.get(frame.id)??[0,0],inside=subtree.has(frame.id);
      return [frame.id,[dx+(inside?trial.shift[0]:0),dy+(inside?trial.shift[1]:0)] as Point];
    }));
    const candidate=trial.id==='baseline'?baseline:layoutWholeGraphCandidate(model,{baseGeometry:base,roomTranslations,routeBudget:'quick',prioritizeConnectionIds:upstreamIds});
    return {id:trial.id,score:scoreCandidate(model,candidate),candidate};
  });
  results.sort((a,b)=>compare(a.score,b.score)||a.id.localeCompare(b.id));
  const chosen=results[0];
  return {hotRoom,roomCongestion:Object.fromEntries(roomCongestion),movedSubtree:[...subtree],prioritizedCrossRoomTreeEdges:upstreamIds.length,trials:results.map(r=>({id:r.id,score:r.score,metrics:measure(model,r.candidate)})),chosen:chosen.id,chosenCandidate:chosen.candidate};
}

function scoreRoomCongestion(model:NetworkModel,candidate:ReturnType<typeof layoutWholeGraphCandidate>){
  const score=new Map(candidate.frames.map(frame=>[frame.id,0]));
  const owner=new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a.id] as const)));
  const add=(id:string|undefined,value:number)=>{if(id)score.set(id,(score.get(id)??0)+value);};
  for(const item of candidate.unresolved){const id=item.slice(0,item.lastIndexOf(':')),request=candidate.routeRequests.find(r=>r.id===id);if(!request)continue;add(candidate.roomOwnerByAsset.get(owner.get(request.fromTerminalId)??''),4);add(candidate.roomOwnerByAsset.get(owner.get(request.toTerminalId)??''),4);}
  for(const finding of candidate.findings)if(finding.type==='route-room-frame'){
    const connection=model.connections.find(c=>c.id===finding.routeId);if(!connection)continue;
    const a=candidate.roomOwnerByAsset.get(owner.get(connection.from)??''),b=candidate.roomOwnerByAsset.get(owner.get(connection.to)??'');
    if(finding.roomFrameId!==a&&finding.roomFrameId!==b)add(finding.roomFrameId,2);
    add(a,1);add(b,1);
  }
  for(const pair of candidate.contentBoxCollisions)for(const boxId of pair.split('↔')){const assetId=boxId.replace(/^(?:symbol|label):/,'');add(candidate.roomOwnerByAsset.get(assetId),2);}
  return score;
}

function scoreCandidate(model:NetworkModel,candidate:ReturnType<typeof layoutWholeGraphCandidate>){
  const m=measure(model,candidate);
  return [m.crossings,m.shared,m.endpointContacts,m.unrelatedFrameCuts,m.frameOverlaps,m.lineCardHits,m.contentCollisions,m.unresolved,m.aspectPenalty,m.area] as const;
}
function compare(a:readonly number[],b:readonly number[]){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??0)-(b[i]??0);if(d)return d;}return 0;}
function measure(model:NetworkModel,candidate:ReturnType<typeof layoutWholeGraphCandidate>){
  const owner=new Map(model.assets.flatMap(a=>a.terminals.map(t=>[t,a.id] as const))),connectionById=new Map(model.connections.map(c=>[c.id,c] as const));
  const frameCuts=candidate.findings.filter(f=>f.type==='route-room-frame');
  const unrelatedFrameCuts=frameCuts.filter(f=>{const c=connectionById.get(f.routeId)!;const a=candidate.roomOwnerByAsset.get(owner.get(c.from)??''),b=candidate.roomOwnerByAsset.get(owner.get(c.to)??'');return f.roomFrameId!==a&&f.roomFrameId!==b;});
  const lineCardHits=new Set<string>();
  for(const [id,path]of candidate.routes){const c=connectionById.get(id)!,ends=[owner.get(c.from),owner.get(c.to)];for(const box of candidate.symbolLabelBoxes){const asset=box.id.replace(/^(?:symbol|label):/,'');if(ends.includes(asset))continue;for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i];if(a[0]===b[0]?a[0]>=box.x&&a[0]<=box.x+box.width&&Math.max(Math.min(a[1],b[1]),box.y)<Math.min(Math.max(a[1],b[1]),box.y+box.height):a[1]===b[1]?a[1]>=box.y&&a[1]<=box.y+box.height&&Math.max(Math.min(a[0],b[0]),box.x)<Math.min(Math.max(a[0],b[0]),box.x+box.width):true)lineCardHits.add(`${id}:${box.id}`);}}}
  const w=candidate.bounds.width,h=candidate.bounds.height,aspect=w/h;
  return {assets:Object.keys(candidate.positions).length,connections:candidate.modelConnectionCount,routed:candidate.routeCount,unresolved:candidate.unresolved.length,unresolvedIds:candidate.unresolved,endpointRequests:candidate.routeRequests.length,detachedEndpoints:candidate.unresolved.length*2,crossings:candidate.findings.filter(f=>f.type==='route-crossing').length,shared:candidate.findings.filter(f=>f.type==='shared-route-length').length,endpointContacts:candidate.findings.filter(f=>f.type==='route-endpoint-on-interior').length,frameCuts:frameCuts.length,unrelatedFrameCuts:unrelatedFrameCuts.length,frameOverlaps:candidate.findings.filter(f=>f.type==='room-frame-overlap').length,contentCollisions:candidate.contentBoxCollisions.length,lineCardHits:lineCardHits.size,bounds:candidate.bounds,aspect,area:w*h,aspectPenalty:Math.abs(Math.log(aspect))};
}
