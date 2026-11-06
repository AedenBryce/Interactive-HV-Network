import { describe, expect, it } from 'vitest';
import type { SwitchroomFrame } from './switchroom-frames';
import { orderWholeNetworkRoomClustersTopDown, type WholeNetworkTreeEdge } from './whole-network-room-layout';

function frame(id: string): SwitchroomFrame {
  return {
    id,
    label: id,
    title: id,
    overviewTitle: id,
    x: 0,
    y: 0,
    width: 500,
    height: 300,
    assetIds: [`${id}:device`],
    memberAssetIds: [`${id}:device`],
  };
}

describe('orderWholeNetworkRoomClustersTopDown', () => {
  it('keeps a child with unconfirmed room topology below its selected tree parent', () => {
    const parent = frame('sw411/overview');
    const child = frame('western/h1-hv');
    const edges: WholeNetworkTreeEdge[] = [{
      id: 'selected-presentation-edge',
      parentAssetId: 'sw411:feeder',
      childAssetId: 'hopper1:asset',
    }];
    const roomByAsset = new Map([
      ['sw411:feeder', parent.id],
      ['hopper1:asset', child.id],
    ]);

    const ordered = orderWholeNetworkRoomClustersTopDown([child, parent], edges, roomByAsset);

    expect(ordered.map(item => item.id)).toEqual([parent.id, child.id]);
    // The helper returns the original frame records and does not turn an
    // unconfirmed room relationship into confirmed model evidence.
    expect(ordered[0]).toBe(parent);
    expect(ordered[1]).toBe(child);
  });

  it('orders unrelated peer roots deterministically regardless of input order', () => {
    const sw411 = frame('sw411/overview');
    const rm420 = frame('hopper-10/rmu');
    const sw441 = frame('mine-camp/mine-sw441');

    const first = orderWholeNetworkRoomClustersTopDown([sw441, rm420, sw411], [], new Map()).map(item => item.id);
    const second = orderWholeNetworkRoomClustersTopDown([sw411, sw441, rm420], [], new Map()).map(item => item.id);

    expect(first).toEqual(second);
    expect(first).toEqual([...first].sort((a, b) => a.localeCompare(b)));
  });
});
