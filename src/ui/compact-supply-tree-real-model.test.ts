import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutCurrentWholeNetwork } from './compact-supply-tree-network-adapter';
import { continuousNetwork } from './continuous-network';
describe('candidate compact layout against the actual whole-network model', () => {
  it('produces a measured top-down spanning forest without node/card footprint collisions', () => {
    const baseGeometry = continuousNetwork(currentNetworkModel);
    const layout = layoutCurrentWholeNetwork({ baseGeometry });
    console.info('measured compact-tree collision details', layout.footprintCollisionDetails.slice(0, 10));
    expect(layout.model).toEqual({ id: currentNetworkModel.id, version: currentNetworkModel.version, assetCount: currentNetworkModel.assets.length, connectionCount: currentNetworkModel.connections.length });
    expect(Object.keys(layout.positions)).toHaveLength(layout.model.assetCount);
    expect(layout.unplacedAssetIds).toEqual([]);
    expect(layout.multiParentAssetIds).toEqual([]);
    expect(layout.footprintCollisions).toEqual([]);
    for (const [parent, descendants] of layout.children) for (const child of descendants) {
      expect(layout.positions[child][1], `${parent} → ${child}`).toBeGreaterThan(layout.positions[parent][1]);
    }
    // Keep this output in the test report so real-model aspect and cycle/tie
    // behavior can be compared without modifying production presentation data.
    console.info('compact layout actual-model metrics', {
      ...layout.model,
      bounds: layout.bounds,
      aspectRatio: +(layout.bounds.width / layout.bounds.height).toFixed(3),
      rowCount: layout.rowCount,
      roots: layout.roots.length,
      unplaced: layout.unplacedAssetIds.length,
      multiParent: layout.multiParentAssetIds.length,
      nonTreeConnections: layout.nonTreeConnectionIds.length,
      footprintCollisions: layout.footprintCollisions.length,
      sw411BusBChildren: layout.children.get('sw411:bus-b')?.map(id => ({ id, x: layout.positions[id][0], y: layout.positions[id][1] })),
    });
    const packingComparisons = [320, 440, 560, 700].map(verticalGap => {
      const candidate = layoutCurrentWholeNetwork({ maxWidth: 12_000, verticalGap, baseGeometry });
      return {
        verticalGap,
        bounds: candidate.bounds,
        aspectRatio: +(candidate.bounds.width / candidate.bounds.height).toFixed(3),
        rows: candidate.rowCount,
        collisions: candidate.footprintCollisions.length,
        examples: candidate.footprintCollisions.slice(0, 4),
      };
    });
    console.info('compact layout packing alternatives', packingComparisons);
  }, 120_000);
});
