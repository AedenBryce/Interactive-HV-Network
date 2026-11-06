import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';

it('reports selected room placement diagnostic', () => {
  const geometry = continuousNetwork(currentNetworkModel);
  console.log(JSON.stringify({
    rooms: geometry.panels.map(({ id, x, y, width, height }) => ({ id, x, y, width, height })),
    overlaps: geometry.panels.filter(room => room.id === 'stockpile/wet-hv').flatMap(a => geometry.panels.filter(b => b.id !== a.id
      && a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y)
      .map(b => ({ a: a.id, b: b.id, aBounds: [a.x, a.y, a.width, a.height], bBounds: [b.x, b.y, b.width, b.height] }))),
    feedRoute: geometry.routes.get('sw454:sw505:cable-SW505-P-01'),
  }, null, 2));
}, 120_000);
