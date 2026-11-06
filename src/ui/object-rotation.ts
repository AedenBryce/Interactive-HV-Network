import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import type { Box,Point } from './diagram-geometry';
import {attachLineRoute,simplifyLineRoute} from './line-routing';
export const quarterTurn=(angle:number)=>((angle%360)+360)%360;
export function turnPoint(p:Point,angle:number):Point{
 switch(quarterTurn(angle)){case 90:return[-p[1],p[0]];case 180:return[-p[0],-p[1]];case 270:return[p[1],-p[0]];default:return[...p];}
}
export function turnBox(box:Box,angle:number):Box{
 const corners:Point[]=[[box.x,box.y],[box.x+box.width,box.y],[box.x,box.y+box.height],[box.x+box.width,box.y+box.height]];
 const p=corners.map(p=>turnPoint(p,angle)),xs=p.map(p=>p[0]),ys=p.map(p=>p[1]);
 return{x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
type Geometry=Omit<EditableGeometry,'assets'>&{assets:readonly Asset[]};
/** Rotate only presentation anchors and glyph orientation; topology stays intact. */
export function rotateObjects<T extends Geometry>(g:T,angles:Record<string,number>={}):T{
 if(!Object.values(angles).some(angle=>quarterTurn(angle)))return g;
 const assets=new Map(g.assets.map(a=>[a.id,a]));
 const rotate=(id:string|undefined,p:Point):Point=>{const angle=id?angles[id]:0,center=id?g.view.layout.assets[id]:undefined;if(!angle||!center)return p;const q=turnPoint([p[0]-center[0],p[1]-center[1]],angle);return[center[0]+q[0],center[1]+q[1]];};
 const terminals=Object.fromEntries(Object.entries(g.view.layout.terminals).map(([id,p])=>[id,rotate(g.owners.get(id),p)]));
 const rotations={...g.view.layout.rotations};
 for(const[id,angle]of Object.entries(angles))if(assets.get(id)?.kind==='bus')rotations[id]=quarterTurn((rotations[id]??0)+angle)%180;
 const routes=new Map(g.routes);
 for(const c of g.connections){const a=g.owners.get(c.from),b=g.owners.get(c.to);if(!angles[a!]&&!angles[b!])continue;const p=g.routes.get(c.id)!;routes.set(c.id,simplifyLineRoute(attachLineRoute(p,rotate(a,p[0]),rotate(b,p.at(-1)!))));}
 return{...g,routes,view:{...g.view,layout:{...g.view.layout,terminals,rotations,objectRotations:angles}}};
}
