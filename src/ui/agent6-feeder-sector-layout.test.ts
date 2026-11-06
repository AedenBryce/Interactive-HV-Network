import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutAgent6FeederSectors } from './agent6-feeder-sector-layout';

describe('agent 6 feeder-sector decomposition trial', () => {
  it('reports full-model route and geometry metrics without changing model identities', () => {
    const model = currentNetworkModel;
    const trial = layoutAgent6FeederSectors(model);
    const { candidate, placement, unitBoxes, unitAssets } = trial;
    const frames = candidate.frames;
    const frameOverlaps = frames.flatMap((a, index) => frames.slice(index + 1)
      .filter(b => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
      .map(b => `${a.id}↔${b.id}`));
    const findings = candidate.findings;
    const assignedAssetIds = [...unitAssets.values()].flat();
    const duplicateAssetAssignments = assignedAssetIds.filter((id, index) => assignedAssetIds.indexOf(id) !== index);
    const unrouted = candidate.unresolved;
    const summary = {
      assets: model.assets.length,
      assignedAssets: new Set(assignedAssetIds).size,
      missingAssetIds: model.assets.filter(asset => !assignedAssetIds.includes(asset.id)).map(asset => asset.id),
      duplicateAssetAssignments: [...new Set(duplicateAssetAssignments)],
      connections: model.connections.length,
      routed: candidate.routeCount,
      unresolved: unrouted.length,
      unresolvedRoutes: unrouted,
      routeIdSetPreserved: candidate.routeCount + unrouted.length === model.connections.length,
      frames: frames.length,
      frameOverlaps,
      frameCuts: findings.filter(item => item.type === 'route-room-frame').length,
      routeCrossings: findings.filter(item => item.type === 'route-crossing').length,
      sharedRouteLengths: findings.filter(item => item.type === 'shared-route-length').length,
      endpointContacts: findings.filter(item => item.type === 'route-endpoint-on-interior').length,
      nonOrthogonalSegments: findings.filter(item => item.type === 'non-orthogonal').length,
      contentBoxCollisionCount: candidate.contentBoxCollisions.length,
      contentBoxCollisionExamples: candidate.contentBoxCollisions.slice(0, 12),
      sectorUnits: unitBoxes.size,
      unplacedUnits: placement.unplaced,
      deterministicPlacement: trial.deterministicPlacement,
      bounds: candidate.bounds,
      aspectRatio: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
      sectorParentedUnits: Object.values(placement.positions).filter(position => position.parentIds.length > 0).length,
      ringPairPlacement: placement.positions['western/h1-hv'] && placement.positions['hopper-10/rmu']
        ? { first: placement.positions['western/h1-hv'], second: placement.positions['hopper-10/rmu'] }
        : undefined,
    };
    console.info('agent6 feeder-sector full-model audit', JSON.stringify(summary));
    expect(new Set(assignedAssetIds).size).toBe(model.assets.length);
    expect(duplicateAssetAssignments).toEqual([]);
    expect(candidate.routeCount + unrouted.length).toBe(model.connections.length);
  }, 360_000);
});
