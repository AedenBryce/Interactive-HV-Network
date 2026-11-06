import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { routeWholeNetworkAroundFrames } from './obstacle-aware-route-candidate';

describe('whole-network route/frame avoidance candidate', () => {
  it('reports full-model route coverage and geometry quality', () => {
    const result = routeWholeNetworkAroundFrames(currentNetworkModel);
    console.log(JSON.stringify({ metrics: result.metrics, hybridMetrics: result.hybridMetrics, details: result.details, unresolved: result.unresolved.slice(0, 20) }, null, 2));
  }, 180_000);
});
