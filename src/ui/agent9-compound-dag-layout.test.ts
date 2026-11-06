import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { layoutAgent9CompoundDag } from './agent9-compound-dag-layout';

describe('agent 9 compound DAG constraints', () => {
  it('keeps all rooms in ranked non-overlapping rows and audits full model routing', () => {
    const model = currentNetworkModel;
    const { candidate, determinismKey, roomTranslations, rankByRoom, constraintBounds } = layoutAgent9CompoundDag(model);
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const routeContentHits = new Set<string>();
    for (const [id, points] of candidate.routes) {
      const connection = connectionById.get(id)!;
      const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) routeContentHits.add(`${id}->${box.id}`);
      }
    }
    const frameOverlaps: string[] = [];
    for (let index = 0; index < candidate.frames.length; index++) for (const other of candidate.frames.slice(index + 1)) {
      const frame = candidate.frames[index];
      if (frame.x < other.x + other.width && frame.x + frame.width > other.x && frame.y < other.y + other.height && frame.y + frame.height > other.y) frameOverlaps.push(`${frame.id}↔${other.id}`);
    }
    const endpointMismatches = candidate.routeRequests.filter(request => {
      const connection = connectionById.get(request.id);
      return !connection || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
    }).map(request => request.id);
    const frameById = new Map(candidate.frames.map(frame => [frame.id, frame] as const));
    const unrelatedFrameCuts = candidate.findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId); const frame = frameById.get(item.roomFrameId);
      if (!connection || !frame) return true;
      const owners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      return !owners.some(owner => owner && frame.memberAssetIds.includes(owner));
    });
    const report = {
      assets: Object.keys(candidate.positions).length, connections: model.connections.length,
      routeCount: candidate.routeCount, unresolvedCount: candidate.unresolved.length,
      crossings: candidate.findings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: candidate.findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: candidate.findings.filter(item => item.type === 'non-orthogonal').length,
      contentCollisions: candidate.contentBoxCollisions.length, routeContentHits: routeContentHits.size,
      frameOverlaps: frameOverlaps.length, frameCuts: candidate.findings.filter(item => item.type === 'route-room-frame').length,
      unrelatedFrameCuts: unrelatedFrameCuts.length, endpointMismatches: endpointMismatches.length,
      bounds: candidate.bounds, constraintBounds,
      aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
      ranks: new Set(Object.values(rankByRoom)).size, roomTranslationCount: Object.keys(roomTranslations).length,
      determinismKey,
    };
    console.info('agent9 compound DAG metrics', JSON.stringify(report));
    expect(report.assets).toBe(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(report.endpointMismatches).toBe(0);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
    expect(report.roomTranslationCount).toBe(candidate.frames.length);
    expect(Object.keys(rankByRoom)).toHaveLength(candidate.frames.length);
    expect(determinismKey).toBeTruthy();
  }, 360_000);
});
