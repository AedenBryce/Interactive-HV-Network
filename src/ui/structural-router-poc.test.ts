import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutTopDownFullNetwork } from './top-down-full-network-prototype';
import { planOrthogonalRoutes, type RoutePoint, type ReservedRoute } from './orthogonal-route-planner';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import type { Point } from './diagram-geometry';
import { resolveAssetLabels } from './label-layout';
import type { AssetLabel } from './diagram-geometry';
import type { DiagramLayout } from '../session/presentation';
import { hasDeviceCard } from './equipment-appearance';
import { deviceCard } from './device-card';
import type { SwitchroomFrame } from './switchroom-frames';

describe('structural tree channel router POC', () => {
  it('preserves all model connections and measures topology channels plus visibility fallback', () => {
    const model = currentNetworkModel;
    const layout = layoutTopDownFullNetwork(model);
    const terminalOwner = new Map(model.assets.flatMap(a => a.terminals.map(t => [t, a.id] as const)));
    const adjacency = new Map(model.assets.map(a => [a.id, [] as { peer: string; routeId: string }[]]));
    for (const c of model.connections) {
      const a = terminalOwner.get(c.from), b = terminalOwner.get(c.to);
      if (a && b && a !== b) { adjacency.get(a)!.push({ peer: b, routeId: c.id }); adjacency.get(b)!.push({ peer: a, routeId: c.id }); }
    }
    const parent = new Map<string, string>(), visited = new Set<string>();
    const tree = layout.treeConnectionIds;
    const walk = (roots: string[]) => { const q = [...roots]; roots.forEach(x => visited.add(x)); for (let i=0;i<q.length;i++) for (const e of adjacency.get(q[i]) ?? []) if (!visited.has(e.peer)) { visited.add(e.peer); parent.set(e.peer,q[i]); q.push(e.peer); } };
    walk([...new Set(model.sources.map(s => s.assetId))]);
    for (const a of model.assets) if (!visited.has(a.id) && (adjacency.get(a.id)?.length ?? 0)) walk([a.id]);
    const frames = layout.roomFrames.map(({id,x,y,width,height}) => ({id:`room-frame:${id}`,x,y,width,height}));
    const busTaps = new Map<string, { terminal:string; points:RoutePoint[] }>();
    for (const r of layout.routeRequests) for (const terminal of [r.fromTerminalId,r.toTerminalId]) {
      const busId=terminalOwner.get(terminal); if(model.assets.find(a=>a.id===busId)?.kind!=='bus')continue;
      const point=terminal===r.fromTerminalId?r.from:r.to, entry=busTaps.get(busId!)??{terminal,points:[]};
      if(!entry.points.some(p=>p[0]===point[0]&&p[1]===point[1]))entry.points.push(point); busTaps.set(busId!,entry);
    }
    const busbars:GeometryRoute[]=[...busTaps].flatMap(([id,tap])=>{
      const ys=[...new Set(tap.points.map(p=>p[1]))];if(tap.points.length<2||ys.length!==1)return[];
      const xs=[...new Set(tap.points.map(p=>p[0]))].sort((a,b)=>a-b);if(xs.length<2)return[];
      return[{id:`busbar:${id}`,points:[[xs[0],ys[0]],[xs.at(-1)!,ys[0]]] as Point[],terminals:[tap.terminal,tap.terminal] as [string,string]}];
    });
    const measuredContentObstacles = (labels: ReadonlyMap<string, AssetLabel>) => model.assets.flatMap(asset => {
      const position = layout.positions[asset.id];
      if (!position) return [];
      const label = labels.get(asset.id);
      if (hasDeviceCard(asset) && label) {
        const card = deviceCard(asset, position, label);
        return [{ id: `symbol:${asset.id}`, x: position[0] + card.x, y: position[1] + card.y, width: card.width, height: card.height }];
      }
      return [
        { id: `symbol:${asset.id}`, x: position[0] - 38, y: position[1] - 38, width: 76, height: 76 },
        ...(label ? [{ id: `label:${asset.id}`, ...label }] : []),
      ];
    });
    const initialContentObstacles = measuredContentObstacles(layout.labels);
    const obstacles = [...initialContentObstacles, ...frames];
    const routeRequests = layout.routeRequests.map(r => {
      const fromAsset = terminalOwner.get(r.fromTerminalId)!, toAsset = terminalOwner.get(r.toTerminalId)!;
      const isParentFirst = parent.get(toAsset) === fromAsset;
      const ownFrame=layout.roomFrames.find(f=>f.memberAssetIds.includes(fromAsset));
      const otherFrame=layout.roomFrames.find(f=>f.memberAssetIds.includes(toAsset));
      const endpointFrames=layout.roomFrames.filter(f=>[r.from,r.to].some(([x,y])=>x>=f.x-18&&x<=f.x+f.width+18&&y>=f.y-18&&y<=f.y+f.height+18));
      const endpointBuses=[fromAsset,toAsset].filter(id=>model.assets.find(a=>a.id===id)?.kind==='bus');
      const ignoredObstacleIds=[...(r.ignoredObstacleIds??[]),...(ownFrame?[`room-frame:${ownFrame.id}`]:[]),...(otherFrame&&otherFrame!==ownFrame?[`room-frame:${otherFrame.id}`]:[]),...endpointFrames.map(f=>`room-frame:${f.id}`),...endpointBuses.map(id=>`busbar:${id}`)];
      let preferredPath: RoutePoint[] | undefined;
      if (tree.has(r.id)) {
        const routeUpstream=isParentFirst?r.from:r.to,routeDownstream=isParentFirst?r.to:r.from;
        const midY = routeUpstream[1] + Math.max(24, (routeDownstream[1] - routeUpstream[1]) / 2);
        const parentIsBus = model.assets.find(a=>a.id===(isParentFirst?fromAsset:toAsset))?.kind==='bus';
        preferredPath = parentIsBus && routeUpstream[0]===routeDownstream[0] ? [routeUpstream,routeDownstream] : routeUpstream[1] <= routeDownstream[1]
          ? [routeUpstream, [routeUpstream[0], midY], [routeDownstream[0], midY], routeDownstream]
          : [routeUpstream, [routeUpstream[0] + 96, routeUpstream[1]], [routeUpstream[0] + 96, routeDownstream[1] - 48], [routeDownstream[0], routeDownstream[1] - 48], routeDownstream];
        if (!isParentFirst) preferredPath.reverse();
      }
      return {...r,ignoredObstacleIds,preferredPath,order:tree.has(r.id)?0:1};
    });
    const finalRequestById = new Map(routeRequests.map(r=>[r.id,r] as const));
    const accepted = new Map<string, readonly RoutePoint[]>(), unresolved: string[] = [], reserved: ReservedRoute[] = [];
    // Selected forest edges first; each preferred path is the allocated parent-child channel.
    // The planner validates the channel against hard symbols/labels/frames and prior reservations.
    const treePlan = planOrthogonalRoutes(routeRequests.filter(r=>tree.has(r.id)), {obstacles, clearance:18, localSearchPadding:320, maxLocalSearchPadding:2560, maxSearchAttempts:4, maxGridNodes:30000, bendPenalty:80});
    for (const [id,points] of treePlan.routes) { accepted.set(id,points); const r=finalRequestById.get(id)!; reserved.push({id,points,fromTerminalId:r.fromTerminalId,toTerminalId:r.toTerminalId}); }
    unresolved.push(...treePlan.unresolved.map(x=>`${x.routeId}:${x.reason}`));
    // Explicit non-tree edges follow the selected presentation forest.
    const nonTree = routeRequests.filter(r=>!tree.has(r.id));
    const cyclePlan = planOrthogonalRoutes(nonTree,{obstacles,reservedRoutes:reserved,clearance:18,localSearchPadding:640,maxLocalSearchPadding:5120,maxSearchAttempts:4,maxGridNodes:30000,bendPenalty:120});
    for (const [id,points] of cyclePlan.routes) {accepted.set(id,points);const r=finalRequestById.get(id)!;reserved.push({id,points,fromTerminalId:r.fromTerminalId,toTerminalId:r.toTerminalId});}
    unresolved.push(...cyclePlan.unresolved.map(x=>`${x.routeId}:${x.reason}`));
    // Sparse rectilinear visibility graph fallback only for grid-cap failures.
    // It uses obstacle corners instead of the planner's Cartesian x×y grid.
    const unresolvedById=new Map([...treePlan.unresolved,...cyclePlan.unresolved].map(x=>[x.routeId,x.reason] as const));
    const sparseAttempts:string[]=[];
    for(const r of routeRequests.filter(r=>['grid-too-large','no-path'].includes(unresolvedById.get(r.id)??''))){
      const path=sparseVisibilityPath(r,obstacles.filter(o=>!r.ignoredObstacleIds?.includes(o.id)),reserved,18);
      if(!path)continue;
      accepted.set(r.id,path);reserved.push({id:r.id,points:path,fromTerminalId:r.fromTerminalId,toTerminalId:r.toTerminalId});sparseAttempts.push(r.id);
    }
    const busDirectAttempts:string[]=[];
    for(const r of routeRequests.filter(r=>unresolvedById.has(r.id)&&!accepted.has(r.id))){
      const fromAsset=terminalOwner.get(r.fromTerminalId),toAsset=terminalOwner.get(r.toTerminalId);
      const fromIsBus=model.assets.find(a=>a.id===fromAsset)?.kind==='bus',toIsBus=model.assets.find(a=>a.id===toAsset)?.kind==='bus';
      if(fromIsBus===toIsBus)continue;
      const path=directBusTapPath(r,fromIsBus,obstacles,reserved,18);if(!path)continue;
      accepted.set(r.id,path);reserved.push({id:r.id,points:path,fromTerminalId:r.fromTerminalId,toTerminalId:r.toTerminalId});busDirectAttempts.push(r.id);
    }
    // Transactional rip-up-and-reroute: if a remaining edge has no legal path,
    // release only nearby reservations, route it, then restore every released
    // edge around the new reservation. Commit only a complete no-collision
    // replacement; otherwise the original routing remains unchanged.
    const ripUpAttempts:string[]=[];
    const ripUpSuccess:string[]=[];
    const ripUpRequests=routeRequests.filter(r=>unresolvedById.has(r.id)&&!accepted.has(r.id))
      .sort((a,b)=>manhattan(b.from,b.to)-manhattan(a.from,a.to)||a.id.localeCompare(b.id));
    for(const request of ripUpRequests){
      ripUpAttempts.push(request.id);
      const window={left:Math.min(request.from[0],request.to[0])-2400,right:Math.max(request.from[0],request.to[0])+2400,top:Math.min(request.from[1],request.to[1])-2400,bottom:Math.max(request.from[1],request.to[1])+2400};
      const nearby=reserved.filter(route=>routeTouchesWindow(route.points,window))
        .sort((a,b)=>routeDistanceFromWindow(a.points,window)-routeDistanceFromWindow(b.points,window)||routeLength(a.points)-routeLength(b.points)||a.id.localeCompare(b.id));
      const releaseCounts=[...new Set([1,2,4,8,16,32,nearby.length].filter(count=>count>0&&count<=nearby.length))];
      for(const releaseCount of releaseCounts){
        const released=nearby.slice(0,releaseCount);
        const releasedIds=new Set(released.map(route=>route.id));
        const candidateReservations=reserved.filter(route=>!releasedIds.has(route.id));
        const candidatePath=sparseVisibilityPath(request,obstacles.filter(o=>!request.ignoredObstacleIds?.includes(o.id)),candidateReservations,18);
        if(!candidatePath)continue;
        const tentative=[...candidateReservations,{id:request.id,points:candidatePath,fromTerminalId:request.fromTerminalId,toTerminalId:request.toTerminalId}];
        const restored=new Map<string,readonly RoutePoint[]>();
        let complete=true;
        const displacedRequests=released.map(route=>finalRequestById.get(route.id)!).sort((a,b)=>manhattan(a.from,a.to)-manhattan(b.from,b.to)||a.id.localeCompare(b.id));
        for(const displaced of displacedRequests){
          const restoredPath=sparseVisibilityPath(displaced,obstacles.filter(o=>!displaced.ignoredObstacleIds?.includes(o.id)),tentative,18);
          if(!restoredPath){complete=false;break;}
          restored.set(displaced.id,restoredPath);
          tentative.push({id:displaced.id,points:restoredPath,fromTerminalId:displaced.fromTerminalId,toTerminalId:displaced.toTerminalId});
        }
        if(!complete)continue;
        accepted.set(request.id,candidatePath);
        for(const [id,path] of restored)accepted.set(id,path);
        reserved.splice(0,reserved.length,...tentative);
        ripUpSuccess.push(request.id);
        break;
      }
    }
    const fallbackSucceeded=new Set([...sparseAttempts,...busDirectAttempts,...ripUpSuccess]);for(let i=unresolved.length-1;i>=0;i--)if(fallbackSucceeded.has(unresolved[i].slice(0,unresolved[i].lastIndexOf(':'))))unresolved.splice(i,1);
    const connections = new Map(model.connections.map(c=>[c.id,c] as const));
    const resolvedLabels = new Map([...layout.labels].map(([id, label]) => [id, { ...label }] as const));
    const resolveLabels = () => {
      const routeMap = new Map<string, Point[]>([...accepted].map(([id, points]) => [id, points.map(([x, y]) => [x, y] as Point)]));
      resolveAssetLabels(model.assets, { assets: layout.positions } as DiagramLayout, resolvedLabels as Map<string, AssetLabel>, routeMap, layout.roomFrames as SwitchroomFrame[], new Set());
    };
    const contentHits = () => {
      const hits = new Set<string>();
      for (const [routeId, points] of accepted) {
        const request = finalRequestById.get(routeId)!;
        const endpointOwners = [terminalOwner.get(request.fromTerminalId), terminalOwner.get(request.toTerminalId)];
        const boxes = measuredContentObstacles(resolvedLabels).filter(box => !box.id.startsWith('symbol:')
          || !endpointOwners.includes(box.id.slice('symbol:'.length)));
        for (const box of boxes) for (let i = 1; i < points.length; i++) if (cuts([points[i - 1][0], points[i - 1][1]], [points[i][0], points[i][1]], box)) hits.add(`${routeId}->${box.id}`);
      }
      return hits;
    };
    const labelRepairAttempts: string[] = [];
    const labelRepairSuccess: string[] = [];
    // Alternate label placement with route repair. Each accepted route is
    // checked against the complete current symbol/label set; displaced routes
    // stay reserved and the candidate is rejected if a legal replacement path
    // cannot be found.
    for (let pass = 0; pass < 2; pass++) {
      resolveLabels();
      const currentHits = contentHits();
      const unresolvedIdsForPass = new Set(unresolved.map(value => value.slice(0, value.lastIndexOf(':'))));
      const repairIds = new Set([...currentHits].map(value => value.slice(0, value.indexOf('->'))));
      for (const id of unresolvedIdsForPass) repairIds.add(id);
      const repairRequests = routeRequests.filter(request => repairIds.has(request.id))
        .sort((a, b) => manhattan(b.from, b.to) - manhattan(a.from, a.to) || a.id.localeCompare(b.id));
      for (const request of repairRequests) {
        labelRepairAttempts.push(`${pass}:${request.id}`);
        const retained = reserved.filter(route => route.id !== request.id);
        const ignored = new Set(request.ignoredObstacleIds ?? []);
        const obstaclesWithLabels = [...measuredContentObstacles(resolvedLabels), ...frames];
        const candidate = sparseVisibilityPath(request, obstaclesWithLabels.filter(obstacle => !ignored.has(obstacle.id)), retained, 18);
        if (!candidate) continue;
        accepted.set(request.id, candidate);
        reserved.splice(0, reserved.length, ...retained, { id: request.id, points: candidate, fromTerminalId: request.fromTerminalId, toTerminalId: request.toTerminalId });
        labelRepairSuccess.push(`${pass}:${request.id}`);
        for (let i = unresolved.length - 1; i >= 0; i--) if (unresolved[i].slice(0, unresolved[i].lastIndexOf(':')) === request.id) unresolved.splice(i, 1);
      }
    }
    resolveLabels();
    const routes: GeometryRoute[] = [...accepted].map(([id,points])=>{const c=connections.get(id)!;return{id,points:points.map(p=>[p[0],p[1]] as Point),terminals:[c.from,c.to]};});
    const routeLabelHits = new Set<string>();
    for (const route of routes) {
      for (const [assetId, label] of resolvedLabels) {
        if (hasDeviceCard(model.assets.find(asset => asset.id === assetId)!)) continue;
        for (let i = 1; i < route.points.length; i++) if (cuts(route.points[i - 1], route.points[i], label)) routeLabelHits.add(`${route.id}->${assetId}`);
      }
    }
    const findings = validateDiagramGeometry({routes,roomFrames:layout.roomFrames});
    const busbarLabelHits=new Set<string>();
    for(const bar of busbars)for(const box of measuredContentObstacles(resolvedLabels)){const ownerId=box.id.replace(/^(symbol|label):/,'');if(ownerId===bar.id.slice('busbar:'.length))continue;if(cuts(bar.points[0],bar.points[1],box))busbarLabelHits.add(`${bar.id}->${box.id}`);}
    const hitSet=new Set<string>();
    for(const route of routes){const c=connections.get(route.id)!,owners=[terminalOwner.get(c.from),terminalOwner.get(c.to)];for(const box of measuredContentObstacles(resolvedLabels)){const boxOwner=box.id.replace(/^(symbol|label):/,'');if(owners.includes(boxOwner))continue;for(let i=1;i<route.points.length;i++)if(cuts(route.points[i-1],route.points[i],box))hitSet.add(`${route.id}->${box.id}`);}}
    const frameFindings=findings.filter(f=>f.type==='route-room-frame');
    const frameCutDetails=frameFindings.map(f=>{const r=finalRequestById.get(f.routeId)!,a=terminalOwner.get(r.fromTerminalId),b=terminalOwner.get(r.toTerminalId),room=layout.roomFrames.find(x=>x.id===f.roomFrameId)!;const endpointInside=[r.from,r.to].some(([x,y])=>x>=room.x&&x<=room.x+room.width&&y>=room.y&&y<=room.y+room.height);return{routeId:f.routeId,frameId:f.roomFrameId,relation:f.relation,point:f.point,fromAsset:a,toAsset:b,endpointInside,frameOwnsEndpoint:room.memberAssetIds.includes(a!)||room.memberAssetIds.includes(b!)};});
    const unrelatedFrameCuts=frameCutDetails.filter(f=>!f.frameOwnsEndpoint&&!f.endpointInside);
    const endpointBlockers=unresolved.filter(x=>x.endsWith(':blocked-endpoint')).map(x=>{const id=x.slice(0,x.lastIndexOf(':'));const r=finalRequestById.get(id)!;const ignored=new Set(r.ignoredObstacleIds??[]);const blocked=(['from','to'] as const).flatMap(end=>{const p=end==='from'?r.from:r.to;return obstacles.filter(o=>!ignored.has(o.id)&&p[0]>=o.x-18&&p[0]<=o.x+o.width+18&&p[1]>=o.y-18&&p[1]<=o.y+o.height+18).map(o=>`${end}:${o.id}`);});return{id,blocked};});
    const joinIds=['whole:join:rm721','whole:join:sw421','whole:join:sw426','whole:join:sw431','whole:join:sw435','whole:join:sw451','whole:join:sw454'];
    const joinDetails=joinIds.map(id=>{const r=finalRequestById.get(id)!;return{id,routed:accepted.has(id),reason:unresolved.find(x=>x.startsWith(`${id}:`))?.split(':').at(-1)??null,from:[r.fromTerminalId,terminalOwner.get(r.fromTerminalId),r.from],to:[r.toTerminalId,terminalOwner.get(r.toTerminalId),r.to],manhattan:Math.abs(r.from[0]-r.to[0])+Math.abs(r.from[1]-r.to[1])};});
    const routePoints=[...routes.flatMap(r=>r.points),...busbars.flatMap(r=>r.points)];
    const routeBounds=routePoints.length?{x:Math.min(...routePoints.map(p=>p[0])),y:Math.min(...routePoints.map(p=>p[1])),width:Math.max(...routePoints.map(p=>p[0]))-Math.min(...routePoints.map(p=>p[0])),height:Math.max(...routePoints.map(p=>p[1]))-Math.min(...routePoints.map(p=>p[1]))}:null;
    console.log(JSON.stringify({assets:model.assets.length,connections:model.connections.length,roots:new Set(model.sources.map(s=>s.assetId)).size,treeEdges:tree.size,nonTreeEdges:model.connections.length-tree.size,placed:accepted.size,treePlaced:[...accepted.keys()].filter(id=>tree.has(id)).length,cyclesPlaced:[...accepted.keys()].filter(id=>!tree.has(id)).length,sparseAttempts,busDirectAttempts,ripUpAttempts,ripUpSuccess,labelRepairAttempts,labelRepairSuccess,endpointIdsPreserved:routes.length===accepted.size&&routes.every(r=>{const c=connections.get(r.id)!;return r.terminals?.[0]===c.from&&r.terminals?.[1]===c.to;}),busbars:busbars.length,busTapCounts:[...busTaps].map(([id,t])=>({id,taps:new Set(t.points.map(p=>p[0])).size})),busbarCardHits:busbarLabelHits.size,unresolved:unresolved.length,unresolvedReasons:unresolved.reduce((o,x)=>{const k=x.split(':').at(-1)!;o[k]=(o[k]??0)+1;return o;},{} as Record<string,number>),crossings:findings.filter(f=>f.type==='route-crossing').length,shared:findings.filter(f=>f.type==='shared-route-length').length,endpointContacts:findings.filter(f=>f.type==='route-endpoint-on-interior').length,frameCuts:frameFindings.length,unrelatedFrameCuts:unrelatedFrameCuts.length,frameCutDetails:frameCutDetails.filter(f=>!f.frameOwnsEndpoint),frameOverlaps:findings.filter(f=>f.type==='room-frame-overlap').length,cardHits:hitSet.size,postRouteLabelHits:routeLabelHits.size,postRouteLabelHitSamples:[...routeLabelHits].slice(0,20),endpointBlockers,joins:joinDetails,bounds:layout.bounds,routeBounds,unresolvedIds:unresolved}));
  },240000);
});

function cuts(a:Point,b:Point,box:{x:number;y:number;width:number;height:number}){if(a[0]===b[0])return a[0]>=box.x&&a[0]<=box.x+box.width&&Math.max(Math.min(a[1],b[1]),box.y)<Math.min(Math.max(a[1],b[1]),box.y+box.height);if(a[1]===b[1])return a[1]>=box.y&&a[1]<=box.y+box.height&&Math.max(Math.min(a[0],b[0]),box.x)<Math.min(Math.max(a[0],b[0]),box.x+box.width);return true;}

function manhattan(a:RoutePoint,b:RoutePoint){return Math.abs(a[0]-b[0])+Math.abs(a[1]-b[1]);}
function routeLength(points:readonly RoutePoint[]){return points.slice(1).reduce((sum,p,i)=>sum+manhattan(points[i],p),0);}
function routeTouchesWindow(points:readonly RoutePoint[],window:{left:number;right:number;top:number;bottom:number}){return points.slice(1).some((p,i)=>{const q=points[i];return Math.max(Math.min(p[0],q[0]),window.left)<=Math.min(Math.max(p[0],q[0]),window.right)&&Math.max(Math.min(p[1],q[1]),window.top)<=Math.min(Math.max(p[1],q[1]),window.bottom);});}
function routeDistanceFromWindow(points:readonly RoutePoint[],window:{left:number;right:number;top:number;bottom:number}){return points.reduce((best,p)=>Math.min(best,Math.max(window.left-p[0],0,p[0]-window.right)+Math.max(window.top-p[1],0,p[1]-window.bottom)),Infinity);}

function directBusTapPath(request:ReturnType<typeof layoutTopDownFullNetwork>['routeRequests'][number],fromIsBus:boolean,obstacles:readonly {id:string;x:number;y:number;width:number;height:number}[],reserved:readonly ReservedRoute[],clearance:number):RoutePoint[]|undefined{
  const bus=fromIsBus?request.from:request.to,device=fromIsBus?request.to:request.from;
  const candidates:RoutePoint[][]=[[bus,[bus[0],device[1]],device],[bus,[device[0],bus[1]],device]];
  const ignored=new Set(request.ignoredObstacleIds??[]),clearPath=(path:RoutePoint[])=>{
    for(let i=1;i<path.length;i++){
      const a=path[i-1],b=path[i];if(a[0]===b[0]&&a[1]===b[1])continue;
      for(const o of obstacles)if(!ignored.has(o.id)&&cuts(a as Point,b as Point,{x:o.x-clearance,y:o.y-clearance,width:o.width+2*clearance,height:o.height+2*clearance}))return false;
      for(const rr of reserved)for(let j=1;j<rr.points.length;j++)if(segmentsConflict(a,b,rr.points[j-1],rr.points[j],request,rr))return false;
    }
    return true;
  };
  for(const candidate of candidates){const path=fromIsBus?candidate:[...candidate].reverse();const compact=path.filter((p,i)=>i===0||i===path.length-1||!((p[0]===path[i-1][0]&&p[0]===path[i+1][0])||(p[1]===path[i-1][1]&&p[1]===path[i+1][1])));if(clearPath(compact))return compact;}
  return undefined;
}

function segmentsConflict(a:RoutePoint,b:RoutePoint,c:RoutePoint,d:RoutePoint,request:ReturnType<typeof layoutTopDownFullNetwork>['routeRequests'][number],reserved:ReservedRoute):boolean{
  const vertical=a[0]===b[0],otherVertical=c[0]===d[0];let point:RoutePoint|undefined;
  if(vertical&&otherVertical){if(a[0]!==c[0])return false;if(Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))<Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))return true;if(Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))!==Math.min(Math.max(a[1],b[1]),Math.max(c[1],d[1])))return false;point=[a[0],Math.max(Math.min(a[1],b[1]),Math.min(c[1],d[1]))];}
  else if(!vertical&&!otherVertical){if(a[1]!==c[1])return false;if(Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))<Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0])))return true;if(Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0]))!==Math.min(Math.max(a[0],b[0]),Math.max(c[0],d[0])))return false;point=[Math.max(Math.min(a[0],b[0]),Math.min(c[0],d[0])),a[1]];}
  else{const v=vertical?[a,b]:[c,d],h=vertical?[c,d]:[a,b];if(v[0][0]<Math.min(h[0][0],h[1][0])||v[0][0]>Math.max(h[0][0],h[1][0])||h[0][1]<Math.min(v[0][1],v[1][1])||h[0][1]>Math.max(v[0][1],v[1][1]))return false;point=[v[0][0],h[0][1]];}
  if(!point)return false;
  const requestTerminal=(p:RoutePoint)=>p[0]===request.from[0]&&p[1]===request.from[1]?request.fromTerminalId:p[0]===request.to[0]&&p[1]===request.to[1]?request.toTerminalId:undefined;
  const reservedTerminal=(p:RoutePoint)=>p[0]===reserved.points[0][0]&&p[1]===reserved.points[0][1]?reserved.fromTerminalId:p[0]===reserved.points.at(-1)![0]&&p[1]===reserved.points.at(-1)![1]?reserved.toTerminalId:undefined;
  return requestTerminal(point)!==reservedTerminal(point)||requestTerminal(point)===undefined;
}

function sparseVisibilityPath(request:ReturnType<typeof layoutTopDownFullNetwork>['routeRequests'][number],obstacles:readonly {id:string;x:number;y:number;width:number;height:number}[],reserved:readonly ReservedRoute[],clearance:number):RoutePoint[]|undefined{
  const margin=clearance+2,lowX=Math.min(request.from[0],request.to[0])-4000,highX=Math.max(request.from[0],request.to[0])+4000,lowY=Math.min(request.from[1],request.to[1])-4000,highY=Math.max(request.from[1],request.to[1])+4000;
  const boxes=obstacles.filter(b=>b.x+b.width>=lowX&&b.x<=highX&&b.y+b.height>=lowY&&b.y<=highY).map(b=>({left:b.x-margin,right:b.x+b.width+margin,top:b.y-margin,bottom:b.y+b.height+margin}));
  const nodes:RoutePoint[]=[request.from,request.to],add=(x:number,y:number)=>{if(x>=lowX&&x<=highX&&y>=lowY&&y<=highY&&!nodes.some(p=>p[0]===x&&p[1]===y))nodes.push([x,y]);};
  for(const b of boxes){add(b.left,b.top);add(b.left,b.bottom);add(b.right,b.top);add(b.right,b.bottom);}
  const inside=(p:RoutePoint,b:{left:number;right:number;top:number;bottom:number})=>p[0]>b.left&&p[0]<b.right&&p[1]>b.top&&p[1]<b.bottom;
  // Connect arbitrary terminals to the corner graph with axis-aligned
  // projections; otherwise endpoint coordinates rarely coincide with corners.
  const cornerXs=[...new Set(nodes.slice(2).map(p=>p[0]))],cornerYs=[...new Set(nodes.slice(2).map(p=>p[1]))];
  for(const x of cornerXs){for(const y of [request.from[1],request.to[1]])if(!boxes.some(b=>inside([x,y],b)))add(x,y);}
  for(const y of cornerYs){for(const x of [request.from[0],request.to[0]])if(!boxes.some(b=>inside([x,y],b)))add(x,y);}
  const blockedByBox=(a:RoutePoint,b:RoutePoint)=>boxes.some(o=>a[0]===b[0]?a[0]>o.left&&a[0]<o.right&&Math.max(Math.min(a[1],b[1]),o.top)<Math.min(Math.max(a[1],b[1]),o.bottom):a[1]===b[1]?a[1]>o.top&&a[1]<o.bottom&&Math.max(Math.min(a[0],b[0]),o.left)<Math.min(Math.max(a[0],b[0]),o.right):true);
  const blockedByRoute=(a:RoutePoint,b:RoutePoint,route:ReservedRoute)=>route.points.slice(1).some((q,i)=>{
    const p=route.points[i],vertical=a[0]===b[0],otherVertical=p[0]===q[0];
    if(vertical&&otherVertical){if(a[0]!==p[0])return false;return Math.max(Math.min(a[1],b[1]),Math.min(p[1],q[1]))<Math.min(Math.max(a[1],b[1]),Math.max(p[1],q[1]));}
    if(!vertical&&!otherVertical){if(a[1]!==p[1])return false;return Math.max(Math.min(a[0],b[0]),Math.min(p[0],q[0]))<Math.min(Math.max(a[0],b[0]),Math.max(p[0],q[0]));}
    const point:RoutePoint=vertical?[a[0],p[1]]:[p[0],a[1]];
    const hit=vertical?point[0]>=Math.min(p[0],q[0])&&point[0]<=Math.max(p[0],q[0])&&point[1]>=Math.min(a[1],b[1])&&point[1]<=Math.max(a[1],b[1]):point[0]>=Math.min(a[0],b[0])&&point[0]<=Math.max(a[0],b[0])&&point[1]>=Math.min(p[1],q[1])&&point[1]<=Math.max(p[1],q[1]);
    if(!hit)return false;
    const endpointMatch=(at:RoutePoint,terminal:string)=>{
      const candidate=(at[0]===request.from[0]&&at[1]===request.from[1]&&terminal===request.fromTerminalId)||(at[0]===request.to[0]&&at[1]===request.to[1]&&terminal===request.toTerminalId);
      const onReserved=(at[0]===route.points[0][0]&&at[1]===route.points[0][1]&&terminal===route.fromTerminalId)||(at[0]===route.points.at(-1)![0]&&at[1]===route.points.at(-1)![1]&&terminal===route.toTerminalId);
      return candidate&&onReserved;
    };
    return !endpointMatch(point,request.fromTerminalId)&&!endpointMatch(point,request.toTerminalId);
  });
  const clear=(a:RoutePoint,b:RoutePoint)=>!blockedByBox(a,b)&&!reserved.some(r=>blockedByRoute(a,b,r));
  if(boxes.some(b=>inside(request.from,b)||inside(request.to,b)))return undefined;
  const adj=nodes.map(()=>[] as {to:number;len:number;dir:1|2}[]),byX=new Map<number,number[]>(),byY=new Map<number,number[]>();
  nodes.forEach(([x,y],i)=>{const xs=byX.get(x)??[];xs.push(i);byX.set(x,xs);const ys=byY.get(y)??[];ys.push(i);byY.set(y,ys);});
  const join=(a:number,b:number,dir:1|2)=>{const p=nodes[a],q=nodes[b];if(!clear(p,q))return;const len=Math.abs(p[0]-q[0])+Math.abs(p[1]-q[1]);adj[a].push({to:b,len,dir});adj[b].push({to:a,len,dir});};
  for(const ids of byX.values()){ids.sort((a,b)=>nodes[a][1]-nodes[b][1]);for(let i=1;i<ids.length;i++)join(ids[i-1],ids[i],1);}
  for(const ids of byY.values()){ids.sort((a,b)=>nodes[a][0]-nodes[b][0]);for(let i=1;i<ids.length;i++)join(ids[i-1],ids[i],2);}
  const n=nodes.length,start=0,goal=1,dist=new Float64Array(n*3).fill(Infinity),prev=new Int32Array(n*3).fill(-1),heap:{s:number;cost:number}[]=[];
  const push=(item:{s:number;cost:number})=>{heap.push(item);let i=heap.length-1;while(i){const p=(i-1)>>1;if(heap[p].cost<=item.cost)break;heap[i]=heap[p];i=p;}heap[i]=item;};
  const pop=()=>{const top=heap[0],last=heap.pop()!;if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].cost<heap[c].cost)c++;if(heap[c].cost>=last.cost)break;heap[i]=heap[c];i=c;}heap[i]=last;}return top;};
  dist[start*3]=0;push({s:start*3,cost:0});let end=-1;
  while(heap.length){const cur=pop();if(cur.cost!==dist[cur.s])continue;const node=Math.floor(cur.s/3),dir=(cur.s%3) as 0|1|2;if(node===goal){end=cur.s;break;}for(const e of adj[node]){const ns=e.to*3+e.dir,cost=cur.cost+e.len+(dir&&dir!==e.dir?100:0);if(cost<dist[ns]){dist[ns]=cost;prev[ns]=cur.s;push({s:ns,cost});}}}
  if(end<0)return undefined;const path:RoutePoint[]=[];for(let s=end;s>=0;s=prev[s]){path.push(nodes[Math.floor(s/3)]);if(s===start*3)break;}path.reverse();const compact=path.filter((p,i)=>i===0||i===path.length-1||!((p[0]===path[i-1][0]&&p[0]===path[i+1][0])||(p[1]===path[i-1][1]&&p[1]===path[i+1][1])));return compact;
}
