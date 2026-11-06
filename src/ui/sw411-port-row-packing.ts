import type { NetworkModel } from '../session/model';
import type { Point } from './diagram-geometry';
import type { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { roomPlacementPlan } from './room-placement-plan';

type Candidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;
const SW411 = 'sw411/overview';
const FEEDS = [
  { id: 'whole:join:sw454', room: 'stockpile/stockpile-hv', tier: 1 },
  { id: 'whole:join:sw451', room: 'train-loading/hv', tier: 2 },
  { id: 'whole:join:sw435', room: 'crushing-2/sw435-hv', tier: 4 },
  { id: 'whole:join:sw431', room: 'crushing-1/hv', tier: 13 },
  { id: 'whole:join:sw426', room: 'desands/hv', tier: 14 },
  { id: 'whole:join:sw421', room: 'screening/hv', tier: 15 },
  { id: 'whole:join:rm721', room: 'services/rm721', tier: 16 },
] as const;

/** Align the seven direct SW411 feeder entries by their real route endpoints. */
export function packSw411ChildrenByRoutePorts(model: NetworkModel, candidate: Candidate, options: { gap?: number; rowGap?: number } = {}) {
  const gap = options.gap ?? 420;
  const rowGap = options.rowGap ?? 720;
  const frameById = new Map(candidate.frames.map(frame => [frame.id, frame]));
  const parent = frameById.get(SW411)!;
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const connectionById = new Map(model.connections.map(connection => [connection.id, connection]));
  const requestById = new Map(candidate.externalRequests.map(request => [request.id, request]));
  const missingPorts: string[] = [];
  const ports = new Map<string, { parent: Point; child: Point }>();
  for (const feed of FEEDS) {
    const connection = connectionById.get(feed.id); const request = requestById.get(feed.id);
    const child = frameById.get(feed.room);
    if (!connection || !request || !child) { missingPorts.push(feed.id); continue; }
    const fromRoom = candidate.roomOwnerByAsset.get(ownerByTerminal.get(connection.from)!);
    const toRoom = candidate.roomOwnerByAsset.get(ownerByTerminal.get(connection.to)!);
    if (fromRoom === SW411 && toRoom === feed.room) ports.set(feed.id, { parent: [request.from[0], request.from[1]], child: [request.to[0], request.to[1]] });
    else if (toRoom === SW411 && fromRoom === feed.room) ports.set(feed.id, { parent: [request.to[0], request.to[1]], child: [request.from[0], request.from[1]] });
    else missingPorts.push(`${feed.id}:endpoint-rooms-${fromRoom ?? 'none'}-${toRoom ?? 'none'}`);
  }

  const desired = new Map<string, { x: number; y: number }>();
  const selectedRooms = new Set<string>(FEEDS.map(feed => feed.room));
  // Keep each child's existing descendants attached as a rigid visual branch.
  const parentByRoom = new Map<string, string>();
  for (const frame of candidate.frames) {
    if (selectedRooms.has(frame.id)) continue;
    const node = roomPlacementPlan[frame.id as keyof typeof roomPlacementPlan];
    if (node?.topology !== 'owner-confirmed') continue;
    const parentId = node.parents.find(item => item.kind === 'room')?.id;
    if (parentId && candidate.frames.some(item => item.id === parentId)) parentByRoom.set(frame.id, parentId);
  }
  const subtreeByRoot = new Map<string, string[]>();
  for (const feed of FEEDS) {
    const members: string[] = [feed.room];
    let changed = true;
    while (changed) {
      changed = false;
      for (const [child, parentId] of parentByRoom) if (members.includes(parentId) && !members.includes(child)) { members.push(child); changed = true; }
    }
    subtreeByRoot.set(feed.room, members);
  }
  const movedRooms = new Set([...subtreeByRoot.values()].flat());
  const fixedFrames = candidate.frames.filter(frame => !movedRooms.has(frame.id));
  const placedFrames = [...fixedFrames];
  const byTier = [...FEEDS].sort((a, b) => a.tier - b.tier);
  const grouped = [
    [byTier[0]], [byTier[1]], [byTier[2], byTier[3]], [byTier[4]], [byTier[5]], [byTier[6]],
  ];
  let nextRowY = parent.y + parent.height + gap;
  for (const group of grouped) {
    const frames = group.map(feed => frameById.get(feed.room)!);
    const groupPorts = group.map(feed => ports.get(feed.id));
    let rowY = Math.max(nextRowY, ...group.map((_, index) => {
      const port = groupPorts[index];
      if (!port) return parent.y + parent.height + gap;
      const parentLocalY = port.parent[1] - parent.y;
      const childLocalY = port.child[1] - frames[index].y;
      return Math.max(parent.y + parent.height + gap, parent.y + parentLocalY + gap - childLocalY);
    }));
    const width = frames.reduce((sum, frame) => sum + frame.width, 0) + gap * (frames.length - 1);
    const targetCenters = group.map((_, index) => {
      const port = groupPorts[index];
      return port ? port.parent[0] - (port.child[0] - frames[index].x) + frames[index].width / 2 : parent.x + parent.width / 2;
    });
    const centerX = targetCenters.reduce((sum, x) => sum + x, 0) / targetCenters.length;
    let startX = centerX - width / 2;
    while (frames.some((frame, index) => {
      const x = startX + frames.slice(0, index).reduce((sum, prior) => sum + prior.width + gap, 0);
      const subtree = subtreeByRoot.get(group[index].room) ?? [frame.id];
      return subtree.some(id => {
        const member = frameById.get(id)!;
        const memberX = x + member.x - frame.x;
        const memberY = rowY + member.y - frame.y;
        return placedFrames.some(other => overlaps(memberX, memberY, member.width, member.height, other.x, other.y, other.width, other.height));
      });
    })) rowY += rowGap;
    let cursorX = startX;
    for (const feed of group) {
      const frame = frameById.get(feed.room)!;
      const subtree = subtreeByRoot.get(feed.room) ?? [feed.room];
      const dx = cursorX - frame.x; const dy = rowY - frame.y;
      for (const roomId of subtree) {
        const member = frameById.get(roomId)!;
        desired.set(roomId, { x: member.x + dx, y: member.y + dy });
        placedFrames.push({ ...member, x: member.x + dx, y: member.y + dy });
      }
      cursorX += frame.width + gap;
    }
    nextRowY = rowY + Math.max(...frames.map(frame => frame.height)) + rowGap;
  }
  for (const frame of candidate.frames) if (!desired.has(frame.id)) desired.set(frame.id, { x: frame.x, y: frame.y });

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
    const before = deltaByAsset.get(assetId) ?? [0, 0]; deltaByAsset.set(assetId, [before[0] + dx, before[1] + dy]);
  }
  const symbolLabelBoxes = candidate.symbolLabelBoxes.map(box => {
    const owner = box.id.replace(/^(?:symbol|label):/, ''); const room = candidate.roomOwnerByAsset.get(owner);
    const [dx, dy] = deltaByRoom.get(room ?? '') ?? [0, 0]; return { ...box, x: box.x + dx, y: box.y + dy };
  });
  const routingObstacles = [...symbolLabelBoxes, ...frames.map(frame => ({ id: `room:${frame.id}`, x: frame.x, y: frame.y, width: frame.width, height: frame.height }))];
  const externalRequests = candidate.externalRequests.map(request => {
    const connection = connectionById.get(request.id)!; const route = candidate.originalRoutes.get(request.id)!;
    const a = deltaByAsset.get(ownerByTerminal.get(connection.from)!) ?? [0, 0]; const b = deltaByAsset.get(ownerByTerminal.get(connection.to)!) ?? [0, 0];
    return { ...request, from: [route[0][0] + a[0], route[0][1] + a[1]] as Point, to: [route.at(-1)![0] + b[0], route.at(-1)![1] + b[1]] as Point };
  });
  const updated = { ...candidate, frames, positions, terminalPositions, labels, deltaByAsset, externalRequests, symbolLabelBoxes, routingObstacles, routes: new Map(candidate.routes) };
  for (const id of candidate.localRouteIds) {
    const connection = connectionById.get(id)!; const owner = ownerByTerminal.get(connection.from)!; const [dx, dy] = deltaByAsset.get(owner) ?? [0, 0];
    updated.routes.set(id, candidate.originalRoutes.get(id)!.map(([x, y]) => [x + dx, y + dy] as Point));
  }
  const feedPorts = Object.fromEntries(FEEDS.map(feed => {
    const portsForFeed = ports.get(feed.id); const frame = frameById.get(feed.room)!; const target = desired.get(feed.room)!;
    return [feed.id, portsForFeed ? { parent: portsForFeed.parent, child: portsForFeed.child, alignedChildFrame: { x: target.x, y: target.y }, childEndpointTopOffset: portsForFeed.child[1] - frame.y } : null];
  }));
  return { candidate: updated, feedPorts, missingPorts, framePositions: frames.map(frame => ({ id: frame.id, x: frame.x, y: frame.y, width: frame.width, height: frame.height })) };
}

function overlaps(ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) { return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by; }

