import { describe,expect,it } from 'vitest';
import { currentNetworkModel,previousReviewedNetworkModel } from '../models/site/current-network';
import { SimulationSession } from './session';
import { modelSchema } from './model';
import { addedOverviewControls } from '../models/site/overview-device-corrections';

describe('overview device correction package',()=>{
 it('retains old identities and baseline supply connectivity while restoring depicted controls',()=>{
  expect(modelSchema.safeParse(currentNetworkModel).success).toBe(true);
  const before=new SimulationSession(previousReviewedNetworkModel).snapshot();
  const after=new SimulationSession(currentNetworkModel).snapshot();
  for(const original of previousReviewedNetworkModel.assets){
   expect(currentNetworkModel.assets.find(a=>a.id===original.id)?.terminals,original.id).toEqual(original.terminals);
   expect(after.devices[original.id],original.id).toEqual(before.devices[original.id]);
   expect(after.connectivity[original.id].sourceIds,original.id).toEqual(before.connectivity[original.id].sourceIds);
  }
 });
 it('blocks every restored control until its local profile is confirmed',()=>{
  const session=new SimulationSession(currentNetworkModel);
  expect(addedOverviewControls).toHaveLength(16);
  for(const {id} of addedOverviewControls){
   const before=session.saveScenario().devices[id];
   const next=before==='open'?'closed':'open';
   expect(session.changeDevice(id,next).ok,id).toBe(false);
   expect(session.saveScenario().devices[id],id).toEqual(before);
  }
 });
 it('opens an old saved scenario in view-only mode under the new package',()=>{
  const old=new SimulationSession(previousReviewedNetworkModel).saveScenario();
  const session=new SimulationSession(currentNetworkModel);
  expect(session.loadScenario(old).ok).toBe(true);
  expect(session.snapshot().mode).toBe('view-only');
 });
});
