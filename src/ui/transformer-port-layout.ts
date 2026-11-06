import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import { equipmentPorts } from './diagram-geometry';
import type { Point } from './diagram-geometry';
import { attachLineRoute, simplifyLineRoute } from './line-routing';
type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };
/** Every primary enters its symbol at the top; secondary conductors leave its lower winding ports. */
export function transformerPortLayout<T extends Geometry>(geometry: T, scale: number): T {
 const terminals = {...geometry.view.layout.terminals};
 const transformerTerminals = new Set<string>();
 for (const asset of geometry.assets.filter(asset => asset.kind === 'transformer')) {
  const [x,y] = geometry.view.layout.assets[asset.id];
  const layout = {...geometry.view.layout, terminals:{...terminals,[asset.terminals[0]]:[x,y-160] as Point}};
  const {ports} = equipmentPorts(asset,layout);
  asset.terminals.forEach((id,i)=>{transformerTerminals.add(id);terminals[id]=[x+ports[i][0]*scale,y+ports[i][1]*scale];});
 }
 const routes = new Map(geometry.routes);
 for (const link of geometry.connections) {
  const route = routes.get(link.id)!;
  if (route?.length && (transformerTerminals.has(link.from) || transformerTerminals.has(link.to))) routes.set(link.id,simplifyLineRoute(attachLineRoute(route,transformerTerminals.has(link.from)?terminals[link.from]:route[0],transformerTerminals.has(link.to)?terminals[link.to]:route.at(-1)!)));
 }
 return {...geometry,view:{...geometry.view,layout:{...geometry.view.layout,terminals}},routes};
}
