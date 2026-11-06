import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { measuredRouteCrossingDetours } from './route-crossing-detours';

describe('measured whole-network route detours', () => {
  it('keeps all model connections routed and applies the endpoint-preserving orthogonal detours', () => {
    const model = currentNetworkModel;
    const geometry = continuousNetwork(model);
    const routes: GeometryRoute[] = model.connections.map(connection => ({
      id: connection.id,
      points: geometry.routes.get(connection.id) ?? [],
      terminals: [connection.from, connection.to],
    }));
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: geometry.panels.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });

    expect(geometry.assets).toHaveLength(model.assets.length);
    expect(geometry.routes.size).toBe(model.connections.length);
    for (const detour of measuredRouteCrossingDetours) {
      expect(geometry.routes.get(detour.id)).toEqual(detour.replacement);
    }
    const directBusTap = routes.find(route => route.id === 'rm420:tf420a:bus-cb');
    expect(directBusTap?.points).toHaveLength(1);
    const directBusLink = model.connections.find(item => item.id === directBusTap?.id)!;
    const directPoint = directBusTap!.points[0];
    const busCenter = geometry.view.layout.assets['rm420:bus'];
    const busSpan = geometry.view.layout.busSpans?.['rm420:bus'] ?? 0;
    expect(geometry.view.layout.terminals[directBusLink.to]).toEqual(directPoint);
    expect(directPoint[1]).toBe(busCenter[1]);
    expect(Math.abs(directPoint[0] - busCenter[0])).toBeLessThanOrEqual(busSpan / 2);
    expect(routes.filter(route => route.points.length === 0)).toHaveLength(0);
    expect(routes.filter(route => route.points.length === 0)).toHaveLength(0);
    expect(findings.filter(item => item.type === 'non-orthogonal')).toHaveLength(0);
    expect(findings.filter(item => item.type === 'route-crossing').length).toBeLessThanOrEqual(24);
    expect(findings.filter(item => item.type === 'shared-route-length').length).toBeLessThanOrEqual(1);
    expect(findings.filter(item => item.type === 'route-endpoint-on-interior').length).toBeLessThanOrEqual(7);
    expect(findings.filter(item => item.type === 'room-frame-overlap')).toHaveLength(0);
  }, 120_000);
});
