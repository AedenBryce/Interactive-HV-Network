import type { AssetLabel, Box, Point } from './diagram-geometry';
import type { Asset } from '../session/model';

export function driveInputCaptions(asset: Asset, scale: number) {
  const first = /ac-star$/.test(asset.terminals[0]) ? 'Y' : 'D';
  return [
    { x: -64 * scale, y: -64 * scale, width: 14 * scale, height: 18 * scale, lines: [first] },
    { x: 50 * scale, y: -64 * scale, width: 14 * scale, height: 18 * scale, lines: [first === 'Y' ? 'D' : 'Y'] },
  ];
}

/** Ground-side tags use a compact, fixed-width column away from the phase leg. */
export function earthCaptionLayout(tag: string, scale = 1) {
  const lines: string[]=[];
  for(const word of tag.split(/\s+/)){
    const last=lines.at(-1);
    if(last&&last.length+word.length+1<=14)lines[lines.length-1]=`${last} ${word}`;
    else lines.push(word);
  }
  const width=Math.max(...lines.map(line=>line.length*5.5),20)*scale;
  return {x:50*scale-width/2,y:84*scale,width,height:(13+11*(lines.length-1))*scale,lines};
}

/** Short solid annotation leaders identify the caption owner without touching its phase leg. */
export function captionLeader(card: Box, label: AssetLabel): Point[] | undefined {
  const cx=label.x+label.width/2,cy=label.y+label.height/2;
  if(label.x>=card.x+card.width+16&&cy>=card.y&&cy<=card.y+card.height)return [[card.x+card.width+8,cy],[label.x-8,cy]];
  if(label.x+label.width<=card.x-16&&cy>=card.y&&cy<=card.y+card.height)return [[card.x-8,cy],[label.x+label.width+8,cy]];
  if(label.y>=card.y+card.height+16&&cx>=card.x&&cx<=card.x+card.width)return [[cx,card.y+card.height+8],[cx,label.y-8]];
  if(label.y+label.height<=card.y-16&&cx>=card.x&&cx<=card.x+card.width)return [[cx,card.y-8],[cx,label.y+label.height+8]];
}
