import { describe, expect, it } from 'vitest';
import { currentNetworkModel } from '../models/site/current-network';
import { layoutRoomOwnedTopDownCandidate } from './room-owned-top-down-candidate';
import { packRoomSiblingBranches } from './room-sibling-branch-packing';

describe('whole-layout room-subtree packing search', () => {
  it('compares complete confirmed room-tree packings before routing', () => {
    const model = currentNetworkModel;
    const base = layoutRoomOwnedTopDownCandidate(model);
    const candidates = [2, 3, 4, 5, 6, 7].map(columns => {
      const candidate = packRoomSiblingBranches(model, base, { columns });
      const frames = candidate.frames;
      const left = Math.min(...frames.map(frame => frame.x));
      const top = Math.min(...frames.map(frame => frame.y));
      const right = Math.max(...frames.map(frame => frame.x + frame.width));
      const bottom = Math.max(...frames.map(frame => frame.y + frame.height));
      const overlaps = frames.flatMap((a, index) => frames.slice(index + 1).filter(b =>
        a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y,
      ).map(b => `${a.id}↔${b.id}`));
      const crossRoomLength = candidate.externalRequests.reduce((sum, request) =>
        sum + Math.abs(request.from[0] - request.to[0]) + Math.abs(request.from[1] - request.to[1]), 0);
      const frameById = new Map(frames.map(frame => [frame.id, frame]));
      const parentViolations = frames.flatMap(frame => (candidate.placement.positions[frame.id]?.parentIds ?? [])
        .filter(parentId => frame.y < frameById.get(parentId)!.y + frameById.get(parentId)!.height)
        .map(parentId => `${parentId}→${frame.id}`));
      return {
        columns,
        bounds: { width: right - left, height: bottom - top },
        aspect: +((right - left) / (bottom - top)).toFixed(3),
        crossRoomLength: Math.round(crossRoomLength),
        overlaps: overlaps.length,
        parentViolations: parentViolations.length,
      };
    });
    console.info('complete room-subtree packing candidates', candidates);
    expect(candidates.every(candidate => candidate.overlaps === 0)).toBe(true);
    expect(candidates.every(candidate => candidate.parentViolations === 0)).toBe(true);
  }, 120_000);
});
