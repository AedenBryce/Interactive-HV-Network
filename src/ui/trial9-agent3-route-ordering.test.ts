import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutTrial9RouteOrdering } from './trial9-agent3-route-ordering';

describe('trial 9 fixed-position external route ordering', () => {
  it('compares deterministic orderings and a bounded rip-up retry', () => {
    const model = currentNetworkModel;
    const trial = layoutTrial9RouteOrdering(model);
    const owner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const links = new Map(model.connections.map(link => [link.id, link] as const));
    const frameRects = trial.secondAlign.candidate.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
    const metrics = trial.attempts.map(attempt => {
      const geometry: GeometryRoute[] = [...attempt.candidate.routes].map(([id, points]) => {
        const link = links.get(id)!;
        return { id, points, terminals: [link.from, link.to] };
      });
      const findings = validateDiagramGeometry({ routes: geometry, roomFrames: frameRects });
      const lineHits = new Set<string>();
      for (const route of geometry) {
        const link = links.get(route.id)!;
        const endpointOwners = new Set([owner.get(link.from), owner.get(link.to)]);
        for (const box of trial.secondAlign.candidate.symbolLabelBoxes) {
          if (endpointOwners.has(box.id.replace(/^(?:symbol|label):/, ''))) continue;
          for (let index = 1; index < route.points.length; index++) {
            if (cutsBox(route.points[index - 1], route.points[index], box)) lineHits.add(`${route.id}->${box.id}`);
          }
        }
      }
      const points = [
        ...Object.values(trial.secondAlign.candidate.positions),
        ...[...attempt.candidate.routes.values()].flat(),
        ...frameRects.flatMap(frame => [[frame.x, frame.y] as const, [frame.x + frame.width, frame.y + frame.height] as const]),
      ];
      const xs = points.map(point => point[0]); const ys = points.map(point => point[1]);
      return {
        id: attempt.id,
        routed: attempt.candidate.routes.size,
        unresolved: attempt.candidate.remaining.length,
        crossings: findings.filter(item => item.type === 'route-crossing').length,
        sharedPaths: findings.filter(item => item.type === 'shared-route-length').length,
        endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        lineContentHits: lineHits.size,
        frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
        frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
        unrelatedFrameCuts: findings.filter(item => item.type === 'route-room-frame').filter(item => {
          if (item.type !== 'route-room-frame') return false;
          const link = links.get(item.routeId)!;
          const endpointOwners = [owner.get(link.from), owner.get(link.to)];
          const frame = trial.secondAlign.candidate.frames.find(value => value.id === item.roomFrameId);
          return !frame || !endpointOwners.some(id => id && frame.memberAssetIds.includes(id));
        }).length,
        aspect: +((Math.max(...xs) - Math.min(...xs)) / Math.max(1, Math.max(...ys) - Math.min(...ys))).toFixed(3),
        failures: attempt.candidate.gutterFailures.map(item => ({ id: item.routeId, reason: item.reason })),
      };
    });
    console.info('TRIAL9_ROUTE_ORDER_METRICS', JSON.stringify({
      assets: model.assets.length,
      positioned: Object.keys(trial.secondAlign.candidate.positions).length,
      connections: model.connections.length,
      positionsStable: trial.attempts.every(attempt => attempt.candidate.routes.size > 0),
      ripUpCount: trial.ripUpIds.length,
      strategies: metrics,
    }));
    expect(Object.keys(trial.secondAlign.candidate.positions)).toHaveLength(model.assets.length);
    for (const metric of metrics) expect(metric.routed + metric.unresolved).toBe(model.connections.length);
  }, 300_000);
});
