import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutAgent4BusbarCorridors, allocateMajorFeedChannels } from './agent4-busbar-corridor-candidate';

describe('agent4 busbar-first corridor candidate', () => {
  it('preserves and cleanly routes every model connection', () => {
    const model = currentNetworkModel;
    const candidate = layoutAgent4BusbarCorridors(model);
    const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const secondChannelPlan = allocateMajorFeedChannels(candidate.requests, terminalOwner);
    const routeIds = [...candidate.routes.keys(), ...candidate.unresolved.map(item => item.routeId)];
    const findings = candidate.findings;
    const symbolOverlaps = countOverlaps(candidate.seed.symbolBoxes);
    const labels = [...candidate.seed.labels].map(([id, box]) => ({ id: `label:${id}`, ...box }));
    const labelOverlaps = countOverlaps(labels);
    const symbolLabelOverlaps = candidate.seed.symbolBoxes.flatMap(symbol => labels
      .filter(label => symbol.id !== `symbol:${label.id.slice('label:'.length)}` && boxesOverlap(symbol, label))
      .map(label => `${symbol.id}/${label.id}`));
    const metrics = {
      assets: Object.keys(candidate.seed.positions).length,
      connections: candidate.modelInventory.connections,
      routed: candidate.routedCount,
      unresolved: candidate.unresolved.length,
      stages: candidate.stages,
      busbarSegments: candidate.busbars.length,
      feederChannels: candidate.corridorPaths.size,
      deterministicChannels: JSON.stringify([...candidate.corridorPaths]) === JSON.stringify([...secondChannelPlan.paths]),
      resultIdCoverage: routeIds.length,
      duplicateResultIds: routeIds.length - new Set(routeIds).size,
      endpointMismatches: candidate.endpointMismatches.length,
      routeCrossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonal: findings.filter(item => item.type === 'non-orthogonal').length,
      symbolOverlaps,
      labelOverlaps,
      symbolLabelOverlaps: symbolLabelOverlaps.length,
      lineSymbolOrLabelHits: candidate.symbolLabelHits.length,
      roomFrameOverlaps: candidate.roomFrameOverlaps,
      unrelatedFrameCuts: candidate.unrelatedFrameCuts,
      bounds: candidate.bounds,
      aspectRatio: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
    };
    console.info('agent4 busbar corridor metrics', JSON.stringify(metrics));
    expect(candidate.modelInventory.assets).toBe(model.assets.length);
    expect(candidate.modelInventory.connections).toBe(model.connections.length);
    expect(Object.keys(candidate.seed.positions)).toHaveLength(model.assets.length);
    expect(candidate.requests).toHaveLength(model.connections.length);
    expect(routeIds).toHaveLength(model.connections.length);
    expect(new Set(routeIds).size).toBe(model.connections.length);
    expect(candidate.endpointMismatches).toEqual([]);
    expect(metrics.deterministicChannels).toBe(true);
    expect(candidate.unresolved, 'all modeled connections must route').toEqual([]);
    expect(metrics.routeCrossings).toBe(0);
    expect(metrics.sharedRouteLengths).toBe(0);
    expect(metrics.endpointContacts).toBe(0);
    expect(metrics.nonOrthogonal).toBe(0);
    expect(metrics.symbolOverlaps).toBe(0);
    expect(metrics.labelOverlaps).toBe(0);
    expect(metrics.symbolLabelOverlaps).toBe(0);
    expect(metrics.lineSymbolOrLabelHits).toBe(0);
    expect(metrics.roomFrameOverlaps).toBe(0);
    expect(metrics.unrelatedFrameCuts).toBe(0);
  }, 180_000);
});

function boxesOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
function countOverlaps<T extends { x: number; y: number; width: number; height: number }>(boxes: readonly T[]) {
  let count = 0;
  for (let i = 0; i < boxes.length; i++) for (const other of boxes.slice(i + 1)) if (boxesOverlap(boxes[i], other)) count++;
  return count;
}
