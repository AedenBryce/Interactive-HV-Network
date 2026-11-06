import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutTrial9HierarchicalPlanarization } from './trial9-hierarchical-planarization';

describe('trial 9 hierarchical planarization on the full network', () => {
  it('preserves all devices/connections and measures complete geometry', () => {
    const model = currentNetworkModel;
    const candidate = layoutTrial9HierarchicalPlanarization(model);
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
    const findings = validateDiagramGeometry({ routes, roomFrames: candidate.frames });
    const metrics = {
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routes.size,
      unresolved: candidate.unresolved.length,
      roomFrames: candidate.frames.length,
      contentCollisions: candidate.contentBoxCollisions.length,
      lineContentHits: lineContentHits.size,
      frameOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      crossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      roomLevelCrossingsBefore: candidate.planarizationPlan.roomLevelCrossingsBefore,
      roomLevelCrossingsAfter: candidate.planarizationPlan.roomLevelCrossingsAfter,
      bounds: candidate.bounds,
      aspect: +(candidate.bounds.width / Math.max(1, candidate.bounds.height)).toFixed(3),
    };
    console.info('trial 9 hierarchical planarization metrics', JSON.stringify(metrics));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routes.size + candidate.unresolved.length).toBe(model.connections.length);
    expect(candidate.planarizationPlan.prioritizedConnections.length).toBeGreaterThan(0);
  }, 120_000);
});
