import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { evaluateCongestionFeedback } from './agent2-congestion-feedback';

describe('isolated congestion-feedback room placement candidate',()=>{
  it('uses routing congestion to stagger top-down room subtrees and reports complete model metrics',()=>{
    const result=evaluateCongestionFeedback(currentNetworkModel);
    const byId=new Map(result.trials.map(t=>[t.id,t.metrics]));
    const summaries=result.trials.map(t=>({id:t.id,score:t.score,metrics:{...t.metrics,unresolvedIds:undefined}}));
    console.info('agent2 congestion feedback full model',JSON.stringify({hotRoom:result.hotRoom,movedSubtree:result.movedSubtree,prioritizedCrossRoomTreeEdges:result.prioritizedCrossRoomTreeEdges,chosen:result.chosen,trials:summaries}));
    expect(byId.get('baseline')?.assets).toBe(currentNetworkModel.assets.length);
    expect(byId.get('baseline')?.connections).toBe(currentNetworkModel.connections.length);
    for(const trial of result.trials){expect(trial.metrics.routed+trial.metrics.unresolved).toBe(currentNetworkModel.connections.length);expect(trial.metrics.endpointRequests).toBe(currentNetworkModel.connections.length);}
  },300_000);
});
