import { it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { continuousNetwork } from './continuous-network';
it('inspect h3', () => {
 const d=continuousNetwork(currentNetworkModel);
 console.log('H3', JSON.stringify(Object.fromEntries(Object.entries(d.assets).filter(([id])=>id.startsWith('wh:h3:')||id.startsWith('wh:h1:rm417:sw04')||id==='wh:h1:hopper3-cable').map(([id,p])=>[id,p])),null,2));
 console.log('ROUTES',JSON.stringify(Object.fromEntries([...d.routes].filter(([id])=>id.includes('h3:')||id==='wh:h1:hopper3-cable')),null,2));
});
