import type { Asset } from '../session/model';
import type { EditableGeometry } from './layout-edit';
import { compactEquipmentLabel, isFuse } from './equipment-appearance';
type Geometry = Omit<EditableGeometry, 'assets'> & { assets: readonly Asset[] };

/** Separate named final LV boards from their upstream HV room, using existing graph relationships only. */
export function withFinalBoardFrames<T extends Geometry>(geometry: T): T {
 const byId = new Map(geometry.assets.map(asset => [asset.id, asset]));
 const groups = new Map<string, { tag: string; ids: Set<string> }>();
 for (const bus of geometry.assets) {
  if (bus.kind !== 'bus' || !/\b\d+(?:\.\d+)?\s*V(?:AC|DC)?\b/i.test(bus.label)) continue;
  const tag = compactEquipmentLabel(bus, bus.label).match(/\b(?:MCC|MC|SW)\d+[A-Z]?\b/i)?.[0];
  if (!tag) continue;
  const tagIndex = bus.id.toLowerCase().lastIndexOf(tag.toLowerCase());
  const family = tagIndex >= 0 ? bus.id.slice(0,tagIndex+tag.length) : bus.id.replace(/:(?:[dy]:)?bus$/i, '');
  const key = `${family}:${tag}`;
  const group = groups.get(key) ?? { tag, ids: new Set<string>() }; group.ids.add(bus.id); groups.set(key, group);
  let frontier = [bus.id];
  for (let depth = 0; depth < 3; depth++) {
   const next: string[] = [];
   for (const id of frontier) for (const link of geometry.connections) {
    const a = geometry.owners.get(link.from), b = geometry.owners.get(link.to);
    const peer = a === id ? b : b === id ? a : undefined;
    const asset = peer ? byId.get(peer) : undefined;
    if (!asset || group.ids.has(asset.id) || geometry.hiddenIds?.has(asset.id)) continue;
    if (!['breaker', 'disconnector', 'earth-switch'].includes(asset.kind) && !isFuse(asset)) continue;
    group.ids.add(asset.id); next.push(asset.id);
   }
   frontier = next;
  }
 }
 const redundantHandoffs = new Set(['rm712:tf712:removed-lv-cable-end']);
 for(const group of groups.values())if(group.ids.has('sw451:mc451:bus'))group.ids.add('sw451:mc451b:section');
 const finalIds = new Set([...groups.values()].flatMap(group => [...group.ids]));
 const panels: (NonNullable<Geometry['panels']>[number] & {label?:string;title?:string;overviewTitle?:string})[] = (geometry.panels ?? []).map(panel => ({...panel, assetIds: panel.assetIds.filter(id => !finalIds.has(id) && !redundantHandoffs.has(id)), memberAssetIds: (panel.memberAssetIds ?? panel.assetIds).filter(id => !finalIds.has(id) && !redundantHandoffs.has(id))})).filter(panel => panel.memberAssetIds.length);
 for (const [key, group] of groups) {
  const ids = [...group.ids], first = geometry.view.layout.assets[ids[0]];
  panels.push({...geometry.panels?.[0], id: `final-board/${key}`, label: group.tag, title: group.tag, overviewTitle: group.tag, assetIds: ids, memberAssetIds: ids, x:first[0],y:first[1],width:100,height:100});
 }
 const hiddenIds = new Set(geometry.hiddenIds); hiddenIds.add('sw454:interface:sw455'); hiddenIds.add('rm410:interface:rm419');
 for(const id of redundantHandoffs)hiddenIds.add(id);
 const labels = new Map(geometry.labels); labels.delete('sw454:interface:sw455'); labels.delete('rm410:interface:rm419'); for(const id of redundantHandoffs)labels.delete(id);
 for(const [id,label] of labels)if(!label.lines.some(line=>line.trim()))hiddenIds.add(id);
 return {...geometry, panels, hiddenIds, labels};
}


