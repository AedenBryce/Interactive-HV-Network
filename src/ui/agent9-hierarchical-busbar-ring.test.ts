import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { layoutAgent9HierarchicalBusbarRing } from './agent9-hierarchical-busbar-ring';

describe('agent 9 topology layers with explicit busbar/ring route priorities', () => {
  it('preserves and audits the full graph under a deterministic layered placement', () => {
    const model = currentNetworkModel;
    const candidate = layoutAgent9HierarchicalBusbarRing(model);
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routedIds = [...candidate.routes.keys()];
    const unresolvedIds = candidate.unresolved.map(item => candidate.routeRequests.find(request => item.startsWith(`${request.id}:`))?.id ?? item);
    const hits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const connection = connectionById.get(routeId)!;
      const endpointOwners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let i = 1; i < points.length; i++) if (cutsBox(points[i - 1], points[i], box)) hits.add(`${routeId}->${box.id}`);
      }
    }
    const frameOverlaps: string[] = [];
    for (let i = 0; i < candidate.frames.length; i++) for (const other of candidate.frames.slice(i + 1)) {
      const a = candidate.frames[i];
      if (a.x < other.x + other.width && a.x + a.width > other.x && a.y < other.y + other.height && a.y + a.height > other.y) frameOverlaps.push(`${a.id}↔${other.id}`);
    }
    const findings = candidate.findings;
    const endpointMismatches = candidate.routeRequests.filter(request => {
      const connection = connectionById.get(request.id);
      return !connection || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
    }).length;
    console.info('agent9 hierarchical busbar/ring metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length, connections: model.connections.length,
      routed: candidate.routeCount, unresolved: candidate.unresolved.length,
      priorityBusEdges: candidate.priorityBusEdges.length, priorityRingEdges: candidate.priorityRingEdges,
      crossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedPaths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      contentCollisions: candidate.contentBoxCollisions.length, routeContentHits: hits.size,
      frameOverlaps: frameOverlaps.length, frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: findings.filter(item => item.type === 'route-room-frame').filter(item => {
        const c = connectionById.get(item.routeId)!;
        const endpoints = [terminalOwner.get(c.from), terminalOwner.get(c.to)];
        const frame = candidate.frames.find(value => value.id === item.roomFrameId)!;
        return !endpoints.some(owner => owner && frame.memberAssetIds.includes(owner));
      }).length,
      accountingUnique: new Set([...routedIds, ...unresolvedIds]).size,
      endpointMismatches,
      roots: candidate.hierarchyPlan.roots.length, layers: candidate.hierarchyPlan.layers.map(layer => layer.length),
      bounds: candidate.bounds, aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(endpointMismatches).toBe(0);
    expect(new Set([...routedIds, ...unresolvedIds]).size).toBe(model.connections.length);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 240_000);
});
