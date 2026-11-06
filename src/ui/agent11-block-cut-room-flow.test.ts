import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutAgent11BlockCutRoomFlow, agent11CountContentCollisions, countAgent11RouteContentHits } from './agent11-block-cut-room-flow';
import { layoutAgent3RoomModuleTree } from './agent3-room-module-tree-candidate';
import { validateDiagramGeometry, type GeometryRoute } from './geometry-validator';

describe('agent11 block-cut room flow', () => {
  it('preserves the model and audits tree/cotree placement against the room-module trial', () => {
    const model = currentNetworkModel;
    const candidate = layoutAgent11BlockCutRoomFlow(model);
    const replay = layoutAgent11BlockCutRoomFlow(model);
    const baseline = layoutAgent3RoomModuleTree(model);
    const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const byConnection = new Map(model.connections.map(connection => [connection.id, connection] as const));
    const asGeometry = (routes: ReadonlyMap<string, readonly (readonly [number, number])[]>): GeometryRoute[] => [...routes].map(([id, points]) => {
      const connection = byConnection.get(id)!;
      return { id, points: points.map(([x, y]) => [x, y] as [number, number]), terminals: [connection.from, connection.to] };
    });
    const candidateRoutes = asGeometry(candidate.routing.routes);
    const candidateFindings = validateDiagramGeometry({ routes: candidateRoutes, roomFrames: candidate.roomFrames });
    const endpointsWrong = candidateRoutes.filter(route => {
      const link = byConnection.get(route.id)!; const old = candidate.source.originalRoutes.get(route.id);
      if (!old) return true;
      const fromOwner = ownerByTerminal.get(link.from)!; const toOwner = ownerByTerminal.get(link.to)!;
      const fromDelta = candidate.moved.deltaByAsset.get(fromOwner) ?? [0, 0];
      const toDelta = candidate.moved.deltaByAsset.get(toOwner) ?? [0, 0];
      const start = route.points[0]; const end = route.points.at(-1)!; const oldEnd = old.at(-1)!;
      return start[0] !== old[0][0] + fromDelta[0] || start[1] !== old[0][1] + fromDelta[1]
        || end[0] !== oldEnd[0] + toDelta[0] || end[1] !== oldEnd[1] + toDelta[1];
    }).map(route => route.id);
    const routeHits = countAgent11RouteContentHits(candidateRoutes.map(route => ({
      ...route,
      endpoints: [ownerByTerminal.get(byConnection.get(route.id)!.from)!, ownerByTerminal.get(byConnection.get(route.id)!.to)!],
    })), candidate.symbolLabelBoxes).size;
    const baselineFindings = validateDiagramGeometry({ routes: asGeometry(baseline.routing.routes), roomFrames: baseline.roomFrames });
    const baselinePoints = [...Object.values(baseline.positions), ...[...baseline.routing.routes.values()].flat(), ...baseline.roomFrames.flatMap(frame => [[frame.x, frame.y] as [number, number], [frame.x + frame.width, frame.y + frame.height] as [number, number]])];
    const baselineXs = baselinePoints.map(point => point[0]); const baselineYs = baselinePoints.map(point => point[1]);
    const baselineBounds = { width: Math.max(...baselineXs) - Math.min(...baselineXs), height: Math.max(...baselineYs) - Math.min(...baselineYs) };
    const baselineMetrics = {
      routed: baseline.routing.routes.size,
      unresolved: baseline.routing.remaining.length,
      contentCollisions: agent11CountContentCollisions(baseline.symbolLabelBoxes),
      routeCrossings: baselineFindings.filter(item => item.type === 'route-crossing').length,
      sharedLengths: baselineFindings.filter(item => item.type === 'shared-route-length').length,
      endpointInterior: baselineFindings.filter(item => item.type === 'route-endpoint-on-interior').length,
      frameOverlaps: baselineFindings.filter(item => item.type === 'room-frame-overlap').length,
      frameHits: baselineFindings.filter(item => item.type === 'route-room-frame').length,
      aspect: +(baselineBounds.width / Math.max(1, baselineBounds.height)).toFixed(3),
    };
    const metrics = {
      assets: Object.keys(candidate.positions).length,
      connections: model.connections.length,
      routed: candidate.routing.routes.size,
      unresolved: candidate.routing.remaining.length,
      cotreeEdges: candidate.cotreeEdges.length,
      cotreeBlocks: candidate.groups.size,
      roomModules: candidate.roomFrames.length,
      endpointMismatches: endpointsWrong.length,
      contentBoxCollisions: agent11CountContentCollisions(candidate.symbolLabelBoxes),
      routeContentHits: routeHits,
      routeCrossings: candidateFindings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: candidateFindings.filter(item => item.type === 'shared-route-length').length,
      endpointOnInterior: candidateFindings.filter(item => item.type === 'route-endpoint-on-interior').length,
      frameOverlaps: candidateFindings.filter(item => item.type === 'room-frame-overlap').length,
      frameHits: candidateFindings.filter(item => item.type === 'route-room-frame').length,
      aspect: +(candidate.bounds.width / Math.max(1, candidate.bounds.height)).toFixed(3),
      bounds: candidate.bounds,
      deterministic: JSON.stringify([...candidate.targetByRoom]) === JSON.stringify([...replay.targetByRoom]),
      baseline: baselineMetrics,
    };
    console.info('agent11 block-cut room flow metrics', JSON.stringify(metrics));
    expect(Object.keys(candidate.positions)).toHaveLength(model.assets.length);
    expect(candidate.routing.routes.size + candidate.routing.remaining.length).toBe(model.connections.length);
    expect(endpointsWrong).toEqual([]);
    expect(metrics.deterministic).toBe(true);
  }, 300_000);
});
