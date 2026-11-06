import {describe,it,expect} from 'vitest';
import {conductorGroups,auditConductorOverlaps,uniqueConductorFragments} from './conductor-paths';
import {currentNetworkModel} from '../models/site/current-network';
import drawing from '../models/site/authored-network.json';
import {composeAuthoredSchematic} from './authored-schematic';
import type {AuthoredSchematic} from './authored-schematic';
import {EquipmentSymbol} from './EquipmentSymbol';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import type {Point} from './diagram-geometry';

describe('single visible conductor strokes',()=>{
 it('paints a shared motor trunk once, retaining both branches and their endpoint',()=>{
  const links=[{id:'rc',from:'rc-out',to:'motor'},{id:'fc',from:'fc-out',to:'motor'}];
  const routes=new Map<string,Point[]>([['rc',[[0,0],[0,40],[50,40],[50,100]]],['fc',[[100,0],[100,40],[50,40],[50,100]]]]);
  expect(auditConductorOverlaps(links,routes)).toMatchObject([{sharedConductor:true,length:60}]);
  const result=uniqueConductorFragments(links,new Map([...routes].map(([id,path])=>[id,[path]])));
  const trunk=[...result.values()].flat().filter(path=>path.some((p,i)=>i>0&&path[i-1][0]===50&&p[0]===50&&Math.abs(p[1]-path[i-1][1])===60));
  expect(trunk).toHaveLength(1);
  expect([...result.values()].flat(2)).toContainEqual([0,0]);
  expect([...result.values()].flat(2)).toContainEqual([100,0]);
  expect([...result.values()].flat(2)).toContainEqual([50,100]);
 });
 it('does not merge separate transformer windings placed over one another',()=>{
  const links=[{id:'d',from:'delta',to:'d-in'},{id:'y',from:'star',to:'y-in'}];
  const path:Point[]=[[0,0],[100,0]],routes=new Map([['d',path],['y',path]]);
  expect(auditConductorOverlaps(links,routes)).toMatchObject([{sharedConductor:false}]);
  const result=uniqueConductorFragments(links,new Map([...routes].map(([id,path])=>[id,[path]])));
  expect(result.get('d')).toHaveLength(1);expect(result.get('y')).toHaveLength(1);
 });
 it('preserves a traced or energised owner on the single shared stroke',()=>{
  const links=[{id:'a',from:'a',to:'common'},{id:'b',from:'b',to:'common'}];
  const paths=new Map<string,Point[][]>([['a',[[[0,0],[50,0]]]],['b',[[[0,0],[50,0]]]]]);
  const result=uniqueConductorFragments(links,paths,[],id=>id==='b'?100:0);
  expect(result.get('a')).toEqual([]);expect(result.get('b')).toEqual([[[0,0],[50,0]]]);
 });
 it('lets an equipment lead draw its own interval without a wire painted on top',()=>{
  const links=[{id:'wire',from:'bus',to:'cb-in'}];
  const result=uniqueConductorFragments(links,new Map<string,Point[][]>([['wire',[[[0,0],[0,100]]]]]),[],()=>0,[{id:'lead',terminal:'cb-in',points:[[0,80],[0,100]]}]);
  expect(result.get('wire')).toEqual([[[0,0],[0,80]]]);
 });
 it('never joins bus sections through a breaker',()=>{
  const links=[{id:'a',from:'bus-a',to:'cb-a'},{id:'b',from:'bus-b',to:'cb-b'}];
  const groups=conductorGroups(links,[{kind:'breaker',terminals:['cb-a','cb-b']}]);
  expect(groups.get('a')).not.toBe(groups.get('b'));
 });
 it('keeps SZ010 motor outputs as M symbols rather than junction dots',()=>{
  const geometry=composeAuthoredSchematic(currentNetworkModel,drawing as unknown as AuthoredSchematic);
  for(const motor of ['01','02']){
   const asset=currentNetworkModel.assets.find(a=>a.id===`rm420:mc420:motor-${motor}:output`)!;
   expect(geometry.inlineIds.has(asset.id)).toBe(false);
   const markup=renderToStaticMarkup(createElement(EquipmentSymbol,{asset,state:undefined,layout:geometry.view.layout,inline:geometry.inlineIds.has(asset.id),symbolScale:4}));
   expect(markup).toContain('motor-symbol');expect(markup).not.toContain('junction-symbol');
  }
 });
});
