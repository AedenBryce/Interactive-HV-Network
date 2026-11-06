import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { fitOverviewSummary } from './fit-overview-summary';

describe('fit overview summary prototype', () => {
  const result = fitOverviewSummary(currentNetworkModel);

  it('maps every real asset and connection without changing the model', () => {
    expect(result.audit.assetCount).toBe(currentNetworkModel.assets.length);
    expect(result.audit.connectionCount).toBe(currentNetworkModel.connections.length);
    expect(result.audit.unassignedAssetIds).toEqual([]);
    expect(result.nodes.flatMap(node => node.assetIds).sort()).toEqual(currentNetworkModel.assets.map(asset => asset.id).sort());
    expect([...result.connectionDisposition.keys()].sort()).toEqual(currentNetworkModel.connections.map(connection => connection.id).sort());
  });

  it('builds non-overlapping top-down summary containers', () => {
    expect(result.audit.nodeOverlapPairs).toEqual([]);
    expect(result.audit.treeGraphConflicts).toEqual([]);
    expect(result.nodes.every(node => node.width > 0 && node.height > 0 && node.depth >= 0)).toBe(true);
  });

  it('keeps loop and alternate links explicit instead of merging them into the tree', () => {
    const crossLink = currentNetworkModel.connections.find(connection => connection.id === 'sw431:cross-link:cable-SW431-P-02');
    expect(crossLink).toBeDefined();
    expect(result.connectionDisposition.get(crossLink!.id)).toBe('alternate-link');
    expect(result.connections.some(item => item.connectionIds.includes(crossLink!.id) && item.kind === 'alternate-link')).toBe(true);
  });
});
