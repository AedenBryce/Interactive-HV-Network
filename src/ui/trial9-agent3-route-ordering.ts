import type { NetworkModel } from '../session/model';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { packRoomSiblingBranches } from './room-sibling-branch-packing';
import { alignRoomBranchesByCablePorts } from './room-port-aligned-packing';
import { rerouteRoomInteriorCandidate } from './room-interior-reroute-candidate';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import type { RouteRequest } from './orthogonal-route-planner';

type Candidate = ReturnType<typeof layoutRoomOwnedTopDownCandidate>;

/** Compare deterministic route request orderings with room positions held fixed. */
export function layoutTrial9RouteOrdering(model: NetworkModel) {
  const source = layoutRoomOwnedTopDownCandidate(model);
  const firstPack = packRoomSiblingBranches(model, source, { columns: 3, gapX: 900, gapY: 1000 });
  const firstAlign = alignRoomBranchesByCablePorts(model, firstPack, { gap: 420, stagger: 600 });
  const secondPack = packRoomSiblingBranches(model, firstAlign.candidate, { columns: 3, gapX: 900, gapY: 1000 });
  const secondAlign = alignRoomBranchesByCablePorts(model, secondPack, { gap: 420, stagger: 600 });
  const internal = rerouteRoomInteriorCandidate(model, secondAlign.candidate);
  const prepared = internal.candidate;

  const strategies = [
    { id: 'baseline', sort: baselineOrder },
    { id: 'longest-first', sort: longestFirst },
    { id: 'tree-stratified-longest', sort: treeFirstThenLong },
    { id: 'most-constrained-first', sort: mostConstrainedFirst(prepared, model) },
  ];
  const attempts = strategies.map(strategy => {
    const ordered = sortedCandidate(prepared, strategy.sort);
    return { id: strategy.id, candidate: routeRoomOwnedCandidateGutters(model, ordered) };
  });
  const first = attempts.find(item => item.id === 'longest-first')!.candidate;

  // Rip up the most constrained accepted long routes while retaining the rest
  // of the successful route geometry; reinsert the removed paths first.
  const constrainedSort = mostConstrainedFirst(prepared, model);
  const acceptedByPriority = [...first.gutterRoutedIds].sort((a, b) =>
    constrainedSort(requestById(prepared).get(b)!, requestById(prepared).get(a)!) || a.localeCompare(b));
  const ripUpIds = new Set(acceptedByPriority.slice(0, Math.ceil(acceptedByPriority.length * 0.35)));
  const fixedIds = [...first.routes.keys()].filter(id => prepared.localRouteIds.includes(id)
    || (first.gutterRoutedIds.includes(id) && !ripUpIds.has(id))
    || first.keptOriginalIds.includes(id));
  const retryRequests = prepared.externalRequests.filter(request => !fixedIds.includes(request.id));
  const retryCandidate: Candidate = {
    ...prepared,
    routes: first.routes,
    localRouteIds: fixedIds,
    externalRequests: [...retryRequests].sort((a, b) => constrainedSort(a, b) || a.id.localeCompare(b.id)),
  };
  const retry = routeRoomOwnedCandidateGutters(model, retryCandidate);
  attempts.push({ id: 'rip-up-35pct-constrained-first', candidate: retry });
  return { source, secondAlign, internal, attempts, ripUpIds: [...ripUpIds] };
}

function sortedCandidate(candidate: Candidate, compare: (a: RouteRequest, b: RouteRequest) => number): Candidate {
  return { ...candidate, externalRequests: [...candidate.externalRequests].sort((a, b) => compare(a, b) || a.id.localeCompare(b.id)) };
}
function requestById(candidate: Candidate) { return new Map(candidate.externalRequests.map(request => [request.id, request] as const)); }
function baselineOrder(a: RouteRequest, b: RouteRequest) { return (a.order ?? 0) - (b.order ?? 0); }
function distance(request: RouteRequest) { return Math.abs(request.from[0] - request.to[0]) + Math.abs(request.from[1] - request.to[1]); }
function longestFirst(a: RouteRequest, b: RouteRequest) { return distance(b) - distance(a); }
function treeFirstThenLong(a: RouteRequest, b: RouteRequest) {
  return Number(!a.preferDown) - Number(!b.preferDown) || longestFirst(a, b);
}
function mostConstrainedFirst(candidate: Candidate, model: NetworkModel) {
  const ownerByTerminal = new Map(model.assets.flatMap(asset => asset.terminals.map(terminal => [terminal, asset.id] as const)));
  const roomByAsset = candidate.roomOwnerByAsset;
  const degree = new Map<string, number>();
  for (const request of candidate.externalRequests) {
    const fromRoom = roomByAsset.get(ownerByTerminal.get(request.fromTerminalId) ?? '');
    const toRoom = roomByAsset.get(ownerByTerminal.get(request.toTerminalId) ?? '');
    for (const room of new Set([fromRoom, toRoom].filter((value): value is string => !!value))) degree.set(room, (degree.get(room) ?? 0) + 1);
  }
  return (a: RouteRequest, b: RouteRequest) => constraintScore(b, candidate, degree) - constraintScore(a, candidate, degree)
    || distance(b) - distance(a);
}
function constraintScore(request: RouteRequest, candidate: Candidate, degree: ReadonlyMap<string, number>) {
  const left = Math.min(request.from[0], request.to[0]); const right = Math.max(request.from[0], request.to[0]);
  const top = Math.min(request.from[1], request.to[1]); const bottom = Math.max(request.from[1], request.to[1]);
  const obstacleCount = candidate.routingObstacles.reduce((count, box) =>
    count + Number(box.x <= right && box.x + box.width >= left && box.y <= bottom && box.y + box.height >= top), 0);
  const incidentRooms = (request.ignoredObstacleIds ?? []).filter(id => id.startsWith('room:')).map(id => id.slice('room:'.length));
  const roomPressure = incidentRooms.reduce((sum, room) => sum + (degree.get(room) ?? 0), 0) * 10;
  return obstacleCount + roomPressure + distance(request) / 500;
}
