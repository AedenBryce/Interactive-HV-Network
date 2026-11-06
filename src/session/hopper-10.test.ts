import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { hopper10Model } from '../models/site/hopper-10';
import type { NetworkModel } from './model';

function fictionalConnectivityContract(): NetworkModel {
  const fixture=structuredClone(hopper10Model);
  fixture.id='fictional-hopper10-contract';fixture.version='fictional-1';fixture.name='Fictional Hopper10 connectivity definition';fixture.synthetic=true;
  fixture.evidence!.push({id:'fictional-contract',status:'supported',summary:'Fictional software definition only: each primary33 is explicitly connected, primary22 disconnected, intact fuses, binary controls, RC closed and FC open, no physical interlocks. This is not installed wiring or switching permission.',references:[{document:'Fictional contract',revision:'1',page:1,clause:'Defined source/earth and contact example'}]});
  for (const item of [...fixture.assets,...fixture.connections,...(fixture.earths??[])]) {item.knowledge='supported';item.evidenceIds=['fictional-contract'];}
  for (const suffix of ['a','b']) {
    const prefix=`rm420:tf420${suffix}`;
    fixture.assets.find(asset=>asset.id===prefix)!.sourcePairs=[[`${prefix}:primary33`,`${prefix}:secondary`]];
    fixture.connections.push({id:`fictional:${suffix}:selected-primary`,from:`${prefix}:primary-connection:port`,to:`${prefix}:primary33`,knowledge:'supported',evidenceIds:['fictional-contract']});
  }
  fixture.boundaries=[];
  fixture.sources=[{id:'fictional-source',label:'Fictional source',assetId:'rm420:interface:pole286',terminal:'rm420:interface:pole286:port',knowledge:'supported',evidenceIds:['fictional-contract']}];
  fixture.starting.sources={'fictional-source':true};
  fixture.starting.devices=Object.fromEntries(fixture.assets.filter(asset=>asset.positions.length).map(asset=>[asset.id,asset.kind==='earth-switch'||asset.id.endsWith(':fc')?'open':'closed']));
  fixture.interlocks={reviews:fixture.assets.filter(asset=>asset.positions.length).map(asset=>({assetId:asset.id,status:'confirmed-none',note:'This fictional contract explicitly defines no physical interlocks, not site permission.',evidence:[]})),rules:[]};
  return fixture;
}

describe('Hopper 10 drawing construction through the session', () => {
  it('retains the RM420 and MV bars without fabricating the missing MC420A LV bus or an available source', () => {
    const result = new SimulationSession(hopper10Model).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(Object.keys(result.devices)).toHaveLength(19);
    expect(Object.values(result.devices).every(value => value === null)).toBe(true);
    expect(result.model.assets.filter(asset => asset.kind === 'bus').map(asset => asset.id)).toEqual(['rm420:bus', 'rm420:mc420:bus']);
    expect(result.model.assets.find(asset => asset.id === 'rm420:mc420a:interface')?.kind).toBe('interface');
    expect(result.connectivity['rm420:mc420a:interface'].sourceStatus).toBe('unconfirmed');
    expect(result.connectivity['rm420:mc420a:interface'].earthStatus).toBe('unconfirmed');
    expect(result.model.assets.some(asset => asset.id.includes('surge-arrestor'))).toBe(false);
    expect(result.model.reviews?.filter(review => review.status === 'open')).toHaveLength(7);
  });

  it('persists source evidence and detail navigation and rejects a malformed scenario atomically', () => {
    const session = new SimulationSession(hopper10Model);
    expect(session.snapshot().model.presentation?.views.map(view=>view.id)).toEqual(['overview','rmu','transformers','mv','motor-01','motor-02']);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(hopper10Model);
    expect(reopened.loadScenario(file)).toEqual({ok:true});
    expect(reopened.snapshot()).toEqual(session.snapshot());
    expect(file.model.evidence.find((record:{id:string})=>record.id==='H10-MV-INCOMING').references).toContainEqual(expect.objectContaining({document:'520CBC0007-2130-DR-EL-0004.pdf',revision:'2 (28.01.25; AS FOUND 23.10.23)',page:1}));
    const before = reopened.snapshot();
    file.model.connections[0].to='missing-terminal';
    expect(reopened.loadScenario(file).ok).toBe(false);
    expect(reopened.snapshot()).toEqual(before);
  });

  it('preserves dual primary groups, the unresolved selection gap, source alternatives and spare aliases', () => {
    const result=new SimulationSession(hopper10Model).snapshot();
    for (const suffix of ['a','b']) {
      const prefix=`rm420:tf420${suffix}`;const transformer=result.model.assets.find(asset=>asset.id===prefix)!;
      expect(transformer.terminals).toEqual([`${prefix}:primary33`,`${prefix}:primary22`,`${prefix}:secondary`]);
      expect(transformer.knowledge).toBe('provisional');expect(transformer.conductivePairs).toEqual([]);expect(transformer.earthPairs).toEqual([]);
      expect(result.model.connections.some(connection=>connection.from===`${prefix}:primary-connection:port`&&transformer.terminals.includes(connection.to))).toBe(false);
      expect(result.model.boundaries?.some(boundary=>boundary.terminal===`${prefix}:primary33`&&boundary.sourceCoverage==='unconfirmed')).toBe(true);
    }
    expect(result.model.connections.some(connection=>connection.from.startsWith('rm420:comparison:')||connection.to.startsWith('rm420:comparison:'))).toBe(false);
    expect(result.model.assets.find(asset=>asset.id==='rm420:spare:sw')?.aliases).toContain('RM420 SW03 (overview third feeder)');
    expect(result.model.assets.find(asset=>asset.id==='rm420:spare:es')?.aliases).toContain('RM420 ES04 (detail)');
    expect(result.model.evidence?.find(record=>record.id==='H10-INTERLOCK-NOTES')?.summary).toContain('maintenance key captive when earth switch ON');
  });

  it('blocks every actual-area control while preserving all unconfirmed states and history', () => {
    const session=new SimulationSession(hopper10Model);const before=session.snapshot();
    for (const id of Object.keys(before.devices)) expect(session.changeDevice(id,'closed')).toMatchObject({ok:false,error:expect.stringContaining('Unresolved interlock')});
    expect(session.snapshot()).toEqual(before);expect(before.history).toEqual([]);
  });

  it('demonstrates separate parallel RC/FC routes, impacts and undo only in the fictional selected-primary contract', () => {
    const session=new SimulationSession(fictionalConnectivityContract());
    expect(session.snapshot().connectivity['rm420:mc420:motor-01:output'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('rm420:mc420:motor-01:rc','open')).toEqual({ok:true});
    expect(session.snapshot().connectivity['rm420:mc420:motor-01:output'].sourceStatus).toBe('disconnected');
    expect(session.snapshot().connectivity['rm420:mc420:motor-02:output'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('rm420:mc420:motor-01:fc','closed')).toEqual({ok:true});
    expect(session.trace('rm420:mc420:motor-01:output')).toMatchObject({ok:true,paths:[expect.objectContaining({assetIds:expect.arrayContaining(['rm420:mc420:motor-01:fc:fuse','rm420:mc420:motor-01:fc'])})]});
    expect(session.snapshot().impact.find(item=>item.assetId==='rm420:mc420:motor-01:output')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ok:true});
    expect(session.snapshot().connectivity['rm420:mc420:motor-01:output'].sourceStatus).toBe('disconnected');
    expect(session.reset()).toEqual({ok:true});
    expect(session.snapshot().connectivity['rm420:mc420:motor-01:output'].sourceIds).toEqual(['fictional-source']);
  });

  it('keeps MV incoming earth independent of primary earth continuity in the fictional contract', () => {
    const session=new SimulationSession(fictionalConnectivityContract());
    expect(session.changeDevice('rm420:tf420a:cb','open')).toEqual({ok:true});
    expect(session.changeDevice('rm420:mc420:in:es','closed')).toEqual({ok:true});
    const result=session.snapshot();
    expect(result.connectivity['rm420:mc420:bus'].earthStatus).toBe('connected');
    expect(result.connectivity['rm420:tf420a'].terminalEarths['rm420:tf420a:primary33']).toEqual([]);
    expect(result.connectivity['rm420:mc420:bus'].sourceStatus).toBe('disconnected');
    expect(session.changeDevice('rm420:tf420a:cb','closed')).toEqual({ok:true});
    expect(session.snapshot().connectivity['rm420:mc420:bus'].conflictSourceIds).toEqual(['fictional-source']);
  });
});
