import type { Asset, NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { AssetLabel } from './diagram-geometry';
import { hasDeviceCard, isMotorJunction } from './equipment-appearance';

// Existing drawing-view memberships define diagram groups, not field locations.
const roomViews = [
  ['SW411', 'sw411/overview'], ['SW431', 'crushing-1/hv'], ['SW435', 'crushing-2/sw435-hv'],
  ['HPGR SW002', 'crushing-2/hpgr-hv'], ['SW421', 'screening/hv'], ['SW426', 'desands/hv'],
  ['RM714 · Laboratory', 'desands/laboratory'], ['SW454', 'stockpile/stockpile-hv'], ['SW505', 'stockpile/wet-hv'],
  ['SW451', 'train-loading/hv'], ['RM406', 'cv006/rm406-hv'], ['RM410', 'cv006/rm410-hv'],
  ['RM417 · Hopper1', 'western/h1-rmu'], ['MC417 · Hopper1', 'western/h1-hv'],
  ['RM418 · Hopper7', 'western/h7-rmu'], ['MC418 · Hopper7', 'western/h7-hv'],
  ['RM419 · Hopper9', 'western/h9-rmu'], ['MC419 · Hopper9', 'western/h9-hv'],
  ['RM721', 'services/rm721'], ['RM712 / SW712', 'services/mine-services'], ['RM713 / SW713', 'services/workshop'],
  ['RM412', 'services/dump-pocket-hv'], ['RM413', 'services/conveyor-hv'], ['RM413A', 'services/rm413a-hv'],
  ['RM420 · Hopper10', 'hopper-10/rmu'], ['MC420 · Hopper10', 'hopper-10/mv'], ['SW441', 'mine-camp/mine-sw441'],
  ['MC416 · Hopper3', 'western-supplemental/h3/mv', 'western-supplemental/h3/motor-1', 'western-supplemental/h3/motor-2'],
  ['MC416 · Hopper8', 'western-supplemental/h8/mv', 'western-supplemental/h8/motor-1', 'western-supplemental/h8/motor-2'],
];

export function switchroomFrames(model: NetworkModel, layout: DiagramLayout, labels: Map<string, AssetLabel>) {
  const assigned = new Set<string>();
  function frame(id: string, label: string, assets: Asset[]) {
    assets.forEach(asset => assigned.add(asset.id));
    const x = Math.min(...assets.map(asset => layout.assets[asset.id][0] - 60)) - 80;
    const y = Math.min(...assets.map(asset => layout.assets[asset.id][1] - 60)) - 100;
    const right = Math.max(...assets.map(asset => labels.get(asset.id)!.x + labels.get(asset.id)!.width + 12)) + 80;
    const bottom = Math.max(...assets.map(asset => Math.max(layout.assets[asset.id][1] + 70, labels.get(asset.id)!.y + labels.get(asset.id)!.height + 12))) + 80;
    const tags = [...new Set(label.match(/(?:MCC|MC|SW|RM)\d+[A-Z]?(?: [ΔDY])?/g) ?? [])];
    const hopper = label.match(/Hopper\s*(\d+)/)?.[1];
    const title = tags.length ? tags.join(' / ') + (hopper ? ` · H${hopper}` : '') : label;
    return { id, label, title, x, y, width: right - x, height: bottom - y };
  }
  const frames = roomViews.flatMap(([label, ...views]) => {
    const membership = new Set(views.flatMap(id => model.presentation?.views.find(view => view.id === id)?.assetIds ?? []));
    const assets = model.assets.filter(asset => membership.has(asset.id) && !assigned.has(asset.id) && !isMotorJunction(asset) && (hasDeviceCard(asset) || asset.kind === 'bus'));
    return assets.length ? [frame(views[0], label, assets)] : [];
  });
  // LV endpoints have no outgoing circuit detail. Group each remaining board's
  // bus and directly connected incomer/fuse without crossing a transformer.
  const owners = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset] as const)));
  for (const bus of model.assets.filter(asset => asset.kind === 'bus')) {
    if (assigned.has(bus.id)) continue;
    const members = new Set([bus]); const queue = [bus];
    for (const asset of queue) for (const link of model.connections) {
      const peer = asset.terminals.includes(link.from) ? owners.get(link.to) : asset.terminals.includes(link.to) ? owners.get(link.from) : undefined;
      if (!peer || assigned.has(peer.id) || members.has(peer) || !(hasDeviceCard(peer) || peer.kind === 'bus')) continue;
      members.add(peer);
      if (peer.kind === 'bus' || !peer.positions.length && peer.kind === 'interface') queue.push(peer);
    }
    frames.push(frame(`board:${bus.id}`, bus.label.split('\n')[0], [...members]));
  }
  return frames;
}
