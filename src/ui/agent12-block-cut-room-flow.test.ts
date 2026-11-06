import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutAgent12BlockCutRoomFlow } from './agent12-block-cut-room-flow';
import { cutsBox } from './diagram-geometry';

describe('agent12 block-cut top-down room flow trial', () => {
  it('preserves the model and reports whole-layout quality', () => {
    const model = currentNetworkModel;
    const { candidate, blocks, roots, hierarchy } = layoutAgent12BlockCutRoomFlow(model);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const frameOverlaps: string[] = [];
    for (let i = 0; i < candidate.frames.length; i++) for (const b of candidate.frames.slice(i + 1)) {
      const a = candidate.frames[i];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) frameOverlaps.push(`${a.id}↔${b.id}`);
    }
    const routeContentHits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const connection = connectionById.get(routeId)!;
      const endpointOwners = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        if (endpointOwners.includes(box.id.replace(/^(?:symbol|label):/, ''))) continue;
        for (let i = 1; i < points.length; i++) if (cutsBox(points[i - 1], points[i], box)) routeContentHits.add(`${routeId}->${box.id}`);
      }
    }
    const unrelatedFrameHits = candidate.findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId);
      const frame = candidate.frames.find(value => value.id === item.roomFrameId);
      if (!connection || !frame) return false;
      const endpointAssets = [terminalOwner.get(connection.from), terminalOwner.get(connection.to)];
      return !endpointAssets.some(assetId => assetId && frame.memberAssetIds.includes(assetId));
    }).length;
    const byType = (type: string) => candidate.findings.filter(item => item.type === type).length;
    console.info('AGENT12_BLOCK_CUT_ROOM_FLOW', JSON.stringify({
      assets: Object.keys(candidate.positions).length,
      positionedAssets: Object.keys(candidate.positions).filter(id => candidate.positions[id]).length,
      connections: model.connections.length,
      routeRequests: candidate.routeRequests.length,
      routed: candidate.routeCount,
      unresolved: candidate.unresolved.length,
      crossings: byType('route-crossing'),
      sharedRouteLengths: byType('shared-route-length'),
      endpointOnInterior: byType('route-endpoint-on-interior'),
      lineContentHits: routeContentHits.size,
      frameHits: byType('route-room-frame'),
      unrelatedFrameHits,
      frameOverlaps: frameOverlaps.length,
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      blocks: blocks.length,
      blockSizes: blocks.map(block => block.length).sort((a, b) => b - a),
      roots: roots.length,
      rootIds: roots,
      assignedParents: Object.keys(hierarchy.parentByRoom).length,
      aspect: candidate.bounds.width / Math.max(1, candidate.bounds.height),
      bounds: candidate.bounds,
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
  }, 60_000);
});
