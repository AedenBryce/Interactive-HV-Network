import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { cutsBox } from './diagram-geometry';
import { solveAgent5GlobalConstraintLayout } from './agent5-global-constraint-layout';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';

describe('isolated global constraint-layout trial', () => {
  it('solves all room/branch placements together and audits the full model', () => {
    const model = currentNetworkModel; const base = continuousNetwork(model);
    const placement = solveAgent5GlobalConstraintLayout(model, base);
    const replay = solveAgent5GlobalConstraintLayout(model, base);
    expect(replay.roomTranslations).toEqual(placement.roomTranslations);
    expect(replay.assetTranslations).toEqual(placement.assetTranslations);
    const candidate = layoutWholeGraphCandidate(model, {
      baseGeometry: base,
      roomTranslations: placement.roomTranslations,
      assetTranslations: placement.assetTranslations,
      routeBudget: 'quick',
    });
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const hits = new Set<string>();
    for (const [id, points] of candidate.routes) {
      const connection = connectionById.get(id)!;
      const endpoints = new Set([terminalOwner.get(connection.from), terminalOwner.get(connection.to)]);
      for (const box of candidate.symbolLabelBoxes) {
        if (endpoints.has(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let i = 1; i < points.length; i++) if (cutsBox(points[i - 1], points[i], box)) hits.add(`${id}->${box.id}`);
      }
    }
    const frameOverlaps: string[] = [];
    for (let i = 0; i < candidate.frames.length; i++) for (const other of candidate.frames.slice(i + 1)) {
      const a = candidate.frames[i];
      if (a.x < other.x + other.width && a.x + a.width > other.x && a.y < other.y + other.height && a.y + a.height > other.y) frameOverlaps.push(`${a.id}↔${other.id}`);
    }
    const idsPreserved = candidate.routeRequests.length === model.connections.length && model.connections.every(connection => {
      const request = candidate.routeRequests.find(item => item.id === connection.id);
      return request?.fromTerminalId === connection.from && request?.toTerminalId === connection.to;
    });
    const findings = candidate.findings;
    console.info('agent5 global constraint metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length, connections: model.connections.length, unitCount: placement.unitCount,
      ranks: placement.rankCount, chosenOrder: placement.chosen, placementCandidates: placement.candidates,
      routeCount: candidate.routeCount, unresolvedCount: candidate.unresolved.length,
      unresolved: candidate.unresolved,
      crossingCount: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengthCount: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      contentBoxCollisions: candidate.contentBoxCollisions.length, routeContentHits: hits.size,
      frameOverlaps: frameOverlaps.length,
      frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: findings.filter(item => item.type === 'route-room-frame').filter(item => {
        const connection = connectionById.get(item.routeId)!;
        const owners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
        const frame = candidate.frames.find(other => other.id === item.roomFrameId)!;
        return !owners.some(owner => frame.memberAssetIds.includes(owner!));
      }).length,
      idsPreserved, bounds: candidate.bounds, aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(idsPreserved).toBe(true);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 240_000);
});
