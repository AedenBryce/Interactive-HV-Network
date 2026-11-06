import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';

it('prints focused route patch metrics', () => {
  const geometry = continuousNetwork(currentNetworkModel);
  console.log(JSON.stringify({
    assets: geometry.assets.length,
    connections: geometry.connections.length,
    routes: geometry.routes.size,
    selected: Object.fromEntries([
      'wh:h1:hopper3-cable', 'wh:h3:tf416:input', 'wh:h3:tf416a:input',
      'ep:h3:mc416a:incoming', 'wh:h3:mc416a:interface:supply',
      'wh:h7:tf418:input', 'wh:h7:tf418a:input', 'line33:214-to-227',
      'owner-scope:line33:takeoff:norfolk', 'sw451:spare-6:bus-link',
      'sw451:spare-6:continuation', 'sw451:spare-7:bus-link',
      'sw451:spare-7:continuation',
    ].map(id => [id, geometry.routes.get(id)])),
  }));
});
