import { turnBox } from './object-rotation';
import type { Asset } from '../session/model';
import type { AssetLabel, Box, Point } from './diagram-geometry';
import { threePositionContacts } from './three-position-contacts';

export function deviceCard(asset: Asset, [x, y]: Point, label: AssetLabel, symbolScale?: number, angle=0): Box {
  if(angle&&symbolScale!==undefined)return turnBox(deviceCard(asset,[x,y],label,symbolScale),angle);
  if (symbolScale !== undefined) {
    const k = symbolScale, pad = 12;
    if (asset.kind === 'earth-switch') return { x: -42*k-pad, y: -8*k-pad, width: 66*k+2*pad, height: 80*k+2*pad };
    if (threePositionContacts(asset) || asset.earthAssembly) return { x:-24*k-pad,y:-44*k-pad,width:102*k+2*pad,height:122*k+2*pad };
    return {x:-16*k-pad,y:-32*k-pad,width:32*k+2*pad,height:64*k+2*pad};
  }
  const left = Math.min(-72, label.x - x - 12);
  const top = Math.min(-60, label.y - y - 12);
  const right = Math.max(48, label.x - x + label.width + 12);
  const bottom = Math.max(threePositionContacts(asset) ? 150 : 60, label.y - y + label.height + 12);
  return { x: left, y: top, width: right - left, height: bottom - top };
}


