import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { placeRoomAndBridgeMacros } from './room-macro-layout-candidate';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { completeMacroRoutesWithFallback } from './macro-route-fallback';
import type { Point } from './diagram-geometry';

describe('isolated rigid room/bridge macro layout', () => {
  it('places all rigid macros and routes all model edges without changing model topology', () => {
    const model = currentNetworkModel;
    const base = continuousNetwork(model);
    const placement = placeRoomAndBridgeMacros(model, base);
    console.info('rigid room/bridge macro geometry', JSON.stringify({
      groupCount: placement.groupCount,
      bridgeGroupCount: placement.bridgeGroupCount,
      detachedBridgeGroupCount: placement.detachedBridgeGroupCount,
      bounds: placement.bounds,
      groupOverlaps: placement.groupOverlaps,
      parentOrderViolations: placement.parentOrderViolations,
      multiAttachmentGroups: placement.componentAttachments.filter(item => item.slice(item.lastIndexOf(':') + 1).split('|').length > 1),
    }));
    expect(placement.groupOverlaps).toEqual([]);
    expect(placement.parentOrderViolations).toEqual([]);

    const ringId = 'whole:join:crushing-tie';
    const ringConnection = model.connections.find(connection => connection.id === ringId)!;
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const fromAsset = ownerByTerminal.get(ringConnection.from)!; const toAsset = ownerByTerminal.get(ringConnection.to)!;
    const fromDelta = placement.translationByAsset[fromAsset]; const toDelta = placement.translationByAsset[toAsset];
    const from: Point = [base.view.layout.terminals[ringConnection.from][0] + fromDelta[0], base.view.layout.terminals[ringConnection.from][1] + fromDelta[1]];
    const to: Point = [base.view.layout.terminals[ringConnection.to][0] + toDelta[0], base.view.layout.terminals[ringConnection.to][1] + toDelta[1]];
    const movedFrames = base.panels.map(frame => ({ ...frame, x: frame.x + (placement.roomTranslations[frame.id]?.[0] ?? 0), y: frame.y + (placement.roomTranslations[frame.id]?.[1] ?? 0) }));
    const baseSw431 = base.panels.find(frame => frame.id === 'crushing-1/hv')!;
    const baseSw435 = base.panels.find(frame => frame.id === 'crushing-2/sw435-hv')!;
    const movedSw431 = movedFrames.find(frame => frame.id === 'crushing-1/hv')!;
    const movedSw435 = movedFrames.find(frame => frame.id === 'crushing-2/sw435-hv')!;
    const fromRoom = placement.macroGroupByAsset[fromAsset] === 'room:crushing-1/hv' ? 'sw431' : 'sw435';
    const fromBaseFrame = fromRoom === 'sw431' ? baseSw431 : baseSw435;
    const toBaseFrame = fromRoom === 'sw431' ? baseSw435 : baseSw431;
    const ringCorridor = buildRingCorridor(base.routes.get(ringId)!, from, to, fromBaseFrame, toBaseFrame, movedSw431, movedSw435, fromDelta, toDelta);

    const candidate = layoutWholeGraphCandidate(model, {
      roomTranslations: placement.roomTranslations,
      assetTranslations: placement.assetTranslations,
      baseGeometry: base,
      routeBudget: 'default',
      preferredPaths: new Map([[ringId, ringCorridor]]),
      prioritizeConnectionIds: [ringId],
    });
    const complete = completeMacroRoutesWithFallback(model, base, candidate, placement, new Map([[ringId, ringCorridor]]));
    const unresolvedByReason = candidate.unresolved.reduce<Record<string, string[]>>((result, item) => {
      const separator = item.lastIndexOf(':');
      const id = item.slice(0, separator); const reason = item.slice(separator + 1);
      (result[reason] ??= []).push(id); return result;
    }, {});
    const unresolvedReasonCounts = Object.fromEntries(Object.entries(unresolvedByReason).map(([reason, ids]) => [reason, ids.length]));
    const metric = (type: string) => complete.findings.filter(item => item.type === type).length;
    const sw411 = model.connections.filter(connection => connection.id.startsWith('whole:join:') && connection.id !== 'whole:join:crushing-tie')
      .map(connection => connection.id);
    const finalBounds = boundsOf([
      ...Object.values(candidate.positions), ...[...complete.routes.values()].flat(),
      ...candidate.frames.flatMap(frame => [[frame.x, frame.y] as Point, [frame.x + frame.width, frame.y + frame.height] as Point]),
    ]);
    console.info('rigid room/bridge macro full routing', JSON.stringify({
      routeCount: complete.routes.size,
      aStarRouteCount: candidate.routeCount,
      directRouteQuality: {
        crossings: candidate.findings.filter(item => item.type === 'route-crossing').length,
        sharedLengths: candidate.findings.filter(item => item.type === 'shared-route-length').length,
        endpointContacts: candidate.findings.filter(item => item.type === 'route-endpoint-on-interior').length,
        symbolLabelHits: countSymbolLabelHits(candidate),
        symbolLabelHitExamples: symbolLabelHitExamples(candidate).slice(0, 20),
        contentBoxCollisions: candidate.contentBoxCollisions.length,
      },
      fallbackCount: complete.fallbackKinds.size,
      fallbackKinds: Object.fromEntries([...complete.fallbackKinds].reduce((counts, [, kind]) => counts.set(kind, (counts.get(kind) ?? 0) + 1), new Map<string, number>())),
      unresolvedCount: candidate.unresolved.length,
      unresolvedReasonCounts,
      unresolvedByReason,
      crossings: metric('route-crossing'),
      sharedLengths: metric('shared-route-length'),
      endpointContacts: metric('route-endpoint-on-interior'),
      nonOrthogonal: metric('non-orthogonal'),
      frameOverlaps: metric('room-frame-overlap'),
      frameCuts: metric('route-room-frame'),
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      symbolLabelRouteHits: countSymbolLabelHits(candidate, complete.routes),
      sw411Routes: sw411.filter(id => complete.routes.has(id)),
      sw411Missing: sw411.filter(id => !complete.routes.has(id)),
      bounds: finalBounds,
      connectionCount: model.connections.length,
    }, null, 2));
    expect(complete.routes.size).toBe(model.connections.length);
    expect(complete.missingIds).toEqual([]);
    expect(complete.extraIds).toEqual([]);
  }, 300_000);
});

function countSymbolLabelHits(candidate: ReturnType<typeof layoutWholeGraphCandidate>, routes = candidate.routes) {
  const model = currentNetworkModel;
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  let count = 0;
  for (const [routeId, points] of routes) {
    const connection = connectionById.get(routeId)!;
    const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
    for (const box of candidate.symbolLabelBoxes) {
      const assetId = box.id.replace(/^(?:symbol|label):/, '');
      if (endpoints.includes(assetId)) continue;
      for (let index = 1; index < points.length; index++) {
        const a = points[index - 1]; const b = points[index];
        const hit = a[0] === b[0]
          ? a[0] > box.x && a[0] < box.x + box.width && Math.max(a[1], b[1]) > box.y && Math.min(a[1], b[1]) < box.y + box.height
          : a[1] > box.y && a[1] < box.y + box.height && Math.max(a[0], b[0]) > box.x && Math.min(a[0], b[0]) < box.x + box.width;
        if (hit) { count++; break; }
      }
    }
  }
  return count;
}

function symbolLabelHitExamples(candidate: ReturnType<typeof layoutWholeGraphCandidate>, routes = candidate.routes) {
  const model = currentNetworkModel;
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const hits: string[] = [];
  for (const [routeId, points] of routes) {
    const connection = connectionById.get(routeId)!;
    const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
    for (const box of candidate.symbolLabelBoxes) {
      const assetId = box.id.replace(/^(?:symbol|label):/, '');
      if (endpoints.includes(assetId)) continue;
      if (points.slice(1).some((point, index) => {
        const from = points[index];
        return from[0] === point[0]
          ? from[0] > box.x && from[0] < box.x + box.width && Math.max(from[1], point[1]) > box.y && Math.min(from[1], point[1]) < box.y + box.height
          : from[1] > box.y && from[1] < box.y + box.height && Math.max(from[0], point[0]) > box.x && Math.min(from[0], point[0]) < box.x + box.width;
      })) hits.push(`${routeId}→${box.id}`);
    }
  }
  return hits;
}

function buildRingCorridor(
  original: readonly Point[], from: Point, to: Point,
  sourceBaseFrame: { x: number; y: number; width: number; height: number },
  destinationBaseFrame: { x: number; y: number; width: number; height: number },
  sw431: { x: number; y: number; width: number; height: number },
  sw435: { x: number; y: number; width: number; height: number },
  fromDelta: Point, toDelta: Point,
): Point[] {
  const sourcePort = frameExit(original, sourceBaseFrame, true);
  const targetPort = frameExit(original, destinationBaseFrame, false);
  const sourceLead = sourcePort.points.map(([x, y], index) => index === 0 ? from : [x + fromDelta[0], y + fromDelta[1]] as Point);
  const targetLead = [...targetPort.points].reverse().map(([x, y], index, points) => index === points.length - 1 ? to : [x + toDelta[0], y + toDelta[1]] as Point);
  const left = sw431.x < sw435.x ? sw431 : sw435; const right = left === sw431 ? sw435 : sw431;
  const laneX = (left.x + left.width + right.x) / 2;
  return orthogonal([...sourceLead, [laneX, sourcePort.port[1] + fromDelta[1]], [laneX, targetPort.port[1] + toDelta[1]], ...targetLead]);
}

function frameExit(points: readonly Point[], frame: { x: number; y: number; width: number; height: number }, forward: boolean) {
  const scan = forward ? [...points] : [...points].reverse();
  for (let index = 1; index < scan.length; index++) {
    const port = segmentFramePort(scan[index - 1], scan[index], frame);
    if (port) return { points: [...scan.slice(0, index), port], port };
  }
  const endpoint = scan[0]; return { points: [endpoint], port: endpoint };
}

function segmentFramePort(a: Point, b: Point, frame: { x: number; y: number; width: number; height: number }): Point | undefined {
  if (a[0] === b[0] && a[0] >= frame.x && a[0] <= frame.x + frame.width) {
    const candidates = [frame.y, frame.y + frame.height].filter(y => y >= Math.min(a[1], b[1]) && y <= Math.max(a[1], b[1]));
    return candidates.sort((y1, y2) => Math.abs(y1 - a[1]) - Math.abs(y2 - a[1])).map(y => [a[0], y] as Point)[0];
  }
  if (a[1] === b[1] && a[1] >= frame.y && a[1] <= frame.y + frame.height) {
    const candidates = [frame.x, frame.x + frame.width].filter(x => x >= Math.min(a[0], b[0]) && x <= Math.max(a[0], b[0]));
    return candidates.sort((x1, x2) => Math.abs(x1 - a[0]) - Math.abs(x2 - a[0])).map(x => [x, a[1]] as Point)[0];
  }
  return undefined;
}

function orthogonal(points: readonly Point[]): Point[] {
  const result: Point[] = [];
  for (const point of points) {
    const previous = result.at(-1);
    if (!previous) { result.push(point); continue; }
    if (previous[0] !== point[0] && previous[1] !== point[1]) result.push([point[0], previous[1]]);
    if (result.at(-1)![0] !== point[0] || result.at(-1)![1] !== point[1]) result.push(point);
  }
  return result;
}

function boundsOf(points: readonly Point[]) {
  const xs = points.map(([x]) => x); const ys = points.map(([, y]) => y);
  return { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
}
