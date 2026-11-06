import type { NetworkModel } from '../session/model';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { packRoomSiblingBranches } from './room-sibling-branch-packing';
import { alignRoomBranchesByCablePorts } from './room-port-aligned-packing';
import { routeRoomOwnedCandidateGutters } from './room-owned-top-down-gutter-fallback';
import { rerouteRoomInteriorCandidate } from './room-interior-reroute-candidate';

/**
 * Isolated rigid-module tree trial. Room-owned electrical branches move as a
 * unit; confirmed ring siblings are packed together, then parent/child ports
 * are aligned. A second pack/alignment pass resolves macro changes introduced
 * by port fitting before any cross-room route is accepted.
 */
export function layoutAgent3RoomModuleTree(model: NetworkModel) {
  const source = layoutRoomOwnedTopDownCandidate(model);
  const firstPack = packRoomSiblingBranches(model, source, { columns: 3, gapX: 1_500, gapY: 450 });
  const firstAlign = alignRoomBranchesByCablePorts(model, firstPack, { gap: 360, stagger: 480 });
  const secondPack = packRoomSiblingBranches(model, firstAlign.candidate, { columns: 3, gapX: 1_500, gapY: 450 });
  const secondAlign = alignRoomBranchesByCablePorts(model, secondPack, { gap: 360, stagger: 480 });
  const internalRerouting = rerouteRoomInteriorCandidate(model, secondAlign.candidate);
  const routing = routeRoomOwnedCandidateGutters(model, internalRerouting.candidate);
  return {
    source,
    firstPack,
    firstAlign,
    secondPack,
    secondAlign,
    internalRerouting,
    routing,
    roomFrames: secondAlign.candidate.frames,
    positions: secondAlign.candidate.positions,
    labels: secondAlign.candidate.labels,
    symbolLabelBoxes: secondAlign.candidate.symbolLabelBoxes,
  };
}
