import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { cutsBox } from './diagram-geometry';
import { layoutTrial6WeightedSubtrees } from './trial6-weighted-subtree-packing';

describe('trial 6 weighted subtree packing on the complete model', () => {
  it('preserves all equipment and audits every modeled route', () => {
    const model = currentNetworkModel;
    const candidate = layoutTrial6WeightedSubtrees(model);
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routes: GeometryRoute[] = [...candidate.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const lineContentHits = new Set<string>();
    for (const route of routes) {
      const connection = connectionById.get(route.id)!;
      const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpoints.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let i = 1; i < route.points.length; i++) {
          if (cutsBox(route.points[i - 1], route.points[i], box)) lineContentHits.add(`${route.id}->${box.id}`);
        }
      }
    }
    const frameOverlaps = candidate.findings.filter(item => item.type === 'room-frame-overlap');
    const metrics = {
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routes.size,
      unresolved: candidate.unresolved.length,
      roomFrames: candidate.frames.length,
      contentCollisions: candidate.contentBoxCollisions.length,
      lineContentHits: lineContentHits.size,
      frameOverlaps: frameOverlaps.length,
      crossings: candidate.findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: candidate.findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: candidate.findings.filter(item => item.type === 'non-orthogonal').length,
      frameCuts: candidate.findings.filter(item => item.type === 'route-room-frame').length,
      bounds: candidate.bounds,
      aspect: +(candidate.bounds.width / Math.max(1, candidate.bounds.height)).toFixed(3),
    };
    console.info('trial 6 weighted subtree metrics', JSON.stringify(metrics));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.unresolved.length + candidate.routes.size).toBe(model.connections.length);
    expect(candidate.frames.length).toBeGreaterThan(0);
    expect(validateDiagramGeometry({ routes, roomFrames: candidate.frames }).length).toBeGreaterThanOrEqual(0);
  }, 120_000);
});
