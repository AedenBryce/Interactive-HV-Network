import {describe,expect,it} from 'vitest';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {SimulationSession} from '../session/session';
import {currentNetworkModel} from '../models/site/current-network';
import {switchActions} from './combined-switch-actions';
import {ThreePositionSymbol} from './ThreePositionSymbol';
import {Symbol} from './Symbol';

describe('combined drawing symbols and independent commands',()=>{
 it('distinguishes every control target across the whole model',()=>{
  const snapshot=new SimulationSession(currentNetworkModel).snapshot();
  for(const asset of currentNetworkModel.assets){
   const actions=switchActions(snapshot,asset);
   expect(new Set(actions.map(a=>a.label)).size,asset.id).toBe(actions.length);
   for(const action of actions){
    const target=currentNetworkModel.assets.find(a=>a.id===action.assetId)!;
    if(target.kind==='earth-switch')expect(action.label,asset.id).toContain('Earth switch ·');
    if(target.kind==='breaker')expect(action.label,asset.id).toContain('CB ·');
   }
  }
 });
 it('dispatches RM721 IN02 breaker and earth buttons to their separate devices',()=>{
  const session=new SimulationSession(currentNetworkModel),asset=currentNetworkModel.assets.find(a=>a.id==='rm721:in02')!;
  let actions=switchActions(session.snapshot(),asset);
  expect(actions.map(a=>a.label)).toEqual(['Open CB · RM721 IN02','Close CB · RM721 IN02','Open Earth switch · RM721 IN02','Close Earth switch · RM721 IN02']);
  const mainOpen=actions.find(a=>a.label==='Open CB · RM721 IN02')!;
  expect(mainOpen.assetId).toBe('rm721:in02');
  expect(session.changeDevice(mainOpen.assetId,mainOpen.command).ok).toBe(true);
  actions=switchActions(session.snapshot(),asset);
  const earthClose=actions.find(a=>a.label==='Close Earth switch · RM721 IN02')!;
  expect(earthClose.assetId).toBe('rm721:in02:es');
  expect(session.changeDevice(earthClose.assetId,earthClose.command).ok).toBe(true);
  expect(session.snapshot().devices['rm721:in02']).toBe('open');
  expect(session.snapshot().devices['rm721:in02:es']).toBe('closed');
 });
 it('operates main and earth intents through the existing three-position interlocks',()=>{
  const session=new SimulationSession(currentNetworkModel),asset=currentNetworkModel.assets.find(a=>a.id==='rm406:sw01')!;
  let actions=switchActions(session.snapshot(),asset);
  expect(actions.map(a=>a.label)).toEqual(['Open Main switch · RM406 SW01','Close Main switch · RM406 SW01','Open Earth switch · RM406 SW01','Close Earth switch · RM406 SW01']);
  expect(actions.find(a=>a.label==='Close Earth switch · RM406 SW01')!.allowed).toBe(false);
  expect(session.changeDevice(asset.id,actions.find(a=>a.label==='Open Main switch · RM406 SW01')!.command).ok).toBe(true);
  actions=switchActions(session.snapshot(),asset);
  expect(session.changeDevice(asset.id,actions.find(a=>a.label==='Close Earth switch · RM406 SW01')!.command).ok).toBe(true);
  expect(session.snapshot().devices[asset.id]).toBe('earthed');
  expect(switchActions(session.snapshot(),asset).find(a=>a.label==='Close Main switch · RM406 SW01')!.allowed).toBe(false);
 });
 it('keeps new earth actions blocked when opening the assembly through either identity',()=>{
  const snapshot=new SimulationSession(currentNetworkModel).snapshot();
  const main=currentNetworkModel.assets.find(a=>a.id==='rm713:in01')!,earth=currentNetworkModel.assets.find(a=>a.id==='rm713:in01:es')!;
  expect(switchActions(snapshot,main)).toEqual(switchActions(snapshot,earth));
  expect(switchActions(snapshot,main).filter(a=>a.assetId===earth.id).every(a=>a.allowed===false)).toBe(true);
 });
 it('draws one moving selector blade and retains permanent withdrawable marks',()=>{
  for(const state of ['service','isolated','earthed']){
   const markup=renderToStaticMarkup(createElement(ThreePositionSymbol,{state,tapY:40}));
   expect(markup.match(/class="selector-blade"/g)).toHaveLength(1);
   expect(markup).not.toContain('selector-earth-blade');
  }
  for(const open of [false,true])expect(renderToStaticMarkup(createElement(Symbol,{kind:'breaker',open,removable:true}))).toContain('data-withdrawable="true"');
 });
});
