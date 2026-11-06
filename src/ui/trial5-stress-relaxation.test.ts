import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry } from './geometry-validator';
import { layoutTrial5StressRelaxation } from './trial5-stress-relaxation';

describe('trial 5 projected quadratic stress relaxation', () => {
  it('preserves the full graph and reports whole-layout geometry', () => {
    const model = currentNetworkModel;
    const result = layoutTrial5StressRelaxation(model);
    const replay = layoutTrial5StressRelaxation(model);
    expect(replay.roomTranslations).toEqual(result.roomTranslations);
    expect(replay.assetTranslations).toEqual(result.assetTranslations);
    const { candidate } = result;
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routeHits = new Set<string>();
    for (const [id, points] of candidate.routes) {
      const connection = connectionById.get(id)!;
      const endpointOwners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let i = 1; i < points.length; i++) if (cutsBox(points[i - 1], points[i], box)) routeHits.add(`${id}->${box.id}`);
      }
    }
    const boxCollisions = new Set<string>();
    for (let i = 0; i < candidate.symbolLabelBoxes.length; i++) for (const b of candidate.symbolLabelBoxes.slice(i + 1)) {
      const a = candidate.symbolLabelBoxes[i];
      if (a.id.replace(/^(?:symbol|label):/, '') === b.id.replace(/^(?:symbol|label):/, '')) continue;
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) boxCollisions.add(`${a.id}↔${b.id}`);
    }
    const frameOverlaps = candidate.frames.flatMap((a, i) => candidate.frames.slice(i + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => `${a.id}↔${b.id}`));
    const findings = validateDiagramGeometry({ routes: [...candidate.routes].map(([id, points]) => ({ id, points, terminals: [connectionById.get(id)!.from, connectionById.get(id)!.to] as [string, string] })), roomFrames: candidate.frames });
    const endpointIdentityPreserved = candidate.routeRequests.length === model.connections.length && model.connections.every(connection => {
      const request = candidate.routeRequests.find(item => item.id === connection.id);
      return request?.fromTerminalId === connection.from && request?.toTerminalId === connection.to;
    });
    console.info('trial5 stress-relaxation metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length, connections: model.connections.length,
      units: result.unitCount, ranks: result.rankCount, routed: candidate.routeCount, unresolved: candidate.unresolved.length,
      crossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      boxCollisions: boxCollisions.size, routeContentHits: routeHits.size,
      frameOverlaps: frameOverlaps.length, frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      endpointIdentityPreserved, bounds: candidate.bounds, aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(endpointIdentityPreserved).toBe(true);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 300_000);
});
