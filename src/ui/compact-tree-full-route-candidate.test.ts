import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { cutsBox } from './diagram-geometry';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { layoutCurrentWholeNetwork } from './compact-supply-tree-network-adapter';

describe('measured compact-tree positions with complete route planning', () => {
  it('routes the entire real model after one coordinated asset placement', () => {
    const model = currentNetworkModel;
    const seed = continuousNetwork(model);
    const packed = layoutCurrentWholeNetwork({ maxWidth: 12_000, verticalGap: 700, baseGeometry: seed });
    const assetTranslations = Object.fromEntries(model.assets.map(asset => {
      const from = seed.view.layout.assets[asset.id] ?? [0, 0];
      const to = packed.positions[asset.id];
      return [asset.id, [to[0] - from[0], to[1] - from[1]] as [number, number]];
    }));
    const frameTranslations = Object.fromEntries(seed.panels.map(frame => {
      const members = frame.memberAssetIds.flatMap(id => {
        const delta = assetTranslations[id]; return delta ? [delta] : [];
      });
      const average = members.length
        ? [members.reduce((sum, delta) => sum + delta[0], 0) / members.length, members.reduce((sum, delta) => sum + delta[1], 0) / members.length]
        : [0, 0];
      return [frame.id, average as [number, number]];
    }));
    const candidate = layoutWholeGraphCandidate(model, {
      baseGeometry: seed,
      assetTranslations,
      roomTranslations: frameTranslations,
      routeBudget: 'quick',
    });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    let routeContentHits = 0;
    const routeContentHitExamples: { routeId: string; fallback: boolean; assetId: string; boxId: string; terminals: readonly [string, string]; ignoredObstacleIds: readonly string[]; points: readonly (readonly [number, number])[]; box: typeof candidate.symbolLabelBoxes[number] }[] = [];
    for (const [routeId, points] of candidate.routes) {
      const connection = model.connections.find(item => item.id === routeId)!;
      const endpointOwners = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const assetId = box.id.replace(/^(?:symbol|label):/, '');
        if (endpointOwners.includes(assetId)) continue;
        if (points.slice(1).some((point, index) => cutsBox(points[index], point, box))) {
          routeContentHits++;
          if (routeContentHitExamples.length < 12) routeContentHitExamples.push({
            routeId,
            fallback: candidate.fallbackRouteIds.includes(routeId),
            assetId,
            boxId: box.id,
            terminals: [connection.from, connection.to],
            ignoredObstacleIds: candidate.routeRequests.find(request => request.id === routeId)?.ignoredObstacleIds ?? [],
            points,
            box,
          });
        }
      }
    }
    const counts = (type: string) => candidate.findings.filter(finding => finding.type === type).length;
    const unresolvedReasonCounts = candidate.unresolved.reduce<Record<string, number>>((counts, item) => {
      const reason = item.slice(item.lastIndexOf(':') + 1);
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
    const blockedEndpointExamples = candidate.unresolved.filter(item => item.endsWith(':blocked-endpoint')).slice(0, 12).map(item => {
      const routeId = item.slice(0, item.lastIndexOf(':'));
      const request = candidate.routeRequests.find(candidateRequest => candidateRequest.id === routeId)!;
      const ignored = new Set(request.ignoredObstacleIds ?? []);
      const blockers = (['from', 'to'] as const).flatMap(end => {
        const point = request[end];
        const content = candidate.symbolLabelBoxes.filter(box => !ignored.has(box.id)
          && point[0] > box.x && point[0] < box.x + box.width && point[1] > box.y && point[1] < box.y + box.height)
          .map(box => `${end}:${box.id}`);
        const frames = candidate.frames.filter(frame => !ignored.has(`room:${frame.id}`)
          && point[0] > frame.x && point[0] < frame.x + frame.width && point[1] > frame.y && point[1] < frame.y + frame.height)
          .map(frame => `${end}:room:${frame.id}`);
        return [...content, ...frames];
      });
      return { routeId, from: request.from, to: request.to, ignored: request.ignoredObstacleIds, blockers };
    });
    const frameContentBounds = candidate.frames.map(frame => {
      const members = new Set(frame.memberAssetIds);
      const boxes = candidate.symbolLabelBoxes.filter(box => members.has(box.id.replace(/^(?:symbol|label):/, '')));
      return boxes.length ? {
        id: frame.id,
        x: Math.min(...boxes.map(box => box.x)) - 220,
        y: Math.min(...boxes.map(box => box.y)) - 260,
        width: Math.max(...boxes.map(box => box.x + box.width)) - Math.min(...boxes.map(box => box.x)) + 440,
        height: Math.max(...boxes.map(box => box.y + box.height)) - Math.min(...boxes.map(box => box.y)) + 520,
      } : undefined;
    }).filter((frame): frame is NonNullable<typeof frame> => Boolean(frame));
    const frameContentOverlaps: string[] = [];
    for (let i = 0; i < frameContentBounds.length; i++) for (let j = i + 1; j < frameContentBounds.length; j++) {
      const a = frameContentBounds[i]; const b = frameContentBounds[j];
      if (a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y) {
        frameContentOverlaps.push(`${a.id}↔${b.id}`);
      }
    }
    console.info('compact tree + whole graph route metrics', JSON.stringify({
      assets: Object.keys(candidate.positions).length,
      connections: candidate.modelConnectionCount,
      routed: candidate.routeCount,
      unresolved: candidate.unresolved.length,
      unresolvedReasonCounts,
      unresolvedExamples: candidate.unresolved.slice(0, 30),
      blockedEndpointExamples,
      routeContentHits,
      fallbackRouteCount: candidate.fallbackRouteIds.length,
      obstacleInvalidRouteCount: candidate.obstacleInvalidRouteIds.length,
      obstacleInvalidRouteExamples: candidate.obstacleInvalidRouteIds.slice(0, 20),
      routeContentHitExamples,
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      crossings: counts('route-crossing'),
      sharedLengths: counts('shared-route-length'),
      endpointContacts: counts('route-endpoint-on-interior'),
      frameOverlaps: counts('room-frame-overlap'),
      measuredFrameContentOverlaps: frameContentOverlaps.length,
      measuredFrameOverlapExamples: frameContentOverlaps.slice(0, 12),
      frameCuts: counts('route-room-frame'),
      nonOrthogonal: counts('non-orthogonal'),
      bounds: candidate.bounds,
      routeOrder: candidate.routingOrder,
    }));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routeRequests).toHaveLength(model.connections.length);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 180_000);
});
