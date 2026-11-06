import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { roomPlacementPlan } from './room-placement-plan';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];

/**
 * Trial 9: recursive interval allocation. Confirmed room parentage defines a
 * forest; each room receives an interval wide enough for its own measured
 * frame and all child subtrees. Children are centered in that interval and
 * placed on shared depth rows. Unconfirmed rooms remain separate root trees.
 */
export function planAgent9RecursiveTree(frames: readonly Frame[], options: { horizontalGap?: number; verticalGap?: number } = {}) {
  const horizontalGap = options.horizontalGap ?? 1_400;
  const verticalGap = options.verticalGap ?? 1_100;
  const frameById = new Map(frames.map(frame => [frame.id, frame] as const));
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  const parent = new Map<string, string>();
  for (const frame of frames) {
    const confirmed = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    const parentRoom = confirmed?.topology === 'owner-confirmed'
      ? confirmed.parents.find(item => item.kind === 'room' && frameById.has(item.id)) : undefined;
    if (!parentRoom) continue;
    parent.set(frame.id, parentRoom.id);
    children.get(parentRoom.id)!.push(frame.id);
  }
  for (const room of frames.map(frame => frame.id)) children.get(room)!.sort((a, b) => {
    const pa = roomPlacementPlan[a as keyof typeof roomPlacementPlan]?.parents.find(item => item.kind === 'room');
    const pb = roomPlacementPlan[b as keyof typeof roomPlacementPlan]?.parents.find(item => item.kind === 'room');
    return (pa?.order ?? 0) - (pb?.order ?? 0) || a.localeCompare(b);
  });
  const roots = frames.map(frame => frame.id).filter(id => !parent.has(id)).sort((a, b) => a.localeCompare(b));
  const widths = new Map<string, number>();
  const visiting = new Set<string>();
  function subtreeWidth(id: string): number {
    if (widths.has(id)) return widths.get(id)!;
    if (visiting.has(id)) throw new Error(`Cycle in room parent plan at ${id}`);
    visiting.add(id);
    const frame = frameById.get(id)!;
    const childIds = children.get(id)!;
    const childSpan = childIds.reduce((sum, child) => sum + subtreeWidth(child), 0) + Math.max(0, childIds.length - 1) * horizontalGap;
    const span = Math.max(frame.width, childSpan);
    visiting.delete(id); widths.set(id, span); return span;
  }
  for (const id of roots) subtreeWidth(id);
  const depthById = new Map<string, number>();
  function assignDepth(id: string, depth: number) {
    depthById.set(id, depth);
    for (const child of children.get(id)!) assignDepth(child, depth + 1);
  }
  for (const root of roots) assignDepth(root, 0);
  const depthCount = Math.max(0, ...depthById.values()) + 1;
  const rowHeights = Array.from({ length: depthCount }, () => 0);
  for (const [id, depth] of depthById) rowHeights[depth] = Math.max(rowHeights[depth], frameById.get(id)!.height);
  const rowY = [0];
  for (let depth = 1; depth < depthCount; depth++) rowY.push(rowY[depth - 1] + rowHeights[depth - 1] + verticalGap);
  const targets: Record<string, readonly [number, number]> = {};
  function place(id: string, intervalLeft: number) {
    const frame = frameById.get(id)!;
    const span = widths.get(id)!;
    const targetX = intervalLeft + (span - frame.width) / 2;
    const targetY = rowY[depthById.get(id)!];
    targets[id] = [targetX, targetY];
    const childIds = children.get(id)!;
    const childTotal = childIds.reduce((sum, child) => sum + widths.get(child)!, 0) + Math.max(0, childIds.length - 1) * horizontalGap;
    let cursor = intervalLeft + (span - childTotal) / 2;
    for (const child of childIds) {
      place(child, cursor);
      cursor += widths.get(child)! + horizontalGap;
    }
  }
  let rootLeft = 0;
  for (const root of roots) {
    place(root, rootLeft);
    rootLeft += widths.get(root)! + horizontalGap * 2;
  }
  const roomTranslations = Object.fromEntries([...frameById].map(([id, frame]) => {
    const [x, y] = targets[id];
    return [id, [x - frame.x, y - frame.y] as [number, number]];
  }));
  return { roomTranslations, targets, parentByRoom: Object.fromEntries(parent), childrenByRoom: Object.fromEntries([...children].map(([id, list]) => [id, [...list]])), roots, widths: Object.fromEntries(widths), rowY };
}

export function layoutAgent9RecursiveTree(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const plan = planAgent9RecursiveTree(seed.frames);
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations: plan.roomTranslations, routeBudget: 'quick' });
  return { ...candidate, recursivePlan: plan };
}
