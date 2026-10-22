import { describe, expect, it } from 'vitest';
import { SimulationSession } from './session';
import { trainLoadingModel } from '../models/site/train-loading';
import type { NetworkModel } from './model';

function fictionalConnectivityContract(): NetworkModel {
  const fixture = structuredClone(trainLoadingModel);
  fixture.id = 'fictional-train-loading'; fixture.version = 'fictional-contract-1'; fixture.synthetic = true;
  fixture.name = 'Fictional train-loading connectivity example';
  fixture.evidence!.push({id:'fictional-contract',status:'supported',summary:'Fictional software contract only: enable a defined source at the interface, define the copied source pairs, no cross-winding earth transfer, breakers closed and earth switches open. No installed permission or lineup is established.',references:[{document:'Fictional test contract',revision:'1',page:1,clause:'Defined connectivity example'}]});
  for (const item of [...fixture.assets, ...fixture.connections, ...(fixture.earths ?? [])]) { item.knowledge = 'supported'; item.evidenceIds = ['fictional-contract']; }
  fixture.boundaries = [];
  fixture.sources = [{id:'fictional-source',label:'Fictional source',assetId:'sw451:interface:sw411',terminal:'sw451:interface:sw411:port',knowledge:'supported',evidenceIds:['fictional-contract']}];
  fixture.starting.sources = {'fictional-source':true};
  fixture.starting.devices = Object.fromEntries(fixture.assets.filter(asset=>asset.positions.length).map(asset=>[asset.id,asset.kind === 'earth-switch' ? 'open' : 'closed']));
  fixture.interlocks = {reviews:fixture.assets.filter(asset=>asset.positions.length).map(asset=>({assetId:asset.id,status:'confirmed-none',note:'This fictional contract explicitly defines no interlock; not site permission.',evidence:[]})),rules:[]};
  return fixture;
}

describe('Train-loading drawing construction through the session', () => {
  it('loads SW451 and the three final LV buses without accepting a baseline or local source', () => {
    const result = new SimulationSession(trainLoadingModel).snapshot();
    expect(result.model.synthetic).toBe(false);
    expect(result.model.sources).toEqual([]);
    expect(Object.keys(result.devices)).toHaveLength(16);
    expect(Object.values(result.devices).every(value => value === null)).toBe(true);
    expect(result.model.assets.filter(asset => asset.kind === 'bus').map(asset => asset.id)).toEqual([
      'sw451:bus', 'sw451:mc451:bus', 'sw451:sw452:d:bus', 'sw451:sw452:y:bus',
    ]);
    for (const id of ['sw451:mc451:bus', 'sw451:sw452:d:bus', 'sw451:sw452:y:bus']) {
      expect(result.connectivity[id].sourceStatus).toBe('unconfirmed');
      expect(result.connectivity[id].earthStatus).toBe('unconfirmed');
    }
    expect(result.model.assets.some(asset => asset.id.includes('sw453'))).toBe(false);
  });

  it('preserves the MC451B bridge and conflicting labels without adding a second supply or SW453', () => {
    const result = new SimulationSession(trainLoadingModel).snapshot();
    expect(result.model.assets.find(asset => asset.id === 'sw451:mc451b:section')?.aliases).toContain('MC451B');
    expect(result.model.connections.find(connection => connection.id === 'sw451:mc451:section-bridge')).toMatchObject({
      from: 'sw451:mc451:bus:port', to: 'sw451:mc451b:section:port', knowledge: 'supported',
    });
    expect(result.model.assets.find(asset => asset.id === 'sw451:bus:es')?.aliases).toEqual(['ES SW451 (2356)', 'ES SW454 (overview SW451 panel)']);
    expect(result.model.reviews?.find(review => review.id === 'TL-R08')?.evidenceIds.length).toBeGreaterThan(0);
    expect(result.model.evidence?.find(record => record.id === 'TL-CROSS-AREA-CLASSIFICATION')?.references).toContainEqual(expect.objectContaining({document:'11098-07110-EL-DR-2468.pdf',revision:'5 (12/08/09; ISSUED FOR AS-BUILT)',page:1}));
    expect(result.model.assets.some(asset => asset.id.includes('sw441') || asset.id.includes('sw453'))).toBe(false);
    expect(result.model.assets.filter(asset => asset.id.endsWith(':interface') && asset.id.includes(':spare-'))).toHaveLength(3);
  });

  it('keeps its diagram and evidence in a self-contained scenario and rejects a broken view atomically', () => {
    const session = new SimulationSession(trainLoadingModel);
    expect(session.snapshot().model.presentation?.views.map(view => view.id)).toEqual(['overview', 'hv', 'lv']);
    const file = JSON.parse(JSON.stringify(session.saveScenario()));
    const reopened = new SimulationSession(trainLoadingModel);
    expect(reopened.loadScenario(file)).toEqual({ ok: true });
    expect(reopened.snapshot()).toEqual(session.snapshot());
    expect(file.model.presentation.views.find((view: {id:string}) => view.id === 'hv').boundaries).toHaveLength(3);
    const before = reopened.snapshot();
    file.model.presentation.views[0].assetIds.push('missing-asset');
    expect(reopened.loadScenario(file).ok).toBe(false);
    expect(reopened.snapshot()).toEqual(before);
  });

  it('blocks every unresolved actual-area control without changing the unknown baseline', () => {
    const session = new SimulationSession(trainLoadingModel); const before = session.snapshot();
    for (const id of Object.keys(before.devices)) expect(session.changeDevice(id,'closed')).toMatchObject({ok:false,error:expect.stringContaining('Unresolved interlock')});
    expect(session.snapshot()).toEqual(before);
    expect(before.history).toEqual([]);
    expect(before.model.reviews?.every(review=>review.status === 'open')).toBe(true);
  });

  it('demonstrates D/Y branch independence, section continuity, feeder impacts and undo in an explicit fictional contract', () => {
    const session = new SimulationSession(fictionalConnectivityContract());
    expect(session.snapshot().connectivity['sw451:mc451b:section'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('sw451:sw452:d:cb','open')).toEqual({ok:true});
    expect(session.snapshot().connectivity['sw451:sw452:d:bus'].sourceStatus).toBe('disconnected');
    expect(session.snapshot().connectivity['sw451:sw452:y:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.changeDevice('sw451:tf452:hv-cb','open')).toEqual({ok:true});
    expect(session.snapshot().connectivity['sw451:sw452:y:bus'].sourceStatus).toBe('disconnected');
    expect(session.snapshot().connectivity['sw451:mc451:bus'].sourceIds).toEqual(['fictional-source']);
    expect(session.snapshot().impact.find(item=>item.assetId === 'sw451:sw452:y:bus')?.connectivityChanged).toBe(true);
    expect(session.undo()).toEqual({ok:true});
    expect(session.trace('sw451:sw452:y:bus')).toMatchObject({ok:true,paths:[expect.objectContaining({assetIds:expect.arrayContaining(['sw451:tf452','sw451:sw452:y:cb','sw451:sw452:y:bus'])})]});
  });

  it('keeps winding earth continuity separate from a source-to-earth conflict in the fictional contract', () => {
    const session = new SimulationSession(fictionalConnectivityContract());
    expect(session.changeDevice('sw451:tf452:hv-es','closed')).toEqual({ok:true});
    const result = session.snapshot();
    expect(result.connectivity['sw451:tf452'].earthIds).toContain('sw451:tf452:hv-es:earth');
    expect(result.connectivity['sw451:sw452:d:bus'].earthStatus).toBe('disconnected');
    expect(result.connectivity['sw451:sw452:y:bus'].earthStatus).toBe('disconnected');
    expect(result.connectivity['sw451:sw452:y:bus'].sourceIds).toEqual(['fictional-source']);
    expect(result.connectivity['sw451:sw452:y:bus'].conflictSourceIds).toEqual(['fictional-source']);
  });
});
