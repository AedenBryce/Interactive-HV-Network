import {expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {currentNetworkModel} from '../models/site/current-network';
import saved from '../models/site/authored-network.json';
import review from '../models/site/reviewed-layout.json';
import {loadAuthoredLayout} from './authored-layout-loader';
import type {AuthoredSchematic} from './authored-schematic';
import {applyLayoutEdits} from './layout-edit';
import {switchroomBuses} from './switchroom-buses';
import {busEndClearance} from './bus-earth-layout';
import {busTieSymbols} from './bus-tie-symbol';
import {EquipmentSymbol} from './EquipmentSymbol';
import {selectorEarthTag} from './switch-display-tags';

it('ends the two bus strokes at the breaker ports without inner bus-end ticks',async()=>{
 const g=busEndClearance(switchroomBuses(applyLayoutEdits(await loadAuthoredLayout(currentNetworkModel,saved as unknown as AuthoredSchematic),review.edits),true));
 const before=JSON.stringify(g.view.layout),layout=g.view.layout;
 const result=busTieSymbols(g.assets,g.connections,layout,4);
 const [x]=layout.assets['sw411:bus-tie:cb'];
 expect(result.tieIds.has('sw411:bus-tie:cb')).toBe(true);
 expect(layout.assets['sw411:bus-a'][0]+result.bars.get('sw411:bus-a')!.right).toBeCloseTo(x-120);
 expect(layout.assets['sw411:bus-b'][0]+result.bars.get('sw411:bus-b')!.left).toBeCloseTo(x+120);
 expect(result.bars.get('sw411:bus-a')!.rightCap).toBe(false);
 expect(result.bars.get('sw411:bus-b')!.leftCap).toBe(false);
 expect([...result.hiddenConnectionIds].sort()).toEqual(['sw411:tie-to-bus-a','sw411:tie-to-bus-b']);
 expect(JSON.stringify(layout)).toBe(before);
 const tie=g.assets.find(a=>a.id==='sw411:bus-tie:cb')!;
 const svg=renderToStaticMarkup(createElement(EquipmentSymbol,{asset:tie,state:currentNetworkModel.starting.devices[tie.id],layout,busTie:true}));
 expect(svg).not.toContain('withdrawable-contacts');expect(svg).not.toContain('rack-out-marks');expect(svg).not.toContain('bus-end-caps');
});

it('labels the earth contact on every combined hopper/CV006 selector',async()=>{
 const g=await loadAuthoredLayout(currentNetworkModel,saved as unknown as AuthoredSchematic);
 const selectors=g.assets.filter(a=>/(rm406|rm410|rm417|rm419):sw0[1-4]$/.test(a.id));
 expect(selectors).toHaveLength(16);
 for(const asset of selectors){
  const tag=selectorEarthTag(asset);
  expect(tag).toMatch(/^ES RM\d+ SW0[1-4]$/);
  expect(renderToStaticMarkup(createElement(EquipmentSymbol,{asset,state:'service',layout:g.view.layout}))).toContain(tag);
 }
});
