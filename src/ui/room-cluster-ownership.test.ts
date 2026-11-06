import { describe, expect, it } from 'vitest';
import type { Asset } from '../session/model';
import { currentNetworkModel } from '../models/site/current-network';
import { roomClusterOwnership } from './room-cluster-ownership';

function modelWithUnframedAssets(...ids: string[]) {
  const assets: Asset[] = ids.map(id => ({
    id,
    label: id,
    kind: 'interface',
    terminals: [`${id}:port`],
    conductivePairs: [],
    positions: [],
  }));
  return { ...currentNetworkModel, assets: [...currentNetworkModel.assets, ...assets] };
}

describe('room cluster ownership', () => {
  it('assigns tree-path assets to the uniquely nearest room', () => {
    const model = modelWithUnframedAssets('layout:test:near', 'layout:test:far');
    const ownership = roomClusterOwnership(model, [
      { id: 'layout:test:edge-1', parentAssetId: 'sw411:bus-a', childAssetId: 'layout:test:near' },
      { id: 'layout:test:edge-2', parentAssetId: 'layout:test:near', childAssetId: 'layout:test:far' },
      { id: 'layout:test:edge-3', parentAssetId: 'layout:test:far', childAssetId: 'sw435:bus' },
    ]);

    expect(ownership.ownerByAssetId.get('layout:test:near')).toBe('sw411/overview');
    expect(ownership.ownerByAssetId.get('layout:test:far')).toBe('crushing-2/sw435-hv');
    expect(ownership.ambiguousAssetIds.has('layout:test:near')).toBe(false);
    expect(ownership.ambiguousAssetIds.has('layout:test:far')).toBe(false);
  });

  it('leaves an equal-distance shared tree asset unassigned', () => {
    const model = modelWithUnframedAssets('layout:test:shared');
    const ownership = roomClusterOwnership(model, [
      { id: 'layout:test:from-sw411', parentAssetId: 'sw411:bus-a', childAssetId: 'layout:test:shared' },
      { id: 'layout:test:to-sw435', parentAssetId: 'layout:test:shared', childAssetId: 'sw435:bus' },
    ]);

    expect(ownership.ownerByAssetId.has('layout:test:shared')).toBe(false);
    expect(ownership.ambiguousAssetIds.has('layout:test:shared')).toBe(true);
    expect(ownership.unassignedAssetIds.has('layout:test:shared')).toBe(true);
  });
});
