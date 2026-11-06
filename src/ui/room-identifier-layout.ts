import {deviceCard} from './device-card';
import {hasDeviceCard} from './equipment-appearance';
import { MIN_ROOM_CLEARANCE, roomGap } from './room-clearance';
import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import { equipmentPorts, orthogonalPoints } from './diagram-geometry';
import { threePositionContacts } from './three-position-contacts';
import { ContextLabelCollisionIndex, ContextWireCollisionIndex } from './semantic-zoom';
import type { ContextLabelBox } from './semantic-zoom';

type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };
export function roomIdentifierObstacles(geometry: Geometry, symbolScale: number, detail = true) {
  const boxes = new ContextLabelCollisionIndex(256), wires = new ContextWireCollisionIndex(256);
  for (const points of geometry.routes.values()) for (let i = 1; i < points.length; i++) wires.add(points[i - 1], points[i]);
  for (const asset of geometry.assets) {
    if (geometry.hiddenIds?.has(asset.id)) continue;
    const [x, y] = geometry.view.layout.assets[asset.id], scale = asset.kind === 'bus' ? 1 : symbolScale;
    const label = geometry.labels.get(asset.id); if (detail && label) boxes.add(label);
    if (asset.kind === 'bus') {
      const span = geometry.view.layout.busSpans?.[asset.id] ?? 60;
      wires.add(geometry.view.layout.rotations?.[asset.id] === 90 ? [x - span / 2, y] : [x, y - span / 2], geometry.view.layout.rotations?.[asset.id] === 90 ? [x + span / 2, y] : [x, y + span / 2]);
      continue;
    }
    if (!detail) { boxes.add({ x: x - 60, y: y - 60, width: 120, height: 120 }); continue; }
    if(hasDeviceCard(asset)&&label){const r=deviceCard(asset,[x,y],label,symbolScale,geometry.view.layout.objectRotations?.[asset.id]);boxes.add({x:x+r.x,y:y+r.y,width:r.width,height:r.height});}
    else boxes.add(asset.kind === 'earth-switch' ? { x: x - 42 * scale, y: y - 5 * scale, width: 64 * scale, height: 73 * scale }
      : { x: x - 40 * scale, y: y - 40 * scale, width: 80 * scale, height: 80 * scale });
    const ground = threePositionContacts(asset)?.ground ?? (asset.kind === 'earth-switch' ? asset.terminals[1] : undefined);
    const { ports } = equipmentPorts(asset, geometry.view.layout);
    for (let i = 0; i < ports.length; i++) {
      if (asset.terminals[i] === ground) continue;
      const terminal = geometry.view.layout.terminals[asset.terminals[i]];
      const points = orthogonalPoints([terminal, [x + ports[i][0] * scale, y + ports[i][1] * scale]]);
      for (let j = 1; j < points.length; j++) wires.add(points[j - 1], points[j]);
    }
  }
  return { boxes, wires };
}

export function placeRoomIdentifier(panel: ContextLabelBox, caption: string, scale: number, obstacles: ReturnType<typeof roomIdentifierObstacles>) {
  if (!Number.isFinite(scale) || scale <= 0) return undefined;
  const pad = 4 / scale;
  const pixelSizes = [...new Set([scale < .06 ? 12 : 16, 12, 10, 8, 6, 4, 2, 1])];
  for (const pixels of pixelSizes) {
    const font=Math.min(pixels/scale,(panel.width-2*pad)/(caption.length*.7+.3));
    const width=(caption.length*.7+.3)*font,height=font*1.3;
    const x=panel.x+panel.width-pad-width,y=panel.y+pad;
    if(font<=0||height+2*pad>panel.height)continue;
    const halo=1.5/scale,box={x:x-halo,y:y-halo,width:width+halo*2,height:height+halo*2};
    if(!obstacles.wires.intersects(box)&&!obstacles.boxes.overlaps(box))return{x,y,width,height,font,vertical:false,caption};
  }  return undefined;
}

export function placeRoomIdentifiers(rooms: readonly (ContextLabelBox & { id: string; caption: string })[], scale: number, obstacles: ReturnType<typeof roomIdentifierObstacles>) {
  const frames = new Map(rooms.map(room => [room.id, { x: room.x, y: room.y, width: room.width, height: room.height }]));
  const result = new Map<string, { bounds: ContextLabelBox; placement: ReturnType<typeof placeRoomIdentifier> }>();
  const overlaps = (a: ContextLabelBox, b: ContextLabelBox) => a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
  for (const room of rooms) {
    let bounds = frames.get(room.id)!, placement = placeRoomIdentifier(bounds, room.caption, scale, obstacles);
    if (!placement && scale > 0) {
      search: for (const pixels of [12, 18, 24, 32]) {
        const extra = pixels / scale;
        const options = [
          { bounds: { ...bounds, width: bounds.width + extra }, strip: { x: bounds.x + bounds.width, y: bounds.y, width: extra, height: bounds.height } },
          { bounds: { ...bounds, x: bounds.x - extra, width: bounds.width + extra }, strip: { x: bounds.x - extra, y: bounds.y, width: extra, height: bounds.height } },
          { bounds: { ...bounds, y: bounds.y - extra, height: bounds.height + extra }, strip: { x: bounds.x, y: bounds.y - extra, width: bounds.width, height: extra } },
          { bounds: { ...bounds, height: bounds.height + extra }, strip: { x: bounds.x, y: bounds.y + bounds.height, width: bounds.width, height: extra } },
        ];
        for (const option of options) {
          if ([...frames].some(([id, frame]) => id !== room.id && (overlaps(option.bounds, frame) || roomGap(option.bounds,frame)<MIN_ROOM_CLEARANCE)) || obstacles.boxes.overlaps(option.strip)) continue;
          const candidate = placeRoomIdentifier(option.bounds, room.caption, scale, obstacles);
          if (candidate) { bounds = option.bounds; placement = candidate; break search; }
        }
      }
    }
    frames.set(room.id, bounds); result.set(room.id, { bounds, placement });
  }
  return result;
}





