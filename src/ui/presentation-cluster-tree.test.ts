import { describe, expect, it } from 'vitest';
import { layoutPresentationClusterTree, type PresentationClusterTreeInput } from './presentation-cluster-tree';

function input(overrides: Partial<PresentationClusterTreeInput> = {}): PresentationClusterTreeInput {
  const assetIds = ['source', 'pole', 'room-cb', 'load'];
  return {
    roots: ['source'],
    edges: [
      { parentId: 'source', childId: 'pole' },
      { parentId: 'pole', childId: 'room-cb' },
      { parentId: 'room-cb', childId: 'load' },
    ],
    assetIds,
    roomOwnerByAssetId: new Map([['room-cb', 'switchroom'], ['load', 'switchroom']]),
    positions: new Map(assetIds.map((id, index) => [id, [index * 300, index * 200] as const])),
    boundsByAssetId: new Map(assetIds.map(id => [id, { x: -60, y: -40, width: 120, height: 80 }])),
    ...overrides,
  };
}

describe('presentation cluster tree', () => {
  it('contracts a corridor run into a room cluster and preserves cross-cluster connectivity', () => {
    const result = layoutPresentationClusterTree(input());
    expect(result.valid).toBe(true);
    expect(result.clusters).toHaveLength(2);
    expect(result.clusters.find(cluster => cluster.kind === 'corridor')?.assetIds).toEqual(['pole', 'source']);
    expect(result.clusters.find(cluster => cluster.kind === 'room')?.assetIds).toEqual(['load', 'room-cb']);
    expect(result.crossClusterEdges).toHaveLength(1);
    expect(result.crossClusterEdges[0]).toMatchObject({ edge: { parentId: 'pole', childId: 'room-cb' } });
    expect([...result.translations.keys()].sort()).toEqual(['load', 'pole', 'room-cb', 'source']);
    expect(result.roots).toHaveLength(1);
    const corridor = result.clusters.find(cluster => cluster.kind === 'corridor')!;
    const room = result.clusters.find(cluster => cluster.kind === 'room')!;
    expect(room.bounds.y + result.translations.get('room-cb')![1]).toBeGreaterThan(corridor.bounds.y + result.translations.get('source')![1]);
  });

  it('wraps sibling room clusters below one another when the width limit is reached', () => {
    const assetIds = ['root', 'a', 'b', 'c', 'd'];
    const result = layoutPresentationClusterTree(input({
      roots: ['root'],
      edges: ['a', 'b', 'c', 'd'].map(childId => ({ parentId: 'root', childId })),
      assetIds,
      roomOwnerByAssetId: new Map([['root', 'root-room'], ...['a', 'b', 'c', 'd'].map(id => [id, `room-${id}`] as const)]),
      positions: new Map(assetIds.map((id, index) => [id, [index * 250, index * 100] as const])),
      boundsByAssetId: new Map(assetIds.map(id => [id, { x: -100, y: -40, width: 200, height: 80 }])),
      maxWidth: 700,
      horizontalGap: 80,
      verticalGap: 500,
    }));

    expect(result.valid).toBe(true);
    expect(result.clusters).toHaveLength(5);
    const rootY = result.clusters.find(cluster => cluster.roomId === 'root-room')!.bounds.y + result.translations.get('root')![1];
    const childYs = ['a', 'b', 'c', 'd'].map(id => result.clusters.find(cluster => cluster.roomId === `room-${id}`)!.bounds.y + result.translations.get(id)![1]);
    expect(childYs.every(y => y > rootY)).toBe(true);
    expect(new Set(childYs).size).toBeGreaterThan(1);
    expect(result.maxBounds.width).toBeLessThanOrEqual(700);
  });

  it('places disconnected source roots as separate forest trees and includes all assets once', () => {
    const assetIds = ['s1', 'l1', 's2', 'l2'];
    const result = layoutPresentationClusterTree(input({
      roots: ['s1', 's2'],
      edges: [{ parentId: 's1', childId: 'l1' }, { parentId: 's2', childId: 'l2' }],
      assetIds,
      roomOwnerByAssetId: new Map([['l1', 'r1'], ['l2', 'r2']]),
      positions: new Map(assetIds.map((id, index) => [id, [index * 300, index * 120] as const])),
      boundsByAssetId: new Map(assetIds.map(id => [id, { x: -50, y: -30, width: 100, height: 60 }])),
    }));

    expect(result.valid).toBe(true);
    expect(result.roots).toHaveLength(2);
    expect([...result.translations.keys()].sort()).toEqual([...assetIds].sort());
    expect(result.clusters.flatMap(cluster => cluster.assetIds).sort()).toEqual([...assetIds].sort());
    expect(result.clusters.reduce((count, cluster) => count + cluster.assetIds.length, 0)).toBe(assetIds.length);
  });

  it('reports a cycle created by contracting non-contiguous room ownership', () => {
    const result = layoutPresentationClusterTree(input({
      roots: ['source'],
      edges: [
        { parentId: 'source', childId: 'pole' },
        { parentId: 'pole', childId: 'room-cb' },
      ],
      assetIds: ['source', 'pole', 'room-cb'],
      roomOwnerByAssetId: new Map([['source', 'same-room'], ['room-cb', 'same-room']]),
      positions: new Map([['source', [0, 0]], ['pole', [0, 100]], ['room-cb', [0, 200]]]),
      boundsByAssetId: new Map(['source', 'pole', 'room-cb'].map(id => [id, { x: -50, y: -30, width: 100, height: 60 }])),
    }));

    expect(result.valid).toBe(false);
    expect(result.issues.some(issue => issue.code === 'contracted-cycle' || issue.code === 'multiple-cluster-parents')).toBe(true);
    expect([...result.translations.values()].every(([dx, dy]) => dx === 0 && dy === 0)).toBe(true);
  });
});
