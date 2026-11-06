import { describe, it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

describe('targeted structural corridor trial', () => {
  it('compares candidate corridors for SW505 and CV006 pole routes', () => {
    const model = currentNetworkModel;
    const production = continuousNetwork(model);
    const baseRoutes = model.connections.flatMap(connection => {
      const points = production.routes.get(connection.id);
      return points ? [{ id: connection.id, points, terminals: [connection.from, connection.to] as [string, string] }] : [];
    });
    const baseFrames = production.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height }));
    const metrics = (overrides: Record<string, [number, number][]>) => {
      const routes: GeometryRoute[] = baseRoutes.map(route => ({ ...route, points: overrides[route.id] ?? route.points }));
      const findings = validateDiagramGeometry({ routes, roomFrames: baseFrames });
      return {
        crossings: findings.filter(f => f.type === 'route-crossing').length,
        frameHits: findings.filter(f => f.type === 'route-room-frame').length,
        crossingPairs: findings.filter(f => f.type === 'route-crossing').map(f => `${f.routeIds[0]} <> ${f.routeIds[1]}`),
        changedRouteFrameHits: findings.filter(f => f.type === 'route-room-frame' && Object.keys(overrides).includes(f.routeId)).length,
      };
    };
    const base = metrics({});
    const route = (id: string) => production.routes.get(id)!;
    const sw505 = route('sw454:sw505:cable-SW505-P-01');
    const cv006 = route('cv006:pole17-pole49');
    const swFrom = sw505[0], swTo = sw505.at(-1)!;
    const cvFrom = cv006[0], cvTo = cv006.at(-1)!;
    const sourceRoom = production.panels.find(panel => panel.id === 'stockpile/stockpile-hv')!;
    const targetRoom = production.panels.find(panel => panel.id === 'train-loading/hv')!;
    const swCands: Record<string, [number, number][]> = {
      // Try the north corridor, crossing the receiving room boundary only at its endpoint.
      sw505_north: [swFrom, [swFrom[0], Math.min(sourceRoom.y, targetRoom.y) - 500], [swTo[0], Math.min(sourceRoom.y, targetRoom.y) - 500], swTo],
      // Try a narrow direct path in the gap between the source and destination room frames.
      sw505_mid: [swFrom, [swFrom[0], Math.min(swFrom[1], swTo[1]) - 200], [swTo[0], Math.min(swFrom[1], swTo[1]) - 200], swTo],
      // Try an east perimeter lane around both rooms.
      sw505_east: [swFrom, [Math.max(sourceRoom.x + sourceRoom.width, targetRoom.x + targetRoom.width) + 500, swFrom[1]], [Math.max(sourceRoom.x + sourceRoom.width, targetRoom.x + targetRoom.width) + 500, swTo[1]], swTo],
    };
    const overview = production.panels.find(panel => panel.id === 'sw411/overview')!;
    const west = overview.x - 500;
    const east = overview.x + overview.width + 500;
    const upstreamYs = ['whole:join:sw454', 'whole:join:sw451'].flatMap(id => production.routes.get(id)!.map(p => p[1]));
    const northY = Math.min(...upstreamYs) - 500;
    const southY = Math.max(...upstreamYs) + 500;
    const cvCands: Record<string, [number, number][]> = {
      cv006_north: [cvFrom, [cvFrom[0], northY], [east, northY], [east, cvTo[1]], cvTo],
      cv006_south: [cvFrom, [cvFrom[0], southY], [west, southY], [west, cvTo[1]], cvTo],
      cv006_east: [cvFrom, [east, cvFrom[1]], [east, cvTo[1]], cvTo],
      cv006_west: [cvFrom, [west, cvFrom[1]], [west, cvTo[1]], cvTo],
    };
    const variants = {
      sw505_north: { 'sw454:sw505:cable-SW505-P-01': swCands.sw505_north },
      sw505_mid: { 'sw454:sw505:cable-SW505-P-01': swCands.sw505_mid },
      sw505_east: { 'sw454:sw505:cable-SW505-P-01': swCands.sw505_east },
      cv006_north: { 'cv006:pole17-pole49': cvCands.cv006_north },
      cv006_south: { 'cv006:pole17-pole49': cvCands.cv006_south },
      cv006_east: { 'cv006:pole17-pole49': cvCands.cv006_east },
      cv006_west: { 'cv006:pole17-pole49': cvCands.cv006_west },
    };
    writeFileSync('tmp/route-collision-trial2-results.json', JSON.stringify({ base, variants: Object.fromEntries(Object.entries(variants).map(([name, overrides]) => [name, metrics(overrides)])) }, null, 2));
  }, 120_000);
});
