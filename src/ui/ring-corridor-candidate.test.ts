import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { routeH9H7ThroughEastGutter } from './ring-corridor-candidate';

describe('isolated H9→H7 east-gutter route trial', () => {
  it('preserves coverage/endpoints and records whole-model geometry delta', () => {
    const model = currentNetworkModel;
    const base = continuousNetwork(model);
    const routes: GeometryRoute[] = model.connections.map(connection => ({
      id: connection.id,
      points: base.routes.get(connection.id) ?? [],
      terminals: [connection.from, connection.to],
    }));
    const ring = routes.find(route => route.id === 'wh:h9-to-h7:cable')!;
    const originalRing = ring.points;
    const candidateRing = routeH9H7ThroughEastGutter(originalRing);
    ring.points = candidateRing;
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: base.panels.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const baselineFindings = validateDiagramGeometry({
      routes: routes.map(route => route.id === ring.id ? { ...route, points: originalRing } : route),
      roomFrames: base.panels.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const metrics = (items: typeof findings) => ({
      crossings: items.filter(item => item.type === 'route-crossing').length,
      sharedLengths: items.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: items.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: items.filter(item => item.type === 'non-orthogonal').length,
      frameCuts: items.filter(item => item.type === 'route-room-frame').length,
      frameOverlaps: items.filter(item => item.type === 'room-frame-overlap').length,
      ringCrossings: items.filter(item => item.type === 'route-crossing' && item.routeIds.includes(ring.id)).length,
      ringSharedLengths: items.filter(item => item.type === 'shared-route-length' && item.routeIds.includes(ring.id)).length,
      ringFrameCuts: items.filter(item => item.type === 'route-room-frame' && item.routeId === ring.id).length,
    });
    console.info('H9→H7 east-gutter candidate metrics', {
      baseline: metrics(baselineFindings), candidate: metrics(findings),
      assets: base.assets.length, connections: routes.length,
      endpointPreserved: candidateRing[0] === originalRing[0] && candidateRing.at(-1) === originalRing.at(-1),
      candidateRing,
    });
    expect(base.assets).toHaveLength(model.assets.length);
    expect(base.routes.size).toBe(model.connections.length);
    expect(candidateRing[0]).toEqual(originalRing[0]);
    expect(candidateRing.at(-1)).toEqual(originalRing.at(-1));
    expect(candidateRing.slice(1).every((point, index) => point[0] === candidateRing[index][0] || point[1] === candidateRing[index][1])).toBe(true);
  }, 120_000);
});
