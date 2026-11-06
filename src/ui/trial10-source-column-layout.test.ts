import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { layoutTrial10SourceColumns } from './trial10-source-column-layout';

describe('trial 10 source-column room layout', () => {
  it('preserves every asset and connection while auditing the source-column candidate', () => {
    const model = currentNetworkModel;
    const result = layoutTrial10SourceColumns(model);
    const { candidate } = result;
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routeContentHits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const connection = connectionById.get(routeId)!;
      const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const owner = box.id.replace(/^(?:symbol|label):/, '');
        if (endpointOwners.includes(owner)) continue;
        for (let index = 1; index < points.length; index++) {
          if (cutsBox(points[index - 1], points[index], box)) routeContentHits.add(`${routeId}->${box.id}`);
        }
      }
    }
    const frameOverlaps: string[] = [];
    for (let index = 0; index < candidate.frames.length; index++) {
      const frame = candidate.frames[index];
      for (const other of candidate.frames.slice(index + 1)) {
        if (frame.x < other.x + other.width && frame.x + frame.width > other.x
          && frame.y < other.y + other.height && frame.y + frame.height > other.y) {
          frameOverlaps.push(`${frame.id}↔${other.id}`);
        }
      }
    }
    const unresolvedIds = model.connections.map(connection => connection.id).filter(id => !candidate.routes.has(id));
    const accounted = new Set([...candidate.routes.keys(), ...unresolvedIds]);
    const endpointMismatches = candidate.routeRequests.filter(request => {
      const connection = connectionById.get(request.id);
      return !connection || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
    }).length;
    console.info('trial10 source-column metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routes.size,
      unresolved: unresolvedIds.length,
      accounted: accounted.size,
      endpointMismatches,
      crossings: candidate.findings.filter(item => item.type === 'route-crossing').length,
      sharedPaths: candidate.findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: candidate.findings.filter(item => item.type === 'non-orthogonal').length,
      contentCollisions: candidate.contentBoxCollisions.length,
      routeContentHits: routeContentHits.size,
      frameOverlaps: frameOverlaps.length,
      frameHits: candidate.findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameHits: candidate.findings.filter(item => item.type === 'route-room-frame').filter(item => {
        const connection = connectionById.get(item.routeId)!;
        const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
        const frame = candidate.frames.find(value => value.id === item.roomFrameId);
        return !frame || !endpoints.some(owner => owner && frame.memberAssetIds.includes(owner));
      }).length,
      columns: result.columns,
      bounds: result.bounds,
      aspect: result.aspect,
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(accounted.size).toBe(model.connections.length);
    expect(endpointMismatches).toBe(0);
  }, 60_000);
});
