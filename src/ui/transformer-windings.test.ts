import {it,expect} from 'vitest';
import {currentNetworkModel} from '../models/site/current-network';
import {transformerWindings} from './transformer-windings';
import audit from '../../drawing-review/supplemental/transformer-direction-audit.json';
import drawing from '../models/site/authored-network.json';
import type {AuthoredSchematic} from './authored-schematic';
import {composeAuthoredSchematic} from './authored-schematic';
import {transformerPortLayout} from './transformer-port-layout';
import {EquipmentSymbol} from './EquipmentSymbol';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

it('matches the source-referenced primary and secondary role inventory for all 60 transformers',()=>{
 for(const record of audit.records){
  const asset=currentNetworkModel.assets.find(a=>a.id===record.assetId)!;
  const roles=transformerWindings(asset);
  expect(roles.primaries,asset.id).toEqual(record.primaryTerminals);
  expect(new Set(roles.secondaries),asset.id).toEqual(new Set(record.secondaryTerminals));
 }
});

it('shows the two TF420 inputs above one centred secondary, while TF416A remains one of each',()=>{
 const geometry=transformerPortLayout(composeAuthoredSchematic(currentNetworkModel,drawing as unknown as AuthoredSchematic),4);
 for(const id of ['rm420:tf420a','rm420:tf420b','wh:h3:tf416a']){
  const asset=currentNetworkModel.assets.find(a=>a.id===id)!;
  const roles=transformerWindings(asset),[x,y]=geometry.view.layout.assets[id];
  for(const terminal of roles.primaries)expect(geometry.view.layout.terminals[terminal][1],terminal).toBeLessThan(y);
  expect(roles.secondaries).toHaveLength(1);
  const output=geometry.view.layout.terminals[roles.secondaries[0]];
  expect(output[0]).toBe(x);expect(output[1]).toBeGreaterThan(y);
  const markup=renderToStaticMarkup(createElement(EquipmentSymbol,{asset,state:undefined,layout:geometry.view.layout,symbolScale:4}));
  expect(markup).toContain('data-primary-windings="'+roles.primaries.length+'"');
  expect(markup).toContain('data-secondary-windings="1"');
 }
});
