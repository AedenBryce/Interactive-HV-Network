import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import { roomPlacementAdjacencies, roomPlacementPlan } from './room-placement-plan';
import type { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';

type Candidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;
type Frame = Candidate['frames'][number];

/** Position confirmed room groups using the production route's room-edge ports. */
export function alignRoomBranchesByCablePorts(model: NetworkModel, candidate: Candidate, options: { gap?: number; stagger?: number } = {}) {
  const gap = options.gap ?? 420;
  const stagger = options.stagger ?? 600;
  const originalFrameById = new Map(candidate.originalFrames.map(frame => [frame.id, frame]));
  const frameById = new Map(candidate.frames.map(frame => [frame.id, frame]));
  const parentOf = new Map<string, string>();
  for (const frame of candidate.frames) {
    const node = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (!node || node.topology !== 'owner-confirmed') continue;
    const parent = node.parents.find(item => item.kind === 'room' && frameById.has(item.id));
    if (!parent) continue;
    const confirmedParent = roomPlacementPlan[parent.id as keyof typeof roomPlacementPlan]?.topology === 'owner-confirmed';
    if (confirmedParent) parentOf.set(frame.id, parent.id);
  }
  const childIds = new Map<string, string[]>();
  for (const [child, parent] of parentOf) childIds.set(parent, [...(childIds.get(parent) ?? []), child]);
  for (const [parent, children] of childIds) childIds.set(parent, children.sort((a, b) => order(a) - order(b) || a.localeCompare(b)));

  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const linkFor = new Map<string, { id: string; parentPort: Point; childPort: Point }>();
  const unresolvedParentLinks: string[] = [];

  const roomPort = (route: readonly Point[], frame: Frame, direction: 'exit' | 'entry') => {
    const originalFrame = originalFrameById.get(frame.id)!;
    const cuts: { point: Point; index: number }[] = [];
    for (let i = 0; i < route.length - 1; i++) {
      const a = route[i]; const b = route[i + 1];
      const aInside = inside(a, originalFrame); const bInside = inside(b, originalFrame);
      if (direction === 'exit' && aInside && !bInside) cuts.push({ point: boundary(a, b, originalFrame), index: i + 0.5 });
      if (direction === 'entry' && !aInside && bInside) cuts.push({ point: boundary(b, a, originalFrame), index: i + 0.5 });
    }
    if (!cuts.length) return undefined;
    return direction === 'exit' ? cuts[0] : cuts.at(-1);
  };

  for (const child of parentOf.keys()) {
    const parent = parentOf.get(child)!;
    const parentFrame = frameById.get(parent)!; const childFrame = frameById.get(child)!;
    const node = roomPlacementPlan[child as keyof typeof roomPlacementPlan];
    const declaredIds: string[] = [];
    for (const item of node?.parents ?? []) if (item.kind === 'room') {
      const metadata = item as { connectionIds?: readonly string[]; connectionId?: string };
      declaredIds.push(...(metadata.connectionIds ?? (metadata.connectionId ? [metadata.connectionId] : [])));
    }
    const candidates = declaredIds.map(id => connectionById.get(id)).filter((item): item is NetworkModel['connections'][number] => Boolean(item));
    if (!candidates.length) {
      for (const connection of model.connections) {
        const fromOwner = ownerByTerminal.get(connection.from); const toOwner = ownerByTerminal.get(connection.to);
        const direct = (parentFrame.memberAssetIds.includes(fromOwner ?? '') && childFrame.memberAssetIds.includes(toOwner ?? ''))
          || (childFrame.memberAssetIds.includes(fromOwner ?? '') && parentFrame.memberAssetIds.includes(toOwner ?? ''));
        if (direct) candidates.push(connection);
      }
    }
    if (!candidates.length) {
      for (const connection of model.connections) if (candidate.originalRoutes.has(connection.id)) candidates.push(connection);
    }
    let chosen: { id: string; parentPort: Point; childPort: Point; score: number } | undefined;
    for (const connection of candidates) {
      const route = candidate.originalRoutes.get(connection.id); if (!route) continue;
      const fromOwner = ownerByTerminal.get(connection.from); const toOwner = ownerByTerminal.get(connection.to);
      const fromParent = parentFrame.memberAssetIds.includes(fromOwner ?? '');
      const fromChild = childFrame.memberAssetIds.includes(fromOwner ?? '');
      const toParent = parentFrame.memberAssetIds.includes(toOwner ?? '');
      const toChild = childFrame.memberAssetIds.includes(toOwner ?? '');
      let orderedRoute = route;
      if ((fromChild && toParent) || (!fromParent && toChild)) orderedRoute = [...route].reverse();
      const parentPort = roomPort(orderedRoute, parentFrame, 'exit');
      const childPort = roomPort(orderedRoute, childFrame, 'entry');
      if (!parentPort || !childPort || parentPort.index >= childPort.index) continue;
      const direct = (fromParent && toChild) || (fromChild && toParent);
      const score = (declaredIds.includes(connection.id) ? 1_000_000 : 0) + (direct ? 100_000 : 0) - Math.abs(childFrame.x - parentFrame.x) - Math.abs(childFrame.y - parentFrame.y);
      if (!chosen || score > chosen.score) chosen = { id: connection.id, parentPort: parentPort.point, childPort: childPort.point, score };
    }
    if (!chosen) { unresolvedParentLinks.push(`${parent}→${child}`); continue; }
    linkFor.set(child, chosen);
  }

  const desired = new Map<string, { x: number; y: number }>();
  const placed: Frame[] = [];
  const roots = candidate.frames.filter(frame => !parentOf.has(frame.id));
  for (const frame of roots) {
    desired.set(frame.id, { x: frame.x, y: frame.y });
    placed.push(frame);
  }
  const queue = [...roots.map(frame => frame.id)];
  while (queue.length) {
    const parentId = queue.shift()!;
    const parent = frameById.get(parentId)!;
    const parentPosition = desired.get(parentId)!;
    const siblings = childIds.get(parentId) ?? [];
    const used = new Set<string>();
    let previousRowY = parentPosition.y + parent.height + gap;
    for (const childId of siblings) {
      if (used.has(childId)) continue;
      const pairId = roomPlacementAdjacencies.find(pair => pair.from === childId || pair.to === childId);
      const groupIds = pairId && siblings.includes(pairId.from) && siblings.includes(pairId.to)
        ? [pairId.from, pairId.to].sort((a, b) => order(a) - order(b) || a.localeCompare(b))
        : [childId];
      groupIds.forEach(id => used.add(id));
      const childFrames = groupIds.map(id => frameById.get(id)!);
      const links = groupIds.map(id => linkFor.get(id));
      const portAligned = links.every(Boolean);
      let y = portAligned
        ? Math.max(previousRowY, ...childFrames.map((frame, index) => parentPosition.y + (links[index]!.parentPort[1] - originalFrameById.get(parentId)!.y) + gap - (links[index]!.childPort[1] - originalFrameById.get(frame.id)!.y)))
        : previousRowY;
      let x: number;
      if (groupIds.length === 1 && links[0]) {
        const link = links[0]!;
        x = parentPosition.x + (link.parentPort[0] - originalFrameById.get(parentId)!.x) - (link.childPort[0] - originalFrameById.get(childId)!.x);
      } else {
        const totalWidth = childFrames.reduce((sum, frame) => sum + frame.width, 0) + gap * (childFrames.length - 1);
        const sourceX = links.reduce((sum, link) => sum + (link ? parentPosition.x + link.parentPort[0] - originalFrameById.get(parentId)!.x : parentPosition.x + parent.width / 2), 0) / links.length;
        x = sourceX - totalWidth / 2;
      }
      while (childFrames.some((frame, index) => {
        const frameX = x + childFrames.slice(0, index).reduce((sum, prior) => sum + prior.width + gap, 0);
        return placed.some(other => overlaps(frameX, y, frame.width, frame.height, other.x, other.y, other.width, other.height));
      })) y += stagger;
      let cursorX = x;
      for (const frame of childFrames) {
        const point = { x: cursorX, y };
        desired.set(frame.id, point);
        placed.push({ ...frame, ...point });
        cursorX += frame.width + gap;
        queue.push(frame.id);
      }
      previousRowY = y + Math.max(...childFrames.map(frame => frame.height)) + gap;
    }
  }
  for (const frame of candidate.frames) if (!desired.has(frame.id)) { desired.set(frame.id, { x: frame.x, y: frame.y }); placed.push(frame); }

  const deltaByRoom = new Map<string, Point>();
  const frames = candidate.frames.map(frame => {
    const target = desired.get(frame.id)!;
    deltaByRoom.set(frame.id, [target.x - frame.x, target.y - frame.y]);
    return { ...frame, x: target.x, y: target.y };
  });
  const positions = { ...candidate.positions }; const terminalPositions = { ...candidate.terminalPositions };
  const labels = new Map([...candidate.labels].map(([id, label]) => [id, { ...label }]));
  const deltaByAsset = new Map(candidate.deltaByAsset);
  for (const [assetId, roomId] of candidate.roomOwnerByAsset) {
    const [dx, dy] = deltaByRoom.get(roomId) ?? [0, 0];
    if (positions[assetId]) positions[assetId] = [positions[assetId][0] + dx, positions[assetId][1] + dy];
    const asset = model.assets.find(item => item.id === assetId);
    for (const terminal of asset?.terminals ?? []) if (terminalPositions[terminal]) terminalPositions[terminal] = [terminalPositions[terminal][0] + dx, terminalPositions[terminal][1] + dy];
    const label = labels.get(assetId); if (label) labels.set(assetId, { ...label, x: label.x + dx, y: label.y + dy });
    const old = deltaByAsset.get(assetId) ?? [0, 0]; deltaByAsset.set(assetId, [old[0] + dx, old[1] + dy]);
  }
  const symbolLabelBoxes = candidate.symbolLabelBoxes.map(box => {
    const owner = box.id.replace(/^(?:symbol|label):/, '');
    const [dx, dy] = deltaByRoom.get(candidate.roomOwnerByAsset.get(owner) ?? '') ?? [0, 0];
    return { ...box, x: box.x + dx, y: box.y + dy };
  });
  const routingObstacles = [...symbolLabelBoxes, ...frames.map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }))];
  const externalRequests = candidate.externalRequests.map(request => {
    const connection = connectionById.get(request.id)!;
    const a = deltaByAsset.get(ownerByTerminal.get(connection.from)!) ?? [0, 0];
    const b = deltaByAsset.get(ownerByTerminal.get(connection.to)!) ?? [0, 0];
    const route = candidate.originalRoutes.get(request.id)!;
    return { ...request, from: [route[0][0] + a[0], route[0][1] + a[1]] as Point, to: [route.at(-1)![0] + b[0], route.at(-1)![1] + b[1]] as Point };
  });
  const updated = {
    ...candidate, frames, positions, terminalPositions, labels, deltaByAsset, externalRequests,
    symbolLabelBoxes, routingObstacles,
    routes: new Map(candidate.routes),
    placement: { ...candidate.placement, positions: Object.fromEntries([...desired].map(([id, point]) => [id, { ...point, layer: 0, row: 0, parentIds: parentOf.has(id) ? [parentOf.get(id)!] : [] }])) },
  };
  for (const id of candidate.localRouteIds) {
    const connection = connectionById.get(id)!; const owner = ownerByTerminal.get(connection.from)!; const [dx, dy] = deltaByAsset.get(owner) ?? [0, 0];
    updated.routes.set(id, candidate.originalRoutes.get(id)!.map(([x, y]) => [x + dx, y + dy] as Point));
  }
  return { candidate: updated, parentOf, links: Object.fromEntries([...linkFor].map(([id, value]) => [id, value.id])), unresolvedParentLinks };

  function order(id: string) { return roomPlacementPlan[id as keyof typeof roomPlacementPlan]?.parents.reduce((min, item) => Math.min(min, item.order), Infinity) ?? Infinity; }
}

function inside(point: Point, frame: Frame) { return point[0] >= frame.x && point[0] <= frame.x + frame.width && point[1] >= frame.y && point[1] <= frame.y + frame.height; }
function boundary(a: Point, b: Point, frame: Frame): Point {
  if (a[0] === b[0]) return [a[0], b[1] < frame.y ? frame.y : b[1] > frame.y + frame.height ? frame.y + frame.height : a[1]];
  if (a[1] === b[1]) return [b[0] < frame.x ? frame.x : b[0] > frame.x + frame.width ? frame.x + frame.width : a[0], a[1]];
  return a;
}
function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }
