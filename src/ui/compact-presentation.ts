import { MIN_ROOM_CLEARANCE } from './room-clearance';
import { compactEquipmentLabel, hasDeviceCard, isMotor, isDrive, isSpareContinuation } from './equipment-appearance';

import { deviceCard } from './device-card';
import { labelLines } from './diagram-geometry';
import { earthCaptionLayout, driveInputCaptions } from './equipment-captions';
import { selectorEarthTag } from './switch-display-tags';
import { threePositionContacts } from './three-position-contacts';
import { turnBox } from './object-rotation';

import type { Asset } from '../session/model';

import type { EditableGeometry, LayoutEdits } from './layout-edit';

import { orthogonalPoints } from './diagram-geometry';

import type { Point } from './diagram-geometry';

import type { LineRoutes } from './line-routing';

import { ContextLabelCollisionIndex, ContextWireCollisionIndex } from './semantic-zoom';


type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };


export function enlargeLabels<T extends Geometry>(geometry: T, textScale: number, symbolScale: number, names: Record<string, string> = {}): T {

  const labels = new Map(geometry.labels);
  for(const asset of geometry.assets)if(isSpareContinuation(asset))labels.delete(asset.id);

  const occupied = new ContextLabelCollisionIndex(256), wires = new ContextWireCollisionIndex(256);
  const byId=new Map(geometry.assets.map(asset=>[asset.id,asset]));

  for (const asset of geometry.assets) {

    if (geometry.hiddenIds?.has(asset.id)) continue;

    const [x, y] = geometry.view.layout.assets[asset.id], scale = asset.kind === 'bus' ? 1 : symbolScale;
    if(isDrive(asset))for(const b of driveInputCaptions(asset,symbolScale))occupied.add({...b,x:x+b.x-12,y:y+b.y-12,width:b.width+24,height:b.height+24});
    const earth=asset.earthAssembly?byId.get(asset.earthAssembly.earthAssetId):undefined;
    const earthTag=threePositionContacts(asset)?selectorEarthTag(asset):earth?compactEquipmentLabel(earth,earth.label):undefined;
    if(earthTag){const b=turnBox(earthCaptionLayout(earthTag,symbolScale),geometry.view.layout.objectRotations?.[asset.id]??0);occupied.add({x:x+b.x-12,y:y+b.y-12,width:b.width+24,height:b.height+24});}

    if (hasDeviceCard(asset) && geometry.labels.has(asset.id)) {
      const card = deviceCard(asset, [x,y], geometry.labels.get(asset.id)!, symbolScale, geometry.view.layout.objectRotations?.[asset.id]);
      occupied.add({x:x+card.x-12,y:y+card.y-12,width:card.width+24,height:card.height+24});
    }
    else if (asset.kind === 'earth-switch') occupied.add({ x: x - 42 * scale, y: y - 5 * scale, width: 64 * scale, height: 73 * scale });

    else if (asset.kind === 'disconnector' && asset.terminals.length === 3) occupied.add({ x: x - 22 * scale, y: y - 42 * scale, width: 95 * scale, height: 151 * scale });

    else if (asset.kind === 'bus') {

      const span = geometry.view.layout.busSpans?.[asset.id] ?? 60;

      occupied.add(geometry.view.layout.rotations?.[asset.id] === 90 ? { x: x - span / 2, y: y - 12, width: span, height: 24 } : { x: x - 12, y: y - span / 2, width: 24, height: span });

    } else occupied.add({ x: x - 40 * scale, y: y - 40 * scale, width: 80 * scale, height: 80 * scale });

  }

  for (const points of geometry.routes.values()) for (let i = 1; i < points.length; i++) wires.add(points[i - 1], points[i]);

  for (const asset of [...geometry.assets].sort((a, b) => Number(b.kind === 'earth-switch') - Number(a.kind === 'earth-switch'))) {

    const label = labels.get(asset.id); if (!label) continue;

    const [ax, ay] = geometry.view.layout.assets[asset.id];

    const caption = names[asset.id] ?? compactEquipmentLabel(asset, asset.label);
    const lines = ['breaker', 'contactor', 'earth-switch', 'bus'].includes(asset.kind) ? caption.split(/\s+/).reduce<string[]>((rows, word) => {
      const last = rows.at(-1);
      if (last && last.length + word.length + 1 <= 14) rows[rows.length - 1] = `${last} ${word}`; else rows.push(word);
      return rows;
    }, []) : labelLines(caption);

    const width = Math.max(140, ...lines.map(line => line.length * 19 + 24)) * textScale;

    const height = (lines.length * 35 + (asset.positions.length || ['breaker', 'contactor', 'disconnector', 'earth-switch'].includes(asset.kind) ? 40 : 12)) * textScale;

    let x = label.x + (label.width - width) / 2, y = label.y + (label.height - height) / 2;

    const radius = 45 * (asset.kind === 'bus' ? 1 : symbolScale) + 35;

    if (label.x > ax + 20) x = Math.max(x, ax + radius);

    else if (label.x + label.width < ax - 20) x = Math.min(x, ax - radius - width);

    else if (label.y + label.height / 2 < ay) y = Math.min(y, ay - radius - height);

    else y = Math.max(y, ay + (asset.kind === 'earth-switch' ? 80 * symbolScale + 35 : radius));

    const control = ['breaker', 'contactor', 'disconnector', 'earth-switch'].includes(asset.kind);

    const gap = asset.earthAssembly ? 90 * symbolScale + 35 : asset.kind === 'breaker' ? 40 * symbolScale + 25 : asset.kind === 'disconnector' && asset.terminals.length === 3 ? 90 * symbolScale + 35 : radius;

    const right = { x: ax + gap, y: ay - height / 2, width, height };

    const left = { x: ax - gap - width, y: ay - height / 2, width, height };

    const reverse = asset.kind === 'contactor' && /reverse|\brc\b/i.test(asset.label);

    const original = { x, y, width, height };

    const candidates = [

      ...(control ? reverse ? [left, right] : asset.kind === 'breaker' ? [right, { ...right, y: ay + gap }, { ...right, y: ay - height - gap }, left] : [right, left] : [original]), original,

      { x: ax - width / 2, y: ay - gap - height, width, height },

      { x: ax - width / 2, y: ay + (asset.kind === 'earth-switch' ? 80 * symbolScale + 35 : gap), width, height },

      { ...right, y: ay - height - gap }, { ...right, y: ay + gap },

      { ...left, y: ay - height - gap }, { ...left, y: ay + gap },

    ];

    if (asset.kind === 'earth-switch') candidates.splice(0, candidates.length, ...Array.from({length:12},(_,i)=>({ x: ax - width / 2, y: ay + 80 * symbolScale + 35 + i*80, width, height })));

    if (asset.kind === 'breaker') candidates.splice(0, candidates.length, right, ...Array.from({ length: 8 }, (_, i) => ({ ...right, x: right.x + i * 80, y: right.y })), ...[-1,1,-2,2].map(i=>({...right,y:right.y+i*(height+40)})));

    candidates.push(...[1,2,3].flatMap(i=>[{...right,x:right.x+i*gap},{...left,x:left.x-i*gap},{x:ax-width/2,y:ay+gap+i*(height+40),width,height},{x:ax-width/2,y:ay-gap-(i+1)*(height+40),width,height}]));
    if(asset.kind === 'earth-switch') candidates.splice(0,candidates.length,...candidates.filter(box=>box.y>=ay+80*symbolScale+35&&Math.abs(box.x-(ax-width/2))<1));
    const nearby = Array.from({length:24},(_,i)=>(i+1)*40).flatMap(offset=>asset.kind==='earth-switch'?[{x:ax-width/2,y:ay+80*symbolScale+35+offset,width,height}]:[{...right,y:right.y+offset},{...right,y:right.y-offset},{...left,y:left.y+offset},{...left,y:left.y-offset}]);
    const eligible = [...candidates, ...nearby].filter(box => asset.kind !== 'breaker' || box.x > ax);
    if(isMotor(asset)&&asset.id.startsWith('rm420:mc420:motor-'))eligible.splice(0,eligible.length,...Array.from({length:12},(_,i)=>({x:ax-width/2,y:ay+45*symbolScale+35+i*80,width,height})));
    const chosen = eligible.find(box => !occupied.overlaps(box) && !wires.intersects(box)) ?? eligible.find(box=>!occupied.overlaps(box)) ?? (asset.kind === 'breaker' ? right : candidates[0]);

    x = chosen.x; y = chosen.y;

    labels.set(asset.id, { ...label, lines, x, y, width, height });

    if (!geometry.hiddenIds?.has(asset.id)) occupied.add({ x: x - 12, y: y - 12, width: width + 24, height: height + 24 });

  }

  return { ...geometry, labels };

}


/** A reversible position edit: retain ordering and route bends; reduce whitespace. */

export function condensePositions(geometry: Geometry, previous: LayoutEdits, factor = .85): { edits: LayoutEdits; routes: LineRoutes } {

  const roomForAsset = new Map<string, string>();

  const roomDeltas = new Map<string, Point>();

  const edits: LayoutEdits = { assets: { ...previous.assets }, rooms: { ...previous.rooms } };

  for (const room of geometry.panels ?? []) {

    const delta: Point = [room.x * (factor - 1), room.y * (factor - 1)];

    roomDeltas.set(room.id, delta);

    for (const id of room.memberAssetIds ?? room.assetIds) roomForAsset.set(id, room.id);

    const old = edits.rooms[room.id] ?? [0, 0]; edits.rooms[room.id] = [old[0] + delta[0], old[1] + delta[1]];

  }

  for (const asset of geometry.assets) {

    const point = geometry.view.layout.assets[asset.id], old = edits.assets[asset.id] ?? [0, 0];

    const roomDelta = roomDeltas.get(roomForAsset.get(asset.id) ?? '') ?? [0, 0];

    edits.assets[asset.id] = [old[0] + point[0] * (factor - 1) - roomDelta[0], old[1] + point[1] * (factor - 1) - roomDelta[1]];

  }

  return { edits, routes: Object.fromEntries([...geometry.routes].map(([id, points]) => [id, orthogonalPoints(points.map(point => [point[0] * factor, point[1] * factor] as Point))])) };

}


/** Fit room outlines to their visible members after a spacing reduction. */

export function fitCompactFrames<T extends Geometry>(geometry: T, symbolScale: number, paddingScale = 1): T {

  const assets = new Map(geometry.assets.map(asset => [asset.id, asset]));

  const panels = geometry.panels?.map(panel => {

    const xs: number[] = [], ys: number[] = [];

    for (const id of panel.memberAssetIds ?? panel.assetIds) {

      if (geometry.hiddenIds?.has(id)) continue;

      const asset = assets.get(id); if (!asset || asset.kind === 'transformer' || isMotor(asset) || /hpgr:jb001/.test(asset.id)) continue;

      const [x, y] = geometry.view.layout.assets[id], label = geometry.labels.get(id);
      if(geometry.view.layout.objectRotations?.[id]&&hasDeviceCard(asset)&&label){const r=deviceCard(asset,[x,y],label,symbolScale,geometry.view.layout.objectRotations[id]);xs.push(x+r.x,x+r.x+r.width);ys.push(y+r.y,y+r.y+r.height);}

      const radius = asset.kind === 'bus' ? 40 : 45 * symbolScale + 25;

      xs.push(x - radius, x + radius); ys.push(y - radius, y + radius);
      const earth=asset.earthAssembly?assets.get(asset.earthAssembly.earthAssetId):undefined;
      const earthTag=threePositionContacts(asset)?selectorEarthTag(asset):earth?compactEquipmentLabel(earth,earth.label):undefined;
      if (earthTag) {const caption=earthCaptionLayout(earthTag,symbolScale);ys.push(y+caption.y+caption.height+20);xs.push(x+caption.x,x+caption.x+caption.width);}
      if(asset.kind==='bus'){xs.push(x-(MIN_ROOM_CLEARANCE-100)*paddingScale,x+(MIN_ROOM_CLEARANCE-100)*paddingScale);ys.push(y-(MIN_ROOM_CLEARANCE-200)*paddingScale,y+(MIN_ROOM_CLEARANCE-100)*paddingScale);}

      if (asset.kind === 'bus') {

        const span = geometry.view.layout.busSpans?.[id] ?? 60;

        if (geometry.view.layout.rotations?.[id] === 90) xs.push(x - span / 2 - (MIN_ROOM_CLEARANCE-100)*paddingScale, x + span / 2 + (MIN_ROOM_CLEARANCE-100)*paddingScale);

        else ys.push(y - span / 2 - (MIN_ROOM_CLEARANCE-200)*paddingScale, y + span / 2 + (MIN_ROOM_CLEARANCE-100)*paddingScale);

      }

      if (label) { xs.push(label.x, label.x + label.width); ys.push(label.y, label.y + label.height); }

    }

    if (!xs.length) return panel;

    const left = Math.min(...xs) - 100*paddingScale;
    const fieldTransformer = panel.id === 'crushing-2/hpgr-hv' ? geometry.view.layout.assets['hpgr:tf001'] : undefined;
    const top = Math.max(Math.min(...ys) - 200*paddingScale, fieldTransformer ? fieldTransformer[1] + 360 : -Infinity);

    return { ...panel, x: left, y: top, width: Math.max(...xs) - left + 100*paddingScale, height: Math.max(...ys) - top + 100*paddingScale };

  });

  return { ...geometry, ...(panels ? { panels } : {}) };

}



