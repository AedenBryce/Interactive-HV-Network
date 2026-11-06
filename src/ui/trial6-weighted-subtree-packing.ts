import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import { roomPlacementPlan } from './room-placement-plan';

type Frame = ReturnType<typeof continuousNetwork>['panels'][number];
type Point = [number, number];

/**
 * Trial 6: weighted rectangular subtree packing. Confirmed room ownership
 * defines a forest. Each branch gets a hard minimum rectangle based on its
 * descendant footprints, then spare interval width is allocated by measured
 * room area and cross-branch connection demand. Cross-feed connections do
 * not claim or move rooms; the whole-graph router handles them as corridors.
 */
export function planTrial6WeightedSubtrees(
  frames: readonly Frame[],
  model: NetworkModel,
  options: { horizontalGap?: number; verticalGap?: number; corridorUnit?: number } = {},
) {
  const horizontalGap = options.horizontalGap ?? 1_100;
  const verticalGap = options.verticalGap ?? 1_200;
  const corridorUnit = options.corridorUnit ?? 180;
  const byId = new Map(frames.map(frame => [frame.id, frame] as const));
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  const parent = new Map<string, string>();

  for (const frame of frames) {
    const record = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    const parentRoom = record?.topology === 'owner-confirmed'
      ? record.parents.find(item => item.kind === 'room' && byId.has(item.id))
      : undefined;
    if (!parentRoom) continue;
    parent.set(frame.id, parentRoom.id);
    children.get(parentRoom.id)!.push(frame.id);
  }
  for (const ids of children.values()) ids.sort((a, b) => {
    const aOrder = roomPlacementPlan[a as keyof typeof roomPlacementPlan]?.parents.find(item => item.kind === 'room')?.order ?? 0;
    const bOrder = roomPlacementPlan[b as keyof typeof roomPlacementPlan]?.parents.find(item => item.kind === 'room')?.order ?? 0;
    return aOrder - bOrder || a.localeCompare(b);
  });

  const roomByAsset = new Map(frames.flatMap(frame => frame.memberAssetIds.map(assetId => [assetId, frame.id] as const)));
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const crossDegree = new Map<string, number>(frames.map(frame => [frame.id, 0]));
  const pairDemand = new Map<string, number>();
  for (const connection of model.connections) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(connection.from) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(connection.to) ?? '');
    if (!fromRoom || !toRoom || fromRoom === toRoom) continue;
    crossDegree.set(fromRoom, (crossDegree.get(fromRoom) ?? 0) + 1);
    crossDegree.set(toRoom, (crossDegree.get(toRoom) ?? 0) + 1);
    const pair = [fromRoom, toRoom].sort().join('\0');
    pairDemand.set(pair, (pairDemand.get(pair) ?? 0) + 1);
  }

  const minWidth = new Map<string, number>();
  const areaWeight = new Map<string, number>();
  const visiting = new Set<string>();
  function measure(id: string): { width: number; weight: number } {
    const cached = minWidth.get(id);
    if (cached !== undefined) return { width: cached, weight: areaWeight.get(id)! };
    if (visiting.has(id)) throw new Error(`Cycle in confirmed room parentage: ${id}`);
    visiting.add(id);
    const frame = byId.get(id)!;
    const childrenMeasures = children.get(id)!.map(measure);
    const childWidth = childrenMeasures.reduce((sum, item) => sum + item.width, 0)
      + Math.max(0, childrenMeasures.length - 1) * horizontalGap;
    const corridorBudget = Math.max(0, (crossDegree.get(id) ?? 0) - 1) * corridorUnit;
    const width = Math.max(frame.width, childWidth + corridorBudget);
    const weight = frame.width * frame.height
      + childrenMeasures.reduce((sum, item) => sum + item.weight, 0)
      + Math.max(0, crossDegree.get(id) ?? 0) * corridorUnit * Math.max(1, frame.height * 0.25);
    visiting.delete(id);
    minWidth.set(id, width);
    areaWeight.set(id, weight);
    return { width, weight };
  }
  const roots = frames.map(frame => frame.id).filter(id => !parent.has(id)).sort((a, b) => a.localeCompare(b));
  for (const root of roots) measure(root);
  for (const frame of frames) if (!minWidth.has(frame.id)) measure(frame.id);

  const depth = new Map<string, number>();
  function setDepth(id: string, value: number) {
    if (depth.has(id)) return;
    depth.set(id, value);
    for (const child of children.get(id)!) setDepth(child, value + 1);
  }
  for (const root of roots) setDepth(root, 0);
  for (const frame of frames) if (!depth.has(frame.id)) { roots.push(frame.id); setDepth(frame.id, 0); }
  const rowCount = Math.max(0, ...depth.values()) + 1;
  const rowHeights = Array.from({ length: rowCount }, () => 0);
  for (const frame of frames) rowHeights[depth.get(frame.id)!] = Math.max(rowHeights[depth.get(frame.id)!], frame.height);
  const rowY = [0];
  for (let row = 1; row < rowCount; row++) rowY.push(rowY[row - 1] + rowHeights[row - 1] + verticalGap);

  const targets: Record<string, Point> = {};
  const allocatedWidths = new Map<string, number>();
  function place(id: string, intervalLeft: number, width: number) {
    const frame = byId.get(id)!;
    const x = intervalLeft + (width - frame.width) / 2;
    targets[id] = [x, rowY[depth.get(id)!]];
    allocatedWidths.set(id, width);
    const kids = children.get(id)!;
    if (!kids.length) return;
    const minKids = kids.reduce((sum, child) => sum + minWidth.get(child)!, 0)
      + Math.max(0, kids.length - 1) * horizontalGap;
    const spare = Math.max(0, width - minKids);
    const weights = kids.map(child => Math.sqrt(Math.max(1, areaWeight.get(child)!)));
    const totalWeight = weights.reduce((sum, value) => sum + value, 0);
    const allocations = kids.map((child, index) => minWidth.get(child)! + spare * weights[index] / Math.max(1, totalWeight));
    const used = allocations.reduce((sum, value) => sum + value, 0) + Math.max(0, kids.length - 1) * horizontalGap;
    let cursor = intervalLeft + (width - used) / 2;
    kids.forEach((child, index) => {
      place(child, cursor, allocations[index]);
      cursor += allocations[index] + horizontalGap;
    });
  }

  let rootX = 0;
  for (const root of roots) {
    const width = minWidth.get(root)!;
    place(root, rootX, width);
    rootX += width + horizontalGap * 2;
  }
  const roomTranslations = Object.fromEntries(frames.map(frame => {
    const [x, y] = targets[frame.id];
    return [frame.id, [x - frame.x, y - frame.y] as Point];
  }));
  return {
    roomTranslations,
    targets,
    parentByRoom: Object.fromEntries(parent),
    childrenByRoom: Object.fromEntries([...children].map(([id, items]) => [id, [...items]])),
    roots,
    minimumWidths: Object.fromEntries(minWidth),
    allocatedWidths: Object.fromEntries(allocatedWidths),
    subtreeWeights: Object.fromEntries(areaWeight),
    crossDegree: Object.fromEntries(crossDegree),
    pairDemand: Object.fromEntries(pairDemand),
    rowY,
  };
}

export function layoutTrial6WeightedSubtrees(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const plan = planTrial6WeightedSubtrees(seed.frames, model);
  const candidate = layoutWholeGraphCandidate(model, {
    baseGeometry: base,
    roomTranslations: plan.roomTranslations,
    routeBudget: 'quick',
  });
  return { ...candidate, weightedPlan: plan };
}
