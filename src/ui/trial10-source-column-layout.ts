import type { NetworkModel } from '../session/model';
import { continuousNetwork } from './continuous-network';
import { layoutWholeGraphCandidate } from './whole-graph-layout-candidate';
import type { Point } from './diagram-geometry';

type Candidate = ReturnType<typeof layoutWholeGraphCandidate>;
type Frame = Candidate['frames'][number];

/**
 * Source-column experiment: keep confirmed room parentage as a tree, reserve a
 * separate top-down column for each source-root group, and pack a room's child
 * subtrees into two-column bands. Non-tree feeds remain explicit routed edges.
 */
export function layoutTrial10SourceColumns(model: NetworkModel) {
  const base = continuousNetwork(model);
  const seed = layoutWholeGraphCandidate(model, { baseGeometry: base, routeBudget: 'quick' });
  const frames = seed.frames;
  const frameIds = new Set(frames.map(frame => frame.id));
  const children = new Map(frames.map(frame => [frame.id, [] as string[]]));
  const parentByRoom = new Map<string, string>();

  // The safe plan already removes parents whose topology is unconfirmed and
  // uses presentation-only parents for detached frames. Preserve that policy.
  for (const frame of frames) {
    const parents = seed.safePlan[frame.id]?.parents.filter(parent => parent.kind === 'room' && frameIds.has(parent.id)) ?? [];
    const parent = parents[0]?.id;
    if (parent && parent !== frame.id && !parentByRoom.has(frame.id)) {
      parentByRoom.set(frame.id, parent);
      children.get(parent)!.push(frame.id);
    }
  }

  // For frames deliberately left as visual roots by the safe explicit plan,
  // use only the already-modeled spanning tree to choose a placement parent.
  // This affects coordinates only: every original connection and confidence
  // state is passed unchanged to the final candidate/router.
  const assetNeighbours = new Map(model.assets.map(asset => [asset.id, [] as string[]]));
  for (const connection of model.connections) {
    if (!base.treeEdgeIds.has(connection.id)) continue;
    const from = base.owners.get(connection.from);
    const to = base.owners.get(connection.to);
    if (!from || !to || from === to) continue;
    assetNeighbours.get(from)?.push(to);
    assetNeighbours.get(to)?.push(from);
  }
  const parentAssetById = new Map<string, string>();
  const visitedAssets = new Set(model.sources.map(source => source.assetId));
  const queue = [...visitedAssets];
  const traverse = () => {
    for (let cursor = 0; cursor < queue.length; cursor++) {
      const parent = queue[cursor];
      for (const child of assetNeighbours.get(parent) ?? []) {
        if (visitedAssets.has(child)) continue;
        visitedAssets.add(child);
        parentAssetById.set(child, parent);
        queue.push(child);
      }
    }
  };
  traverse();
  for (const asset of model.assets) if (!visitedAssets.has(asset.id)) {
    visitedAssets.add(asset.id);
    queue.push(asset.id);
    traverse();
  }
  const frameByAsset = new Map<string, string>();
  for (const frame of frames) for (const assetId of frame.assetIds) frameByAsset.set(assetId, frame.id);
  const crossingCounts = new Map<string, Map<string, number>>();
  for (const [childAsset, parentAsset] of parentAssetById) {
    const childRoom = frameByAsset.get(childAsset);
    const parentRoom = frameByAsset.get(parentAsset);
    if (!childRoom || !parentRoom || childRoom === parentRoom) continue;
    const parents = crossingCounts.get(childRoom) ?? new Map<string, number>();
    parents.set(parentRoom, (parents.get(parentRoom) ?? 0) + 1);
    crossingCounts.set(childRoom, parents);
  }
  const roomParentOrder = new Map(frames.map(frame => [frame.id,
    seed.safePlan[frame.id]?.parents.map(parent => parent.order).find(value => value !== undefined) ?? 0] as const));
  for (const frame of frames) {
    if (parentByRoom.has(frame.id)) continue;
    const selected = [...(crossingCounts.get(frame.id) ?? [])]
      .filter(([parent]) => parent !== frame.id)
      .sort(([a, countA], [b, countB]) => countB - countA
        || roomParentOrder.get(a)! - roomParentOrder.get(b)!
        || a.localeCompare(b))[0]?.[0];
    if (selected && frameIds.has(selected)) {
      parentByRoom.set(frame.id, selected);
      children.get(selected)!.push(frame.id);
    }
  }

  // Break any malformed presentation cycle deterministically without changing
  // model topology; the affected room becomes an independent visual root.
  for (const frame of frames) {
    const seen = new Set<string>([frame.id]);
    let cursor = parentByRoom.get(frame.id);
    let cyclic = false;
    while (cursor) {
      if (seen.has(cursor)) { cyclic = true; break; }
      seen.add(cursor);
      cursor = parentByRoom.get(cursor);
    }
    if (cyclic) {
      const oldParent = parentByRoom.get(frame.id)!;
      parentByRoom.delete(frame.id);
      children.set(oldParent, children.get(oldParent)!.filter(id => id !== frame.id));
    }
  }
  for (const list of children.values()) list.sort((a, b) => {
    const order = (id: string) => seed.safePlan[id]?.parents.map(parent => parent.order).find(value => value !== undefined) ?? 0;
    return order(a) - order(b) || a.localeCompare(b);
  });

  const roomFootprints = seed.roomFootprints;
  const horizontalGap = 1_400;
  const verticalGap = 1_400;
  const maxChildrenPerBand = 2;
  type Size = { width: number; height: number; bands: { ids: string[]; height: number; width: number }[] };
  const measured = new Map<string, Size>();
  const measure = (id: string): Size => {
    const cached = measured.get(id);
    if (cached) return cached;
    const footprint = roomFootprints.get(id)!;
    const width = Math.max(1, footprint.maxX - footprint.minX);
    const height = Math.max(1, footprint.maxY - footprint.minY);
    const descendantRows: { ids: string[]; sizes: Size[] }[] = [];
    const childIds = children.get(id) ?? [];
    for (let index = 0; index < childIds.length; index += maxChildrenPerBand) {
      const ids = childIds.slice(index, index + maxChildrenPerBand);
      descendantRows.push({ ids, sizes: ids.map(measure) });
    }
    const bands = descendantRows.map(({ ids, sizes }) => ({
      ids,
      width: sizes.reduce((sum, item) => sum + item.width, 0) + Math.max(0, sizes.length - 1) * horizontalGap,
      height: Math.max(0, ...sizes.map(item => item.height)),
    }));
    const subtreeWidth = Math.max(width, ...bands.map(band => band.width));
    const subtreeHeight = height + (bands.length ? verticalGap + bands.reduce((sum, band) => sum + band.height, 0) + Math.max(0, bands.length - 1) * verticalGap : 0);
    const result = { width: subtreeWidth, height: subtreeHeight, bands };
    measured.set(id, result);
    return result;
  };

  const targetByRoom: Record<string, Point> = {};
  const place = (id: string, centerX: number, top: number) => {
    const footprint = roomFootprints.get(id)!;
    const ownWidth = footprint.maxX - footprint.minX;
    const ownHeight = footprint.maxY - footprint.minY;
    const size = measure(id);
    const left = centerX - ownWidth / 2;
    targetByRoom[id] = [left, top];
    let childY = top + ownHeight + (size.bands.length ? verticalGap : 0);
    for (const band of size.bands) {
      let x = centerX - band.width / 2;
      for (const childId of band.ids) {
        const childSize = measure(childId);
        const childCenter = x + childSize.width / 2;
        place(childId, childCenter, childY);
        x += childSize.width + horizontalGap;
      }
      childY += band.height + verticalGap;
    }
  };

  const roots = frames.filter(frame => !parentByRoom.has(frame.id));
  const anchorKey = (id: string) => {
    const parents = seed.safePlan[id]?.parents ?? [];
    const anchors = parents.filter(parent => parent.kind === 'supply-anchor').map(parent => parent.id).sort();
    // Rooms with several owner-confirmed supply anchors share one visual root
    // group; this is only a layout grouping and does not combine their circuits.
    return anchors.length ? `source-group:${anchors.join('+')}` : `independent:${id}`;
  };
  const rootsByGroup = new Map<string, Frame[]>();
  for (const root of roots) {
    const key = anchorKey(root.id);
    const items = rootsByGroup.get(key) ?? [];
    items.push(root);
    rootsByGroup.set(key, items);
  }
  const rootGroups = [...rootsByGroup.entries()].sort(([a], [b]) => a.localeCompare(b));
  const groupGap = 2_400;
  let globalX = 0;
  const columnSummaries: { id: string; roots: string[]; width: number; height: number }[] = [];
  for (const [groupId, groupRoots] of rootGroups) {
    const rootIds = groupRoots.map(frame => frame.id).sort((a, b) => {
      const order = (id: string) => seed.safePlan[id]?.parents.map(parent => parent.order).find(value => value !== undefined) ?? 0;
      return order(a) - order(b) || a.localeCompare(b);
    });
    const rowWidths = rootIds.map(id => measure(id).width);
    const groupWidth = rowWidths.reduce((sum, value) => sum + value, 0) + Math.max(0, rowWidths.length - 1) * horizontalGap;
    let x = globalX;
    let groupHeight = 0;
    for (const id of rootIds) {
      const rootSize = measure(id);
      place(id, x + rootSize.width / 2, 0);
      x += rootSize.width + horizontalGap;
      groupHeight = Math.max(groupHeight, rootSize.height);
    }
    columnSummaries.push({ id: groupId, roots: rootIds, width: groupWidth, height: groupHeight });
    globalX += groupWidth + groupGap;
  }

  const roomTranslations: Record<string, Point> = {};
  for (const frame of frames) {
    const target = targetByRoom[frame.id];
    const footprint = roomFootprints.get(frame.id);
    if (!target || !footprint) continue;
    roomTranslations[frame.id] = [target[0] - footprint.minX, target[1] - footprint.minY];
  }
  const candidate = layoutWholeGraphCandidate(model, { baseGeometry: base, roomTranslations, routeBudget: 'quick' });
  const bounds = candidate.bounds;
  return { candidate, columns: columnSummaries, targetByRoom, bounds, aspect: bounds.width / Math.max(1, bounds.height) };
}
