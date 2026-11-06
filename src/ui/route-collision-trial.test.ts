import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

describe('route collision candidate trial', () => {
  it('measures RM410 ring and converter cable alternatives against the full network', () => {
    const model = currentNetworkModel;
    const production = continuousNetwork(model);
    const run = (overrides: Record<string, [number, number][]>) => {
      const routes: GeometryRoute[] = model.connections.flatMap(connection => {
        const points = overrides[connection.id] ?? production.routes.get(connection.id);
        return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
      });
      const findings = validateDiagramGeometry({
        routes,
        roomFrames: production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
      });
      return {
        crossings: findings.filter(f => f.type === 'route-crossing').length,
        frameHits: findings.filter(f => f.type === 'route-room-frame').length,
        symbolOverlaps: findings.filter(f => f.type === 'route-endpoint-on-interior').length,
        crossingPairs: findings.filter(f => f.type === 'route-crossing').map(f => `${f.routeIds[0]} <> ${f.routeIds[1]}`),
      };
    };
    const baseline = run({});
    const routeMap = production.routes;
    const overrides: Record<string, [number, number][]> = {};
    const setLane = (id: string, laneY: number) => {
      const link = model.connections.find(item => item.id === id);
      const points = routeMap.get(id);
      if (!link || !points) return;
      const from = points[0], to = points.at(-1)!;
      overrides[id] = [from, [from[0], laneY], [to[0], laneY], to];
    };
    const ring = routeMap.get('rm410:sw04-rm419')!;
    const ringFrom = ring[0], ringTo = ring.at(-1)!;
    setLane('rm410:sw04-rm419', Math.min(ringFrom[1], ringTo[1]) - 120);
    const inputB = routeMap.get('rm410:vs4101:input-b:winding-cable')!;
    const inputBFrom = inputB[0], inputBTo = inputB.at(-1)!;
    overrides['rm410:vs4101:input-b:winding-cable'] = [inputBFrom, [inputBFrom[0], inputBFrom[1] - 100], [inputBTo[0] + 100, inputBFrom[1] - 100], [inputBTo[0] + 100, inputBTo[1]], inputBTo];
    const trial = run(overrides);
    console.log(JSON.stringify({ baseline, trial }, null, 2));
  });
});
