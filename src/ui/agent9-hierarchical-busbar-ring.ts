import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { roomPlacementPlan } from './room-placement-plan';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];

/**
 * Trial 2 for agent 9. Unlike recursive interval allocation, this is a
 * layer-first macro layout: all rooms at the same confirmed electrical depth
 * share a row, and within each layer siblings sort by parent barycentre and
 * declared feeder order. Bus-terminal links and confirmed ring/cross links
 * are routed first after placement so their corridors are reserved globally.
 */
export function planAgent9HierarchicalLayers(frames: readonly Frame[], options: { horizontalGap?: number; verticalGap?: number } = {}) {
  const horizontalGap = options.horizontalGap ?? 1_250;
  const verticalGap = options.verticalGap ?? 1_200;
  const frameById = new Map(frames.map(frame => [frame.id, frame] as const));
  const parent = new Map<string, string>();
  const order = new Map<string, number>();
  for (const frame of frames) {
    const node = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (node?.topology !== 'owner-confirmed') continue;
    const room = node.parents.find(item => item.kind === 'room' && frameById.has(item.id));
    if (room) { parent.set(frame.id, room.id); order.set(frame.id, room.order); }
  }
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  for (const [child, parentId] of parent) children.get(parentId)!.push(child);
  for (const ids of children.values()) ids.sort((a, b) => (order.get(a) ?? 0) - (order.get(b) ?? 0) || a.localeCompare(b));
  const roots = frames.map(frame => frame.id).filter(id => !parent.has(id)).sort((a, b) => {
    const na = roomPlacementPlan[a as keyof typeof roomPlacementPlan];
    const nb = roomPlacementPlan[b as keyof typeof roomPlacementPlan];
    const sourceA = na?.parents.find(item => item.kind === 'supply-anchor');
    const sourceB = nb?.parents.find(item => item.kind === 'supply-anchor');
    return (sourceA?.order ?? 10_000) - (sourceB?.order ?? 10_000) || a.localeCompare(b);
  });
  const depth = new Map<string, number>();
  const queue: [string, number][] = roots.map(id => [id, 0]);
  for (let index = 0; index < queue.length; index++) {
    const [id, level] = queue[index];
    if (depth.has(id)) continue;
    depth.set(id, level);
    for (const child of children.get(id) ?? []) queue.push([child, level + 1]);
  }
  // A malformed/cyclic room plan must still keep every frame accessible.
  for (const frame of frames) if (!depth.has(frame.id)) { depth.set(frame.id, 0); roots.push(frame.id); }
  const maxDepth = Math.max(0, ...depth.values());
  const layerHeights = Array.from({ length: maxDepth + 1 }, () => 0);
  for (const frame of frames) layerHeights[depth.get(frame.id)!] = Math.max(layerHeights[depth.get(frame.id)!], frame.height);
  const layerY = [0];
  for (let d = 1; d <= maxDepth; d++) layerY.push(layerY[d - 1] + layerHeights[d - 1] + verticalGap);
  const centerX = new Map<string, number>();
  const targets: Record<string, readonly [number, number]> = {};
  const layers = Array.from({ length: maxDepth + 1 }, (_, level) => frames.filter(frame => depth.get(frame.id) === level));
  for (let level = 0; level < layers.length; level++) {
    const row = layers[level];
    row.sort((a, b) => {
      const parentA = parent.get(a.id); const parentB = parent.get(b.id);
      const baryA = parentA ? centerX.get(parentA) ?? frameById.get(parentA)!.x + frameById.get(parentA)!.width / 2 : a.x;
      const baryB = parentB ? centerX.get(parentB) ?? frameById.get(parentB)!.x + frameById.get(parentB)!.width / 2 : b.x;
      const parentDelta = baryA - baryB;
      if (Math.abs(parentDelta) > 1) return parentDelta;
      return (order.get(a.id) ?? 10_000) - (order.get(b.id) ?? 10_000) || a.x - b.x || a.id.localeCompare(b.id);
    });
    const totalWidth = row.reduce((sum, frame) => sum + frame.width, 0) + Math.max(0, row.length - 1) * horizontalGap;
    let x = -totalWidth / 2;
    for (const frame of row) {
      targets[frame.id] = [x, layerY[level]];
      centerX.set(frame.id, x + frame.width / 2);
      x += frame.width + horizontalGap;
    }
  }
  const roomTranslations = Object.fromEntries(frames.map(frame => {
    const [x, y] = targets[frame.id];
    return [frame.id, [x - frame.x, y - frame.y] as [number, number]];
  }));
  return { roomTranslations, targets, parentByRoom: Object.fromEntries(parent), depthByRoom: Object.fromEntries(depth), roots, layers: layers.map(items => items.map(frame => frame.id)), layerY };
}

export function layoutAgent9HierarchicalBusbarRing(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const plan = planAgent9HierarchicalLayers(seed.frames);
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const kindByAsset = new Map(model.assets.map(asset => [asset.id, asset.kind] as const));
  const busEdges = model.connections.filter(connection => kindByAsset.get(ownerByTerminal.get(connection.from) ?? '') === 'bus'
    || kindByAsset.get(ownerByTerminal.get(connection.to) ?? '') === 'bus').map(connection => connection.id);
  const ringEdges = model.connections.filter(connection => connection.id === 'whole:join:crushing-tie'
    || connection.id.startsWith('whole:join:')).map(connection => connection.id);
  const priority = [...new Set([...busEdges, ...ringEdges])];
  const candidate = layoutWholeGraphCandidate(model, {
    baseGeometry: base,
    roomTranslations: plan.roomTranslations,
    prioritizeConnectionIds: priority,
    routeBudget: 'quick',
  });
  return { ...candidate, hierarchyPlan: plan, priorityBusEdges: busEdges, priorityRingEdges: ringEdges };
}
