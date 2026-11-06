import {expect,it} from 'vitest';
import {rotateObjects,turnPoint} from './object-rotation';
import {applyLineRoutes} from './line-routing';
import {loadAuthoredLayout} from './authored-layout-loader';
import {currentNetworkModel} from '../models/site/current-network';
import savedDrawing from '../models/site/authored-network.json';
import type {AuthoredSchematic} from './authored-schematic';
import {EquipmentSymbol} from './EquipmentSymbol';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

it('rotates equipment and attached cable endpoints in quarter turns without changing the model',async()=>{
 const base=await loadAuthoredLayout(currentNetworkModel,savedDrawing as unknown as AuthoredSchematic);
 const ids=['sw411:in-03:cb','sw411:in-03:es','sw431:tf432:transformer','sw451:mc451b:section'];
 for(const id of ids){
  const asset=base.assets.find(a=>a.id===id)!;expect(asset,id).toBeDefined();
  const center=base.view.layout.assets[id];
  for(const angle of [90,180,270]){
   const g=rotateObjects(base,{[id]:angle});
   expect(g.assets).toBe(base.assets);expect(g.connections).toBe(base.connections);
   expect(g.view.layout.assets[id]).toEqual(center);
   for(const t of asset.terminals){const p=base.view.layout.terminals[t],q=turnPoint([p[0]-center[0],p[1]-center[1]],angle);expect(g.view.layout.terminals[t]).toEqual([center[0]+q[0],center[1]+q[1]]);}
   for(const c of g.connections){const old=base.routes.get(c.id)!,path=g.routes.get(c.id)!;for(const [terminal,index]of [[c.from,0],[c.to,path.length-1]]as const){if(base.owners.get(terminal)!==id)continue;const p=terminal===c.from?old[0]:old.at(-1)!,q=turnPoint([p[0]-center[0],p[1]-center[1]],angle);expect(path[index]).toEqual([center[0]+q[0],center[1]+q[1]]);}for(let i=1;i<path.length;i++)expect(path[i][0]===path[i-1][0]||path[i][1]===path[i-1][1]).toBe(true);}
   const svg=renderToStaticMarkup(createElement(EquipmentSymbol,{asset,state:undefined,layout:g.view.layout,symbolScale:4}));expect(svg).toContain(`data-object-rotation="${angle}"`);
   const manual=applyLineRoutes(g,{});expect(manual.routes).toBe(g.routes);
  }
 }
});
