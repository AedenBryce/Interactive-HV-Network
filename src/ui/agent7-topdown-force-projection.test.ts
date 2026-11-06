import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry } from './geometry-validator';
import { layoutAgent7TopdownForceProjection } from './agent7-topdown-force-projection';

describe('isolated top-down force projection trial', () => {
  it('preserves the graph and reports full-layout geometry', () => {
    const model = currentNetworkModel;
    const result = layoutAgent7TopdownForceProjection(model);
    const replay = layoutAgent7TopdownForceProjection(model);
    expect(replay.roomTranslations).toEqual(result.roomTranslations);
    expect(replay.assetTranslations).toEqual(result.assetTranslations);
    const { candidate } = result;
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routeHits = new Set<string>();
    for (const [id, points] of candidate.routes) {
      const connection = connectionById.get(id)!;
      const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
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
    console.info('agent7 full-model metrics', JSON.stringify({
      assets: candidate.positions.length ?? Object.keys(candidate.positions).length, connections: model.connections.length,
      units: result.unitCount, ranks: result.rankCount, routed: candidate.routeCount, unresolved: candidate.unresolved.length,
      crossings: findings.filter(x => x.type === 'route-crossing').length,
      sharedLengths: findings.filter(x => x.type === 'shared-route-length').length,
      endpointContacts: findings.filter(x => x.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(x => x.type === 'non-orthogonal').length,
      boxCollisions: boxCollisions.size, routeContentHits: routeHits.size,
      frameOverlaps: frameOverlaps.length, frameCuts: findings.filter(x => x.type === 'route-room-frame').length,
      unrelatedFrameCuts: findings.filter(x => x.type === 'route-room-frame').filter(item => {
        const connection = connectionById.get(item.routeId)!;
        const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        const frame = candidate.frames.find(other => other.id === item.roomFrameId)!;
        return !endpoints.some(id => id && frame.memberAssetIds.includes(id));
      }).length,
      endpointIdentityPreserved, bounds: candidate.bounds, aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(endpointIdentityPreserved).toBe(true);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 300_000);
});
