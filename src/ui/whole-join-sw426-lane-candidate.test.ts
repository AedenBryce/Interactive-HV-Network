import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { withSw426JoinLane } from './whole-join-sw426-lane-candidate';

describe('SW426 whole-network join lane candidate', () => {
  it('finds an outside lane that reduces route conflicts', () => {
    const model = currentNetworkModel;
    const production = continuousNetwork(model);
    const routes: GeometryRoute[] = model.connections.flatMap(connection => {
      const points = production.routes.get(connection.id);
      return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
    });
    const frames = production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }));
    const score = (candidate: readonly GeometryRoute[]) => validateDiagramGeometry({ routes: candidate, roomFrames: frames })
      .filter(item => item.type === 'route-crossing' || item.type === 'shared-route-length' || item.type === 'route-endpoint-on-interior')
      .filter(item => 'routeIds' in item && item.routeIds.includes('whole:join:sw426')).length;
    const baseline = score(routes);
    const candidates = Array.from({ length: 41 }, (_, index) => -16000 + index * 1000)
      .map(laneX => ({ laneX, score: score(withSw426JoinLane(routes, laneX)) }))
      .sort((a, b) => a.score - b.score || Math.abs(a.laneX - 16000) - Math.abs(b.laneX - 16000));
    const best = candidates[0];
    console.info(JSON.stringify({ baseline, best, candidates: candidates.slice(0, 8) }));
    expect(best.score).toBeLessThan(baseline);
  });
});
