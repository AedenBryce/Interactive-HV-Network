import { describe, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';

describe('temporary frame layout diagnostic', () => {
  it('prints SW505 frame and exact incoming route', () => {
    const owners = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
    const link = currentNetworkModel.connections.find(item => item.id === 'sw454:sw505:cable-SW505-P-01');
    const frame = currentNetworkModel.presentation?.views;
    console.log(JSON.stringify({ link, terminalOwners: Object.fromEntries(['sw505:in:cb:a','sw454:sw505:cb:b'].map(id => [id, owners.get(id)])), views: frame?.map(view => ({id:view.id,assetIds:view.assetIds.length})) }, null, 2));
  });
});
