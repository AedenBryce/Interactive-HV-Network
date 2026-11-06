import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
import { layoutAgent1Sugiyama } from './agent1-sugiyama-layout';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { validateDiagramGeometry } from './geometry-validator';
import { cutsBox } from './diagram-geometry';

describe('agent1 isolated Sugiyama-style whole-network layout', () => {
  it('places compound room nodes by stable selected-tree ranks and barycenter order, then audits all edges', () => {
    const model = currentNetworkModel; const base = continuousNetwork(model);
    const layout = layoutAgent1Sugiyama(model, base);
    const candidate = layoutWholeGraphCandidate(model, {
      roomTranslations: layout.roomTranslations,
      assetTranslations: layout.assetTranslations,
      baseGeometry: base,
      routeBudget: 'default',
    });
    const routeById = candidate.routes;
    const fullRoutes = [...routeById].map(([id, points]) => {
      const connection = model.connections.find(item => item.id === id)!;
      return { id, points, terminals: [connection.from, connection.to] as [string, string] };
    });
    const findings = validateDiagramGeometry({
      routes: fullRoutes,
      roomFrames: candidate.frames.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    });
    const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
    const endpointMismatches = [...routeById].flatMap(([id, points]) => {
      const request = candidate.routeRequests.find(item => item.id === id)!;
      const start = points[0]; const end = points.at(-1)!;
      return Math.abs(start[0] - request.from[0]) > 0.001 || Math.abs(start[1] - request.from[1]) > 0.001
        || Math.abs(end[0] - request.to[0]) > 0.001 || Math.abs(end[1] - request.to[1]) > 0.001 ? [id] : [];
    });
    const symbolLabelHits = new Set<string>();
    for (const [id, points] of routeById) {
      const connection = connectionById.get(id)!; const endpoints = [owners.get(connection.from), owners.get(connection.to)];
      for (const box of candidate.symbolLabelBoxes) {
        const assetId = box.id.replace(/^(?:symbol|label):/, ''); if (endpoints.includes(assetId)) continue;
        for (let index = 1; index < points.length; index++) if (cutsBox(points[index - 1], points[index], box)) { symbolLabelHits.add(`${id}→${box.id}`); break; }
      }
    }
    const dimensions = [...Object.values(candidate.positions), ...[...routeById.values()].flat(),
      ...candidate.frames.flatMap(frame => [[frame.x, frame.y] as const, [frame.x + frame.width, frame.y + frame.height] as const])];
    const xs = dimensions.map(point => point[0]); const ys = dimensions.map(point => point[1]);
    const bounds = { width: Math.max(...xs) - Math.min(...xs), height: Math.max(...ys) - Math.min(...ys) };
    const roomFrameOverlaps = findings.filter(item => item.type === 'room-frame-overlap');
    const frameCuts = findings.filter(item => item.type === 'route-room-frame');
    const unresolvedByReason = candidate.unresolved.reduce<Record<string, string[]>>((result, entry) => {
      const split = entry.lastIndexOf(':'); (result[entry.slice(split + 1)] ??= []).push(entry.slice(0, split)); return result;
    }, {});
    const ringId = 'whole:join:crushing-tie';
    const summary = {
      assets: model.assets.length,
      connections: model.connections.length,
      compoundGroups: layout.groupCount,
      bridgeGroups: layout.bridgeGroupCount,
      rankedLayers: layout.ranks,
      confirmedParentViolations: layout.confirmedParentViolations,
      macroGroupOverlaps: layout.groupOverlaps.length,
      macroBarycenterCrossings: countMacroCrossings(layout),
      routed: candidate.routeCount,
      unresolved: candidate.unresolved.length,
      unresolvedByReason,
      endpointMismatches,
      routeCrossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteConflicts: findings.filter(item => item.type === 'shared-route-length').length,
      endpointOnInterior: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      contentBoxCollisions: candidate.contentBoxCollisions.length,
      symbolLabelRouteHits: symbolLabelHits.size,
      roomFrameOverlaps: roomFrameOverlaps.length,
      frameCuts: frameCuts.length,
      ringRouted: routeById.has(ringId),
      sw411JoinCount: model.connections.filter(edge => edge.id.startsWith('whole:join:') && edge.id !== ringId).filter(edge => routeById.has(edge.id)).length,
      sw411JoinTotal: model.connections.filter(edge => edge.id.startsWith('whole:join:') && edge.id !== ringId).length,
      bounds,
      aspect: bounds.width / bounds.height,
    };
    console.info('agent1 Sugiyama full-model metrics', JSON.stringify(summary, null, 2));
    expect(layout.groupOverlaps).toEqual([]);
    expect(candidate.routeCount + candidate.unresolved.length).toBe(model.connections.length);
  }, 300_000);
});

function countMacroCrossings(layout: ReturnType<typeof layoutAgent1Sugiyama>) {
  let count = 0;
  for (const [rankText, ids] of Object.entries(layout.layerOrder)) {
    const rank = Number(rankText); const next = layout.layerOrder[String(rank + 1)]; if (!next) continue;
    const sourceOrder = new Map(ids.map((id, index) => [id, index])); const targetOrder = new Map(next.map((id, index) => [id, index]));
    const pairs: [number, number][] = [];
    for (const id of ids) for (const neighbor of layout.adjacency[id] ?? []) {
      if (layout.rankByGroup[neighbor] === rank + 1) pairs.push([sourceOrder.get(id)!, targetOrder.get(neighbor)!]);
    }
    for (let i = 0; i < pairs.length; i++) for (let j = i + 1; j < pairs.length; j++) {
      if ((pairs[i][0] - pairs[j][0]) * (pairs[i][1] - pairs[j][1]) < 0) count++;
    }
  }
  return count;
}
