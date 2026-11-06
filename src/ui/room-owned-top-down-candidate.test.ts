import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { cutsBox } from './diagram-geometry';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import { packRoomSiblingBranches } from './room-sibling-branch-packing';
import { alignRoomBranchesByCablePorts } from './room-port-aligned-packing';
import { packSw411ChildrenByRoutePorts } from './sw411-port-row-packing';

describe('room-owned top-down layout candidate', () => {
  it('preserves local room geometry and audits full-network external joins', () => {
    const model = currentNetworkModel;
    const production = continuousNetwork(model);
    const candidate = layoutRoomOwnedTopDownCandidate(model);
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const geometryRoutes = (routes: ReadonlyMap<string, readonly [number, number][]>): GeometryRoute[] => [...routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const baseFindings = validateDiagramGeometry({
      routes: geometryRoutes(production.routes),
      roomFrames: production.panels.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const findings = candidate.findings;
    const newIds = new Set(candidate.externalConnectionIds);
    const routeHits: string[] = [];
    for (const route of geometryRoutes(candidate.routes)) for (let index = 1; index < route.points.length; index++) {
      const connection = connectionById.get(route.id)!;
      const endpointOwners = [owners.get(connection.from), owners.get(connection.to)];
      if (!newIds.has(route.id)) continue;
      const a = route.points[index - 1] as [number, number]; const b = route.points[index] as [number, number];
      for (const box of candidate.symbolLabelBoxes) {
        const assetId = box.id.replace(/^(?:symbol|label):/, '');
        if (endpointOwners.includes(assetId)) continue;
        if (cutsBox(a, b, box)) routeHits.push(`${route.id}→${box.id}`);
      }
    }
    const externalFrameCuts = findings.filter(item => item.type === 'route-room-frame' && newIds.has(item.routeId));
    const unrelatedFrameCuts = externalFrameCuts.filter(item => {
      if (item.type !== 'route-room-frame') return false;
      const connection = connectionById.get(item.routeId)!;
      const roomMembers = candidate.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
      return !roomMembers.includes(owners.get(connection.from)!) && !roomMembers.includes(owners.get(connection.to)!);
    });
    const summary = {
      modelConnections: model.connections.length,
      productionRoutes: production.routes.size,
      candidateRoutes: candidate.routeCount,
      candidateExternalConnections: candidate.externalConnectionIds.length,
      candidateUnresolved: candidate.unresolved,
      candidateConnectionsWithoutRoute: candidate.connectionsWithoutRoute,
      duplicateRoomOwners: candidate.duplicateRoomOwners,
      roomFrames: candidate.frames.length,
      productionFindings: findingsSummary(baseFindings),
      candidateFindings: findingsSummary(findings),
      externalFrameCuts: externalFrameCuts.length,
      unrelatedExternalFrameCuts: unrelatedFrameCuts.map(item => item.type === 'route-room-frame' ? `${item.routeId}→${item.roomFrameId}` : ''),
      externalSymbolLabelCuts: [...new Set(routeHits)],
      bounds: candidate.bounds,
      aspectRatio: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
      placedRoomFrames: Object.keys(candidate.placement.positions).length,
    };
    console.info('room-owned top-down candidate', JSON.stringify(summary));
    expect(candidate.expectedConnectionCount).toBe(model.connections.length);
    expect(candidate.initialRouteCount).toBe(production.routes.size);
  }, 180_000);

  it('audits translated-path and gutter fallback across the full connection set', () => {
    const model = currentNetworkModel;
    const candidate = layoutRoomOwnedTopDownCandidate(model);
    const fallback = routeRoomOwnedCandidateGutters(model, candidate);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const geometryRoutes: GeometryRoute[] = [...fallback.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({
      routes: geometryRoutes,
      roomFrames: candidate.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const unrelatedFrameCuts = findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId)!;
      const members = candidate.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
      return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
    }).map(item => `${item.routeId}→${item.roomFrameId}`);
    const symbolLabelHits = new Set<string>();
    for (const route of geometryRoutes) {
      const connection = connectionById.get(route.id)!;
      const endpoints = [ownerByTerminal.get(connection.from), ownerByTerminal.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const owner = box.id.replace(/^(?:symbol|label):/, '');
        if (endpoints.includes(owner)) continue;
        for (let index = 1; index < route.points.length; index++) {
          if (cutsBox(route.points[index - 1] as [number, number], route.points[index] as [number, number], box)) symbolLabelHits.add(`${route.id}→${box.id}`);
        }
      }
    }
    const xs = [...fallback.routes.values()].flatMap(points => points.map(point => point[0]));
    const ys = [...fallback.routes.values()].flatMap(points => points.map(point => point[1]));
    const summary = {
      modelConnections: model.connections.length,
      routed: fallback.routes.size,
      keptTranslatedOriginal: fallback.keptOriginalIds.length,
      gutterAdded: fallback.gutterRoutedIds.length,
      rejectedOriginal: fallback.rejectedOriginalIds.length,
      gutterFailures: fallback.gutterFailures.map(item => `${item.routeId}:${item.reason}`),
      remaining: fallback.remaining,
      findings: findingsSummary(findings),
      symbolLabelHits: [...symbolLabelHits],
      unrelatedFrameCuts,
      roomOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
      bounds: { x: Math.min(...xs), y: Math.min(...ys), width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) },
    };
    console.info('room-owned translated-path fallback', JSON.stringify(summary));
    expect(fallback.routes.size + fallback.remaining.length).toBe(model.connections.length);
  }, 240_000);

  it('audits confirmed-sibling subtree packing with H3 and RM721 services as separate branches', () => {
    const model = currentNetworkModel;
    const original = layoutRoomOwnedTopDownCandidate(model);
    const packed = packRoomSiblingBranches(model, original, { columns: 2 });
    const fallback = routeRoomOwnedCandidateGutters(model, packed);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const routes: GeometryRoute[] = [...fallback.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: packed.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const unrelatedFrameCuts = findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId)!;
      const members = packed.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
      return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
    });
    const ids = new Set(packed.frames.map(frame => frame.id));
    const frames = packed.frames.filter(frame => ids.has(frame.id)).map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
    const overlaps = frames.flatMap((a, index) => frames.slice(index + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => `${a.id}↔${b.id}`));
    const points = [...fallback.routes.values()].flat();
    const summary = {
      positions: Object.fromEntries(packed.frames.map(frame => [frame.id, { x: frame.x, y: frame.y, width: frame.width, height: frame.height }])),
      connections: model.connections.length, routes: fallback.routes.size, remaining: fallback.remaining,
      gutterAdded: fallback.gutterRoutedIds.length, unresolved: fallback.gutterFailures.map(item => `${item.routeId}:${item.reason}`),
      findings: findingsSummary(findings), unrelatedFrameCuts: unrelatedFrameCuts.map(item => `${item.routeId}→${item.roomFrameId}`),
      frameOverlaps: overlaps,
      bounds: { x: Math.min(...points.map(point => point[0])), y: Math.min(...points.map(point => point[1])), width: Math.max(...points.map(point => point[0])) - Math.min(...points.map(point => point[0])), height: Math.max(...points.map(point => point[1])) - Math.min(...points.map(point => point[1])) },
    };
    console.info('room sibling branch packing', JSON.stringify(summary));
    expect(overlaps).toEqual([]);
    expect(fallback.routes.size + fallback.remaining.length).toBe(model.connections.length);
  }, 240_000);

  it('audits parent-child room packing aligned to measured cable frame ports', () => {
    const model = currentNetworkModel;
    const original = layoutRoomOwnedTopDownCandidate(model);
    const aligned = alignRoomBranchesByCablePorts(model, original);
    const packed = aligned.candidate;
    const fallback = routeRoomOwnedCandidateGutters(model, packed);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const routes: GeometryRoute[] = [...fallback.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: packed.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const unrelatedFrameCuts = findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId)!;
      const members = packed.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
      return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
    }).map(item => `${item.routeId}→${item.roomFrameId}`);
    const rectangles = packed.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
    const overlaps = rectangles.flatMap((a, index) => rectangles.slice(index + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => `${a.id}↔${b.id}`));
    const points = [...fallback.routes.values()].flat();
    const summary = {
      positions: Object.fromEntries(packed.frames.map(frame => [frame.id, { x: frame.x, y: frame.y, width: frame.width, height: frame.height }])),
      roomLinks: aligned.links, unresolvedParentLinks: aligned.unresolvedParentLinks,
      connections: model.connections.length, routes: fallback.routes.size, remaining: fallback.remaining,
      gutterAdded: fallback.gutterRoutedIds.length, unresolved: fallback.gutterFailures.map(item => `${item.routeId}:${item.reason}`),
      findings: findingsSummary(findings), unrelatedFrameCuts, frameOverlaps: overlaps,
      bounds: { x: Math.min(...points.map(point => point[0])), y: Math.min(...points.map(point => point[1])), width: Math.max(...points.map(point => point[0])) - Math.min(...points.map(point => point[0])), height: Math.max(...points.map(point => point[1])) - Math.min(...points.map(point => point[1])) },
    };
    console.info('room cable-port aligned packing', JSON.stringify(summary));
    expect(overlaps).toEqual([]);
    expect(fallback.routes.size + fallback.remaining.length).toBe(model.connections.length);
  }, 240_000);

  it('audits seven SW411 feeder room rows aligned to route endpoints', () => {
    const model = currentNetworkModel;
    const original = layoutRoomOwnedTopDownCandidate(model);
    const packed = packSw411ChildrenByRoutePorts(model, original).candidate;
    const fallback = routeRoomOwnedCandidateGutters(model, packed);
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const routes: GeometryRoute[] = [...fallback.routes].map(([id, points]) => {
      const connection = connectionById.get(id)!;
      return { id, points, terminals: [connection.from, connection.to] };
    });
    const findings = validateDiagramGeometry({
      routes,
      roomFrames: packed.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })),
    });
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const unrelatedFrameCuts = findings.filter(item => item.type === 'route-room-frame').filter(item => {
      const connection = connectionById.get(item.routeId)!;
      const members = packed.frames.find(frame => frame.id === item.roomFrameId)?.memberAssetIds ?? [];
      return !members.includes(ownerByTerminal.get(connection.from)!) && !members.includes(ownerByTerminal.get(connection.to)!);
    }).map(item => `${item.routeId}→${item.roomFrameId}`);
    const frames = packed.frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height }));
    const overlaps = frames.flatMap((a, index) => frames.slice(index + 1).filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y).map(b => `${a.id}↔${b.id}`));
    const points = [...fallback.routes.values()].flat();
    const summary = {
      positions: Object.fromEntries(frames.map(frame => [frame.id, { x: frame.x, y: frame.y, width: frame.width, height: frame.height }])),
      connections: model.connections.length, routes: fallback.routes.size, remaining: fallback.remaining,
      gutterAdded: fallback.gutterRoutedIds.length, failures: fallback.gutterFailures.map(item => `${item.routeId}:${item.reason}`),
      findings: findingsSummary(findings), unrelatedFrameCuts, frameOverlaps: overlaps,
      bounds: { x: Math.min(...points.map(point => point[0])), y: Math.min(...points.map(point => point[1])), width: Math.max(...points.map(point => point[0])) - Math.min(...points.map(point => point[0])), height: Math.max(...points.map(point => point[1])) - Math.min(...points.map(point => point[1])) },
    };
    console.info('SW411 route-endpoint child rows', JSON.stringify(summary));
    expect(overlaps).toEqual([]);
    expect(fallback.routes.size + fallback.remaining.length).toBe(model.connections.length);
  }, 240_000);
});

function findingsSummary(findings: ReturnType<typeof validateDiagramGeometry>) {
  return {
    crossings: findings.filter(item => item.type === 'route-crossing').length,
    sharedLengths: findings.filter(item => item.type === 'shared-route-length').length,
    endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
    nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
    roomOverlaps: findings.filter(item => item.type === 'room-frame-overlap').length,
    frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
  };
}
