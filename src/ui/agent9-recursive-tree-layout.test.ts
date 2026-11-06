import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { cutsBox } from './diagram-geometry';
import { planAgent9RecursiveTree } from './agent9-recursive-tree-layout';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';

describe('agent 9 recursive top-down interval layout', () => {
  it('recalculates room intervals deterministically and preserves/audits the full model', () => {
    const model = currentNetworkModel;
    const base = continuousNetwork(model);
    const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
    const plan = planAgent9RecursiveTree(seed.frames);
    const replayPlan = planAgent9RecursiveTree(seed.frames);
    expect(replayPlan).toEqual(plan);
    const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations: plan.roomTranslations, routeBudget: 'quick' });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routedIds = [...candidate.routes.keys()];
    const unresolvedIds = candidate.unresolved.map(item => candidate.routeRequests.find(request => item.startsWith(`${request.id}:`))?.id ?? item);
    const idsPreserved = candidate.routeRequests.length === model.connections.length && model.connections.every(connection => {
      const request = candidate.routeRequests.find(item => item.id === connection.id);
      return request?.fromTerminalId === connection.from && request?.toTerminalId === connection.to;
    });
    const lineContentHits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const connection = connectionById.get(routeId)!;
      const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const owner = box.id.replace(/^(?:symbol|label):/, '');
        if (endpoints.includes(owner)) continue;
        for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) lineContentHits.add(`${routeId}->${box.id}`);
      }
    }
    const frameOverlaps: string[] = [];
    for (let i = 0; i < candidate.frames.length; i++) for (const other of candidate.frames.slice(i + 1)) {
      const frame = candidate.frames[i];
      if (frame.x < other.x + other.width && frame.x + frame.width > other.x && frame.y < other.y + other.height && frame.y + frame.height > other.y) frameOverlaps.push(`${frame.id}↔${other.id}`);
    }
    const findings = candidate.findings;
    console.info('agent9 recursive interval metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length, connections: model.connections.length,
      roots: plan.roots.length, roomCount: candidate.frames.length, depthRows: plan.rowY.length,
      routeCount: candidate.routeCount, unresolvedCount: candidate.unresolved.length,
      unresolved: candidate.unresolved,
      endpointMismatches: model.connections.filter(connection => {
        const request = candidate.routeRequests.find(item => item.id === connection.id);
        return !request || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
      }).length,
      crossingCount: findings.filter(item => item.type === 'route-crossing').length,
      sharedLengthCount: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      contentBoxCollisions: candidate.contentBoxCollisions.length, lineContentHits: lineContentHits.size,
      frameOverlaps: frameOverlaps.length,
      frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: findings.filter(item => item.type === 'route-room-frame').filter(item => {
        const connection = connectionById.get(item.routeId)!;
        const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        const frame = candidate.frames.find(other => other.id === item.roomFrameId)!;
        return !endpointOwners.some(owner => owner && frame.memberAssetIds.includes(owner));
      }).length,
      routedIds: routedIds.length, unresolvedIds: unresolvedIds.length,
      routeAccountingUnique: new Set([...routedIds, ...unresolvedIds]).size === model.connections.length,
      idsPreserved, bounds: candidate.bounds, aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(idsPreserved).toBe(true);
    expect(new Set([...routedIds, ...unresolvedIds]).size).toBe(model.connections.length);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 240_000);
});
