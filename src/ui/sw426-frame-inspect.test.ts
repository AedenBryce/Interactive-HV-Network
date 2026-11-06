import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';

it('prints measured SW426 placement candidates', () => {
  const result = continuousNetwork(currentNetworkModel);
  const connection = currentNetworkModel.connections.find(item => item.id === 'whole:join:sw426')!;
  const owners = new Map(currentNetworkModel.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const frame = result.panels.find(panel => panel.title === 'SW426');
  writeFileSync('tmp/sw426-frame-inspect.json', JSON.stringify({
    connection: {
      route: result.routes.get(connection.id),
      from: [connection.from, owners.get(connection.from), result.view.layout.terminals[connection.from]],
      to: [connection.to, owners.get(connection.to), result.view.layout.terminals[connection.to]],
    },
    frames: result.panels.map(panel => ({ id: panel.id, title: panel.title, x: panel.x, y: panel.y, width: panel.width, height: panel.height }))
      .sort((a, b) => a.y - b.y || a.x - b.x),
    targetFrame: frame && {
      id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height,
      assetIds: frame.assetIds,
      memberAssetIds: frame.memberAssetIds,
      memberPositions: (frame.memberAssetIds ?? frame.assetIds).map(id => [id, result.view.layout.assets[id]]),
    },
  }, null, 2));
});
