import { it } from 'vitest';
import { writeFileSync } from 'node:fs';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';

it('prints current SW505 geometry', () => {
  const result = continuousNetwork(currentNetworkModel);
  writeFileSync('tmp/sw505-current-geometry.json', JSON.stringify({
    frames: result.panels.filter(frame => ['stockpile/stockpile-hv','stockpile/wet-hv','train-loading/hv','crushing-2/sw435-hv','crushing-1/hv'].includes(frame.id)).map(({id,title,x,y,width,height}) => ({id,title,x,y,width,height})),
    feed: result.routes.get('sw454:sw505:cable-SW505-P-01'),
    endpoints: ['sw454','sw505'].map(id => [id,result.view.layout.assets[`${id}:bus`]]),
    bounds: result.view.bounds,
  }, null, 2));
}, 60000);
