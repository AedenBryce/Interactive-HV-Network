import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { cutsBox } from './diagram-geometry';

describe('isolated whole-graph ELK-ready layout candidate', () => {
  it('places confirmed room compounds and routes the complete model edge set', () => {
    const model = currentNetworkModel;
    const candidate = layoutWholeGraphCandidate(model);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const symbolLabelHits = new Set<string>();
    for (const [routeId, points] of candidate.routes) {
      const connection = connectionById.get(routeId)!;
      const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const assetId = box.id.replace(/^(?:symbol|label):/, '');
        if (endpoints.includes(assetId)) continue;
        for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) symbolLabelHits.add(`${routeId}→${box.id}`);
      }
    }
    const frames = candidate.frames;
    const frameOverlaps = frames.flatMap((a, index) => frames.slice(index + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => `${a.id}↔${b.id}`));
    const findings = candidate.findings;
    const frameCuts = findings.filter(item => item.type === 'route-room-frame');
    const ownFrameCuts = frameCuts.filter(item => {
      const connection = connectionById.get(item.routeId)!;
      const endpointRooms = [candidate.roomOwnerByAsset.get(ownerByTerminal.get(connection.from)!), candidate.roomOwnerByAsset.get(ownerByTerminal.get(connection.to)!)];
      return endpointRooms.includes(item.roomFrameId);
    });
    const unrelatedFrameCuts = frameCuts.filter(item => !ownFrameCuts.includes(item));
    const summary = {
      modelAssets: model.assets.length,
      modelConnections: model.connections.length,
      routes: candidate.routeCount,
      selectedRoutingOrder: candidate.routingOrder,
      routingAlternatives: candidate.routingAlternatives,
      unresolved: candidate.unresolved,
      frames: frames.length,
      frameOverlaps,
      findings: {
        crossings: findings.filter(item => item.type === 'route-crossing').length,
        sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
        endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
        frameCuts: frameCuts.length,
        ownEndpointFrameCuts: ownFrameCuts.length,
        unrelatedFrameCuts: unrelatedFrameCuts.length,
        sharedLengthExamples: findings.filter(item => item.type === 'shared-route-length').slice(0, 20),
        endpointContactExamples: findings.filter(item => item.type === 'route-endpoint-on-interior').slice(0, 20),
      },
      symbolLabelHits: [...symbolLabelHits],
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      contentBoxCollisionIds: candidate.contentBoxCollisions.slice(0, 50),
      unrelatedFrameCutIds: unrelatedFrameCuts.map(item => `${item.routeId}→${item.roomFrameId}`),
      unconfirmedRooms: candidate.unconfirmedRooms,
      sourceAnchors: candidate.sourceAnchors,
      sourceGeometry: {
        seededAssetCount: candidate.sourceGeometry.seededAssetCount,
        missingAssetCount: candidate.sourceGeometry.missingAssetIds.length,
        missingTerminalCount: candidate.sourceGeometry.missingTerminalIds.length,
        rooms: candidate.sourceGeometry.rooms.map(room => ({ id: room.roomId, seeded: room.seededAssetIds.length, missing: room.missingAssetIds.length })),
      },
      busSlots: candidate.busSlots.size,
      ringConnectionIds: candidate.ringConnectionIds,
      bounds: candidate.bounds,
      frameBounds: {
        x: Math.min(...frames.map(frame => frame.x)),
        y: Math.min(...frames.map(frame => frame.y)),
        width: Math.max(...frames.map(frame => frame.x + frame.width)) - Math.min(...frames.map(frame => frame.x)),
        height: Math.max(...frames.map(frame => frame.y + frame.height)) - Math.min(...frames.map(frame => frame.y)),
      },
      longestRoutes: [...candidate.routes].map(([id, points]) => ({
        id,
        length: points.slice(1).reduce((sum, point, index) => sum + Math.abs(point[0] - points[index][0]) + Math.abs(point[1] - points[index][1]), 0),
      })).sort((a, b) => b.length - a.length).slice(0, 10),
    };
    console.info('whole graph candidate metrics', JSON.stringify(summary));
    const requestById = new Map(candidate.routeRequests.map(request => [request.id, request] as const));
    const modelConnectionById = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const requestIdentityMismatches = model.connections.filter(connection => {
      const request = requestById.get(connection.id);
      return !request || request.fromTerminalId !== connection.from || request.toTerminalId !== connection.to;
    }).map(connection => connection.id);
    const resultIds = [...candidate.routes.keys(), ...candidate.unresolved.map(item => item.slice(0, item.lastIndexOf(':')))];
    const missingResultIds = model.connections.filter(connection => !candidate.routes.has(connection.id)
      && !candidate.unresolved.some(item => item.startsWith(`${connection.id}:`))).map(connection => connection.id);
    const unknownResultIds = [...candidate.routes.keys()].filter(id => !modelConnectionById.has(id));
    expect(requestIdentityMismatches).toEqual([]);
    expect(missingResultIds).toEqual([]);
    expect(unknownResultIds).toEqual([]);
    expect(resultIds.length).toBe(model.connections.length);
    expect(new Set(resultIds).size).toBe(model.connections.length);
    expect(candidate.routingAlternatives[0]?.strategy).toBe(candidate.routingOrder);
    expect(findings.filter(item => item.type === 'non-orthogonal')).toHaveLength(0);
    expect(findings.filter(item => item.type === 'route-crossing')).toHaveLength(0);
    expect(candidate.modelConnectionCount).toBe(model.connections.length);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 300_000);
});
