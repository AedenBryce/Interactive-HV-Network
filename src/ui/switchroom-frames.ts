import type { NetworkModel } from '../session/model';
import type { DiagramLayout } from '../session/presentation';
import type { AssetLabel } from './diagram-geometry';
import { hasDeviceCard, isMotorJunction } from './equipment-appearance';
import { deviceCard } from './device-card';
import { placeRoomFramesWithoutOverlap } from './room-overlap-placement';
import { orderRoomFramesTopologically } from './room-frame-order';
export type SwitchroomFrame = { id: string; label: string; title: string; overviewTitle: string; x: number; y: number; width: number; height: number; assetIds: string[]; memberAssetIds: string[] };
export type SwitchroomMembership = { id: string; label: string; assetIds: string[]; memberAssetIds: string[] };


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

export function switchroomMemberships(model: NetworkModel): SwitchroomMembership[] {
  const assigned = new Set<string>();
  const byId = new Map(model.assets.map(asset => [asset.id, asset]));
  const terminalOwner = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomCore = (membership: Set<string>, label: string) => {
    // A source drawing view often contains the switchroom bus and every
    // downstream transformer/LV bus on the same sheet. Only seed the frame
    // from the bus whose printed identity matches this room. Tree ownership is
    // kept separately in memberAssetIds for spacing and camera focus.
    const roomTags = [...new Set((label.match(/(?:MCC|MC|SW|RM)\s*\d+[A-Z]?/gi) ?? []).map(tag => tag.replace(/\s+/g, '').toUpperCase()))];
    const hasRoomTag = (asset: NetworkModel['assets'][number]) => {
      const text = `${asset.label} ${(asset.aliases ?? []).join(' ')}`.toUpperCase();
      return roomTags.some(tag => new RegExp(`(^|[^A-Z0-9])${tag}(?=$|[^A-Z0-9])`).test(text));
    };
    const core = new Set<string>();
    const allRoomBuses = model.assets.filter(asset => membership.has(asset.id) && asset.kind === 'bus');
    const matchingRoomBuses = allRoomBuses.filter(hasRoomTag);
    const queue = (matchingRoomBuses.length ? matchingRoomBuses : allRoomBuses).map(asset => asset.id);
    for (const id of queue) core.add(id);
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const current = byId.get(queue[cursor])!;
      for (const link of model.connections) {
        const peerId = current.terminals.includes(link.from) ? terminalOwner.get(link.to) : current.terminals.includes(link.to) ? terminalOwner.get(link.from) : undefined;
        if (!peerId || !membership.has(peerId) || core.has(peerId)) continue;
        const peer = byId.get(peerId)!;
        if (hasDeviceCard(peer)) core.add(peerId);
        else if (peer.kind === 'interface' && !isMotorJunction(peer)) { core.add(peerId); queue.push(peerId); }
      }
    }
    // Earth switches are commonly attached to the cable side of a local
    // breaker/disconnector rather than directly to the bus. Include those
    // controls in the room outline without walking through the feeder into its
    // transformer or downstream board.
    for (const id of [...core]) {
      const asset = byId.get(id);
      if (!asset || asset.kind === 'bus' || !hasDeviceCard(asset)) continue;
      for (const link of model.connections) {
        const terminal = asset.terminals.includes(link.from) ? link.from : asset.terminals.includes(link.to) ? link.to : undefined;
        if (!terminal) continue;
        const peerId = terminalOwner.get(link.from === terminal ? link.to : link.from);
        const peer = peerId ? byId.get(peerId) : undefined;
        if (peer && membership.has(peer.id) && peer.kind === 'earth-switch') core.add(peer.id);
      }
    }
    return [...core].map(id => byId.get(id)!).filter(asset => !isMotorJunction(asset) && (asset.kind === 'bus' || hasDeviceCard(asset)));
  };
  const claimedMembers = new Set<string>();
  return roomViews.flatMap(([label, ...views]) => {
    const membership = new Set(views.flatMap(id => model.presentation?.views.find(view => view.id === id)?.assetIds ?? []));
    const assets = roomCore(membership, label).filter(asset => !assigned.has(asset.id));
    if (!assets.length) return [];
    const memberAssetIds = [...membership].filter(id => !claimedMembers.has(id));
    assets.forEach(asset => memberAssetIds.push(asset.id));
    memberAssetIds.forEach(id => claimedMembers.add(id));
    assets.forEach(asset => assigned.add(asset.id));
    return [{ id: views[0], label, assetIds: assets.map(asset => asset.id), memberAssetIds: [...new Set(memberAssetIds)] }];
  });
}

export function switchroomFrames(model: NetworkModel, layout: DiagramLayout, labels: Map<string, AssetLabel>) {
  const frames = switchroomMemberships(model).map(({ id, label, assetIds, memberAssetIds }) => {
    const assets = assetIds.map(assetId => model.assets.find(asset => asset.id === assetId)!);
    const bounds = assets.map(asset => switchroomAssetBounds(asset, layout, labels));
    const x = Math.min(...bounds.map(box => box.x)) - 24;
    const y = Math.min(...bounds.map(box => box.y)) - 26;
    const right = Math.max(...bounds.map(box => box.x + box.width)) + 24;
    const bottom = Math.max(...bounds.map(box => box.y + box.height)) + 28;
    const tags = [...new Set((label.match(/(?:MCC|MC|SW|RM)\d+[A-Z]?(?: [ΔDY])?/g) ?? []).map(tag => tag.replace('Δ', 'D')))];
    const hopper = label.match(/Hopper\s*(\d+)/)?.[1];
    const title = (tags.length ? tags.join(' / ') + (hopper ? ` · H${hopper}` : '') : label).replace(/\bDelta\b/gi, 'D').replace(/\bStar\b/gi, 'Y').replace(/Δ/g, 'D');
    return { id, label, title, overviewTitle: title, x, y, width: right - x, height: bottom - y, assetIds, memberAssetIds };
  });
  return frames;
}
export function separateSwitchroomFrames(
  model: NetworkModel,
  frames: SwitchroomFrame[],
  layout: DiagramLayout,
  labels: Map<string, AssetLabel>,
  outsideFrameAssets = new Set<string>(),
  clusterOwnerByAssetId: ReadonlyMap<string, string> = new Map(),
  preferredFrameOrder?: readonly SwitchroomFrame[],
) {
  const byId = new Map(model.assets.map(asset => [asset.id, asset]));
  const placement = placeRoomFramesWithoutOverlap(frames);
  const ordered = preferredFrameOrder?.length ? [...preferredFrameOrder] : orderRoomFramesTopologically(frames);
  const ownerByAsset = new Map(clusterOwnerByAssetId);
  for (const frame of frames) for (const id of frame.assetIds) if (!ownerByAsset.has(id)) ownerByAsset.set(id, frame.id);

  // Apply the complete solution from immutable frame bounds. Each asset gets
  // exactly one room delta, so translating one branch cannot change the input
  // geometry used to calculate another room's position.
  for (const [id, roomId] of ownerByAsset) {
    if (outsideFrameAssets.has(id)) continue;
    const dy = placement.verticalShifts[roomId] ?? 0;
    if (!dy) continue;
    const asset = byId.get(id);
    const point = layout.assets[id];
    if (!asset || !point) continue;
    layout.assets[id] = [point[0], point[1] + dy];
    for (const terminal of asset.terminals) {
      const terminalPoint = layout.terminals[terminal];
      if (terminalPoint) layout.terminals[terminal] = [terminalPoint[0], terminalPoint[1] + dy];
    }
    const label = labels.get(id);
    if (label) labels.set(id, { ...label, y: label.y + dy });
  }

  const frameById = new Map(switchroomFrames(model, layout, labels).map(frame => [frame.id, frame]));
  for (const frame of frames) {
    const refreshed = frameById.get(frame.id);
    if (refreshed) refreshed.memberAssetIds = [...frame.memberAssetIds];
  }
  return ordered.flatMap(frame => frameById.has(frame.id) ? [frameById.get(frame.id)!] : []);
}

function switchroomAssetBounds(asset: NetworkModel['assets'][number], layout: DiagramLayout, labels: Map<string, AssetLabel>) {
  const [x, y] = layout.assets[asset.id];
  const label = labels.get(asset.id);
  if (hasDeviceCard(asset) && label) {
    const card = deviceCard(asset, [x, y], label);
    return { x: x + card.x, y: y + card.y, width: card.width, height: card.height };
  }

  const halfWidth = asset.kind === 'bus'
    && Math.abs((layout.rotations?.[asset.id] ?? 0) % 180) === 90
    ? (layout.busSpans?.[asset.id] ?? 60) / 2
    : 44;
  const halfHeight = asset.kind === 'bus'
    && Math.abs((layout.rotations?.[asset.id] ?? 0) % 180) !== 90
    ? (layout.busSpans?.[asset.id] ?? 60) / 2
    : 44;
  const symbol = { x: x - halfWidth, y: y - halfHeight, width: halfWidth * 2, height: halfHeight * 2 };
  if (!label) return symbol;
  const left = Math.min(symbol.x, label.x);
  const top = Math.min(symbol.y, label.y);
  const right = Math.max(symbol.x + symbol.width, label.x + label.width);
  const bottom = Math.max(symbol.y + symbol.height, label.y + label.height);
  return { x: left, y: top, width: right - left, height: bottom - top };
}
