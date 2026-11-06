import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { layoutAgent8Barycentric } from './agent8-layered-barycentric';

describe('agent 8 ranked barycentric placement', () => {
  it('audits full-network preservation, routing and geometry', () => {
    const model = currentNetworkModel;
    const { candidate, determinismKey } = layoutAgent8Barycentric(model);
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const hits = new Set<string>();
    for (const [id, points] of candidate.routes) {
      const connection = connectionById.get(id)!;
      const endpointOwners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) hits.add(`${id}->${box.id}`);
      }
    }
    const frameOverlaps: string[] = [];
    for (let i = 0; i < candidate.frames.length; i++) for (const other of candidate.frames.slice(i + 1)) {
      const frame = candidate.frames[i];
      if (frame.x < other.x + other.width && frame.x + frame.width > other.x && frame.y < other.y + other.height && frame.y + frame.height > other.y) frameOverlaps.push(`${frame.id}↔${other.id}`);
    }
    const endpointMismatches = candidate.routeRequests.filter(request => {
      const connection = connectionById.get(request.id);
      return !connection || connection.from !== request.fromTerminalId || connection.to !== request.toTerminalId;
    }).map(request => request.id);
    const frames = new Map(candidate.frames.map(frame => [frame.id, frame] as const));
    const unrelatedFrameCuts = candidate.findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId);
      const frame = frames.get(item.roomFrameId);
      if (!connection || !frame) return true;
      const owners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      return !owners.some(owner => owner && frame.memberAssetIds.includes(owner));
    });
    const report = {
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routeCount: candidate.routeCount,
      unresolvedCount: candidate.unresolved.length,
      crossingCount: candidate.findings.filter(item => item.type === 'route-crossing').length,
      sharedLengthCount: candidate.findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: candidate.findings.filter(item => item.type === 'non-orthogonal').length,
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      routeContentHits: hits.size,
      frameOverlaps: frameOverlaps.length,
      frameCuts: candidate.findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: unrelatedFrameCuts.length,
      endpointMismatches: endpointMismatches.length,
      determinismKey,
      bounds: candidate.bounds,
      aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
    };
    console.info('agent8 barycentric layout metrics', JSON.stringify(report));
    expect(report.assets).toBe(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(endpointMismatches).toEqual([]);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
    expect(determinismKey).toBeTruthy();
  }, 360_000);
});
